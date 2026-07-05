"""
Integrations Views
------------------
Handles Google Drive and Microsoft OneDrive OAuth connections,
cloud file listing, and cloud file import (fetch & handoff to Upload app).
"""
import uuid
import csv
import io
import os
import logging
from datetime import datetime, timedelta

import requests as http_requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from .models import UserIntegration
from .serializers import UserIntegrationSerializer
from .services import get_valid_token, IntegrationNotFound, TokenRefreshError
from apps.users.permissions import IsSmartMoveAdmin
from apps.upload.models import DataImport
from apps.upload.serializers import DataImportSerializer
from apps.upload import azure_utils

logger = logging.getLogger(__name__)


# =============================================================================
# 1. OAuth Connection Views
# =============================================================================

class ConnectGoogleDriveView(APIView):
    """Trades a Google OAuth authorization code for access/refresh tokens."""
    permission_classes = [IsSmartMoveAdmin]
    
    def post(self, request):
        auth_code = request.data.get('code')
        if not auth_code:
            return Response(
                {'error': 'Authorization code is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 1. Trade the code for tokens via Google's OAuth endpoint
        token_response = http_requests.post('https://oauth2.googleapis.com/token', data={
            'code': auth_code,
            'client_id': os.environ.get('GOOGLE_CLIENT_ID'),
            'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET'),
            'redirect_uri': os.environ.get('GOOGLE_REDIRECT_URI'),
            'grant_type': 'authorization_code'
        })
        
        if token_response.status_code != 200:
            logger.error(
                f"Google OAuth token exchange failed: {token_response.status_code}",
                extra={'user_id': request.user.id}
            )
            return Response(
                {'error': 'Failed to connect to Google', 'details': token_response.text},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        token_data = token_response.json()
        
        # 2. Save or update the tokens
        expires_in = token_data.get('expires_in', 3600)
        expires_at = timezone.now() + timedelta(seconds=expires_in)
        
        UserIntegration.objects.update_or_create(  # type: ignore[attr-defined]
            user=request.user,
            provider='google_drive',
            defaults={
                'access_token': token_data['access_token'],
                'refresh_token': token_data.get('refresh_token'),
                'expires_at': expires_at
            }
        )
        
        logger.info(
            "Google Drive connected successfully",
            extra={'user_id': request.user.id, 'provider': 'google_drive'}
        )
        
        return Response({'message': 'Google Drive connected successfully!'})


class ConnectMicrosoftView(APIView):
    """Trades a Microsoft OAuth authorization code for access/refresh tokens."""
    permission_classes = [IsSmartMoveAdmin]
    
    def post(self, request):
        auth_code = request.data.get('code')
        if not auth_code:
            return Response(
                {'error': 'Authorization code is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 1. Trade the code for tokens via Microsoft's OAuth endpoint
        token_response = http_requests.post(
            'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            data={
                'code': auth_code,
                'client_id': os.environ.get('MICROSOFT_CLIENT_ID'),
                'client_secret': os.environ.get('MICROSOFT_CLIENT_SECRET'),
                'redirect_uri': os.environ.get('MICROSOFT_REDIRECT_URI'),
                'grant_type': 'authorization_code',
                'scope': 'https://graph.microsoft.com/.default offline_access',
            }
        )
        
        if token_response.status_code != 200:
            logger.error(
                f"Microsoft OAuth token exchange failed: {token_response.status_code}",
                extra={'user_id': request.user.id}
            )
            return Response(
                {'error': 'Failed to connect to Microsoft', 'details': token_response.text},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        token_data = token_response.json()
        
        # 2. Save or update the tokens
        expires_in = token_data.get('expires_in', 3600)
        expires_at = timezone.now() + timedelta(seconds=expires_in)
        
        UserIntegration.objects.update_or_create(  # type: ignore[attr-defined]
            user=request.user,
            provider='onedrive',
            defaults={
                'access_token': token_data['access_token'],
                'refresh_token': token_data.get('refresh_token'),
                'expires_at': expires_at
            }
        )
        
        logger.info(
            "Microsoft OneDrive connected successfully",
            extra={'user_id': request.user.id, 'provider': 'onedrive'}
        )
        
        return Response({'message': 'Microsoft OneDrive connected successfully!'})


# =============================================================================
# 2. List Cloud Files
# =============================================================================

class ListCloudFilesView(APIView):
    """
    Lists CSV/Excel files from the user's connected cloud storage.
    Includes native Google Sheets (they'll be exported as CSV during import).
    """
    permission_classes = [IsSmartMoveAdmin]
    
    def get(self, request, provider):
        try:
            access_token = get_valid_token(request.user, provider)
        except IntegrationNotFound as e:
            logger.warning(f"Integration not found: {provider}", extra={'user_id': request.user.id, 'provider': provider})
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except TokenRefreshError as e:
            logger.error(f"Token refresh failed for {provider}", extra={'user_id': request.user.id, 'provider': provider})
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        headers = {'Authorization': f'Bearer {access_token}'}
        
        if provider == 'google_drive':
            files = self._list_google_drive_files(headers)
        elif provider == 'onedrive':
            files = self._list_onedrive_files(headers)
        else:
            return Response(
                {'error': f'Unknown provider: {provider}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(
            f"Listed {len(files)} files from {provider}",
            extra={'user_id': request.user.id, 'provider': provider, 'file_count': len(files)}
        )
        
        return Response({'files': files})
    
    def _list_google_drive_files(self, headers):
        """Fetch CSV, Excel, and Google Sheets files from Google Drive."""
        # Filter for data files only — no vacation photos
        query = (
            "mimeType='text/csv' or "
            "mimeType='application/vnd.ms-excel' or "
            "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or "
            "mimeType='application/vnd.google-apps.spreadsheet'"
        )
        
        response = http_requests.get(
            'https://www.googleapis.com/drive/v3/files',
            headers=headers,
            params={
                'q': query,
                'fields': 'files(id, name, mimeType, modifiedTime, size)',
                'pageSize': 100,
                'orderBy': 'modifiedTime desc',
            }
        )
        
        if response.status_code != 200:
            return []
        
        google_files = response.json().get('files', [])
        
        return [
            {
                'file_id': f['id'],
                'name': f['name'],
                'mime_type': f['mimeType'],
                'modified': f.get('modifiedTime'),
                'size': int(f['size']) if f.get('size') else None,
            }
            for f in google_files
        ]
    
    def _list_onedrive_files(self, headers):
        """Fetch CSV and Excel files from Microsoft OneDrive."""
        # Search for data files across the user's entire drive
        response = http_requests.get(
            "https://graph.microsoft.com/v1.0/me/drive/root/search(q='')",
            headers=headers,
            params={
                '$select': 'id,name,file,lastModifiedDateTime,size',
                '$top': 200,
            }
        )
        
        if response.status_code != 200:
            return []
        
        all_files = response.json().get('value', [])
        
        # Client-side filter for data file extensions
        allowed_extensions = ('.csv', '.xls', '.xlsx')
        data_files = [
            f for f in all_files
            if f.get('name', '').lower().endswith(allowed_extensions)
        ]
        
        return [
            {
                'file_id': f['id'],
                'name': f['name'],
                'mime_type': f.get('file', {}).get('mimeType', ''),
                'modified': f.get('lastModifiedDateTime'),
                'size': f.get('size'),
            }
            for f in data_files
        ]


# =============================================================================
# 3. Import Cloud File (Fetch & Handoff)
# =============================================================================

class PreviewCloudFileView(APIView):
    """
    Streams the first 500 rows of a cloud file into memory and profiles it
    (detects data types, counts nulls per column).
    """
    permission_classes = [IsSmartMoveAdmin]

    def post(self, request):
        provider = request.data.get('provider')
        file_id = request.data.get('file_id')

        if not all([provider, file_id]):
            return Response({'error': 'provider and file_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            access_token = get_valid_token(request.user, provider)
        except IntegrationNotFound as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except TokenRefreshError as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
            
        headers = {'Authorization': f'Bearer {access_token}'}

        if provider == 'google_drive':
            meta_resp = http_requests.get(
                f'https://www.googleapis.com/drive/v3/files/{file_id}?fields=mimeType,name',
                headers=headers
            )
            if meta_resp.status_code != 200:
                return Response({'error': 'Failed to get file metadata'}, status=status.HTTP_400_BAD_REQUEST)
            mime_type = meta_resp.json().get('mimeType')

            if mime_type == 'application/vnd.google-apps.spreadsheet':
                download_url = f'https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType=text/csv'
            else:
                download_url = f'https://www.googleapis.com/drive/v3/files/{file_id}?alt=media'
        elif provider == 'onedrive':
            download_url = f'https://graph.microsoft.com/v1.0/me/drive/items/{file_id}/content'
        else:
            return Response({'error': f'Unknown provider: {provider}'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with http_requests.get(download_url, headers=headers, stream=True) as r:
                r.raise_for_status()
                lines = []
                iterator = r.iter_lines()
                for _ in range(500):
                    try:
                        line_bytes = next(iterator)
                        if line_bytes is not None:
                            # Graceful decode handling bad chars
                            line = line_bytes.decode('utf-8', errors='replace')
                            lines.append(line)
                    except StopIteration:
                        break

            if not lines:
                return Response({'error': 'File is empty'}, status=status.HTTP_400_BAD_REQUEST)
                
            reader = csv.reader(lines)
            try:
                headers_list = next(reader)
            except StopIteration:
                return Response({'error': 'File is empty'}, status=status.HTTP_400_BAD_REQUEST)
                
            profile = {h: {'null_count': 0, 'data_type': 'unknown'} for h in headers_list}
            sample_data = []
            
            row_count = 0
            for row in reader:
                row_count += 1
                row_dict = {}
                for i, val in enumerate(row):
                    if i < len(headers_list):
                        col = headers_list[i]
                        val_stripped = val.strip() if val else ""
                        row_dict[col] = val_stripped
                        if not val_stripped:
                            profile[col]['null_count'] += 1
                        else:
                            if profile[col]['data_type'] in ['unknown', 'integer']:
                                if val_stripped.isdigit() or (val_stripped.startswith('-') and val_stripped[1:].isdigit()):
                                    profile[col]['data_type'] = 'integer'
                                else:
                                    try:
                                        float(val_stripped)
                                        profile[col]['data_type'] = 'float'
                                    except ValueError:
                                        profile[col]['data_type'] = 'string'
                            elif profile[col]['data_type'] == 'float':
                                try:
                                    float(val_stripped)
                                except ValueError:
                                    profile[col]['data_type'] = 'string'
                sample_data.append(row_dict)
                                    
            return Response({
                'headers': headers_list, 
                'profile': profile, 
                'rows_analyzed': row_count,
                'sample_data': sample_data
            })
        except Exception as e:
            return Response({'error': f'Failed to stream file: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TransferCloudFileView(APIView):
    """
    Downloads a file from cloud provider and streams it directly to the given
    Azure SAS URL using chunked requests, preventing OOM errors.
    """
    permission_classes = [IsSmartMoveAdmin]

    def post(self, request):
        provider = request.data.get('provider')
        file_id = request.data.get('file_id')
        azure_sas_url = request.data.get('azure_sas_url')

        if not all([provider, file_id, azure_sas_url]):
            return Response({'error': 'provider, file_id, and azure_sas_url are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            access_token = get_valid_token(request.user, provider)
        except IntegrationNotFound as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except TokenRefreshError as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
            
        headers = {'Authorization': f'Bearer {access_token}'}

        if provider == 'google_drive':
            meta_resp = http_requests.get(
                f'https://www.googleapis.com/drive/v3/files/{file_id}?fields=mimeType',
                headers=headers
            )
            if meta_resp.status_code != 200:
                return Response({'error': 'Failed to get file metadata'}, status=status.HTTP_400_BAD_REQUEST)
            mime_type = meta_resp.json().get('mimeType')

            if mime_type == 'application/vnd.google-apps.spreadsheet':
                download_url = f'https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType=text/csv'
            else:
                download_url = f'https://www.googleapis.com/drive/v3/files/{file_id}?alt=media'
        elif provider == 'onedrive':
            download_url = f'https://graph.microsoft.com/v1.0/me/drive/items/{file_id}/content'
        else:
            return Response({'error': f'Unknown provider: {provider}'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with http_requests.get(download_url, headers=headers, stream=True) as r:
                r.raise_for_status()
                azure_headers = {
                    'x-ms-blob-type': 'BlockBlob',
                    'Content-Type': 'application/octet-stream'
                }
                
                azure_resp = http_requests.put(
                    azure_sas_url,
                    headers=azure_headers,
                    data=r.iter_content(chunk_size=8 * 1024 * 1024)
                )
                
                if azure_resp.status_code not in [200, 201]:
                    return Response(
                        {'error': 'Failed to upload to Azure', 'details': azure_resp.text},
                        status=status.HTTP_502_BAD_GATEWAY
                    )
                    
            return Response({'message': 'Transfer completed successfully'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': f'Transfer failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 4. Manage Connections
# =============================================================================

class ListConnectionsView(APIView):
    """
    Returns a list of cloud providers currently connected by the user.
    Each entry includes the provider name and when the connection was created.
    """
    permission_classes = [IsSmartMoveAdmin]

    def get(self, request):
        integrations = UserIntegration.objects.filter(user=request.user)  # type: ignore[attr-defined]
        serializer = UserIntegrationSerializer(integrations, many=True)

        logger.info(
            f"Listed {integrations.count()} connections",
            extra={'user_id': request.user.id},
        )

        return Response({'connections': serializer.data})


class DisconnectIntegrationView(APIView):
    """
    Deletes the UserIntegration record for the given provider,
    effectively revoking the stored OAuth tokens.
    """
    permission_classes = [IsSmartMoveAdmin]

    def delete(self, request, provider):
        try:
            integration = UserIntegration.objects.get(  # type: ignore[attr-defined]
                user=request.user, provider=provider
            )
        except UserIntegration.DoesNotExist:  # type: ignore[attr-defined]
            return Response(
                {'error': f'No active connection found for provider: {provider}'},
                status=status.HTTP_404_NOT_FOUND,
            )

        integration.delete()

        logger.info(
            f"Disconnected {provider}",
            extra={'user_id': request.user.id, 'provider': provider},
        )

        return Response(
            {'message': f'{provider} disconnected successfully.'},
            status=status.HTTP_200_OK,
        )
import re
from django.core.management.base import BaseCommand
from django.conf import settings
from azure.storage.blob import BlobServiceClient
from apps.reports.models import Report

class Command(BaseCommand):
    help = "Scans Azure Blob Storage regional containers and synchronizes reports to the database."

    def handle(self, *args, **options):
        conn_str = getattr(settings, 'AZURE_STORAGE_CONNECTION_STRING', '')
        if not conn_str:
            self.stdout.write(self.style.ERROR("AZURE_STORAGE_CONNECTION_STRING is not configured in settings."))
            return

        try:
            blob_service = BlobServiceClient.from_connection_string(conn_str)
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"Failed to connect to Azure: {exc}"))
            return

        regions = ['dubai', 'egypt', 'england']
        
        for region in regions:
            container_name = f"{region}-reports"
            self.stdout.write(self.style.WARNING(f"Scanning container: {container_name}..."))
            
            try:
                container_client = blob_service.get_container_client(container_name)
                blobs = container_client.list_blobs()
                
                count = 0
                for blob in blobs:
                    if not blob.name.lower().endswith('.pdf'):
                        continue
                    
                    # Try to parse year and month from the blob path/name
                    # Format 1: reports/{region}/{year}/{month:02d}_executive_summary.pdf
                    # Format 2: {region}_{year}_{month:02d}_summary.pdf
                    match_path = re.search(r"reports/" + region + r"/(\d{4})/(\d{2})_", blob.name, re.IGNORECASE)
                    match_name = re.search(region + r"_(\d{4})_(\d{2})_", blob.name, re.IGNORECASE)
                    
                    if match_path:
                        year = int(match_path.group(1))
                        month = int(match_path.group(2))
                    elif match_name:
                        year = int(match_name.group(1))
                        month = int(match_name.group(2))
                    else:
                        # Fallback to last modified date of the blob
                        year = blob.last_modified.year
                        month = blob.last_modified.month

                    # Resolve human-readable title
                    clean_name = blob.name.split('/')[-1].replace('.pdf', '').replace('_', ' ').title()
                    region_display = dict(Report.Region.choices).get(region, region).title()
                    title = f"{region_display} Executive Summary — {month:02d}/{year} ({clean_name})"
                    
                    # Get blob URL
                    blob_client = container_client.get_blob_client(blob.name)
                    blob_url = blob_client.url

                    # Check if database record already exists
                    report, created = Report.objects.update_or_create(
                        region=region,
                        report_month=month,
                        report_year=year,
                        defaults={
                            'title': title,
                            'azure_blob_url': blob_url,
                            'file_size_bytes': blob.size or 0,
                            'is_published': True,
                        }
                    )
                    
                    status_str = "Created" if created else "Updated"
                    self.stdout.write(self.style.SUCCESS(
                        f"  [{status_str}] {report.title} -> {blob_url}"
                    ))
                    count += 1
                
                self.stdout.write(self.style.SUCCESS(f"Finished container {container_name}. Synced {count} reports."))
                
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"Failed to scan container {container_name}: {exc}"))
        
        self.stdout.write(self.style.SUCCESS("Azure Report Synchronization complete!"))

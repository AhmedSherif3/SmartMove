import boto3  # type: ignore
import json
import logging
from typing import Any, Dict, List
from botocore.exceptions import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)

from botocore.client import Config
import os

def get_s3_client() -> Any:
    """Initializes the Boto3 client pointing to your Oracle/MinIO endpoint."""
    endpoint = getattr(settings, 'MINIO_ENDPOINT_URL', '') or os.environ.get('MINIO_ENDPOINT', 'http://minio:9000')
    if endpoint and not endpoint.startswith('http'):
        endpoint = 'http://' + endpoint

    access_key = getattr(settings, 'MINIO_ACCESS_KEY', '') or os.environ.get('MINIO_ACCESS_KEY', 'smartmove_admin')
    secret_key = getattr(settings, 'MINIO_SECRET_KEY', '') or os.environ.get('MINIO_SECRET_KEY', 'smartmove_password')
    region = getattr(settings, 'MINIO_REGION', '') or 'us-east-1'

    return boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        config=Config(signature_version='s3v4')
    )

def set_user_quota(user_id: int, quota_gb: int) -> bool:
    """
    Pushes an IAM policy update to MinIO to physically restrict upload 
    sizes for a specific user's prefix based on their subscription tier.
    """
    client = get_s3_client()
    bucket_name = str(settings.MINIO_BUCKET_NAME)
    prefix = f"users/{user_id}/*"
    max_bytes = quota_gb * 1_073_741_824
    
    policy_statement: Dict[str, Any] = {
        "Sid": f"EnforceQuotaForUser{user_id}",
        "Effect": "Deny",
        "Principal": "*",
        "Action": "s3:PutObject",
        "Resource": f"arn:aws:s3:::{bucket_name}/{prefix}",
        "Condition": {
            "NumericGreaterThan": {
                "s3:content-length-header": max_bytes
            }
        }
    }

    try:
        policy_dict: Dict[str, Any]
        try:
            current_policy = client.get_bucket_policy(Bucket=bucket_name)
            policy_dict = json.loads(current_policy['Policy'])
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchBucketPolicy':
                policy_dict = {"Version": "2012-10-17", "Statement": []}
            else:
                raise

        # Normalize the Statement field to guarantee it is a list of dicts
        raw_statements = policy_dict.get('Statement', [])
        if isinstance(raw_statements, dict):
            raw_statements = [raw_statements]
        elif not isinstance(raw_statements, list):
            raw_statements = []

        # Safely filter existing statements
        policy_dict['Statement'] = [
            stmt for stmt in raw_statements 
            if isinstance(stmt, dict) and stmt.get('Sid') != f"EnforceQuotaForUser{user_id}"
        ]
        
        # Append the new quota rule
        policy_dict['Statement'].append(policy_statement)

        client.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy_dict))
        logger.info(f"Successfully locked MinIO quota for user {user_id} at {quota_gb}GB.")
        return True

    except Exception as e:
        logger.error(f"Failed to sync MinIO policy for user {user_id}: {e}")
        raise

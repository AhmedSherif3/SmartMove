$ErrorActionPreference = "Stop"

$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc4NTgwNzEzLCJpYXQiOjE3Nzg1Nzk4MTMsImp0aSI6IjQ5MDJiN2ZiMzQ1MzQ1OGM5YWVmYTAzNDZhMDEzOTQ2IiwidXNlcl9pZCI6IjIifQ.R15sBEZ8-D-QRLh6HCKWYAPkproOtc_iEpgQulGIXDA"
$AIRFLOW_SECRET = "super_secret_airflow_key_2026"

Write-Host "--- STEP 1 ---"
$resp1 = curl.exe -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:8000/api/upload/sas-token/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{\"filename\": \"dubai_test.csv\", \"region\": \"dubai\"}'
Write-Host $resp1

Write-Host "--- STEP 2 ---"
$resp2 = curl.exe -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:8000/api/upload/register/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{\"blob_url\": \"https://yourstorage.blob.core.windows.net/dubai-quarantine/dubai_test.csv\", \"region\": \"dubai\"}'
Write-Host $resp2

# Extract import_id
$import_id = ""
if ($resp2 -match '"id":(\d+)') {
    $import_id = $matches[1]
} else {
    $import_id = "1" # Fallback if error
}

Write-Host "--- STEP 3A ---"
$resp3a = curl.exe -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:8000/api/upload/webhook/airflow/ -H "Content-Type: application/json" -d "{\`"import_id\`": $import_id, \`"status\`": \`"COMPLETED\`"}"
Write-Host $resp3a

Write-Host "--- STEP 3B ---"
$resp3b = curl.exe -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:8000/api/upload/webhook/airflow/ -H "X-Airflow-API-Key: $AIRFLOW_SECRET" -H "Content-Type: application/json" -d "{\`"import_id\`": $import_id, \`"status\`": \`"COMPLETED\`"}"
Write-Host $resp3b

Write-Host "--- STEP 4 ---"
# Changed to POST as per PreviewCloudFileView implementation
$resp4 = curl.exe -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:8000/api/integrations/drive/preview/" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{\"provider\": \"google_drive\", \"file_id\": \"TEST_FILE\"}'
Write-Host $resp4

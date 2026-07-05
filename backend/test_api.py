import requests

# 1. Setup your variables
url = "http://127.0.0.1:8000/api/integrations/google/connect/"

# Replace this with the token you use in Postman's "Authorization" tab
jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc2NDYyNTA4LCJpYXQiOjE3NzY0NjE2MDgsImp0aSI6IjM1OTZlMTFiNDdmMTRmYjM5M2E2MTllMDhiNjlmZGNiIiwidXNlcl9pZCI6IjEifQ.PoE1TvfS5_fbMPH9X7_gbEojT7d0oD-Axf7n87MzArM"

# Replace this with the long code from your browser URL
google_code = "4/0Aci98E-CnIaxKrxDVVKpCguuekjpTgO0zyDW1yUWjKeXRBW-htBEcfr4F7OIAkMUWxIbsA"

headers = {
    # Notice the word 'Bearer' and the space before the token!
    "Authorization": f"Bearer {jwt_token}", 
    "Content-Type": "application/json"
}

payload = {
    "code": google_code
}

print("Sending request to Django...")
response = requests.post(url, json=payload, headers=headers)

print(f"Status Code: {response.status_code}")
if response.status_code == 404:
    print("FAILED: Django still says 404 Not Found.")
    # Print the first 500 characters of the HTML error to see what it tried
    print(response.text[:500]) 
else:
    print("SUCCESS or DIFFERENT ERROR!")
    print(response.json())
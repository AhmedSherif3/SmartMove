import urllib.request
import urllib.error
import json
import random

email = f"test_user_random_{random.randint(1000, 9999)}@example.com"
print(f"Trying to register {email}...")

req = urllib.request.Request(
    'https://api.smartmoveanalytics.me/api/auth/register/',
    data=json.dumps({
        'email': email,
        'password': 'StrongPass123!',
        'firstName': 'Test',
        'lastName': 'User',
        'region': 'Dubai'
    }).encode('utf-8'),
    headers={
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://smartmoveanalytics.me',
        'Referer': 'https://smartmoveanalytics.me/'
    }
)

try:
    res = urllib.request.urlopen(req)
    print("Status:", res.status)
    print("Body:", res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    try:
        print("Body:", e.read().decode('utf-8'))
    except:
        pass
except Exception as e:
    print("Error:", e)

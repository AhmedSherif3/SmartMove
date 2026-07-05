import urllib.request
import json
import re

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/login/',
    data=json.dumps({'email':'george.milad2@gmail.com', 'password':'George12@'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    html = e.read().decode('utf-8')
    m = re.search(r'(?i)<textarea id="traceback_area".*?>(.*?)</textarea>', html, re.DOTALL)
    if m:
        tb = m.group(1).replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>')
        with open('traceback.txt', 'w') as f:
            f.write(tb)
        print("Traceback written to traceback.txt")
    else:
        print("No traceback area found")

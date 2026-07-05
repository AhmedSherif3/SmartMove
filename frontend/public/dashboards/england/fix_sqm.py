import sys
import os

PREPROCESS_FILE = 'd:/SmartMove/Dashboards/england/dashboard/scripts/preprocess.py'

with open(PREPROCESS_FILE, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace price_sqm with price logic
text = text.replace('worth / area_sqm', 'worth')
text = text.replace('if area_sqm > 0:', 'if worth > 0:')

with open(PREPROCESS_FILE, 'w', encoding='utf-8') as f:
    f.write(text)

INDEX_FILE = 'd:/SmartMove/Dashboards/england/dashboard/index.html'
with open(INDEX_FILE, 'r', encoding='utf-8') as f:
    idx = f.read()

idx = idx.replace('Price / sqm', 'Price')
idx = idx.replace('price per square meter', 'price')
idx = idx.replace('Price/sqm', 'Price')

with open(INDEX_FILE, 'w', encoding='utf-8') as f:
    f.write(idx)

APP_FILE = 'd:/SmartMove/Dashboards/england/dashboard/app.js'
with open(APP_FILE, 'r', encoding='utf-8') as f:
    app = f.read()

app = app.replace('/sqm', '')

with open(APP_FILE, 'w', encoding='utf-8') as f:
    f.write(app)

print("Fixed metrics to use absolute Price instead of Price/sqm!")

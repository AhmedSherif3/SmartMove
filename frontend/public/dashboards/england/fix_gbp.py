import sys

APP_FILE = 'd:/SmartMove/Dashboards/england/dashboard/app.js'
with open(APP_FILE, 'r', encoding='utf-8') as f:
    app = f.read()

app = app.replace('EGP ', '£')
app = app.replace('fmtEGP', 'fmtGBP')

with open(APP_FILE, 'w', encoding='utf-8') as f:
    f.write(app)

INDEX_FILE = 'd:/SmartMove/Dashboards/england/dashboard/index.html'
with open(INDEX_FILE, 'r', encoding='utf-8') as f:
    idx = f.read()

# Fix Avg Property Size to Most Active Area
idx = idx.replace('<div class="kpi-label">Avg Property Size</div>', '<div class="kpi-label">Most Active Area</div>')
idx = idx.replace('<div class="kpi-sub">Mean area in sqm</div>', '<div class="kpi-sub">Highest trans volume</div>')

# Fix subtitles referencing sqm
idx = idx.replace('reflects average price per sqm', 'reflects average property price')

with open(INDEX_FILE, 'w', encoding='utf-8') as f:
    f.write(idx)

print("Fixed GBP and KPI text")

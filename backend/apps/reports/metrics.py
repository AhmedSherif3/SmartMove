from prometheus_client import Counter

report_views_total = Counter(
    'smartmove_report_views_total',
    'Total number of report views',
    ['region', 'user_role'],
)

report_downloads_total = Counter(
    'smartmove_report_downloads_total',
    'Total number of report downloads',
    ['region', 'user_role'],
)

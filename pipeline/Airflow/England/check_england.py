import os, urllib.parse, pyodbc
conn_str = os.environ.get('AZURE_SQL_CONN')
p = urllib.parse.urlparse(conn_str)
c = f'DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={p.hostname};DATABASE={p.path.lstrip("/")};UID={p.username};PWD={p.password}'
try:
    conn = pyodbc.connect(c)
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 1 * FROM raw_england_transactions")
    cols = [column[0] for column in cursor.description]
    print('COLUMNS:', cols)
except Exception as e: print('ERROR:', e)

import os
import shutil
import re

base_dir = r"d:\SmartMove\pipeline\Airflow"
dubai_dir = os.path.join(base_dir, "Dubai", "dbt-dubai", "smartmove_dubai", "models")
egypt_dir = os.path.join(base_dir, "Egypt", "dbt-egypt", "smartmove_egypt", "models")
england_dir = os.path.join(base_dir, "England", "dbt-england", "smartmove_england", "models")

targets = [
    {"name": "egypt", "dir": egypt_dir, "clean_dirs": ["marts"], "date_dim": "dim_date_egypt.sql"},
    {"name": "england", "dir": england_dir, "clean_dirs": ["core", "marts"], "date_dim": "dim_date.sql"}
]

for t in targets:
    # Clean old directories
    for cdir in t["clean_dirs"]:
        p = os.path.join(t["dir"], cdir)
        if os.path.exists(p):
            shutil.rmtree(p)
    
    # Create new directories
    os.makedirs(os.path.join(t["dir"], "staging"), exist_ok=True)
    os.makedirs(os.path.join(t["dir"], "marts"), exist_ok=True)
    
    # Sync staging
    dubai_staging = os.path.join(dubai_dir, "staging")
    for f in os.listdir(dubai_staging):
        with open(os.path.join(dubai_staging, f), "r") as file:
            content = file.read()
            # Replace dubai with region name
            content = content.replace("dubai", t["name"])
            content = content.replace("Dubai", t["name"].capitalize())
            
            new_f = f.replace("dubai", t["name"])
            with open(os.path.join(t["dir"], "staging", new_f), "w") as out:
                out.write(content)
                
    # Sync marts
    dubai_marts = os.path.join(dubai_dir, "marts")
    for f in os.listdir(dubai_marts):
        with open(os.path.join(dubai_marts, f), "r") as file:
            content = file.read()
            
            # Remove meter_sale_price from fact_transactions
            if f == "fact_transactions_dubai.sql":
                content = re.sub(r'\s*meter_sale_price,?', '', content)
                
            # Remove from schema.yml
            if f == "schema.yml":
                content = content.replace("dim_date", t["date_dim"].replace(".sql", ""))
                # Dubai schema.yml actually doesn't mention meter_sale_price based on my view earlier
                # But just in case
                pass
                
            # Replace dubai with region name in content
            content = content.replace("stg_dubai", f"stg_{t['name']}")
            # Be careful with dim_date replacement
            if f != "schema.yml":
                content = content.replace("dim_date_dubai", t["date_dim"].replace(".sql", ""))
            
            # Determine new filename based on schema
            if f == "dim_date_dubai.sql":
                new_f = t["date_dim"]
            elif f == "dim_property_dubai.sql":
                new_f = "dim_property.sql"
            elif f == "fact_transactions_dubai.sql":
                new_f = "fact_transactions.sql"
            else:
                new_f = f.replace("dubai", t["name"])
                
            with open(os.path.join(t["dir"], "marts", new_f), "w") as out:
                out.write(content)

print("Sync complete.")

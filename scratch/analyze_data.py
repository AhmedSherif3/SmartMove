import csv

# Quick analysis of key fields
file = r'c:\Users\ahmed\Downloads\EGYPT_MASTER_CONFORMED.csv'

property_types = set()
usages = set()
procedures = set()
trans_groups = set()
areas = set()
reg_types = set()
years = set()
parking = set()

count = 0
with open(file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        count += 1
        property_types.add(row['property_type_en'])
        usages.add(row['property_usage_en'])
        procedures.add(row['procedure_name_en'])
        trans_groups.add(row['trans_group_en'])
        reg_types.add(row['reg_type_en'])
        years.add(row['year'])
        parking.add(row['has_parking'])
        if len(areas) < 200:
            areas.add(row['area_name_en'])

print(f"Total rows: {count}")
print(f"\nProperty Types ({len(property_types)}): {sorted(property_types)}")
print(f"\nUsages ({len(usages)}): {sorted(usages)}")
print(f"\nProcedures ({len(procedures)}): {sorted(procedures)}")
print(f"\nTransaction Groups ({len(trans_groups)}): {sorted(trans_groups)}")
print(f"\nRegistration Types ({len(reg_types)}): {sorted(reg_types)}")
print(f"\nYears ({len(years)}): {sorted(years)}")
print(f"\nParking ({len(parking)}): {sorted(parking)}")
print(f"\nSample Areas (up to 200): {sorted(list(areas))[:30]}")
print(f"\nTotal unique areas collected: {len(areas)}")

import sys

with open('d:/SmartMove/Dashboards/england/dashboard/scripts/preprocess.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find where "for csv_file in csv_files:" starts
start_idx = -1
for i, line in enumerate(lines):
    if "for csv_file in csv_files:" in line:
        start_idx = i
        break

# find where the loop should end
end_idx = -1
for i, line in enumerate(lines):
    if "print(\"Computing derived metrics...\")" in line:
        end_idx = i
        break

# The lines from start_idx + 8 to end_idx - 1 need to be indented by 12 spaces instead of 8.
# Actually, the original was indented by 8 spaces (inside `for row in rows:`).
# Now it should be inside `for row in reader:`, so it needs 16 spaces instead of 8.
# Wait, let's just add 8 spaces to each line in that range.

new_lines = lines[:start_idx + 8]
for line in lines[start_idx + 8:end_idx]:
    if line.strip() == "":
        new_lines.append(line)
    else:
        new_lines.append("        " + line)
new_lines.extend(lines[end_idx:])

with open('d:/SmartMove/Dashboards/england/dashboard/scripts/preprocess.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed indentation!")

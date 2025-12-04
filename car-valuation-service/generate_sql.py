"""
Script để generate SQL từ metadata.json
Output: seed_valuation_metadata.sql
"""
import json
import os
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
METADATA_FILE = BASE_DIR / "metadata.json"
OUTPUT_SQL = BASE_DIR / "seed_valuation_metadata.sql"

print("="*80)
print("GENERATE SQL SCRIPT TỪ METADATA.JSON")
print("="*80)

# Load metadata
if not METADATA_FILE.exists():
    raise FileNotFoundError(f"Không tìm thấy file {METADATA_FILE}")

with open(METADATA_FILE, 'r', encoding='utf-8') as f:
    metadata = json.load(f)

print(f"\n✅ Đã load metadata.json")

# Generate SQL
sql_lines = []
sql_lines.append("-- ============================================")
sql_lines.append("-- Seed Car Valuation Metadata")
sql_lines.append(f"-- Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
sql_lines.append("-- ============================================\n")

sql_lines.append("-- Clear existing data")
sql_lines.append("TRUNCATE TABLE car_valuation_metadata CASCADE;\n")

sql_lines.append("-- Insert data")
sql_lines.append("INSERT INTO car_valuation_metadata (id, make, model, year, version, color, \"createdAt\", \"updatedAt\") VALUES\n")

records = []
record_count = 0

# Process metadata
for make in metadata['makes']:
    models = metadata['make_models'].get(make, [])
    
    for model in models:
        years = metadata['model_years'].get(make, {}).get(model, [])
        
        for year in years:
            versions = metadata['year_versions'].get(make, {}).get(model, {}).get(str(year), [])
            colors = metadata['version_colors'].get(make, {}).get(model, {}).get(str(year), {})
            
            if not versions:
                # No versions, just add make/model/year
                colors_for_year = colors.get('', [])
                if colors_for_year:
                    for color in colors_for_year:
                        escaped_color = color.replace("'", "''")
                        escaped_make = make.replace("'", "''")
                        escaped_model = model.replace("'", "''")
                        records.append(f"(gen_random_uuid(), '{escaped_make}', '{escaped_model}', {year}, NULL, '{escaped_color}', NOW(), NOW())")
                        record_count += 1
                else:
                    escaped_make = make.replace("'", "''")
                    escaped_model = model.replace("'", "''")
                    records.append(f"(gen_random_uuid(), '{escaped_make}', '{escaped_model}', {year}, NULL, NULL, NOW(), NOW())")
                    record_count += 1
            else:
                # Has versions
                for version in versions:
                    version_colors = colors.get(version, [])
                    escaped_version = version.replace("'", "''")
                    escaped_make = make.replace("'", "''")
                    escaped_model = model.replace("'", "''")
                    if version_colors:
                        for color in version_colors:
                            escaped_color = color.replace("'", "''")
                            records.append(f"(gen_random_uuid(), '{escaped_make}', '{escaped_model}', {year}, '{escaped_version}', '{escaped_color}', NOW(), NOW())")
                            record_count += 1
                    else:
                        records.append(f"(gen_random_uuid(), '{escaped_make}', '{escaped_model}', {year}, '{escaped_version}', NULL, NOW(), NOW())")
                        record_count += 1

# Join records with commas and newlines
sql_lines.append(",\n".join(records))
sql_lines.append(";\n")

sql_lines.append(f"-- Total records: {record_count}\n")

# Write to file
with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f"\n✅ Đã generate SQL script!")
print(f"   📁 File: {OUTPUT_SQL}")
print(f"   📊 Tổng số records: {record_count}")
print(f"\n📋 Cách sử dụng:")
print(f"   1. Mở PostgreSQL (psql hoặc pgAdmin)")
print(f"   2. Connect vào database của bạn")
print(f"   3. Chạy lệnh: \\i {OUTPUT_SQL}")
print(f"      hoặc copy nội dung file và paste vào query editor")
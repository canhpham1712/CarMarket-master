"""
Script để extract metadata từ dataset và output ra file JSON
"""
import json
import pandas as pd
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_FILE = BASE_DIR / "metadata.json"

print("="*60)
print("EXTRACT METADATA TỪ DATASET")
print("="*60)

# Load dataset đã làm sạch
cleaned_file = DATA_DIR / "toyota_cleaned.csv"
if not cleaned_file.exists():
    raise FileNotFoundError(f"Không tìm thấy file {cleaned_file}")

print(f"\n📁 Đang đọc dữ liệu từ: {cleaned_file.name}")
df = pd.read_csv(cleaned_file, encoding='utf-8')
print(f"   ✅ Đã đọc {len(df)} dòng")

# 1. Extract makes
print(f"\n1️⃣ EXTRACT MAKES:")
makes = sorted(df['make'].dropna().unique().tolist())
print(f"   ✅ {len(makes)} makes: {makes}")

# 2. Extract models theo từng make
print(f"\n2️⃣ EXTRACT MODELS THEO MAKE:")
make_models = {}
for make in makes:
    models = sorted(df[df['make'] == make]['model'].dropna().unique().tolist())
    make_models[make] = models
    print(f"   ✅ {make}: {len(models)} models")

# 3. Extract years theo từng model
print(f"\n3️⃣ EXTRACT YEARS THEO MODEL:")
model_years = defaultdict(dict)
for make in makes:
    for model in make_models[make]:
        years = df[(df['make'] == make) & (df['model'] == model)]['year'].dropna().unique().tolist()
        years = sorted([int(y) for y in years if pd.notna(y)])
        if years:
            model_years[make][model] = years
            print(f"   ✅ {make} {model}: {len(years)} years ({min(years)}-{max(years)})")

# 4. Extract versions theo từng year của model
print(f"\n4️⃣ EXTRACT VERSIONS THEO YEAR CỦA MODEL:")
year_versions = defaultdict(lambda: defaultdict(dict))
for make in makes:
    for model in make_models[make]:
        if model not in model_years.get(make, {}):
            continue
        for year in model_years[make][model]:
            versions = df[(df['make'] == make) & 
                         (df['model'] == model) & 
                         (df['year'] == year)]['version'].dropna().unique().tolist()
            versions = sorted([v for v in versions if v and str(v).strip()])
            if versions:
                year_versions[make][model][year] = versions
                print(f"   ✅ {make} {model} {year}: {len(versions)} versions")

# 5. Extract colors theo từng version
print(f"\n5️⃣ EXTRACT COLORS THEO VERSION:")
version_colors = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))
for make in makes:
    for model in make_models[make]:
        if model not in year_versions.get(make, {}):
            continue
        for year in year_versions[make][model]:
            if year not in year_versions[make][model]:
                continue
            for version in year_versions[make][model][year]:
                colors = df[(df['make'] == make) & 
                           (df['model'] == model) & 
                           (df['year'] == year) &
                           (df['version'] == version)]['color'].dropna().unique().tolist()
                colors = sorted([c for c in colors if c and str(c).strip()])
                if colors:
                    version_colors[make][model][year][version] = colors
                    print(f"   ✅ {make} {model} {year} {version}: {len(colors)} colors")

# 6. Tạo output structure
output = {
    'makes': makes,
    'make_models': make_models,
    'model_years': dict(model_years),  # {make: {model: [years]}}
    'year_versions': {make: {model: {str(year): versions for year, versions in years_dict.items()} 
                              for model, years_dict in models_dict.items()}
                      for make, models_dict in year_versions.items()},  # {make: {model: {year: [versions]}}}
    'version_colors': {make: {model: {str(year): {version: colors for version, colors in versions_dict.items()}
                                      for year, versions_dict in years_dict.items()}
                              for model, years_dict in models_dict.items()}
                      for make, models_dict in version_colors.items()}  # {make: {model: {year: {version: [colors]}}}}
}

# 6. Lưu ra file JSON
print(f"\n💾 Đang lưu ra file JSON...")
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n✅ Hoàn thành!")
print(f"   📁 File output: {OUTPUT_FILE}")
print(f"   - Makes: {len(makes)}")
print(f"   - Make-Model pairs: {sum(len(models) for models in make_models.values())}")
print(f"   - Model-Year pairs: {sum(len(years) for years_dict in model_years.values() for years in years_dict.values())}")
print(f"   - Year-Version pairs: {sum(len(versions) for models_dict in year_versions.values() for versions_dict in models_dict.values() for versions in versions_dict.values())}")
print(f"   - Version-Color pairs: {sum(len(colors) for models_dict in version_colors.values() for years_dict in models_dict.values() for versions_dict in years_dict.values() for colors in versions_dict.values())}")
print(f"\n📋 Cấu trúc output:")
print(f"   {{")
print(f"     'makes': [...],")
print(f"     'make_models': {{'Toyota': ['Camry', 'Vios', ...]}}, ")
print(f"     'model_years': {{'Toyota': {{'Camry': [2018, 2019, ...]}}}}, ")
print(f"     'year_versions': {{'Toyota': {{'Camry': {{'2018': ['2.5Q', '2.0E', ...]}}}}}}, ")
print(f"     'version_colors': {{'Toyota': {{'Camry': {{'2018': {{'2.5Q': ['Trắng', 'Đen', ...]}}}}}}}}")
print(f"   }}")


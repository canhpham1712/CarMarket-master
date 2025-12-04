"""
Script scrape dữ liệu Toyota từ bonbanh.com
Sử dụng URL chính xác cho từng model
"""
import os
import sys
from pathlib import Path

# Import các hàm helper từ scrape_bonbanh.py
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.append(str(CURRENT_DIR))

from scrape_bonbanh import (
    get_car_details,
    extract_ad_id_from_url,
    clean_text
)
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import csv
import time
import random
import re
from datetime import datetime

# ----------------- CẤU HÌNH -----------------
TOYOTA_MODEL_URLS = {
    "vios": "https://bonbanh.com/oto/toyota-vios",
    "fortuner": "https://bonbanh.com/oto/toyota-fortuner",
    "innova": "https://bonbanh.com/oto/toyota-innova",
    "camry": "https://bonbanh.com/oto/toyota-camry",
    "corolla_cross": "https://bonbanh.com/oto/toyota-corolla_cross",
    "land_cruiser": "https://bonbanh.com/oto/toyota-land_cruiser",
    "corolla_altis": "https://bonbanh.com/oto/toyota-corolla_altis",
    "prado": "https://bonbanh.com/oto/toyota-prado",
    "yaris": "https://bonbanh.com/oto/toyota-yaris",
    "veloz": "https://bonbanh.com/oto/toyota-veloz",
    "yaris-cross": "https://bonbanh.com/oto/toyota-yaris-cross",
    "raize": "https://bonbanh.com/oto/toyota-raize",
    "alphard": "https://bonbanh.com/oto/toyota-alphard",
    "wigo": "https://bonbanh.com/oto/toyota-wigo",
    "4_runner": "https://bonbanh.com/oto/toyota-4_runner",
    "avalon": "https://bonbanh.com/oto/toyota-avalon",
    "avanza": "https://bonbanh.com/oto/toyota-avanza",
    "aygo": "https://bonbanh.com/oto/toyota-aygo",
    "corolla": "https://bonbanh.com/oto/toyota-corolla",
    "corona": "https://bonbanh.com/oto/toyota-corona",
    "cressida": "https://bonbanh.com/oto/toyota-cressida",
    "crown": "https://bonbanh.com/oto/toyota-crown",
    "fj_cruiser": "https://bonbanh.com/oto/toyota-fj_cruiser",
    "granvia": "https://bonbanh.com/oto/toyota-granvia",
    "hiace": "https://bonbanh.com/oto/toyota-hiace",
    "highlander": "https://bonbanh.com/oto/toyota-highlander",
    "hilux": "https://bonbanh.com/oto/toyota-hilux",
    "iq": "https://bonbanh.com/oto/toyota-iq",
    "matrix": "https://bonbanh.com/oto/toyota-matrix",
    "previa": "https://bonbanh.com/oto/toyota-previa",
    "publica": "https://bonbanh.com/oto/toyota-publica",
    "rav4": "https://bonbanh.com/oto/toyota-rav4",
    "rush": "https://bonbanh.com/oto/toyota-rush",
    "sienna": "https://bonbanh.com/oto/toyota-sienna",
    "tundra": "https://bonbanh.com/oto/toyota-tundra",
    "van": "https://bonbanh.com/oto/toyota-van",
    "venza": "https://bonbanh.com/oto/toyota-venza",
    "zace": "https://bonbanh.com/oto/toyota-zace",
}

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MAX_PAGES_PER_MODEL = 40  # Giới hạn rất cao, thực tế sẽ dừng khi hết dữ liệu
DELAY_BETWEEN_REQUESTS = (1, 2)  # Random delay 1-2 giây


def scrape_toyota_model(model_slug, base_url, max_pages=MAX_PAGES_PER_MODEL):
    """
    Scrape listings cho 1 model Toyota cụ thể
    """
    print(f"\n{'='*60}")
    print(f"🚗 Scraping Toyota {model_slug}")
    print(f"URL: {base_url}")
    print(f"{'='*60}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    cars = []
    scraped_urls = set()
    
    page = 1
    consecutive_empty_pages = 0
    max_empty_pages = 2  # Dừng sau 2 trang trống liên tiếp
    
    while page <= max_pages:
        # URL với pagination
        if page == 1:
            url_page = base_url
        else:
            url_page = f"{base_url}?page={page}"
        
        print(f"\n  📄 Page {page}: {url_page}")
        
        try:
            res = requests.get(url_page, timeout=15, headers=headers)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")
            
            # Tìm các listing (selector từ scrape_bonbanh.py)
            car_divs = soup.select("li.car-item, div.car-item, .car-item")
            
            if not car_divs:
                consecutive_empty_pages += 1
                print(f"  ⚠️ No cars found on page {page} (empty pages: {consecutive_empty_pages})")
                
                # Nếu 2 trang trống liên tiếp → hết dữ liệu
                if consecutive_empty_pages >= max_empty_pages:
                    print(f"  ✅ Reached end of listings (no more cars)")
                    break
                
                page += 1
                time.sleep(random.uniform(1, 2))
                continue
            
            # Reset counter nếu tìm thấy xe
            consecutive_empty_pages = 0
            
            print(f"  🔍 Found {len(car_divs)} cars on page {page}")
            
            for idx, div in enumerate(car_divs, 1):
                link_tag = div.find("a")
                if not link_tag or not link_tag.get("href"):
                    continue
                
                url_full = urljoin("https://bonbanh.com", link_tag["href"])
                
                # Kiểm tra duplicate
                if url_full in scraped_urls:
                    continue
                scraped_urls.add(url_full)
                
                ad_id = extract_ad_id_from_url(url_full)
                
                # Lấy chi tiết xe
                details = get_car_details(url_full, headers)
                if not details:
                    continue
                
                # Kiểm tra xem có đúng Toyota không
                extracted_make = details.get("extracted_make")
                if extracted_make and extracted_make.lower() != "toyota":
                    print(f"  ⚠️ Skipping: {details['title'][:50]}... (wrong make: {extracted_make})")
                    continue
                
                # Ưu tiên dùng make/model từ title
                final_make = extracted_make or "Toyota"
                final_model = details.get("extracted_model") or model_slug
                
                car_data = {
                    "ad_id": ad_id,
                    "make": final_make,
                    "model": final_model,
                    "title": details["title"],
                    "price_vnd": details["price"],
                    "mileage": details["mileage"],
                    "location": details["location"],
                    "year": details["year"],
                    "fuel": details["fuel"],
                    "engine": details.get("engine"),  # Toàn bộ thông tin động cơ: "Xăng 1.5 L"
                    "gearbox": details["gearbox"],
                    "body": details["body"],
                    "color": details["color"],
                    "seats": details["seats"],
                    "engine_power": details["engine_power"],
                    "origin": details["origin"],
                    "accident_free": details["accident_free"],
                    "single_owner": details["single_owner"],
                    "description": details["description"],
                    "url": details["url"]
                }
                
                cars.append(car_data)
                engine_info = details.get("engine", "N/A")
                print(f"  ✅ [{len(cars)}] {details['title'][:50]}... | {details['price']} triệu | {engine_info}")
                
                # Delay giữa các request
                time.sleep(random.uniform(*DELAY_BETWEEN_REQUESTS))
            
            # Delay giữa các trang
            time.sleep(random.uniform(2, 3))
            
            # Tăng page number
            page += 1
            
        except Exception as e:
            print(f"  ❌ Error on page {page}: {e}")
            time.sleep(random.uniform(2, 3))
            page += 1
            continue
    
    print(f"\n  📊 Total scraped for {model_slug}: {len(cars)} cars")
    return cars


def main():
    """Main function để scrape tất cả model Toyota"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = OUTPUT_DIR / f"toyota_cars_{timestamp}.csv"
    
    # Tạo CSV file
    fieldnames = [
        "ad_id", "make", "model", "title", "price_vnd", "mileage", "location",
        "year", "fuel", "engine", "gearbox", "body", "color", "seats", "engine_power",
        "origin", "accident_free", "single_owner", "description", "url"
    ]
    
    all_cars = []
    total_models = len(TOYOTA_MODEL_URLS)
    
    print(f"\n🚀 Starting Toyota scraper")
    print(f"📋 Total models to scrape: {total_models}")
    print(f"💾 Output file: {csv_filename}\n")
    
    for model_idx, (model_slug, base_url) in enumerate(TOYOTA_MODEL_URLS.items(), 1):
        print(f"\n[{model_idx}/{total_models}] Processing {model_slug}...")
        
        cars = scrape_toyota_model(model_slug, base_url, max_pages=MAX_PAGES_PER_MODEL)
        all_cars.extend(cars)
        
        print(f"✅ Progress: {len(all_cars)} total cars scraped so far")
        
        # Delay giữa các model
        if model_idx < total_models:
            delay = random.uniform(3, 5)
            print(f"⏳ Waiting {delay:.1f}s before next model...")
            time.sleep(delay)
    
    # Ghi tất cả vào CSV
    if all_cars:
        with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_cars)
        
        print(f"\n{'='*60}")
        print(f"🎉 SCRAPING COMPLETED!")
        print(f"{'='*60}")
        print(f"📊 Total cars scraped: {len(all_cars)}")
        print(f"💾 Saved to: {csv_filename}")
        
        # Thống kê theo model
        from collections import Counter
        model_counts = Counter(car["model"] for car in all_cars)
        print(f"\n📈 Breakdown by model:")
        for model, count in model_counts.most_common():
            print(f"  - {model}: {count} cars")
    else:
        print("\n⚠️ No cars scraped!")


if __name__ == "__main__":
    main()


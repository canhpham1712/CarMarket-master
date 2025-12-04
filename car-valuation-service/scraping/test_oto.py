"""
File test để kiểm tra scraping từ oto.com.vn
Lấy thử khoảng 10 tin và lưu vào CSV để đánh giá
"""
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re
import csv
import time
import random
from datetime import datetime
from pathlib import Path

# Import các hàm từ scrape_oto.py
import sys
sys.path.insert(0, str(Path(__file__).parent))
from scrape_oto import (
    extract_ad_id_from_url,
    get_car_details,
    clean_text,
    extract_price_vnd,
    extract_mileage_from_text,
    parse_color_from_text,
    extract_version_from_title,
    extract_links_from_page,
    try_direct_pagination,
    get_all_listings_with_selenium,
    USE_SELENIUM,
    SELENIUM_AVAILABLE
)

def test_scrape_sample():
    """Scrape khoảng 10 tin và lưu vào CSV"""
    test_url = "https://oto.com.vn/mua-ban-xe-toyota-vios"
    max_cars = 10  # Số lượng xe cần scrape
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    OUTPUT_DIR = Path(__file__).resolve().parents[1] / "data"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = OUTPUT_DIR / f"test_oto_sample_{timestamp}.csv"
    
    fieldnames = [
        "ad_id", "make", "model", "version", "title", "price_vnd", "mileage", "location",
        "year", "fuel", "engine", "gearbox", "body", "color", "seats", "engine_power",
        "origin", "accident_free", "single_owner", "description", "url"
    ]
    
    print(f"🔍 Testing URL: {test_url}")
    print(f"📊 Số lượng xe cần scrape: {max_cars}")
    print(f"💾 Output file: {csv_filename}\n")
    
    try:
        res = requests.get(test_url, timeout=15, headers=headers)
        res.raise_for_status()
        
        print(f"✅ Status: {res.status_code}")
        print(f"📊 HTML length: {len(res.text):,} characters\n")
        
        soup = BeautifulSoup(res.text, "html.parser")
        
        # Tìm các link từ item-car
        print("🔍 Tìm các link từ item-car...")
        car_links = []
        
        # Tìm trong div.item-car
        item_cars = soup.find_all("div", class_="item-car")
        print(f"✅ Tìm thấy {len(item_cars)} div.item-car\n")
        
        for item_car in item_cars:
            link = item_car.find("a", href=True)
            if link:
                href = link.get("href")
                if href:
                    if not href.startswith('http'):
                        href = urljoin('https://oto.com.vn', href)
                    
                    # Chỉ lấy URLs có aidxc
                    if '/mua-ban-xe-toyota' in href and 'aidxc' in href:
                        if href not in car_links:
                            car_links.append(href)
        
        print(f"✅ Tìm thấy {len(car_links)} links\n")
        
        if len(car_links) == 0:
            print("⚠️ Không tìm thấy link nào!")
            return
        
        # Giới hạn số lượng
        car_links = car_links[:max_cars]
        print(f"📋 Sẽ scrape {len(car_links)} xe\n")
        
        cars = []
        
        for idx, url_full in enumerate(car_links, 1):
            print(f"[{idx}/{len(car_links)}] Đang scrape: {url_full[:80]}...")
            
            try:
                ad_id = extract_ad_id_from_url(url_full)
                details = get_car_details(url_full, headers)
                
                if not details:
                    print(f"  ❌ Không lấy được chi tiết")
                    continue
                
                car_data = {
                    "ad_id": ad_id,
                    "make": details.get("make") or "Toyota",
                    "model": details.get("model"),
                    "version": details.get("version"),
                    "title": details["title"],
                    "price_vnd": details["price_vnd"],
                    "mileage": details["mileage"],
                    "location": details["location"],
                    "year": details["year"],
                    "fuel": details["fuel"],
                    "engine": details.get("engine"),
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
                title_short = (details['title'][:50] + '...') if details['title'] and len(details['title']) > 50 else details['title']
                print(f"  ✅ {title_short} | {details['price_vnd']} triệu")
                
                time.sleep(random.uniform(1, 2))
                
            except Exception as e:
                print(f"  ❌ Error: {str(e)[:100]}")
                continue
        
        # Lưu vào CSV
        if cars:
            with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(cars)
            
            print(f"\n{'='*70}")
            print(f"🎉 HOÀN TẤT!")
            print(f"{'='*70}")
            print(f"📊 Tổng số xe scraped: {len(cars)}")
            print(f"💾 Đã lưu vào: {csv_filename}")
            
            # Hiển thị mẫu dữ liệu
            print(f"\n📄 Mẫu dữ liệu (3 xe đầu tiên):")
            for i, car in enumerate(cars[:3], 1):
                print(f"\n[{i}] {car.get('title', 'N/A')}")
                print(f"    Model: {car.get('model', 'N/A')} | Version: {car.get('version', 'N/A')}")
                print(f"    Price: {car.get('price_vnd', 'N/A')} triệu | Year: {car.get('year', 'N/A')}")
                print(f"    Mileage: {car.get('mileage', 'N/A')} | Location: {car.get('location', 'N/A')}")
        else:
            print("\n⚠️ Không có xe nào được scrape!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("="*70)
    print("🧪 TEST SCRAPING OTO.COM.VN - Scrape 10 tin mẫu")
    print("="*70)
    print()
    test_scrape_sample()


import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re
import time
import random
import csv
from datetime import datetime

# ----------------- CẤU HÌNH ----------------- 
BRANDS = ["toyota", "vinfast", "honda", "hyundai", "kia", "mazda", "suzuki", "bmw", "ford", "mercedes-benz"]
OUTPUT_DIR = "car_data"
MAX_PAGES_PER_MODEL = 5

# Tạo thư mục output nếu chưa có
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# ----------------- HÀM HỖ TRỢ ----------------- 
def extract_ad_id_from_url(url):
    """Tạo ad_id từ URL"""
    path = urlparse(url).path
    ad_id = path.strip('/').split('/')[-1]
    return ad_id

def clean_text(text):
    """Làm sạch text, loại bỏ khoảng trắng thừa"""
    if not text:
        return None
    return ' '.join(text.split()).strip()

def extract_price(text):
    """Trích xuất giá theo triệu VND từ text"""
    if not text:
        return None
    text = text.lower().replace('.', '').replace(',', '')
    
    # Xử lý pattern "1 tỷ 420 triệu"
    match = re.search(r'(\d+(?:\.\d+)?)\s*tỷ\s*(\d+)?\s*triệu?', text)
    if match:
        ty = float(match.group(1))
        tr = int(match.group(2)) if match.group(2) else 0
        return int(ty * 1000 + tr)
    
    # Xử lý "1.42 tỷ"
    match = re.search(r'(\d+(?:\.\d+)?)\s*tỷ', text)
    if match:
        return int(float(match.group(1)) * 1000)
    
    # Xử lý "420 triệu"
    match = re.search(r'(\d+)\s*triệu', text)
    if match:
        return int(match.group(1))
    
    return None

def extract_mileage(text):
    """Trích xuất số km từ text, xử lý cả 'vạn km' và 'km' thường"""
    if not text:
        return None
    text = str(text).lower()
    
    # Pattern 1: "5 vạn km" hoặc "5.5 vạn km" -> 50000 km hoặc 55000 km
    match_van = re.search(r'([\d,\.]+)\s*vạn\s*km', text)
    if match_van:
        num_str = match_van.group(1).replace(',', '.').replace(' ', '')
        try:
            num = float(num_str) * 10000  # 1 vạn = 10,000
            return f"{int(num)} km"
        except:
            pass
    
    # Pattern 2: "50,000 km" hoặc "50.000 km" -> 50000 km
    match_km = re.search(r'([\d,\.]+)\s*km', text)
    if match_km:
        num_str = match_km.group(1).replace(',', '').replace('.', '')
        try:
            return f"{int(num_str)} km"
        except:
            pass
    
    return None

def get_car_details(url, headers):
    """Lấy chi tiết 1 xe từ trang chi tiết"""
    try:
        res = requests.get(url, timeout=15, headers=headers)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")
        
        # Title - lấy từ h1 hoặc title
        title = None
        extracted_make = None
        extracted_model = None
        
        h1_tag = soup.find("h1", class_="car-title")
        if not h1_tag:
            h1_tag = soup.find("h1")
        if h1_tag:
            title = clean_text(h1_tag.get_text())
        else:
            title_tag = soup.find("title")
            if title_tag:
                title = clean_text(title_tag.get_text())
        
        # Extract make và model từ title (format: "Xe <Make> <Model> <Version> <Year> - <Price>")
        if title:
            title_match = re.match(r'Xe\s+(\w+)\s+([^\s]+)', title, re.I)
            if title_match:
                extracted_make = title_match.group(1).strip()
                extracted_model = title_match.group(2).strip()
        
        # Giá - tìm trong title hoặc giá riêng
        price = None
        price_tag = soup.find(class_=re.compile(r'price|gia', re.I))
        if price_tag:
            price = extract_price(price_tag.get_text())
        if not price and title:
            price = extract_price(title)
        
        # Description - mô tả chi tiết
        description = None
        desc_selectors = [
            ".car-description",
            ".detail-content", 
            ".description",
            "#car-description",
            "[class*='desc']"
        ]
        for selector in desc_selectors:
            desc_tag = soup.select_one(selector)
            if desc_tag:
                description = clean_text(desc_tag.get_text())
                break
        
        # Thông tin chi tiết - từ bảng thông số
        info = {
            "mileage": None,
            "location": None,
            "year": None,
            "fuel": None,
            "gearbox": None,
            "body": None,
            "color": None,
            "seats": None,
            "engine_power": None,
            "origin": None
        }
        
        # Tìm box_car_detail chứa thông số kỹ thuật
        detail_box = soup.find('div', class_='box_car_detail')
        if detail_box:
            # Tìm tất cả các row (div.row, div.row_last) chứa thông tin
            info_rows = detail_box.find_all('div', class_=re.compile(r'row'))
            
            for row in info_rows:
                text = row.get_text().lower()
                
                # Mileage - km đã đi (xử lý cả "vạn km" và "km" thường)
                if re.search(r'(đã đi|số km|km đi)', text) and not info["mileage"]:
                    # Pattern 1: "5 vạn km" hoặc "5.5 vạn km" -> 50000 km
                    match_van = re.search(r'([\d,\.]+)\s*vạn\s*km', text)
                    if match_van:
                        num_str = match_van.group(1).replace(',', '.').replace(' ', '')
                        try:
                            num = float(num_str) * 10000  # 1 vạn = 10,000
                            info["mileage"] = f"{int(num)} km"
                            continue
                        except:
                            pass
                    
                    # Pattern 2: "50,000 km" hoặc "50.000 km" -> 50000 km
                    match_km = re.search(r'([\d,\.]+)\s*km', text)
                    if match_km:
                        num_str = match_km.group(1).replace(',', '').replace('.', '')
                        try:
                            info["mileage"] = f"{int(num_str)} km"
                        except:
                            pass
                
                # Year
                if re.search(r'năm sản xuất|năm sx', text) and not info["year"]:
                    year_match = re.search(r'20\d{2}', text)
                    if year_match:
                        info["year"] = year_match.group()
                
                # Engine (Động cơ) - lấy toàn bộ text sau "Động cơ:"
                if re.search(r'động cơ', text) and not info.get("engine"):
                    # Tìm span.inp chứa thông tin động cơ
                    inp_span = row.find('span', class_='inp')
                    if inp_span:
                        engine_text = clean_text(inp_span.get_text())
                        if engine_text:
                            info["engine"] = engine_text
                            # Trích xuất fuel từ engine (Xăng/Dầu/Điện/Hybrid)
                            if not info["fuel"]:
                                if 'xăng' in engine_text.lower():
                                    info["fuel"] = "Xăng"
                                elif 'dầu' in engine_text.lower() or 'diesel' in engine_text.lower():
                                    info["fuel"] = "Dầu"
                                elif 'điện' in engine_text.lower():
                                    info["fuel"] = "Điện"
                                elif 'hybrid' in engine_text.lower():
                                    info["fuel"] = "Hybrid"
                
                # Gearbox (Hộp số)
                if re.search(r'hộp số', text) and not info["gearbox"]:
                    if 'tự động' in text or 'cvt' in text:
                        info["gearbox"] = "Tự động"
                    elif 'số tay' in text or 'số sàn' in text or 'thủ công' in text:
                        info["gearbox"] = "Số sàn"
                
                # Body type (Kiểu dáng)
                if re.search(r'kiểu dáng|loại xe', text) and not info["body"]:
                    inp_span = row.find('span', class_='inp')
                    if inp_span:
                        body_text = clean_text(inp_span.get_text()).lower()
                        if 'sedan' in body_text:
                            info["body"] = "Sedan"
                        elif 'suv' in body_text:
                            info["body"] = "SUV"
                        elif 'hatchback' in body_text:
                            info["body"] = "Hatchback"
                        elif 'crossover' in body_text:
                            info["body"] = "Crossover"
                        elif 'mpv' in body_text:
                            info["body"] = "MPV"
                
                # Color (Màu ngoại thất)
                if re.search(r'màu ngoại thất', text) and not info["color"]:
                    inp_span = row.find('span', class_='inp')
                    if inp_span:
                        color_text = clean_text(inp_span.get_text())
                        if color_text:
                            info["color"] = color_text.title()
                
                # Seats (Số chỗ ngồi)
                if re.search(r'số chỗ|chỗ ngồi', text) and not info["seats"]:
                    seats_match = re.search(r'(\d+)\s*(ghế|chỗ)', text)
                    if seats_match:
                        info["seats"] = seats_match.group(1)
                
                # Origin (Xuất xứ)
                if re.search(r'xuất xứ', text) and not info["origin"]:
                    inp_span = row.find('span', class_='inp')
                    if inp_span:
                        origin_text = clean_text(inp_span.get_text()).lower()
                        if 'nhật' in origin_text:
                            info["origin"] = "Nhật Bản"
                        elif 'thái' in origin_text:
                            info["origin"] = "Thái Lan"
                        elif 'hàn' in origin_text:
                            info["origin"] = "Hàn Quốc"
                        elif 'việt' in origin_text or 'trong nước' in origin_text or 'lắp ráp' in origin_text:
                            info["origin"] = "Việt Nam"
        
        # Lấy năm từ title nếu chưa có
        if not info["year"] and title:
            year_match = re.search(r'20\d{2}', title)
            if year_match:
                info["year"] = year_match.group()
        
        # Location - từ contact-box
        contact_box = soup.find('div', class_='contact-box')
        if contact_box:
            contact_txt = contact_box.find('div', class_='contact-txt')
            if contact_txt:
                # Tìm dòng "Địa chỉ:"
                text = contact_txt.get_text()
                addr_match = re.search(r'Địa chỉ:\s*(.+?)(?:\n|Website|$)', text, re.I)
                if addr_match:
                    addr = clean_text(addr_match.group(1))
                    # Trích xuất tỉnh/thành phố (từ cuối cùng)
                    parts = addr.split(',')
                    if parts:
                        info["location"] = clean_text(parts[-1])  # Lấy phần cuối cùng (tỉnh/TP)
        
        # Accident free & single owner từ description
        page_text = soup.get_text().lower()
        accident_free = None
        if any(kw in page_text for kw in ['không tai nạn', 'ko tai nạn', 'không đâm đụng', 'ko đâm', 'chưa đâm', 'accident free']):
            accident_free = True
        elif any(kw in page_text for kw in ['tai nạn', 'đâm đụng', 'accident']):
            accident_free = False
        
        single_owner = any(kw in page_text for kw in ['1 chủ', 'một chủ', 'single owner', 'chủ duy nhất', 'chủ từ đầu', 'chủ từ mới'])
        
        return {
            "title": title,
            "price": price,
            "mileage": info["mileage"],
            "location": info["location"],
            "year": info["year"],
            "fuel": info["fuel"],
            "engine": info.get("engine"),  # Thông tin động cơ đầy đủ: "Xăng 1.5 L"
            "gearbox": info["gearbox"],
            "body": info["body"],
            "color": info["color"],
            "seats": info["seats"],
            "engine_power": info["engine_power"],
            "origin": info["origin"],
            "accident_free": accident_free,
            "single_owner": single_owner,
            "description": description,
            "url": url,
            "extracted_make": extracted_make,
            "extracted_model": extracted_model
        }
    except Exception as e:
        print(f"  ❌ Error fetching {url}: {e}")
        return None

def get_all_models_for_brand(brand, headers):
    """Lấy danh sách tất cả các model của một hãng xe"""
    try:
        url = f"https://bonbanh.com/oto/{brand}"
        res = requests.get(url, timeout=15, headers=headers)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")
        
        models = set()
        # Tìm tất cả các link có dạng /oto/brand-model
        for link in soup.find_all("a", href=True):
            href = link["href"]
            # Pattern: /oto/brand-model hoặc /oto/brand-model-something
            pattern = f"^/oto/{brand}-([a-z0-9-]+)$"
            match = re.match(pattern, href)
            if match:
                model = match.group(1)
                # Loại bỏ các suffix không phải model
                if not any(x in model for x in ['cu', 'moi', 'nam-', 'mau-', 'so-']):
                    models.add(model)
        
        return list(models)
    except Exception as e:
        print(f"  ❌ Error getting models for {brand}: {e}")
        return []

def scrape_listings(make, model, max_pages, csv_writer, scraped_urls):
    """Scrape listings cho một model cụ thể"""
    base_url = f"https://bonbanh.com/oto/{make}-{model}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    count = 0
    for page in range(1, max_pages + 1):
        url_page = f"{base_url}?page={page}" if page > 1 else base_url
        print(f"    📄 Page {page}...")
        
        try:
            res = requests.get(url_page, timeout=15, headers=headers)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")
            
            # Tìm danh sách xe
            car_links = []
            
            # Tìm theo class car-item
            for item in soup.select("li.car-item, div.car-item, .car-item"):
                link = item.find("a", href=True)
                if link:
                    car_links.append(link["href"])
            
            # Nếu không tìm thấy, thử tìm tất cả link có pattern /xe-
            if not car_links:
                for link in soup.find_all("a", href=re.compile(r'^/xe-')):
                    car_links.append(link["href"])
            
            if not car_links:
                print(f"    ⚠️ No cars found on page {page}")
                break
            
            print(f"    🔍 Found {len(car_links)} cars on page {page}")
            
            for href in car_links:
                url_full = urljoin("https://bonbanh.com", href)
                ad_id = extract_ad_id_from_url(url_full)
                
                # Kiểm tra duplicate
                if url_full in scraped_urls:
                    continue
                
                scraped_urls.add(url_full)
                
                # Lấy chi tiết xe
                details = get_car_details(url_full, headers)
                if not details:
                    continue
                
                # Ghi vào CSV
                csv_writer.writerow({
                    "ad_id": ad_id,
                    "make": make,
                    "model": model,
                    "title": details["title"],
                    "price_vnd": details["price"],
                    "mileage": details["mileage"],
                    "location": details["location"],
                    "year": details["year"],
                    "fuel": details["fuel"],
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
                })
                
                count += 1
                title_short = (details['title'][:50] + '...') if details['title'] and len(details['title']) > 50 else details['title']
                print(f"    ✅ [{count}] {title_short} | {details['price']} triệu")
                
                # Delay ngẫu nhiên
                time.sleep(random.uniform(1, 3))
                
        except Exception as e:
            print(f"    ❌ Error on page {page}: {e}")
            time.sleep(random.uniform(2, 3))
    
    return count

# ----------------- RUN ----------------- 
if __name__ == "__main__":
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = os.path.join(OUTPUT_DIR, f"cars_data_{timestamp}.csv")
    
    fieldnames = [
        "ad_id", "make", "model", "title", "price_vnd", "mileage", "location",
        "year", "fuel", "gearbox", "body", "color", "seats", "engine_power",
        "origin", "accident_free", "single_owner", "description", "url"
    ]
    
    with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        scraped_urls = set()
        total_cars = 0
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        print(f"🚀 Bắt đầu scrape {len(BRANDS)} hãng xe")
        print(f"📁 File output: {csv_filename}\n")
        
        for brand_idx, brand in enumerate(BRANDS, 1):
            print(f"\n{'='*70}")
            print(f"🚗 [{brand_idx}/{len(BRANDS)}] Hãng: {brand.upper()}")
            print(f"{'='*70}")
            
            # Lấy danh sách models
            print(f"  📋 Đang tìm danh sách models...")
            models = get_all_models_for_brand(brand, headers)
            
            if not models:
                print(f"  ⚠️ Không tìm thấy model nào cho {brand}")
                continue
            
            print(f"  ✓ Tìm thấy {len(models)} models")
            
            for model_idx, model in enumerate(models, 1):
                print(f"\n  🔧 [{model_idx}/{len(models)}] Model: {model}")
                count = scrape_listings(brand, model, MAX_PAGES_PER_MODEL, writer, scraped_urls)
                total_cars += count
                print(f"  📊 Đã scrape {count} xe cho {brand} {model}")
                
                # Delay giữa các model
                time.sleep(random.uniform(2, 4))
    
    print(f"\n{'='*70}")
    print(f"🎉 HOÀN TẤT!")
    print(f"{'='*70}")
    print(f"📊 Tổng số xe thu thập: {total_cars}")
    print(f"💾 Dữ liệu đã lưu vào: {csv_filename}")
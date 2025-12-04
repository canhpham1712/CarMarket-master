"""
Script scrape dữ liệu Toyota từ oto.com.vn
Format output giống với bonbanh.com
"""
import os
import sys
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re
import time
import random
import csv
from datetime import datetime
from pathlib import Path

# Selenium imports
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        WEBDRIVER_MANAGER_AVAILABLE = True
    except ImportError:
        WEBDRIVER_MANAGER_AVAILABLE = False
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    WEBDRIVER_MANAGER_AVAILABLE = False
    print("⚠️ Selenium not installed. Install with: pip install selenium webdriver-manager")

# ----------------- CẤU HÌNH ----------------- 
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MAX_PAGES = 50  # Giới hạn số trang
DELAY_BETWEEN_REQUESTS = (2, 4)  # Delay 2-4 giây
USE_SELENIUM = True  # Sử dụng Selenium để scroll và load thêm listings
SCROLL_PAUSE_TIME = 2  # Thời gian chờ sau mỗi lần scroll (giây)
MAX_SCROLL_ATTEMPTS =100  # Số lần scroll tối đa

# URL base cho Toyota trên oto.com.vn
BASE_URL = "https://oto.com.vn/mua-ban-xe-toyota"

# Danh sách các model Toyota
TOYOTA_MODELS = [
    "vios", "innova", "camry", "corolla-altis", "corolla-cross", "yaris", "wigo", "hilux",
    "4-runner", "alphard", "avalon", "avanza", "avanza-premio", "aygo", "corolla", "corona",
    "cressida", "crown", "hiace", "highlander", "innova-cross", "iq", "land-cruiser",
    "land-cruiser-prado", "previa", "raize", "rav4", "rush", "sequoia", "sienna", "veloz",
    "veloz-cross", "venza", "yaris-cross", "zace"
]

# ----------------- HÀM HỖ TRỢ ----------------- 
def extract_ad_id_from_url(url):
    """Tạo ad_id từ URL oto.com.vn
    Format: /mua-ban-xe-toyota-{model}-{location}/{title}-aidxc{id}
    """
    path = urlparse(url).path
    # Tìm aidxc{id} trong URL
    match = re.search(r'aidxc(\d+)', path)
    if match:
        return match.group(1)
    # Fallback: lấy phần cuối cùng
    ad_id = path.strip('/').split('/')[-1]
    return ad_id

def clean_text(text):
    """Làm sạch text"""
    if not text:
        return None
    return ' '.join(str(text).split()).strip()

def extract_price_vnd(text):
    """Trích xuất giá theo triệu VND từ text (ví dụ: "435.000.000 đ" -> 435)"""
    if not text:
        return None
    
    text = str(text).lower()
    
    # Pattern 1: "1 tỷ 200 triệu" hoặc "1 tỷ 420 triệu"
    match = re.search(r'(\d+(?:\.\d+)?)\s*tỷ\s*(\d+)?\s*triệu?', text)
    if match:
        ty = float(match.group(1))
        tr = int(match.group(2)) if match.group(2) else 0
        return int(ty * 1000 + tr)
    
    # Pattern 2: "1.42 tỷ" hoặc "1 tỷ"
    match = re.search(r'(\d+(?:\.\d+)?)\s*tỷ', text)
    if match:
        return int(float(match.group(1)) * 1000)
    
    # Pattern 3: "250 triệu" hoặc "420 triệu"
    match = re.search(r'(\d+)\s*triệu', text)
    if match:
        return int(match.group(1))
    
    # Pattern 4: "435.000.000 đ" hoặc "500.000.000"
    text_clean = text.replace('.', '').replace(',', '').replace(' ', '').replace('đ', '')
    match = re.search(r'(\d+)', text_clean)
    if match:
        price_vnd = int(match.group(1))
        price_million = price_vnd // 1000000
        return price_million if price_million > 0 else None
    
    return None

def extract_mileage_from_text(text):
    """Trích xuất số km từ text, trả về format "XXXXX km" """
    if not text:
        return None
    
    text = str(text).lower()
    
    # Pattern 1: "5 vạn km" hoặc "5.5 vạn km" -> 50000 km
    match_van = re.search(r'([\d,\.]+)\s*vạn\s*km', text)
    if match_van:
        num_str = match_van.group(1).replace(',', '.').replace(' ', '')
        try:
            num = float(num_str) * 10000
            return f"{int(num)} km"
        except:
            pass
    
    # Pattern 2: "50,000 km" hoặc "50.000 km" hoặc "50000 km"
    match_km = re.search(r'([\d,\.]+)\s*km', text)
    if match_km:
        num_str = match_km.group(1).replace(',', '').replace('.', '')
        try:
            return f"{int(num_str)} km"
        except:
            pass
    
    # Pattern 3: Chỉ có số (không có "km") - giả định là km nếu số lớn hơn 1000
    match_num = re.search(r'(\d{4,})', text)
    if match_num:
        num_str = match_num.group(1)
        try:
            num = int(num_str)
            if num >= 1000:
                return f"{num} km"
        except:
            pass
    
    return None

def parse_color_from_text(text):
    """Parse màu sắc từ text"""
    if not text:
        return None
    
    text_lower = str(text).lower()
    color_map = {
        'trắng': 'Trắng',
        'đen': 'Đen',
        'bạc': 'Bạc',
        'xám': 'Xám',
        'ghi': 'Ghi',
        'đỏ': 'Đỏ',
        'xanh': 'Xanh',
        'vàng': 'Vàng',
        'cát': 'Cát',
        'nâu': 'Nâu',
        'bạch kim': 'Bạch kim',
        'xanh dương': 'Xanh dương',
        'xanh lá': 'Xanh lá',
    }
    
    for key, value in color_map.items():
        if key in text_lower:
            return value
    
    return None

def extract_version_from_title(title, make, model):
    """
    Extract version từ title oto.com.vn
    Format: "Toyota Vios 1.5 G CVT 2015" -> "1.5 G CVT"
    """
    if not title or not make or not model:
        return None
    
    title = str(title).strip()
    make_str = str(make).strip()
    model_str = str(model).strip()
    
    # Pattern 1: Make Model Version Year (oto.com.vn format)
    # Ví dụ: "Toyota Vios 1.5 G CVT 2015"
    pattern = rf"{re.escape(make_str)}\s+{re.escape(model_str)}\s+(.+?)\s+(20\d{{2}})"
    match = re.search(pattern, title, re.IGNORECASE)
    
    if match:
        version = match.group(1).strip()
        # Loại bỏ các từ không phải version ở cuối
        version = re.sub(r'\s*-\s*$', '', version)
        # Loại bỏ các từ thông thường không phải version
        version = re.sub(r'\s+(Japan|chính chủ|cavet|chủ|màu|xe|chỗ|số|tự động|chạy|xăng|km|dep|cam|ket).*$', '', version, flags=re.IGNORECASE)
        version = version.strip()
        
        # Chỉ trả về nếu có chứa số hoặc là version hợp lệ (như "G", "GL", "E", "S")
        if version:
            # Nếu có số hoặc là chữ cái đơn (như G, GL, E, S)
            if re.search(r'\d', version) or (len(version) <= 5 and version.isupper()):
                return version
    
    # Pattern 2: Tìm pattern số + chữ (như "1.5G", "2.5G", "1.5 E")
    if make_str.lower() in title.lower() and model_str.lower() in title.lower():
        # Tìm pattern: số.chữ hoặc số chữ (như "1.5G", "2.5G", "1.5 E", "1.5 G CVT")
        pattern = r'([\d\.]+\s*[A-Z]+(?:\s+[A-Z]+)*)'
        matches = re.findall(pattern, title)
        for match in matches:
            version_candidate = match.strip()
            # Kiểm tra xem có phải version không (có số và chữ, độ dài hợp lý)
            if re.search(r'\d', version_candidate) and len(version_candidate) <= 20:
                # Loại bỏ các từ không phải version
                version_candidate = re.sub(r'\s+(Japan|chính chủ|cavet|chủ|màu|xe|chỗ|số|tự động|chạy|xăng|km).*$', '', version_candidate, flags=re.IGNORECASE)
                version_candidate = version_candidate.strip()
                if version_candidate:
                    return version_candidate
    
    return None

def get_car_details(url, headers):
    """Lấy chi tiết 1 xe từ trang chi tiết oto.com.vn"""
    try:
        res = requests.get(url, timeout=15, headers=headers)
        res.raise_for_status()
        # Đảm bảo encoding UTF-8
        res.encoding = 'utf-8'
        soup = BeautifulSoup(res.text, "html.parser")
        
        # Title - từ h1.title-detail
        title = None
        h1_tag = soup.find("h1", class_="title-detail")
        if h1_tag:
            title = clean_text(h1_tag.get_text())
        
        # Make - mặc định Toyota
        make = "Toyota"
        
        # Model - extract từ title hoặc URL
        model = None
        if title:
            # Format: "Toyota Zace 2004" -> "Zace"
            title_parts = title.split()
            if len(title_parts) >= 2 and title_parts[0].lower() == "toyota":
                model = title_parts[1]
        
        # Version - từ title
        version = None
        if title and make and model:
            version = extract_version_from_title(title, make, model)
        
        # Price - từ span.price trong box-price hoặc hidden input
        price_vnd = None
        # Thử từ hidden input trước (chính xác hơn)
        price_input = soup.find("input", id="hddPrice")
        if price_input and price_input.get("value"):
            try:
                price_value = int(price_input.get("value"))
                price_vnd = price_value // 1000000  # Chuyển từ VND sang triệu
            except:
                pass
        
        # Nếu không có từ hidden input, lấy từ span.price
        if not price_vnd:
            price_tag = soup.find("div", class_="box-price")
            if price_tag:
                price_span = price_tag.find("span", class_="price")
                if price_span:
                    price_text = clean_text(price_span.get_text())
                    price_vnd = extract_price_vnd(price_text)
        
        # Thông tin từ hidden inputs (chính xác hơn)
        year_input = soup.find("input", id="hddYear")
        year = None
        if year_input and year_input.get("value"):
            year = year_input.get("value")
        
        # Seats từ hidden input
        seats_input = soup.find("input", id="numberOfSeat")
        seats = None
        if seats_input and seats_input.get("value"):
            seats_value = seats_input.get("value")
            if seats_value and seats_value != "0":
                seats = seats_value
        
        # Fuel type từ hidden input
        fuel_type_input = soup.find("input", id="fuelType")
        fuel = None
        if fuel_type_input and fuel_type_input.get("value"):
            fuel_type_value = fuel_type_input.get("value")
            fuel_map = {"1": "Xăng", "2": "Dầu", "3": "Điện", "4": "Hybrid"}
            fuel = fuel_map.get(fuel_type_value)
        
        # Origin từ hidden input
        made_in_input = soup.find("input", id="madeInBy")
        origin = None
        if made_in_input and made_in_input.get("value"):
            made_in_value = made_in_input.get("value")
            origin_map = {"1": "Việt Nam", "2": "Nhật Bản", "3": "Thái Lan", "4": "Hàn Quốc"}
            origin = origin_map.get(made_in_value)
        
        # Body từ hidden input
        classification_input = soup.find("input", id="classificationName")
        body = None
        if classification_input and classification_input.get("value"):
            body = classification_input.get("value")
        
        # Thông tin từ box-info-detail (fallback nếu hidden inputs không có)
        info_box = soup.find("div", class_="box-info-detail")
        mileage = None
        gearbox = None
        location = None
        
        if info_box:
            # Tìm tất cả các list-info
            info_lists = info_box.find_all("ul", class_="list-info")
            for info_list in info_lists:
                items = info_list.find_all("li")
                for item in items:
                    label_elem = item.find("label", class_="label")
                    if not label_elem:
                        continue
                    
                    label_text = clean_text(label_elem.get_text()).lower()
                    # Lấy text sau label - cách tốt hơn
                    value_text = None
                    # Thử lấy từ div.small trước (cho location, tình trạng)
                    small_div = item.find("div", class_="small")
                    if small_div:
                        value_text = clean_text(small_div.get_text())
                    else:
                        # Lấy text node trực tiếp sau label element
                        # Tìm text node ngay sau label
                        next_sibling = label_elem.next_sibling
                        if next_sibling:
                            if isinstance(next_sibling, str):
                                value_text = clean_text(next_sibling)
                            else:
                                # Nếu là element, lấy text của nó
                                value_text = clean_text(next_sibling.get_text())
                        
                        # Fallback: Lấy toàn bộ text của li, rồi loại bỏ label
                        if not value_text or not value_text.strip():
                            item_text = clean_text(item.get_text())
                            label_text_full = clean_text(label_elem.get_text())
                            # Loại bỏ label text và dấu ":"
                            value_text = item_text.replace(label_text_full, "").replace(":", "").strip()
                    
                    # Năm SX (fallback nếu không có từ hidden input)
                    if 'năm sx' in label_text and not year:
                        year_match = re.search(r'20\d{2}', value_text)
                        if year_match:
                            year = year_match.group()
                    
                    # Nhiên liệu (fallback)
                    if 'nhiên liệu' in label_text and not fuel:
                        fuel_text = value_text.lower()
                        if 'xăng' in fuel_text or 'máy xăng' in fuel_text:
                            fuel = "Xăng"
                        elif 'dầu' in fuel_text or 'diesel' in fuel_text:
                            fuel = "Dầu"
                        elif 'điện' in fuel_text or 'electric' in fuel_text:
                            fuel = "Điện"
                        elif 'hybrid' in fuel_text:
                            fuel = "Hybrid"
                    
                    # Kiểu dáng (fallback)
                    if 'kiểu dáng' in label_text and not body:
                        body_text = value_text.lower()
                        if 'sedan' in body_text:
                            body = "Sedan"
                        elif 'suv' in body_text:
                            body = "SUV"
                        elif 'hatchback' in body_text:
                            body = "Hatchback"
                        elif 'crossover' in body_text:
                            body = "Crossover"
                        elif 'mpv' in body_text or 'van' in body_text or 'minivan' in body_text:
                            body = "MPV"
                        elif 'pickup' in body_text or 'bán tải' in body_text:
                            body = "Pickup"
                    
                    # Km đã đi
                    if ('km đã đi' in label_text or 'km đi' in label_text) and not mileage:
                        if value_text:
                            mileage = extract_mileage_from_text(value_text)
                    
                    # Hộp số
                    if 'hộp số' in label_text and not gearbox:
                        if value_text:
                            gearbox_text = value_text.lower()
                            if 'tự động' in gearbox_text or 'automatic' in gearbox_text or 'cvt' in gearbox_text or 'số tự động' in gearbox_text:
                                gearbox = "Tự động"
                            elif 'số sàn' in gearbox_text or 'số tay' in gearbox_text or 'manual' in gearbox_text or 'mt' in gearbox_text:
                                gearbox = "Số sàn"
                            else:
                                # Nếu không match, lấy nguyên value_text
                                gearbox = value_text
                    
                    # Xuất xứ (fallback)
                    if 'xuất xứ' in label_text and not origin:
                        origin_text = value_text.lower()
                        if 'nhật' in origin_text or 'japan' in origin_text:
                            origin = "Nhật Bản"
                        elif 'thái' in origin_text or 'thailand' in origin_text:
                            origin = "Thái Lan"
                        elif 'hàn' in origin_text or 'korea' in origin_text:
                            origin = "Hàn Quốc"
                        elif 'việt' in origin_text or 'vietnam' in origin_text or 'trong nước' in origin_text:
                            origin = "Việt Nam"
                    
                    # Tỉnh thành
                    if 'tỉnh thành' in label_text and not location:
                        if value_text:
                            location = value_text
        
        # Engine - kết hợp fuel
        engine = fuel if fuel else None
        
        # Engine power - không thấy trong HTML mẫu
        engine_power = None
        
        # Description - từ div.description
        description = None
        desc_div = soup.find("div", class_="description")
        if desc_div:
            # Lấy text và đảm bảo encoding UTF-8
            desc_text = desc_div.get_text()
            if desc_text:
                # Clean và normalize text
                description = clean_text(desc_text)
                # Đảm bảo là string UTF-8
                if isinstance(description, bytes):
                    description = description.decode('utf-8', errors='ignore')
        
        # Color - từ description hoặc title
        color = None
        if description:
            color = parse_color_from_text(description.lower())
        if not color and title:
            color = parse_color_from_text(title.lower())
        
        # Accident free & single owner từ description
        accident_free = None
        single_owner = False
        
        full_text = (description or '').lower() + ' ' + (title or '').lower()
        
        if any(kw in full_text for kw in ['không tai nạn', 'ko tai nạn', 'không đâm đụng', 'ko đâm', 'chưa đâm', 'accident free', 'cam kết không tai nạn']):
            accident_free = True
        elif any(kw in full_text for kw in ['tai nạn', 'đâm đụng', 'accident']):
            accident_free = False
        
        single_owner = any(kw in full_text for kw in ['1 chủ', 'một chủ', 'single owner', 'chủ duy nhất', 'chủ từ đầu', 'chủ từ mới', 'chính chủ'])
        
        return {
            "title": title,
            "make": make,
            "model": model,
            "version": version,
            "price_vnd": price_vnd,
            "mileage": mileage,
            "location": location,
            "year": year,
            "fuel": fuel,
            "engine": engine,
            "gearbox": gearbox,
            "body": body,
            "color": color,
            "seats": seats,
            "engine_power": engine_power,
            "origin": origin,
            "accident_free": accident_free,
            "single_owner": single_owner,
            "description": description,
            "url": url
        }
    except Exception as e:
        print(f"  ❌ Error fetching {url}: {e}")
        return None

def get_all_listings_with_selenium(url, max_scroll_attempts=MAX_SCROLL_ATTEMPTS):
    """
    Sử dụng Selenium để scroll và load thêm listings
    URL sẽ tự động thay đổi thành /p2, /p3, ... khi scroll
    """
    if not SELENIUM_AVAILABLE:
        print("  ⚠️ Selenium not available, falling back to requests only")
        return []
    
    all_links = set()
    
    try:
        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument('--headless')  # Chạy ẩn browser
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Sử dụng webdriver-manager để tự động tải ChromeDriver
        if WEBDRIVER_MANAGER_AVAILABLE:
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
        else:
            # Fallback: sử dụng ChromeDriver từ PATH
            driver = webdriver.Chrome(options=chrome_options)
        
        driver.set_page_load_timeout(30)
        
        print(f"  🌐 Loading page with Selenium: {url}")
        driver.get(url)
        time.sleep(3)  # Đợi page load
        
        # Lấy links ban đầu
        initial_links = extract_links_from_page(driver.page_source)
        all_links.update(initial_links)
        print(f"  📊 Initial links: {len(initial_links)}")
        
        # Scroll và load thêm
        last_count = len(all_links)
        scroll_attempts = 0
        no_new_links_count = 0
        
        while scroll_attempts < max_scroll_attempts:
            # Scroll xuống cuối trang
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(SCROLL_PAUSE_TIME)
            
            # Kiểm tra URL có thay đổi không (có thể thành /p2, /p3, etc.)
            current_url = driver.current_url
            print(f"  📍 Current URL: {current_url}")
            
            # Lấy links mới
            new_links = extract_links_from_page(driver.page_source)
            all_links.update(new_links)
            
            new_count = len(all_links)
            if new_count > last_count:
                print(f"  ✅ Found {new_count - last_count} new links (total: {new_count})")
                last_count = new_count
                no_new_links_count = 0
            else:
                no_new_links_count += 1
                if no_new_links_count >= 3:
                    print(f"  ✅ No new links after {no_new_links_count} scrolls, stopping")
                    break
            
            scroll_attempts += 1
        
        driver.quit()
        print(f"  🎯 Total unique links found: {len(all_links)}")
        return list(all_links)
        
    except Exception as e:
        print(f"  ❌ Selenium error: {str(e)[:200]}")
        if 'driver' in locals():
            try:
                driver.quit()
            except:
                pass
        return []

def extract_links_from_page(html_content):
    """Extract car links từ HTML content"""
    soup = BeautifulSoup(html_content, "html.parser")
    links = []
    
    # Tìm trong div.item-car
    item_cars = soup.find_all("div", class_="item-car")
    for item_car in item_cars:
        link = None
        title_h3 = item_car.find("h3", class_="title")
        if title_h3:
            link = title_h3.find("a", href=True)
        
        if not link:
            photo_div = item_car.find("div", class_="photo")
            if photo_div:
                link = photo_div.find("a", href=True)
        
        if not link:
            link = item_car.find("a", href=True)
        
        if link:
            href = link.get("href")
            if href:
                if not href.startswith('http'):
                    href = urljoin('https://oto.com.vn', href)
                
                if '/mua-ban-xe-toyota' in href and 'aidxc' in href:
                    href = href.split('#')[0]
                    if href not in links:
                        links.append(href)
    
    return links

def try_direct_pagination(url_base, max_pages=MAX_PAGES):
    """
    Thử truy cập trực tiếp các URL /p2, /p3, ... 
    URL format: https://oto.com.vn/mua-ban-xe-toyota-{model}/p2
    """
    all_links = set()
    
    for page in range(1, max_pages + 1):
        if page == 1:
            url = url_base
        else:
            # Thử format /p2, /p3, etc.
            url = f"{url_base}/p{page}"
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            res = requests.get(url, timeout=15, headers=headers)
            res.raise_for_status()
            res.encoding = 'utf-8'
            
            links = extract_links_from_page(res.text)
            if not links:
                print(f"  ⚠️ No links found on page {page}, stopping pagination")
                break
            
            all_links.update(links)
            print(f"  📄 Page {page}: Found {len(links)} links (total: {len(all_links)})")
            
            time.sleep(random.uniform(1, 2))
            
        except Exception as e:
            print(f"  ⚠️ Error accessing page {page}: {str(e)[:100]}")
            break
    
    return list(all_links)

def scrape_oto_listings(model=None, max_pages=MAX_PAGES, scraped_urls=None):
    """Scrape listings từ oto.com.vn cho một model cụ thể hoặc tất cả models"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    cars = []
    if scraped_urls is None:
        scraped_urls = set()
    
    # Xác định danh sách models để scrape
    if model:
        models_to_scrape = [model]
    else:
        models_to_scrape = TOYOTA_MODELS
    
    for model_name in models_to_scrape:
        model_url = f"https://oto.com.vn/mua-ban-xe-toyota-{model_name}"
        
        print(f"\n{'='*70}")
        print(f"🚗 Model: {model_name}")
        print(f"{'='*70}")
        
        # Oto.com.vn sử dụng infinite scroll với URL thay đổi thành /p2, /p3, ...
        # Thử 2 cách:
        # 1. Truy cập trực tiếp /p2, /p3, ... (nếu hoạt động)
        # 2. Sử dụng Selenium để scroll và load thêm
        url_page = model_url
        print(f"\n📄 Scraping: {url_page}")
        
        car_links = []
        
        # Cách 1: Thử truy cập trực tiếp các URL /p2, /p3, ...
        print(f"  🔍 Trying direct pagination (/p2, /p3, ...)...")
        direct_links = try_direct_pagination(url_page, max_pages=max_pages)
        if direct_links:
            car_links.extend(direct_links)
            print(f"  ✅ Direct pagination found {len(direct_links)} links")
        
        # Cách 2: Sử dụng Selenium để scroll (nếu được bật và Selenium available)
        if USE_SELENIUM and SELENIUM_AVAILABLE:
            print(f"  🔍 Using Selenium to scroll and load more...")
            selenium_links = get_all_listings_with_selenium(url_page, max_scroll_attempts=MAX_SCROLL_ATTEMPTS)
            if selenium_links:
                car_links.extend(selenium_links)
                print(f"  ✅ Selenium found {len(selenium_links)} links")
        
        # Cách 3: Fallback - chỉ lấy từ trang đầu tiên
        if not car_links:
            print(f"  🔍 Fallback: Getting links from first page only...")
            try:
                res = requests.get(url_page, timeout=15, headers=headers)
                res.raise_for_status()
                res.encoding = 'utf-8'
                car_links = extract_links_from_page(res.text)
                print(f"  ✅ Found {len(car_links)} links from first page")
            except Exception as e:
                print(f"  ❌ Error getting first page: {str(e)[:100]}")
        
        # Loại bỏ duplicates
        car_links = list(set(car_links))
        
        if not car_links:
            print(f"  ⚠️ No cars found for {model_name}")
            continue
        
        print(f"  🔍 Total unique car links: {len(car_links)}")
        
        try:
            for idx, url_full in enumerate(car_links, 1):
                # Kiểm tra duplicate
                if url_full in scraped_urls:
                    continue
                scraped_urls.add(url_full)
                
                ad_id = extract_ad_id_from_url(url_full)
                
                # Lấy chi tiết xe
                details = get_car_details(url_full, headers)
                if not details:
                    continue
                
                # Chỉ lấy Toyota
                if details.get("make") and details["make"].lower() != "toyota":
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
                print(f"  ✅ [{len(cars)}] {title_short} | {details['price_vnd']} triệu")
                
                # Delay giữa các request
                time.sleep(random.uniform(*DELAY_BETWEEN_REQUESTS))
                
        except Exception as e:
            error_msg = str(e)[:200]
            print(f"  ❌ Error scraping {model_name}: {error_msg}")
            import traceback
            traceback.print_exc()
            continue
        
        # Delay giữa các model
        if model_name != models_to_scrape[-1]:
            delay = random.uniform(5, 8)
            print(f"⏳ Waiting {delay:.1f}s before next model...")
            time.sleep(delay)
    
    return cars

def main():
    """Main function"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = OUTPUT_DIR / f"toyota_oto_{timestamp}.csv"
    
    fieldnames = [
        "ad_id", "make", "model", "version", "title", "price_vnd", "mileage", "location",
        "year", "fuel", "engine", "gearbox", "body", "color", "seats", "engine_power",
        "origin", "accident_free", "single_owner", "description", "url"
    ]
    
    print(f"\n🚀 Starting Oto.com.vn scraper for Toyota")
    print(f"📋 Models: {len(TOYOTA_MODELS)} models")
    print(f"📋 Max pages per model: {MAX_PAGES}")
    print(f"💾 Output file: {csv_filename}\n")
    
    cars = scrape_oto_listings(model=None, max_pages=MAX_PAGES)
    
    if cars:
        with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(cars)
        
        print(f"\n{'='*60}")
        print(f"🎉 SCRAPING COMPLETED!")
        print(f"{'='*60}")
        print(f"📊 Total cars scraped: {len(cars)}")
        print(f"💾 Saved to: {csv_filename}")
        
        # Thống kê
        from collections import Counter
        model_counts = Counter(car.get("model") or "Unknown" for car in cars)
        print(f"\n📈 Breakdown by model:")
        for model, count in model_counts.most_common():
            print(f"  - {model}: {count} cars")
    else:
        print("\n⚠️ No cars scraped!")

if __name__ == "__main__":
    main()


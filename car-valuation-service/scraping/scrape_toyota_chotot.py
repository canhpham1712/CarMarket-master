"""
Script scrape dữ liệu Toyota từ chotot.com
Sử dụng itemprop (structured data) để extract chính xác các trường dữ liệu
Tuân thủ robots.txt: Allow: / (không dùng các tham số filter bị cấm)
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
import warnings
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO

# Suppress warnings từ BeautifulSoup và requests
warnings.filterwarnings('ignore')

# Suppress stderr/stdout khi parse HTML để tránh spam output
class SuppressOutput:
    """Context manager để suppress stdout/stderr"""
    def __enter__(self):
        self._stdout = sys.stdout
        self._stderr = sys.stderr
        sys.stdout = StringIO()
        sys.stderr = StringIO()
        return self
    
    def __exit__(self, *args):
        sys.stdout = self._stdout
        sys.stderr = self._stderr

# ----------------- CẤU HÌNH ----------------- 
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MAX_PAGES = 50  # Giới hạn số trang
DELAY_BETWEEN_REQUESTS = (2, 4)  # Delay 2-4 giây để tuân thủ robots.txt

# URL base cho Toyota trên chotot (xe.chotot.com) - scrape theo khu vực
# Các khu vực chính để scrape
REGIONS = [
    "tp-ho-chi-minh-sdcb2",  # TP.HCM
    "ha-noi-sdcb2",          # Hà Nội
    "da-nang-sdcb2",         # Đà Nẵng
]

# URL đầy đủ cho từng khu vực
REGION_URLS = {
    "tp-ho-chi-minh-sdcb2": "https://xe.chotot.com/mua-ban-oto-toyota-tp-ho-chi-minh-sdcb2",
    "ha-noi-sdcb2": "https://xe.chotot.com/mua-ban-oto-toyota-ha-noi-sdcb2",
    "da-nang-sdcb2": "https://xe.chotot.com/mua-ban-oto-toyota-da-nang-sdcb2",
}

BASE_URL_TEMPLATE = "https://xe.chotot.com/mua-ban-oto-toyota-{region}"

# ----------------- HÀM HỖ TRỢ ----------------- 
def extract_ad_id_from_url(url):
    """Tạo ad_id từ URL chotot"""
    path = urlparse(url).path
    # URL chotot thường có dạng: /mua-ban-oto-toyota-vios-xxx.htm hoặc /mua-ban-oto/xxx.htm
    ad_id = path.strip('/').split('/')[-1].replace('.htm', '')
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
    # Loại bỏ dấu chấm và khoảng trắng
    text_clean = text.replace('.', '').replace(',', '').replace(' ', '').replace('đ', '')
    
    # Tìm số
    match = re.search(r'(\d+)', text_clean)
    if match:
        price_vnd = int(match.group(1))
        # Chuyển từ VND sang triệu VND
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
            # Nếu số >= 1000, giả định là km
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
    Extract version từ title
    Format chotot thường: "{Make} {Model} {Version} {Year} - {Mileage}" hoặc "{Version} {Year} - {Mileage}"
    
    Examples:
    - "2 54 2013 2.5G - 127000 km" -> "2.5G"
    - "Toyota Camry 2.5G 2013 - 127000 km" -> "2.5G"
    - "Toyota Vios 2023 1.5G 5390 km" -> "1.5G"
    - "Bán Toyota Corolla 2009 Japan chính chủ cavet" -> None (không có version rõ ràng)
    """
    if not title:
        return None
    
    title = str(title).strip()
    
    # Pattern 1: "Toyota Model Version Year" hoặc "Model Version Year"
    if make and model:
        make_str = str(make).strip()
        model_str = str(model).strip()
        
        # Pattern: Make Model Version Year (có thể có "Bán" ở đầu)
        # Ví dụ: "Bán Toyota Corolla 2009" hoặc "Toyota Vios 2023 1.5G"
        pattern = rf"(?:Bán\s+)?{re.escape(make_str)}\s+{re.escape(model_str)}\s+(.+?)\s+(20\d{{2}})"
        match = re.search(pattern, title, re.IGNORECASE)
        
        if match:
            version = match.group(1).strip()
            # Loại bỏ các ký tự không cần thiết ở cuối
            version = re.sub(r'\s*-\s*$', '', version)  # Loại bỏ " -" ở cuối
            # Loại bỏ các từ không phải version (như "Japan", "chính chủ", etc.)
            version = re.sub(r'\s+(Japan|chính chủ|cavet|chủ|màu|xe|chỗ|số|tự động|chạy|xăng|km).*$', '', version, flags=re.IGNORECASE)
            version = version.strip()
            # Chỉ trả về nếu có chứa số hoặc chữ cái (không phải chỉ là từ thông thường)
            if version and (re.search(r'\d', version) or len(version) <= 10):
                return version if version else None
        
        # Pattern 1b: "Toyota Model Version" (không có năm, có thể trong description)
        # Ví dụ: "Toyota Vios 1.5G màu Nâu vàng"
        pattern = rf"{re.escape(make_str)}\s+{re.escape(model_str)}\s+([\d\.]+\s*[A-Z]+(?:\s+[A-Z]+)?)"
        match = re.search(pattern, title, re.IGNORECASE)
        if match:
            version = match.group(1).strip()
            # Loại bỏ các từ không phải version ở sau
            version = re.sub(r'\s+(màu|xe|chỗ|số|tự động|chạy|xăng|km|Japan|chính chủ|cavet|chủ|Bán).*$', '', version, flags=re.IGNORECASE)
            version = version.strip()
            if version and (re.search(r'\d', version) or len(version) <= 15):
                return version
    
    # Pattern 2: Format "2 54 2013 2.5G - 127000 km" (có số ở đầu)
    # Loại bỏ các số đơn lẻ ở đầu trước
    title_clean = re.sub(r'^\d+\s+\d+\s+', '', title)  # Loại bỏ "2 54 "
    title_clean = re.sub(r'^\d+\s+', '', title_clean)  # Loại bỏ số đơn lẻ ở đầu
    
    # Tìm pattern: Version Year
    pattern = r'(.+?)\s+(20\d{2})\s*-'
    match = re.search(pattern, title_clean)
    if match:
        before_year = match.group(1).strip()
        
        # Loại bỏ Make và Model nếu có
        if make and model:
            make_model_pattern = rf"{re.escape(make)}\s+{re.escape(model)}\s+"
            before_year = re.sub(make_model_pattern, '', before_year, flags=re.IGNORECASE)
        
        version = before_year.strip()
        # Loại bỏ các từ không phải version
        version = re.sub(r'\s+(Japan|chính chủ|cavet|chủ|Bán|màu|xe|chỗ|số|tự động|chạy|xăng|km).*$', '', version, flags=re.IGNORECASE)
        version = version.strip()
        
        # Chỉ trả về nếu có chứa số hoặc là version ngắn (như "1.5G", "2.5G")
        if version and (re.search(r'\d', version) or len(version) <= 10):
            return version if version else None
    
    # Pattern 3: Tìm pattern số + chữ cái ngay trước năm (như "1.5G 2023")
    pattern = r'([\d\.]+\s*[A-Z]+(?:\s+[A-Z]+)?)\s+(20\d{2})'
    match = re.search(pattern, title, re.IGNORECASE)
    if match:
        version = match.group(1).strip()
        return version
    
    # Pattern 4: Tìm pattern số + chữ cái đơn giản (như "1.5G", "2.5G") trong text
    # Chỉ tìm nếu có make và model trước đó
    if make and model:
        # Tìm pattern: số.chữ hoặc số chữ (như "1.5G", "2.5G", "1.5 E")
        pattern = r'([\d\.]+\s*[A-Z]+(?:\s+[A-Z]+)?)'
        matches = re.findall(pattern, title)
        for match in matches:
            version_candidate = match.strip()
            # Kiểm tra xem có phải version không (có số và chữ, độ dài hợp lý)
            if re.search(r'\d', version_candidate) and len(version_candidate) <= 15:
                # Loại bỏ các từ không phải version
                version_candidate = re.sub(r'\s+(màu|xe|chỗ|số|tự động|chạy|xăng|km|Japan|chính chủ|cavet|chủ|Bán).*$', '', version_candidate, flags=re.IGNORECASE)
                version_candidate = version_candidate.strip()
                if version_candidate:
                    return version_candidate
    
    return None

def get_car_details(url, headers):
    """Lấy chi tiết 1 xe từ trang chi tiết chotot sử dụng itemprop
    Returns: (details_dict, error_type) hoặc (None, None) nếu thành công
    error_type: '410' cho Gone, 'other' cho lỗi khác, None nếu thành công
    """
    try:
        # Loại bỏ fragment (#px=...) từ URL
        url_clean = url.split('#')[0] if '#' in url else url
        
        res = requests.get(url_clean, timeout=15, headers=headers)
        
        # Xử lý riêng lỗi 410 (Gone) - không raise để có thể return error type
        if res.status_code == 410:
            return None, '410'
        
        res.raise_for_status()
        
        # Loại bỏ script tags chứa JSON data lớn để tránh spam output
        html_content = res.text
        # Loại bỏ script tags chứa __NEXT_DATA__ hoặc JSON data lớn
        html_content = re.sub(r'<script[^>]*id="__NEXT_DATA__"[^>]*>.*?</script>', '', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<script[^>]*type="application/json"[^>]*>.*?</script>', '', html_content, flags=re.DOTALL)
        
        # Parse HTML với suppress output để tránh spam
        with SuppressOutput():
            soup = BeautifulSoup(html_content, "html.parser")
        
        # Title - từ h1
        title = None
        h1_tag = soup.find("h1")
        if h1_tag:
            title = clean_text(h1_tag.get_text())
        
        # Make - từ itemprop="carbrand"
        make = None
        make_tag = soup.find(itemprop="carbrand")
        if make_tag:
            make = clean_text(make_tag.get_text())
        elif title:
            # Fallback: parse từ title
            if 'toyota' in title.lower():
                make = "Toyota"
        
        # Model - từ itemprop="carmodel"
        model = None
        model_tag = soup.find(itemprop="carmodel")
        if model_tag:
            model = clean_text(model_tag.get_text())
        
        # Year - từ itemprop="mfdate"
        year = None
        year_tag = soup.find(itemprop="mfdate")
        if year_tag:
            year = clean_text(year_tag.get_text())
        
        # Mileage - từ itemprop="mileage_v2"
        mileage = None
        mileage_tag = soup.find(itemprop="mileage_v2")
        if mileage_tag:
            mileage_value = clean_text(mileage_tag.get_text())
            # Có thể là số thuần hoặc có "km"
            if mileage_value:
                mileage = extract_mileage_from_text(mileage_value) or f"{mileage_value} km"
        
        # Fuel - từ itemprop="fuel"
        fuel = None
        fuel_tag = soup.find(itemprop="fuel")
        if fuel_tag:
            fuel_text = clean_text(fuel_tag.get_text()).lower()
            if 'xăng' in fuel_text or 'petrol' in fuel_text:
                fuel = "Xăng"
            elif 'dầu' in fuel_text or 'diesel' in fuel_text:
                fuel = "Dầu"
            elif 'điện' in fuel_text or 'electric' in fuel_text:
                fuel = "Điện"
            elif 'hybrid' in fuel_text:
                fuel = "Hybrid"
        
        # Gearbox - từ itemprop="gearbox"
        gearbox = None
        gearbox_tag = soup.find(itemprop="gearbox")
        if gearbox_tag:
            gearbox_text = clean_text(gearbox_tag.get_text()).lower()
            if 'tự động' in gearbox_text or 'automatic' in gearbox_text or 'cvt' in gearbox_text:
                gearbox = "Tự động"
            elif 'số sàn' in gearbox_text or 'số tay' in gearbox_text or 'manual' in gearbox_text:
                gearbox = "Số sàn"
        
        # Body - từ itemprop="cartype"
        body = None
        body_tag = soup.find(itemprop="cartype")
        if body_tag:
            body_text = clean_text(body_tag.get_text()).lower()
            if 'sedan' in body_text:
                body = "Sedan"
            elif 'suv' in body_text:
                body = "SUV"
            elif 'hatchback' in body_text:
                body = "Hatchback"
            elif 'crossover' in body_text:
                body = "Crossover"
            elif 'mpv' in body_text:
                body = "MPV"
            elif 'pickup' in body_text or 'bán tải' in body_text:
                body = "Pickup"
        
        # Seats - từ itemprop="carseats"
        seats = None
        seats_tag = soup.find(itemprop="carseats")
        if seats_tag:
            seats = clean_text(seats_tag.get_text())
        
        # Origin - từ itemprop="carorigin"
        origin = None
        origin_tag = soup.find(itemprop="carorigin")
        if origin_tag:
            origin_text = clean_text(origin_tag.get_text()).lower()
            if 'nhật' in origin_text or 'japan' in origin_text:
                origin = "Nhật Bản"
            elif 'thái' in origin_text or 'thailand' in origin_text:
                origin = "Thái Lan"
            elif 'hàn' in origin_text or 'korea' in origin_text:
                origin = "Hàn Quốc"
            elif 'việt' in origin_text or 'vietnam' in origin_text or 'trong nước' in origin_text:
                origin = "Việt Nam"
        
        # Engine capacity - từ itemprop="engine_capacity"
        engine_capacity = None
        engine_cap_tag = soup.find(itemprop="engine_capacity")
        if engine_cap_tag:
            engine_capacity = clean_text(engine_cap_tag.get_text())
        
        # Engine power - từ itemprop="horse_power"
        engine_power = None
        engine_power_tag = soup.find(itemprop="horse_power")
        if engine_power_tag:
            engine_power = clean_text(engine_power_tag.get_text())
        
        # Fallback: tìm trong các div có label "Công suất động cơ"
        if not engine_power:
            # Tìm div chứa text "Công suất động cơ" và lấy giá trị bên cạnh
            for div in soup.find_all('div'):
                text = div.get_text()
                if 'công suất động cơ' in text.lower() or 'horse_power' in str(div.get('itemprop', '')).lower():
                    # Tìm số HP trong text
                    hp_match = re.search(r'(\d+\s*HP(?:\s*@\s*\d+\s*RPM)?)', text, re.I)
                    if hp_match:
                        engine_power = clean_text(hp_match.group(1))
                        break
                    # Hoặc lấy text từ span/value element bên cạnh
                    value_elem = div.find_next('span') or div.find(class_=lambda x: x and 'value' in str(x).lower())
                    if value_elem:
                        power_text = clean_text(value_elem.get_text())
                        if power_text and ('HP' in power_text.upper() or 'mã lực' in power_text.lower()):
                            engine_power = power_text
                            break
        
        # Engine - kết hợp fuel + engine_capacity
        engine = None
        if fuel and engine_capacity:
            engine = f"{fuel} {engine_capacity} L"
        elif fuel:
            engine = fuel
        
        # Price - tìm trong các element có class chứa "price"
        price_vnd = None
        price_selectors = [
            soup.find(class_=lambda x: x and 'price' in str(x).lower()),
            soup.find('b', class_=lambda x: x and 'price' in str(x).lower()),
            soup.find(string=re.compile(r'\d+\.?\d*\.?\d*\.?\d*\s*đ', re.I)),
        ]
        
        for price_elem in price_selectors:
            if price_elem:
                if isinstance(price_elem, str):
                    price_vnd = extract_price_vnd(price_elem)
                else:
                    price_vnd = extract_price_vnd(price_elem.get_text())
                if price_vnd:
                    break
        
        # Location - tìm trong các element có địa chỉ
        location = None
        # Tìm element có icon location hoặc text chứa địa chỉ
        location_selectors = [
            soup.find(string=re.compile(r'(Hà Nội|TP\.?\s*HCM|Đà Nẵng|Hải Phòng|Cần Thơ)', re.I)),
            soup.find(class_=lambda x: x and 'location' in str(x).lower()),
        ]
        
        for loc_elem in location_selectors:
            if loc_elem:
                if isinstance(loc_elem, str):
                    location = clean_text(loc_elem)
                else:
                    # Lấy text từ parent element
                    parent = loc_elem.parent if hasattr(loc_elem, 'parent') else None
                    if parent:
                        location = clean_text(parent.get_text())
                if location and len(location) > 5:
                    break
        
        # Nếu chưa có location, tìm trong breadcrumb hoặc các element khác
        if not location:
            page_text = soup.get_text()
            location_match = re.search(r'(Xã|Phường|Quận|Huyện|Thành phố|TP\.?)\s+([^,\n]+)', page_text)
            if location_match:
                location = clean_text(location_match.group(0))
        
        # Color - parse từ description hoặc title
        color = None
        description_text = ""
        
        # Description - từ itemprop="description"
        description = None
        desc_tag = soup.find(itemprop="description")
        if desc_tag:
            description = clean_text(desc_tag.get_text())
            description_text = description.lower()
        
        # Tìm color từ description hoặc title
        if description_text:
            color = parse_color_from_text(description_text)
        if not color and title:
            color = parse_color_from_text(title.lower())
        
        # Version - tìm theo thứ tự ưu tiên:
        # 1. itemprop="option" (Phiên bản xe trong thông số)
        # 2. Title
        # 3. Description
        version = None
        
        # Ưu tiên 1: Từ itemprop="option"
        option_tag = soup.find(itemprop="option")
        if option_tag:
            version = clean_text(option_tag.get_text())
            if version and version.strip():
                version = version.strip()
            else:
                version = None
        
        # Ưu tiên 2: Extract từ title
        if not version and title and make and model:
            version = extract_version_from_title(title, make, model)
        
        # Ưu tiên 3: Extract từ description
        if not version and description and make and model:
            version = extract_version_from_title(description, make, model)
        
        # Accident free & single owner từ description
        accident_free = None
        single_owner = False
        
        full_text = (description or '').lower() + ' ' + (title or '').lower()
        
        if any(kw in full_text for kw in ['không tai nạn', 'ko tai nạn', 'không đâm đụng', 'ko đâm', 'chưa đâm', 'accident free', 'không ngập nước']):
            accident_free = True
        elif any(kw in full_text for kw in ['tai nạn', 'đâm đụng', 'accident']):
            accident_free = False
        
        single_owner = any(kw in full_text for kw in ['1 chủ', 'một chủ', 'single owner', 'chủ duy nhất', 'chủ từ đầu', 'chủ từ mới'])
        
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
            "url": url_clean  # URL đã loại bỏ fragment
        }
        return details, None  # Thành công
    except requests.exceptions.HTTPError as e:
        # Xử lý lỗi HTTP
        if e.response and e.response.status_code == 410:
            return None, '410'  # Gone - không in error
        # Các lỗi HTTP khác
        error_msg = str(e)[:200]
        print(f"  ❌ Error fetching {url}: {error_msg}")
        return None, 'other'
    except Exception as e:
        # Các lỗi khác (timeout, connection, etc.)
        error_msg = str(e)[:200]  # Giới hạn độ dài error message
        print(f"  ❌ Error fetching {url}: {error_msg}")
        return None, 'other'

def scrape_chotot_listings(region=None, max_pages=MAX_PAGES, scraped_urls=None):
    """Scrape listings từ chotot.com theo khu vực"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    cars = []
    if scraped_urls is None:
        scraped_urls = set()
    
    # Xác định URL base
    if region:
        # Sử dụng REGION_URLS nếu có, nếu không thì dùng template
        base_url = REGION_URLS.get(region) or BASE_URL_TEMPLATE.format(region=region)
    else:
        # Mặc định TP.HCM
        base_url = REGION_URLS.get(REGIONS[0]) or BASE_URL_TEMPLATE.format(region=REGIONS[0])
    
    page = 1
    consecutive_empty_pages = 0
    max_empty_pages = 2
    
    while page <= max_pages:
        # URL với pagination
        if page == 1:
            url_page = base_url
        else:
            url_page = f"{base_url}?page={page}"
        
        print(f"\n📄 Page {page}: {url_page}")
        
        try:
            res = requests.get(url_page, timeout=15, headers=headers)
            res.raise_for_status()
            
            # Lưu HTML gốc để parse
            html_content = res.text
            
            # Parse HTML với suppress output để tránh spam
            with SuppressOutput():
                soup = BeautifulSoup(html_content, "html.parser")
            
            # Tìm các listing links
            car_links = []
            
            # Cách 1: Tìm trong JSON data từ __NEXT_DATA__ (ưu tiên cao nhất)
            try:
                next_data_script = soup.find('script', id='__NEXT_DATA__')
                if next_data_script:
                    import json
                    next_data = json.loads(next_data_script.string)
                    
                    # Tìm trong props.initialState.adlisting.data.ads (theo kết quả diagnose)
                    def extract_urls_from_json(obj, path=""):
                        """Recursively extract URLs from JSON structure"""
                        urls = []
                        if isinstance(obj, dict):
                            # Kiểm tra các key có thể chứa URL
                            for key in ['url', 'link', 'href', 'ad_url', 'adUrl', 'detail_url', 'detailUrl']:
                                if key in obj:
                                    url_value = str(obj[key])
                                    if '/mua-ban-oto' in url_value:
                                        if not url_value.startswith('http'):
                                            url_value = urljoin('https://xe.chotot.com', url_value)
                                        # Loại bỏ fragment
                                        url_value = url_value.split('#')[0]
                                        if url_value not in urls:
                                            urls.append(url_value)
                            
                            # Kiểm tra các key có thể chứa list của ads
                            for key in ['ads', 'listings', 'items', 'results', 'data', 'sticky_ads', 'stickyAds']:
                                if key in obj:
                                    urls.extend(extract_urls_from_json(obj[key], f"{path}.{key}"))
                            
                            # Recursively search in all values
                            for value in obj.values():
                                urls.extend(extract_urls_from_json(value, path))
                        
                        elif isinstance(obj, list):
                            for item in obj:
                                urls.extend(extract_urls_from_json(item, path))
                        
                        return urls
                    
                    # Extract từ toàn bộ JSON structure
                    json_urls = extract_urls_from_json(next_data)
                    for url_value in json_urls:
                        # Validate URL có ID số
                        if re.search(r'/\d+\.htm', url_value) or re.search(r'/mua-ban-oto[^/]*/\d+', url_value):
                            if url_value not in car_links:
                                car_links.append(url_value)
                    
                    # Nếu chưa tìm thấy, thử đường dẫn cụ thể
                    if not car_links and 'props' in next_data:
                        props = next_data['props']
                        # Thử initialState.adlisting.data.ads
                        if 'initialState' in props:
                            initial_state = props['initialState']
                            if 'adlisting' in initial_state:
                                adlisting = initial_state['adlisting']
                                if 'data' in adlisting and 'ads' in adlisting['data']:
                                    ads = adlisting['data']['ads']
                                    if isinstance(ads, list):
                                        for ad in ads:
                                            if isinstance(ad, dict):
                                                # Tìm URL trong ad object
                                                for url_key in ['url', 'link', 'href', 'ad_url', 'adUrl', 'detail_url', 'detailUrl', 'ad_id']:
                                                    if url_key in ad:
                                                        url_value = str(ad[url_key])
                                                        if '/mua-ban-oto' in url_value or (url_key == 'ad_id' and url_value.isdigit()):
                                                            # Nếu là ad_id, tạo URL
                                                            if url_key == 'ad_id':
                                                                # Cần tìm category hoặc tạo URL generic
                                                                url_value = f"/mua-ban-oto/{url_value}.htm"
                                                            if not url_value.startswith('http'):
                                                                url_value = urljoin('https://xe.chotot.com', url_value)
                                                            url_value = url_value.split('#')[0]
                                                            if url_value not in car_links:
                                                                car_links.append(url_value)
                        
                        # Thử pageProps
                        if 'pageProps' in props:
                            page_props = props['pageProps']
                            for key in ['listings', 'ads', 'items', 'results', 'data']:
                                if key in page_props and isinstance(page_props[key], list):
                                    for item in page_props[key]:
                                        if isinstance(item, dict):
                                            for url_key in ['url', 'link', 'href', 'ad_id', 'id']:
                                                if url_key in item:
                                                    url_value = str(item[url_key])
                                                    if '/mua-ban-oto' in url_value or (url_key == 'ad_id' and url_value.isdigit()):
                                                        if url_key == 'ad_id':
                                                            url_value = f"/mua-ban-oto/{url_value}.htm"
                                                        if not url_value.startswith('http'):
                                                            url_value = urljoin('https://xe.chotot.com', url_value)
                                                        url_value = url_value.split('#')[0]
                                                        if url_value not in car_links:
                                                            car_links.append(url_value)
            except Exception as e:
                # Nếu không parse được JSON, tiếp tục với cách khác
                pass
            
            # Cách 2: Tìm tất cả link có chứa "/mua-ban-oto" và có ID số
            for link in soup.find_all('a', href=True):
                href = link.get('href')
                if href:
                    # Loại bỏ fragment từ href
                    href = href.split('#')[0]
                    
                    # URL có thể là relative hoặc absolute
                    if '/mua-ban-oto' in href:
                        # Pattern linh hoạt hơn:
                        # - /mua-ban-oto-xxx/123456.htm
                        # - /mua-ban-oto/123456.htm
                        # - /mua-ban-oto-xxx/123456 (không có .htm)
                        # - /mua-ban-oto/123456 (không có .htm)
                        if not href.startswith('http'):
                            href = urljoin('https://xe.chotot.com', href)
                        
                        # Chấp nhận URL có số ID (có thể có hoặc không có .htm)
                        # Pattern: có số sau dấu / cuối cùng
                        if re.search(r'/\d+\.htm', href) or re.search(r'/mua-ban-oto[^/]*/\d+', href) or re.search(r'/mua-ban-oto.*/\d+$', href):
                            if href not in car_links:
                                car_links.append(href)
            
            # Cách 3: Tìm trong các card/listing element với nhiều selector khác nhau
            selectors = [
                {'class': lambda x: x and any(kw in str(x).lower() for kw in ['card', 'ad', 'item', 'listing', 'product'])},
                {'data-testid': lambda x: x and any(kw in str(x).lower() for kw in ['ad', 'listing', 'card'])},
                {'class': lambda x: x and 'ad-item' in str(x).lower()},
                {'class': lambda x: x and 'listing-item' in str(x).lower()},
            ]
            
            for selector in selectors:
                for elem in soup.find_all(attrs=selector):
                    # Tìm link trong element và các children
                    links = elem.find_all('a', href=True)
                    for link in links:
                        href = link.get('href')
                        if href:
                            href = href.split('#')[0]
                            if '/mua-ban-oto' in href:
                                if not href.startswith('http'):
                                    href = urljoin('https://xe.chotot.com', href)
                                # Pattern linh hoạt: có số ID
                                if re.search(r'/\d+\.htm', href) or re.search(r'/mua-ban-oto[^/]*/\d+', href) or re.search(r'/mua-ban-oto.*/\d+$', href):
                                    if href not in car_links:
                                        car_links.append(href)
            
            # Cách 4: Tìm trong tất cả các link có pattern chotot (fallback)
            for link in soup.find_all('a', href=re.compile(r'/mua-ban-oto')):
                href = link.get('href')
                if href:
                    href = href.split('#')[0]
                    if not href.startswith('http'):
                        href = urljoin('https://xe.chotot.com', href)
                    # Chấp nhận cả .htm và không có .htm nhưng có số ID
                    if re.search(r'/\d+\.htm', href) or re.search(r'/mua-ban-oto[^/]*/\d+', href) or re.search(r'/mua-ban-oto.*/\d+$', href):
                        if href not in car_links:
                            car_links.append(href)
            
            if not car_links:
                consecutive_empty_pages += 1
                print(f"  ⚠️ No cars found on page {page} (empty pages: {consecutive_empty_pages})")
                
                if consecutive_empty_pages >= max_empty_pages:
                    print(f"  ✅ Reached end of listings")
                    break
                
                page += 1
                time.sleep(random.uniform(*DELAY_BETWEEN_REQUESTS))
                continue
            
            consecutive_empty_pages = 0
            print(f"  🔍 Found {len(car_links)} cars on page {page}")
            
            # Counter cho các loại lỗi
            error_410_count = 0
            error_other_count = 0
            
            for idx, url_full in enumerate(car_links, 1):
                # Kiểm tra duplicate (scraped_urls được truyền vào từ hàm main)
                if url_full in scraped_urls:
                    continue
                scraped_urls.add(url_full)
                
                ad_id = extract_ad_id_from_url(url_full)
                
                # Lấy chi tiết xe
                details, error_type = get_car_details(url_full, headers)
                
                # Đếm lỗi 410 (không in từng error)
                if error_type == '410':
                    error_410_count += 1
                    continue
                
                # Đếm các lỗi khác (đã được in trong get_car_details)
                if error_type == 'other':
                    error_other_count += 1
                    continue
                
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
            
            # In summary của errors nếu có
            if error_410_count > 0:
                print(f"  ⚠️  {error_410_count} listings removed/deleted (410 Gone)")
            if error_other_count > 0:
                print(f"  ⚠️  {error_other_count} other errors occurred")
            
            # Delay giữa các trang
            time.sleep(random.uniform(3, 5))
            page += 1
            
        except Exception as e:
            # Chỉ in error message ngắn gọn
            error_msg = str(e)[:200]  # Giới hạn độ dài error message
            print(f"  ❌ Error on page {page}: {error_msg}")
            time.sleep(random.uniform(3, 5))
            page += 1
            continue
    
    return cars

def main():
    """Main function - scrape từ tất cả các khu vực"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = OUTPUT_DIR / f"toyota_chotot_{timestamp}.csv"
    
    fieldnames = [
        "ad_id", "make", "model", "version", "title", "price_vnd", "mileage", "location",
        "year", "fuel", "engine", "gearbox", "body", "color", "seats", "engine_power",
        "origin", "accident_free", "single_owner", "description", "url"
    ]
    
    print(f"\n🚀 Starting Chotot scraper for Toyota")
    print(f"📋 Regions: {', '.join(REGIONS)}")
    print(f"📋 Max pages per region: {MAX_PAGES}")
    print(f"💾 Output file: {csv_filename}\n")
    
    all_cars = []
    scraped_urls = set()  # Dùng chung để tránh duplicate giữa các khu vực
    
    for region_idx, region in enumerate(REGIONS, 1):
        print(f"\n{'='*70}")
        print(f"🌍 [{region_idx}/{len(REGIONS)}] Scraping region: {region}")
        print(f"{'='*70}")
        
        cars = scrape_chotot_listings(region=region, max_pages=MAX_PAGES, scraped_urls=scraped_urls)
        
        all_cars.extend(cars)
        print(f"✅ Scraped {len(cars)} cars from {region} (total: {len(all_cars)})")
        
        # Delay giữa các khu vực
        if region_idx < len(REGIONS):
            delay = random.uniform(5, 8)
            print(f"⏳ Waiting {delay:.1f}s before next region...")
            time.sleep(delay)
    
    cars = all_cars
    
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

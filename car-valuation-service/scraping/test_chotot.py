"""
File test để kiểm tra tính chính xác của scraper chotot.com
Test với một vài listings cụ thể để đảm bảo extract đúng các trường dữ liệu
"""
import sys
from pathlib import Path

# Import các hàm từ scrape_chotot.py
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.append(str(CURRENT_DIR))

from scrape_chotot import get_car_details, extract_ad_id_from_url, extract_price_vnd, extract_mileage_from_text
import requests
from bs4 import BeautifulSoup
import re

# ----------------- TEST URLs -----------------
# Một vài URL mẫu để test (có thể thay đổi)
TEST_URLS = [
    # URL từ HTML element mà user cung cấp (cần tìm URL thực tế)
    # "https://xe.chotot.com/mua-ban-oto-toyota-camry-2013-2-5g-127000-km-xxx.htm",
    
    # Có thể test với URL thực tế từ chotot.com
    # Ví dụ: tìm một vài listing Toyota từ trang chính
]

def test_extract_functions():
    """Test các hàm extract cơ bản"""
    print("=" * 70)
    print("🧪 TESTING EXTRACT FUNCTIONS")
    print("=" * 70)
    
    # Test extract_price_vnd
    print("\n1. Testing extract_price_vnd():")
    test_cases_price = [
        ("435.000.000 đ", 435),
        ("1.200.000.000 đ", 1200),
        ("250 triệu", 250),
        ("1 tỷ 200 triệu", 1200),
        ("500.000.000", 500),
        ("1 tỷ", 1000),
        ("420 triệu", 420),
    ]
    
    for text, expected in test_cases_price:
        result = extract_price_vnd(text)
        status = "✅" if result == expected else "❌"
        print(f"  {status} '{text}' -> {result} (expected: {expected})")
    
    # Test extract_mileage_from_text
    print("\n2. Testing extract_mileage_from_text():")
    test_cases_mileage = [
        ("127000 km", "127000 km"),
        ("50.000 km", "50000 km"),
        ("5 vạn km", "50000 km"),
        ("100000", "100000 km"),
        ("50000", "50000 km"),
        ("120000", "120000 km"),
    ]
    
    for text, expected in test_cases_mileage:
        result = extract_mileage_from_text(text)
        status = "✅" if result == expected else "❌"
        print(f"  {status} '{text}' -> {result} (expected: {expected})")
    
    # Test extract_ad_id_from_url
    print("\n3. Testing extract_ad_id_from_url():")
    test_cases_url = [
        ("https://xe.chotot.com/mua-ban-oto-toyota-camry-2013-129421455.htm", "mua-ban-oto-toyota-camry-2013-129421455"),
        ("/mua-ban-oto/129421455.htm", "129421455"),
        ("https://xe.chotot.com/mua-ban-oto-toyota-tp-ho-chi-minh/129421455.htm", "129421455"),
    ]
    
    for url, expected_prefix in test_cases_url:
        result = extract_ad_id_from_url(url)
        status = "✅" if expected_prefix in result else "❌"
        print(f"  {status} '{url}' -> '{result}'")

def test_single_listing(url):
    """Test extract dữ liệu từ một listing cụ thể"""
    print("\n" + "=" * 70)
    print(f"🧪 TESTING SINGLE LISTING")
    print("=" * 70)
    print(f"URL: {url}\n")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    try:
        details = get_car_details(url, headers)
        
        if not details:
            print("❌ Failed to extract details")
            return
        
        print("📊 EXTRACTED DATA:")
        print("-" * 70)
        
        # Hiển thị từng trường
        fields = [
            ("ad_id", extract_ad_id_from_url(url)),
            ("make", details.get("make")),
            ("model", details.get("model")),
            ("version", details.get("version")),
            ("title", details.get("title")),
            ("price_vnd", details.get("price_vnd")),
            ("mileage", details.get("mileage")),
            ("location", details.get("location")),
            ("year", details.get("year")),
            ("fuel", details.get("fuel")),
            ("engine", details.get("engine")),
            ("gearbox", details.get("gearbox")),
            ("body", details.get("body")),
            ("color", details.get("color")),
            ("seats", details.get("seats")),
            ("engine_power", details.get("engine_power")),
            ("origin", details.get("origin")),
            ("accident_free", details.get("accident_free")),
            ("single_owner", details.get("single_owner")),
            ("description", (details.get("description") or "")[:100] + "..." if details.get("description") else None),
            ("url", details.get("url")),
        ]
        
        for field_name, value in fields:
            status = "✅" if value else "⚠️"
            print(f"{status} {field_name:20s}: {value}")
        
        print("-" * 70)
        
        # Kiểm tra các trường quan trọng
        print("\n🔍 VALIDATION:")
        important_fields = ["make", "model", "title", "price_vnd", "year"]
        missing_fields = [f for f in important_fields if not details.get(f)]
        
        if missing_fields:
            print(f"⚠️ Missing important fields: {', '.join(missing_fields)}")
        else:
            print("✅ All important fields extracted")
        
        # So sánh với format CSV mong đợi
        print("\n📋 CSV FORMAT CHECK:")
        csv_row = {
            "ad_id": extract_ad_id_from_url(url),
            "make": details.get("make") or "",
            "model": details.get("model") or "",
            "version": details.get("version") or "",
            "title": details.get("title") or "",
            "price_vnd": details.get("price_vnd") or "",
            "mileage": details.get("mileage") or "",
            "location": details.get("location") or "",
            "year": details.get("year") or "",
            "fuel": details.get("fuel") or "",
            "engine": details.get("engine") or "",
            "gearbox": details.get("gearbox") or "",
            "body": details.get("body") or "",
            "color": details.get("color") or "",
            "seats": details.get("seats") or "",
            "engine_power": details.get("engine_power") or "",
            "origin": details.get("origin") or "",
            "accident_free": details.get("accident_free") if details.get("accident_free") is not None else "",
            "single_owner": details.get("single_owner") if details.get("single_owner") else False,
            "description": details.get("description") or "",
            "url": details.get("url") or "",
        }
        
        print("Sample CSV row:")
        print(",".join([str(v) for v in csv_row.values()][:5]) + "...")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def get_sample_urls():
    """Lấy một vài URL mẫu từ trang chính của chotot"""
    print("\n" + "=" * 70)
    print("🔍 FETCHING SAMPLE URLs FROM CHOTOT")
    print("=" * 70)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    # Sử dụng URL theo khu vực TP.HCM
    base_url = "https://xe.chotot.com/mua-ban-oto-toyota-tp-ho-chi-minh-sdcb2"
    
    try:
        res = requests.get(base_url, timeout=15, headers=headers)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")
        
        # Tìm các link listing
        sample_urls = []
        for link in soup.find_all('a', href=True):
            href = link.get('href')
            if href and '/mua-ban-oto' in href and '.htm' in href:
                if not href.startswith('http'):
                    href = f"https://xe.chotot.com{href}"
                if href not in sample_urls and re.search(r'/\d+\.htm', href):
                    sample_urls.append(href)
                    if len(sample_urls) >= 3:  # Lấy 3 URL đầu tiên
                        break
        
        print(f"✅ Found {len(sample_urls)} sample URLs")
        return sample_urls
        
    except Exception as e:
        print(f"❌ Error fetching sample URLs: {e}")
        return []

def main():
    """Main test function"""
    print("\n" + "=" * 70)
    print("🧪 CHOTOT SCRAPER TEST SUITE")
    print("=" * 70)
    
    # Test 1: Test các hàm extract cơ bản
    test_extract_functions()
    
    # Test 2: Lấy sample URLs và test
    sample_urls = get_sample_urls()
    
    if sample_urls:
        print(f"\n📋 Testing {len(sample_urls)} sample listings:")
        for idx, url in enumerate(sample_urls, 1):
            print(f"\n[{idx}/{len(sample_urls)}]")
            test_single_listing(url)
            
            # Delay giữa các test
            import time
            if idx < len(sample_urls):
                time.sleep(2)
    else:
        print("\n⚠️ No sample URLs found. Please provide test URLs manually.")
        print("\nTo test manually, update TEST_URLS in this file with actual URLs.")
    
    print("\n" + "=" * 70)
    print("✅ TEST COMPLETED")
    print("=" * 70)

if __name__ == "__main__":
    main()


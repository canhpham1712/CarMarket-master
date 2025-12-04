-- ========================================
-- SCRIPT TẠO HÀNG LOẠT CAR LISTINGS ĐA DẠNG
-- ========================================

-- Tạo function để generate random data
CREATE OR REPLACE FUNCTION generate_random_listings(count INTEGER DEFAULT 50)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
    car_makes TEXT[] := ARRAY['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Hyundai', 'Kia', 'Nissan', 'Mazda', 'Subaru', 'Lexus', 'Infiniti', 'Acura', 'Chevrolet', 'Cadillac', 'Jeep', 'Ram', 'GMC'];
    car_models TEXT[] := ARRAY['Camry', 'Civic', 'F-150', 'X3', 'C-Class', 'A4', 'Golf', 'Elantra', 'Sorento', 'Altima', 'CX-5', 'Outback', 'RX', 'Q50', 'TLX', 'Silverado', 'Escalade', 'Wrangler', '1500', 'Sierra'];
    body_types TEXT[] := ARRAY['sedan', 'hatchback', 'suv', 'coupe', 'convertible', 'wagon', 'pickup', 'van', 'minivan'];
    fuel_types TEXT[] := ARRAY['petrol', 'diesel', 'electric', 'hybrid', 'lpg', 'cng'];
    transmissions TEXT[] := ARRAY['manual', 'automatic', 'cvt', 'semi_automatic'];
    colors TEXT[] := ARRAY['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown', 'Gold', 'Orange', 'Purple', 'Yellow'];
    conditions TEXT[] := ARRAY['excellent', 'very_good', 'good', 'fair', 'poor'];
    price_types TEXT[] := ARRAY['fixed', 'negotiable', 'auction'];
    cities TEXT[] := ARRAY['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Can Tho', 'Bien Hoa', 'Hue', 'Nha Trang', 'Buon Ma Thuot', 'Qui Nhon'];
    features_list TEXT[] := ARRAY['Air Conditioning', 'Power Steering', 'Power Windows', 'Central Locking', 'ABS', 'Airbags', 'Bluetooth', 'GPS Navigation', 'Backup Camera', 'Sunroof', 'Leather Seats', 'Heated Seats', 'Cruise Control', 'Keyless Entry', 'Remote Start'];
    
    selected_make TEXT;
    selected_model TEXT;
    selected_body_type TEXT;
    selected_fuel_type TEXT;
    selected_transmission TEXT;
    selected_color TEXT;
    selected_condition TEXT;
    selected_price_type TEXT;
    selected_city TEXT;
    selected_features TEXT[];
    
    car_year INTEGER;
    engine_size DECIMAL(10,2);
    engine_power INTEGER;
    mileage INTEGER;
    price DECIMAL(12,2);
    doors INTEGER;
    seats INTEGER;
    owners INTEGER;
    
    listing_id UUID;
    car_id UUID;
    user_id UUID;
    
    -- Lấy user đầu tiên làm seller
    seller_user_id UUID;
BEGIN
    -- Lấy user đầu tiên làm seller
    SELECT id INTO seller_user_id FROM users LIMIT 1;
    
    -- Nếu không có user nào, tạo một user mẫu
    IF seller_user_id IS NULL THEN
        INSERT INTO users (id, email, "firstName", "lastName", password, "isEmailVerified", role, "createdAt", "updatedAt")
        VALUES (uuid_generate_v4(), 'seller@example.com', 'John', 'Doe', '$2b$10$example', true, 'user', NOW(), NOW())
        RETURNING id INTO seller_user_id;
    END IF;
    
    FOR i IN 1..count LOOP
        -- Random selection
        selected_make := car_makes[1 + (random() * array_length(car_makes, 1))::int];
        selected_model := car_models[1 + (random() * array_length(car_models, 1))::int];
        selected_body_type := body_types[1 + (random() * array_length(body_types, 1))::int];
        selected_fuel_type := fuel_types[1 + (random() * array_length(fuel_types, 1))::int];
        selected_transmission := transmissions[1 + (random() * array_length(transmissions, 1))::int];
        selected_color := colors[1 + (random() * array_length(colors, 1))::int];
        selected_condition := conditions[1 + (random() * array_length(conditions, 1))::int];
        selected_price_type := price_types[1 + (random() * array_length(price_types, 1))::int];
        selected_city := cities[1 + (random() * array_length(cities, 1))::int];
        
        -- Ensure no null values
        IF selected_make IS NULL THEN selected_make := 'Toyota'; END IF;
        IF selected_model IS NULL THEN selected_model := 'Camry'; END IF;
        IF selected_body_type IS NULL THEN selected_body_type := 'sedan'; END IF;
        IF selected_fuel_type IS NULL THEN selected_fuel_type := 'petrol'; END IF;
        IF selected_transmission IS NULL THEN selected_transmission := 'automatic'; END IF;
        IF selected_color IS NULL THEN selected_color := 'White'; END IF;
        IF selected_condition IS NULL THEN selected_condition := 'good'; END IF;
        IF selected_price_type IS NULL THEN selected_price_type := 'negotiable'; END IF;
        IF selected_city IS NULL THEN selected_city := 'Ho Chi Minh City'; END IF;
        
        -- Random features (3-8 features)
        SELECT array_agg(features_list[1 + (random() * array_length(features_list, 1))::int])
        INTO selected_features
        FROM generate_series(1, 3 + (random() * 5)::int);
        
        -- Random values
        car_year := 2015 + (random() * 9)::int; -- 2015-2024
        engine_size := 1.0 + (random() * 4.0); -- 1.0-5.0L
        engine_power := 100 + (random() * 300)::int; -- 100-400HP
        mileage := (random() * 200000)::int; -- 0-200k km
        price := 500000000 + (random() * 2000000000); -- 500M-2.5B VND
        doors := CASE selected_body_type 
            WHEN 'coupe' THEN 2
            WHEN 'pickup' THEN 2
            WHEN 'van' THEN 3
            ELSE 4
        END;
        seats := CASE selected_body_type
            WHEN 'coupe' THEN 4
            WHEN 'pickup' THEN 2
            WHEN 'van' THEN 7
            WHEN 'minivan' THEN 8
            ELSE 5
        END;
        owners := 1 + (random() * 3)::int; -- 1-4 owners
        
        -- Tạo car_details
        INSERT INTO car_details (
            id, make, model, year, "bodyType", "fuelType", transmission,
            "engineSize", "enginePower", mileage, color, "numberOfDoors",
            "numberOfSeats", condition, vin, "registrationNumber",
            "previousOwners", "hasAccidentHistory", "hasServiceHistory",
            description, features, "createdAt", "updatedAt"
        ) VALUES (
            uuid_generate_v4(),
            selected_make,
            selected_model,
            car_year,
            selected_body_type, -- ::car_details_bodytype_enum,
            selected_fuel_type, -- ::car_details_fueltype_enum,
            selected_transmission, -- ::car_details_transmission_enum,
            engine_size,
            engine_power,
            mileage,
            selected_color,
            doors,
            seats,
            selected_condition, -- ::car_details_condition_enum,
            'VIN' || lpad(i::text, 6, '0'),
            'REG' || lpad(i::text, 6, '0'),
            owners,
            random() < 0.2, -- 20% có tai nạn
            random() < 0.8, -- 80% có lịch sử bảo dưỡng
            'Xe ' || selected_make || ' ' || selected_model || ' ' || car_year || ' đời mới, ' || selected_condition || ' condition. ' ||
            CASE WHEN random() < 0.5 THEN 'Đã qua sử dụng cẩn thận, bảo dưỡng định kỳ.' ELSE 'Xe gia đình, ít sử dụng.' END,
            selected_features,
            NOW(),
            NOW()
        ) RETURNING id INTO car_id;
        
        -- Tạo listing_details
        INSERT INTO listing_details (
            id, title, description, price, "priceType", status, location,
            city, state, country, "postalCode", latitude, longitude,
            "viewCount", "favoriteCount", "inquiryCount", "sellerId",
            "carDetailId", "createdAt", "updatedAt"
        ) VALUES (
            uuid_generate_v4(),
            selected_make || ' ' || selected_model || ' ' || car_year || ' - ' || selected_color,
            'Xe ' || selected_make || ' ' || selected_model || ' ' || car_year || ' đời mới với ' || 
            selected_transmission || ' transmission và ' || selected_fuel_type || ' fuel. ' ||
            'Mileage: ' || mileage || 'km. ' ||
            'Features: ' || array_to_string(selected_features, ', ') || '. ' ||
            'Condition: ' || selected_condition || '. ' ||
            'Previous owners: ' || owners || '. ' ||
            CASE WHEN random() < 0.2 THEN 'Có lịch sử tai nạn nhẹ.' ELSE '' END,
            price,
            selected_price_type, -- ::listing_details_pricetype_enum,
            -- CASE WHEN random() < 0.8 THEN 'approved'::listing_details_status_enum ELSE 'pending'::listing_details_status_enum END, -- 80% approved
            CASE WHEN random() < 0.8 THEN 'approved' ELSE 'pending' END, -- 80% approved
            selected_city || ', Vietnam',
            selected_city,
            'Vietnam',
            'Vietnam',
            '100000',
            10.0 + (random() * 5.0), -- Latitude 10-15
            105.0 + (random() * 5.0), -- Longitude 105-110
            (random() * 1000)::int,
            (random() * 50)::int,
            (random() * 20)::int,
            seller_user_id,
            car_id,
            NOW(),
            NOW()
        ) RETURNING id INTO listing_id;
        
        -- Tạo một số images mẫu (optional)
        INSERT INTO car_images (id, "carDetailId", filename, "originalName", url, type, "createdAt")
        VALUES 
            (uuid_generate_v4(), car_id, 'exterior_' || i || '.jpg', 'Exterior View', 'https://via.placeholder.com/800x600/cccccc/666666?text=' || selected_make || '+' || selected_model, 'exterior', NOW()),
            (uuid_generate_v4(), car_id, 'interior_' || i || '.jpg', 'Interior View', 'https://via.placeholder.com/800x600/cccccc/666666?text=Interior', 'interior', NOW()),
            (uuid_generate_v4(), car_id, 'engine_' || i || '.jpg', 'Engine View', 'https://via.placeholder.com/800x600/cccccc/666666?text=Engine', 'engine', NOW());
            
    END LOOP;
    
    RAISE NOTICE 'Generated % car listings successfully!', count;
END;
$$ LANGUAGE plpgsql;

-- Chạy function để tạo 100 listings
SELECT generate_random_listings(100);

-- Xóa function sau khi sử dụng
DROP FUNCTION generate_random_listings(INTEGER);

-- Kiểm tra kết quả
SELECT 
    COUNT(*) as total_listings,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_listings,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_listings
FROM listing_details;

-- Xem một vài listings mẫu
SELECT 
    ld.title,
    ld.price,
    ld.status,
    ld.location,
    cd.make,
    cd.model,
    cd.year,
    cd."bodyType",
    cd."fuelType",
    cd.transmission,
    cd.color,
    cd.condition
FROM listing_details ld
JOIN car_details cd ON ld."carDetailId" = cd.id
ORDER BY ld."createdAt" DESC
LIMIT 10;

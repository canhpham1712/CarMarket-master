-- CarMarket Seed Data
-- This script populates the database with initial metadata and sample data

-- ========================================
-- CAR MAKES DATA
-- ========================================
INSERT INTO car_makes (name, "displayName", "logoUrl", "sortOrder") VALUES
('toyota', 'Toyota', 'https://logos-world.net/wp-content/uploads/2020/05/Toyota-Logo.png', 1),
('honda', 'Honda', 'https://logos-world.net/wp-content/uploads/2020/05/Honda-Logo.png', 2),
('ford', 'Ford', 'https://logos-world.net/wp-content/uploads/2020/05/Ford-Logo.png', 3),
('chevrolet', 'Chevrolet', 'https://logos-world.net/wp-content/uploads/2020/05/Chevrolet-Logo.png', 4),
('bmw', 'BMW', 'https://logos-world.net/wp-content/uploads/2020/05/BMW-Logo.png', 5),
('mercedes-benz', 'Mercedes-Benz', 'https://logos-world.net/wp-content/uploads/2020/05/Mercedes-Benz-Logo.png', 6),
('audi', 'Audi', 'https://logos-world.net/wp-content/uploads/2020/05/Audi-Logo.png', 7),
('nissan', 'Nissan', 'https://logos-world.net/wp-content/uploads/2020/05/Nissan-Logo.png', 8),
('hyundai', 'Hyundai', 'https://logos-world.net/wp-content/uploads/2020/05/Hyundai-Logo.png', 9),
('kia', 'Kia', 'https://logos-world.net/wp-content/uploads/2020/05/Kia-Logo.png', 10),
('mazda', 'Mazda', 'https://logos-world.net/wp-content/uploads/2020/05/Mazda-Logo.png', 11),
('subaru', 'Subaru', 'https://logos-world.net/wp-content/uploads/2020/05/Subaru-Logo.png', 12),
('volkswagen', 'Volkswagen', 'https://logos-world.net/wp-content/uploads/2020/05/Volkswagen-Logo.png', 13),
('lexus', 'Lexus', 'https://logos-world.net/wp-content/uploads/2020/05/Lexus-Logo.png', 14),
('infiniti', 'Infiniti', 'https://logos-world.net/wp-content/uploads/2020/05/Infiniti-Logo.png', 15);

-- ========================================
-- CAR MODELS DATA
-- ========================================
INSERT INTO car_models (name, "displayName", "makeId", "bodyStyles", "defaultBodyStyle", "sortOrder") VALUES
-- Toyota Models
('camry', 'Camry', (SELECT id FROM car_makes WHERE name = 'toyota'), ARRAY['sedan'], 'sedan', 1),
('corolla', 'Corolla', (SELECT id FROM car_makes WHERE name = 'toyota'), ARRAY['sedan', 'hatchback'], 'sedan', 2),
('rav4', 'RAV4', (SELECT id FROM car_makes WHERE name = 'toyota'), ARRAY['suv'], 'suv', 3),
('highlander', 'Highlander', (SELECT id FROM car_makes WHERE name = 'toyota'), ARRAY['suv'], 'suv', 4),
('tacoma', 'Tacoma', (SELECT id FROM car_makes WHERE name = 'toyota'), ARRAY['pickup'], 'pickup', 5),
('prius', 'Prius', (SELECT id FROM car_makes WHERE name = 'toyota'), ARRAY['hatchback'], 'hatchback', 6),

-- Honda Models
('accord', 'Accord', (SELECT id FROM car_makes WHERE name = 'honda'), ARRAY['sedan'], 'sedan', 1),
('civic', 'Civic', (SELECT id FROM car_makes WHERE name = 'honda'), ARRAY['sedan', 'hatchback'], 'sedan', 2),
('cr-v', 'CR-V', (SELECT id FROM car_makes WHERE name = 'honda'), ARRAY['suv'], 'suv', 3),
('pilot', 'Pilot', (SELECT id FROM car_makes WHERE name = 'honda'), ARRAY['suv'], 'suv', 4),
('fit', 'Fit', (SELECT id FROM car_makes WHERE name = 'honda'), ARRAY['hatchback'], 'hatchback', 5),

-- Ford Models
('f-150', 'F-150', (SELECT id FROM car_makes WHERE name = 'ford'), ARRAY['pickup'], 'pickup', 1),
('explorer', 'Explorer', (SELECT id FROM car_makes WHERE name = 'ford'), ARRAY['suv'], 'suv', 2),
('escape', 'Escape', (SELECT id FROM car_makes WHERE name = 'ford'), ARRAY['suv'], 'suv', 3),
('mustang', 'Mustang', (SELECT id FROM car_makes WHERE name = 'ford'), ARRAY['coupe', 'convertible'], 'coupe', 4),
('focus', 'Focus', (SELECT id FROM car_makes WHERE name = 'ford'), ARRAY['sedan', 'hatchback'], 'sedan', 5),

-- BMW Models
('3-series', '3 Series', (SELECT id FROM car_makes WHERE name = 'bmw'), ARRAY['sedan'], 'sedan', 1),
('5-series', '5 Series', (SELECT id FROM car_makes WHERE name = 'bmw'), ARRAY['sedan'], 'sedan', 2),
('x3', 'X3', (SELECT id FROM car_makes WHERE name = 'bmw'), ARRAY['suv'], 'suv', 3),
('x5', 'X5', (SELECT id FROM car_makes WHERE name = 'bmw'), ARRAY['suv'], 'suv', 4),
('i3', 'i3', (SELECT id FROM car_makes WHERE name = 'bmw'), ARRAY['hatchback'], 'hatchback', 5);

-- ========================================
-- CAR METADATA DATA
-- ========================================

-- Fuel Types
INSERT INTO car_metadata (type, value, "displayValue", "sortOrder") VALUES
('fuel_type', 'petrol', 'Petrol', 1),
('fuel_type', 'diesel', 'Diesel', 2),
('fuel_type', 'electric', 'Electric', 3),
('fuel_type', 'hybrid', 'Hybrid', 4),
('fuel_type', 'lpg', 'LPG', 5),
('fuel_type', 'cng', 'CNG', 6);

-- Transmission Types
INSERT INTO car_metadata (type, value, "displayValue", "sortOrder") VALUES
('transmission_type', 'manual', 'Manual', 1),
('transmission_type', 'automatic', 'Automatic', 2),
('transmission_type', 'cvt', 'CVT', 3),
('transmission_type', 'semi_automatic', 'Semi-Automatic', 4);

-- Body Types
INSERT INTO car_metadata (type, value, "displayValue", "sortOrder") VALUES
('body_type', 'sedan', 'Sedan', 1),
('body_type', 'hatchback', 'Hatchback', 2),
('body_type', 'suv', 'SUV', 3),
('body_type', 'coupe', 'Coupe', 4),
('body_type', 'convertible', 'Convertible', 5),
('body_type', 'wagon', 'Wagon', 6),
('body_type', 'pickup', 'Pickup Truck', 7),
('body_type', 'van', 'Van', 8),
('body_type', 'minivan', 'Minivan', 9);

-- Car Conditions
INSERT INTO car_metadata (type, value, "displayValue", "sortOrder") VALUES
('condition', 'excellent', 'Excellent', 1),
('condition', 'very_good', 'Very Good', 2),
('condition', 'good', 'Good', 3),
('condition', 'fair', 'Fair', 4),
('condition', 'poor', 'Poor', 5);

-- Price Types
INSERT INTO car_metadata (type, value, "displayValue", "sortOrder") VALUES
('price_type', 'fixed', 'Fixed Price', 1),
('price_type', 'negotiable', 'Negotiable', 2),
('price_type', 'auction', 'Auction', 3);

-- Car Features
INSERT INTO car_metadata (type, value, "displayValue", "sortOrder") VALUES
('car_feature', 'air_conditioning', 'Air Conditioning', 1),
('car_feature', 'power_steering', 'Power Steering', 2),
('car_feature', 'power_windows', 'Power Windows', 3),
('car_feature', 'power_locks', 'Power Locks', 4),
('car_feature', 'cruise_control', 'Cruise Control', 5),
('car_feature', 'gps_navigation', 'GPS Navigation', 6),
('car_feature', 'bluetooth', 'Bluetooth', 7),
('car_feature', 'usb_port', 'USB Port', 8),
('car_feature', 'aux_input', 'AUX Input', 9),
('car_feature', 'heated_seats', 'Heated Seats', 10),
('car_feature', 'leather_seats', 'Leather Seats', 11),
('car_feature', 'sunroof', 'Sunroof', 12),
('car_feature', 'backup_camera', 'Backup Camera', 13),
('car_feature', 'parking_sensors', 'Parking Sensors', 14),
('car_feature', 'blind_spot_monitor', 'Blind Spot Monitor', 15),
('car_feature', 'lane_departure_warning', 'Lane Departure Warning', 16),
('car_feature', 'adaptive_cruise_control', 'Adaptive Cruise Control', 17),
('car_feature', 'automatic_emergency_braking', 'Automatic Emergency Braking', 18),
('car_feature', 'keyless_entry', 'Keyless Entry', 19),
('car_feature', 'remote_start', 'Remote Start', 20),
('car_feature', 'all_wheel_drive', 'All Wheel Drive', 21),
('car_feature', 'four_wheel_drive', 'Four Wheel Drive', 22),
('car_feature', 'tow_package', 'Tow Package', 23),
('car_feature', 'third_row_seating', 'Third Row Seating', 24),
('car_feature', 'cargo_area', 'Cargo Area', 25);

-- Colors
INSERT INTO car_metadata (type, value, "displayValue", "sortOrder") VALUES
('color', 'white', 'White', 1),
('color', 'black', 'Black', 2),
('color', 'silver', 'Silver', 3),
('color', 'gray', 'Gray', 4),
('color', 'red', 'Red', 5),
('color', 'blue', 'Blue', 6),
('color', 'green', 'Green', 7),
('color', 'brown', 'Brown', 8),
('color', 'beige', 'Beige', 9),
('color', 'gold', 'Gold', 10),
('color', 'yellow', 'Yellow', 11),
('color', 'orange', 'Orange', 12),
('color', 'purple', 'Purple', 13),
('color', 'maroon', 'Maroon', 14),
('color', 'turquoise', 'Turquoise', 15);

-- ========================================
-- SAMPLE USERS (for testing)
-- All passwords: admin123
-- ========================================
INSERT INTO users (email, password, "firstName", "lastName", "phoneNumber", "isEmailVerified") VALUES
('admin@carmarket.com', '$2b$12$5HYF4Zel97OFRi5w2BvB9eC.skTB0qCZ5GKaIm26zATcENWGRXThG', 'Admin', 'User', '+1234567890', true),
('john.doe@example.com', '$2b$12$5HYF4Zel97OFRi5w2BvB9eC.skTB0qCZ5GKaIm26zATcENWGRXThG', 'John', 'Doe', '+1234567891', true),
('jane.smith@example.com', '$2b$12$5HYF4Zel97OFRi5w2BvB9eC.skTB0qCZ5GKaIm26zATcENWGRXThG', 'Jane', 'Smith', '+1234567892', true),
('bob.wilson@example.com', '$2b$12$5HYF4Zel97OFRi5w2BvB9eC.skTB0qCZ5GKaIm26zATcENWGRXThG', 'Bob', 'Wilson', '+1234567893', true);

-- ========================================
-- SAMPLE CAR DETAILS
-- ========================================
INSERT INTO car_details (make, model, year, "bodyType", "fuelType", transmission, "engineSize", "enginePower", mileage, color, "numberOfDoors", "numberOfSeats", condition, vin, "registrationNumber", "previousOwners", "hasAccidentHistory", "hasServiceHistory", description, features) VALUES
('toyota', 'camry', 2020, 'sedan', 'petrol', 'automatic', 2.5, 203, 25000, 'white', 4, 5, 'excellent', '1HGBH41JXMN109186', 'ABC123', 1, false, true, 'Well-maintained Toyota Camry with full service history. Excellent condition both inside and out.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'gps_navigation', 'bluetooth', 'backup_camera']),
('honda', 'civic', 2019, 'sedan', 'petrol', 'manual', 1.5, 158, 35000, 'black', 4, 5, 'very_good', '2HGBH41JXMN109187', 'DEF456', 2, false, true, 'Reliable Honda Civic with good fuel economy. Some minor wear but mechanically sound.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'bluetooth', 'usb_port']),
('ford', 'f-150', 2021, 'pickup', 'petrol', 'automatic', 3.5, 400, 15000, 'silver', 4, 5, 'excellent', '3HGBH41JXMN109188', 'GHI789', 1, false, true, 'Powerful Ford F-150 with towing package. Perfect for work or recreation.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'gps_navigation', 'bluetooth', 'backup_camera', 'tow_package', 'four_wheel_drive']),
('bmw', '3-series', 2018, 'sedan', 'petrol', 'automatic', 2.0, 248, 45000, 'blue', 4, 5, 'good', '4HGBH41JXMN109189', 'JKL012', 2, false, true, 'Luxury BMW 3-series with premium features. Well-cared for with regular maintenance.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'gps_navigation', 'bluetooth', 'leather_seats', 'sunroof', 'backup_camera', 'parking_sensors']);

-- ========================================
-- SAMPLE LISTING DETAILS
-- ========================================
INSERT INTO listing_details (title, description, price, "priceType", status, location, city, state, country, "postalCode", "sellerId", "carDetailId", "isFeatured") VALUES
('2020 Toyota Camry - Excellent Condition', 'Beautiful Toyota Camry in excellent condition with full service history. Perfect family car with all modern features.', 25000.00, 'negotiable', 'approved', '123 Main St, Anytown, USA', 'Anytown', 'CA', 'USA', '90210', (SELECT id FROM users WHERE email = 'john.doe@example.com'), (SELECT id FROM car_details WHERE vin = '1HGBH41JXMN109186'), true),
('2019 Honda Civic - Great Value', 'Reliable Honda Civic with excellent fuel economy. Perfect for daily commuting. Well-maintained with service records.', 18500.00, 'fixed', 'approved', '456 Oak Ave, Somewhere, USA', 'Somewhere', 'NY', 'USA', '10001', (SELECT id FROM users WHERE email = 'jane.smith@example.com'), (SELECT id FROM car_details WHERE vin = '2HGBH41JXMN109187'), false),
('2021 Ford F-150 - Work Ready', 'Powerful Ford F-150 with towing package. Perfect for work or recreation. Low mileage and excellent condition.', 42000.00, 'negotiable', 'approved', '789 Pine St, Nowhere, USA', 'Nowhere', 'TX', 'USA', '75001', (SELECT id FROM users WHERE email = 'bob.wilson@example.com'), (SELECT id FROM car_details WHERE vin = '3HGBH41JXMN109188'), true),
('2018 BMW 3-Series - Luxury Sedan', 'Luxury BMW 3-series with premium features. Well-cared for with regular maintenance. Perfect for those who appreciate quality.', 32000.00, 'negotiable', 'pending', '321 Elm St, Everywhere, USA', 'Everywhere', 'FL', 'USA', '33101', (SELECT id FROM users WHERE email = 'john.doe@example.com'), (SELECT id FROM car_details WHERE vin = '4HGBH41JXMN109189'), false);

-- ========================================
-- SAMPLE CAR IMAGES
-- ========================================
INSERT INTO car_images (filename, "originalName", url, type, "sortOrder", "isPrimary", "carDetailId") VALUES
('camry_front.jpg', 'toyota_camry_front.jpg', '/uploads/cars/camry_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '1HGBH41JXMN109186')),
('camry_side.jpg', 'toyota_camry_side.jpg', '/uploads/cars/camry_side.jpg', 'exterior', 2, false, (SELECT id FROM car_details WHERE vin = '1HGBH41JXMN109186')),
('camry_interior.jpg', 'toyota_camry_interior.jpg', '/uploads/cars/camry_interior.jpg', 'interior', 3, false, (SELECT id FROM car_details WHERE vin = '1HGBH41JXMN109186')),
('civic_front.jpg', 'honda_civic_front.jpg', '/uploads/cars/civic_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '2HGBH41JXMN109187')),
('civic_interior.jpg', 'honda_civic_interior.jpg', '/uploads/cars/civic_interior.jpg', 'interior', 2, false, (SELECT id FROM car_details WHERE vin = '2HGBH41JXMN109187')),
('f150_front.jpg', 'ford_f150_front.jpg', '/uploads/cars/f150_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '3HGBH41JXMN109188')),
('f150_bed.jpg', 'ford_f150_bed.jpg', '/uploads/cars/f150_bed.jpg', 'exterior', 2, false, (SELECT id FROM car_details WHERE vin = '3HGBH41JXMN109188')),
('bmw_front.jpg', 'bmw_3series_front.jpg', '/uploads/cars/bmw_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '4HGBH41JXMN109189')),
('bmw_interior.jpg', 'bmw_3series_interior.jpg', '/uploads/cars/bmw_interior.jpg', 'interior', 2, false, (SELECT id FROM car_details WHERE vin = '4HGBH41JXMN109189'));

-- ========================================
-- ADDITIONAL USERS FOR MORE LISTINGS
-- ========================================
INSERT INTO users (email, password, "firstName", "lastName", "phoneNumber", "isEmailVerified") VALUES
('mike.johnson@example.com', '$2b$12$5HYF4Zel97OFRi5w2BvB9eC.skTB0qCZ5GKaIm26zATcENWGRXThG', 'Mike', 'Johnson', '+1234567894', true),
('sarah.davis@example.com', '$2b$12$5HYF4Zel97OFRi5w2BvB9eC.skTB0qCZ5GKaIm26zATcENWGRXThG', 'Sarah', 'Davis', '+1234567895', true),
('david.brown@example.com', '$2b$12$5HYF4Zel97OFRi5w2BvB9eC.skTB0qCZ5GKaIm26zATcENWGRXThG', 'David', 'Brown', '+1234567896', true),
('lisa.wilson@example.com', '$2b$12$5HYF4Zel97OFRi5w2BvB9eC.skTB0qCZ5GKaIm26zATcENWGRXThG', 'Lisa', 'Wilson', '+1234567897', true),
('tom.anderson@example.com', '$2b$12$5HYF4Zel97OFRi5w2BvB9eC.skTB0qCZ5GKaIm26zATcENWGRXThG', 'Tom', 'Anderson', '+1234567898', true);

-- ========================================
-- ADDITIONAL CAR DETAILS (20 more cars)
-- ========================================
INSERT INTO car_details (make, model, year, "bodyType", "fuelType", transmission, "engineSize", "enginePower", mileage, color, "numberOfDoors", "numberOfSeats", condition, vin, "registrationNumber", "previousOwners", "hasAccidentHistory", "hasServiceHistory", description, features) VALUES
-- Luxury Cars
('mercedes-benz', 'c-class', 2020, 'sedan', 'petrol', 'automatic', 2.0, 255, 28000, 'black', 4, 5, 'excellent', '5HGBH41JXMN109190', 'MBC001', 1, false, true, 'Luxurious Mercedes C-Class with premium interior and advanced safety features.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'gps_navigation', 'bluetooth', 'leather_seats', 'sunroof', 'backup_camera', 'parking_sensors', 'adaptive_cruise_control']),
('audi', 'a4', 2019, 'sedan', 'petrol', 'automatic', 2.0, 252, 32000, 'gray', 4, 5, 'very_good', '6HGBH41JXMN109191', 'AUD001', 2, false, true, 'Sporty Audi A4 with quattro all-wheel drive and premium sound system.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'gps_navigation', 'bluetooth', 'leather_seats', 'backup_camera', 'all_wheel_drive']),
('lexus', 'es', 2021, 'sedan', 'hybrid', 'automatic', 2.5, 215, 18000, 'white', 4, 5, 'excellent', '7HGBH41JXMN109192', 'LEX001', 1, false, true, 'Efficient Lexus ES hybrid with exceptional fuel economy and luxury features.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'gps_navigation', 'bluetooth', 'leather_seats', 'backup_camera', 'adaptive_cruise_control', 'lane_departure_warning']),

-- SUVs
('toyota', 'rav4', 2020, 'suv', 'petrol', 'automatic', 2.5, 203, 25000, 'red', 4, 5, 'excellent', '8HGBH41JXMN109193', 'TRV001', 1, false, true, 'Reliable Toyota RAV4 with all-wheel drive and spacious interior.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'gps_navigation', 'bluetooth', 'backup_camera', 'all_wheel_drive']),
('honda', 'cr-v', 2019, 'suv', 'petrol', 'automatic', 1.5, 190, 30000, 'blue', 4, 5, 'very_good', '9HGBH41JXMN109194', 'HCR001', 2, false, true, 'Practical Honda CR-V with excellent cargo space and fuel efficiency.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'bluetooth', 'backup_camera']),
('ford', 'explorer', 2021, 'suv', 'petrol', 'automatic', 2.3, 300, 22000, 'black', 4, 7, 'excellent', '10HGBH41JXMN109195', 'FEX001', 1, false, true, 'Spacious Ford Explorer with third-row seating and advanced technology.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'gps_navigation', 'bluetooth', 'backup_camera', 'third_row_seating', 'all_wheel_drive']),
('bmw', 'x3', 2020, 'suv', 'petrol', 'automatic', 2.0, 248, 26000, 'silver', 4, 5, 'excellent', '11HGBH41JXMN109196', 'BMX001', 1, false, true, 'Sporty BMW X3 with xDrive all-wheel drive and premium features.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'gps_navigation', 'bluetooth', 'leather_seats', 'backup_camera', 'all_wheel_drive']),

-- Economy Cars
('hyundai', 'elantra', 2019, 'sedan', 'petrol', 'automatic', 2.0, 147, 40000, 'white', 4, 5, 'good', '12HGBH41JXMN109197', 'HYE001', 2, false, true, 'Affordable Hyundai Elantra with great value and reliability.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'bluetooth', 'usb_port']),
('kia', 'forte', 2020, 'sedan', 'petrol', 'automatic', 2.0, 147, 35000, 'gray', 4, 5, 'very_good', '13HGBH41JXMN109198', 'KIF001', 1, false, true, 'Well-equipped Kia Forte with modern technology and warranty.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'bluetooth', 'backup_camera']),
('nissan', 'altima', 2018, 'sedan', 'petrol', 'automatic', 2.5, 182, 45000, 'black', 4, 5, 'good', '14HGBH41JXMN109199', 'NAL001', 2, false, true, 'Comfortable Nissan Altima with CVT transmission and good fuel economy.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'bluetooth']),

-- Sports Cars
('ford', 'mustang', 2020, 'coupe', 'petrol', 'manual', 5.0, 450, 15000, 'red', 2, 4, 'excellent', '15HGBH41JXMN109200', 'FMU001', 1, false, true, 'Powerful Ford Mustang GT with V8 engine and manual transmission.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'bluetooth', 'leather_seats']),
('chevrolet', 'camaro', 2019, 'coupe', 'petrol', 'automatic', 3.6, 335, 20000, 'yellow', 2, 4, 'very_good', '16HGBH41JXMN109201', 'CCM001', 1, false, true, 'Sporty Chevrolet Camaro with V6 engine and aggressive styling.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'bluetooth', 'leather_seats']),

-- Electric/Hybrid
('toyota', 'prius', 2020, 'hatchback', 'hybrid', 'automatic', 1.8, 121, 30000, 'blue', 4, 5, 'excellent', '17HGBH41JXMN109202', 'TPR001', 1, false, true, 'Efficient Toyota Prius with exceptional fuel economy and reliability.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'bluetooth', 'backup_camera']),
('honda', 'accord', 2021, 'sedan', 'hybrid', 'automatic', 2.0, 212, 18000, 'silver', 4, 5, 'excellent', '18HGBH41JXMN109203', 'HAC001', 1, false, true, 'Modern Honda Accord Hybrid with advanced safety features.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'gps_navigation', 'bluetooth', 'backup_camera', 'adaptive_cruise_control', 'lane_departure_warning']),

-- Trucks
('chevrolet', 'silverado', 2019, 'pickup', 'petrol', 'automatic', 5.3, 355, 35000, 'white', 4, 5, 'good', '19HGBH41JXMN109204', 'CSL001', 2, false, true, 'Capable Chevrolet Silverado with towing package and crew cab.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'bluetooth', 'tow_package']),
('ram', '1500', 2020, 'pickup', 'petrol', 'automatic', 3.6, 305, 28000, 'black', 4, 5, 'very_good', '20HGBH41JXMN109205', 'RAM001', 1, false, true, 'Comfortable Ram 1500 with spacious interior and towing capability.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'bluetooth', 'tow_package', 'leather_seats']),

-- Convertibles
('bmw', '4-series', 2019, 'convertible', 'petrol', 'automatic', 2.0, 248, 25000, 'red', 2, 4, 'excellent', '21HGBH41JXMN109206', 'BM4C001', 1, false, true, 'Elegant BMW 4-Series convertible with retractable hardtop.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'gps_navigation', 'bluetooth', 'leather_seats']),

-- Wagons
('subaru', 'outback', 2020, 'wagon', 'petrol', 'automatic', 2.5, 182, 30000, 'green', 4, 5, 'very_good', '22HGBH41JXMN109207', 'SOU001', 1, false, true, 'Adventure-ready Subaru Outback with all-wheel drive and ground clearance.', ARRAY['air_conditioning', 'power_steering', 'power_windows', 'cruise_control', 'bluetooth', 'all_wheel_drive']);

-- ========================================
-- ADDITIONAL LISTING DETAILS (20 more listings)
-- ========================================
INSERT INTO listing_details (title, description, price, "priceType", status, location, city, state, country, "postalCode", "sellerId", "carDetailId", "isFeatured") VALUES
-- Luxury Cars
('2020 Mercedes C-Class - Premium Luxury', 'Sophisticated Mercedes C-Class with premium leather interior, advanced safety systems, and smooth performance.', 45000.00, 'negotiable', 'approved', '100 Luxury Lane, Beverly Hills, CA', 'Beverly Hills', 'CA', 'USA', '90210', (SELECT id FROM users WHERE email = 'mike.johnson@example.com'), (SELECT id FROM car_details WHERE vin = '5HGBH41JXMN109190'), true),
('2019 Audi A4 - Sporty & Reliable', 'Well-maintained Audi A4 with quattro all-wheel drive, premium sound system, and sporty handling.', 38000.00, 'negotiable', 'approved', '200 German Ave, Miami, FL', 'Miami', 'FL', 'USA', '33101', (SELECT id FROM users WHERE email = 'sarah.davis@example.com'), (SELECT id FROM car_details WHERE vin = '6HGBH41JXMN109191'), false),
('2021 Lexus ES Hybrid - Eco Luxury', 'Efficient Lexus ES hybrid combining luxury with exceptional fuel economy and advanced safety features.', 42000.00, 'fixed', 'approved', '300 Hybrid St, Seattle, WA', 'Seattle', 'WA', 'USA', '98101', (SELECT id FROM users WHERE email = 'david.brown@example.com'), (SELECT id FROM car_details WHERE vin = '7HGBH41JXMN109192'), true),

-- SUVs
('2020 Toyota RAV4 - Family Ready', 'Reliable Toyota RAV4 with all-wheel drive, spacious interior, and excellent safety ratings.', 32000.00, 'negotiable', 'approved', '400 Family Rd, Denver, CO', 'Denver', 'CO', 'USA', '80201', (SELECT id FROM users WHERE email = 'lisa.wilson@example.com'), (SELECT id FROM car_details WHERE vin = '8HGBH41JXMN109193'), false),
('2019 Honda CR-V - Practical Choice', 'Practical Honda CR-V with excellent cargo space, fuel efficiency, and Honda reliability.', 28000.00, 'fixed', 'approved', '500 Practical Ave, Phoenix, AZ', 'Phoenix', 'AZ', 'USA', '85001', (SELECT id FROM users WHERE email = 'tom.anderson@example.com'), (SELECT id FROM car_details WHERE vin = '9HGBH41JXMN109194'), false),
('2021 Ford Explorer - 7-Seater SUV', 'Spacious Ford Explorer with third-row seating, advanced technology, and powerful performance.', 45000.00, 'negotiable', 'approved', '600 Explorer Blvd, Chicago, IL', 'Chicago', 'IL', 'USA', '60601', (SELECT id FROM users WHERE email = 'mike.johnson@example.com'), (SELECT id FROM car_details WHERE vin = '10HGBH41JXMN109195'), true),
('2020 BMW X3 - Sporty SUV', 'Sporty BMW X3 with xDrive all-wheel drive, premium features, and dynamic handling.', 48000.00, 'negotiable', 'approved', '700 BMW Way, Boston, MA', 'Boston', 'MA', 'USA', '02101', (SELECT id FROM users WHERE email = 'sarah.davis@example.com'), (SELECT id FROM car_details WHERE vin = '11HGBH41JXMN109196'), false),

-- Economy Cars
('2019 Hyundai Elantra - Great Value', 'Affordable Hyundai Elantra offering great value, reliability, and modern features at an unbeatable price.', 18000.00, 'fixed', 'approved', '800 Value St, Atlanta, GA', 'Atlanta', 'GA', 'USA', '30301', (SELECT id FROM users WHERE email = 'david.brown@example.com'), (SELECT id FROM car_details WHERE vin = '12HGBH41JXMN109197'), false),
('2020 Kia Forte - Well Equipped', 'Well-equipped Kia Forte with modern technology, comprehensive warranty, and excellent fuel economy.', 20000.00, 'negotiable', 'approved', '900 Kia Ave, Dallas, TX', 'Dallas', 'TX', 'USA', '75201', (SELECT id FROM users WHERE email = 'lisa.wilson@example.com'), (SELECT id FROM car_details WHERE vin = '13HGBH41JXMN109198'), false),
('2018 Nissan Altima - Comfortable Ride', 'Comfortable Nissan Altima with CVT transmission, good fuel economy, and spacious interior.', 22000.00, 'fixed', 'approved', '1000 Comfort Rd, Las Vegas, NV', 'Las Vegas', 'NV', 'USA', '89101', (SELECT id FROM users WHERE email = 'tom.anderson@example.com'), (SELECT id FROM car_details WHERE vin = '14HGBH41JXMN109199'), false),

-- Sports Cars
('2020 Ford Mustang GT - V8 Power', 'Powerful Ford Mustang GT with V8 engine, manual transmission, and classic American muscle.', 42000.00, 'negotiable', 'approved', '1100 Muscle St, Detroit, MI', 'Detroit', 'MI', 'USA', '48201', (SELECT id FROM users WHERE email = 'mike.johnson@example.com'), (SELECT id FROM car_details WHERE vin = '15HGBH41JXMN109200'), true),
('2019 Chevrolet Camaro - Sporty Coupe', 'Sporty Chevrolet Camaro with V6 engine, aggressive styling, and impressive performance.', 35000.00, 'negotiable', 'approved', '1200 Sport Ave, Los Angeles, CA', 'Los Angeles', 'CA', 'USA', '90001', (SELECT id FROM users WHERE email = 'sarah.davis@example.com'), (SELECT id FROM car_details WHERE vin = '16HGBH41JXMN109201'), false),

-- Electric/Hybrid
('2020 Toyota Prius - Eco Champion', 'Efficient Toyota Prius with exceptional fuel economy, reliability, and eco-friendly technology.', 25000.00, 'fixed', 'approved', '1300 Eco Blvd, Portland, OR', 'Portland', 'OR', 'USA', '97201', (SELECT id FROM users WHERE email = 'david.brown@example.com'), (SELECT id FROM car_details WHERE vin = '17HGBH41JXMN109202'), false),
('2021 Honda Accord Hybrid - Modern Efficiency', 'Modern Honda Accord Hybrid with advanced safety features, fuel efficiency, and premium interior.', 32000.00, 'negotiable', 'approved', '1400 Hybrid Way, San Francisco, CA', 'San Francisco', 'CA', 'USA', '94101', (SELECT id FROM users WHERE email = 'lisa.wilson@example.com'), (SELECT id FROM car_details WHERE vin = '18HGBH41JXMN109203'), true),

-- Trucks
('2019 Chevrolet Silverado - Work Ready', 'Capable Chevrolet Silverado with towing package, crew cab, and powerful V8 engine.', 38000.00, 'negotiable', 'approved', '1500 Work Rd, Houston, TX', 'Houston', 'TX', 'USA', '77001', (SELECT id FROM users WHERE email = 'tom.anderson@example.com'), (SELECT id FROM car_details WHERE vin = '19HGBH41JXMN109204'), false),
('2020 Ram 1500 - Comfortable Truck', 'Comfortable Ram 1500 with spacious interior, towing capability, and premium features.', 40000.00, 'negotiable', 'approved', '1600 Ram St, Nashville, TN', 'Nashville', 'TN', 'USA', '37201', (SELECT id FROM users WHERE email = 'mike.johnson@example.com'), (SELECT id FROM car_details WHERE vin = '20HGBH41JXMN109205'), false),

-- Convertibles
('2019 BMW 4-Series Convertible - Open Air Luxury', 'Elegant BMW 4-Series convertible with retractable hardtop, premium interior, and sporty performance.', 45000.00, 'negotiable', 'approved', '1700 Convertible Ave, San Diego, CA', 'San Diego', 'CA', 'USA', '92101', (SELECT id FROM users WHERE email = 'sarah.davis@example.com'), (SELECT id FROM car_details WHERE vin = '21HGBH41JXMN109206'), true),

-- Wagons
('2020 Subaru Outback - Adventure Ready', 'Adventure-ready Subaru Outback with all-wheel drive, ground clearance, and outdoor capability.', 30000.00, 'fixed', 'approved', '1800 Adventure Trail, Boulder, CO', 'Boulder', 'CO', 'USA', '80301', (SELECT id FROM users WHERE email = 'david.brown@example.com'), (SELECT id FROM car_details WHERE vin = '22HGBH41JXMN109207'), false);

-- ========================================
-- ADDITIONAL CAR IMAGES (20 more cars)
-- ========================================
INSERT INTO car_images (filename, "originalName", url, type, "sortOrder", "isPrimary", "carDetailId") VALUES
-- Luxury Cars
('mercedes_c_class_front.jpg', 'mercedes_c_class_front.jpg', '/uploads/cars/mercedes_c_class_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '5HGBH41JXMN109190')),
('mercedes_c_class_interior.jpg', 'mercedes_c_class_interior.jpg', '/uploads/cars/mercedes_c_class_interior.jpg', 'interior', 2, false, (SELECT id FROM car_details WHERE vin = '5HGBH41JXMN109190')),
('audi_a4_front.jpg', 'audi_a4_front.jpg', '/uploads/cars/audi_a4_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '6HGBH41JXMN109191')),
('audi_a4_side.jpg', 'audi_a4_side.jpg', '/uploads/cars/audi_a4_side.jpg', 'exterior', 2, false, (SELECT id FROM car_details WHERE vin = '6HGBH41JXMN109191')),
('lexus_es_front.jpg', 'lexus_es_front.jpg', '/uploads/cars/lexus_es_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '7HGBH41JXMN109192')),
('lexus_es_interior.jpg', 'lexus_es_interior.jpg', '/uploads/cars/lexus_es_interior.jpg', 'interior', 2, false, (SELECT id FROM car_details WHERE vin = '7HGBH41JXMN109192')),

-- SUVs
('toyota_rav4_front.jpg', 'toyota_rav4_front.jpg', '/uploads/cars/toyota_rav4_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '8HGBH41JXMN109193')),
('toyota_rav4_rear.jpg', 'toyota_rav4_rear.jpg', '/uploads/cars/toyota_rav4_rear.jpg', 'exterior', 2, false, (SELECT id FROM car_details WHERE vin = '8HGBH41JXMN109193')),
('honda_crv_front.jpg', 'honda_crv_front.jpg', '/uploads/cars/honda_crv_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '9HGBH41JXMN109194')),
('honda_crv_interior.jpg', 'honda_crv_interior.jpg', '/uploads/cars/honda_crv_interior.jpg', 'interior', 2, false, (SELECT id FROM car_details WHERE vin = '9HGBH41JXMN109194')),
('ford_explorer_front.jpg', 'ford_explorer_front.jpg', '/uploads/cars/ford_explorer_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '10HGBH41JXMN109195')),
('ford_explorer_interior.jpg', 'ford_explorer_interior.jpg', '/uploads/cars/ford_explorer_interior.jpg', 'interior', 2, false, (SELECT id FROM car_details WHERE vin = '10HGBH41JXMN109195')),
('bmw_x3_front.jpg', 'bmw_x3_front.jpg', '/uploads/cars/bmw_x3_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '11HGBH41JXMN109196')),
('bmw_x3_side.jpg', 'bmw_x3_side.jpg', '/uploads/cars/bmw_x3_side.jpg', 'exterior', 2, false, (SELECT id FROM car_details WHERE vin = '11HGBH41JXMN109196')),

-- Economy Cars
('hyundai_elantra_front.jpg', 'hyundai_elantra_front.jpg', '/uploads/cars/hyundai_elantra_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '12HGBH41JXMN109197')),
('hyundai_elantra_interior.jpg', 'hyundai_elantra_interior.jpg', '/uploads/cars/hyundai_elantra_interior.jpg', 'interior', 2, false, (SELECT id FROM car_details WHERE vin = '12HGBH41JXMN109197')),
('kia_forte_front.jpg', 'kia_forte_front.jpg', '/uploads/cars/kia_forte_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '13HGBH41JXMN109198')),
('kia_forte_side.jpg', 'kia_forte_side.jpg', '/uploads/cars/kia_forte_side.jpg', 'exterior', 2, false, (SELECT id FROM car_details WHERE vin = '13HGBH41JXMN109198')),
('nissan_altima_front.jpg', 'nissan_altima_front.jpg', '/uploads/cars/nissan_altima_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '14HGBH41JXMN109199')),
('nissan_altima_interior.jpg', 'nissan_altima_interior.jpg', '/uploads/cars/nissan_altima_interior.jpg', 'interior', 2, false, (SELECT id FROM car_details WHERE vin = '14HGBH41JXMN109199')),

-- Sports Cars
('ford_mustang_front.jpg', 'ford_mustang_front.jpg', '/uploads/cars/ford_mustang_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '15HGBH41JXMN109200')),
('ford_mustang_side.jpg', 'ford_mustang_side.jpg', '/uploads/cars/ford_mustang_side.jpg', 'exterior', 2, false, (SELECT id FROM car_details WHERE vin = '15HGBH41JXMN109200')),
('chevrolet_camaro_front.jpg', 'chevrolet_camaro_front.jpg', '/uploads/cars/chevrolet_camaro_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '16HGBH41JXMN109201')),
('chevrolet_camaro_interior.jpg', 'chevrolet_camaro_interior.jpg', '/uploads/cars/chevrolet_camaro_interior.jpg', 'interior', 2, false, (SELECT id FROM car_details WHERE vin = '16HGBH41JXMN109201')),

-- Electric/Hybrid
('toyota_prius_front.jpg', 'toyota_prius_front.jpg', '/uploads/cars/toyota_prius_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '17HGBH41JXMN109202')),
('toyota_prius_interior.jpg', 'toyota_prius_interior.jpg', '/uploads/cars/toyota_prius_interior.jpg', 'interior', 2, false, (SELECT id FROM car_details WHERE vin = '17HGBH41JXMN109202')),
('honda_accord_hybrid_front.jpg', 'honda_accord_hybrid_front.jpg', '/uploads/cars/honda_accord_hybrid_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '18HGBH41JXMN109203')),
('honda_accord_hybrid_side.jpg', 'honda_accord_hybrid_side.jpg', '/uploads/cars/honda_accord_hybrid_side.jpg', 'exterior', 2, false, (SELECT id FROM car_details WHERE vin = '18HGBH41JXMN109203')),

-- Trucks
('chevrolet_silverado_front.jpg', 'chevrolet_silverado_front.jpg', '/uploads/cars/chevrolet_silverado_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '19HGBH41JXMN109204')),
('chevrolet_silverado_bed.jpg', 'chevrolet_silverado_bed.jpg', '/uploads/cars/chevrolet_silverado_bed.jpg', 'exterior', 2, false, (SELECT id FROM car_details WHERE vin = '19HGBH41JXMN109204')),
('ram_1500_front.jpg', 'ram_1500_front.jpg', '/uploads/cars/ram_1500_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '20HGBH41JXMN109205')),
('ram_1500_interior.jpg', 'ram_1500_interior.jpg', '/uploads/cars/ram_1500_interior.jpg', 'interior', 2, false, (SELECT id FROM car_details WHERE vin = '20HGBH41JXMN109205')),

-- Convertibles
('bmw_4series_convertible_front.jpg', 'bmw_4series_convertible_front.jpg', '/uploads/cars/bmw_4series_convertible_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '21HGBH41JXMN109206')),
('bmw_4series_convertible_top_down.jpg', 'bmw_4series_convertible_top_down.jpg', '/uploads/cars/bmw_4series_convertible_top_down.jpg', 'exterior', 2, false, (SELECT id FROM car_details WHERE vin = '21HGBH41JXMN109206')),

-- Wagons
('subaru_outback_front.jpg', 'subaru_outback_front.jpg', '/uploads/cars/subaru_outback_front.jpg', 'exterior', 1, true, (SELECT id FROM car_details WHERE vin = '22HGBH41JXMN109207')),
('subaru_outback_side.jpg', 'subaru_outback_side.jpg', '/uploads/cars/subaru_outback_side.jpg', 'exterior', 2, false, (SELECT id FROM car_details WHERE vin = '22HGBH41JXMN109207'));

-- ========================================
-- SAMPLE ACTIVITY LOGS
-- ========================================
INSERT INTO activity_logs (level, category, message, description, "userId", "createdAt") VALUES
('info', 'user_action', 'User registered successfully', 'New user account created', (SELECT id FROM users WHERE email = 'john.doe@example.com'), NOW() - INTERVAL '30 days'),
('info', 'listing_action', 'Listing created', 'New car listing posted', (SELECT id FROM users WHERE email = 'john.doe@example.com'), NOW() - INTERVAL '25 days'),
('info', 'admin_action', 'Listing approved', 'Car listing approved by admin', (SELECT id FROM users WHERE email = 'admin@carmarket.com'), NOW() - INTERVAL '24 days'),
('info', 'user_action', 'User registered successfully', 'New user account created', (SELECT id FROM users WHERE email = 'jane.smith@example.com'), NOW() - INTERVAL '20 days'),
('info', 'listing_action', 'Listing created', 'New car listing posted', (SELECT id FROM users WHERE email = 'jane.smith@example.com'), NOW() - INTERVAL '15 days'),
('info', 'admin_action', 'Listing approved', 'Car listing approved by admin', (SELECT id FROM users WHERE email = 'admin@carmarket.com'), NOW() - INTERVAL '14 days'),
('info', 'user_action', 'User registered successfully', 'New user account created', (SELECT id FROM users WHERE email = 'bob.wilson@example.com'), NOW() - INTERVAL '10 days'),
('info', 'listing_action', 'Listing created', 'New car listing posted', (SELECT id FROM users WHERE email = 'bob.wilson@example.com'), NOW() - INTERVAL '8 days'),
('info', 'admin_action', 'Listing approved', 'Car listing approved by admin', (SELECT id FROM users WHERE email = 'admin@carmarket.com'), NOW() - INTERVAL '7 days'),
('info', 'listing_action', 'Listing created', 'New car listing posted', (SELECT id FROM users WHERE email = 'john.doe@example.com'), NOW() - INTERVAL '2 days');

COMMIT;

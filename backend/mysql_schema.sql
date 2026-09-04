-- AgroHerd Multi-Farm Database Schema for MySQL / TiDB

-- 1. FARMS
CREATE TABLE IF NOT EXISTS farms (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  farm_id VARCHAR(36),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'worker' CHECK (role IN ('admin', 'worker')),
  phone VARCHAR(20),
  profile_pic VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  otp_code VARCHAR(6) NULL,
  otp_expires_at TIMESTAMP NULL,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_farm (farm_id),
  INDEX idx_users_email (email),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- 3. COWS
CREATE TABLE IF NOT EXISTS cows (
  id VARCHAR(36) PRIMARY KEY,
  farm_id VARCHAR(36),
  tag_number VARCHAR(50) NOT NULL,
  name VARCHAR(100),
  breed VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  weight_kg DECIMAL(6,2),
  color VARCHAR(50),
  health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'sick', 'pregnant', 'dry', 'sold', 'deceased')),
  is_milking BOOLEAN DEFAULT TRUE,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  notes TEXT,
  photo_url VARCHAR(500),
  added_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cows_farm (farm_id),
  INDEX idx_cows_tag (farm_id, tag_number),
  INDEX idx_cows_health (health_status),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. ESTRUS CYCLES
CREATE TABLE IF NOT EXISTS estrus_cycles (
  id VARCHAR(36) PRIMARY KEY,
  farm_id VARCHAR(36),
  cow_id VARCHAR(36) NOT NULL,
  last_cycle_date DATE NOT NULL,
  cycle_status VARCHAR(30) DEFAULT 'pending' CHECK (cycle_status IN ('pending', 'observed', 'missed', 'confirmed_pregnancy', 'failed', 'pregnancy_attempt', 'given_medicine', 'pregnant')),
  notes TEXT,
  recorded_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cycles_farm (farm_id),
  INDEX idx_cycles_cow (cow_id),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) PRIMARY KEY,
  farm_id VARCHAR(36),
  cow_id VARCHAR(36) NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN ('food', 'medical', 'maintenance', 'labor', 'equipment', 'utilities', 'other')),
  sub_category VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  vendor VARCHAR(150),
  receipt_url VARCHAR(500),
  notes TEXT,
  added_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expenses_farm (farm_id),
  INDEX idx_expenses_date (expense_date),
  INDEX idx_expenses_category (category),
  INDEX idx_expenses_cow (cow_id),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE SET NULL,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. MILK RECORDS
CREATE TABLE IF NOT EXISTS milk_records (
  id VARCHAR(36) PRIMARY KEY,
  farm_id VARCHAR(36),
  cow_id VARCHAR(36) NULL,
  record_date DATE NOT NULL,
  session VARCHAR(20) DEFAULT 'full_day' CHECK (session IN ('morning', 'evening', 'full_day')),
  quantity_liters DECIMAL(6,2) NOT NULL,
  price_per_liter DECIMAL(6,2) NULL,
  quality_grade VARCHAR(5) DEFAULT 'A' CHECK (quality_grade IN ('A', 'B', 'C')),
  fat_percentage DECIMAL(4,2),
  notes TEXT,
  recorded_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_milk_farm (farm_id),
  INDEX idx_milk_date (record_date),
  INDEX idx_milk_cow (cow_id),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. HEALTH RECORDS
CREATE TABLE IF NOT EXISTS health_records (
  id VARCHAR(36) PRIMARY KEY,
  farm_id VARCHAR(36),
  cow_id VARCHAR(36) NOT NULL,
  record_date DATE NOT NULL,
  record_type VARCHAR(30) NOT NULL CHECK (record_type IN ('vaccination', 'treatment', 'checkup', 'deworming', 'surgery', 'other')),
  diagnosis VARCHAR(255),
  treatment TEXT,
  medication VARCHAR(255),
  dosage VARCHAR(100),
  vet_name VARCHAR(150),
  vet_contact VARCHAR(50),
  follow_up_date DATE,
  cost DECIMAL(10,2),
  notes TEXT,
  recorded_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_health_farm (farm_id),
  INDEX idx_health_cow (cow_id),
  INDEX idx_health_date (record_date),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 8. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  farm_id VARCHAR(36),
  user_id VARCHAR(36) NULL,
  cow_id VARCHAR(36) NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('estrus_alert', 'health_alert', 'expense_alert', 'low_milk', 'system')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  is_read BOOLEAN DEFAULT FALSE,
  scheduled_for TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_farm (farm_id),
  INDEX idx_notif_user_read (user_id, is_read),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE SET NULL
);

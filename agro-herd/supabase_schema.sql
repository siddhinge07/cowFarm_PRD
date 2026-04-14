-- ============================================================
-- AgroHerd Database Schema for Supabase (PostgreSQL)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS (extends Supabase Auth users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  role          VARCHAR(20) DEFAULT 'worker' CHECK (role IN ('admin', 'manager', 'worker')),
  phone         VARCHAR(20),
  profile_pic   VARCHAR(500),
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. COWS
-- ============================================================
CREATE TABLE IF NOT EXISTS cows (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_number        VARCHAR(50) UNIQUE NOT NULL,
  name              VARCHAR(100),
  breed             VARCHAR(100) NOT NULL,
  date_of_birth     DATE,
  weight_kg         DECIMAL(6,2),
  color             VARCHAR(50),
  health_status     VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'sick', 'pregnant', 'dry', 'sold', 'deceased')),
  is_milking        BOOLEAN DEFAULT TRUE,
  purchase_date     DATE,
  purchase_price    DECIMAL(10,2),
  notes             TEXT,
  photo_url         VARCHAR(500),
  added_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cows_tag ON cows(tag_number);
CREATE INDEX IF NOT EXISTS idx_cows_health ON cows(health_status);

-- ============================================================
-- 3. ESTRUS CYCLES (Reproductive Tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS estrus_cycles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cow_id              UUID NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  last_cycle_date     DATE NOT NULL,
  cycle_status        VARCHAR(30) DEFAULT 'pending' CHECK (cycle_status IN ('pending', 'observed', 'missed', 'confirmed_pregnancy')),
  notes               TEXT,
  recorded_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cycles_cow ON estrus_cycles(cow_id);

-- ============================================================
-- 4. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cow_id          UUID REFERENCES cows(id) ON DELETE SET NULL,  -- NULL = farm-wide
  category        VARCHAR(30) NOT NULL CHECK (category IN ('food', 'medical', 'maintenance', 'labor', 'equipment', 'utilities', 'other')),
  sub_category    VARCHAR(100),
  amount          DECIMAL(10,2) NOT NULL,
  expense_date    DATE NOT NULL,
  vendor          VARCHAR(150),
  receipt_url     VARCHAR(500),
  notes           TEXT,
  added_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_cow ON expenses(cow_id);

-- ============================================================
-- 5. MILK RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS milk_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cow_id          UUID NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  record_date     DATE NOT NULL,
  session         VARCHAR(20) DEFAULT 'full_day' CHECK (session IN ('morning', 'evening', 'full_day')),
  quantity_liters DECIMAL(6,2) NOT NULL,
  price_per_liter DECIMAL(6,2) NOT NULL,
  quality_grade   VARCHAR(5) DEFAULT 'A' CHECK (quality_grade IN ('A', 'B', 'C')),
  fat_percentage  DECIMAL(4,2),
  notes           TEXT,
  recorded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cow_id, record_date, session)
);

CREATE INDEX IF NOT EXISTS idx_milk_date ON milk_records(record_date);
CREATE INDEX IF NOT EXISTS idx_milk_cow ON milk_records(cow_id);

-- ============================================================
-- 6. HEALTH RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS health_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cow_id            UUID NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  record_date       DATE NOT NULL,
  record_type       VARCHAR(30) NOT NULL CHECK (record_type IN ('vaccination', 'treatment', 'checkup', 'deworming', 'surgery', 'other')),
  diagnosis         VARCHAR(255),
  treatment         TEXT,
  medication        VARCHAR(255),
  dosage            VARCHAR(100),
  vet_name          VARCHAR(150),
  vet_contact       VARCHAR(50),
  follow_up_date    DATE,
  cost              DECIMAL(10,2),
  notes             TEXT,
  recorded_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_cow ON health_records(cow_id);
CREATE INDEX IF NOT EXISTS idx_health_date ON health_records(record_date);

-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = broadcast
  cow_id        UUID REFERENCES cows(id) ON DELETE SET NULL,
  type          VARCHAR(30) NOT NULL CHECK (type IN ('estrus_alert', 'health_alert', 'expense_alert', 'low_milk', 'system')),
  title         VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  priority      VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  is_read       BOOLEAN DEFAULT FALSE,
  scheduled_for TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_scheduled ON notifications(scheduled_for);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cows ENABLE ROW LEVEL SECURITY;
ALTER TABLE estrus_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE milk_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users: Can read own, admins read all
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Cows: All authenticated can read, admins/managers can write
CREATE POLICY "Authenticated users can view cows" ON cows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cows" ON cows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cows" ON cows FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cows" ON cows FOR DELETE TO authenticated USING (true);

-- Estrus Cycles: Similar access
CREATE POLICY "Authenticated users can view cycles" ON estrus_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cycles" ON estrus_cycles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cycles" ON estrus_cycles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cycles" ON estrus_cycles FOR DELETE TO authenticated USING (true);

-- Expenses
CREATE POLICY "Authenticated users can view expenses" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update expenses" ON expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete expenses" ON expenses FOR DELETE TO authenticated USING (true);

-- Milk Records
CREATE POLICY "Authenticated users can view milk" ON milk_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert milk" ON milk_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update milk" ON milk_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete milk" ON milk_records FOR DELETE TO authenticated USING (true);

-- Health Records
CREATE POLICY "Authenticated users can view health" ON health_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert health" ON health_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update health" ON health_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete health" ON health_records FOR DELETE TO authenticated USING (true);

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Authenticated users can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cows_updated_at BEFORE UPDATE ON cows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DONE! Your AgroHerd database is ready.
-- ============================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CHW', 'HEALTH_CENTER', 'RBC_ADMIN', 'SUPER_ADMIN')),
  district TEXT NOT NULL DEFAULT '',
  facility_id TEXT NOT NULL DEFAULT '',
  village TEXT NOT NULL DEFAULT '',
  chw_code TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facilities (
  facility_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  client_uuid TEXT NOT NULL UNIQUE,
  facility_id TEXT NOT NULL,
  chw_id TEXT NOT NULL,
  district TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT '',
  age_months INTEGER NOT NULL,
  sex TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('refer', 'urgent_refer')),
  reasons_json TEXT NOT NULL DEFAULT '[]',
  summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'received', 'arrived', 'treated')),
  created_at TEXT NOT NULL,
  received_at TEXT,
  arrived_at TEXT,
  treated_at TEXT,
  FOREIGN KEY (facility_id) REFERENCES facilities(facility_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_facility ON referrals(facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_chw ON referrals(chw_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

CREATE TABLE IF NOT EXISTS referral_messages (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_id TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  district TEXT NOT NULL,
  commodity TEXT NOT NULL,
  stock_on_hand INTEGER NOT NULL DEFAULT 0,
  quantity_consumed INTEGER NOT NULL DEFAULT 0,
  stockout INTEGER NOT NULL DEFAULT 0,
  weeks_of_cover REAL NOT NULL DEFAULT 0
);

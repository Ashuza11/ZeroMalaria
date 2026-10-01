INSERT OR IGNORE INTO facilities (facility_id, name, district, sector) VALUES
  ('HC-BUG-01', 'Nyamata Health Centre', 'Bugesera', 'Nyamata'),
  ('HC-GIS-01', 'Gisagara Health Centre', 'Gisagara', 'Gisagara');

-- PBKDF2-SHA256: 100000 iterations, salt zeromalaria-demo-2026, password demo1234.
INSERT OR IGNORE INTO users (id, username, password_hash, display_name, role, district, facility_id, village, chw_code) VALUES
  ('user-chw-demo', 'chw.demo', 'pbkdf2$zeromalaria-demo-2026$635be184cd7954b4f28f64c037453a1c85d00c7e6e864c2be4afb3d8c6e30365', 'Jeanne Mutesi', 'CHW', 'Bugesera', 'HC-BUG-01', 'Nyamata', 'CHW-BUG-01-01'),
  ('user-health-center', 'health.center', 'pbkdf2$zeromalaria-demo-2026$635be184cd7954b4f28f64c037453a1c85d00c7e6e864c2be4afb3d8c6e30365', 'Nyamata Health Centre', 'HEALTH_CENTER', 'Bugesera', 'HC-BUG-01', '', ''),
  ('user-rbc-admin', 'rbc.admin', 'pbkdf2$zeromalaria-demo-2026$635be184cd7954b4f28f64c037453a1c85d00c7e6e864c2be4afb3d8c6e30365', 'RBC Demo Administrator', 'RBC_ADMIN', '', '', '', ''),
  ('user-super-admin', 'super.admin', 'pbkdf2$zeromalaria-demo-2026$635be184cd7954b4f28f64c037453a1c85d00c7e6e864c2be4afb3d8c6e30365', 'Super Administrator', 'SUPER_ADMIN', '', '', '', '');

UPDATE users SET display_name = 'Jeanne Mutesi' WHERE username = 'chw.demo';

INSERT OR IGNORE INTO stock (id, facility_id, facility_name, district, commodity, stock_on_hand, quantity_consumed, stockout, weeks_of_cover) VALUES
  (1, 'HC-BUG-01', 'Nyamata Health Centre', 'Bugesera', 'RDT', 120, 44, 0, 2.7),
  (2, 'HC-BUG-01', 'Nyamata Health Centre', 'Bugesera', 'ACT', 32, 29, 0, 1.1),
  (3, 'HC-GIS-01', 'Gisagara Health Centre', 'Gisagara', 'RDT', 0, 38, 1, 0);

INSERT OR IGNORE INTO referrals
  (id, client_uuid, facility_id, chw_id, district, sector, age_months, sex, decision, reasons_json, summary, status, created_at)
VALUES
  ('demo-overdue', 'demo-overdue-never-arrived', 'HC-BUG-01', 'CHW-BUG-01-01', 'Bugesera', 'Nyamata', 18, 'female', 'urgent_refer', '["Unable to drink"]', 'RBC urgent referral; patient has not arrived.', 'sent', datetime('now', '-2 days')),
  ('demo-received', 'demo-received-referral', 'HC-BUG-01', 'CHW-BUG-01-01', 'Bugesera', 'Nyamata', 40, 'male', 'refer', '["Persistent fever"]', 'RBC referral received by facility.', 'received', datetime('now', '-8 hours'));

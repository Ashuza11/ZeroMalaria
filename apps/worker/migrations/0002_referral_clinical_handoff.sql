ALTER TABLE referrals ADD COLUMN temperature_c REAL;
ALTER TABLE referrals ADD COLUMN fever_days INTEGER;
ALTER TABLE referrals ADD COLUMN tdr_result TEXT;
ALTER TABLE referrals ADD COLUMN other_symptoms TEXT NOT NULL DEFAULT '';
ALTER TABLE referrals ADD COLUMN triggered_rules_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE referrals ADD COLUMN protocol_reference TEXT NOT NULL DEFAULT '';
ALTER TABLE referrals ADD COLUMN ai_brief TEXT NOT NULL DEFAULT '';

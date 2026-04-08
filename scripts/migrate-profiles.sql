-- Alter profiles id column from uuid to text for compatibility with app string IDs
ALTER TABLE profiles ALTER COLUMN id SET DATA TYPE text;
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT NULL;

-- Seed initial users matching the app seed data
INSERT INTO profiles (id, name, email, role, cluster, impact_area)
VALUES
  ('u1', 'Sarah Chen', 'sarah.chen@gov.uk', 'PM', 'Health & Social Care', 'NHS Digital Transformation'),
  ('u2', 'James Morrison', 'james.morrison@gov.uk', 'POC_CHAIR', NULL, NULL),
  ('u3', 'Amara Osei', 'amara.osei@gov.uk', 'POC_MEMBER', NULL, NULL),
  ('u4', 'Tom Bradley', 'tom.bradley@gov.uk', 'ADMIN', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

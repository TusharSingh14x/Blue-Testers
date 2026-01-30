
INSERT INTO communities (id, name, description, created_by, member_count)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'General',
  'A general chatroom for all campus members to connect and communicate',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  0
WHERE NOT EXISTS (
  SELECT 1 FROM communities WHERE name = 'General'
);



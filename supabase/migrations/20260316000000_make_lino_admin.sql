INSERT INTO user_roles (user_id, role)
SELECT user_id, 'admin'::user_role
FROM users 
WHERE email = 'lino@expert.micro1.ai'
ON CONFLICT (user_id, role) DO NOTHING;

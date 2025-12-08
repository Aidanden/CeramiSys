-- Update admin user with screen.all permission
UPDATE "Users" 
SET "Permissions" = '["screen.all"]'::jsonb 
WHERE "UserName" = 'admin';

-- Verify the update
SELECT "UserName", "FullName", "Permissions", "RoleID" 
FROM "Users" 
WHERE "UserName" = 'admin';

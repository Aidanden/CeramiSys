-- Fix Admin permissions
UPDATE "UserRoles" 
SET "Permissions" = '["screen.all"]'::jsonb 
WHERE "RoleName" = 'admin';

-- Fix Manager permissions
UPDATE "UserRoles" 
SET "Permissions" = '["screen.dashboard","screen.companies","screen.products","screen.sales","screen.sale_returns","screen.purchases","screen.payment_receipts","screen.warehouse_dispatch","screen.customer_accounts","screen.supplier_accounts","screen.accountant","screen.reports","screen.users"]'::jsonb 
WHERE "RoleName" = 'manager';

-- Fix Cashier permissions
UPDATE "UserRoles" 
SET "Permissions" = '["screen.dashboard","screen.sales","screen.sale_returns","screen.purchases","screen.customer_accounts","screen.supplier_accounts"]'::jsonb 
WHERE "RoleName" = 'cashier';

-- Fix Accountant permissions
UPDATE "UserRoles" 
SET "Permissions" = '["screen.dashboard","screen.accountant","screen.customer_accounts","screen.supplier_accounts","screen.reports","screen.payment_receipts"]'::jsonb 
WHERE "RoleName" = 'accountant';

-- Check results
SELECT "RoleName", "Permissions" FROM "UserRoles";

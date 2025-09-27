-- Exchange System Database Initialization
-- This file is used to initialize the PostgreSQL database

-- Create database if it doesn't exist
-- Note: This will be executed when the container starts

-- You can add any initial data or custom SQL here
-- For example, creating additional indexes or views

-- Example: Create a view for dashboard statistics
-- CREATE OR REPLACE VIEW dashboard_stats AS
-- SELECT 
--     COUNT(DISTINCT c.CustID) as total_customers,
--     COUNT(DISTINCT cr.CarID) as total_currencies,
--     SUM(b.TotalPrice) as total_buys,
--     SUM(s.TotalPrice) as total_sales
-- FROM "Users" u
-- LEFT JOIN "Customers" c ON u.UserID = c.UserID
-- LEFT JOIN "Carrences" cr ON u.UserID = cr.UserID
-- LEFT JOIN "Buys" b ON u.UserID = b.UserID
-- LEFT JOIN "Sales" s ON u.UserID = s.UserID
-- WHERE u.UserID = $1;

-- Note: The actual schema will be created by Prisma migrations

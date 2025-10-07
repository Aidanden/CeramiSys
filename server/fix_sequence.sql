-- Fix PostgreSQL sequence for Product table
-- This resets the auto-increment to start after the highest existing ID

SELECT setval('Product_id_seq', (SELECT MAX(id) FROM "Product"));

-- Verify the sequence is now correct
SELECT currval('Product_id_seq') as current_sequence_value;
SELECT MAX(id) as max_product_id FROM "Product";

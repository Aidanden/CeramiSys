/**
 * Script to parse _tg_asma file and merge customers/suppliers with existing seed data
 * Run with: node mergeSeedData.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const tgAsmaPath = path.join(__dirname, '../../../docs/_data_old_app/_tg_asma');
const customerJsonPath = path.join(__dirname, '../seedData/Customer.json');
const supplierJsonPath = path.join(__dirname, '../seedData/Supplier.json');

// Read existing data
const existingCustomers = JSON.parse(fs.readFileSync(customerJsonPath, 'utf-8'));
const existingSuppliers = JSON.parse(fs.readFileSync(supplierJsonPath, 'utf-8'));

// Create sets for existing names (normalized) to avoid duplicates
const existingCustomerNames = new Set(existingCustomers.map(c => c.name.trim().toLowerCase()));
const existingSupplierNames = new Set(existingSuppliers.map(s => s.name.trim().toLowerCase()));

// Get max ID from existing customers
let maxCustomerId = Math.max(...existingCustomers.map(c => c.id || 0), 0);

// Read and parse _tg_asma file
const tgAsmaContent = fs.readFileSync(tgAsmaPath, 'utf-8');
const lines = tgAsmaContent.split('\n');

// New entries to add
const newCustomers = [];
const newSuppliers = [];

// Parse each line (skip header)
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Split by tab
  const parts = line.split('\t');
  if (parts.length < 6) continue;
  
  const numero = parts[0];
  const nameWithPhone = parts[1];
  const type = parts[5]; // عميل or مورد
  
  if (!nameWithPhone || !type) continue;
  
  // Extract phone from name if present (pattern: name 09xxxxxxxx)
  let name = nameWithPhone.trim();
  let phone = null;
  
  // Try to extract phone number (Libyan format: 09xxxxxxxx or 0912xxxxxx etc)
  const phoneMatch = name.match(/\s+(0\d{9,10})$/);
  if (phoneMatch) {
    phone = phoneMatch[1];
    name = name.replace(phoneMatch[0], '').trim();
  }
  
  // Normalize name for comparison
  const normalizedName = name.toLowerCase();
  
  if (type === 'عميل') {
    // Check if customer already exists
    if (!existingCustomerNames.has(normalizedName)) {
      maxCustomerId++;
      newCustomers.push({
        id: maxCustomerId,
        name: name,
        phone: phone,
        note: null
      });
      existingCustomerNames.add(normalizedName);
    }
  } else if (type === 'مورد') {
    // Check if supplier already exists
    if (!existingSupplierNames.has(normalizedName)) {
      newSuppliers.push({
        name: name,
        phone: phone,
        email: null,
        address: null,
        note: null
      });
      existingSupplierNames.add(normalizedName);
    }
  }
}

// Merge with existing data
const mergedCustomers = [...existingCustomers, ...newCustomers];
const mergedSuppliers = [...existingSuppliers, ...newSuppliers];

// Write back to files
fs.writeFileSync(customerJsonPath, JSON.stringify(mergedCustomers, null, 2), 'utf-8');
fs.writeFileSync(supplierJsonPath, JSON.stringify(mergedSuppliers, null, 2), 'utf-8');

console.log('=== Merge Complete ===');
console.log(`Existing customers: ${existingCustomers.length}`);
console.log(`New customers added: ${newCustomers.length}`);
console.log(`Total customers: ${mergedCustomers.length}`);
console.log('');
console.log(`Existing suppliers: ${existingSuppliers.length}`);
console.log(`New suppliers added: ${newSuppliers.length}`);
console.log(`Total suppliers: ${mergedSuppliers.length}`);

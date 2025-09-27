const bcrypt = require('bcryptjs');

async function generateCorrectHash() {
  try {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 12);
    console.log('Password: admin123');
    console.log('New Hash:', hash);
    
    // تجربة المقارنة للتأكد
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash validation test:', isValid);
    
    // Test with the current hash from Users.json
    const currentHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2hL5jD5iKe';
    const currentValid = await bcrypt.compare(password, currentHash);
    console.log('Current hash validation:', currentValid);
    
    return hash;
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateCorrectHash();

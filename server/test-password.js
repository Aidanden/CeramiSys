const bcrypt = require('bcryptjs');

async function testPassword() {
  const password = 'admin123';
  const currentHash = '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
  
  console.log('Testing password:', password);
  console.log('Against hash:', currentHash);
  
  const isValid = await bcrypt.compare(password, currentHash);
  console.log('Password validation result:', isValid);
  
  // Generate a new hash for comparison
  const newHash = await bcrypt.hash(password, 12);
  console.log('New hash generated:', newHash);
  
  const newHashValid = await bcrypt.compare(password, newHash);
  console.log('New hash validation:', newHashValid);
}

testPassword().catch(console.error);

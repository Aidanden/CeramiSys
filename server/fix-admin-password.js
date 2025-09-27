const bcrypt = require('bcryptjs');

// Generate a proper hash for admin123
async function createHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 12);
    console.log('Generated hash for admin123:', hash);
    
    // Test the hash
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash validation:', isValid);
}

createHash().catch(console.error);

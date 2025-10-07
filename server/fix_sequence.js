const { PrismaClient } = require('@prisma/client');

async function fixSequence() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing Product ID sequence...');
    
    // Get the current max ID
    const result = await prisma.$queryRaw`SELECT MAX(id) as max_id FROM "Product"`;
    const maxId = result[0]?.max_id || 0;
    console.log(`📊 Current max Product ID: ${maxId}`);
    
    // Reset the sequence to start after the max ID
    await prisma.$executeRaw`SELECT setval('Product_id_seq', ${maxId})`;
    
    // Verify the fix
    const seqResult = await prisma.$queryRaw`SELECT currval('Product_id_seq') as current_value`;
    const currentValue = seqResult[0]?.current_value;
    console.log(`✅ Sequence reset to: ${currentValue}`);
    console.log(`🎯 Next Product ID will be: ${parseInt(currentValue) + 1}`);
    
  } catch (error) {
    console.error('❌ Error fixing sequence:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSequence();

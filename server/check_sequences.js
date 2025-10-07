const { PrismaClient } = require('@prisma/client');

async function checkSequences() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking available sequences...');
    
    // List all sequences
    const sequences = await prisma.$queryRaw`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `;
    
    console.log('📋 Available sequences:');
    sequences.forEach(seq => console.log(`  - ${seq.sequence_name}`));
    
    // Check Product table structure
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'Product' AND table_schema = 'public'
    `;
    
    console.log('\n📊 Product table columns:');
    tableInfo.forEach(col => console.log(`  - ${col.column_name}: ${col.column_default}`));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSequences();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAdmin() {
  try {
    console.log('🔄 Updating admin permissions...\n');

    const admin = await prisma.users.update({
      where: { UserName: 'admin' },
      data: {
        Permissions: ['screen.all']
      }
    });

    console.log('✅ Admin permissions updated!');
    console.log('   Username:', admin.UserName);
    console.log('   Permissions:', ['screen.all']);
    console.log('\n✨ Admin now has access to all screens!');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateAdmin();

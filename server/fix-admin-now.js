const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAdmin() {
  try {
    // Update admin user with screen.all permission
    const admin = await prisma.users.update({
      where: { UserName: 'admin' },
      data: {
        Permissions: ['screen.all']
      }
    });

    console.log('✅ SUCCESS! Admin permissions updated!');
    console.log('Username:', admin.UserName);
    console.log('Permissions: ["screen.all"]');
    console.log('\n🎉 Admin now has access to ALL screens including Users management!');
    console.log('\n📝 Next steps:');
    console.log('1. Logout from the application');
    console.log('2. Login again as admin');
    console.log('3. Try accessing Users page - it should work now!');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixAdmin();

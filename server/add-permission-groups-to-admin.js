const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAdminPermissions() {
  try {
    console.log('🔄 Updating admin permissions to include permission_groups...\n');

    // Get current admin user
    const admin = await prisma.users.findUnique({
      where: { UserName: 'admin' }
    });

    if (!admin) {
      console.log('❌ Admin user not found!');
      await prisma.$disconnect();
      return;
    }

    console.log('👤 Current admin permissions:', admin.Permissions);

    // Update admin with screen.all (which gives access to everything)
    const updatedAdmin = await prisma.users.update({
      where: { UserName: 'admin' },
      data: {
        Permissions: ['screen.all']
      }
    });

    console.log('\n✅ SUCCESS! Admin permissions updated!');
    console.log('📋 New permissions:', updatedAdmin.Permissions);
    console.log('\n🎉 Admin now has access to ALL screens including Permission Groups!');
    console.log('\n📝 You can now access:');
    console.log('   - /users (User Management)');
    console.log('   - /permission-groups (Permission Groups Management)');
    console.log('   - All other screens');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateAdminPermissions();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.users.findUnique({
      where: { UserName: 'admin' },
      include: {
        Role: true
      }
    });

    if (!admin) {
      console.log('❌ Admin user not found!');
      await prisma.$disconnect();
      return;
    }

    console.log('\n👤 Admin User Info:');
    console.log('   Username:', admin.UserName);
    console.log('   Full Name:', admin.FullName);
    console.log('   Role:', admin.Role?.RoleName || 'No role');
    console.log('\n🔑 Direct Permissions:', admin.Permissions);
    console.log('🔑 Role Permissions:', admin.Role?.Permissions);
    
    const effectivePermissions = admin.Permissions || admin.Role?.Permissions || [];
    console.log('\n✅ Effective Permissions:', effectivePermissions);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

checkAdmin();

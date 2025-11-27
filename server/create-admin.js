const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Check if admin exists
    const existingAdmin = await prisma.users.findUnique({
      where: { UserName: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log(`   Username: ${existingAdmin.UserName}`);
      console.log(`   Full Name: ${existingAdmin.FullName}`);
      await prisma.$disconnect();
      return;
    }

    // Create admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await prisma.users.create({
      data: {
        UserID: 'admin_user_001',
        UserName: 'admin',
        Password: hashedPassword,
        FullName: 'مدير النظام',
        Email: 'admin@ceramics.ly',
        Phone: '+218911234567',
        RoleID: 'role_admin_001',
        CompanyID: 1,
        IsActive: true,
        IsSystemUser: true,
        LoginAttempts: 0
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log(`   Username: ${admin.UserName}`);
    console.log(`   Password: admin123`);
    console.log(`   Full Name: ${admin.FullName}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAdmin();

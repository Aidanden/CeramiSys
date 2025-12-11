const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.users.findMany({
      include: {
        Role: {
          select: {
            RoleName: true,
            Permissions: true
          }
        }
      }
    });

    console.log(`\n📊 Total users: ${users.length}\n`);
    
    users.forEach(user => {
      console.log(`👤 ${user.FullName} (${user.UserName})`);
      console.log(`   Role: ${user.Role.RoleName}`);
      console.log(`   Permissions:`, user.Role.Permissions);
      console.log('');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

checkUsers();

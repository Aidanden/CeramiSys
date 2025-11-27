const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPermissions() {
  try {
    const roles = await prisma.userRoles.findMany({
      select: {
        RoleName: true,
        Permissions: true
      }
    });

    console.log('=== User Roles and Permissions ===\n');
    roles.forEach(role => {
      console.log(`Role: ${role.RoleName}`);
      console.log(`Permissions type: ${typeof role.Permissions}`);
      console.log(`Is Array: ${Array.isArray(role.Permissions)}`);
      console.log(`Permissions:`, role.Permissions);
      console.log('---\n');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkPermissions();

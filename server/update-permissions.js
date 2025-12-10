const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePermissions() {
  try {
    console.log('🔄 Updating permissions...\n');

    // Update Admin role
    await prisma.userRoles.update({
      where: { RoleName: 'admin' },
      data: {
        Permissions: ['screen.all']
      }
    });
    console.log('✅ Admin permissions updated to: ["screen.all"]');

    // Update Manager role
    await prisma.userRoles.update({
      where: { RoleName: 'manager' },
      data: {
        Permissions: [
          'screen.dashboard',
          'screen.companies',
          'screen.products',
          'screen.sales',
          'screen.sale_returns',
          'screen.purchases',
          'screen.payment_receipts',
          'screen.warehouse_dispatch',
          'screen.customer_accounts',
          'screen.supplier_accounts',
          'screen.accountant',
          'screen.reports',
          'screen.users'
        ]
      }
    });
    console.log('✅ Manager permissions updated (13 screens)');

    // Update Cashier role
    await prisma.userRoles.update({
      where: { RoleName: 'cashier' },
      data: {
        Permissions: [
          'screen.dashboard',
          'screen.sales',
          'screen.sale_returns',
          'screen.purchases',
          'screen.customer_accounts',
          'screen.supplier_accounts'
        ]
      }
    });
    console.log('✅ Cashier permissions updated (6 screens)');

    // Update Accountant role
    await prisma.userRoles.update({
      where: { RoleName: 'accountant' },
      data: {
        Permissions: [
          'screen.dashboard',
          'screen.accountant',
          'screen.customer_accounts',
          'screen.supplier_accounts',
          'screen.reports',
          'screen.payment_receipts'
        ]
      }
    });
    console.log('✅ Accountant permissions updated (6 screens)');

    // Check if Warehouse role exists, if not create it
    const warehouseRole = await prisma.userRoles.findUnique({
      where: { RoleName: 'warehouse' }
    });

    if (!warehouseRole) {
      await prisma.userRoles.create({
        data: {
          RoleID: 'role_warehouse_001',
          RoleName: 'warehouse',
          DisplayName: 'أمين مخزن',
          Permissions: [
            'screen.dashboard',
            'screen.products',
            'screen.warehouse_dispatch',
            'screen.damage_reports',
            'screen.purchases'
          ],
          Description: 'أمين مخزن يمكنه إدارة المخزون والأصناف',
          IsActive: true
        }
      });
      console.log('✅ Warehouse role created (5 screens)');
    } else {
      await prisma.userRoles.update({
        where: { RoleName: 'warehouse' },
        data: {
          Permissions: [
            'screen.dashboard',
            'screen.products',
            'screen.warehouse_dispatch',
            'screen.damage_reports',
            'screen.purchases'
          ]
        }
      });
      console.log('✅ Warehouse permissions updated (5 screens)');
    }

    console.log('\n✅ All permissions updated successfully!');
    console.log('\n📋 Summary:');
    console.log('- Admin: screen.all');
    console.log('- Manager: 13 screens');
    console.log('- Cashier: 6 screens');
    console.log('- Accountant: 6 screens');
    console.log('- Warehouse: 5 screens');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updatePermissions();

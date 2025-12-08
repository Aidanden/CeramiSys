// اختبار تشغيل الخادم
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4001; // استخدام منفذ مختلف للاختبار

app.use(cors());
app.use(express.json());

// اختبار بسيط
app.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'الخادم يعمل بشكل صحيح',
    timestamp: new Date().toISOString()
  });
});

// اختبار قاعدة البيانات
app.get('/test-db', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const supplierCount = await prisma.supplier.count();
    const accountCount = await prisma.supplierAccount.count();
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      data: {
        suppliers: supplierCount,
        accountEntries: accountCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// اختبار API حسابات الموردين
app.get('/test-supplier-accounts', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const suppliers = await prisma.supplier.findMany({
      include: {
        accountEntries: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      take: 5
    });
    
    const summary = suppliers.map(supplier => {
      const lastEntry = supplier.accountEntries[0];
      const currentBalance = lastEntry ? Number(lastEntry.balance) : 0;
      
      return {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        currentBalance,
        hasDebt: currentBalance !== 0,
      };
    });
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 خادم الاختبار يعمل على المنفذ ${PORT}`);
  console.log(`📊 اختبار قاعدة البيانات: http://localhost:${PORT}/test-db`);
  console.log(`🏢 اختبار حسابات الموردين: http://localhost:${PORT}/test-supplier-accounts`);
});

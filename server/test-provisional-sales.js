/**
 * اختبار بسيط لنظام الفواتير المبدئية
 * Simple test for Provisional Sales System
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api';

// بيانات اختبار
const testData = {
  provisionalSale: {
    companyId: 1,
    customerId: 1,
    invoiceNumber: "PROV-TEST-001",
    status: "DRAFT",
    notes: "فاتورة اختبار للنظام الجديد",
    lines: [
      {
        productId: 1,
        qty: 5,
        unitPrice: 100.00
      },
      {
        productId: 2,
        qty: 2,
        unitPrice: 250.00
      }
    ]
  }
};

async function testProvisionalSalesSystem() {
  console.log('🚀 بدء اختبار نظام الفواتير المبدئية...\n');

  try {
    // 1. اختبار إنشاء فاتورة مبدئية
    console.log('1️⃣ اختبار إنشاء فاتورة مبدئية...');
    const createResponse = await axios.post(`${BASE_URL}/provisional-sales`, testData.provisionalSale);
    
    if (createResponse.data.success) {
      console.log('✅ تم إنشاء الفاتورة المبدئية بنجاح');
      console.log(`   معرف الفاتورة: ${createResponse.data.data.id}`);
      console.log(`   إجمالي الفاتورة: ${createResponse.data.data.total}`);
      
      const provisionalSaleId = createResponse.data.data.id;
      
      // 2. اختبار الحصول على الفاتورة
      console.log('\n2️⃣ اختبار الحصول على الفاتورة...');
      const getResponse = await axios.get(`${BASE_URL}/provisional-sales/${provisionalSaleId}`);
      
      if (getResponse.data.success) {
        console.log('✅ تم الحصول على الفاتورة بنجاح');
        console.log(`   حالة الفاتورة: ${getResponse.data.data.status}`);
        console.log(`   عدد السطور: ${getResponse.data.data.lines.length}`);
      }
      
      // 3. اختبار تحديث حالة الفاتورة
      console.log('\n3️⃣ اختبار تحديث حالة الفاتورة...');
      const statusResponse = await axios.patch(`${BASE_URL}/provisional-sales/${provisionalSaleId}/status`, {
        status: 'APPROVED'
      });
      
      if (statusResponse.data.success) {
        console.log('✅ تم تحديث حالة الفاتورة بنجاح');
        console.log(`   الحالة الجديدة: ${statusResponse.data.data.status}`);
      }
      
      // 4. اختبار الحصول على قائمة الفواتير
      console.log('\n4️⃣ اختبار الحصول على قائمة الفواتير...');
      const listResponse = await axios.get(`${BASE_URL}/provisional-sales?page=1&limit=10`);
      
      if (listResponse.data.success) {
        console.log('✅ تم الحصول على قائمة الفواتير بنجاح');
        console.log(`   عدد الفواتير: ${listResponse.data.data.length}`);
        console.log(`   إجمالي الصفحات: ${listResponse.data.pagination.totalPages}`);
      }
      
      // 5. اختبار ترحيل الفاتورة (اختياري - يتطلب بيانات صحيحة)
      console.log('\n5️⃣ اختبار ترحيل الفاتورة...');
      try {
        const convertResponse = await axios.post(`${BASE_URL}/provisional-sales/${provisionalSaleId}/convert`, {
          saleType: 'CREDIT',
          paymentMethod: 'CASH'
        });
        
        if (convertResponse.data.success) {
          console.log('✅ تم ترحيل الفاتورة بنجاح');
          console.log(`   معرف فاتورة المبيعات: ${convertResponse.data.data.convertedSaleId}`);
        }
      } catch (convertError) {
        console.log('⚠️  لم يتم ترحيل الفاتورة (قد يكون بسبب عدم وجود مخزون كافي)');
        console.log(`   السبب: ${convertError.response?.data?.message || convertError.message}`);
      }
      
      // 6. اختبار حذف الفاتورة (إذا لم يتم ترحيلها)
      console.log('\n6️⃣ اختبار حذف الفاتورة...');
      try {
        const deleteResponse = await axios.delete(`${BASE_URL}/provisional-sales/${provisionalSaleId}`);
        
        if (deleteResponse.data.success) {
          console.log('✅ تم حذف الفاتورة بنجاح');
        }
      } catch (deleteError) {
        console.log('⚠️  لم يتم حذف الفاتورة (قد تكون مرحلة بالفعل)');
        console.log(`   السبب: ${deleteError.response?.data?.message || deleteError.message}`);
      }
      
    } else {
      console.log('❌ فشل في إنشاء الفاتورة المبدئية');
      console.log(createResponse.data);
    }
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:');
    if (error.response) {
      console.error(`   كود الخطأ: ${error.response.status}`);
      console.error(`   رسالة الخطأ: ${error.response.data.message || error.response.data.error}`);
      if (error.response.data.errors) {
        console.error('   تفاصيل الأخطاء:');
        error.response.data.errors.forEach(err => {
          console.error(`     - ${err.field}: ${err.message}`);
        });
      }
    } else {
      console.error(`   خطأ في الشبكة: ${error.message}`);
      console.error('   تأكد من تشغيل الخادم على المنفذ 8000');
    }
  }
  
  console.log('\n🏁 انتهى الاختبار');
}

// تشغيل الاختبار
testProvisionalSalesSystem();

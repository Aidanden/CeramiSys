import { formatLibyanCurrencyArabic, formatEnglishDate } from './formatLibyanNumbers';
export const printReceipt = (receipt: any, installment?: any, isFullPayment: boolean = false) => {
  // إنشاء عنصر مؤقت للطباعة
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
    return;
  }

  // تعيين عنوان النافذة
  printWindow.document.title = `إيصال دفع - ${receipt.supplier.name}`;

  // إنشاء محتوى HTML للطباعة
  const receiptHTML = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>إيصال دفع - ${receipt.supplier.name}</title>
      <style>
        @media print {
          body { margin: 0; }
          .printable-receipt {
            display: block !important;
            font-family: 'Arial', sans-serif;
            max-width: 80mm;
            margin: 0 auto;
            padding: 15px;
            font-size: 11px;
            line-height: 1.5;
            direction: rtl;
            border: 1px solid #333;
            background: white;
          }
          .print-controls { display: none !important; }
        }
        @media screen {
          body {
            background: #f8f9fa;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            font-family: 'Arial', sans-serif;
          }
          .printable-receipt {
            display: block !important;
            background: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-radius: 8px;
            border: 2px solid #e9ecef;
            font-family: 'Arial', sans-serif;
            max-width: 80mm;
            margin: 20px auto;
            padding: 15px;
            font-size: 11px;
            line-height: 1.5;
            direction: rtl;
          }
        }
      </style>
    </head>
    <body>
      <div class="printable-receipt">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 12px; margin-bottom: 15px;">
          <div style="background: #007bff; color: white; padding: 8px 15px; border-radius: 5px; margin-bottom: 8px;">
            <h1 style="font-size: 18px; font-weight: bold; margin: 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
              إيصال دفع
            </h1>
          </div>
          <div style="font-size: 10px; color: #666; margin-top: 5px;">
            تاريخ الطباعة: ${new Date().toLocaleString('en-GB')}
          </div>
        </div>

        <!-- Receipt Details -->
        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: bold; color: #495057;">رقم الإيصال:</span>
            <span style="font-weight: bold; color: #007bff;">#${receipt.id}</span>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: bold; color: #495057;">المورد:</span>
            <span>${receipt.supplier.name}</span>
          </div>

          ${receipt.purchase ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: bold; color: #495057;">فاتورة المشتريات:</span>
            <span>${receipt.purchase.invoiceNumber || `#${receipt.purchase.id}`}</span>
          </div>
          ` : ''}

          ${receipt.type ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: bold; color: #495057;">النوع:</span>
            <span>${
              receipt.type === 'MAIN_PURCHASE' ? 'فاتورة رئيسية' :
              receipt.type === 'EXPENSE' ? 'مصروف' : receipt.type
            }</span>
          </div>
          ` : ''}
        </div>

        <!-- Payment Details -->
        <div style="border: 2px solid #28a745; padding: 12px; margin-bottom: 15px; border-radius: 6px; background: #f8fff9;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 12px 0; text-align: center; color: #28a745;">
            ✓ تفاصيل الدفعة
          </h3>

          ${installment ? `
            <!-- Individual installment -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>المبلغ المدفوع:</span>
              <span style="font-weight: bold; font-size: 16px; color: #28a745;">
                ${installment.amount.toFixed(2)} ${receipt.currency || 'LYD'}
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>تاريخ الدفع:</span>
              <span>${formatEnglishDate(installment.paidAt)}</span>
            </div>

            ${installment.paymentMethod ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>طريقة الدفع:</span>
              <span>${installment.paymentMethod}</span>
            </div>
            ` : ''}

            ${installment.referenceNumber ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>الرقم المرجعي:</span>
              <span>${installment.referenceNumber}</span>
            </div>
            ` : ''}

            ${installment.notes ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #dee2e6;">
              <span style="font-weight: bold;">ملاحظات:</span>
              <p style="margin: 5px 0; font-size: 11px; color: #6c757d;">${installment.notes}</p>
            </div>
            ` : ''}
          ` : `
            <!-- Full payment -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>المبلغ الإجمالي:</span>
              <span>${receipt.amount.toFixed(2)} ${receipt.currency || 'LYD'}</span>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>المبلغ المدفوع:</span>
              <span style="font-weight: bold; font-size: 16px; color: #28a745;">
                ${receipt.amount.toFixed(2)} ${receipt.currency || 'LYD'}
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>تاريخ التسديد:</span>
              <span>${receipt.paidAt ? formatEnglishDate(receipt.paidAt) : new Date().toLocaleString('en-GB')}</span>
            </div>
          `}
        </div>

        <!-- Receipt Summary -->
        <div style="border: 2px solid #007bff; padding: 12px; margin-bottom: 15px; border-radius: 6px; background: #f8f9ff;">
          <h4 style="font-size: 14px; font-weight: bold; margin: 0 0 12px 0; text-align: center; color: #007bff;">
            📊 ملخص الإيصال
          </h4>

          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>المبلغ الإجمالي:</span>
            <span style="font-weight: bold;">${(receipt.amount || 0).toFixed(2)} ${receipt.currency || 'LYD'}</span>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>المبلغ المدفوع:</span>
            <span style="font-weight: bold; color: #28a745;">${(receipt.paidAmount || 0).toFixed(2)} ${receipt.currency || 'LYD'}</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 2px solid #007bff; padding-top: 8px; margin-top: 8px; font-size: 13px;">
            <span>المبلغ المتبقي:</span>
            <span style="color: #dc3545;">
              ${(receipt.remainingAmount || receipt.amount || 0).toFixed(2)} ${receipt.currency || 'LYD'}
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 2px solid #007bff; padding-top: 12px; margin-top: 15px;">
          <p style="margin: 0; font-size: 12px; color: #007bff; font-weight: bold;">
            شكراً لتعاملكم معنا
          </p>
          <div style="margin-top: 8px; font-size: 10px; color: #6c757d;">
            إيصال صادر في ${new Date().toLocaleDateString('ar-SA')}
          </div>
        </div>
      </div>

    </body>
    </html>
  `;

  // كتابة المحتوى في النافذة
  printWindow.document.write(receiptHTML);
  printWindow.document.close();

  // طباعة تلقائية إذا كان مطلوباً
  if (isFullPayment) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 100);
    };
  } else {
    // إضافة أزرار التحكم للطباعة اليدوية
    printWindow.onload = () => {
      const body = printWindow.document.body;

      // إضافة أزرار التحكم
      const controlsDiv = printWindow.document.createElement('div');
      controlsDiv.className = 'print-controls';
      controlsDiv.style.cssText = 'text-align: center; margin-top: 20px; padding: 10px; background: #f8f9fa; border-top: 1px solid #dee2e6;';
      controlsDiv.innerHTML = `
        <button onclick="window.print()" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin: 0 5px; font-size: 12px;">
          طباعة
        </button>
        <button onclick="window.close()" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin: 0 5px; font-size: 12px;">
          إغلاق
        </button>
      `;

      body.appendChild(controlsDiv);
    };
  }
};

/**
 * طباعة إيصال تسوية مورد (دفع)
 */
export const printSupplierSettleReceipt = (receipt: any, supplierName: string) => {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
    return;
  }

  const receiptHTML = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>إيصال دفع تسوية - ${supplierName}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; direction: rtl; }
        .receipt-container { border: 2px solid #333; padding: 30px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #1a56db; font-size: 28px; }
        .header p { margin: 5px 0; color: #666; }
        .detail-item { display: flex; border-bottom: 1px dotted #ccc; padding: 10px 0; }
        .label { font-weight: bold; width: 140px; color: #444; }
        .value { flex: 1; font-weight: 500; }
        .amount-box { background: #f8fafc; border: 2px solid #1e40af; padding: 20px; text-align: center; border-radius: 12px; margin: 20px 0; }
        .amount-lyd { font-size: 32px; font-weight: 900; color: #1e40af; }
        .amount-foreign { font-size: 18px; color: #64748b; margin-top: 5px; }
        .footer { margin-top: 50px; text-align: center; border-top: 2px solid #eee; padding-top: 20px; display: flex; justify-content: space-between; }
        .signature { border-top: 1px solid #333; width: 200px; padding-top: 10px; margin-top: 40px; }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h1>إيصال دفع مالي</h1>
          <p>تسوية رصيد سابق / مديونية مرحلة</p>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div><strong>رقم الإيصال:</strong> ${receipt.id}</div>
          <div><strong>التاريخ:</strong> ${new Date(receipt.paidAt || new Date()).toLocaleDateString('ar-LY')}</div>
        </div>

        <div class="detail-item"><span class="label">يصرف للسيد/ة:</span><span class="value">${supplierName}</span></div>
        <div class="detail-item"><span class="label">مقابل:</span><span class="value">${(receipt.description || 'تسوية رصيد مرحل').replace('من المنظومة القديمة التقازي', '').trim()}</span></div>
        
        <div class="amount-box">
          <div class="amount-lyd">${Number(receipt.amount).toFixed(2)} د.ل</div>
          ${receipt.currency !== 'LYD' ? `
            <div class="amount-foreign">
              المعادل: ${Number(receipt.amountForeign).toFixed(2)} ${receipt.currency} 
              (بسعر صرف: ${Number(receipt.exchangeRate).toFixed(4)})
            </div>
          ` : ''}
        </div>

        <div class="detail-item"><span class="label">ملاحظات:</span><span class="value">${receipt.notes || '-'}</span></div>

        <div class="footer">
          <div>
            <p>توقيع المستلم</p>
            <div class="signature"></div>
          </div>
          <div>
            <p>توقيع المحاسب</p>
            <div class="signature"></div>
          </div>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px;" class="no-print">
        <button onclick="window.print()" style="padding: 10px 20px; background: #1a56db; color: white; border: none; border-radius: 5px; cursor: pointer;">طباعة</button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(receiptHTML);
  printWindow.document.close();
};

/**
 * طباعة إيصال تسوية عميل (قبض)
 */
export const printCustomerSettleReceipt = (receipt: any, customerName: string) => {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
    return;
  }

  const receiptHTML = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>إيصال قبض تسوية - ${customerName}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; direction: rtl; }
        .receipt-container { border: 2px solid #333; padding: 30px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #059669; font-size: 28px; }
        .header p { margin: 5px 0; color: #666; }
        .detail-item { display: flex; border-bottom: 1px dotted #ccc; padding: 10px 0; }
        .label { font-weight: bold; width: 140px; color: #444; }
        .value { flex: 1; font-weight: 500; }
        .amount-box { background: #f0fdf4; border: 2px solid #059669; padding: 20px; text-align: center; border-radius: 12px; margin: 20px 0; }
        .amount-lyd { font-size: 32px; font-weight: 900; color: #059669; }
        .footer { margin-top: 50px; text-align: center; border-top: 2px solid #eee; padding-top: 20px; display: flex; justify-content: space-between; }
        .signature { border-top: 1px solid #333; width: 200px; padding-top: 10px; margin-top: 40px; }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h1>إيصال قبض مالي</h1>
          <p>تسوية رصيد سابق / مديونية مرحلة</p>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div><strong>رقم الإيصال:</strong> ${receipt.id}</div>
          <div><strong>التاريخ:</strong> ${new Date(receipt.createdAt || receipt.paymentDate || new Date()).toLocaleDateString('ar-LY')}</div>
        </div>

        <div class="detail-item"><span class="label">وصلنا من السيد/ة:</span><span class="value">${customerName}</span></div>
        <div class="detail-item"><span class="label">مبلغ وقدره:</span><span class="value">${Number(receipt.amount).toFixed(2)} دينار ليبي فقط لا غير</span></div>
        <div class="detail-item"><span class="label">مقابل:</span><span class="value">${(receipt.description || 'تسوية رصيد مرحل').replace('من المنظومة القديمة التقازي', '').trim()}</span></div>
        
        <div class="amount-box">
          <div class="amount-lyd">${Number(receipt.amount).toFixed(2)} د.ل</div>
        </div>

        <div class="detail-item"><span class="label">ملاحظات:</span><span class="value">${receipt.notes || '-'}</span></div>

        <div class="footer">
          <div>
            <p>توقيع المستلم</p>
            <div class="signature"></div>
          </div>
          <div>
            <p>توقيع المسلم</p>
            <div class="signature"></div>
          </div>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px;" class="no-print">
        <button onclick="window.print()" style="padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 5px; cursor: pointer;">طباعة</button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(receiptHTML);
  printWindow.document.close();
};

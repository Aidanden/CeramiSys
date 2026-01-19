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

"use client";

import { useState, useRef, useEffect } from "react";
import {
  useGetSalesReportQuery,
  useGetStockReportQuery,
  useGetCustomerReportQuery,
  useGetTopProductsReportQuery,
  useGetSupplierReportQuery,
  useGetPurchaseReportQuery,
  useGetProductMovementReportQuery,
  useGetProfitReportQuery,
  useGetSupplierStockReportQuery,

} from "@/state/reportsApi";
import { useGetSuppliersQuery } from "@/state/purchaseApi";

import { useGetCompaniesQuery } from "@/state/companyApi";
import { useGetProductsQuery } from "@/state/productsApi";
import {
  BarChart3,
  ShoppingCart,
  Users,
  FileText,
  Search,
  X,
  Building2,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Layout
} from "lucide-react";
import { useReactToPrint } from "react-to-print";

type ReportType = "sales" | "stock" | "customers" | "top-products" | "suppliers" | "purchases" | "product-movement" | "profit" | "company-stock";

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("sales");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  // فلتر الشركة والصنف
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);

  // حالات البحث عن الصنف (حركة صنف)
  const [productNameSearch, setProductNameSearch] = useState('');
  const [productCodeSearch, setProductCodeSearch] = useState('');
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);

  // إغلاق القوائم عند النقر في الخارج
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.code-dropdown-container')) setShowCodeDropdown(false);
      if (!target.closest('.name-dropdown-container')) setShowNameDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // جلب قائمة الشركات
  const { data: companiesData } = useGetCompaniesQuery({ limit: 100 });
  const companies = companiesData?.data?.companies || [];

  // جلب قائمة الموردين
  const { data: suppliersData } = useGetSuppliersQuery({ limit: 1000 });
  const suppliersList = suppliersData?.data?.suppliers || [];

  // جلب الأصناف لاختيار صنف في التقرير
  const { data: productsData } = useGetProductsQuery({
    limit: 10000,
    companyId: selectedCompanyId,
    strict: !!selectedCompanyId // إذا تم اختيار شركة، جلب أصنافها فقط. وإذا كانت جميع الشركات، جلب الكل.
  });
  const products = productsData?.data?.products || [];

  // Pagination state لكل تقرير
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // إعادة تعيين الصفحة عند تغيير التقرير
  const handleReportChange = (reportId: ReportType) => {
    setActiveReport(reportId);
    setCurrentPage(1);
  };

  // Filters
  const [filters, setFilters] = useState({
    customerName: "",
    invoiceNumber: "",
    productName: "",
    productCode: "",
    minAmount: "",
    maxAmount: "",
    supplierName: "",
    supplierPhone: "",
    invoiceAmount: "",
    customerPhone: "",
    supplierReportName: "",
    supplierReportPhone: "",
    supplierId: "",
  });

  // دالة لتوحيد الحروف العربية لتحسين البحث
  const normalizeArabic = (text: string): string => {
    if (!text) return "";
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u0652]/g, ''); // إزالة التشكيل
  };

  // دالة مساعدة للبحث النصي المحسن (تدعم العربية والإنجليزية)
  const textSearch = (text: string | null | undefined, query: string): boolean => {
    if (!text || !query) return true;
    const normText = normalizeArabic(text);
    const normQuery = normalizeArabic(query);
    return normText.includes(normQuery);
  };

  const printRef = useRef<HTMLDivElement>(null);

  // دالة الطباعة المحسنة - تطبع جميع البيانات بدون pagination
  const handlePrint = () => {
    const reportName = reports.find(r => r.id === activeReport)?.name || 'تقرير';
    const companyName = selectedCompanyId
      ? companies.find((c: any) => c.id === selectedCompanyId)?.name
      : 'جميع الشركات';

    // جلب البيانات المفلترة للطباعة
    let printData: any[] = [];
    let stats: any = null;
    let tableHeaders: string[] = [];
    let tableRows: (item: any, index: number) => string = () => '';
    let customPrintContent = '';

    if (activeReport === 'sales' && salesReport) {
      stats = salesReport.data.stats;
      printData = salesReport.data.sales.filter((sale: any) => {
        if (filters.invoiceNumber && !textSearch(sale.invoiceNumber, filters.invoiceNumber)) return false;
        if (filters.customerName && !textSearch(sale.customer?.name, filters.customerName)) return false;
        if (filters.minAmount && sale.total < parseFloat(filters.minAmount)) return false;
        if (filters.maxAmount && sale.total > parseFloat(filters.maxAmount)) return false;
        return true;
      });
      tableHeaders = ['رقم الفاتورة', 'التاريخ', 'العميل', 'النوع', 'المبلغ', 'الحالة'];
      tableRows = (sale: any) => `
        <tr>
          <td>${sale.invoiceNumber || '-'}</td>
          <td>${new Date(sale.createdAt).toLocaleDateString('ar-LY')}</td>
          <td>${sale.customer?.name || 'عميل نقدي'}</td>
          <td>${sale.saleType === 'CASH' ? 'نقدي' : 'آجل'}</td>
          <td>${sale.total.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</td>
          <td>${sale.isFullyPaid ? 'مدفوع' : 'غير مدفوع'}</td>
        </tr>
      `;
    } else if (activeReport === 'stock' && stockReport) {
      stats = stockReport.data.stats;
      printData = stockReport.data.stocks.filter((stock: any) => {
        if (filters.productCode && !textSearch(stock.product.sku, filters.productCode)) return false;
        if (filters.productName && !textSearch(stock.product.name, filters.productName)) return false;
        return true;
      });
      tableHeaders = ['كود الصنف', 'الصنف', 'الصناديق', 'إجمالي الكمية', 'السعر', 'القيمة'];
      tableRows = (stock: any) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${stock.product.sku || '-'}</td>
          <td>${stock.product.name}</td>
          <td>
            ${stock.boxes.toLocaleString('ar-LY')}
          </td>
          <td>
            ${stock.totalUnits.toLocaleString('ar-LY')} ${stock.product.unitsPerBox && Number(stock.product.unitsPerBox) !== 1 ? 'متر' : 'قطعة'}
          </td>
          <td>${stock.product.costPrice ? stock.product.costPrice.toLocaleString('ar-LY', { minimumFractionDigits: 2 }) + ' د.ل' : '-'}</td>
          <td>${stock.product.costPrice ? (stock.totalUnits * stock.product.costPrice).toLocaleString('ar-LY', { minimumFractionDigits: 2 }) + ' د.ل' : '-'}</td>
        </tr>
      `;

    } else if (activeReport === 'company-stock' && supplierStockReport) {
      customPrintContent = `
        <div style="margin-bottom: 30px; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <h2 style="margin-top: 0; color: #1e40af;">تقرير بضاعة الشركات - ${supplierStockReport.data.supplier.name}</h2>
          <p style="color: #666;">رقم الهاتف: ${supplierStockReport.data.supplier.phone || 'غير مسجل'}</p>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px;">
            <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; border: 1px solid #dcfce7;">
              <p style="margin: 0; font-size: 12px; color: #166534;">رصيد LYD</p>
              <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: ${(supplierStockReport.data.supplier.balances?.LYD || 0) > 0 ? '#b91c1c' : '#166534'}">
                ${Math.abs(supplierStockReport.data.supplier.balances?.LYD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                ${(supplierStockReport.data.supplier.balances?.LYD || 0) > 0 ? '(عليك)' : '(لك)'}
              </p>
            </div>
            <div style="background: #eff6ff; padding: 15px; border-radius: 6px; border: 1px solid #dbeafe;">
              <p style="margin: 0; font-size: 12px; color: #1e40af;">رصيد USD</p>
              <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: ${(supplierStockReport.data.supplier.balances?.USD || 0) > 0 ? '#b91c1c' : '#1e40af'}">
                ${Math.abs(supplierStockReport.data.supplier.balances?.USD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} $
                ${(supplierStockReport.data.supplier.balances?.USD || 0) > 0 ? '(عليك)' : '(لك)'}
              </p>
            </div>
            <div style="background: #f5f3ff; padding: 15px; border-radius: 6px; border: 1px solid #ede9fe;">
              <p style="margin: 0; font-size: 12px; color: #5b21b6;">رصيد EUR</p>
              <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: ${(supplierStockReport.data.supplier.balances?.EUR || 0) > 0 ? '#b91c1c' : '#5b21b6'}">
                ${Math.abs(supplierStockReport.data.supplier.balances?.EUR || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} €
                ${(supplierStockReport.data.supplier.balances?.EUR || 0) > 0 ? '(عليك)' : '(لك)'}
              </p>
            </div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: right; font-size: 11px;">الصنف</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 11px;">إجمالي المشتراة</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 11px;">الكمية المباعة</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 11px;">الرصيد الحالي</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 11px;">التكلفة</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 11px;">الأداء</th>
            </tr>
          </thead>
          <tbody>
            ${(supplierStockReport.data.items || []).map((item: any) => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">
                  <div style="font-weight: bold; font-size: 12px;">${item.product.name}</div>
                  <div style="font-size: 10px; color: #64748b; font-family: monospace;">${item.product.sku}</div>
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">
                  <div style="font-weight: bold;">${item.totalPurchased.toLocaleString('ar-LY')} ص</div>
                  <div style="font-size: 9px; color: #64748b;">
                    ${(item.totalPurchased * (item.product.unitsPerBox || 1)).toLocaleString('ar-LY', { minimumFractionDigits: 1 })} ${item.product.unitsPerBox && item.product.unitsPerBox !== 1 ? 'م²' : 'وحدة'}
                  </div>
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">
                  <div style="font-weight: bold; color: #15803d;">${item.soldQty.toLocaleString('ar-LY')} ص</div>
                  <div style="font-size: 9px; color: #166534;">
                    ${(item.soldQty * (item.product.unitsPerBox || 1)).toLocaleString('ar-LY', { minimumFractionDigits: 1 })} ${item.product.unitsPerBox && item.product.unitsPerBox !== 1 ? 'م²' : 'وحدة'}
                  </div>
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">
                  <div style="font-weight: bold; color: #1e40af;">
                    ${(item.currentStock * (item.product.unitsPerBox || 1)).toLocaleString('ar-LY', { minimumFractionDigits: 2 })} ${item.product.unitsPerBox && item.product.unitsPerBox !== 1 ? 'م²' : 'وحدة'}
                  </div>
                  <div style="font-size: 9px; color: #64748b;">
                    ${item.currentStock.toLocaleString('ar-LY')} صندوق
                  </div>
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-size: 11px;">
                  ${item.product.cost ? Number(item.product.cost).toLocaleString('ar-LY', { minimumFractionDigits: 2 }) + ' د.ل' : '-'}
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">
                  <div style="font-weight: bold; color: ${item.performance > 70 ? '#15803d' : item.performance > 30 ? '#b45309' : '#b91c1c'}; font-size: 11px;">
                    ${item.performance.toFixed(1)}%
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (activeReport === 'customers' && customerReport) {
      stats = customerReport.data.stats;
      printData = customerReport.data.customers.filter((customer: any) => {
        if (filters.customerName && !textSearch(customer.name, filters.customerName)) return false;
        if (filters.customerPhone && !textSearch(customer.phone, filters.customerPhone)) return false;
        return true;
      });
      tableHeaders = ['العميل', 'الهاتف', 'إجمالي المشتريات', 'عدد المبيعات', 'متوسط الشراء'];
      tableRows = (customer: any) => `
        <tr>
          <td>${customer.name}</td>
          <td>${customer.phone || '-'}</td>
          <td>${customer.totalPurchases.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</td>
          <td>${customer.totalSales.toLocaleString('ar-LY')}</td>
          <td>${customer.averagePurchase.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</td>
        </tr>
      `;
    } else if (activeReport === 'suppliers' && supplierReport) {
      stats = supplierReport.data.stats;
      printData = supplierReport.data.suppliers.filter((supplier: any) => {
        if (filters.supplierReportName && !textSearch(supplier.name, filters.supplierReportName)) return false;
        if (filters.supplierReportPhone && !textSearch(supplier.phone, filters.supplierReportPhone)) return false;
        return true;
      });
      tableHeaders = ['المورد', 'الهاتف', 'إجمالي المشتريات', 'المدفوع', 'الرصيد'];
      tableRows = (supplier: any) => `
        <tr>
          <td>${supplier.name}</td>
          <td>${supplier.phone || '-'}</td>
          <td>${supplier.totalPurchases.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</td>
          <td>${supplier.totalPaid.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</td>
          <td style="color: red; font-weight: bold;">${supplier.balance.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</td>
        </tr>
      `;
    } else if (activeReport === 'purchases' && purchaseReport) {
      stats = purchaseReport.data.stats;
      printData = purchaseReport.data.purchases.filter((purchase: any) => {
        if (filters.invoiceNumber && !textSearch(purchase.invoiceNumber, filters.invoiceNumber)) return false;
        if (filters.supplierName && !textSearch(purchase.supplier?.name, filters.supplierName)) return false;
        return true;
      });
      tableHeaders = ['رقم الفاتورة', 'التاريخ', 'المورد', 'المبلغ', 'المصروفات', 'الإجمالي'];
      tableRows = (purchase: any) => `
        <tr>
          <td>${purchase.invoiceNumber || '-'}</td>
          <td>${new Date(purchase.createdAt).toLocaleDateString('ar-LY')}</td>
          <td>${purchase.supplier?.name || '-'}</td>
          <td>${Number(purchase.total).toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</td>
          <td>${(purchase.totalExpenses || 0).toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</td>
          <td style="font-weight: bold;">${Number(purchase.finalTotal).toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</td>
        </tr>
      `;
    } else if (activeReport === 'top-products' && topProductsReport) {
      stats = topProductsReport.data.stats;
      printData = topProductsReport.data.topProducts.filter((item: any) => {
        if (filters.productName && !textSearch(item.product.name, filters.productName)) return false;
        // أضفت فلتر الكود هنا أيضاً للأكثر مبيعاً للفائدة
        if (filters.productCode && !textSearch(item.product.sku, filters.productCode)) return false;
        return true;
      });
      tableRows = (item: any, index: number) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${index + 1}</td>
          <td style="font-family: monospace;">${item.product.sku || '-'}</td>
          <td>${item.product.name}</td>
          <td>${item.totalQty.toLocaleString('ar-LY')} ${item.product.unit || 'وحدة'}</td>
          <td style="font-weight: bold;">${item.totalRevenue.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</td>
          <td>${item.salesCount.toLocaleString('ar-LY')}</td>
        </tr>
      `;
    } else if (activeReport === 'profit' && financialReport) {
      stats = financialReport.data.stats;
      tableHeaders = ['البيان', 'القيمة (د.ل)'];
      printData = [
        { label: 'إجمالي المبيعات', value: stats.totalSales },
        { label: 'تكلفة البضاعة المباعة', value: stats.totalCogs },
        { label: 'تكلفة المردودات', value: stats.totalReturnCost },
        { label: 'تكلفة التالف (الهالك)', value: stats.totalDamageCost },
        { label: 'صافي الربح الحقيقي', value: stats.netProfit },
      ];
      tableRows = (item: any) => `
        <tr style="${item.label === 'صافي الربح الحقيقي' ? 'font-weight: bold; background-color: #f1f5f9; font-size: 14px;' : ''}">
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.label}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-family: monospace;">${item.value.toLocaleString('ar-LY', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    } else if (activeReport === 'product-movement' && productMovementReport) {
      const data = productMovementReport.data;
      printData = data.movements;
      tableHeaders = ['التاريخ', 'النوع', 'الوصف', 'الوارد', 'الصادر', 'الرصيد'];
      tableRows = (m: any) => `
        <tr>
          <td>${new Date(m.date).toLocaleDateString('ar-LY')}</td>
          <td>${m.type === 'SALE' ? 'بيع' : m.type === 'PURCHASE' ? 'شراء' : m.type === 'RETURN' ? 'مردود' : m.type === 'DAMAGE' ? 'تالف' : 'افتتاحي'}</td>
          <td>${m.description}</td>
          <td style="color: ${m.qtyIn > 0 ? 'green' : 'black'}">${m.qtyIn > 0 ? m.qtyIn.toLocaleString('ar-LY') : '-'}</td>
          <td style="color: ${m.qtyOut > 0 ? 'red' : 'black'}">${m.qtyOut > 0 ? m.qtyOut.toLocaleString('ar-LY') : '-'}</td>
          <td style="font-weight: bold;">${m.balance.toLocaleString('ar-LY')}</td>
        </tr>
      `;
      // إضافة معلومات الصنف للطباعة
      stats = {
        'اسم الصنف': data.product.name,
        'الكود': data.product.sku,
        'رصيد أول المدة': data.openingBalance.toLocaleString('ar-LY'),
        'المخزون الحالي': data.currentStock.toLocaleString('ar-LY')
      };
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${reportName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif; 
            padding: 20px;
            direction: rtl;
            font-size: 12px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
          }
          th, td { 
            border: 1px solid #333; 
            padding: 8px 6px; 
            text-align: right;
          }
          th { 
            background-color: #e5e7eb; 
            font-weight: bold;
            font-size: 11px;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px;
            border-bottom: 3px double #333;
            padding-bottom: 15px;
          }
          .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
          }
          .header p {
            font-size: 12px;
            color: #666;
            margin: 3px 0;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 15px 0;
          }
          .stat-card {
            border: 1px solid #333;
            padding: 10px;
            text-align: center;
            background-color: #f3f4f6;
          }
          .stat-label {
            font-size: 10px;
            color: #666;
          }
          .stat-value {
            font-size: 16px;
            font-weight: bold;
            margin-top: 3px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          .total-row {
            font-weight: bold;
            background-color: #e5e7eb !important;
          }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportName}</h1>
          <p><strong>الشركة:</strong> ${companyName}</p>
          <p><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleDateString('ar-LY')} - ${new Date().toLocaleTimeString('ar-LY')}</p>
          ${(dateRange.startDate || dateRange.endDate) ? `
            <p><strong>الفترة:</strong> ${dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString('ar-LY') : 'البداية'} - ${dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString('ar-LY') : 'النهاية'}</p>
          ` : ''}
          <p><strong>عدد السجلات:</strong> ${printData.length}</p>
        </div>
        
        ${customPrintContent ? customPrintContent : `
        <table>
          <thead>
            <tr>
              ${tableHeaders.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${printData.map((item, index) => tableRows(item, index)).join('')}
          </tbody>
        </table>
        `}
        
        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام سيراميسيس - CeramiSys</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  // مكون Pagination
  const Pagination = ({ totalItems, filteredItems }: { totalItems: number; filteredItems: any[] }) => {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);

    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex items-center text-sm text-gray-700">
          <span>عرض </span>
          <span className="font-medium mx-1">{startIndex + 1}</span>
          <span> إلى </span>
          <span className="font-medium mx-1">{endIndex}</span>
          <span> من </span>
          <span className="font-medium mx-1">{filteredItems.length}</span>
          <span> سجل</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            الأولى
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            السابق
          </button>
          <span className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            التالي
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            الأخيرة
          </button>
        </div>
      </div>
    );
  };

  // دالة لتقسيم البيانات حسب الصفحة
  const paginateData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  // استدعاء التقارير مع فلتر الشركة
  const { data: salesReport, isLoading: salesLoading } = useGetSalesReportQuery(
    { ...dateRange, companyId: selectedCompanyId },
    { skip: activeReport !== "sales" }
  );

  const { data: stockReport, isLoading: stockLoading } = useGetStockReportQuery(
    { companyId: selectedCompanyId },
    { skip: activeReport !== "stock" }
  );

  const { data: customerReport, isLoading: customerLoading } = useGetCustomerReportQuery(
    { ...dateRange, companyId: selectedCompanyId },
    { skip: activeReport !== "customers" }
  );

  const { data: topProductsReport, isLoading: topProductsLoading } = useGetTopProductsReportQuery(
    { ...dateRange, limit: 10, companyId: selectedCompanyId },
    { skip: activeReport !== "top-products" }
  );

  const { data: supplierReport, isLoading: supplierLoading } = useGetSupplierReportQuery(
    { ...dateRange, companyId: selectedCompanyId },
    { skip: activeReport !== "suppliers" }
  );

  const { data: purchaseReport, isLoading: purchaseLoading } = useGetPurchaseReportQuery(
    { ...dateRange, companyId: selectedCompanyId },
    { skip: activeReport !== "purchases" }
  );

  const { data: productMovementReport, isLoading: movementLoading } = useGetProductMovementReportQuery(
    { ...dateRange, companyId: selectedCompanyId, productId: selectedProductId! },
    { skip: activeReport !== "product-movement" || !selectedProductId }
  );

  const { data: financialReport, isLoading: financialLoading } = useGetProfitReportQuery(
    { ...dateRange, companyId: selectedCompanyId, productId: selectedProductId },
    { skip: activeReport !== "profit" }
  );

  const { data: supplierStockReport, isLoading: supplierStockLoading } = useGetSupplierStockReportQuery(
    { supplierId: parseInt(filters.supplierId) },
    { skip: activeReport !== "company-stock" || !filters.supplierId }
  );



  const reports = [
    { id: "sales" as ReportType, name: "تقرير المبيعات", icon: BarChart3, color: "blue" },
    { id: "purchases" as ReportType, name: "تقرير المشتريات", icon: ShoppingCart, color: "teal" },
    { id: "stock" as ReportType, name: "تقرير المخزون", icon: ShoppingCart, color: "green" },

    { id: "customers" as ReportType, name: "تقرير العملاء", icon: Users, color: "orange" },
    { id: "suppliers" as ReportType, name: "تقرير الموردين", icon: Users, color: "indigo" },
    { id: "top-products" as ReportType, name: "الأكثر مبيعاً", icon: FileText, color: "red" },
    { id: "product-movement" as ReportType, name: "حركة صنف", icon: FileText, color: "purple" },
    { id: "profit" as ReportType, name: "الأرباح والخسائر", icon: TrendingUp, color: "indigo" },
    { id: "company-stock" as ReportType, name: "بضاعة الشركات", icon: Building2, color: "orange" },
  ];

  const isLoading = salesLoading || stockLoading || customerLoading || topProductsLoading ||
    supplierLoading || purchaseLoading || movementLoading || financialLoading || supplierStockLoading;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
        <p className="text-gray-600 mt-1">عرض وتحليل تقارير النظام</p>
      </div>

      {/* Report Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {reports.map((report) => {
          const Icon = report.icon;
          const isActive = activeReport === report.id;
          return (
            <button
              key={report.id}
              onClick={() => handleReportChange(report.id)}
              className={`p-4 rounded-lg border-2 transition-all ${isActive
                ? `border-${report.color}-500 bg-${report.color}-50`
                : "border-gray-200 hover:border-gray-300"
                }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${isActive ? `text-${report.color}-600` : "text-gray-400"}`} />
              <p className={`text-sm font-medium ${isActive ? `text-${report.color}-700` : "text-gray-600"}`}>
                {report.name}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters Section */}
      {(activeReport === "sales" || activeReport === "stock" || activeReport === "customers" || activeReport === "top-products" || activeReport === "suppliers" || activeReport === "purchases" || activeReport === "product-movement" || activeReport === "profit" || activeReport === "company-stock") && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              الفلاتر والبحث
            </h3>
            <button
              onClick={() => {
                setFilters({ customerName: "", invoiceNumber: "", productName: "", productCode: "", minAmount: "", maxAmount: "", supplierName: "", supplierPhone: "", invoiceAmount: "", customerPhone: "", supplierReportName: "", supplierReportPhone: "", supplierId: "" });
                setSelectedCompanyId(undefined);
                setSelectedProductId(undefined);
                setProductCodeSearch('');
                setProductNameSearch('');
              }}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              مسح الفلاتر
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* فلتر الشركة */}
            <div>
              <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                الشركة
              </label>
              <select
                value={selectedCompanyId || ""}
                onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">جميع الشركات</option>
                {companies.map((company: any) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">من تاريخ</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sales Report Filters */}
            {activeReport === "sales" && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">رقم الفاتورة</label>
                  <input
                    type="text"
                    value={filters.invoiceNumber}
                    onChange={(e) => setFilters({ ...filters, invoiceNumber: e.target.value })}
                    placeholder="ابحث برقم الفاتورة"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">اسم العميل</label>
                  <input
                    type="text"
                    value={filters.customerName}
                    onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                    placeholder="ابحث باسم العميل"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">الحد الأدنى للمبلغ</label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">الحد الأقصى للمبلغ</label>
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                    placeholder="غير محدد"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">قيمة الفاتورة</label>
                  <input
                    type="number"
                    value={filters.invoiceAmount}
                    onChange={(e) => setFilters({ ...filters, invoiceAmount: e.target.value })}
                    placeholder="ابحث بقيمة محددة"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* Stock Report Filters */}
            {activeReport === "stock" && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">كود الصنف</label>
                  <input
                    type="text"
                    value={filters.productCode || ""}
                    onChange={(e) => setFilters({ ...filters, productCode: e.target.value })}
                    placeholder="ابحث بكود الصنف"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">اسم الصنف</label>
                  <input
                    type="text"
                    value={filters.productName || ""}
                    onChange={(e) => setFilters({ ...filters, productName: e.target.value })}
                    placeholder="ابحث باسم الصنف"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}



            {/* Customers Report Filters */}
            {activeReport === "customers" && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">اسم العميل</label>
                  <input
                    type="text"
                    value={filters.customerName}
                    onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                    placeholder="ابحث باسم العميل"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">هاتف العميل</label>
                  <input
                    type="text"
                    value={filters.customerPhone}
                    onChange={(e) => setFilters({ ...filters, customerPhone: e.target.value })}
                    placeholder="ابحث برقم الهاتف"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  />
                </div>
              </>
            )}

            {/* Top Products Filters */}
            {activeReport === "top-products" && (
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">اسم المنتج</label>
                <input
                  type="text"
                  value={filters.productName}
                  onChange={(e) => setFilters({ ...filters, productName: e.target.value })}
                  placeholder="ابحث باسم المنتج"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Suppliers Report Filters */}
            {activeReport === "suppliers" && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">اسم المورد</label>
                  <input
                    type="text"
                    value={filters.supplierReportName}
                    onChange={(e) => setFilters({ ...filters, supplierReportName: e.target.value })}
                    placeholder="ابحث باسم المورد"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">هاتف المورد</label>
                  <input
                    type="text"
                    value={filters.supplierReportPhone}
                    onChange={(e) => setFilters({ ...filters, supplierReportPhone: e.target.value })}
                    placeholder="ابحث برقم الهاتف"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  />
                </div>
              </>
            )}

            {/* Company Stock Report Filters */}
            {activeReport === "company-stock" && (
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">اختر المورد</label>
                <select
                  value={filters.supplierId}
                  onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">اختر مورد...</option>
                  {suppliersList.map((supplier: any) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Purchases Report Filters */}
            {activeReport === "purchases" && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">رقم الفاتورة</label>
                  <input
                    type="text"
                    value={filters.invoiceNumber}
                    onChange={(e) => setFilters({ ...filters, invoiceNumber: e.target.value })}
                    placeholder="ابحث برقم الفاتورة"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">اسم المورد</label>
                  <input
                    type="text"
                    value={filters.supplierName}
                    onChange={(e) => setFilters({ ...filters, supplierName: e.target.value })}
                    placeholder="ابحث باسم المورد"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">هاتف المورد</label>
                  <input
                    type="text"
                    value={filters.supplierPhone}
                    onChange={(e) => setFilters({ ...filters, supplierPhone: e.target.value })}
                    placeholder="ابحث برقم الهاتف"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">الحد الأدنى للمبلغ</label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">الحد الأقصى للمبلغ</label>
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                    placeholder="غير محدد"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">قيمة الفاتورة</label>
                  <input
                    type="number"
                    value={filters.invoiceAmount}
                    onChange={(e) => setFilters({ ...filters, invoiceAmount: e.target.value })}
                    placeholder="ابحث بقيمة محددة"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  />
                </div>
              </>
            )}

            {/* Product Movement Report Filters */}
            {activeReport === "product-movement" && (
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* البحث بالكود */}
                  <div className="relative code-dropdown-container">
                    <label className="block text-sm text-gray-600 mb-1">🔢 البحث بالكود</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productCodeSearch}
                        onChange={(e) => {
                          setProductCodeSearch(e.target.value);
                          setShowCodeDropdown(true);
                          setShowNameDropdown(false);
                        }}
                        onFocus={() => productCodeSearch && setShowCodeDropdown(true)}
                        placeholder="أدخل كود الصنف..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                      />
                      {showCodeDropdown && productCodeSearch && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {products
                            .filter((p: any) => p.sku.toLowerCase().trim() === productCodeSearch.toLowerCase().trim())
                            .map((p: any) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setSelectedProductId(p.id);
                                  setProductCodeSearch(p.sku);
                                  setProductNameSearch(p.name);
                                  setShowCodeDropdown(false);
                                }}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-right"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="font-bold text-gray-900 text-sm">{p.sku}</div>
                                  <div className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                    {p.createdByCompany?.name || 'شركة غير معروفة'}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 truncate">{p.name}</div>
                              </div>
                            ))}
                          {products.filter((p: any) => p.sku.toLowerCase().trim() === productCodeSearch.toLowerCase().trim()).length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">لا توجد نتائج</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* البحث بالاسم */}
                  <div className="relative name-dropdown-container">
                    <label className="block text-sm text-gray-600 mb-1">🔍 البحث بالاسم</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productNameSearch}
                        onChange={(e) => {
                          setProductNameSearch(e.target.value);
                          setShowNameDropdown(true);
                          setShowCodeDropdown(false);
                        }}
                        onFocus={() => productNameSearch && setShowNameDropdown(true)}
                        placeholder="ابحث باسم الصنف..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                      />
                      {showNameDropdown && productNameSearch && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {products
                            .filter((p: any) => normalizeArabic(p.name).includes(normalizeArabic(productNameSearch)))
                            .slice(0, 20)
                            .map((p: any) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setSelectedProductId(p.id);
                                  setProductNameSearch(p.name);
                                  setProductCodeSearch(p.sku);
                                  setShowNameDropdown(false);
                                }}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-right"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                                  <div className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                    {p.createdByCompany?.name || 'شركة غير معروفة'}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 truncate">كود: {p.sku}</div>
                              </div>
                            ))}
                          {products.filter((p: any) => normalizeArabic(p.name).includes(normalizeArabic(productNameSearch))).length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">لا توجد نتائج</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedProductId && (
                  <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-200 text-sm flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
                      <span>الصنف المختار: <span className="font-bold">{products.find((p: any) => p.id === selectedProductId)?.name}</span></span>
                      <span className="text-xs text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">كود: {products.find((p: any) => p.id === selectedProductId)?.sku}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProductId(undefined);
                        setProductNameSearch('');
                        setProductCodeSearch('');
                      }}
                      className="p-1 hover:bg-blue-200 rounded-full transition-colors"
                      title="إلغاء الاختيار"
                    >
                      <X className="w-4 h-4 text-blue-900" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">جاري تحميل التقرير...</p>
        </div>
      )}

      {/* Print Button */}
      {!isLoading && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-5 h-5" />
            طباعة التقرير
          </button>
        </div>
      )}

      {/* Printable Content */}
      <div ref={printRef}>
        {/* Print Header */}
        <div className="hidden print:block mb-6 text-center border-b-2 border-gray-300 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">تقرير {reports.find(r => r.id === activeReport)?.name}</h1>
          <p className="text-gray-600 mt-2">تاريخ الطباعة: {new Date().toLocaleDateString("ar-LY")}</p>
          {(dateRange.startDate || dateRange.endDate) && (
            <p className="text-gray-600 mt-1">
              الفترة: {dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString("ar-LY") : "البداية"} - {dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString("ar-LY") : "النهاية"}
            </p>
          )}
        </div>

        {/* Sales Report */}
        {activeReport === "sales" && salesReport && !salesLoading && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">إجمالي المبيعات</p>
                <p className="text-2xl font-bold text-blue-600">
                  {salesReport.data.stats.totalSales.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">المبيعات النقدية</p>
                <p className="text-2xl font-bold text-green-600">
                  {salesReport.data.stats.totalCash.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">المبيعات الآجلة</p>
                <p className="text-2xl font-bold text-orange-600">
                  {salesReport.data.stats.totalCredit.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">عدد الفواتير</p>
                <p className="text-2xl font-bold text-purple-600">
                  {salesReport.data.stats.salesCount.toLocaleString("ar-LY")}
                </p>
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الفاتورة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العميل</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const filteredSales = salesReport.data.sales.filter((sale: any) => {
                        if (filters.invoiceNumber && !textSearch(sale.invoiceNumber, filters.invoiceNumber)) return false;
                        if (filters.customerName && !textSearch(sale.customer?.name, filters.customerName)) return false;
                        if (filters.minAmount && sale.total < parseFloat(filters.minAmount)) return false;
                        if (filters.maxAmount && sale.total > parseFloat(filters.maxAmount)) return false;
                        return true;
                      });
                      return paginateData(filteredSales).map((sale: any) => (
                        <tr key={sale.id} className="hover:bg-gray-50 print:hover:bg-white">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sale.invoiceNumber || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(sale.createdAt).toLocaleDateString("ar-LY")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sale.customer?.name || "عميل نقدي"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${sale.saleType === "CASH"
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                              }`}>
                              {sale.saleType === "CASH" ? "نقدي" : "آجل"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {sale.total.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${sale.isFullyPaid
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                              }`}>
                              {sale.isFullyPaid ? "مدفوع" : "غير مدفوع"}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              {/* Pagination للمبيعات */}
              <Pagination
                totalItems={salesReport.data.sales.length}
                filteredItems={salesReport.data.sales.filter((sale: any) => {
                  if (filters.invoiceNumber && !textSearch(sale.invoiceNumber, filters.invoiceNumber)) return false;
                  if (filters.customerName && !textSearch(sale.customer?.name, filters.customerName)) return false;
                  if (filters.minAmount && sale.total < parseFloat(filters.minAmount)) return false;
                  if (filters.maxAmount && sale.total > parseFloat(filters.maxAmount)) return false;
                  return true;
                })}
              />
            </div>
          </div>
        )}

        {/* Stock Report */}
        {activeReport === "stock" && stockReport && !stockLoading && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">إجمالي الكمية</p>
                <p className="text-2xl font-bold text-green-600">
                  {stockReport.data.stats.totalUnits.toLocaleString("ar-LY")} وحدة / متر
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">قيمة المخزون</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stockReport.data.stats.totalValue.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">أصناف منخفضة المخزون</p>
                <p className="text-2xl font-bold text-red-600">
                  {stockReport.data.stats.lowStockItems.toLocaleString("ar-LY")}
                </p>
              </div>
            </div>

            {/* Stock Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">كود الصنف</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصنف</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصناديق</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي الكمية</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">القيمة</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const filteredStocks = stockReport.data.stocks.filter((stock: any) => {
                        // البحث بالكود (SKU)
                        if (filters.productCode && !textSearch(stock.product.sku, filters.productCode)) return false;
                        // البحث بالاسم
                        if (filters.productName && !textSearch(stock.product.name, filters.productName)) return false;
                        return true;
                      });
                      return paginateData(filteredStocks).map((stock: any) => {
                        const isDimensional = stock.product.unitsPerBox && Number(stock.product.unitsPerBox) !== 1;
                        const unitLabel = isDimensional ? "متر" : "قطعة";

                        return (
                          <tr key={stock.id} className="hover:bg-gray-50 print:hover:bg-white">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-mono rounded">
                                {stock.product.sku || "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {stock.product.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {stock.boxes.toLocaleString("ar-LY")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {stock.totalUnits.toLocaleString("ar-LY")} {unitLabel}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {stock.product.costPrice
                                ? `${stock.product.costPrice.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل`
                                : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {stock.product.costPrice
                                ? `${(stock.totalUnits * stock.product.costPrice).toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل`
                                : "-"}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              {/* Pagination للمخزون */}
              <Pagination
                totalItems={stockReport.data.stocks.length}
                filteredItems={stockReport.data.stocks.filter((stock: any) => {
                  // البحث بالكود (SKU)
                  if (filters.productCode && !textSearch(stock.product.sku, filters.productCode)) return false;
                  // البحث بالاسم
                  if (filters.productName && !textSearch(stock.product.name, filters.productName)) return false;
                  return true;
                })}
              />
            </div>
          </div>
        )}



        {/* Customers Report */}
        {activeReport === "customers" && customerReport && !customerLoading && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">إجمالي العملاء</p>
                <p className="text-2xl font-bold text-orange-600">
                  {customerReport.data.stats.totalCustomers.toLocaleString("ar-LY")}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">العملاء النشطون</p>
                <p className="text-2xl font-bold text-green-600">
                  {customerReport.data.stats.activeCustomers.toLocaleString("ar-LY")}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-blue-600">
                  {customerReport.data.stats.totalRevenue.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العميل</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهاتف</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي المشتريات</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد المبيعات</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">متوسط الشراء</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const filteredCustomers = customerReport.data.customers.filter((customer: any) => {
                        if (filters.customerName && !textSearch(customer.name, filters.customerName)) return false;
                        if (filters.customerPhone && !textSearch(customer.phone, filters.customerPhone)) return false;
                        return true;
                      });
                      return paginateData(filteredCustomers).map((customer: any) => (
                        <tr key={customer.id} className="hover:bg-gray-50 print:hover:bg-white">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {customer.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {customer.phone || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {customer.totalPurchases.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {customer.totalSales.toLocaleString("ar-LY")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {customer.averagePurchase.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              {/* Pagination للعملاء */}
              <Pagination
                totalItems={customerReport.data.customers.length}
                filteredItems={customerReport.data.customers.filter((customer: any) => {
                  if (filters.customerName && !textSearch(customer.name, filters.customerName)) return false;
                  if (filters.customerPhone && !textSearch(customer.phone, filters.customerPhone)) return false;
                  return true;
                })}
              />
            </div>
          </div>
        )}

        {/* Suppliers Report */}
        {activeReport === "suppliers" && supplierReport && !supplierLoading && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">إجمالي الموردين</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {supplierReport.data.stats.totalSuppliers.toLocaleString("ar-LY")}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">إجمالي المشتريات</p>
                <p className="text-2xl font-bold text-blue-600">
                  {supplierReport.data.stats.totalPurchases.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">إجمالي المدفوع</p>
                <p className="text-2xl font-bold text-green-600">
                  {supplierReport.data.stats.totalPaid.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">الرصيد المستحق</p>
                <p className="text-2xl font-bold text-red-600">
                  {supplierReport.data.stats.totalBalance.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
            </div>

            {/* Suppliers Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المورد</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهاتف</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي المشتريات</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدفوع</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const filteredSuppliers = supplierReport.data.suppliers.filter((supplier: any) => {
                        if (filters.supplierReportName && !textSearch(supplier.name, filters.supplierReportName)) return false;
                        if (filters.supplierReportPhone && !textSearch(supplier.phone, filters.supplierReportPhone)) return false;
                        return true;
                      });
                      return paginateData(filteredSuppliers).map((supplier: any) => (
                        <tr key={supplier.id} className="hover:bg-gray-50 print:hover:bg-white">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {supplier.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {supplier.phone || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {supplier.totalPurchases.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            {supplier.totalPaid.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                            {supplier.balance.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              {/* Pagination للموردين */}
              <Pagination
                totalItems={supplierReport.data.suppliers.length}
                filteredItems={supplierReport.data.suppliers.filter((supplier: any) => {
                  if (filters.supplierReportName && !textSearch(supplier.name, filters.supplierReportName)) return false;
                  if (filters.supplierReportPhone && !textSearch(supplier.phone, filters.supplierReportPhone)) return false;
                  return true;
                })}
              />
            </div>
          </div>
        )}

        {/* Purchases Report */}
        {activeReport === "purchases" && purchaseReport && !purchaseLoading && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">إجمالي المشتريات</p>
                <p className="text-2xl font-bold text-teal-600">
                  {purchaseReport.data.stats.totalPurchases.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">المشتريات النقدية</p>
                <p className="text-2xl font-bold text-green-600">
                  {purchaseReport.data.stats.totalCash.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">المشتريات الآجلة</p>
                <p className="text-2xl font-bold text-orange-600">
                  {purchaseReport.data.stats.totalCredit.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">عدد الفواتير</p>
                <p className="text-2xl font-bold text-purple-600">
                  {purchaseReport.data.stats.purchaseCount.toLocaleString("ar-LY")}
                </p>
              </div>
            </div>

            {/* Purchases Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الفاتورة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المورد</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المصروفات</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const filteredPurchases = purchaseReport.data.purchases.filter((purchase: any) => {
                        if (filters.invoiceNumber && !textSearch(purchase.invoiceNumber, filters.invoiceNumber)) return false;
                        if (filters.supplierName && !textSearch(purchase.supplier?.name, filters.supplierName)) return false;
                        if (filters.supplierPhone && !textSearch(purchase.supplier?.phone, filters.supplierPhone)) return false;
                        if (filters.minAmount && Number(purchase.total) < Number(filters.minAmount)) return false;
                        if (filters.maxAmount && Number(purchase.total) > Number(filters.maxAmount)) return false;
                        if (filters.invoiceAmount && Number(purchase.total) !== Number(filters.invoiceAmount)) return false;
                        return true;
                      });
                      return paginateData(filteredPurchases).map((purchase: any) => (
                        <tr key={purchase.id} className="hover:bg-gray-50 print:hover:bg-white">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {purchase.invoiceNumber || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(purchase.createdAt).toLocaleDateString("ar-LY")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {purchase.supplier?.name || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Number(purchase.total).toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {(purchase.totalExpenses || 0).toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {Number(purchase.finalTotal).toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              {/* Pagination للمشتريات */}
              <Pagination
                totalItems={purchaseReport.data.purchases.length}
                filteredItems={purchaseReport.data.purchases.filter((purchase: any) => {
                  if (filters.invoiceNumber && !textSearch(purchase.invoiceNumber, filters.invoiceNumber)) return false;
                  if (filters.supplierName && !textSearch(purchase.supplier?.name, filters.supplierName)) return false;
                  if (filters.supplierPhone && !textSearch(purchase.supplier?.phone, filters.supplierPhone)) return false;
                  if (filters.minAmount && Number(purchase.total) < Number(filters.minAmount)) return false;
                  if (filters.maxAmount && Number(purchase.total) > Number(filters.maxAmount)) return false;
                  if (filters.invoiceAmount && Number(purchase.total) !== Number(filters.invoiceAmount)) return false;
                  return true;
                })}
              />
            </div>
          </div>
        )}

        {/* Top Products Report */}
        {activeReport === "top-products" && topProductsReport && !topProductsLoading && (
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">عدد المنتجات</p>
                <p className="text-2xl font-bold text-red-600">
                  {topProductsReport.data.stats.totalProducts.toLocaleString("ar-LY")}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-blue-600">
                  {topProductsReport.data.stats.totalRevenue.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">إجمالي الكمية</p>
                <p className="text-2xl font-bold text-green-600">
                  {topProductsReport.data.stats.totalQty.toLocaleString("ar-LY")}
                </p>
              </div>
            </div>

            {/* Top Products Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الترتيب</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية المباعة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإيرادات</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد المبيعات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const filteredProducts = topProductsReport.data.topProducts.filter((item: any) => {
                        if (filters.productName && !textSearch(item.product.name, filters.productName)) return false;
                        if (filters.productCode && !textSearch(item.product.sku, filters.productCode)) return false;
                        return true;
                      });
                      return paginateData(filteredProducts).map((item: any, index: number) => {
                        const actualIndex = (currentPage - 1) * itemsPerPage + index;
                        return (
                          <tr key={item.product.id} className="hover:bg-gray-50 print:hover:bg-white">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${actualIndex === 0 ? "bg-yellow-100 text-yellow-800" :
                                actualIndex === 1 ? "bg-gray-100 text-gray-800" :
                                  actualIndex === 2 ? "bg-orange-100 text-orange-800" :
                                    "bg-blue-100 text-blue-800"
                                } font-bold`}>
                                {actualIndex + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                                <p className="text-xs text-gray-500">{item.product.sku}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.totalQty.toLocaleString("ar-LY")} {item.product.unit || "وحدة"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.totalRevenue.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {item.salesCount.toLocaleString("ar-LY")}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              {/* Pagination للأكثر مبيعاً */}
              <Pagination
                totalItems={topProductsReport.data.topProducts.length}
                filteredItems={topProductsReport.data.topProducts.filter((item: any) => {
                  if (filters.productName && !textSearch(item.product.name, filters.productName)) return false;
                  if (filters.productCode && !textSearch(item.product.sku, filters.productCode)) return false;
                  return true;
                })}
              />
            </div>
          </div>
        )}

        {/* Company Stock Report */}
        {activeReport === "company-stock" && (
          <div className="space-y-6">
            {!filters.supplierId ? (
              <div className="bg-orange-50 border-r-4 border-orange-500 p-8 rounded-lg text-center">
                <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-orange-800">يرجى اختيار مورد</h3>
                <p className="text-orange-600 mt-2">يرجى اختيار مورد من قائمة الفلاتر بالأعلى لعرض تقرير بضاعة الشركات</p>
              </div>
            ) : supplierStockLoading ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100 italic text-gray-400">
                جاري التحميل...
              </div>
            ) : supplierStockReport && (
              <>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{supplierStockReport.data.supplier.name}</h2>
                      <p className="text-sm text-gray-500">{supplierStockReport.data.supplier.phone || "بدون هاتف"}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-gray-500">تاريخ التقرير</p>
                      <p className="font-medium">{new Date().toLocaleDateString("ar-LY")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* LYD Balance */}
                    <div className="bg-emerald-50 rounded-lg p-5 border border-emerald-100">
                      <p className="text-sm text-emerald-600 font-medium mb-1">الرصيد بالدينار (LYD)</p>
                      <p className={`text-2xl font-bold ${(supplierStockReport.data.supplier.balances?.LYD || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {Math.abs(supplierStockReport.data.supplier.balances?.LYD || 0).toLocaleString("ar-LY", { minimumFractionDigits: 2 })}
                        <span className="text-sm mr-1 font-normal opacity-75">
                          {(supplierStockReport.data.supplier.balances?.LYD || 0) > 0 ? ' (مستحق عليك)' : (supplierStockReport.data.supplier.balances?.LYD || 0) < 0 ? ' (مدين لك)' : ''}
                        </span>
                      </p>
                    </div>

                    {/* USD Balance */}
                    <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
                      <p className="text-sm text-blue-600 font-medium mb-1">الرصيد بالدولار (USD)</p>
                      <p className={`text-2xl font-bold ${(supplierStockReport.data.supplier.balances?.USD || 0) > 0 ? 'text-red-600' : 'text-blue-700'}`}>
                        {Math.abs(supplierStockReport.data.supplier.balances?.USD || 0).toLocaleString("ar-LY", { minimumFractionDigits: 2 })}
                        <span className="text-sm mr-1 font-normal opacity-75">$</span>
                        <span className="text-sm opacity-75">
                          {(supplierStockReport.data.supplier.balances?.USD || 0) > 0 ? ' (مستحق عليك)' : (supplierStockReport.data.supplier.balances?.USD || 0) < 0 ? ' (مدين لك)' : ''}
                        </span>
                      </p>
                    </div>

                    {/* EUR Balance */}
                    <div className="bg-indigo-50 rounded-lg p-5 border border-indigo-100">
                      <p className="text-sm text-indigo-600 font-medium mb-1">الرصيد باليورو (EUR)</p>
                      <p className={`text-2xl font-bold ${(supplierStockReport.data.supplier.balances?.EUR || 0) > 0 ? 'text-red-600' : 'text-indigo-700'}`}>
                        {Math.abs(supplierStockReport.data.supplier.balances?.EUR || 0).toLocaleString("ar-LY", { minimumFractionDigits: 2 })}
                        <span className="text-sm mr-1 font-normal opacity-75">€</span>
                        <span className="text-sm opacity-75">
                          {(supplierStockReport.data.supplier.balances?.EUR || 0) > 0 ? ' (مستحق عليك)' : (supplierStockReport.data.supplier.balances?.EUR || 0) < 0 ? ' (مدين لك)' : ''}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 font-bold border-b-2 border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">الصنف</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">الوحدة</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">إجمالي المشتراة</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">الكمية المباعة</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">المخزون الحالي</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">التكلفة</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">الأداء</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(supplierStockReport.data.items || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                              لا يوجد مخزون مسجل لهذا المورد
                            </td>
                          </tr>
                        ) : (
                          supplierStockReport.data.items.map((item: any) => {
                            const unitsPerBox = item.product.unitsPerBox || 1;
                            const totalQty = item.currentStock * unitsPerBox;
                            const isMetric = unitsPerBox !== 1 && item.product.unit === 'صندوق';

                            return (
                              <tr key={item.product.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <div className="text-sm font-bold text-gray-900">{item.product.name}</div>
                                  <div className="text-xs text-gray-500 font-mono mt-0.5">{item.product.sku}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                    {item.product.unit || 'صندوق'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="text-sm font-bold text-gray-600">
                                    {item.totalPurchased.toLocaleString("ar-LY")} <span className="text-[10px]">ص</span>
                                  </div>
                                  <div className="text-[10px] text-gray-400">
                                    {(item.totalPurchased * unitsPerBox).toLocaleString("ar-LY", { minimumFractionDigits: 1 })} {isMetric ? 'م²' : 'قطعة'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="text-sm font-bold text-green-700">
                                    {item.soldQty.toLocaleString("ar-LY")} <span className="text-[10px]">ص</span>
                                  </div>
                                  <div className="text-[10px] text-green-600/70">
                                    {(item.soldQty * unitsPerBox).toLocaleString("ar-LY", { minimumFractionDigits: 1 })} {isMetric ? 'م²' : 'قطعة'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="text-sm font-extrabold text-blue-800">
                                    {item.currentStock.toLocaleString("ar-LY")} <span className="text-[10px]">ص</span>
                                  </div>
                                  <div className="text-[10px] text-blue-600/70">
                                    {totalQty.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} {isMetric ? 'م²' : 'قطعة'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-sm font-bold text-gray-700">
                                  {item.product.cost ? Number(item.product.cost).toLocaleString("ar-LY", { minimumFractionDigits: 2 }) + ' د.ل' : '-'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${item.performance > 70 ? 'bg-green-500' : item.performance > 30 ? 'bg-orange-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min(100, item.performance)}%` }}
                                      ></div>
                                    </div>
                                    <span className={`text-xs font-bold ${item.performance > 70 ? 'text-green-700' : item.performance > 30 ? 'text-orange-700' : 'text-red-700'}`}>
                                      {item.performance.toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Product Movement Report */}
        {activeReport === "product-movement" && (
          <div className="space-y-6">
            {!selectedProductId ? (
              <div className="bg-blue-50 border-r-4 border-blue-500 p-8 rounded-lg text-center">
                <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-blue-800">يرجى اختيار صنف</h3>
                <p className="text-blue-600 mt-2">يرجى اختيار صنف من قائمة الفلاتر بالأعلى لعرض تقرير حركة الصنف</p>
              </div>
            ) : movementLoading ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100 italic text-gray-400">
                جاري التحميل...
              </div>
            ) : productMovementReport && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow border-b-4 border-gray-500">
                    <p className="text-sm text-gray-600">رصيد أول المدة</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {productMovementReport.data.openingBalance.toLocaleString("ar-LY")} <span className="text-xs">{productMovementReport.data.product.unit || 'وحدة'}</span>
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border-b-4 border-green-500">
                    <p className="text-sm text-gray-600">إجمالي الوارد</p>
                    <p className="text-2xl font-bold text-green-600">
                      {productMovementReport.data.movements.reduce((sum: number, m: any) => sum + m.qtyIn, 0).toLocaleString("ar-LY")}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border-b-4 border-red-500">
                    <p className="text-sm text-gray-600">إجمالي الصادر</p>
                    <p className="text-2xl font-bold text-red-600">
                      {productMovementReport.data.movements.reduce((sum: number, m: any) => sum + m.qtyOut, 0).toLocaleString("ar-LY")}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border-b-4 border-blue-600">
                    <p className="text-sm text-gray-600">المخزون الحالي</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {productMovementReport.data.currentStock.toLocaleString("ar-LY")}
                    </p>
                  </div>
                </div>

                {/* Movements Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوارد</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصادر</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرصيد التحليلي</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginateData(productMovementReport.data.movements).map((m: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(m.date).toLocaleDateString("ar-LY")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${m.type === 'SALE' ? 'bg-blue-100 text-blue-800' :
                                m.type === 'PURCHASE' ? 'bg-green-100 text-green-800' :
                                  m.type === 'RETURN' ? 'bg-orange-100 text-orange-800' :
                                    m.type === 'DAMAGE' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                }`}>
                                {m.type === 'SALE' && <ArrowRight className="w-3 h-3" />}
                                {m.type === 'PURCHASE' && <ArrowRight className="w-3 h-3 rotate-180" />}
                                {m.type === 'SALE' ? 'بيع' : m.type === 'PURCHASE' ? 'شراء' : m.type === 'RETURN' ? 'مردود' : m.type === 'DAMAGE' ? 'تالف' : 'افتتاحي'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {m.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                              {m.qtyIn > 0 ? `+${m.qtyIn.toLocaleString("ar-LY")}` : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                              {m.qtyOut > 0 ? `-${m.qtyOut.toLocaleString("ar-LY")}` : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {m.balance.toLocaleString("ar-LY")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    totalItems={productMovementReport.data.movements.length}
                    filteredItems={productMovementReport.data.movements}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Financial (Profit) Report */}
        {activeReport === "profit" && financialLoading ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100 italic text-gray-400">
            جاري التحميل...
          </div>
        ) : activeReport === "profit" && financialReport && (
          <div className="space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-16 h-16 text-white" />
                </div>
                <p className="text-blue-100 text-sm font-medium mb-1">إجمالي المبيعات</p>
                <p className="text-3xl font-bold text-white">
                  {financialReport.data.stats.totalSales.toLocaleString("ar-LY")} <span className="text-sm font-normal">د.ل</span>
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-b-4 border-amber-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <ArrowRight className="w-5 h-5 text-amber-600 rotate-180" />
                  </div>
                  <p className="text-slate-600 font-medium">تكلفة البضاعة المباعة</p>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {financialReport.data.stats.totalCogs.toLocaleString("ar-LY")} <span className="text-sm text-slate-400">د.ل</span>
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-b-4 border-orange-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-slate-600 font-medium">تكلفة المردودات</p>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {financialReport.data.stats.totalReturnCost.toLocaleString("ar-LY")} <span className="text-sm text-slate-400">د.ل</span>
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-b-4 border-red-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-slate-600 font-medium">تكلفة التالف</p>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {financialReport.data.stats.totalDamageCost.toLocaleString("ar-LY")} <span className="text-sm text-slate-400">د.ل</span>
                </p>
              </div>
            </div>

            {/* Net Profit Card */}
            <div className={`p-8 rounded-3xl shadow-xl border-2 ${financialReport.data.stats.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-2 text-center md:text-right">
                  <h3 className={`text-xl font-bold ${financialReport.data.stats.netProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>صافي الربح الحقيقي</h3>
                  <p className="text-slate-500 text-sm">بناءً على التكلفة الفعلية للمخزون ناقص الهالك والمردودات</p>
                </div>
                <div className="text-center md:text-left">
                  <p className={`text-5xl font-black ${financialReport.data.stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {financialReport.data.stats.netProfit.toLocaleString("ar-LY")} <span className="text-2xl font-bold">د.ل</span>
                  </p>
                  <div className="mt-2 flex items-center gap-2 justify-center md:justify-end">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${financialReport.data.stats.netProfit >= 0 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                      هامش الربح: {financialReport.data.stats.profitMargin.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Accounting Equation Disclaimer */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Layout className="w-5 h-5 text-slate-600" />
                ملاحظة محاسبية دقيقة
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                يتم احتساب صافي الربح بناءً على المعادلة: (إجمالي المبيعات) - (تكلفة البضاعة المباعة) - (تكلفة المرتجعات) - (تكلفة التالف).
                يتم تقييم المردودات والتالف بسعر التكلفة المخزن في النظام لضمان دقة النتائج المالية.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

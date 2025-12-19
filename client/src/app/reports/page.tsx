"use client";

import { useState, useRef } from "react";
import {
  useGetSalesReportQuery,
  useGetStockReportQuery,
  useGetCustomerReportQuery,
  useGetTopProductsReportQuery,
  useGetSupplierReportQuery,
  useGetPurchaseReportQuery
} from "@/state/reportsApi";
import { useGetCompaniesQuery } from "@/state/companyApi";
import { BarChart3, ShoppingCart, Users, FileText, Search, X, Building2 } from "lucide-react";
import { useReactToPrint } from "react-to-print";

type ReportType = "sales" | "stock" | "customers" | "top-products" | "suppliers" | "purchases";

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("sales");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  // فلتر الشركة
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);

  // جلب قائمة الشركات
  const { data: companiesData } = useGetCompaniesQuery({ limit: 100 });
  const companies = companiesData?.data?.companies || [];

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
  });

  // دالة مساعدة للبحث النصي المحسن (تدعم العربية والإنجليزية)
  const textSearch = (text: string | null | undefined, query: string): boolean => {
    if (!text || !query) return true;
    const normalizedText = text.toString().toLowerCase().trim();
    const normalizedQuery = query.toLowerCase().trim();
    // البحث الجزئي - يبحث عن أي جزء من النص
    return normalizedText.includes(normalizedQuery);
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
      tableHeaders = ['الترتيب', 'كود الصنف', 'المنتج', 'الكمية المباعة', 'الإيرادات', 'عدد المبيعات'];
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

  const reports = [
    { id: "sales" as ReportType, name: "تقرير المبيعات", icon: BarChart3, color: "blue" },
    { id: "purchases" as ReportType, name: "تقرير المشتريات", icon: ShoppingCart, color: "teal" },
    { id: "stock" as ReportType, name: "تقرير المخزون", icon: ShoppingCart, color: "green" },
    { id: "customers" as ReportType, name: "تقرير العملاء", icon: Users, color: "orange" },
    { id: "suppliers" as ReportType, name: "تقرير الموردين", icon: Users, color: "indigo" },
    { id: "top-products" as ReportType, name: "الأكثر مبيعاً", icon: FileText, color: "red" },
  ];

  const isLoading = salesLoading || stockLoading || customerLoading || topProductsLoading || supplierLoading || purchaseLoading;

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
      {(activeReport === "sales" || activeReport === "stock" || activeReport === "customers" || activeReport === "top-products" || activeReport === "suppliers" || activeReport === "purchases") && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              الفلاتر والبحث
            </h3>
            <button
              onClick={() => {
                setFilters({ customerName: "", invoiceNumber: "", productName: "", productCode: "", minAmount: "", maxAmount: "", supplierName: "", supplierPhone: "", invoiceAmount: "", customerPhone: "", supplierReportName: "", supplierReportPhone: "" });
                setSelectedCompanyId(undefined);
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
                    value={filters.productCode}
                    onChange={(e) => setFilters({ ...filters, productCode: e.target.value })}
                    placeholder="ابحث بكود الصنف"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">اسم الصنف</label>
                  <input
                    type="text"
                    value={filters.productName}
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
      </div>
    </div>
  );
}

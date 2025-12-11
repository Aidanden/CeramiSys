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
import { BarChart3, ShoppingCart, Users, FileText, Search, X } from "lucide-react";
import { useReactToPrint } from "react-to-print";

type ReportType = "sales" | "stock" | "customers" | "top-products" | "suppliers" | "purchases";

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("sales");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  
  // Filters
  const [filters, setFilters] = useState({
    customerName: "",
    invoiceNumber: "",
    productName: "",
    minAmount: "",
    maxAmount: "",
    supplierName: "",
    supplierPhone: "",
    invoiceAmount: "",
    customerPhone: "",
    supplierReportName: "",
    supplierReportPhone: "",
  });
  
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const reportName = reports.find(r => r.id === activeReport)?.name || 'تقرير';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${reportName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Cairo', 'Tahoma', sans-serif; 
            padding: 20px;
            direction: rtl;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: right;
          }
          th { 
            background-color: #f3f4f6; 
            font-weight: bold;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin: 20px 0;
          }
          .stat-card {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 8px;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
          }
          .stat-value {
            font-size: 20px;
            font-weight: bold;
            margin-top: 5px;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportName}</h1>
          <p>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-LY")}</p>
          ${(dateRange.startDate || dateRange.endDate) ? `
            <p>الفترة: ${dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString("ar-LY") : "البداية"} - ${dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString("ar-LY") : "النهاية"}</p>
          ` : ''}
        </div>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // استدعاء التقارير
  const { data: salesReport, isLoading: salesLoading } = useGetSalesReportQuery(
    { ...dateRange },
    { skip: activeReport !== "sales" }
  );

  const { data: stockReport, isLoading: stockLoading } = useGetStockReportQuery(
    {},
    { skip: activeReport !== "stock" }
  );

  const { data: customerReport, isLoading: customerLoading } = useGetCustomerReportQuery(
    { ...dateRange },
    { skip: activeReport !== "customers" }
  );

  const { data: topProductsReport, isLoading: topProductsLoading } = useGetTopProductsReportQuery(
    { ...dateRange, limit: 10 },
    { skip: activeReport !== "top-products" }
  );

  const { data: supplierReport, isLoading: supplierLoading } = useGetSupplierReportQuery(
    { ...dateRange },
    { skip: activeReport !== "suppliers" }
  );

  const { data: purchaseReport, isLoading: purchaseLoading } = useGetPurchaseReportQuery(
    { ...dateRange },
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
              onClick={() => setActiveReport(report.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                isActive
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
              onClick={() => setFilters({ customerName: "", invoiceNumber: "", productName: "", minAmount: "", maxAmount: "", supplierName: "", supplierPhone: "", invoiceAmount: "", customerPhone: "", supplierReportName: "", supplierReportPhone: "" })}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              مسح الفلاتر
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">اسم الصنف</label>
                <input
                  type="text"
                  value={filters.productName}
                  onChange={(e) => setFilters({ ...filters, productName: e.target.value })}
                  placeholder="ابحث باسم الصنف"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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
                  {salesReport.data.sales
                    .filter((sale: any) => {
                      // Filter by invoice number
                      if (filters.invoiceNumber && !sale.invoiceNumber?.toLowerCase().includes(filters.invoiceNumber.toLowerCase())) {
                        return false;
                      }
                      // Filter by customer name
                      if (filters.customerName && !sale.customer?.name?.toLowerCase().includes(filters.customerName.toLowerCase())) {
                        return false;
                      }
                      // Filter by min amount
                      if (filters.minAmount && sale.total < parseFloat(filters.minAmount)) {
                        return false;
                      }
                      // Filter by max amount
                      if (filters.maxAmount && sale.total > parseFloat(filters.maxAmount)) {
                        return false;
                      }
                      return true;
                    })
                    .map((sale: any) => (
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
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          sale.saleType === "CASH" 
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
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          sale.isFullyPaid 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {sale.isFullyPaid ? "مدفوع" : "غير مدفوع"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock Report */}
      {activeReport === "stock" && stockReport && !stockLoading && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">إجمالي الصناديق</p>
              <p className="text-2xl font-bold text-green-600">
                {stockReport.data.stats.totalBoxes.toLocaleString("ar-LY")}
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصنف</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصناديق</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي الوحدات</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">القيمة</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockReport.data.stocks
                    .filter((stock: any) => {
                      // Filter by product name
                      if (filters.productName && !stock.product.name?.toLowerCase().includes(filters.productName.toLowerCase())) {
                        return false;
                      }
                      return true;
                    })
                    .map((stock: any) => (
                    <tr key={stock.id} className="hover:bg-gray-50 print:hover:bg-white">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{stock.product.name}</p>
                          <p className="text-xs text-gray-500">{stock.product.sku}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stock.boxes.toLocaleString("ar-LY")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {stock.totalUnits.toLocaleString("ar-LY")} {stock.product.unit || "وحدة"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stock.product.sellPrice 
                          ? `${stock.product.sellPrice.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stock.product.sellPrice 
                          ? `${(stock.boxes * stock.product.sellPrice).toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  {customerReport.data.customers
                    .filter((customer: any) => {
                      // Filter by customer name
                      if (filters.customerName && !customer.name?.toLowerCase().includes(filters.customerName.toLowerCase())) {
                        return false;
                      }
                      // Filter by customer phone
                      if (filters.customerPhone && !customer.phone?.toLowerCase().includes(filters.customerPhone.toLowerCase())) {
                        return false;
                      }
                      return true;
                    })
                    .map((customer: any) => (
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
                  ))}
                </tbody>
              </table>
            </div>
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
                  {supplierReport.data.suppliers
                    .filter((supplier: any) => {
                      if (filters.supplierReportName && !supplier.name?.toLowerCase().includes(filters.supplierReportName.toLowerCase())) {
                        return false;
                      }
                      if (filters.supplierReportPhone && !supplier.phone?.toLowerCase().includes(filters.supplierReportPhone.toLowerCase())) {
                        return false;
                      }
                      return true;
                    })
                    .map((supplier: any) => (
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
                  ))}
                </tbody>
              </table>
            </div>
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
                  {purchaseReport.data.purchases
                    .filter((purchase: any) => {
                      if (filters.invoiceNumber && !purchase.invoiceNumber?.toLowerCase().includes(filters.invoiceNumber.toLowerCase())) {
                        return false;
                      }
                      if (filters.supplierName && !purchase.supplier?.name?.toLowerCase().includes(filters.supplierName.toLowerCase())) {
                        return false;
                      }
                      if (filters.supplierPhone && !purchase.supplier?.phone?.toLowerCase().includes(filters.supplierPhone.toLowerCase())) {
                        return false;
                      }
                      if (filters.minAmount && Number(purchase.total) < Number(filters.minAmount)) {
                        return false;
                      }
                      if (filters.maxAmount && Number(purchase.total) > Number(filters.maxAmount)) {
                        return false;
                      }
                      if (filters.invoiceAmount && Number(purchase.total) !== Number(filters.invoiceAmount)) {
                        return false;
                      }
                      return true;
                    })
                    .map((purchase: any) => (
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
                        {purchase.total.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {(purchase.totalExpenses || 0).toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {purchase.finalTotal.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  {topProductsReport.data.topProducts
                    .filter((item: any) => {
                      // Filter by product name
                      if (filters.productName && !item.product.name?.toLowerCase().includes(filters.productName.toLowerCase())) {
                        return false;
                      }
                      return true;
                    })
                    .map((item: any, index: number) => (
                    <tr key={item.product.id} className="hover:bg-gray-50 print:hover:bg-white">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                          index === 0 ? "bg-yellow-100 text-yellow-800" :
                          index === 1 ? "bg-gray-100 text-gray-800" :
                          index === 2 ? "bg-orange-100 text-orange-800" :
                          "bg-blue-100 text-blue-800"
                        } font-bold`}>
                          {index + 1}
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

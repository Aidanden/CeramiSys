"use client";

import { useState, useRef } from "react";
import { 
  useGetSalesReportQuery, 
  useGetStockReportQuery, 
  useGetProfitReportQuery,
  useGetCustomerReportQuery,
  useGetTopProductsReportQuery 
} from "@/state/reportsApi";
import { BarChart3, ShoppingCart, TrendingUp, Users, FileText, Search, X } from "lucide-react";
import { useReactToPrint } from "react-to-print";

type ReportType = "sales" | "stock" | "profit" | "customers" | "top-products";

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
  });
  
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `تقرير_${activeReport}_${new Date().toLocaleDateString("ar-LY")}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  // استدعاء التقارير
  const { data: salesReport, isLoading: salesLoading } = useGetSalesReportQuery(
    { ...dateRange },
    { skip: activeReport !== "sales" }
  );

  const { data: stockReport, isLoading: stockLoading } = useGetStockReportQuery(
    {},
    { skip: activeReport !== "stock" }
  );

  const { data: profitReport, isLoading: profitLoading } = useGetProfitReportQuery(
    { ...dateRange, groupBy: "month" },
    { skip: activeReport !== "profit" }
  );

  const { data: customerReport, isLoading: customerLoading } = useGetCustomerReportQuery(
    { ...dateRange },
    { skip: activeReport !== "customers" }
  );

  const { data: topProductsReport, isLoading: topProductsLoading } = useGetTopProductsReportQuery(
    { ...dateRange, limit: 10 },
    { skip: activeReport !== "top-products" }
  );

  const reports = [
    { id: "sales" as ReportType, name: "تقرير المبيعات", icon: BarChart3, color: "blue" },
    { id: "stock" as ReportType, name: "تقرير المخزون", icon: ShoppingCart, color: "green" },
    { id: "profit" as ReportType, name: "تقرير الأرباح", icon: TrendingUp, color: "purple" },
    { id: "customers" as ReportType, name: "تقرير العملاء", icon: Users, color: "orange" },
    { id: "top-products" as ReportType, name: "الأكثر مبيعاً", icon: FileText, color: "red" },
  ];

  const isLoading = salesLoading || stockLoading || profitLoading || customerLoading || topProductsLoading;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
        <p className="text-gray-600 mt-1">عرض وتحليل تقارير النظام</p>
      </div>

      {/* Report Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
      {(activeReport === "sales" || activeReport === "stock" || activeReport === "profit" || activeReport === "customers" || activeReport === "top-products") && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              الفلاتر والبحث
            </h3>
            <button
              onClick={() => setFilters({ customerName: "", invoiceNumber: "", productName: "", minAmount: "", maxAmount: "" })}
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
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">اسم العميل</label>
                <input
                  type="text"
                  value={filters.customerName}
                  onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                  placeholder="ابحث باسم العميل"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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

      {/* Profit Report */}
      {activeReport === "profit" && profitReport && !profitLoading && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-purple-600">
                {profitReport.data.stats.totalRevenue.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">عدد المبيعات</p>
              <p className="text-2xl font-bold text-blue-600">
                {profitReport.data.stats.totalSales.toLocaleString("ar-LY")}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">متوسط الإيرادات</p>
              <p className="text-2xl font-bold text-green-600">
                {profitReport.data.stats.averageRevenue.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
              </p>
            </div>
          </div>

          {/* Chart Data Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفترة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإيرادات</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد المبيعات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {profitReport.data.chartData.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.revenue.toLocaleString("ar-LY", { minimumFractionDigits: 2 })} د.ل
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

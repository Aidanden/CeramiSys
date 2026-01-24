"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useGetProductGroupsQuery,
  useCreateProductGroupMutation,
  useUpdateProductGroupMutation,
  useDeleteProductGroupMutation,
  useGetProductGroupQuery,
  ProductGroup,
} from "@/state/productGroupsApi";
import { useGetSuppliersQuery } from "@/state/purchaseApi";
import { useGetProductsQuery, useUpdateProductMutation, useBulkUpdateProductGroupMutation } from "@/state/productsApi";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  DollarSign,
  Building2,
  X,
  Save,
  Eye,
  TrendingUp,
  ArrowLeft,
  Link,
} from "lucide-react";

const ProductGroupsPage = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isManageProductsModalOpen, setIsManageProductsModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [productSearchSKU, setProductSearchSKU] = useState("");
  const [productSearchName, setProductSearchName] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [loadedProducts, setLoadedProducts] = useState<any[]>([]);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  // Batch Assignment State
  // Record<productId, boolean> -> true = Checked (In Group), false = Unchecked (Not In Group)
  // undefined = Use Server State
  const [pendingAssignments, setPendingAssignments] = useState<Record<number, boolean>>({});

  const [formData, setFormData] = useState<Partial<ProductGroup>>({
    name: "",
    supplierId: undefined,
    currency: "USD",
    maxDiscountPercentage: undefined,
  });
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);

  // RTK Query hooks
  const { data: groups = [], isLoading, refetch } = useGetProductGroupsQuery();
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useGetSuppliersQuery({
    limit: 1000
  });
  const suppliers = suppliersData?.data?.suppliers || [];

  // Log للتأكد من عدد الموردين
  React.useEffect(() => {
    if (suppliers.length > 0) {
      console.log(`✅ تم تحميل ${suppliers.length} مورد من أصل ${suppliersData?.data?.pagination?.total || 0} مورد في قاعدة البيانات`);
    }
  }, [suppliers, suppliersData]);

  const [createGroup, { isLoading: isCreating }] = useCreateProductGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdateProductGroupMutation();
  const [deleteGroup, { isLoading: isDeleting }] = useDeleteProductGroupMutation();

  const { data: selectedGroup } = useGetProductGroupQuery(selectedGroupId!, {
    skip: !selectedGroupId || (!isViewModalOpen && !isManageProductsModalOpen),
  });

  // Products API
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    refetch: refetchProducts,
    isFetching: isFetchingProducts
  } = useGetProductsQuery({
    limit: 50,
    page: productPage,
    search: productSearchName || undefined,
    sku: productSearchSKU || undefined,
  }, {
    refetchOnMountOrArgChange: true,
    skip: !isManageProductsModalOpen,
  });

  // Accumulate products when new data arrives
  React.useEffect(() => {
    if (productsData?.data?.products) {
      if (productPage === 1) {
        setLoadedProducts(productsData.data.products);
      } else {
        setLoadedProducts(prev => {
          // Prevent duplicates
          const newProducts = productsData.data.products.filter(
            (np: any) => !prev.some(p => p.id === np.id)
          );
          return [...prev, ...newProducts];
        });
      }

      const { total, page, limit } = productsData.data.pagination;
      setHasMoreProducts(page * limit <total);
    }
  }, [productsData, productPage]);

  const products = productsData?.data?.products || [];
  const [bulkUpdateProductGroup, { isLoading: isBulkUpdating }] = useBulkUpdateProductGroupMutation();

  console.log('Products loaded:', products.length);

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const search = searchTerm.toLowerCase();
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(search) ||
        group.supplier?.name.toLowerCase().includes(search) ||
        group.currency?.toLowerCase().includes(search)
    );
  }, [groups, searchTerm]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        supplierIds: selectedSupplierIds.length > 0 ? selectedSupplierIds : undefined,
      };

      if (selectedGroupId) {
        await updateGroup({
          id: selectedGroupId,
          data: dataToSubmit,
        }).unwrap();
      } else {
        await createGroup(dataToSubmit).unwrap();
      }
      handleCloseModal();
      refetch();
    } catch (error: any) {
      alert(error?.data?.message || "حدث خطأ أثناء حفظ البيانات");
    }
  };

  // Handle delete
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف مجموعة "${name}"؟`)) return;
    try {
      await deleteGroup(id).unwrap();
      refetch();
    } catch (error: any) {
      alert(error?.data?.message || "حدث خطأ أثناء الحذف");
    }
  };

  // Modal Handlers
  const handleOpenModal = (group?: ProductGroup) => {
    if (group) {
      setSelectedGroupId(group.id);
      setFormData({
        name: group.name,
        supplierId: group.supplierId || undefined,
        currency: group.currency || "USD",
        maxDiscountPercentage: group.maxDiscountPercentage ? Number(group.maxDiscountPercentage) : undefined,
      });
      setSelectedSupplierIds(group.suppliers?.map(s => s.id) || []);
    } else {
      setSelectedGroupId(null);
      setFormData({ name: "", supplierId: undefined, currency: "USD", maxDiscountPercentage: undefined });
      setSelectedSupplierIds([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGroupId(null);
    setFormData({ name: "", supplierId: undefined, currency: "USD", maxDiscountPercentage: undefined });
    setSelectedSupplierIds([]);
  };

  const handleViewGroup = (groupId: number) => {
    setSelectedGroupId(groupId);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedGroupId(null);
  };

  const handleManageProducts = (groupId: number) => {
    setSelectedGroupId(groupId);
    setIsManageProductsModalOpen(true);
  };

  const handleCloseManageProductsModal = () => {
    setIsManageProductsModalOpen(false);
    setSelectedGroupId(null);
    setProductSearchSKU("");
    setProductSearchName("");
    setProductPage(1);
    setLoadedProducts([]);
    setPendingAssignments({});
  };

  // Batch Assignment Logic
  const handleToggleProduct = (productId: number, currentGroupId: number | null) => {
    const isInGroupServer = currentGroupId === selectedGroupId;
    const isPending = pendingAssignments[productId];
    const currentChecked = isPending !== undefined ? isPending : isInGroupServer;

    setPendingAssignments(prev => ({
      ...prev,
      [productId]: !currentChecked
    }));
  };

  const handleSaveManageProducts = async () => {
    try {
      const productIds = Object.keys(pendingAssignments).map(Number);
      if (productIds.length === 0) {
        handleCloseManageProductsModal();
        return;
      }

      const toAdd = productIds.filter(id => pendingAssignments[id] === true);
      const toRemove = productIds.filter(id => pendingAssignments[id] === false);

      if (toAdd.length > 0) {
        await bulkUpdateProductGroup({ productIds: toAdd, groupId: selectedGroupId }).unwrap();
      }

      if (toRemove.length > 0) {
        await bulkUpdateProductGroup({ productIds: toRemove, groupId: null }).unwrap();
      }

      setPendingAssignments({});
      handleCloseManageProductsModal();
      refetchProducts();
      refetch();
    } catch (error: any) {
      console.error("Error saving product assignments:", error);
      alert(error?.data?.message || "حدث خطأ أثناء حفظ التغييرات");
    }
  };

  const handleSelectAll = () => {
    const allChecked = filteredProducts.length > 0 && filteredProducts.every(p => {
      const isPending = pendingAssignments[p.id];
      return isPending !== undefined ? isPending : p.groupId === selectedGroupId;
    });

    const newPending = { ...pendingAssignments };
    filteredProducts.forEach(p => {
      // If we are selecting all, set true. If unselecting, set false.
      newPending[p.id] = !allChecked;
    });
    setPendingAssignments(newPending);
  };

  // No client-side filtering needed anymore
  const filteredProducts = loadedProducts;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-surface-primary border-b border-gray-200 dark:border-border-primary px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/products")}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-text-secondary hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="العودة إلى الأصناف والمخزن"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">العودة إلى الأصناف</span>
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-border-primary"></div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">
              إدارة مجموعات الأصناف
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-surface-secondary">
        {/* Search and Actions Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-text-tertiary w-5 h-5" />
            <input
              type="text"
              placeholder="البحث عن مجموعة أو مورد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
            />
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة مجموعة جديدة</span>
          </button>
        </div>

        {/* Groups Table */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-surface-primary rounded-lg shadow">
            <Package className="w-16 h-16 mx-auto text-gray-400 dark:text-text-tertiary mb-4" />
            <p className="text-gray-500 dark:text-text-tertiary text-lg">
              {searchTerm ? "لا توجد نتائج للبحث" : "لا توجد مجموعات أصناف"}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-surface-primary rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-surface-secondary">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      اسم المجموعة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      المورد
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      العملة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      عدد الأصناف
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      الخصم الأقصى
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-border-primary">
                  {filteredGroups.map((group) => (
                    <tr
                      key={group.id}
                      className="hover:bg-gray-50 dark:hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-text-primary">
                            {group.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <Building2 className="w-4 h-4 text-gray-400 dark:text-text-tertiary mt-0.5" />
                          <div className="flex flex-col gap-1">
                            {group.suppliers && group.suppliers.length > 0 ? (
                              group.suppliers.map((supplier, index) => (
                                <span
                                  key={supplier.id}
                                  className="text-sm text-gray-700 dark:text-text-secondary"
                                >
                                  {supplier.name}
                                  {index <group.suppliers!.length - 1 && ","}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-text-tertiary">
                                غير محدد
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-gray-700 dark:text-text-secondary">
                            {group.currency || "USD"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {group.productsCount || 0} صنف
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700 dark:text-text-secondary">
                          {group.maxDiscountPercentage
                            ? `${group.maxDiscountPercentage}%`
                            : "غير محدد"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleManageProducts(group.id)}
                            className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="إدارة الأصناف"
                          >
                            <Link className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleViewGroup(group.id)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(group)}
                            className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(group.id, group.name)}
                            disabled={isDeleting}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-surface-primary border-b border-gray-200 dark:border-border-primary px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-text-primary">
                {selectedGroupId ? "تعديل مجموعة الأصناف" : "إضافة مجموعة جديدة"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-surface-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-2">
                  اسم المجموعة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                  placeholder="مثال: STN"
                />
              </div>

              {/* Multiple Suppliers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-2">
                  الموردين <span className="text-blue-600 dark:text-blue-400">(يمكن اختيار أكثر من مورد)</span>
                </label>
                <div className="border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary max-h-48 overflow-y-auto">
                  {isLoadingSuppliers ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="mr-3 text-gray-600 dark:text-text-tertiary">جاري تحميل الموردين...</span>
                    </div>
                  ) : suppliers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-text-tertiary">
                      لا توجد موردين في النظام
                    </div>
                  ) : (
                    suppliers.map((supplier: any) => (
                      <label
                        key={supplier.id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-surface-hover cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSupplierIds.includes(supplier.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSupplierIds([...selectedSupplierIds, supplier.id]);
                            } else {
                              setSelectedSupplierIds(
                                selectedSupplierIds.filter((id) => id !== supplier.id)
                              );
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-slate-300 dark:border-border-primary rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-text-primary">
                          {supplier.name}
                        </span>
                        {supplier.phone && (
                          <span className="text-xs text-gray-500 dark:text-text-tertiary mr-auto">
                            {supplier.phone}
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-text-tertiary">
                  يمكنك اختيار عدة موردين لنفس المجموعة (مثال: موردين في مدن مختلفة يقدمون نفس البضاعة)
                </p>
                {selectedSupplierIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedSupplierIds.map((id) => {
                      const supplier = suppliers.find((s: any) => s.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                        >
                          {supplier?.name}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSupplierIds(
                                selectedSupplierIds.filter((sid) => sid !== id)
                              )
                            }
                            className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-2">
                  العملة
                </label>
                <select
                  value={formData.currency || "USD"}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                >
                  <option value="LYD">دينار ليبي (LYD)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="EUR">يورو (EUR)</option>
                </select>
              </div>

              {/* Max Discount Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-2">
                  نسبة الخصم الأقصى (اختياري)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.maxDiscountPercentage || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxDiscountPercentage: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                    placeholder="0.00"
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-text-tertiary">
                    %
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-text-tertiary">
                  الحد الأقصى للخصم المسموح به على منتجات هذه المجموعة
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-border-primary">
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  <span>{isCreating || isUpdating ? "جاري الحفظ..." : "حفظ"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-slate-200 dark:border-border-primary hover:bg-gray-50 dark:hover:bg-surface-hover text-gray-700 dark:text-text-secondary rounded-lg transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-surface-primary border-b border-gray-200 dark:border-border-primary px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-text-primary">
                تفاصيل مجموعة: {selectedGroup.name}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleCloseViewModal();
                    handleManageProducts(selectedGroup.id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Link className="w-4 h-4" />
                  <span>إدارة الأصناف</span>
                </button>
                <button
                  onClick={handleCloseViewModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-surface-hover rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Suppliers Section */}
              {selectedGroup.suppliers && selectedGroup.suppliers.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">
                      الموردين المرتبطين بالمجموعة ({selectedGroup.suppliers.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedGroup.suppliers.map((supplier) => (
                      <div
                        key={supplier.id}
                        className="flex items-start gap-2 p-3 bg-white dark:bg-surface-primary rounded-lg"
                      >
                        <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-text-primary">
                            {supplier.name}
                          </p>
                          {supplier.phone && (
                            <p className="text-xs text-gray-500 dark:text-text-tertiary">
                              {supplier.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-gray-500 dark:text-text-tertiary">
                      العملة
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-text-primary">
                    {selectedGroup.currency || "USD"}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-gray-500 dark:text-text-tertiary">
                      عدد الأصناف
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-text-primary">
                    {selectedGroup.productsCount || 0} صنف
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-medium text-gray-500 dark:text-text-tertiary">
                      الخصم الأقصى
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-text-primary">
                    {selectedGroup.maxDiscountPercentage
                      ? `${selectedGroup.maxDiscountPercentage}%`
                      : "غير محدد"}
                  </p>
                </div>
              </div>

              {/* Products List */}
              {selectedGroup.products && selectedGroup.products.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">
                    الأصناف التابعة للمجموعة
                  </h3>
                  <div className="bg-gray-50 dark:bg-surface-secondary rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-surface-elevated">
                          <tr>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-text-secondary">
                              SKU
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-text-secondary">
                              اسم الصنف
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-text-secondary">
                              الوحدة
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-text-secondary">
                              التكلفة
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-border-primary">
                          {selectedGroup.products.map((product: any) => (
                            <tr key={product.id}>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-text-primary">
                                {product.sku}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-text-primary">
                                {product.name}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-700 dark:text-text-secondary">
                                {product.unit || "-"}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-700 dark:text-text-secondary">
                                {product.cost
                                  ? `${Number(product.cost).toFixed(2)} ${selectedGroup.currency}`
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
            </div>
          </div>
        </div>
      )}

      {/* Manage Products Modal */}
      {isManageProductsModalOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="bg-white dark:bg-surface-primary border-b border-gray-200 dark:border-border-primary px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-text-primary">
                  إدارة أصناف المجموعة: {selectedGroup.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-text-tertiary mt-1">
                  اختر الأصناف التي تريد إضافتها أو إزالتها من المجموعة
                </p>
              </div>
              <button
                onClick={handleCloseManageProductsModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-surface-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-border-primary bg-gray-50 dark:bg-surface-secondary">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* البحث بالكود */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-text-tertiary mb-1">
                    البحث بالكود (مطابقة تامة)
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="أدخل الكود بالضبط..."
                      value={productSearchSKU}
                      onChange={(e) => {
                        setProductSearchSKU(e.target.value);
                        setProductPage(1);
                        setLoadedProducts([]);
                      }}
                      className="w-full pr-10 pl-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                    />
                  </div>
                </div>

                {/* البحث بالاسم */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-text-tertiary mb-1">
                    البحث بالاسم (مطابقة جزئية)
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="أدخل جزء من الاسم..."
                      value={productSearchName}
                      onChange={(e) => {
                        setProductSearchName(e.target.value);
                        setProductPage(1);
                        setLoadedProducts([]);
                      }}
                      className="w-full pr-10 pl-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* مؤشر البحث النشط */}
              {(productSearchSKU || productSearchName) && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-text-secondary">
                    البحث النشط:
                  </span>
                  {productSearchSKU && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                      كود: {productSearchSKU}
                      <button
                        onClick={() => {
                          setProductSearchSKU("");
                          setProductPage(1);
                          setLoadedProducts([]);
                        }}
                        className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {productSearchName && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                      اسم: {productSearchName}
                      <button
                        onClick={() => {
                          setProductSearchName("");
                          setProductPage(1);
                          setLoadedProducts([]);
                        }}
                        className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setProductSearchSKU("");
                      setProductSearchName("");
                      setProductPage(1);
                      setLoadedProducts([]);
                    }}
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    مسح الكل
                  </button>
                </div>
              )}
            </div>

            {/* Select All Bar */}
            <div className="px-6 py-3 border-b border-gray-100 dark:border-border-primary bg-gray-50/50 dark:bg-surface-secondary">
              <label
                className="flex items-center gap-2 cursor-pointer w-fit group"
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectAll();
                }}
              >
                <div className="flex items-center justify-center w-5 h-5 border-2 border-gray-300 dark:border-border-primary rounded bg-white dark:bg-surface-primary group-hover:border-blue-500 transition-colors">
                  {filteredProducts.length > 0 && filteredProducts.every(p => {
                    const isPending = pendingAssignments[p.id];
                    return isPending !== undefined ? isPending : p.groupId === selectedGroupId;
                  }) ? (
                    <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                  ) : filteredProducts.some(p => {
                    const isPending = pendingAssignments[p.id];
                    return isPending !== undefined ? isPending : p.groupId === selectedGroupId;
                  }) ? (
                    <div className="w-3 h-0.5 bg-blue-600 rounded-sm"></div>
                  ) : null}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-text-secondary select-none">
                  {filteredProducts.every(p => {
                    const isPending = pendingAssignments[p.id];
                    return isPending !== undefined ? isPending : p.groupId === selectedGroupId;
                  }) ? "إلغاء تحديد الكل" : "تحديد الكل في هذه الصفحة"}
                  {" "}
                  <span className="text-gray-400 dark:text-text-muted font-normal">({filteredProducts.length} صنف)</span>
                </span>
              </label>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingProducts || isFetchingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-text-tertiary">
                  {(productSearchSKU || productSearchName) ? (
                    <div>
                      <p className="text-lg font-medium mb-2">لا توجد نتائج للبحث</p>
                      <p className="text-sm">جرب تغيير معايير البحث</p>
                    </div>
                  ) : (
                    "لا توجد أصناف تطابق البحث"
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product: any) => {
                    const isPending = pendingAssignments[product.id];
                    const isInGroupServer = product.groupId === selectedGroupId;
                    const isChecked = isPending !== undefined ? isPending : isInGroupServer;
                    const hasChanged = isPending !== undefined && isPending !== isInGroupServer;

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleToggleProduct(product.id, product.groupId)}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${isChecked
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-border-primary hover:border-gray-300 dark:hover:border-blue-800/30"
                          } ${hasChanged ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
                      >
                        <div className="relative flex-shrink-0 flex items-center justify-center w-5 h-5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }} // Managed by div onClick
                            className="w-5 h-5 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-border-primary rounded focus:ring-blue-500 pointer-events-none"
                          />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Package className="w-4 h-4 text-gray-400 dark:text-text-tertiary" />
                            <span className="font-medium text-gray-900 dark:text-text-primary">
                              {product.name}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-text-tertiary">
                              ({product.sku})
                            </span>
                            {hasChanged && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                {isPending ? "سيتم الإضافة" : "سيتم الحذف"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {product.unit && (
                              <span className="text-xs text-gray-500 dark:text-text-tertiary">
                                الوحدة: {product.unit}
                              </span>
                            )}
                            {product.createdByCompany && (
                              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${product.createdByCompany.id === 1
                                ? "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                                : "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
                                }`}>
                                <Building2 className="w-3 h-3 ml-1" />
                                {product.createdByCompany.name}
                                {product.createdByCompany.id === 1 ? " (التقازي)" : " (الإمارات)"}
                              </span>
                            )}
                          </div>
                        </div>
                        {isChecked && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full whitespace-nowrap">
                            {hasChanged ? "مختار" : "في المجموعة"}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Load More Button */}
                  {hasMoreProducts && (
                    <div className="pt-4 flex justify-center">
                      <button
                        onClick={() => setProductPage(prev => prev + 1)}
                        disabled={isFetchingProducts}
                        className="flex items-center gap-2 px-8 py-2 border-2 border-gray-200 dark:border-border-primary rounded-lg text-gray-600 dark:text-text-secondary hover:bg-gray-50 dark:hover:bg-surface-hover hover:border-gray-300 dark:hover:border-blue-800/30 transition-all disabled:opacity-50"
                      >
                        {isFetchingProducts ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span>جاري التحميل...</span>
                          </>
                        ) : (
                          <span>تحميل المزيد من الأصناف</span>
                        )}
                      </button>
                    </div>
                  )}

                  {isFetchingProducts && productPage > 1 && (
                    <div className="fixed bottom-24 right-1/2 transform translate-x-1/2 bg-blue-600 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce z-[60]">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      جاري جلب الصفحة التالية...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-border-primary px-6 py-4 bg-gray-50 dark:bg-surface-secondary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600 dark:text-text-secondary">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {/* Count based on visible products + pending assignments */}
                      {filteredProducts.filter((p: any) => {
                        const isPending = pendingAssignments[p.id];
                        return isPending !== undefined ? isPending : p.groupId === selectedGroupId;
                      }).length}
                    </span>
                    {" "}صنف في المجموعة (المعروض حالياً)
                  </span>
                  {(productSearchSKU || productSearchName) && (
                    <>
                      <span className="text-gray-400 dark:text-text-muted">•</span>
                      <span className="text-gray-600 dark:text-text-secondary">
                        عرض {filteredProducts.length} نتيجة
                      </span>
                    </>
                  )}
                  {Object.keys(pendingAssignments).length > 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                      يوجد {Object.keys(pendingAssignments).length} تغييرات غير محفوظة
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCloseManageProductsModal}
                    className="px-4 py-2 text-gray-700 dark:text-text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover rounded-lg transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveManageProducts}
                    disabled={isBulkUpdating || Object.keys(pendingAssignments).length === 0}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isBulkUpdating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>حفظ التغييرات ({Object.keys(pendingAssignments).length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGroupsPage;

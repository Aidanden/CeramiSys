"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, X, Users } from "lucide-react";
import { 
  useGetRolesQuery, 
  useCreateRoleMutation, 
  useUpdateRoleMutation, 
  useDeleteRoleMutation,
} from "@/state/permissionsApi";
import type { Role } from "@/state/permissionsApi";
import ScreenPermissionsSelector from "@/components/ScreenPermissionsSelector";
import { toast } from "react-hot-toast";

interface PermissionGroup {
  id: string;
  name: string;
  displayName: string;
  permissions: string[];
  description?: string;
}

interface PermissionGroupForm {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
}

const PermissionGroupsPage = () => {
  const { data: rolesData, isLoading, refetch } = useGetRolesQuery();
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
  const [formData, setFormData] = useState<PermissionGroupForm>({
    name: "",
    displayName: "",
    description: "",
    permissions: [],
  });

  const roles: Role[] = rolesData?.data ?? [];

  const handleOpenModal = (group?: PermissionGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        displayName: group.displayName,
        description: group.description || "",
        permissions: group.permissions,
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: "",
        displayName: "",
        description: "",
        permissions: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGroup(null);
    setFormData({
      name: "",
      displayName: "",
      description: "",
      permissions: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.displayName.trim()) {
      toast.error("الرجاء إدخال اسم المجموعة");
      return;
    }

    if (formData.permissions.length === 0) {
      toast.error("الرجاء اختيار صلاحية واحدة على الأقل");
      return;
    }

    try {
      if (editingGroup) {
        await updateRole({
          id: editingGroup.id,
          data: {
            displayName: formData.displayName,
            description: formData.description,
            permissions: formData.permissions,
          },
        }).unwrap();
        toast.success("تم تحديث المجموعة بنجاح");
      } else {
        await createRole({
          roleName: formData.name || formData.displayName.toLowerCase().replace(/\s+/g, "_"),
          displayName: formData.displayName,
          description: formData.description,
          permissions: formData.permissions,
        }).unwrap();
        toast.success("تم إنشاء المجموعة بنجاح");
      }
      handleCloseModal();
      refetch();
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      toast.error(apiError?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المجموعة؟")) return;

    try {
      await deleteRole(id).unwrap();
      toast.success("تم حذف المجموعة بنجاح");
      refetch();
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      toast.error(apiError?.data?.message || "حدث خطأ");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">مجموعات الصلاحيات</h1>
          <p className="text-gray-600 mt-1">إدارة مجموعات الصلاحيات وتعيينها للمستخدمين</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/users"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            الرجوع لإدارة المستخدمين
          </Link>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            <span>إنشاء مجموعة جديدة</span>
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{role.displayName}</h3>
                {role.description && (
                  <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal({
                    id: role.id,
                    name: role.roleName,
                    displayName: role.displayName,
                    permissions: role.permissions,
                    description: role.description ?? undefined,
                  })}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                  title="تعديل"
                >
                  <Edit size={18} />
                </button>
                {role.roleName !== 'admin' && (
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                    title="حذف"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={16} />
                <span>عدد الصلاحيات: {role.permissions?.length || 0}</span>
              </div>
              
              {role.permissions?.includes('screen.all') ? (
                <div className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  جميع الصلاحيات
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 mt-2">
                  {role.permissions?.slice(0, 3).map((perm: string) => (
                    <span
                      key={perm}
                      className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {perm.replace('screen.', '')}
                    </span>
                  ))}
                  {role.permissions?.length > 3 && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{role.permissions.length - 3} أخرى
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingGroup ? "تعديل مجموعة الصلاحيات" : "إنشاء مجموعة جديدة"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم المجموعة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="مثال: مدير المبيعات"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المعرف التقني
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="sales_manager"
                    disabled={!!editingGroup}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="وصف مختصر لهذه المجموعة..."
                />
              </div>

              {/* Permissions Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  الصلاحيات <span className="text-red-500">*</span>
                </label>
                <ScreenPermissionsSelector
                  selectedPermissions={formData.permissions}
                  onChange={(permissions) => setFormData({ ...formData, permissions })}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Users size={20} />
                  <span>{editingGroup ? "حفظ التغييرات" : "إنشاء المجموعة"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionGroupsPage;

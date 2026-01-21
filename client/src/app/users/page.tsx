"use client";
import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Filter
} from "lucide-react";
import Link from "next/link";
import { useGetUsersQuery, useCreateUserMutation, useDeleteUserMutation, useUpdateUserMutation } from "@/state/usersApi";
import type { User as UserRecord } from "@/state/usersApi";
import { useGetCompaniesQuery } from "@/state/companyApi";
import { useToast } from "@/components/ui/Toast";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import {
  setCurrentFilter,
  setSearchTerm,
  setCurrentPage,
  setViewMode,
  toggleSort,
  resetFilters,
  selectUsersState,
  selectCurrentFilter,
  selectSearchTerm,
  selectCurrentPage,
  selectViewMode,
  selectSortConfig,
  selectShowSystemUsers
} from "@/state/usersSlice";
import PermissionGuard from "@/components/PermissionGuard";
import ScreenPermissionsSelector from "@/components/ScreenPermissionsSelector";
import { useGetRolesQuery, useGetUserScreensQuery } from "@/state/permissionsApi";
import { toast } from "react-hot-toast";
import { hasScreenAccess } from "@/types/permissions";

const UsersPage = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const usersState = useAppSelector(selectUsersState);
  const currentFilter = useAppSelector(selectCurrentFilter);
  const searchTerm = useAppSelector(selectSearchTerm);
  const currentPage = useAppSelector(selectCurrentPage);
  const viewMode = useAppSelector(selectViewMode);
  const sortConfig = useAppSelector(selectSortConfig);
  const showSystemUsers = useAppSelector(selectShowSystemUsers);

  const { data: usersData, isLoading: isLoadingUsers, error: usersError, refetch } = useGetUsersQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm,
    role: currentFilter === 'all' ? undefined : currentFilter,
  });


  const { data: companiesData } = useGetCompaniesQuery({ page: 1, limit: 100 });
  const { data: rolesData } = useGetRolesQuery();
  const { data: userScreensData } = useGetUserScreensQuery();

  const canAccessScreen = (route: string) => {
    if (!userScreensData?.screens) return false;
    return hasScreenAccess(userScreensData.screens, route);
  };

  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [deleteUser, { isLoading: isDeletingUser }] = useDeleteUserMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();

  // Combined loading state
  const isAnyOperationLoading = isCreatingUser || isUpdatingUser || isDeletingUser;

  const users = usersData?.data?.users || [];
  const roles = rolesData?.data || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const getDefaultNewUser = () => ({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    roleId: "",
    permissions: [] as string[],
    companyId: undefined as number | undefined,
    isSystemUser: false,
    isActive: true
  });

  const getDefaultEditUser = () => ({
    id: "",
    username: "",
    fullName: "",
    email: "",
    phone: "",
    roleId: "",
    permissions: [] as string[],
    isActive: true
  });

  const [newUser, setNewUser] = useState(getDefaultNewUser());
  const [editUser, setEditUser] = useState(getDefaultEditUser());

  const [addUseRolePermissions, setAddUseRolePermissions] = useState(true);
  const [editUseRolePermissions, setEditUseRolePermissions] = useState(true);
  const [addModalPermissions, setAddModalPermissions] = useState<string[]>([]);
  const [editModalPermissions, setEditModalPermissions] = useState<string[]>([]);

  const findRoleById = (roleId?: string | null) => roles.find((role) => role.id === roleId);
  const getRolePermissions = (roleId?: string | null) => findRoleById(roleId)?.permissions || [];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = currentFilter === "all" || user.roleId === currentFilter;

    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    if (!showAddModal) {
      setNewUser(getDefaultNewUser());
      setAddModalPermissions([]);
      setAddUseRolePermissions(true);
    } else if (showAddModal && newUser.roleId && addUseRolePermissions) {
      setAddModalPermissions(getRolePermissions(newUser.roleId));
    }
  }, [showAddModal]);

  useEffect(() => {
    if (!showEditModal) {
      setEditUser(getDefaultEditUser());
      setEditModalPermissions([]);
      setEditUseRolePermissions(true);
    }
  }, [showEditModal]);

  const handleAddRoleChange = (roleId: string) => {
    setNewUser((prev) => ({ ...prev, roleId }));
    if (roleId) {
      setAddModalPermissions(getRolePermissions(roleId));
    } else {
      setAddModalPermissions([]);
    }
  };

  const handleEditRoleChange = (roleId: string) => {
    setEditUser((prev) => ({ ...prev, roleId }));
    if (roleId) {
      setEditModalPermissions(getRolePermissions(roleId));
    } else {
      setEditModalPermissions([]);
    }
  };

  const handleToggleAddPermissionMode = (useRole: boolean) => {
    setAddUseRolePermissions(useRole);
    if (useRole && newUser.roleId) {
      setAddModalPermissions(getRolePermissions(newUser.roleId));
    }
  };

  const handleToggleEditPermissionMode = (useRole: boolean) => {
    setEditUseRolePermissions(useRole);
    if (useRole && editUser.roleId) {
      setEditModalPermissions(getRolePermissions(editUser.roleId));
    }
  };

  const openAddModal = () => {
    setNewUser(getDefaultNewUser());
    setAddModalPermissions([]);
    setAddUseRolePermissions(true);
    setShowAddModal(true);
  };

  const openEditModal = (user: UserRecord) => {
    setEditUser({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email || "",
      phone: user.phone || "",
      roleId: user.roleId || "",
      permissions: user.permissions || [],
      isActive: user.isActive
    });

    const hasCustom = user.hasCustomPermissions ?? Boolean(user.permissions?.length && !user.roleId);
    setEditUseRolePermissions(!hasCustom);
    if (hasCustom) {
      setEditModalPermissions(user.permissions || []);
    } else {
      setEditModalPermissions(getRolePermissions(user.roleId));
    }

    setShowEditModal(true);
  };

  const handleAddUser = async () => {
    try {
      // التحقق من البيانات المطلوبة
      if (!newUser.username || !newUser.fullName || !newUser.password) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
      } else if (!newUser.isSystemUser && !newUser.companyId) {
        toast.error('يرجى اختيار الشركة أو تحديد المستخدم كمدير عام');
      } else if (addUseRolePermissions && !newUser.roleId) {
        toast.error('اختر الدور أو فعّل التخصيص اليدوي للصلاحيات');
      } else if (!addUseRolePermissions && addModalPermissions.length === 0) {
        toast.error('يرجى تحديد صلاحية واحدة على الأقل');
      } else {
        const userData = {
          username: newUser.username,
          fullName: newUser.fullName,
          email: newUser.email,
          phone: newUser.phone,
          password: newUser.password,
          roleId: newUser.roleId || undefined,
          permissions: addUseRolePermissions ? undefined : addModalPermissions,
          companyId: newUser.isSystemUser ? undefined : newUser.companyId, // إرسال undefined لمستخدمي النظام
          isSystemUser: newUser.isSystemUser,
          isActive: newUser.isActive
        };

        const result = await createUser(userData).unwrap();
        if (result.success) {
          toast.success('تم إضافة المستخدم بنجاح');
          setNewUser(getDefaultNewUser());
          setAddModalPermissions([]);
          setAddUseRolePermissions(true);
          setShowAddModal(false);
        } else {
          toast.error(result.message || 'خطأ في إضافة المستخدم');
        }
      }
    } catch (error) {
      const errorMessage = (error as { data?: { message?: string } })?.data?.message || 'خطأ في إضافة المستخدم';
      toast.error(errorMessage);
    }
  };

  const handleEditUser = async () => {
    try {
      if (editUseRolePermissions && !editUser.roleId) {
        toast.error('اختر الدور أو فعّل التخصيص اليدوي للصلاحيات');
      } else if (!editUseRolePermissions && editModalPermissions.length === 0) {
        toast.error('يرجى تحديد صلاحية واحدة على الأقل');
      } else {
        const result = await updateUser({
          id: editUser.id,
          userData: {
            username: editUser.username,
            fullName: editUser.fullName,
            email: editUser.email,
            phone: editUser.phone,
            roleId: editUser.roleId || undefined,
            permissions: editUseRolePermissions ? undefined : editModalPermissions,
            isActive: editUser.isActive
          }
        }).unwrap();

        if (result.success) {
          toast.success('تم تحديث المستخدم بنجاح');
          setEditModalPermissions([]);
          setEditUseRolePermissions(true);
          setShowEditModal(false);
        } else {
          toast.error(result.message || 'خطأ في تحديث المستخدم');
        }
      }
    } catch (error) {
      const errorMessage = (error as { data?: { message?: string } })?.data?.message || 'خطأ في تحديث المستخدم';
      toast.error(errorMessage);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmed = await toast.confirm(
      "تأكيد تعطيل المستخدم",
      "هل أنت متأكد من تعطيل هذا المستخدم؟"
    );

    if (!confirmed) return;

    try {
      const result = await deleteUser(userId).unwrap();
      if (result.success) {
        toast.success('تم بنجاح!', 'تم تعطيل المستخدم بنجاح');
      } else {
        toast.error('خطأ في العملية', result.message || 'خطأ في تعطيل المستخدم');
      }
    } catch (error) {
      const errorMessage = (error as { data?: { message?: string } })?.data?.message || 'خطأ في تعطيل المستخدم';
      toast.error('خطأ غير متوقع', errorMessage);
    }
  };

  return (
    <PermissionGuard requiredPermission="screen.users">
      <div className="p-6 font-tajawal">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-text-primary mb-2">إدارة المستخدمين</h1>
          <p className="text-slate-600 dark:text-text-secondary">إدارة المستخدمين والصلاحيات في النظام</p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-center flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="البحث عن مستخدم..."
                  value={searchTerm}
                  onChange={(e) => dispatch(setSearchTerm(e.target.value))}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                />
              </div>

              {/* Role Filter */}
              <div className="relative">
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <select
                  value={currentFilter}
                  onChange={(e) => dispatch(setCurrentFilter(e.target.value as any))}
                  className="pr-10 pl-4 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                >
                  <option value="all">جميع الأدوار</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.displayName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              {canAccessScreen('/permission-groups') && (
                <Link
                  href="/permission-groups"
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-surface-hover text-slate-700 dark:text-text-secondary rounded-xl hover:bg-slate-200 dark:hover:bg-surface-elevated transition-colors duration-200"
                >
                  إدارة مجموعات الصلاحيات
                </Link>
              )}
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
              >
                <Plus className="h-5 w-5" />
                إضافة مستخدم
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden relative">
          {/* Loading Overlay */}
          {isAnyOperationLoading && (
            <div className="absolute inset-0 bg-white dark:bg-surface-primary bg-opacity-75 dark:bg-opacity-90 flex items-center justify-center z-10">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="text-slate-600 dark:text-text-secondary font-medium">
                  {isCreatingUser && 'جاري إضافة المستخدم...'}
                  {isUpdatingUser && 'جاري تحديث المستخدم...'}
                  {isDeletingUser && 'جاري تعطيل المستخدم...'}
                </span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-surface-secondary border-b border-slate-200 dark:border-border-primary">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-text-secondary">المستخدم</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-text-secondary">الدور</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-text-secondary">الشركة</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-text-secondary">الحالة</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-text-secondary">تاريخ الإنشاء</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-text-secondary">آخر دخول</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-text-secondary">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-border-primary">
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                        <p className="text-slate-500 dark:text-text-tertiary">جاري تحميل المستخدمين...</p>
                      </div>
                    </td>
                  </tr>
                ) : usersError ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <p className="text-red-500">خطأ في تحميل المستخدمين</p>
                      <button
                        onClick={() => refetch()}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
                      >
                        إعادة المحاولة
                      </button>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <p className="text-slate-500 dark:text-text-tertiary">لا توجد مستخدمين</p>
                    </td>
                  </tr>
                ) : filteredUsers.map((user) => {
                  const isCustomRole = user.hasCustomPermissions;
                  const roleName = isCustomRole ? "صلاحيات مخصصة" : (findRoleById(user.roleId)?.displayName || 'غير محدد');
                  const badgeClass = isCustomRole ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {user.fullName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-text-primary">{user.fullName}</div>
                            <div className="text-sm text-slate-500 dark:text-text-tertiary">@{user.username}</div>
                            <div className="text-sm text-slate-500 dark:text-text-tertiary">
                              {user.email || <span className="text-slate-400 dark:text-text-tertiary italic">لا يوجد بريد إلكتروني</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badgeClass}`}>
                          {roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${user.isSystemUser ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                          <span className={`text-sm ${user.isSystemUser ? 'text-purple-700 dark:text-purple-400 font-semibold' : 'text-slate-700 dark:text-text-secondary'}`}>
                            {user.companyName || 'غير محدد'}
                          </span>
                          {user.isSystemUser && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              نظام
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {user.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-text-secondary">
                        {new Date(user.createdAt).toLocaleDateString('en-US')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-text-secondary">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US') : 'لم يسجل دخول'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors duration-200"
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors duration-200"
                            title="تعطيل"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-start justify-center pt-20 z-[3] p-4">
            <div className="bg-white dark:bg-surface-primary rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-border-primary shadow-xl">
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-text-primary mb-4">إضافة مستخدم جديد</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">اسم المستخدم</label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      placeholder="أدخل اسم المستخدم"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">الاسم الكامل</label>
                    <input
                      type="text"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      placeholder="أدخل الاسم الكامل"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">
                      البريد الإلكتروني <span className="text-gray-400 text-sm">(اختياري)</span>
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      placeholder="أدخل البريد الإلكتروني (اختياري)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">رقم الهاتف</label>
                    <input
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      placeholder="أدخل رقم الهاتف"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">كلمة المرور</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      placeholder="أدخل كلمة المرور"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">الدور</label>
                    <select
                      value={newUser.roleId}
                      onChange={(e) => handleAddRoleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                    >
                      <option value="">اختر الدور (اختياري)</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.displayName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border border-slate-200 dark:border-border-primary rounded-xl p-4 bg-slate-50 dark:bg-surface-secondary">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-semibold text-slate-700 dark:text-text-secondary">طريقة تعيين الصلاحيات</p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleAddPermissionMode(true)}
                          className={`flex-1 px-3 py-2 rounded-xl border transition-colors ${addUseRolePermissions ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-surface-secondary text-slate-700 dark:text-text-secondary border-slate-300 dark:border-border-primary'}`}
                        >
                          استخدام صلاحيات الدور
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAddPermissionMode(false)}
                          className={`flex-1 px-3 py-2 rounded-xl border transition-colors ${!addUseRolePermissions ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-surface-secondary text-slate-700 dark:text-text-secondary border-slate-300 dark:border-border-primary'}`}
                        >
                          تخصيص الصلاحيات
                        </button>
                      </div>

                      {addUseRolePermissions ? (
                        <p className="text-sm text-slate-600 dark:text-text-secondary mt-2">
                          سيتم استخدام صلاحيات الدور المحدد تلقائياً. {newUser.roleId ? 'عدد الصلاحيات: ' + getRolePermissions(newUser.roleId).length : 'يرجى اختيار دور للاستفادة من صلاحياته.'}
                        </p>
                      ) : (
                        <div className="mt-3">
                          <ScreenPermissionsSelector
                            selectedPermissions={addModalPermissions}
                            onChange={setAddModalPermissions}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">
                      الشركة {!newUser.isSystemUser && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={newUser.companyId || ''}
                      onChange={(e) => setNewUser({ ...newUser, companyId: e.target.value ? parseInt(e.target.value) : undefined })}
                      disabled={newUser.isSystemUser}
                      className={`w-full px-3 py-2 border rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${newUser.isSystemUser
                        ? 'bg-slate-100 dark:bg-surface-hover cursor-not-allowed border-slate-300 dark:border-border-primary'
                        : !newUser.companyId
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-slate-300 dark:border-border-primary'
                        }`}
                    >
                      <option value="">{newUser.isSystemUser ? 'غير مطلوب لمستخدم النظام' : 'اختر الشركة (مطلوب)'}</option>
                      {companiesData?.data?.companies?.map((company: any) => (
                        <option key={company.id} value={company.id}>
                          {company.name} {company.isParent ? '(شركة أم)' : '(فرع)'}
                        </option>
                      ))}
                    </select>
                    <p className={`text-xs mt-1 ${!newUser.isSystemUser && !newUser.companyId ? 'text-red-500' : 'text-slate-500 dark:text-text-tertiary'}`}>
                      {newUser.isSystemUser
                        ? 'مستخدم النظام لا يحتاج شركة محددة'
                        : !newUser.companyId
                          ? 'يرجى اختيار الشركة أو تحديد المستخدم كمدير عام'
                          : 'تم اختيار الشركة بنجاح'
                      }
                    </p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isSystemUser"
                      checked={newUser.isSystemUser}
                      onChange={(e) => setNewUser({ ...newUser, isSystemUser: e.target.checked, companyId: e.target.checked ? undefined : newUser.companyId })}
                      className="w-4 h-4 text-blue-600 bg-slate-100 dark:bg-surface-hover border-slate-300 dark:border-border-primary rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="isSystemUser" className="mr-2 text-sm font-semibold text-slate-700 dark:text-text-secondary">
                      مستخدم نظام (مدير عام)
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-text-tertiary">
                    مستخدم النظام يمكنه الوصول لجميع الشركات ولا يحتاج شركة محددة
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleAddUser}
                    disabled={isCreatingUser || !newUser.username || !newUser.fullName || !newUser.password || (!newUser.isSystemUser && !newUser.companyId)}
                    className={`flex-1 py-2 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${isCreatingUser || !newUser.username || !newUser.fullName || !newUser.password || (!newUser.isSystemUser && !newUser.companyId)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                      } text-white`}
                  >
                    {isCreatingUser && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {isCreatingUser ? 'جاري الإضافة...' : 'إضافة المستخدم'}
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-slate-100 dark:bg-surface-hover text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-start justify-center pt-20 z-[3] p-4">
            <div className="bg-white dark:bg-surface-primary rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-border-primary shadow-xl">
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-text-primary mb-4">تعديل المستخدم</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">اسم المستخدم</label>
                    <input
                      type="text"
                      value={editUser.username}
                      onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      placeholder="أدخل اسم المستخدم"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">الاسم الكامل</label>
                    <input
                      type="text"
                      value={editUser.fullName}
                      onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      placeholder="أدخل الاسم الكامل"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">
                      البريد الإلكتروني <span className="text-gray-400 text-sm">(اختياري)</span>
                    </label>
                    <input
                      type="email"
                      value={editUser.email || ""}
                      onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      placeholder="أدخل البريد الإلكتروني (اختياري)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">رقم الهاتف</label>
                    <input
                      type="tel"
                      value={editUser.phone || ""}
                      onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      placeholder="أدخل رقم الهاتف"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">الدور</label>
                    <select
                      value={editUser.roleId}
                      onChange={(e) => handleEditRoleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                    >
                      <option value="">بدون دور</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.displayName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border border-slate-200 dark:border-border-primary rounded-xl p-4 bg-slate-50 dark:bg-surface-secondary">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-semibold text-slate-700 dark:text-text-secondary">طريقة تعيين الصلاحيات</p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleEditPermissionMode(true)}
                          className={`flex-1 px-3 py-2 rounded-xl border transition-colors ${editUseRolePermissions ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-surface-secondary text-slate-700 dark:text-text-secondary border-slate-300 dark:border-border-primary'}`}
                        >
                          استخدام صلاحيات الدور
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleEditPermissionMode(false)}
                          className={`flex-1 px-3 py-2 rounded-xl border transition-colors ${!editUseRolePermissions ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-surface-secondary text-slate-700 dark:text-text-secondary border-slate-300 dark:border-border-primary'}`}
                        >
                          تخصيص الصلاحيات
                        </button>
                      </div>

                      {editUseRolePermissions ? (
                        <p className="text-sm text-slate-600 dark:text-text-secondary mt-2">
                          سيتم استخدام صلاحيات الدور المحدد تلقائياً. {editUser.roleId ? 'عدد الصلاحيات: ' + getRolePermissions(editUser.roleId).length : 'يرجى اختيار دور للاستفادة من صلاحياته.'}
                        </p>
                      ) : (
                        <div className="mt-3">
                          <ScreenPermissionsSelector
                            selectedPermissions={editModalPermissions}
                            onChange={setEditModalPermissions}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="editUserActive"
                      checked={editUser.isActive}
                      onChange={(e) => setEditUser({ ...editUser, isActive: e.target.checked })}
                      className="mr-2"
                    />
                    <label htmlFor="editUserActive" className="text-sm font-semibold text-slate-700 dark:text-text-secondary">
                      المستخدم نشط
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleEditUser}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                  >
                    حفظ التغييرات
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                    }}
                    className="flex-1 bg-slate-100 dark:bg-surface-hover text-slate-700 dark:text-text-secondary py-2 px-4 rounded-xl hover:bg-slate-200 dark:hover:bg-surface-elevated transition-colors duration-200"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </PermissionGuard>
  );
};

export default UsersPage;

"use client";

import React, { useState, useEffect } from "react";
import { User, Shield, Settings, Search, Filter } from "lucide-react";
import { toast } from "react-hot-toast";
import { useGetUsersQuery } from "@/state/usersApi";
import { 
  useGetRolesQuery, 
  useGetUserPermissionsQuery,
  useAssignUserRoleMutation,
  useAssignUserPermissionsMutation 
} from "@/state/permissionsApi";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from "@/config/permissions";

interface UserWithPermissions {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
}

const UserPermissionsManager = () => {
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);
  const [tempRole, setTempRole] = useState("");

  // API hooks
  const { data: usersData } = useGetUsersQuery();
  const { data: customRoles } = useGetRolesQuery();
  const [assignUserRole] = useAssignUserRoleMutation();
  const [assignUserPermissions] = useAssignUserPermissionsMutation();

  const users = usersData?.data?.users || [];

  // فلترة المستخدمين
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // فتح نافذة تحرير الصلاحيات
  const openPermissionsModal = (user: any) => {
    setSelectedUser(user);
    setTempRole(user.role);
    setTempPermissions(user.permissions || []);
    setShowPermissionsModal(true);
  };

  // حفظ التغييرات
  const savePermissions = async () => {
    if (!selectedUser) return;

    try {
      // تحديث الدور إذا تغير
      if (tempRole !== selectedUser.role) {
        await assignUserRole({
          userId: selectedUser.id,
          roleId: tempRole
        }).unwrap();
      }

      // تحديث الصلاحيات المخصصة
      await assignUserPermissions({
        userId: selectedUser.id,
        permissions: tempPermissions
      }).unwrap();

      toast.success("تم تحديث صلاحيات المستخدم بنجاح");
      setShowPermissionsModal(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error("حدث خطأ في تحديث الصلاحيات");
      console.error("Error updating permissions:", error);
    }
  };

  // تبديل صلاحية
  const togglePermission = (permission: string) => {
    setTempPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  // الحصول على جميع الصلاحيات المتاحة
  const getAllAvailablePermissions = (): string[] => {
    const systemPermissions = Object.values(PERMISSIONS).flatMap(module => Object.values(module)) as string[];
    return systemPermissions;
  };

  // الحصول على صلاحيات الدور
  const getRolePermissions = (role: string): string[] => {
    const rolePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    return rolePermissions ? [...rolePermissions] : [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <User className="w-6 h-6 ml-3 text-blue-600" />
          إدارة صلاحيات المستخدمين
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="البحث عن مستخدم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">جميع الأدوار</option>
              {Object.values(ROLES).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
              {customRoles?.map(role => (
                <option key={role.id} value={role.name}>{role.displayName}</option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-600 flex items-center">
            إجمالي المستخدمين: {filteredUsers.length}
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المستخدم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الدور
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الصلاحيات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {user.fullName.charAt(0)}
                      </div>
                      <div className="mr-4">
                        <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                        <div className="text-sm text-gray-500">{user.username}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'cashier' ? 'bg-green-100 text-green-800' :
                      user.role === 'accountant' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {user.role === 'admin' ? (
                        <span className="text-red-600 font-medium">جميع الصلاحيات</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {getRolePermissions(user.role).slice(0, 3).map((permission, index) => (
                            <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {permission.split(':')[1]}
                            </span>
                          ))}
                          {getRolePermissions(user.role).length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{getRolePermissions(user.role).length - 3} أخرى
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openPermissionsModal(user)}
                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                    >
                      <Settings className="w-4 h-4" />
                      تحرير الصلاحيات
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold flex items-center">
                <Shield className="w-5 h-5 ml-2 text-blue-600" />
                تحرير صلاحيات: {selectedUser.fullName}
              </h3>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الدور الأساسي
              </label>
              <select
                value={tempRole}
                onChange={(e) => setTempRole(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(ROLES).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
                {customRoles?.map(role => (
                  <option key={role.id} value={role.name}>{role.displayName}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                الدور الأساسي يحدد الصلاحيات الافتراضية للمستخدم
              </p>
            </div>

            {/* Role Permissions Preview */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">صلاحيات الدور المحدد:</h4>
              <div className="flex flex-wrap gap-2">
                {getRolePermissions(tempRole).map((permission, index) => (
                  <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {permission}
                  </span>
                ))}
              </div>
            </div>

            {/* Custom Permissions */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-4">صلاحيات إضافية مخصصة:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(PERMISSIONS).map(([module, permissions]) => (
                  <div key={module} className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-800 mb-3">{module}</h5>
                    <div className="space-y-2">
                      {Object.values(permissions).map((permission: string) => {
                        const isRolePermission = getRolePermissions(tempRole).includes(permission);
                        const isCustomPermission = tempPermissions.includes(permission);
                        
                        return (
                          <label key={permission} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isRolePermission || isCustomPermission}
                              disabled={isRolePermission}
                              onChange={() => togglePermission(permission)}
                              className="form-checkbox h-4 w-4 text-blue-600 disabled:opacity-50"
                            />
                            <span className={`text-sm ${
                              isRolePermission ? 'text-gray-500' : 'text-gray-700'
                            }`}>
                              {permission.split(':')[1]}
                              {isRolePermission && (
                                <span className="text-xs text-blue-600 mr-1">(من الدور)</span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={savePermissions}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                حفظ التغييرات
              </button>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPermissionsManager;

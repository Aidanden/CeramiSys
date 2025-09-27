"use client";

import React, { useState, useEffect } from "react";
import { Shield, Users, Settings, Plus, Edit, Trash2, X, BarChart3 } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import PermissionGuard from "@/components/PermissionGuard";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from "@/config/permissions";
import UserPermissionsManager from "./UserPermissionsManager";
import AdvancedPermissionsEditor from "./AdvancedPermissionsEditor";
import PermissionsReport from "@/components/PermissionsReport";

interface CustomRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

interface CustomPermission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  module: string;
  isActive: boolean;
}

const PermissionsManagementPage = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'assignments' | 'users' | 'editor' | 'report'>('roles');
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [customPermissions, setCustomPermissions] = useState<CustomPermission[]>([]);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showAddPermissionModal, setShowAddPermissionModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [editingPermission, setEditingPermission] = useState<CustomPermission | null>(null);

  // نموذج الدور الجديد
  const [newRole, setNewRole] = useState({
    name: "",
    displayName: "",
    description: "",
    permissions: [] as string[]
  });

  // نموذج الصلاحية الجديدة
  const [newPermission, setNewPermission] = useState({
    name: "",
    displayName: "",
    description: "",
    module: ""
  });

  // تحميل البيانات المحفوظة
  useEffect(() => {
    const savedRoles = localStorage.getItem('customRoles');
    const savedPermissions = localStorage.getItem('customPermissions');
    
    if (savedRoles) {
      setCustomRoles(JSON.parse(savedRoles));
    }
    
    if (savedPermissions) {
      setCustomPermissions(JSON.parse(savedPermissions));
    }
  }, []);

  // حفظ البيانات
  const saveToStorage = (roles: CustomRole[], permissions: CustomPermission[]) => {
    localStorage.setItem('customRoles', JSON.stringify(roles));
    localStorage.setItem('customPermissions', JSON.stringify(permissions));
  };

  // إضافة دور جديد
  const handleAddRole = () => {
    if (!newRole.name || !newRole.displayName) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const role: CustomRole = {
      id: Date.now().toString(),
      name: newRole.name.toLowerCase().replace(/\s+/g, '_'),
      displayName: newRole.displayName,
      description: newRole.description,
      permissions: newRole.permissions,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const updatedRoles = [...customRoles, role];
    setCustomRoles(updatedRoles);
    saveToStorage(updatedRoles, customPermissions);
    
    setNewRole({ name: "", displayName: "", description: "", permissions: [] });
    setShowAddRoleModal(false);
    toast.success("تم إضافة الدور بنجاح");
  };

  // إضافة صلاحية جديدة
  const handleAddPermission = () => {
    if (!newPermission.name || !newPermission.displayName || !newPermission.module) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const permission: CustomPermission = {
      id: Date.now().toString(),
      name: `${newPermission.module.toLowerCase()}:${newPermission.name.toLowerCase()}`,
      displayName: newPermission.displayName,
      description: newPermission.description,
      module: newPermission.module,
      isActive: true
    };

    const updatedPermissions = [...customPermissions, permission];
    setCustomPermissions(updatedPermissions);
    saveToStorage(customRoles, updatedPermissions);
    
    setNewPermission({ name: "", displayName: "", description: "", module: "" });
    setShowAddPermissionModal(false);
    toast.success("تم إضافة الصلاحية بنجاح");
  };

  // حذف دور
  const handleDeleteRole = (roleId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا الدور؟")) {
      const updatedRoles = customRoles.filter(role => role.id !== roleId);
      setCustomRoles(updatedRoles);
      saveToStorage(updatedRoles, customPermissions);
      toast.success("تم حذف الدور بنجاح");
    }
  };

  // حذف صلاحية
  const handleDeletePermission = (permissionId: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الصلاحية؟")) {
      const updatedPermissions = customPermissions.filter(perm => perm.id !== permissionId);
      setCustomPermissions(updatedPermissions);
      saveToStorage(customRoles, updatedPermissions);
      toast.success("تم حذف الصلاحية بنجاح");
    }
  };

  // تبديل حالة الصلاحية في الدور
  const togglePermissionInRole = (roleId: string, permission: string) => {
    const updatedRoles = customRoles.map(role => {
      if (role.id === roleId) {
        const hasPermission = role.permissions.includes(permission);
        return {
          ...role,
          permissions: hasPermission 
            ? role.permissions.filter(p => p !== permission)
            : [...role.permissions, permission]
        };
      }
      return role;
    });
    
    setCustomRoles(updatedRoles);
    saveToStorage(updatedRoles, customPermissions);
  };

  // الحصول على جميع الصلاحيات المتاحة
  const getAllAvailablePermissions = () => {
    const systemPermissions = Object.values(PERMISSIONS).flatMap(module => Object.values(module));
    const customPermissionsList = customPermissions.map(p => p.name);
    return [...systemPermissions, ...customPermissionsList];
  };

  return (
    <PermissionGuard requiredRole="admin">
      <Toaster position="top-right" />
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Shield className="w-8 h-8 ml-3 text-blue-600" />
            إدارة الصلاحيات والأدوار
          </h1>
          <p className="text-gray-600">تخصيص وإدارة صلاحيات المستخدمين في النظام</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('roles')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'roles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline ml-2" />
                الأدوار المخصصة
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'permissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 inline ml-2" />
                الصلاحيات المخصصة
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'assignments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Shield className="w-4 h-4 inline ml-2" />
                تخصيص الصلاحيات
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline ml-2" />
                إدارة صلاحيات المستخدمين
              </button>
              <button
                onClick={() => setActiveTab('editor')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'editor'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 inline ml-2" />
                المحرر المتقدم
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'report'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline ml-2" />
                تقرير الصلاحيات
              </button>
            </nav>
          </div>
        </div>

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">الأدوار المخصصة</h2>
              <button
                onClick={() => setShowAddRoleModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة دور جديد
              </button>
            </div>

            {/* System Roles */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-gray-700">الأدوار الافتراضية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(ROLES).map(([key, role]) => (
                  <div key={role} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{role}</h4>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        افتراضي
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {role === 'admin' && 'مدير النظام - جميع الصلاحيات'}
                      {role === 'cashier' && 'صراف - المعاملات الأساسية'}
                      {role === 'manager' && 'مدير - معظم الوظائف'}
                      {role === 'accountant' && 'محاسب - التقارير والديون'}
                      {role === 'viewer' && 'مشاهد - القراءة فقط'}
                    </p>
                    <div className="text-xs text-gray-500">
                      الصلاحيات: {ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]?.length || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Roles */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-700">الأدوار المخصصة</h3>
              {customRoles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد أدوار مخصصة. قم بإضافة دور جديد للبدء.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customRoles.map((role) => (
                    <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{role.displayName}</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingRole(role)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                      <div className="text-xs text-gray-500">
                        الصلاحيات: {role.permissions.length}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                        role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {role.isActive ? 'نشط' : 'غير نشط'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">الصلاحيات المخصصة</h2>
              <button
                onClick={() => setShowAddPermissionModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة صلاحية جديدة
              </button>
            </div>

            {/* System Permissions */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-gray-700">الصلاحيات الافتراضية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(PERMISSIONS).map(([module, permissions]) => (
                  <div key={module} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">{module}</h4>
                    <div className="space-y-1">
                      {Object.values(permissions).map((permission) => (
                        <div key={permission} className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Permissions */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-700">الصلاحيات المخصصة</h3>
              {customPermissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد صلاحيات مخصصة. قم بإضافة صلاحية جديدة للبدء.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customPermissions.map((permission) => (
                    <div key={permission.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{permission.displayName}</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingPermission(permission)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePermission(permission.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{permission.description}</p>
                      <div className="text-xs text-gray-500 mb-2">
                        الوحدة: {permission.module}
                      </div>
                      <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {permission.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">تخصيص الصلاحيات للأدوار</h2>
            
            {customRoles.map((role) => (
              <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">{role.displayName}</h3>
                <p className="text-gray-600 mb-4">{role.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getAllAvailablePermissions().map((permission) => (
                    <label key={permission} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={role.permissions.includes(permission)}
                        onChange={() => togglePermissionInRole(role.id, permission)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Role Modal */}
        {showAddRoleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">إضافة دور جديد</h3>
                <button
                  onClick={() => setShowAddRoleModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الدور (بالإنجليزية)
                  </label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="مثال: custom_manager"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الاسم المعروض
                  </label>
                  <input
                    type="text"
                    value={newRole.displayName}
                    onChange={(e) => setNewRole({...newRole, displayName: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="مثال: مدير مخصص"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوصف
                  </label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="وصف مختصر للدور..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddRole}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  حفظ
                </button>
                <button
                  onClick={() => setShowAddRoleModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Permission Modal */}
        {showAddPermissionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">إضافة صلاحية جديدة</h3>
                <button
                  onClick={() => setShowAddPermissionModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوحدة
                  </label>
                  <input
                    type="text"
                    value={newPermission.module}
                    onChange={(e) => setNewPermission({...newPermission, module: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="مثال: reports"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الصلاحية
                  </label>
                  <input
                    type="text"
                    value={newPermission.name}
                    onChange={(e) => setNewPermission({...newPermission, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="مثال: export"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الاسم المعروض
                  </label>
                  <input
                    type="text"
                    value={newPermission.displayName}
                    onChange={(e) => setNewPermission({...newPermission, displayName: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="مثال: تصدير التقارير"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوصف
                  </label>
                  <textarea
                    value={newPermission.description}
                    onChange={(e) => setNewPermission({...newPermission, description: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="وصف مختصر للصلاحية..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddPermission}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  حفظ
                </button>
                <button
                  onClick={() => setShowAddPermissionModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <UserPermissionsManager />
        )}

        {/* Advanced Editor Tab */}
        {activeTab === 'editor' && (
          <AdvancedPermissionsEditor />
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <PermissionsReport />
        )}
      </div>
    </PermissionGuard>
  );
};

export default PermissionsManagementPage;

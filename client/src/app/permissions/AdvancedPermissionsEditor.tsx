"use client";

import React, { useState, useEffect } from "react";
import { Shield, Users, Settings, Search, Filter, Download } from "lucide-react";
import { toast } from "react-hot-toast";
import PermissionBadge from "@/components/PermissionBadge";
import PermissionsSummary from "@/components/PermissionsSummary";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from "@/config/permissions";

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  category: string;
  isBuiltIn: boolean;
}

const AdvancedPermissionsEditor = () => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "custom"
  });

  // تحميل الصلاحيات المتاحة
  useEffect(() => {
    const systemPermissions = Object.values(PERMISSIONS).flatMap(module => Object.values(module)) as string[];
    setAvailablePermissions(systemPermissions);
    
    // تحميل القوالب المحفوظة
    const savedTemplates = localStorage.getItem('permissionTemplates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      // إنشاء قوالب افتراضية
      const defaultTemplates: PermissionTemplate[] = [
        {
          id: "basic_user",
          name: "مستخدم أساسي",
          description: "صلاحيات أساسية للقراءة والعرض فقط",
          permissions: [
            PERMISSIONS.SALES.READ,
            PERMISSIONS.BUYS.READ,
            PERMISSIONS.CUSTOMERS.READ,
            PERMISSIONS.CURRENCIES.READ,
            PERMISSIONS.DASHBOARD.VIEW
          ],
          category: "built-in",
          isBuiltIn: true
        },
        {
          id: "sales_manager",
          name: "مدير المبيعات",
          description: "صلاحيات إدارة المبيعات والعملاء",
          permissions: [
            ...Object.values(PERMISSIONS.SALES),
            ...Object.values(PERMISSIONS.CUSTOMERS),
            PERMISSIONS.CURRENCIES.READ,
            PERMISSIONS.REPORTS.SALES,
            PERMISSIONS.DASHBOARD.VIEW
          ],
          category: "built-in",
          isBuiltIn: true
        },
        {
          id: "financial_analyst",
          name: "محلل مالي",
          description: "صلاحيات التحليل المالي والتقارير",
          permissions: [
            PERMISSIONS.SALES.READ,
            PERMISSIONS.BUYS.READ,
            PERMISSIONS.TREASURY.READ,
            PERMISSIONS.DEBTS.READ,
            ...Object.values(PERMISSIONS.REPORTS),
            PERMISSIONS.DASHBOARD.ANALYTICS
          ],
          category: "built-in",
          isBuiltIn: true
        }
      ];
      setTemplates(defaultTemplates);
      localStorage.setItem('permissionTemplates', JSON.stringify(defaultTemplates));
    }
  }, []);

  // فلترة الصلاحيات المتاحة
  const filteredPermissions = availablePermissions.filter(permission => {
    const [module, action] = permission.split(':');
    
    const matchesSearch = permission.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = filterModule === "all" || module === filterModule;
    const matchesAction = filterAction === "all" || action === filterAction;
    
    return matchesSearch && matchesModule && matchesAction;
  });

  // إضافة صلاحية
  const addPermission = (permission: string) => {
    if (!selectedPermissions.includes(permission)) {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  // إزالة صلاحية
  const removePermission = (permission: string) => {
    setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
  };

  // تطبيق قالب
  const applyTemplate = (template: PermissionTemplate) => {
    setSelectedPermissions([...template.permissions]);
    toast.success(`تم تطبيق قالب: ${template.name}`);
  };

  // حفظ قالب جديد
  const saveTemplate = () => {
    if (!newTemplate.name || selectedPermissions.length === 0) {
      toast.error("يرجى ملء اسم القالب وتحديد صلاحيات");
      return;
    }

    const template: PermissionTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      description: newTemplate.description,
      permissions: [...selectedPermissions],
      category: newTemplate.category,
      isBuiltIn: false
    };

    const updatedTemplates = [...templates, template];
    setTemplates(updatedTemplates);
    localStorage.setItem('permissionTemplates', JSON.stringify(updatedTemplates));
    
    setNewTemplate({ name: "", description: "", category: "custom" });
    setShowTemplateModal(false);
    toast.success("تم حفظ القالب بنجاح");
  };

  // تصدير الصلاحيات
  const exportPermissions = () => {
    const data = {
      permissions: selectedPermissions,
      timestamp: new Date().toISOString(),
      version: "1.0"
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permissions_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("تم تصدير الصلاحيات بنجاح");
  };

  // استيراد الصلاحيات
  const importPermissions = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.permissions && Array.isArray(data.permissions)) {
          setSelectedPermissions(data.permissions);
          toast.success("تم استيراد الصلاحيات بنجاح");
        } else {
          toast.error("ملف غير صالح");
        }
      } catch (error) {
        toast.error("خطأ في قراءة الملف");
      }
    };
    reader.readAsText(file);
  };

  // الحصول على الوحدات المتاحة
  const getAvailableModules = () => {
    return [...new Set(availablePermissions.map(p => p.split(':')[0]))];
  };

  // الحصول على العمليات المتاحة
  const getAvailableActions = () => {
    return [...new Set(availablePermissions.map(p => p.split(':')[1]))];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Settings className="w-6 h-6 ml-3 text-blue-600" />
          محرر الصلاحيات المتقدم
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            حفظ كقالب
          </button>
          
          <button
            onClick={exportPermissions}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            تصدير
          </button>
          
          <label className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 cursor-pointer">
            استيراد
            <input
              type="file"
              accept=".json"
              onChange={importPermissions}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* القوالب المحفوظة */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="w-5 h-5 ml-2 text-green-600" />
            القوالب المحفوظة
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    template.isBuiltIn ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {template.isBuiltIn ? 'مدمج' : 'مخصص'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {template.permissions.length} صلاحية
                  </span>
                  <button
                    onClick={() => applyTemplate(template)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    تطبيق
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* الصلاحيات المتاحة */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Shield className="w-5 h-5 ml-2 text-blue-600" />
            الصلاحيات المتاحة
          </h3>
          
          {/* فلاتر البحث */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث في الصلاحيات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">جميع الوحدات</option>
                {getAvailableModules().map(module => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>
              
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">جميع العمليات</option>
                {getAvailableActions().map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* قائمة الصلاحيات */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPermissions.map((permission) => (
              <div
                key={permission}
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedPermissions.includes(permission)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => selectedPermissions.includes(permission) 
                  ? removePermission(permission) 
                  : addPermission(permission)
                }
              >
                <PermissionBadge permission={permission} size="sm" />
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(permission)}
                  onChange={() => {}}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
              </div>
            ))}
          </div>
        </div>

        {/* الصلاحيات المحددة */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Users className="w-5 h-5 ml-2 text-green-600" />
              الصلاحيات المحددة
            </h3>
            <span className="text-sm text-gray-500">
              {selectedPermissions.length} صلاحية
            </span>
          </div>
          
          {selectedPermissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>لم يتم تحديد أي صلاحيات</p>
            </div>
          ) : (
            <>
              {/* ملخص الصلاحيات */}
              <PermissionsSummary 
                permissions={selectedPermissions} 
                showDetails={false}
                className="mb-4"
              />
              
              {/* قائمة الصلاحيات المحددة */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedPermissions.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <PermissionBadge permission={permission} size="sm" variant="success" />
                    <button
                      onClick={() => removePermission(permission)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      إزالة
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedPermissions([])}
                  className="w-full bg-red-100 text-red-700 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors"
                >
                  مسح جميع الصلاحيات
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* نافذة حفظ القالب */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">حفظ قالب جديد</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم القالب
                </label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: مدير المبيعات المخصص"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوصف
                </label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="وصف مختصر للقالب..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الفئة
                </label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="custom">مخصص</option>
                  <option value="department">قسم</option>
                  <option value="role">دور وظيفي</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveTemplate}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                حفظ القالب
              </button>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
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

export default AdvancedPermissionsEditor;

import React from 'react';
import { Shield, Users, Settings, Eye, Edit, Plus, Trash2 } from 'lucide-react';
import PermissionBadge from './PermissionBadge';

interface PermissionsSummaryProps {
  permissions: string[];
  role?: string;
  showDetails?: boolean;
  className?: string;
}

const PermissionsSummary: React.FC<PermissionsSummaryProps> = ({ 
  permissions, 
  role, 
  showDetails = false,
  className = ""
}) => {
  // تجميع الصلاحيات حسب الوحدة
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const [module] = permission.split(':');
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {} as Record<string, string[]>);

  // حساب إحصائيات الصلاحيات
  const stats = {
    total: permissions.length,
    modules: Object.keys(groupedPermissions).length,
    create: permissions.filter(p => p.includes(':create')).length,
    read: permissions.filter(p => p.includes(':read') || p.includes(':view') || p.includes(':list')).length,
    update: permissions.filter(p => p.includes(':update') || p.includes(':edit')).length,
    delete: permissions.filter(p => p.includes(':delete')).length,
  };

  // ترجمة أسماء الوحدات
  const getModuleNameArabic = (module: string) => {
    switch (module) {
      case 'sales': return 'المبيعات';
      case 'buys': return 'المشتريات';
      case 'customers': return 'العملاء';
      case 'debts': return 'الديون';
      case 'treasury': return 'الخزينة';
      case 'currencies': return 'العملات';
      case 'users': return 'المستخدمين';
      case 'reports': return 'التقارير';
      case 'dashboard': return 'لوحة التحكم';
      case 'nationalities': return 'الجنسيات';
      default: return module;
    }
  };

  if (permissions.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>لا توجد صلاحيات محددة</p>
      </div>
    );
  }

  // إذا كان المستخدم مدير، عرض رسالة خاصة
  if (role === 'admin' || permissions.includes('*')) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-6">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">صلاحيات المدير</h3>
          <p className="text-red-100">هذا المستخدم لديه جميع الصلاحيات في النظام</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <Shield className="w-6 h-6 mx-auto mb-1 text-blue-600" />
          <div className="text-lg font-bold text-blue-800">{stats.total}</div>
          <div className="text-xs text-blue-600">إجمالي الصلاحيات</div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <Settings className="w-6 h-6 mx-auto mb-1 text-purple-600" />
          <div className="text-lg font-bold text-purple-800">{stats.modules}</div>
          <div className="text-xs text-purple-600">الوحدات</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <Plus className="w-6 h-6 mx-auto mb-1 text-green-600" />
          <div className="text-lg font-bold text-green-800">{stats.create}</div>
          <div className="text-xs text-green-600">إنشاء</div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <Eye className="w-6 h-6 mx-auto mb-1 text-blue-600" />
          <div className="text-lg font-bold text-blue-800">{stats.read}</div>
          <div className="text-xs text-blue-600">قراءة</div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <Edit className="w-6 h-6 mx-auto mb-1 text-yellow-600" />
          <div className="text-lg font-bold text-yellow-800">{stats.update}</div>
          <div className="text-xs text-yellow-600">تحديث</div>
        </div>
      </div>

      {/* عرض الصلاحيات حسب الوحدة */}
      {showDetails && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center">
            <Users className="w-4 h-4 ml-2" />
            الصلاحيات حسب الوحدة
          </h4>
          
          {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
            <div key={module} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full ml-2"></span>
                {getModuleNameArabic(module)}
                <span className="text-xs text-gray-500 mr-2">({modulePermissions.length})</span>
              </h5>
              
              <div className="flex flex-wrap gap-2">
                {modulePermissions.map((permission) => (
                  <PermissionBadge 
                    key={permission} 
                    permission={permission} 
                    size="sm"
                    showIcon={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* عرض مبسط للصلاحيات */}
      {!showDetails && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">الصلاحيات المتاحة:</h4>
          <div className="flex flex-wrap gap-2">
            {permissions.slice(0, 10).map((permission) => (
              <PermissionBadge 
                key={permission} 
                permission={permission} 
                size="sm"
              />
            ))}
            {permissions.length > 10 && (
              <span className="inline-flex items-center px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                +{permissions.length - 10} أخرى
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsSummary;

import React from 'react';
import { Shield, Eye, Edit, Trash2, Plus, FileText, Users, DollarSign } from 'lucide-react';

interface PermissionBadgeProps {
  permission: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const PermissionBadge: React.FC<PermissionBadgeProps> = ({ 
  permission, 
  size = 'md', 
  showIcon = true, 
  variant = 'default' 
}) => {
  // استخراج الوحدة والعملية من الصلاحية
  const [module, action] = permission.split(':');
  
  // تحديد الأيقونة بناءً على نوع العملية
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="w-3 h-3" />;
      case 'read': case 'view': case 'list': return <Eye className="w-3 h-3" />;
      case 'update': case 'edit': return <Edit className="w-3 h-3" />;
      case 'delete': return <Trash2 className="w-3 h-3" />;
      default: return <Shield className="w-3 h-3" />;
    }
  };

  // تحديد أيقونة الوحدة
  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'users': return <Users className="w-3 h-3" />;
      case 'sales': case 'buys': return <DollarSign className="w-3 h-3" />;
      case 'reports': return <FileText className="w-3 h-3" />;
      default: return <Shield className="w-3 h-3" />;
    }
  };

  // تحديد لون الشارة بناءً على نوع العملية
  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800 border-green-200';
      case 'read': case 'view': case 'list': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'update': case 'edit': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'delete': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // تحديد لون الشارة بناءً على المتغير
  const getVariantColor = (variant: string) => {
    switch (variant) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'danger': return 'bg-red-100 text-red-800 border-red-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return getActionColor(action);
    }
  };

  // تحديد حجم الشارة
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm': return 'px-2 py-1 text-xs';
      case 'lg': return 'px-4 py-2 text-sm';
      default: return 'px-3 py-1 text-xs';
    }
  };

  // ترجمة أسماء العمليات للعربية
  const getActionNameArabic = (action: string) => {
    switch (action) {
      case 'create': return 'إنشاء';
      case 'read': return 'قراءة';
      case 'view': return 'عرض';
      case 'list': return 'قائمة';
      case 'update': return 'تحديث';
      case 'edit': return 'تحرير';
      case 'delete': return 'حذف';
      case 'payment': return 'دفع';
      case 'analytics': return 'تحليلات';
      default: return action;
    }
  };

  // ترجمة أسماء الوحدات للعربية
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

  const colorClasses = getVariantColor(variant);
  const sizeClasses = getSizeClasses(size);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${colorClasses} ${sizeClasses}`}>
      {showIcon && (
        <span className="flex items-center">
          {getModuleIcon(module)}
        </span>
      )}
      <span>
        {getActionNameArabic(action)} {getModuleNameArabic(module)}
      </span>
      {showIcon && size !== 'sm' && (
        <span className="flex items-center opacity-70">
          {getActionIcon(action)}
        </span>
      )}
    </span>
  );
};

export default PermissionBadge;

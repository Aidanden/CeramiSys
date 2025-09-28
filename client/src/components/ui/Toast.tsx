'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// إضافة CSS للأنيميشن
const toastStyles = `
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .toast-enter {
    animation: slideInRight 0.3s ease-out forwards;
  }
  
  .toast-exit {
    animation: slideOutRight 0.3s ease-in forwards;
  }
`;

// إضافة الستايلز إلى الصفحة
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = toastStyles;
  document.head.appendChild(styleSheet);
}

// أنواع الإشعارات
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// واجهة الإشعار
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// واجهة السياق
interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  confirm: (title: string, message?: string) => Promise<boolean>;
}

// إنشاء السياق
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook لاستخدام الإشعارات
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// مكون الإشعار الفردي
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <span className="w-5 h-5 text-green-500 font-bold">✓</span>;
      case 'error':
        return <span className="w-5 h-5 text-red-500 font-bold">✕</span>;
      case 'warning':
        return <span className="w-5 h-5 text-yellow-500 font-bold">⚠</span>;
      case 'info':
        return <span className="w-5 h-5 text-blue-500 font-bold">ℹ</span>;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-white border-green-200 shadow-green-100';
      case 'error':
        return 'bg-white border-red-200 shadow-red-100';
      case 'warning':
        return 'bg-white border-yellow-200 shadow-yellow-100';
      case 'info':
        return 'bg-white border-blue-200 shadow-blue-100';
    }
  };

  const getTitleColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
    }
  };

  const getMessageColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-400';
      case 'error':
        return 'border-red-400';
      case 'warning':
        return 'border-yellow-400';
      case 'info':
        return 'border-blue-400';
    }
  };

  return (
    <div className={`w-full max-w-sm ${getBackgroundColor()} border-r-4 ${getBorderColor()} rounded-lg shadow-xl pointer-events-auto toast-enter hover:scale-105 hover:shadow-2xl transition-transform duration-200`}>
      <div className="px-4 py-3">
        <div className="flex items-start">
          <div className="flex-shrink-0 ml-3 mt-0.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center">
              {getIcon()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${getTitleColor()} leading-tight`}>
              {toast.title}
            </p>
            {toast.message && (
              <p className={`mt-1 text-xs ${getMessageColor()} leading-relaxed`}>
                {toast.message}
              </p>
            )}
            {toast.action && (
              <div className="mt-2">
                <button
                  onClick={toast.action.onClick}
                  className={`text-xs font-medium ${getTitleColor()} hover:underline transition-colors duration-200`}
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="mr-2 flex-shrink-0">
            <button
              onClick={() => onRemove(toast.id)}
              className={`rounded-full p-1.5 ${getMessageColor()} hover:bg-gray-100 hover:bg-opacity-30 transition-all duration-200 hover:scale-110`}
            >
              <span className="sr-only">إغلاق</span>
              <span className="w-3 h-3 font-bold text-xs flex items-center justify-center">×</span>
            </button>
          </div>
        </div>
      </div>
      {/* شريط التقدم */}
      <div className="h-1 bg-gray-100 rounded-b-lg overflow-hidden">
        <div 
          className={`h-full ${getBorderColor().replace('border-', 'bg-')} transition-all duration-300 ease-linear`}
          style={{
            animation: `shrink ${toast.duration || 5000}ms linear forwards`
          }}
        />
      </div>
    </div>
  );
};

// مكون التأكيد
const ConfirmDialog: React.FC<{
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* خلفية مظلمة */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onCancel} />
      
      {/* مربع التأكيد */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <span className="w-6 h-6 text-yellow-500 ml-3 font-bold text-xl">⚠</span>
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          </div>
          
          {message && (
            <p className="text-sm text-gray-600 mb-6">
              {message}
            </p>
          )}
          
          <div className="flex justify-end space-x-3 space-x-reverse">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              تأكيد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// مزود الإشعارات
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message?: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  // إضافة إشعار
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // إزالة تلقائية بعد المدة المحددة
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  // إزالة إشعار
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // إشعار نجاح
  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  // إشعار خطأ
  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 7000 });
  }, [addToast]);

  // إشعار تحذير
  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  // إشعار معلومات
  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  // مربع تأكيد
  const confirm = useCallback((title: string, message?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({ title, message, resolve });
    });
  }, []);

  // معالجة التأكيد
  const handleConfirm = () => {
    if (confirmDialog) {
      confirmDialog.resolve(true);
      setConfirmDialog(null);
    }
  };

  // معالجة الإلغاء
  const handleCancel = () => {
    if (confirmDialog) {
      confirmDialog.resolve(false);
      setConfirmDialog(null);
    }
  };

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    confirm,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* حاوية الإشعارات */}
      <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none max-w-sm">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>

      {/* مربع التأكيد */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ToastContext.Provider>
  );
};

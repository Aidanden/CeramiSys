"use client";

import React from "react";
import { useGetAllScreensQuery } from "@/state/permissionsApi";

interface ScreenPermissionsSelectorProps {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
}

export const ScreenPermissionsSelector: React.FC<ScreenPermissionsSelectorProps> = ({
  selectedPermissions,
  onChange,
}) => {
  const { data: screensData, isLoading } = useGetAllScreensQuery();
  
  const screensByCategory = screensData?.screensByCategory || {};
  const categories = screensData?.categories || {};

  const handleToggle = (permission: string) => {
    if (selectedPermissions.includes(permission)) {
      onChange(selectedPermissions.filter(p => p !== permission));
    } else {
      onChange([...selectedPermissions, permission]);
    }
  };

  const handleSelectAll = () => {
    const allPermissions = Object.values(screensByCategory)
      .flat()
      .map((screen: any) => screen.permission);
    onChange(allPermissions);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  if (isLoading) {
    return <div className="text-center py-4">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">صلاحيات الشاشات</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            تحديد الكل
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            إلغاء التحديد
          </button>
        </div>
      </div>

      {Object.entries(screensByCategory).map(([category, screens]) => (
        <div key={category} className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">
            {categories[category]}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(screens as any[]).map((screen) => (
              <label
                key={screen.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition"
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(screen.permission)}
                  onChange={() => handleToggle(screen.permission)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{screen.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>عدد الشاشات المحددة:</strong> {selectedPermissions.length}
        </p>
      </div>
    </div>
  );
};

export default ScreenPermissionsSelector;

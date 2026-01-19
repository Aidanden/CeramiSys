"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Shield, Users, TrendingUp, Download } from "lucide-react";
import { useGetUsersQuery } from "@/state/usersApi";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from "@/config/permissions";
import PermissionBadge from "./PermissionBadge";

interface PermissionAnalysis {
  totalUsers: number;
  totalPermissions: number;
  roleDistribution: { role: string; count: number; color: string }[];
  permissionUsage: { permission: string; users: number }[];
  securityRisks: { type: string; description: string; severity: 'low' | 'medium' | 'high' }[];
  moduleAccess: { module: string; users: number; percentage: number }[];
}

const PermissionsReport = () => {
  const [analysis, setAnalysis] = useState<PermissionAnalysis | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'roles' | 'permissions' | 'security'>('overview');
  
  const { data: usersData } = useGetUsersQuery();
  const users = usersData?.data?.users || [];

  // تحليل البيانات
  useEffect(() => {
    if (users.length === 0) return;

    // توزيع الأدوار
    const roleCount: Record<string, number> = {};
    users.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });

    const roleDistribution = Object.entries(roleCount).map(([role, count], index) => ({
      role,
      count,
      color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]
    }));

    // استخدام الصلاحيات
    const permissionCount: Record<string, number> = {};
    users.forEach(user => {
      const userPermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
      userPermissions.forEach(permission => {
        permissionCount[permission] = (permissionCount[permission] || 0) + 1;
      });
    });

    const permissionUsage = Object.entries(permissionCount)
      .map(([permission, users]) => ({ permission, users }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);

    // الوصول للوحدات
    const moduleCount: Record<string, Set<string>> = {};
    users.forEach(user => {
      const userPermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
      userPermissions.forEach(permission => {
        const module = permission.split(':')[0];
        if (!moduleCount[module]) moduleCount[module] = new Set();
        moduleCount[module].add(user.id);
      });
    });

    const moduleAccess = Object.entries(moduleCount).map(([module, userSet]) => ({
      module,
      users: userSet.size,
      percentage: Math.round((userSet.size / users.length) * 100)
    }));

    // تحليل المخاطر الأمنية
    const securityRisks = [];
    
    // عدد المديرين
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (adminCount > 3) {
      securityRisks.push({
        type: 'كثرة المديرين',
        description: `يوجد ${adminCount} مديرين في النظام، مما قد يشكل خطراً أمنياً`,
        severity: 'high' as const
      });
    }

    // المستخدمين غير النشطين مع صلاحيات عالية
    const inactiveHighPrivUsers = users.filter(u => !u.isActive && ['admin', 'manager'].includes(u.role));
    if (inactiveHighPrivUsers.length > 0) {
      securityRisks.push({
        type: 'مستخدمين غير نشطين',
        description: `${inactiveHighPrivUsers.length} مستخدمين غير نشطين لديهم صلاحيات عالية`,
        severity: 'medium' as const
      });
    }

    // عدم وجود مستخدمين للمراجعة
    const viewerCount = users.filter(u => u.role === 'viewer').length;
    if (viewerCount === 0) {
      securityRisks.push({
        type: 'عدم وجود مراجعين',
        description: 'لا يوجد مستخدمين بدور المراجع للمراقبة',
        severity: 'low' as const
      });
    }

    setAnalysis({
      totalUsers: users.length,
      totalPermissions: Object.values(PERMISSIONS).flatMap(m => Object.values(m)).length,
      roleDistribution,
      permissionUsage,
      securityRisks,
      moduleAccess
    });
  }, [users]);

  // تصدير التقرير
  const exportReport = () => {
    if (!analysis) return;

    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalUsers: analysis.totalUsers,
        totalPermissions: analysis.totalPermissions,
        securityRisksCount: analysis.securityRisks.length
      },
      roleDistribution: analysis.roleDistribution,
      permissionUsage: analysis.permissionUsage,
      moduleAccess: analysis.moduleAccess,
      securityRisks: analysis.securityRisks
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permissions_report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!analysis) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحليل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <BarChart className="w-6 h-6 ml-3 text-blue-600" />
          تقرير تحليل الصلاحيات
        </h2>
        
        <button
          onClick={exportReport}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          تصدير التقرير
        </button>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'نظرة عامة', icon: TrendingUp },
            { id: 'roles', label: 'توزيع الأدوار', icon: Users },
            { id: 'permissions', label: 'استخدام الصلاحيات', icon: Shield },
            { id: 'security', label: 'التحليل الأمني', icon: Shield }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedView(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                selectedView === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-blue-500">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-gray-900">{analysis.totalUsers}</p>
                <p className="text-gray-600">إجمالي المستخدمين</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-green-500">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-green-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-gray-900">{analysis.totalPermissions}</p>
                <p className="text-gray-600">إجمالي الصلاحيات</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-yellow-500">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-yellow-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-gray-900">{analysis.securityRisks.length}</p>
                <p className="text-gray-600">تحذيرات أمنية</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-purple-500">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-gray-900">{analysis.roleDistribution.length}</p>
                <p className="text-gray-600">أنواع الأدوار</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roles Distribution */}
      {selectedView === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">توزيع الأدوار</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analysis.roleDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ role, count }) => `${role}: ${count}`}
                >
                  {analysis.roleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">تفاصيل الأدوار</h3>
            <div className="space-y-3">
              {analysis.roleDistribution.map((role) => (
                <div key={role.role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: role.color }}
                    ></div>
                    <span className="font-medium">{role.role}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{role.count}</span>
                    <span className="text-sm text-gray-500 mr-1">
                      ({Math.round((role.count / analysis.totalUsers) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Usage */}
      {selectedView === 'permissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">أكثر الصلاحيات استخداماً</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysis.permissionUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="permission" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">الوصول للوحدات</h3>
            <div className="space-y-3">
              {analysis.moduleAccess.map((module) => (
                <div key={module.module} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{module.module}</span>
                    <span className="text-sm text-gray-600">
                      {module.users} مستخدم ({module.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${module.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Analysis */}
      {selectedView === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="w-5 h-5 ml-2 text-yellow-600" />
              تحليل المخاطر الأمنية
            </h3>
            
            {analysis.securityRisks.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <h4 className="text-lg font-medium text-green-800 mb-2">لا توجد مخاطر أمنية</h4>
                <p className="text-green-600">نظام الصلاحيات يبدو آمناً</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analysis.securityRisks.map((risk, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border-r-4 ${
                      risk.severity === 'high' ? 'bg-red-50 border-red-500' :
                      risk.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start">
                      <Shield className={`w-5 h-5 mt-0.5 ml-3 ${
                        risk.severity === 'high' ? 'text-red-600' :
                        risk.severity === 'medium' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                      <div>
                        <h4 className={`font-medium ${
                          risk.severity === 'high' ? 'text-red-800' :
                          risk.severity === 'medium' ? 'text-yellow-800' :
                          'text-blue-800'
                        }`}>
                          {risk.type}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          risk.severity === 'high' ? 'text-red-700' :
                          risk.severity === 'medium' ? 'text-yellow-700' :
                          'text-blue-700'
                        }`}>
                          {risk.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsReport;

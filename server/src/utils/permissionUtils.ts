
/**
 * تطبيع الصلاحيات من مصادر مختلفة (JSON، مصفوفة، نص) إلى مصفوفة نصوص
 */
export const normalizePermissions = (permissions: any): string[] => {
    if (!permissions) return [];

    // إذا كانت مصفوفة
    if (Array.isArray(permissions)) {
        return permissions
            .filter(p => typeof p === 'string' && p.trim().length > 0)
            .map(p => p.trim());
    }

    // إذا كان نص (JSON string)
    if (typeof permissions === 'string') {
        try {
            const parsed = JSON.parse(permissions);
            return normalizePermissions(parsed);
        } catch {
            // إذا لم يكن JSON، نعتبره صلاحية واحدة إذا لم يكن فارغاً
            return permissions.trim().length > 0 ? [permissions.trim()] : [];
        }
    }

    // إذا كان كائن (Object) مثل { "0": "perm1", "1": "perm2" }
    if (typeof permissions === 'object') {
        return Object.values(permissions)
            .filter(p => typeof p === 'string' && p.trim().length > 0)
            .map(p => (p as string).trim());
    }

    return [];
};

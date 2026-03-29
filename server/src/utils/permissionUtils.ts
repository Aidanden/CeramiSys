
/**
 * تطبيع الصلاحيات من مصادر مختلفة (JSON، مصفوفة، نص) إلى مصفوفة نصوص
 */
export const normalizePermissions = (permissions: any): string[] => {
    console.log('🔧 [normalizePermissions] Input:', {
        value: permissions,
        type: typeof permissions,
        isArray: Array.isArray(permissions),
        isNull: permissions === null,
        isUndefined: permissions === undefined
    });

    if (!permissions) {
        console.log('❌ [normalizePermissions] Empty input, returning []');
        return [];
    }

    // إذا كانت مصفوفة
    if (Array.isArray(permissions)) {
        const result = permissions
            .filter(p => typeof p === 'string' && p.trim().length > 0)
            .map(p => p.trim());
        console.log('✅ [normalizePermissions] Array input, result:', result);
        return result;
    }

    // إذا كان نص (JSON string)
    if (typeof permissions === 'string') {
        try {
            const parsed = JSON.parse(permissions);
            console.log('🔄 [normalizePermissions] Parsed JSON string:', parsed);
            return normalizePermissions(parsed);
        } catch {
            // إذا لم يكن JSON، نعتبره صلاحية واحدة إذا لم يكن فارغاً
            const result = permissions.trim().length > 0 ? [permissions.trim()] : [];
            console.log('✅ [normalizePermissions] String input (not JSON), result:', result);
            return result;
        }
    }

    // إذا كان كائن (Object) مثل { "0": "perm1", "1": "perm2" }
    // هذا يحدث عندما يحفظ Prisma array كـ JSON object
    if (typeof permissions === 'object') {
        const values = Object.values(permissions);
        const result = values
            .filter(p => typeof p === 'string' && p.trim().length > 0)
            .map(p => (p as string).trim());
        console.log('✅ [normalizePermissions] Object input, values:', values, 'result:', result);
        return result;
    }

    console.log('❌ [normalizePermissions] Unknown type, returning []');
    return [];
};

import prisma from '../models/prismaClient';

export class SettingsService {
    /**
     * الحصول على جميع الإعدادات العامة
     */
    static async getAllSettings() {
        return await prisma.globalSettings.findMany();
    }

    /**
     * الحصول على إعداد معين بمفتاحه
     */
    static async getSettingByKey(key: string) {
        const setting = await prisma.globalSettings.findUnique({
            where: { key },
        });
        return setting ? setting.value : null;
    }

    /**
     * تحديث أو إنشاء إعداد
     */
    static async updateSetting(key: string, value: string) {
        return await prisma.globalSettings.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }

    /**
     * الحصول على أسعار الصرف الحالية
     */
    static async getExchangeRates() {
        const usdRate = await this.getSettingByKey('USD_EXCHANGE_RATE') || '1.0';
        const eurRate = await this.getSettingByKey('EUR_EXCHANGE_RATE') || '1.0';

        return {
            USD_EXCHANGE_RATE: Number(usdRate),
            EUR_EXCHANGE_RATE: Number(eurRate),
        };
    }
}

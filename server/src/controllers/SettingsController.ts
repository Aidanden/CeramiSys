import { Request, Response } from 'express';
import { SettingsService } from '../services/SettingsService';

export class SettingsController {
    /**
     * الحصول على جميع الإعدادات
     */
    static async getAllSettings(req: Request, res: Response) {
        try {
            const settings = await SettingsService.getAllSettings();
            res.json(settings);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * الحصول على أسعار الصرف
     */
    static async getExchangeRates(req: Request, res: Response) {
        try {
            const rates = await SettingsService.getExchangeRates();
            res.json(rates);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * تحديث إعداد معين
     */
    static async updateSetting(req: Request, res: Response) {
        try {
            const { key, value } = req.body;
            if (!key) {
                res.status(400).json({ error: 'مفتاح الإعداد مطلوب' });
                return;
            }
            const setting = await SettingsService.updateSetting(key, String(value));
            res.json(setting);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}

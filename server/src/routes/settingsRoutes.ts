import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController';
import { authenticateToken } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorization';
import { SCREEN_PERMISSIONS } from '../constants/screenPermissions';

const router = Router();

router.get('/',
    authenticateToken,
    authorizePermissions([SCREEN_PERMISSIONS.SYSTEM_SETTINGS, SCREEN_PERMISSIONS.ALL]),
    SettingsController.getAllSettings
);

router.get('/exchange-rates',
    authenticateToken,
    // مسموح للجميع برؤية أسعار الصرف (تستخدم في الفواتير)
    SettingsController.getExchangeRates
);

router.post('/update',
    authenticateToken,
    authorizePermissions([SCREEN_PERMISSIONS.SYSTEM_SETTINGS, SCREEN_PERMISSIONS.ALL]),
    SettingsController.updateSetting
);

export default router;

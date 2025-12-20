import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController';

const router = Router();

router.get('/', SettingsController.getAllSettings);
router.get('/exchange-rates', SettingsController.getExchangeRates);
router.post('/update', SettingsController.updateSetting);

export default router;

import express from 'express';
import { getSettings, updateSettings, getPaymentSettings, testTaxConfiguration } from '../controllers/settingsController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Admin routes (protected)
router.get('/admin/settings', authenticate, authorize('admin'), getSettings);
router.put('/admin/settings', authenticate, authorize('admin'), updateSettings);
router.get('/admin/settings/test-tax', authenticate, authorize('admin'), testTaxConfiguration);

// Public route for payment settings (only public key)
router.get('/settings/payment', getPaymentSettings);

export default router;


import { Router } from 'express';
import {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
    getVendorServices,
} from '../controllers/serviceController';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/fileUpload';

const router = Router();

// Public routes
router.get('/services', getAllServices);
router.get('/service/:id', getServiceById);

// Protected routes (Vendor only)
router.post('/create', authenticate, upload.array('images', 5), createService);
router.get('/vendor/services', authenticate, getVendorServices);
router.put('/service/:id', authenticate, upload.array('images', 5), updateService);
router.delete('/service/:id', authenticate, deleteService);

export default router;


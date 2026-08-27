import { Router } from 'express';
import {
  getVideoPurposes,
  getVideoPurpose,
  createVideoPurpose,
  updateVideoPurpose,
  deleteVideoPurpose,
} from '../controllers/videoPurposeController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getVideoPurposes);
router.get('/:id', getVideoPurpose);
router.post('/', createVideoPurpose);
router.put('/:id', updateVideoPurpose);
router.delete('/:id', deleteVideoPurpose);

export default router;


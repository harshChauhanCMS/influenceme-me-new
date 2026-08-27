import { Router } from 'express';
import {
  getShowcaseVideos,
  getShowcaseVideo,
  createShowcaseVideo,
  updateShowcaseVideo,
  deleteShowcaseVideo,
  getVideosByPurpose,
} from '../controllers/showcaseVideoController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';

const router = Router();

// Public route to get videos by purpose
router.get('/purpose/:purposeName', getVideosByPurpose);

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getShowcaseVideos);
router.get('/:id', getShowcaseVideo);
router.post('/', createShowcaseVideo);
router.put('/:id', updateShowcaseVideo);
router.delete('/:id', deleteShowcaseVideo);

export default router;


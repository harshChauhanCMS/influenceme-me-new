import { Router } from 'express';
import {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogStats,
} from '../controllers/blogController';
import { uploadBlogFile, uploadBlogMedia } from '../controllers/blogUploadController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats', getBlogStats);
router.get('/', getAllBlogs);
router.get('/:id', getBlogById);
router.post('/upload', uploadBlogMedia.single('file'), uploadBlogFile); // File upload route
router.post('/', createBlog);
router.put('/:id', updateBlog);
router.delete('/:id', deleteBlog);

export default router;


import { Router } from 'express';
import {
  getPublishedBlogs,
  getPublishedBlog,
} from '../controllers/blogController';

const router = Router();

// Public routes (no authentication required)
router.get('/', getPublishedBlogs);
router.get('/:slugOrId', getPublishedBlog);

export default router;


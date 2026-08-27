import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getChannel, disconnect, youtubeCallback, saveYouTubeData } from '../controllers/youtubeController';

/**
 * Router for /api/youtube (channel + disconnect).
 * Mount: app.use('/api/youtube', youtubeRoutes)
 */
const router = Router();

// @route   GET /api/youtube/channel
// @desc    Get YouTube channel data for authenticated user (refreshes token if expired)
// @access  Private (JWT)
router.get('/channel', authenticate, getChannel);

// @route   POST /api/youtube/disconnect
// @desc    Remove stored YouTube tokens for the user
// @access  Private (JWT)
router.post('/disconnect', authenticate, disconnect);

// @route   POST /api/youtube/data
// @desc    Save YouTube channel data from frontend to DB
// @access  Private (JWT)
router.post('/data', authenticate, saveYouTubeData);

export default router;

/**
 * Router for OAuth callback (no /api prefix so redirect URI matches Google Console).
 * Mount: app.use('/auth', youtubeCallbackRouter)
 * Result: GET /auth/youtube/callback
 */
export const youtubeCallbackRouter = Router();
youtubeCallbackRouter.get('/youtube/callback', youtubeCallback);

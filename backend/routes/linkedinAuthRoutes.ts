import { Router } from 'express';
import { loginRedirect, callback } from '../controllers/linkedinAuthController';

/**
 * Router for LinkedIn OAuth (no /api prefix so redirect URI matches LinkedIn Developer Portal).
 * Mount: app.use('/auth', linkedinCallbackRouter)
 * Result: GET /auth/linkedin, GET /auth/linkedin/callback (and trailing-slash variants)
 */
export const linkedinCallbackRouter = Router();
linkedinCallbackRouter.get('/linkedin', loginRedirect);
linkedinCallbackRouter.get('/linkedin/', loginRedirect);
linkedinCallbackRouter.get('/linkedin/callback', callback);
linkedinCallbackRouter.get('/linkedin/callback/', callback);

import { Router } from 'express';
import {
  instagramLoginRedirect,
  instagramBusinessOAuthEntry,
  instagramBusinessCallback,
  facebookLoginRedirect,
  callback,
  getAccount,
  getProfile,
  getInsights,
  getMedia,
  getFacebookDetails,
  getInstagramDetails,
  getFacebookPageInsights,
  getInstagramBusinessInsights,
  getCombinedPlatformInsights,
} from '../controllers/instagramAuthController';

/**
 * Router for Instagram OAuth (no /api prefix so redirect URI matches Meta Dashboard).
 * Mount: app.use('/auth', instagramAuthCallbackRouter)
 * Result: GET /auth/instagram, GET /auth/instagram/business, GET /auth/facebook, GET /auth/callback
 */
export const instagramAuthCallbackRouter = Router();
instagramAuthCallbackRouter.get('/instagram', instagramLoginRedirect);
/** Instagram API with Instagram Login — oauth on instagram.com; callback may be same path ?code= */
instagramAuthCallbackRouter.get('/instagram/business', instagramBusinessOAuthEntry);
instagramAuthCallbackRouter.get(
  '/instagram/business/callback',
  instagramBusinessCallback,
);
instagramAuthCallbackRouter.get('/facebook', facebookLoginRedirect);
instagramAuthCallbackRouter.get('/callback', callback);

// Legacy callback aliases kept intentionally for existing app dashboard configurations.
// New canonical callback is GET /auth/callback with `state=instagram|facebook`.
instagramAuthCallbackRouter.get('/instagram/callback', callback);
instagramAuthCallbackRouter.get('/facebook/callback', callback);

/**
 * Router for Instagram API (account, profile).
 * Mount: app.use('/api/instagram', instagramApiRouter)
 * Result: GET /api/instagram/account, GET /api/instagram/profile
 */
const instagramApiRouter = Router();
instagramApiRouter.get('/account', getAccount);
instagramApiRouter.get('/profile', getProfile);
instagramApiRouter.get('/insights', getInsights);
instagramApiRouter.get('/media', getMedia);
instagramApiRouter.get('/facebook/details', getFacebookDetails);
instagramApiRouter.get('/instagram/details', getInstagramDetails);
instagramApiRouter.get('/facebook/insights', getFacebookPageInsights);
instagramApiRouter.get('/instagram/insights', getInstagramBusinessInsights);
instagramApiRouter.get('/combined/insights', getCombinedPlatformInsights);

export default instagramApiRouter;

import { Request, Response } from 'express';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';

/**
 * Build app redirect URL for after LinkedIn OAuth callback.
 * Set LINKEDIN_APP_REDIRECT in .env; default is influenceme://auth/linkedin/callback.
 */
function getAppRedirectUrl(params: { code?: string; state?: string; error?: string }): string {
  const base = process.env.LINKEDIN_APP_REDIRECT || 'influenceme://auth/linkedin/callback';
  const search = new URLSearchParams();
  if (params.code) search.set('code', params.code);
  if (params.state) search.set('state', params.state);
  if (params.error) search.set('error', params.error);
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * @desc    Start LinkedIn login – redirect user to LinkedIn OAuth
 * @route   GET /auth/linkedin
 * @access  Public
 */
export const loginRedirect = (req: Request, res: Response): void => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    res.status(500).send('LinkedIn OAuth not configured (LINKEDIN_CLIENT_ID / LINKEDIN_REDIRECT_URI)');
    return;
  }

  const state = (req.query.state as string) || '';
  const scope = 'openid profile email';

  const url =
    `${LINKEDIN_AUTH_URL}` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    (state ? `&state=${encodeURIComponent(state)}` : '');

  res.redirect(url);
};

/**
 * @desc    OAuth callback – pass through code and state to app redirect
 * @route   GET /auth/linkedin/callback
 * @access  Public (LinkedIn redirects here)
 */
export const callback = (req: Request, res: Response): void => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const errorParam = req.query.error as string | undefined;

  if (errorParam) {
    res.redirect(getAppRedirectUrl({ state: state || undefined, error: errorParam }));
    return;
  }

  if (!code) {
    res.redirect(getAppRedirectUrl({ state: state || undefined, error: 'missing_code' }));
    return;
  }

  res.redirect(getAppRedirectUrl({ code, state: state || undefined }));
};

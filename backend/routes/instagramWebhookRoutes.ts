import { Router } from 'express';
import { 
    verifyWebhook, 
    handleWebhook,
    getVerifyToken 
} from '../controllers/instagramWebhookController';

const router = Router();

/**
 * Instagram Webhook Routes
 * 
 * These routes handle webhooks from Meta/Instagram
 */

// GET - Webhook verification (Meta calls this to verify your endpoint)
router.get('/', verifyWebhook);

// POST - Webhook events (Meta sends notifications here)
router.post('/', handleWebhook);

// GET - Get verify token (for testing/reference only)
router.get('/verify-token', getVerifyToken);

export default router;



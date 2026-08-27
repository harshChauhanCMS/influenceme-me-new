import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/responseHelper';

const VERSION = '1.0.12'; // Update this when deploying - Payment verification fixes
const BUILD_DATE = new Date().toISOString();
const DEPLOYMENT_INFO = {
    version: VERSION,
    buildDate: BUILD_DATE,
    lastDeployment: BUILD_DATE,
    features: [
        'Payment verification immediate status update',
        'Auto-verification system with multiple fallback approaches',
        'Razorpay payment status sync',
        'Deal payment status auto-update',
        'Transaction and invoice auto-generation',
        'Improved payment error handling'
    ]
};

export const getVersion = async (req: Request, res: Response) => {
    try {
        return successResponse(res, 'Version information retrieved successfully', DEPLOYMENT_INFO, 200);
    } catch (error: any) {
        return successResponse(res, 'Version check failed', { version: VERSION, error: error.message }, 500);
    }
};


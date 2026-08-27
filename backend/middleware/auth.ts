import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import User, { IUser } from '../models/user';
import { errorResponse } from '../utils/responseHelper'; // Using the unified user model

// Extend Express Request type to include the user property
declare global {
    namespace Express {
        interface Request {
            user?: IUser | null;
        }
    }
}

export interface AuthenticatedRequest extends Request {
    // user?: IUser | null;
    file?: Express.Multer.File;
    body: any;
    query: {
        page?: string;
        limit?: string;
        campaignId?: string;
        status?: string;
        paymentType?: string;
        [key: string]: string | undefined;
    };
}

export {}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                return res.status(500).json({ message: 'Server configuration error: JWT secret not set.' });
            }
            const decoded = jwt.verify(token, secret) as { id: string };

            // Get user from the token and attach to request object
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ message: 'Not authorized, user not found.' });
            }
            req.user = user;

            // Update session lastActivity if session exists
            if ((user as any).activeSessions && Array.isArray((user as any).activeSessions)) {
                const sessionIndex = (user as any).activeSessions.findIndex((s: any) => s.token === token);
                if (sessionIndex !== -1) {
                    // Use an atomic update to avoid optimistic concurrency conflicts under parallel requests.
                    User.updateOne(
                        { _id: user._id, 'activeSessions.token': token },
                        { $set: { 'activeSessions.$.lastActivity': new Date() } }
                    ).catch((err: any) => {
                        console.error('Error updating session activity:', err);
                    });
                }
            }

            next();

        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided.' });
    }
};

/**
 * Same as authenticate but does not return 401 when no token is sent.
 * Use for routes that work both with and without login (e.g. save when JWT present).
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
        return next();
    }
    try {
        const token = req.headers.authorization.split(' ')[1];
        const secret = process.env.JWT_SECRET;
        if (!secret) return next();
        const decoded = jwt.verify(token, secret) as { id: string };
        const user = await User.findById(decoded.id).select('-password');
        if (user) req.user = user;
    } catch {
        // ignore invalid token
    }
    next();
};

/**
 * Middleware to authorize users based on their role
 * @param {...string} roles - Allowed roles for the route
 */
export const authorize = (...roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !req.user.role) {
            errorResponse(res, "Access denied. User role missing.", 403);
            return;
        }

        if (!roles.includes(req.user.role)) {
            errorResponse(res, `Access denied. Role '${req.user.role}' is not authorized.`, 403);
            return;
        }

        next();
    };
};
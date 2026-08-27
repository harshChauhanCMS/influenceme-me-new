import * as jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

// Define the structure of the JWT payload
interface ITokenPayload {
    id: string | Types.ObjectId;
    role: string;
    email: string | undefined;
    phoneNumber: string | undefined;
    name: string;
}

/**
 * Generates a JWT for a user.
 * @param id - The user's MongoDB ObjectId.
 * @param role - The user's role (e.g., 'influencer', 'brand').
 * @param details - Additional user details to include in the token.
 * @returns The generated JWT string.
 */
export const generateToken = (id: string | Types.ObjectId, role: string, details: { email?: string, name: string, phone?: string }): string => {
    const payload: ITokenPayload = {
        id,
        role,
        phoneNumber: details.phone,
        email: details.email,
        name: details.name
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables.');
    }

    return jwt.sign(payload, secret, {
        expiresIn: '30d', // Token expires in 30 days
    });
};

import multer = require('multer');
import path = require('path');
import fs = require('fs');
import { Request } from 'express';

// Define the storage destination and filename
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        const uploadPath = path.join(__dirname, '../../public/uploads');
        // Ensure the directory exists
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        // Create a unique filename to prevent overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
        cb(null, filename);
    },
});

// File filter to accept only images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check if mimetype is set and starts with 'image/'
    // Also check file extension as fallback
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    const hasValidMimeType = file.mimetype && file.mimetype.startsWith('image/');
    const hasValidExtension = validExtensions.includes(fileExtension);
    
    // Accept if either mimetype is valid or extension is valid
    if (hasValidMimeType || hasValidExtension) {
        cb(null, true);
    } else {
        console.error('File upload rejected:', {
            mimetype: file.mimetype,
            originalname: file.originalname,
            extension: fileExtension,
        });
        cb(new Error('Not an image! Please upload only images.'));
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB file size limit
});

// Video file filter for showcase videos
const videoFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const validVideoMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const validImageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const validVideoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mpeg', '.mpg'];
    const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    // Check if it's a video or image
    const isVideo = validVideoMimeTypes.includes(file.mimetype) || validVideoExtensions.includes(fileExtension);
    const isImage = validImageMimeTypes.includes(file.mimetype) || validImageExtensions.includes(fileExtension);
    
    if (isVideo || isImage) {
        cb(null, true);
    } else {
        console.error('File upload rejected:', {
            mimetype: file.mimetype,
            originalname: file.originalname,
            extension: fileExtension,
        });
        cb(new Error('Invalid file type! Please upload only videos or images.'));
    }
};

// Upload middleware for showcase videos (accepts videos and images)
export const uploadVideo = multer({
    storage: storage,
    fileFilter: videoFileFilter,
    limits: { fileSize: 1024 * 1024 * 500 } // 500MB file size limit for videos
});

// --- Firebase Storage upload (memory storage for buffer upload) ---
const memoryStorage = multer.memoryStorage();

// File filter for Firebase Storage: images + PDFs, 10MB
const firebaseStorageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const validMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
    ];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
    const hasValidMimeType = file.mimetype && validMimeTypes.includes(file.mimetype);
    const hasValidExtension = validExtensions.includes(fileExtension);
    if (hasValidMimeType || hasValidExtension) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed: images (JPEG, PNG, GIF, WebP) or PDF.'));
    }
};

export const uploadMemorySingle = multer({
    storage: memoryStorage,
    fileFilter: firebaseStorageFileFilter,
    limits: { fileSize: 1024 * 1024 * 10 }, // 10MB
});

export const uploadMemoryArray = multer({
    storage: memoryStorage,
    fileFilter: firebaseStorageFileFilter,
    limits: { fileSize: 1024 * 1024 * 10 }, // 10MB per file
});

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseHelper';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure storage for blog media files
const blogStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/blogs');
    // Ensure the directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Create a unique filename to prevent overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `blog-${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, filename);
  },
});

// File filter for blog images and videos
const blogFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const validImageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const validVideoMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/ogg'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const validVideoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mpeg', '.mpg', '.ogg'];
  
  const isImage = validImageMimeTypes.includes(file.mimetype) || validImageExtensions.includes(fileExtension);
  const isVideo = validVideoMimeTypes.includes(file.mimetype) || validVideoExtensions.includes(fileExtension);
  
  if (isImage || isVideo) {
    cb(null, true);
  } else {
    console.error('Blog file upload rejected:', {
      mimetype: file.mimetype,
      originalname: file.originalname,
      extension: fileExtension,
    });
    cb(new Error('Invalid file type! Please upload only images or videos.'));
  }
};

// Upload middleware for blog media (images and videos)
export const uploadBlogMedia = multer({
  storage: blogStorage,
  fileFilter: blogFileFilter,
  limits: { fileSize: 1024 * 1024 * 100 } // 100MB file size limit
});

/**
 * @desc    Upload blog image/video
 * @route   POST /api/admin/blogs/upload
 * @access  Private (Admin only)
 */
export const uploadBlogFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    // Generate the public URL for the uploaded file
    // Files are served from /uploads path via static middleware
    const fileUrl = `/uploads/blogs/${req.file.filename}`;
    // Use the frontend domain for public access, or API domain as fallback
    const baseUrl = process.env.FRONTEND_URL || process.env.API_URL || 'https://api.influence-me.in';
    const fullUrl = `${baseUrl}${fileUrl}`;

    return successResponse(
      res,
      'File uploaded successfully',
      {
        url: fullUrl,
        path: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      200
    );
  } catch (error: any) {
    console.error('Blog file upload error:', error);
    return errorResponse(res, error.message || 'Failed to upload file', 500);
  }
};


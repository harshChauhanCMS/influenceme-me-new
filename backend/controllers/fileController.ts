import { Request, Response } from "express";
import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { errorResponse, successResponse } from "../utils/responseHelper";
import {
  isFirebaseStorageConfigured,
  uploadBufferToFirebase,
} from "../config/firebaseStorage";

/**
 * Download/Serve static files (images, documents, etc.)
 * GET /api/file/download?path=uploads/image.jpg
 */
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;

    if (!filePath) {
      return errorResponse(res, "File path is required");
    }

    // Security: Prevent directory traversal attacks
    const normalizedPath = path
      .normalize(filePath)
      .replace(/^(\.\.(\/|\\|$))+/, "");

    // Construct absolute file path
    const absolutePath = path.join(process.cwd(), "public", normalizedPath);

    // Security: Ensure the file is within the public directory
    const publicDir = path.join(process.cwd(), "public");
    if (!absolutePath.startsWith(publicDir)) {
      return res.status(403).json({
        status: false,
        message: "Access denied: Invalid file path",
      });
    }

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        status: false,
        message: "File not found",
      });
    }

    // Check if it's a file (not a directory)
    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) {
      return res.status(400).json({
        status: false,
        message: "Invalid file path",
      });
    }

    // Set appropriate content type based on file extension
    const ext = path.extname(absolutePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    // Set headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stats.size);

    // Enable caching for better performance
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    // For downloads (optional - uncomment if you want to force download)
    // const filename = path.basename(absolutePath);
    // res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);

    // Handle stream errors
    fileStream.on("error", (error) => {
      console.error("File stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          status: false,
          message: "Error reading file",
        });
      }
    });
  } catch (error: unknown) {
    console.error("File download error:", error);
    if (!res.headersSent) {
      errorResponse(res, "Failed to download file");
    }
  }
};

/**
 * Proxy external images (Instagram, Facebook, etc.) to bypass CORS restrictions
 * GET /api/file/proxy?url=https://scontent.cdninstagram.com/...
 */
export const proxyImage = async (req: Request, res: Response) => {
  try {
    let imageUrl = req.query.url as string;

    if (!imageUrl) {
      return errorResponse(res, "Image URL is required");
    }

    // Decode the URL if it's encoded (may be double-encoded from frontend)
    try {
      // Try decoding twice in case of double encoding
      let decoded = decodeURIComponent(imageUrl);
      // Check if it's still encoded
      if (decoded !== imageUrl && decoded.includes("%")) {
        decoded = decodeURIComponent(decoded);
      }
      imageUrl = decoded;
    } catch (e) {
      // If decoding fails, use original
      console.log("⚠️ URL decode failed, using original");
    }

    console.log("🔍 Proxying image:", imageUrl.substring(0, 150));

    // Security: Only allow specific domains
    const allowedDomains = [
      "scontent.cdninstagram.com",
      "scontent-",
      "video.xx.fbcdn.net",
      "scontent.xx.fbcdn.net",
      "cdninstagram.com",
      "fbcdn.net",
    ];

    let urlObj: URL;
    try {
      urlObj = new URL(imageUrl);
    } catch (e) {
      return res.status(400).json({
        status: false,
        message: "Invalid URL format",
      });
    }

    const isAllowed = allowedDomains.some((domain) =>
      urlObj.hostname.includes(domain),
    );

    if (!isAllowed) {
      console.log("❌ Domain not allowed:", urlObj.hostname);
      return res.status(403).json({
        status: false,
        message: "Domain not allowed for proxying",
      });
    }

    // Fetch the image with proper headers to bypass restrictions
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.instagram.com/",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 15000, // 15 second timeout
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept redirects
    });

    // Handle redirects
    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.location
    ) {
      console.log(
        "🔄 Redirect detected, following:",
        response.headers.location,
      );
      const redirectResponse = await axios.get(response.headers.location, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://www.instagram.com/",
        },
        timeout: 15000,
      });

      const contentType =
        redirectResponse.headers["content-type"] || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", redirectResponse.data.length);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(Buffer.from(redirectResponse.data));
    }

    if (response.status !== 200) {
      console.error("❌ Non-200 status:", response.status);
      return res.status(response.status).json({
        status: false,
        message: `Failed to fetch image: ${response.statusText}`,
      });
    }

    // Determine content type from response headers or URL
    const contentType =
      response.headers["content-type"] ||
      (imageUrl.includes(".heic") ? "image/heic" : "image/jpeg");

    console.log(
      "✅ Successfully proxied image, size:",
      response.data.length,
      "bytes",
    );

    // Set appropriate headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", response.data.length);
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Send the image data
    res.send(Buffer.from(response.data));
  } catch (error: any) {
    console.error("❌ Image proxy error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: req.query.url,
    });

    if (!res.headersSent) {
      if (error.response?.status === 403) {
        return res.status(403).json({
          status: false,
          message:
            "Image access forbidden by source. The image URL may have expired or require authentication.",
        });
      }
      if (error.code === "ECONNABORTED") {
        return res.status(504).json({
          status: false,
          message: "Request timeout",
        });
      }
      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        return res.status(502).json({
          status: false,
          message: "Failed to connect to image source",
        });
      }
      return res.status(500).json({
        status: false,
        message: `Failed to proxy image: ${error.message}`,
      });
    }
  }
};

const FIREBASE_FILE_UPLOAD_FOLDER = "influenceme/file-uploads";

/**
 * Upload a single file to Firebase Storage.
 * POST /api/file/upload (multipart field: file, optional body/query: folder)
 */
export const uploadToFirebaseStorage = async (req: Request, res: Response) => {
  try {
    if (!isFirebaseStorageConfigured()) {
      return errorResponse(
        res,
        "Firebase Storage is not configured. Set FIREBASE_PROJECT_ID (or GCLOUD_PROJECT) and ensure GOOGLE_APPLICATION_CREDENTIALS or Firebase credentials are set.",
        503,
      );
    }
    if (!req.file || !req.file.buffer) {
      return errorResponse(
        res,
        "No file uploaded. Use multipart field 'file'.",
        400,
      );
    }
    const folder =
      (req.body?.folder as string) ||
      (req.query.folder as string) ||
      FIREBASE_FILE_UPLOAD_FOLDER;
    const result = await uploadBufferToFirebase(
      req.file.buffer,
      req.file.mimetype,
      folder,
      req.file.originalname,
    );
    return successResponse(
      res,
      "File uploaded successfully",
      {
        url: result.url,
        secure_url: result.secure_url,
        public_id: result.public_id,
      },
      201,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("Firebase Storage upload error:", error);
    return errorResponse(res, message, 500);
  }
};

/**
 * Upload multiple files to Firebase Storage.
 * POST /api/file/upload-multiple (multipart field: files, optional body/query: folder)
 */
export const uploadMultipleToFirebaseStorage = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!isFirebaseStorageConfigured()) {
      return errorResponse(
        res,
        "Firebase Storage is not configured. Set FIREBASE_PROJECT_ID (or GCLOUD_PROJECT) and ensure GOOGLE_APPLICATION_CREDENTIALS or Firebase credentials are set.",
        503,
      );
    }
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return errorResponse(
        res,
        "No files uploaded. Use multipart field 'files'.",
        400,
      );
    }
    const folder =
      (req.body?.folder as string) ||
      (req.query.folder as string) ||
      FIREBASE_FILE_UPLOAD_FOLDER;
    const results: Array<{
      url: string;
      secure_url: string;
      public_id: string;
    }> = [];
    for (const file of files) {
      if (!file.buffer) continue;
      const result = await uploadBufferToFirebase(
        file.buffer,
        file.mimetype,
        folder,
        file.originalname,
      );
      results.push({
        url: result.url,
        secure_url: result.secure_url,
        public_id: result.public_id,
      });
    }
    return successResponse(
      res,
      "Files uploaded successfully",
      { files: results },
      201,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("Firebase Storage upload multiple error:", error);
    return errorResponse(res, message, 500);
  }
};

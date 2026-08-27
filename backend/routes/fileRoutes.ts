import { Router } from "express";
import { downloadFile, proxyImage, uploadToFirebaseStorage, uploadMultipleToFirebaseStorage } from "../controllers/fileController";
import { uploadMemorySingle, uploadMemoryArray } from "../middleware/fileUpload";

const router = Router();

// Public route - no authentication required for file downloads
// GET /api/file/download?path=uploads/image.jpg
router.get('/download', downloadFile);

// Public route - proxy external images (Instagram, Facebook, etc.)
// GET /api/file/proxy?url=https://scontent.cdninstagram.com/...
router.get('/proxy', proxyImage);

// Firebase Storage upload - single file (multipart field: file, optional body/query: folder)
// POST /api/file/upload
router.post('/upload', uploadMemorySingle.single('file'), uploadToFirebaseStorage);

// Firebase Storage upload - multiple files (multipart field: files, optional body/query: folder)
// POST /api/file/upload-multiple
router.post('/upload-multiple', uploadMemoryArray.array('files', 10), uploadMultipleToFirebaseStorage);

export default router;


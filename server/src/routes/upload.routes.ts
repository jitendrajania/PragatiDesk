import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max file size
  fileFilter: (req, file, cb) => {
    // Allow PDF, Excel, Word, Text, Images, CSV
    const allowedExts = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|csv|txt|zip/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedExts.test(ext)) {
      return cb(null, true);
    }
    cb(new Error(`File type '.${ext}' is not supported.`));
  },
});

// Upload single or multiple files
router.post('/', authenticate, upload.array('files', 10), (req: AuthRequest, res: Response): void => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      res.status(400).json({ error: 'No files were uploaded.' });
      return;
    }

    const uploadedFiles = files.map((file) => ({
      fileName: file.originalname,
      filePath: `/uploads/${file.filename}`,
      fileType: file.mimetype,
      fileSize: file.size,
    }));

    res.json({ files: uploadedFiles });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message || 'File upload failed.' });
  }
});

export default router;

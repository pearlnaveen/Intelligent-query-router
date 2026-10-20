// certificateRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  getCertificates,
  uploadCertificate,
  deleteCertificate,
  getStaffWardSubmissions,
  approveSubmission,
  rejectSubmission,
  clearSubmission,
  clearAllRejected,
} from "../../controllers/student/certificateController.js";
import { authenticate } from "../../middlewares/requireauth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/certificates");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Only accept PDF files
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Student certificate endpoints
router.get("/list", authenticate, getCertificates);
router.post("/upload", authenticate, upload.single("certificate"), uploadCertificate);
router.delete("/delete/:id", authenticate, deleteCertificate);

// Staff ward certificate & marksheet approval endpoints
router.get("/staff/submissions", authenticate, getStaffWardSubmissions);
router.post("/staff/approve", authenticate, approveSubmission);
router.post("/staff/reject", authenticate, rejectSubmission);
router.post("/staff/clear", authenticate, clearSubmission);
router.post("/staff/clear-all", authenticate, clearAllRejected);

export default router;

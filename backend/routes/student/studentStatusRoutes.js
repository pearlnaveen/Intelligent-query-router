import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate } from "../../middlewares/requireauth.js";
import {
  getStudentsWithStatus,
  getStudentStatusHistory,
  updateStudentStatus,
  getTutorList,
  serveDocument,
  clearStudentStatusHistory,
} from "../../controllers/student/studentStatusController.js";

// ─── Multer storage for PDFs ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "student-status");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.fieldname + "_" + Date.now() + "_" + Math.round(Math.random() * 1e6) + ext;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const uploadFields = upload.fields([
  { name: "supportingDocument", maxCount: 1 },
  { name: "returnDocument", maxCount: 1 },
  { name: "returnSupportingDoc", maxCount: 1 },
]);

const router = express.Router();

// ── Named / static routes FIRST ───────────────────────────────────────────────
router.get("/students", authenticate, getStudentsWithStatus);
router.get("/tutors", authenticate, getTutorList);
router.get("/document/:filename", authenticate, serveDocument);

// ── History & Clear History aliases (both DELETE & POST supported) ───────────
router.get("/:studentId/history", authenticate, getStudentStatusHistory);
router.delete("/:studentId/history", authenticate, clearStudentStatusHistory);
router.post("/:studentId/clear-history", authenticate, clearStudentStatusHistory);
router.delete("/clear-history/:studentId", authenticate, clearStudentStatusHistory);
router.post("/clear-history/:studentId", authenticate, clearStudentStatusHistory);

// ── Update Status ────────────────────────────────────────────────────────────
router.post("/:studentId/update", authenticate, uploadFields, updateStudentStatus);
router.put("/:studentId/update", authenticate, uploadFields, updateStudentStatus);

export default router;



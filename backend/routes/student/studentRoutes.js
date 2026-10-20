import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getStudentDetails, updateStudentDetails, uploadRelationPhotoHandler } from "../../controllers/student/studentController.js";
import { authenticate } from "../../middlewares/requireauth.js"; // middlewares for authentication

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `relation_${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});
const uploadRelationPhoto = multer({ storage });

const router = express.Router();

// ✅ Route to fetch student details (Requires authentication)
router.get("/student", authenticate, getStudentDetails);
router.get("/student/profile", authenticate, getStudentDetails);

// ✅ Route to update student details (Requires authentication)
router.put("/student/update", authenticate, updateStudentDetails);

// ✅ Route to upload relation photo (Requires authentication)
router.post("/student/upload-relation-photo", authenticate, uploadRelationPhoto.single("photo"), uploadRelationPhotoHandler);

export default router; // ✅ Use ES module export

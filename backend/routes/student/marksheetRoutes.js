import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Marksheet from "../../models/student/marksheet.js";
import { User, StudentDetails } from "../../models/index.js";
import { sendEmail } from "../../utils/emailService.js";
import { authenticate } from "../../middlewares/requireauth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads/marksheets");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for marksheet files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const cleanOriginalName = (file.originalname || "marksheet.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${cleanOriginalName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Image files are allowed!"), false);
    }
  },
});

// Middleware to accept file under any common field name ('file', 'marksheet', 'certificate', etc.)
const handleUploadMiddleware = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File size must be under 15MB" });
      }
      return res.status(400).json({ success: false, message: err.message || "File upload failed" });
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

// Single marksheet file upload
router.post("/upload", authenticate, handleUploadMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const filePath = `uploads/marksheets/${req.file.filename}`;
    const effectiveUserId =
      req.body.userId || req.body.Userid || req.user?.userId || req.user?.Userid;
    const marksheetName = req.body.marksheetName || req.body.name;
    const category = req.body.category || "Semester";

    // If userId and marksheetName are provided, persist immediately to database
    if (effectiveUserId && marksheetName) {
      try {
        const existingRecord = await Marksheet.findOne({
          where: { Userid: effectiveUserId, marksheetName, category },
        });

        if (existingRecord) {
          if (existingRecord.verification_status !== "Approved") {
            existingRecord.file_path = filePath;
            existingRecord.file_name = req.file.originalname;
            existingRecord.receivedStatus = true;
            existingRecord.verification_status = "Pending";
            await existingRecord.save();
          }
        } else {
          await Marksheet.create({
            Userid: effectiveUserId,
            marksheetName,
            category,
            receivedStatus: true,
            file_path: filePath,
            file_name: req.file.originalname,
            verification_status: "Pending",
          });
        }
      } catch (dbErr) {
        console.warn("⚠️ Warning: could not immediately persist marksheet status:", dbErr.message);
      }
    }

    res.json({
      success: true,
      message: "Marksheet file uploaded successfully",
      filePath,
      fileName: req.file.originalname,
      originalName: req.file.originalname,
    });
  } catch (error) {
    console.error("Error uploading marksheet:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to upload marksheet" });
  }
});

// Handler for fetching marksheets
const getMarksheetsHandler = async (req, res) => {
  try {
    const rawUserId = req.params.userId || req.query.userId || req.query.UserId;
    const targetUserId =
      rawUserId && !isNaN(rawUserId)
        ? parseInt(rawUserId)
        : req.user?.userId || req.user?.Userid;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const marksheets = await Marksheet.findAll({
      where: { Userid: targetUserId },
      order: [["category", "ASC"], ["marksheetName", "ASC"]],
    });
    res.json({ success: true, marksheets });
  } catch (error) {
    console.error("Error fetching marksheets:", error);
    res.status(500).json({ success: false, message: "Server error fetching marksheets" });
  }
};

// Aliases for fetching marksheets
router.get("/list", authenticate, getMarksheetsHandler);
router.get("/my-marksheets", authenticate, getMarksheetsHandler);
router.get("/", authenticate, getMarksheetsHandler);
router.get("/:userId", authenticate, getMarksheetsHandler);

// Bulk update marksheets
const updateMarksheetsHandler = async (req, res) => {
  try {
    const userId = req.body.userId || req.body.Userid || req.user?.userId || req.user?.Userid;
    const marksheets = req.body.marksheets;

    if (!userId || !Array.isArray(marksheets)) {
      return res.status(400).json({ success: false, message: "Invalid data: userId and marksheets array required" });
    }

    let hasReceivedUpdates = false;

    // Process each marksheet update
    for (const item of marksheets) {
      const {
        marksheetName,
        category,
        receivedStatus,
        issueDate,
        certificateNumber,
        file_path,
        file_name,
      } = item;

      const isReceived = Boolean(receivedStatus);
      const hasUploadedFile = Boolean(file_path && String(file_path).trim() !== "");
      const isReadyForApproval = isReceived && hasUploadedFile;

      if (isReadyForApproval) hasReceivedUpdates = true;

      const existingRecord = await Marksheet.findOne({
        where: { Userid: userId, marksheetName, category: category || "Semester" },
      });

      if (existingRecord) {
        // If already approved, do not allow editing
        if (existingRecord.verification_status === "Approved") {
          continue;
        }

        existingRecord.receivedStatus = isReceived;
        existingRecord.issueDate = isReceived ? (issueDate || null) : null;
        existingRecord.certificateNumber = isReceived ? (certificateNumber || null) : null;
        if (file_path !== undefined) {
          existingRecord.file_path = isReceived ? (file_path || null) : null;
        }
        if (file_name !== undefined) {
          existingRecord.file_name = isReceived ? (file_name || null) : null;
        }

        existingRecord.verification_status = isReadyForApproval ? "Pending" : null;
        await existingRecord.save();
      } else {
        await Marksheet.create({
          Userid: userId,
          marksheetName,
          category: category || "Semester",
          receivedStatus: isReceived,
          issueDate: isReceived ? (issueDate || null) : null,
          certificateNumber: isReceived ? (certificateNumber || null) : null,
          file_path: isReceived ? (file_path || null) : null,
          file_name: isReceived ? (file_name || null) : null,
          verification_status: isReadyForApproval ? "Pending" : null,
        });
      }
    }

    // Send notification to allocated tutor if records were marked received
    if (hasReceivedUpdates) {
      try {
        const student = await StudentDetails.findOne({
          where: { Userid: userId },
        });

        if (student && student.staffId) {
          const tutor = await User.findByPk(student.staffId);
          const tutorEmail = tutor?.userMail || student.tutorEmail;

          if (tutorEmail) {
            sendEmail({
              from: process.env.EMAIL_USER || "noreply@college.edu",
              to: tutorEmail,
              subject: "New Semester Marksheet Submissions - Pending Approval",
              text: `Dear ${tutor?.userName || "Tutor"},

Student ${student.studentName || "Student"} (Reg No: ${student.registerNumber || "N/A"}) has updated semester marksheet records.

Please log in to review and verify the submissions on the Ward Certificate & Marksheet Approval page.

Best Regards,
College Record Management System`,
            }).catch((emailErr) => {
              console.warn("⚠️ Could not send tutor email notification:", emailErr.message);
            });
          }
        }
      } catch (notifyErr) {
        console.warn("⚠️ Tutor notification lookup error:", notifyErr.message);
      }
    }

    const updatedMarksheets = await Marksheet.findAll({
      where: { Userid: userId },
      order: [["category", "ASC"], ["marksheetName", "ASC"]],
    });

    res.json({
      success: true,
      message: "Marksheets updated successfully and sent for tutor verification",
      marksheets: updatedMarksheets,
    });
  } catch (error) {
    console.error("Error updating marksheets:", error);
    res.status(500).json({ success: false, message: error.message || "Server error updating marksheets" });
  }
};

router.post("/update", authenticate, updateMarksheetsHandler);
router.put("/update", authenticate, updateMarksheetsHandler);
router.post("/save", authenticate, updateMarksheetsHandler);

export default router;

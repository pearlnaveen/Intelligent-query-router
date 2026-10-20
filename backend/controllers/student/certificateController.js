// certificateController.js
import { Certificate, User, StudentDetails } from "../../models/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sendEmail } from "../../utils/emailService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all certificates for a user (Standardized)
export const getCertificates = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.query.UserId;
    const userId = targetUserId ? parseInt(targetUserId) : (req.user?.userId || req.user?.Userid);

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const certificates = await Certificate.findAll({
      where: { Userid: userId },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(certificates);
  } catch (error) {
    console.error("❌ Error fetching certificates:", error);
    res.status(500).json({ message: "Failed to fetch certificates", error: error.message });
  }
};

// Upload certificate (Standardized)
export const uploadCertificate = async (req, res) => {
  const { certificate_type, certificate_name } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const userId = req.user?.userId || req.user?.Userid || (req.body.Userid ? parseInt(req.body.Userid) : null);

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Fetch user and student details for notifications
    const user = await User.findByPk(userId);
    if (!user || !user.userMail) {
      return res.status(404).json({ message: "Student details not found" });
    }

    const student = await StudentDetails.findOne({
      where: { Userid: userId },
      include: [{ model: User, as: "staffAdvisor", attributes: ["userMail", "userName"] }]
    });

    let tutorEmail = student?.tutorEmail || student?.staffAdvisor?.userMail;
    let tutorName = student?.staffAdvisor?.userName || "Tutor";
    if (!tutorEmail && student?.staffId) {
      try {
        const tutorUser = await User.findByPk(student.staffId);
        if (tutorUser) {
          tutorEmail = tutorUser.userMail;
          tutorName = tutorUser.userName || tutorName;
        }
      } catch (tutorErr) {
        console.warn("Tutor lookup warning:", tutorErr.message);
      }
    }

    const filePath = `uploads/certificates/${file.filename}`;
    const certName = certificate_name || file.originalname;

    // Check if this certificate already exists for this student
    const existingCert = await Certificate.findOne({
      where: { Userid: userId, certificate_name: certName },
    });

    if (existingCert) {
      // Disallow replacing if already approved
      if (existingCert.verification_status === "Approved") {
        const newUploadedPath = path.join(__dirname, "../../uploads/certificates", file.filename);
        if (fs.existsSync(newUploadedPath)) {
          try { fs.unlinkSync(newUploadedPath); } catch (e) {}
        }
        return res.status(400).json({ message: "Approved certificates cannot be replaced." });
      }

      // Delete old file from filesystem if it exists
      if (existingCert.certificate_file) {
        const oldPath = path.join(__dirname, "../../", existingCert.certificate_file);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) {}
        }
      }

      existingCert.certificate_type = certificate_type || existingCert.certificate_type || 'Academic';
      existingCert.certificate_file = filePath;
      existingCert.verification_status = 'Pending';
      existingCert.verified_by = null;
      existingCert.verified_at = null;
      existingCert.Updated_by = userId;
      await existingCert.save();

      // Send email notification to tutor
      if (tutorEmail) {
        sendEmail({
          from: user.userMail || process.env.EMAIL_USER || "noreply@college.edu",
          to: tutorEmail,
          subject: "New Certificate Uploaded - Pending Approval",
          text: `Dear ${tutorName},

A student has updated/uploaded a certificate for your approval.

Student Details:
- Register Number: ${student?.registerNumber || "N/A"}
- Name: ${user.userName || "Student"}

Certificate Details:
- Name: ${certName}
- Type: ${certificate_type || 'Academic'}

Please log in to review and verify this certificate on the Ward Certificate Approval page.

Best Regards,
College Record Management System`,
        }).catch((emailErr) => {
          console.warn("⚠️ Could not send tutor email notification:", emailErr.message);
        });
      }

      return res.status(200).json(existingCert);
    }

    const certificate = await Certificate.create({
      Userid: userId,
      certificate_type: certificate_type || 'Academic',
      certificate_name: certName,
      certificate_file: filePath,
      verification_status: 'Pending',
      Created_by: userId,
      Updated_by: userId,
    });

    console.log("✅ Certificate uploaded and record created:", certificate.id);

    // Send notification to tutor if email is available
    if (tutorEmail) {
      sendEmail({
        from: user.userMail || process.env.EMAIL_USER || "noreply@college.edu",
        to: tutorEmail,
        subject: "New Certificate Uploaded - Pending Approval",
        text: `Dear ${tutorName},

A student has uploaded a new certificate for your approval.

Student Details:
- Register Number: ${student?.registerNumber || "N/A"}
- Name: ${user.userName || "Student"}

Certificate Details:
- Name: ${certName}
- Type: ${certificate_type || 'Academic'}

Please log in to review and verify this certificate on the Ward Certificate Approval page.

Best Regards,
College Record Management System`,
      }).catch((emailErr) => {
        console.warn("⚠️ Could not send tutor email notification:", emailErr.message);
      });
    }

    res.status(201).json(certificate);
  } catch (error) {
    console.error("❌ Error uploading certificate:", error);

    // Delete file if database operation fails
    if (file) {
      const fullPath = path.join(__dirname, "../../uploads/certificates", file.filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    res.status(500).json({ message: "Failed to upload certificate", error: error.message });
  }
};

// Delete certificate (Standardized)
export const deleteCertificate = async (req, res) => {
  const { id } = req.params;

  try {
    const userId = req.user?.userId || req.user?.Userid;
    const certificate = await Certificate.findByPk(id);

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    // Authorization check
    if (certificate.Userid !== userId) {
      return res.status(403).json({ message: "Unauthorized to delete this certificate" });
    }

    // Store file path for deletion after DB record is gone
    const filePath = certificate.certificate_file;

    // Delete from database
    await certificate.destroy();

    // Delete file from filesystem
    const fullPath = path.join(__dirname, "../../", filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    res.status(200).json({ message: "Certificate deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting certificate:", error);
    res.status(500).json({ message: "Failed to delete certificate", error: error.message });
  }
};

// ==========================================
// Staff Ward Certificate & Marksheet Approval
// ==========================================

import Marksheet from "../../models/student/marksheet.js";
import Department from "../../models/student/Department.js";
import { Op } from "sequelize";

export const getStaffWardSubmissions = async (req, res) => {
  try {
    const staffId = req.user?.userId || req.user?.Userid || req.user?.id;
    const userRole = (req.user?.role || req.user?.roleName || "").toLowerCase();
    const isAdmin = userRole.includes("admin");

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 1. Get matching ward students
    let wardStudents = [];
    if (isAdmin) {
      wardStudents = await StudentDetails.findAll({
        attributes: ["studentId", "Userid", "studentName", "registerNumber", "departmentId", "staffId"],
      });
    } else {
      // Find students assigned to this staff member
      wardStudents = await StudentDetails.findAll({
        where: {
          [Op.or]: [
            { staffId: staffId },
            { staffId: String(staffId) }
          ],
        },
        attributes: ["studentId", "Userid", "studentName", "registerNumber", "departmentId", "staffId"],
      });

      // If no students assigned directly by staffId, fallback to check any students in the staff's department
      if (wardStudents.length === 0 && req.user?.departmentId) {
        wardStudents = await StudentDetails.findAll({
          where: { departmentId: req.user.departmentId },
          attributes: ["studentId", "Userid", "studentName", "registerNumber", "departmentId", "staffId"],
        });
      }
    }

    if (wardStudents.length === 0) {
      return res.json({
        success: true,
        stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
        submissions: [],
      });
    }

    // Map department acronyms
    const departments = await Department.findAll();
    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.departmentId] = d.departmentAcr || d.departmentName || "General";
    });

    // Also look up users table by registerNumber to guarantee 100% ID synchronization
    const regNumbers = wardStudents.map((st) => st.registerNumber).filter(Boolean);
    const matchedUsers = await User.findAll({
      where: { userNumber: { [Op.in]: regNumbers } },
      attributes: ["userId", "userNumber", "userName"],
    });
    const regToUserMap = {};
    matchedUsers.forEach((u) => {
      regToUserMap[u.userNumber] = u;
    });

    const studentMap = {};
    const studentUserIds = new Set();

    wardStudents.forEach((st) => {
      const matchedUser = regToUserMap[st.registerNumber];
      const actualUserId = matchedUser ? matchedUser.userId : st.Userid;

      const studentInfo = {
        studentId: st.studentId,
        userId: actualUserId,
        studentName: st.studentName || matchedUser?.userName || "Student",
        registerNumber: st.registerNumber,
        department: deptMap[st.departmentId] || "CSE",
        initial: (st.studentName || matchedUser?.userName || "S").trim().charAt(0).toUpperCase(),
      };

      // Map both st.Userid and actualUserId to handle any legacy/cached records
      if (st.Userid) {
        studentMap[st.Userid] = studentInfo;
        studentUserIds.add(st.Userid);
      }
      if (actualUserId) {
        studentMap[actualUserId] = studentInfo;
        studentUserIds.add(actualUserId);
      }
    });

    const studentUserIdArray = Array.from(studentUserIds);

    // 2. Fetch Certificates for these students
    const certificates = await Certificate.findAll({
      where: { Userid: { [Op.in]: studentUserIdArray } },
      order: [["created_at", "DESC"]],
    });

    // 3. Fetch Marksheets for these students (only received AND uploaded)
    const marksheets = await Marksheet.findAll({
      where: {
        Userid: { [Op.in]: studentUserIdArray },
        receivedStatus: true,
        file_path: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] },
        verification_status: { [Op.in]: ["Pending", "Approved", "Rejected"] },
      },
      order: [["updatedAt", "DESC"]],
    });

    // 4. Collect verifier user IDs to look up their names
    const verifierIds = new Set();
    certificates.forEach((c) => c.verified_by && verifierIds.add(c.verified_by));
    marksheets.forEach((m) => m.verified_by && verifierIds.add(m.verified_by));

    const verifierMap = {};
    if (verifierIds.size > 0) {
      const verifiers = await User.findAll({
        where: { Userid: { [Op.in]: Array.from(verifierIds) } },
        attributes: ["Userid", "userName", "userNumber"],
      });
      verifiers.forEach((v) => {
        verifierMap[v.Userid] = v.userName || v.userNumber || "Staff";
      });
    }

    // 5. Build unified submissions list
    const submissions = [];

    // Add Certificates
    certificates.forEach((cert) => {
      const st = studentMap[cert.Userid] || {
        studentName: "Student",
        registerNumber: "",
        department: "CSE",
        initial: "S",
      };

      const verifierName = cert.verified_by
        ? (verifierMap[cert.verified_by] || (cert.verified_by === staffId ? (req.user.userName || "Staff") : "Staff"))
        : null;

      submissions.push({
        id: `cert-${cert.id}`,
        rawId: cert.id,
        type: "certificate",
        studentId: st.studentId,
        userId: cert.Userid,
        studentName: st.studentName,
        registerNumber: st.registerNumber,
        department: st.department,
        initial: st.initial,
        documentName: cert.certificate_name || "Certificate",
        category: cert.certificate_type || "Academic",
        receivedStatus: true,
        issueDate: null,
        certificateNumber: null,
        status: cert.verification_status || "Pending",
        verifiedBy: verifierName,
        verifiedAt: cert.verified_at,
        filePath: cert.certificate_file,
        fileName: cert.certificate_name || "certificate.pdf",
        createdAt: cert.created_at || cert.createdAt,
      });
    });

    // Add Semester Marksheets
    marksheets.forEach((ms) => {
      const st = studentMap[ms.Userid] || {
        studentName: "Student",
        registerNumber: "",
        department: "CSE",
        initial: "S",
      };

      const verifierName = ms.verified_by
        ? (verifierMap[ms.verified_by] || (ms.verified_by === staffId ? (req.user.userName || "Staff") : "Staff"))
        : null;

      submissions.push({
        id: `marksheet-${ms.marksheetId}`,
        rawId: ms.marksheetId,
        type: "marksheet",
        studentId: st.studentId,
        userId: ms.Userid,
        studentName: st.studentName,
        registerNumber: st.registerNumber,
        department: st.department,
        initial: st.initial,
        documentName: `${ms.marksheetName} Marksheet`,
        category: ms.category === "Semester" ? "Academic" : "Personal ID",
        receivedStatus: Boolean(ms.receivedStatus),
        issueDate: ms.issueDate,
        certificateNumber: ms.certificateNumber,
        status: ms.verification_status || "Pending",
        verifiedBy: verifierName,
        verifiedAt: ms.verified_at,
        filePath: ms.file_path,
        fileName: ms.file_name || `${ms.marksheetName}.pdf`,
        createdAt: ms.createdAt || ms.updatedAt,
      });
    });

    // Sort submissions by creation / update date descending
    submissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate stats
    const stats = {
      total: submissions.length,
      pending: submissions.filter((s) => s.status === "Pending").length,
      approved: submissions.filter((s) => s.status === "Approved").length,
      rejected: submissions.filter((s) => s.status === "Rejected").length,
    };

    res.json({
      success: true,
      stats,
      submissions,
    });
  } catch (error) {
    console.error("❌ Error fetching ward submissions:", error);
    res.status(500).json({ success: false, message: "Failed to fetch submissions", error: error.message });
  }
};

// Approve a submission (Certificate or Marksheet)
export const approveSubmission = async (req, res) => {
  try {
    const staffId = req.user?.userId || req.user?.Userid || req.user?.id;
    const { type, id } = req.body;

    if (!type || !id) {
      return res.status(400).json({ success: false, message: "Type and ID required" });
    }

    if (type === "certificate") {
      const cert = await Certificate.findByPk(id);
      if (!cert) return res.status(404).json({ success: false, message: "Certificate not found" });
      cert.verification_status = "Approved";
      cert.verified_by = staffId;
      cert.verified_at = new Date();
      cert.Updated_by = staffId;
      await cert.save();
    } else if (type === "marksheet") {
      const ms = await Marksheet.findByPk(id);
      if (!ms) return res.status(404).json({ success: false, message: "Marksheet not found" });
      ms.verification_status = "Approved";
      ms.verified_by = staffId;
      ms.verified_at = new Date();
      await ms.save();
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    res.json({ success: true, message: "Approved successfully" });
  } catch (error) {
    console.error("❌ Error approving submission:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject a submission
export const rejectSubmission = async (req, res) => {
  try {
    const staffId = req.user?.userId || req.user?.Userid || req.user?.id;
    const { type, id, comments } = req.body;

    if (!type || !id) {
      return res.status(400).json({ success: false, message: "Type and ID required" });
    }

    if (type === "certificate") {
      const cert = await Certificate.findByPk(id);
      if (!cert) return res.status(404).json({ success: false, message: "Certificate not found" });
      cert.verification_status = "Rejected";
      cert.verified_by = staffId;
      cert.verified_at = new Date();
      cert.Updated_by = staffId;
      await cert.save();
    } else if (type === "marksheet") {
      const ms = await Marksheet.findByPk(id);
      if (!ms) return res.status(404).json({ success: false, message: "Marksheet not found" });
      ms.verification_status = "Rejected";
      ms.verified_by = staffId;
      ms.verified_at = new Date();
      ms.comments = comments || null;
      await ms.save();
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    res.json({ success: true, message: "Rejected successfully" });
  } catch (error) {
    console.error("❌ Error rejecting submission:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clear/permanently delete single submission
export const clearSubmission = async (req, res) => {
  try {
    const { type, id } = req.body;
    if (!type || !id) {
      return res.status(400).json({ success: false, message: "Type and ID required" });
    }

    if (type === "certificate") {
      const cert = await Certificate.findByPk(id);
      if (cert) {
        if (cert.certificate_file) {
          const fullPath = path.join(__dirname, "../../", cert.certificate_file);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (unlinkErr) {
              console.warn("Could not delete certificate file:", unlinkErr.message);
            }
          }
        }
        await cert.destroy();
      }
    } else if (type === "marksheet") {
      const ms = await Marksheet.findByPk(id);
      if (ms) {
        if (ms.file_path) {
          const fullPath = path.join(__dirname, "../../", ms.file_path);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (unlinkErr) {
              console.warn("Could not delete marksheet file:", unlinkErr.message);
            }
          }
        }
        await ms.destroy();
      }
    }

    res.json({ success: true, message: "Record permanently deleted" });
  } catch (error) {
    console.error("❌ Error deleting submission:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clear and permanently delete all rejected submissions
export const clearAllRejected = async (req, res) => {
  try {
    const staffId = req.user?.userId || req.user?.Userid || req.user?.id;
    const wardStudents = await StudentDetails.findAll({
      where: {
        [Op.or]: [{ staffId: staffId }, { staffId: String(staffId) }],
      },
      attributes: ["Userid"],
    });
    const userIds = wardStudents.map((s) => s.Userid);

    if (userIds.length > 0) {
      const rejectedCerts = await Certificate.findAll({
        where: { Userid: { [Op.in]: userIds }, verification_status: "Rejected" },
      });
      for (const cert of rejectedCerts) {
        if (cert.certificate_file) {
          const fullPath = path.join(__dirname, "../../", cert.certificate_file);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (e) {}
          }
        }
        await cert.destroy();
      }

      const rejectedMarksheets = await Marksheet.findAll({
        where: { Userid: { [Op.in]: userIds }, verification_status: "Rejected" },
      });
      for (const ms of rejectedMarksheets) {
        if (ms.file_path) {
          const fullPath = path.join(__dirname, "../../", ms.file_path);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (e) {}
          }
        }
        await ms.destroy();
      }
    }

    res.json({ success: true, message: "All rejected submissions permanently deleted" });
  } catch (error) {
    console.error("❌ Error clearing all rejected:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

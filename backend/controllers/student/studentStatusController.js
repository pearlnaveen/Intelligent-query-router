import { pool } from "../../db/db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Ensure student_statuses table exists ─────────────────────────────────────
let tableEnsured = false;
const ensureTableExists = async () => {
  if (tableEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_statuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentId INT NOT NULL,
        status ENUM('Active', 'Inactive', 'Break of Study', 'Suspended / Dismissed', 'Discontinued') NOT NULL DEFAULT 'Active',
        effectiveDate DATE NOT NULL,
        fromDate DATE DEFAULT NULL,
        toDate DATE DEFAULT NULL,
        reason VARCHAR(255) DEFAULT NULL,
        remarks TEXT DEFAULT NULL,
        supportingDocument VARCHAR(500) DEFAULT NULL,
        returnDate DATE DEFAULT NULL,
        returnDocument VARCHAR(500) DEFAULT NULL,
        returnSupportingDoc VARCHAR(500) DEFAULT NULL,
        createdBy INT DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ss_student (studentId),
        INDEX idx_ss_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    tableEnsured = true;
  } catch (err) {
    console.warn("student_statuses table check/create warning:", err.message);
  }
};

// ─── Helper: Upload directory for student status docs ────────────────────────
const ensureUploadDir = () => {
  const dir = path.join(process.cwd(), "uploads", "student-status");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// ─── GET /student-status/students ─────────────────────────────────────────────
// Fetch all students with current status, plus user/department info
export const getStudentsWithStatus = async (req, res) => {
  try {
    await ensureTableExists();

    // Fetch all students in DB by default, or filter if departmentId is explicitly specified in query
    let deptFilter = "";
    const params = [];
    if (req.query.departmentId) {
      deptFilter = "AND (sd.departmentId = ? OR u.departmentId = ?)";
      params.push(req.query.departmentId, req.query.departmentId);
    }

    // Use strict JOIN on Userid only (primary key relationship) to eliminate duplicates.
    // Wrap in subquery + GROUP BY sd.studentId as safety net.
    const query = `
      SELECT
        sd.studentId,
        sd.registerNumber,
        sd.batch,
        sd.semester,
        sd.course,
        sd.staffId,
        u.userId,
        u.userNumber                                    AS rollNumber,
        u.userName                                      AS studentName,
        u.userMail                                      AS email,
        u.profileImage,
        COALESCE(sd.departmentId, u.departmentId)       AS departmentId,
        d.departmentName,
        d.departmentAcr,
        tutor.userName                                  AS tutorName,
        COALESCE(
          (SELECT status FROM student_statuses
           WHERE studentId = sd.studentId
           ORDER BY createdAt DESC, id DESC LIMIT 1),
          'Active'
        )                                               AS currentStatus,
        (SELECT effectiveDate FROM student_statuses
         WHERE studentId = sd.studentId
         ORDER BY createdAt DESC, id DESC LIMIT 1)      AS statusEffectiveDate,
        (SELECT id FROM student_statuses
         WHERE studentId = sd.studentId
         ORDER BY createdAt DESC, id DESC LIMIT 1)      AS statusId
      FROM student_details sd
      INNER JOIN users u ON sd.Userid = u.userId
      LEFT JOIN departments d ON COALESCE(sd.departmentId, u.departmentId) = d.departmentId
      LEFT JOIN users tutor ON sd.staffId = tutor.userId
      WHERE u.roleId IN (
        SELECT roleId FROM roles WHERE LOWER(roleName) = 'student'
      )
      ${deptFilter}
      ORDER BY u.userName ASC
    `;

    const [students] = await pool.query(query, params);

    return res.json({
      status: "success",
      data: students,
      total: students.length,
    });
  } catch (error) {
    console.error("getStudentsWithStatus error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// ─── GET /student-status/:studentId/history ───────────────────────────────────
export const getStudentStatusHistory = async (req, res) => {
  try {
    await ensureTableExists();
    const { studentId } = req.params;

    const [history] = await pool.query(
      `SELECT ss.*, u.userName AS createdByName
       FROM student_statuses ss
       LEFT JOIN users u ON ss.createdBy = u.userId
       WHERE ss.studentId = ? OR ss.studentId IN (SELECT studentId FROM student_details WHERE Userid = ?)
       ORDER BY ss.createdAt DESC, ss.id DESC`,
      [studentId, studentId]
    );

    return res.json({ status: "success", data: history });
  } catch (error) {
    console.error("getStudentStatusHistory error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// ─── POST /student-status/:studentId/update ────────────────────────────────────
export const updateStudentStatus = async (req, res) => {
  try {
    await ensureTableExists();
    const { studentId } = req.params;
    const createdBy = req.user?.userId || null;
    const {
      status,
      effectiveDate,
      fromDate,
      toDate,
      reason,
      remarks,
      returnDate,
      orderRef,
    } = req.body;

    // Handle uploaded files
    const files = req.files || {};
    const supportingDocument =
      files.supportingDocument?.[0]?.filename || null;
    const returnDocument = files.returnDocument?.[0]?.filename || null;
    const returnSupportingDoc =
      files.returnSupportingDoc?.[0]?.filename || null;

    // Resolve effective date (rejoin flows supply returnDate instead)
    const resolvedEffectiveDate = effectiveDate || returnDate;

    // Validate required fields
    if (!status || !resolvedEffectiveDate) {
      return res
        .status(400)
        .json({ status: "error", message: "status and effectiveDate (or returnDate) are required" });
    }

    // Append orderRef to remarks if provided
    const finalRemarks = orderRef
      ? (remarks ? `${remarks} | Order Ref: ${orderRef}` : `Order Ref: ${orderRef}`)
      : (remarks || null);

    // Insert new status record (history preserved)
    const [result] = await pool.query(
      `INSERT INTO student_statuses
        (studentId, status, effectiveDate, fromDate, toDate, reason, remarks,
         supportingDocument, returnDate, returnDocument, returnSupportingDoc, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        studentId,
        status,
        resolvedEffectiveDate,
        fromDate || null,
        toDate || null,
        reason || null,
        finalRemarks,
        supportingDocument,
        returnDate || null,
        returnDocument,
        returnSupportingDoc,
        createdBy,
      ]
    );

    // Also sync status column in users table
    try {
      await pool.query(
        `UPDATE users SET status = ? WHERE userId = (SELECT Userid FROM student_details WHERE studentId = ?) OR userId = ?`,
        [status, studentId, studentId]
      );
    } catch (uErr) {
      console.warn("Could not sync user status column:", uErr.message);
    }

    return res.json({
      status: "success",
      message: `Student status updated to ${status}`,
      id: result.insertId,
    });
  } catch (error) {
    console.error("updateStudentStatus error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// ─── GET /student-status/tutors ───────────────────────────────────────────────
// Returns all department staff / tutors for dropdown
export const getTutorList = async (req, res) => {
  try {
    const tutorsQuery = `
      SELECT DISTINCT tutor.userId AS staffId, tutor.userName AS tutorName
      FROM users tutor
      JOIN roles r ON tutor.roleId = r.roleId
      WHERE LOWER(r.roleName) = 'staff'
      UNION
      SELECT DISTINCT tutor.userId AS staffId, tutor.userName AS tutorName
      FROM student_details sd
      JOIN users tutor ON sd.staffId = tutor.userId
      WHERE tutor.userName IS NOT NULL
      ORDER BY tutorName ASC
    `;

    const [tutors] = await pool.query(tutorsQuery);

    return res.json({ status: "success", data: tutors });
  } catch (error) {
    console.error("getTutorList error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// ─── GET /student-status/document/:filename ───────────────────────────────────
export const serveDocument = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), "uploads", "student-status", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: "error", message: "Document not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("serveDocument error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// ─── DELETE /student-status/:studentId/history ────────────────────────────────
export const clearStudentStatusHistory = async (req, res) => {
  try {
    await ensureTableExists();
    const { studentId } = req.params;

    if (!studentId || studentId === "undefined" || studentId === "null") {
      return res.status(400).json({ status: "error", message: "Invalid studentId provided" });
    }

    // Clean up files on disk
    const [records] = await pool.query(
      `SELECT supportingDocument, returnDocument, returnSupportingDoc FROM student_statuses WHERE studentId = ? OR studentId IN (SELECT studentId FROM student_details WHERE Userid = ?)`,
      [studentId, studentId]
    );

    for (const r of records) {
      for (const f of [r.supportingDocument, r.returnDocument, r.returnSupportingDoc]) {
        if (f) {
          const filePath = path.join(process.cwd(), "uploads", "student-status", f);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (_) {}
          }
        }
      }
    }

    await pool.query(
      `DELETE FROM student_statuses WHERE studentId = ? OR studentId IN (SELECT studentId FROM student_details WHERE Userid = ?)`,
      [studentId, studentId]
    );

    // Sync users.status back to Active
    try {
      await pool.query(
        `UPDATE users SET status = 'Active' WHERE userId = (SELECT Userid FROM student_details WHERE studentId = ?) OR userId = ?`,
        [studentId, studentId]
      );
    } catch (uErr) {
      console.warn("Could not reset user status column:", uErr.message);
    }

    return res.json({
      status: "success",
      message: "Student status history cleared successfully. Status reset to default (Active).",
    });
  } catch (error) {
    console.error("clearStudentStatusHistory error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};


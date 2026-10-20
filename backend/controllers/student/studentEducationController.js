import { User, StudentDetails, StudentEducation } from "../../models/index.js";
import acadamicDb from "../../models/acadamic/index.js";
import { sendEmail } from "../../utils/emailService.js";
import { Op } from "sequelize";
import XLSX from "xlsx";

// Helper to sanitize value - converts empty strings to null
const sanitize = (val) => (val === "" || val === undefined ? null : val);
const sanitizeNum = (val) => {
  if (val === "" || val === undefined || val === null) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
};
const sanitizeInt = (val) => {
  if (val === "" || val === undefined || val === null) return null;
  const n = parseInt(val);
  return isNaN(n) ? null : n;
};
const sanitizeBool = (val) => {
  if (val === undefined || val === null) return false;
  if (typeof val === "boolean") return val;
  if (val === "true" || val === 1 || val === "1") return true;
  return false;
};

// Add or update student education records (STUDENTS)
export const addOrUpdateEducationRecord = async (req, res) => {
  try {
    const {
      Userid,
      // 10th Standard
      tenth_school_name,
      tenth_board,
      tenth_percentage,
      tenth_year_of_passing,
      tenth_medium_of_study,
      tenth_tamil_marks,
      tenth_english_marks,
      tenth_maths_marks,
      tenth_science_marks,
      tenth_social_science_marks,
      // 12th Standard
      twelfth_school_name,
      twelfth_board,
      twelfth_percentage,
      twelfth_year_of_passing,
      twelfth_medium_of_study,
      twelfth_physics_marks,
      twelfth_chemistry_marks,
      twelfth_maths_marks,
      // Degree
      degree_institution_name,
      degree_name,
      degree_specialization,
      degree_medium_of_study,
      degree_year_of_passing,
      // Academic Gaps
      gap_after_tenth,
      gap_after_tenth_years,
      gap_after_tenth_reason,
      gap_after_twelfth,
      gap_after_twelfth_years,
      gap_after_twelfth_reason,
      gap_during_degree,
      gap_during_degree_years,
      gap_during_degree_reason,
    } = req.body;

    // Use authenticated user's ID as fallback
    const resolvedUserId = Userid || req.user?.userId || req.user?.Userid;

    if (!resolvedUserId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Validate percentages if provided
    const pct10 = sanitizeNum(tenth_percentage);
    const pct12 = sanitizeNum(twelfth_percentage);
    if (pct10 !== null && (pct10 < 0 || pct10 > 100)) {
      return res.status(400).json({ message: "10th percentage must be between 0 and 100" });
    }
    if (pct12 !== null && (pct12 < 0 || pct12 > 100)) {
      return res.status(400).json({ message: "12th percentage must be between 0 and 100" });
    }

    // Validate marks if provided
    const allMarks = [
      tenth_tamil_marks, tenth_english_marks, tenth_maths_marks,
      tenth_science_marks, tenth_social_science_marks,
      twelfth_physics_marks, twelfth_chemistry_marks, twelfth_maths_marks,
    ];
    for (let m of allMarks) {
      const mn = sanitizeNum(m);
      if (mn !== null && (mn < 0 || mn > 100)) {
        return res.status(400).json({ message: "Marks must be between 0 and 100" });
      }
    }

    const user = await User.findByPk(resolvedUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Build the data payload with sanitized values
    const payload = {
      tenth_school_name: sanitize(tenth_school_name),
      tenth_board: sanitize(tenth_board),
      tenth_percentage: sanitizeNum(tenth_percentage),
      tenth_year_of_passing: sanitizeInt(tenth_year_of_passing),
      tenth_medium_of_study: sanitize(tenth_medium_of_study),
      tenth_tamil_marks: sanitizeNum(tenth_tamil_marks),
      tenth_english_marks: sanitizeNum(tenth_english_marks),
      tenth_maths_marks: sanitizeNum(tenth_maths_marks),
      tenth_science_marks: sanitizeNum(tenth_science_marks),
      tenth_social_science_marks: sanitizeNum(tenth_social_science_marks),

      twelfth_school_name: sanitize(twelfth_school_name),
      twelfth_board: sanitize(twelfth_board),
      twelfth_percentage: sanitizeNum(twelfth_percentage),
      twelfth_year_of_passing: sanitizeInt(twelfth_year_of_passing),
      twelfth_medium_of_study: sanitize(twelfth_medium_of_study),
      twelfth_physics_marks: sanitizeNum(twelfth_physics_marks),
      twelfth_chemistry_marks: sanitizeNum(twelfth_chemistry_marks),
      twelfth_maths_marks: sanitizeNum(twelfth_maths_marks),

      degree_institution_name: sanitize(degree_institution_name),
      degree_name: sanitize(degree_name),
      degree_specialization: sanitize(degree_specialization),
      degree_medium_of_study: sanitize(degree_medium_of_study) || "English",
      degree_year_of_passing: sanitizeInt(degree_year_of_passing),

      gap_after_tenth: sanitizeBool(gap_after_tenth),
      gap_after_tenth_years: sanitizeBool(gap_after_tenth) ? (sanitizeInt(gap_after_tenth_years) || 0) : 0,
      gap_after_tenth_reason: sanitizeBool(gap_after_tenth) ? sanitize(gap_after_tenth_reason) : null,
      gap_after_twelfth: sanitizeBool(gap_after_twelfth),
      gap_after_twelfth_years: sanitizeBool(gap_after_twelfth) ? (sanitizeInt(gap_after_twelfth_years) || 0) : 0,
      gap_after_twelfth_reason: sanitizeBool(gap_after_twelfth) ? sanitize(gap_after_twelfth_reason) : null,
      gap_during_degree: sanitizeBool(gap_during_degree),
      gap_during_degree_years: sanitizeBool(gap_during_degree) ? (sanitizeInt(gap_during_degree_years) || 0) : 0,
      gap_during_degree_reason: sanitizeBool(gap_during_degree) ? sanitize(gap_during_degree_reason) : null,

      tutor_verification_status: false,
      Updated_by: resolvedUserId,
    };

    let education = await StudentEducation.findOne({ where: { Userid: resolvedUserId } });

    if (education) {
      // Update existing record with whatever the student has entered
      Object.keys(payload).forEach((key) => {
        education[key] = payload[key];
      });

      await education.save();
      return res.status(200).json({
        message: "Education record updated and sent for approval",
        education,
      });
    } else {
      // Create new record
      education = await StudentEducation.create({
        Userid: resolvedUserId,
        ...payload,
        Created_by: resolvedUserId,
      });
      return res.status(201).json({
        message: "Education record created and sent for approval",
        education,
      });
    }
  } catch (error) {
    console.error("❌ Error adding/updating education record:", error);
    // Return detailed error info in development
    res.status(500).json({
      message: "Error processing education record",
      error: error.message,
      details: error.errors?.map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      })),
    });
  }
};

/**
 * Helper to fetch live GPA, CGPA, and Standing Arrears directly from
 * Academic module tables (StudentGrade, StudentSemesterGPA, Semester, Course).
 */
const resolveStudentLiveAcademicData = async (userId, targetRegno = null) => {
  try {
    const {
      StudentGrade: AcadStudentGrade,
      StudentSemesterGPA: AcadStudentSemesterGPA,
      Semester: AcadSemester,
      Course: AcadCourse,
      StudentDetails: AcadStudentDetails,
      User: AcadUser,
    } = acadamicDb;

    // 1. Resolve student registration number
    const effectiveUserId =
      userId && userId !== "undefined" && userId !== "null" ? userId : null;
    let regno =
      targetRegno && targetRegno !== "undefined" && targetRegno !== "null"
        ? String(targetRegno).trim()
        : null;

    if (!regno && effectiveUserId) {
      // Try User by PK first
      if (AcadUser) {
        const user = await AcadUser.findByPk(effectiveUserId, { attributes: ["userNumber", "userId"] });
        if (user?.userNumber) {
          regno = user.userNumber;
        }
      }

      // Try StudentDetails by Userid or studentId
      if (!regno && AcadStudentDetails) {
        const studentProfile = await AcadStudentDetails.findOne({
          where: {
            [Op.or]: [
              { Userid: effectiveUserId },
              { studentId: effectiveUserId },
            ],
          },
          attributes: ["registerNumber", "studentName"],
        });

        if (studentProfile?.registerNumber) {
          regno = studentProfile.registerNumber;
        }
      }

      // If effectiveUserId itself might be a register number
      if (!regno && AcadStudentDetails && typeof effectiveUserId === "string" && !/^\d+$/.test(effectiveUserId)) {
        const byReg = await AcadStudentDetails.findOne({
          where: { registerNumber: effectiveUserId },
          attributes: ["registerNumber"],
        });
        if (byReg?.registerNumber) {
          regno = byReg.registerNumber;
        }
      }
    }

    if (!regno) return null;

    // 2. Fetch Semester GPAs and latest CGPA from StudentSemesterGPA
    let liveGpas = {};
    let latestCgpa = null;
    let hasAnyOutstandingArrearFlag = false;

    if (AcadStudentSemesterGPA) {
      const gpaRows = await AcadStudentSemesterGPA.findAll({
        where: { regno },
        include: AcadSemester
          ? [
              {
                model: AcadSemester,
                attributes: ["semesterId", "semesterNumber"],
                required: false,
              },
            ]
          : [],
        order: AcadSemester
          ? [
              [{ model: AcadSemester }, "semesterNumber", "ASC"],
              ["studentGPAId", "ASC"],
            ]
          : [["studentGPAId", "ASC"]],
      });

      let latestCredits = 0;
      for (const row of gpaRows) {
        const semNo = row.Semester?.semesterNumber;
        if (semNo && Number(semNo) >= 1 && Number(semNo) <= 8) {
          liveGpas[`semester_${semNo}_gpa`] =
            row.gpa !== null && row.gpa !== undefined ? parseFloat(row.gpa) : null;
        }
        if (row.cgpa !== null && row.cgpa !== undefined) {
          latestCgpa = parseFloat(row.cgpa);
        }
        if (row.cumulativeEarnedCredits !== null && row.cumulativeEarnedCredits !== undefined) {
          latestCredits = parseFloat(row.cumulativeEarnedCredits);
        }
        if (row.hasOutstandingArrear) {
          hasAnyOutstandingArrearFlag = true;
        }
      }
    }

    // 3. Fetch Standing Arrears from StudentGrade where grade = 'U'
    // NOTE: Query StudentGrade directly WITHOUT joining Course to avoid row multiplication
    // when a course appears multiple times in Course table across different batches/semesters.
    let standingArrearsCount = 0;
    let standingArrearsSubjects = [];

    if (AcadStudentGrade) {
      const failedGradeRows = await AcadStudentGrade.findAll({
        where: {
          regno,
          grade: "U",
        },
        attributes: ["gradeId", "courseCode", "grade", "semesterId"],
      });

      standingArrearsCount = failedGradeRows.length;

      if (failedGradeRows.length > 0) {
        const failedCodes = [...new Set(failedGradeRows.map((r) => r.courseCode))];
        const courseMap = new Map();

        // 1. Look up titles from Course table
        if (AcadCourse && failedCodes.length > 0) {
          const courses = await AcadCourse.findAll({
            where: { courseCode: { [Op.in]: failedCodes } },
            attributes: ["courseCode", "courseTitle", "credits"],
          });
          for (const c of courses) {
            if (!courseMap.has(c.courseCode)) {
              courseMap.set(c.courseCode, {
                title: c.courseTitle,
                credits: c.credits,
              });
            }
          }
        }

        // 2. Fallback to RegulationCourse table for any courses not found in Course table
        const { RegulationCourse: AcadRegulationCourse } = acadamicDb;
        if (AcadRegulationCourse && failedCodes.length > 0) {
          const regCourses = await AcadRegulationCourse.findAll({
            where: { courseCode: { [Op.in]: failedCodes } },
            attributes: ["courseCode", "courseTitle", "credits"],
          });
          for (const rc of regCourses) {
            if (!courseMap.has(rc.courseCode) || !courseMap.get(rc.courseCode).title) {
              courseMap.set(rc.courseCode, {
                title: rc.courseTitle,
                credits: rc.credits,
              });
            }
          }
        }

        standingArrearsSubjects = failedGradeRows.map((r) => {
          const meta = courseMap.get(r.courseCode);
          return {
            subject_code: r.courseCode,
            subject_name: meta?.title || r.courseCode,
            credits: meta?.credits || null,
          };
        });
      }
    }

    const hasStandingArrears = standingArrearsCount > 0 || hasAnyOutstandingArrearFlag;

    return {
      regno,
      liveGpas,
      latestCgpa,
      latestCredits: typeof latestCredits !== 'undefined' ? latestCredits : 0,
      hasStandingArrears,
      standingArrearsCount,
      standingArrearsSubjects,
    };
  } catch (err) {
    console.error("Error resolving live academic data:", err);
    return null;
  }
};

// Get student education record
export const getEducationRecord = async (req, res) => {
  try {
    const rawUserId = req.query.userId || req.query.UserId || req.user?.userId || req.user?.Userid;
    const userId = rawUserId && rawUserId !== "undefined" && rawUserId !== "null" ? rawUserId : null;
    const rawRegno = req.query.regno || req.query.registerNumber;
    const regnoParam = rawRegno && rawRegno !== "undefined" && rawRegno !== "null" ? rawRegno : null;

    if (!userId && !regnoParam) {
      return res.status(400).json({ message: "User ID or Register Number is required" });
    }

    let education = null;
    try {
      if (userId) {
        education = await StudentEducation.findOne({ where: { Userid: userId } });
      }
    } catch (dbErr) {
      console.warn("Warning: Failed querying StudentEducation by Userid:", dbErr.message);
    }

    const liveData = await resolveStudentLiveAcademicData(userId, regnoParam);

    if (!education && liveData?.regno) {
      try {
        const studentDetail = await StudentDetails.findOne({
          where: { registerNumber: liveData.regno },
          attributes: ["Userid"],
        });
        if (studentDetail?.Userid) {
          education = await StudentEducation.findOne({ where: { Userid: studentDetail.Userid } });
        }
      } catch (dbErr2) {
        console.warn("Warning: Failed querying StudentEducation by registerNumber:", dbErr2.message);
      }
    }

    let educationData = null;

    if (education) {
      educationData = education.toJSON ? education.toJSON() : { ...education };
    } else if (liveData) {
      // Create a base education object so tutors can still view live degree GPAs and arrears
      educationData = {
        Userid: userId || null,
        degree_name: "Undergraduate",
        degree_medium_of_study: "English",
      };
    }

    if (educationData && liveData) {
      // Merge live semester GPAs if available
      for (let i = 1; i <= 8; i++) {
        const key = `semester_${i}_gpa`;
        if (liveData.liveGpas && liveData.liveGpas[key] !== undefined && liveData.liveGpas[key] !== null) {
          educationData[key] = liveData.liveGpas[key];
        }
      }

      // Merge latest CGPA if available
      if (liveData.latestCgpa !== null && liveData.latestCgpa !== undefined) {
        educationData.cgpa = liveData.latestCgpa;
      }

      // Merge live cumulative earned credits if available
      if (liveData.latestCredits !== null && liveData.latestCredits !== undefined && liveData.latestCredits > 0) {
        educationData.credits = liveData.latestCredits;
        educationData.cumulativeEarnedCredits = liveData.latestCredits;
      }

      // Merge standing arrears from live StudentGrade
      educationData.has_standing_arrears = liveData.hasStandingArrears;
      educationData.standing_arrears_count = liveData.standingArrearsCount;
      educationData.standing_arrears_subjects =
        liveData.standingArrearsSubjects.length > 0
          ? liveData.standingArrearsSubjects
          : (educationData.standing_arrears_subjects || []);

      // Determine history of arrears:
      // If student currently has standing arrears, they definitely have arrears history.
      // Otherwise, retain existing arrears history count/status if previously stored.
      if (liveData.hasStandingArrears) {
        educationData.has_arrears_history = true;
        educationData.arrears_history_count = Math.max(
          liveData.standingArrearsCount,
          educationData.arrears_history_count || 0
        );
      }
    }

    res.status(200).json({
      success: true,
      education: educationData,
      message: educationData ? null : "No education record found. Please add your details.",
    });
  } catch (error) {
    console.error("Error fetching education record:", error);
    res.status(500).json({ message: "Error fetching education record", error: error.message });
  }
};

// Calculate semester averages
export const calculateAverages = async (req, res) => {
  try {
    const rawUserId = req.query.userId || req.query.UserId || req.user?.userId || req.user?.Userid;
    const userId = rawUserId && rawUserId !== "undefined" && rawUserId !== "null" ? rawUserId : null;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    let education = null;
    try {
      education = await StudentEducation.findOne({ where: { Userid: userId } });
    } catch (dbErr) {
      console.warn("Warning: Failed querying StudentEducation in calculateAverages:", dbErr.message);
    }
    const liveData = await resolveStudentLiveAcademicData(userId);

    const getSemGpa = (i) => {
      const key = `semester_${i}_gpa`;
      if (liveData?.liveGpas && liveData.liveGpas[key] !== undefined && liveData.liveGpas[key] !== null) {
        return liveData.liveGpas[key];
      }
      return education?.[key] ?? null;
    };

    const gpas = [];
    const semesterBreakdown = {};

    for (let i = 1; i <= 8; i++) {
      const val = getSemGpa(i);
      semesterBreakdown[`semester_${i}`] = val !== null && val !== undefined ? val : "N/A";
      if (val !== null && val !== undefined) {
        const num = parseFloat(val);
        if (!isNaN(num)) gpas.push(num);
      }
    }

    if (!education && gpas.length === 0) {
      return res.status(200).json({
        success: true,
        averageGPA: 0,
        cgpa: "N/A",
        semesterBreakdown,
        message: "No education record found",
      });
    }

    const averageGPA =
      gpas.length > 0
        ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2)
        : 0;

    const cgpa = liveData?.latestCgpa ?? education?.cgpa ?? "N/A";

    res.status(200).json({
      success: true,
      averageGPA,
      cgpa,
      semesterBreakdown,
    });
  } catch (error) {
    console.error("Error calculating averages:", error);
    res.status(500).json({ message: "Error calculating averages", error: error.message });
  }
};

// Get all pending approval records (STAFF)
export const getPendingApprovals = async (req, res) => {
  try {
    const currentStaffId = req.user?.userId || req.user?.Userid;
    const userRole = (req.user?.roleName || req.user?.role || "").toLowerCase();
    const isGlobalAdmin = ["admin", "superadmin"].includes(userRole);

    const records = await StudentEducation.findAll({
      where: { tutor_verification_status: false },
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["Userid", "username", "userMail"],
          include: [
            {
              model: StudentDetails,
              as: "studentDetails",
              attributes: ["registerNumber", "staffId"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formattedRecords = records
      .map((record) => {
        const { organizer, ...rest } = record.get({ plain: true });
        return {
          ...rest,
          username: organizer?.username || "N/A",
          email: organizer?.userMail || "N/A",
          registerNumber: organizer?.studentDetails?.registerNumber || "N/A",
          staffId: organizer?.studentDetails?.staffId || "N/A",
        };
      })
      .filter((rec) => {
        if (isGlobalAdmin) return true;
        if (!currentStaffId) return true;
        return (
          String(rec.staffId) === String(currentStaffId) ||
          (req.user?.userNumber && String(rec.staffId) === String(req.user.userNumber))
        );
      });

    res.status(200).json({ success: true, records: formattedRecords });
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    res.status(500).json({ success: false, message: "Error fetching pending approvals", error: error.message });
  }
};

// Approve education record (STAFF)
export const approveEducationRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { Userid, comments } = req.body;

    const education = await StudentEducation.findByPk(id);
    if (!education) {
      return res.status(404).json({ message: "Education record not found" });
    }

    education.tutor_verification_status = true;
    education.Verified_by = Userid || req.user?.Userid;
    education.verified_at = new Date();
    education.comments = comments || null;

    await education.save();

    const user = await User.findByPk(education.Userid);
    if (user && user.email) {
      const emailText = `Dear ${user.username},\n\nYour education record has been approved by the tutor.\n\nComments: ${comments || "None"}\n\nBest Regards,\nEducation Management System`;
      await sendEmail({ to: user.email, subject: "Education Record Approved", text: emailText });
    }

    res.status(200).json({ message: "Record approved successfully", education });
  } catch (error) {
    console.error("❌ Error approving record:", error);
    res.status(500).json({ message: "Error approving record", error: error.message });
  }
};

// Reject education record (STAFF)
export const rejectEducationRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { Userid, reason } = req.body;

    const education = await StudentEducation.findByPk(id);
    if (!education) {
      return res.status(404).json({ message: "Education record not found" });
    }

    education.tutor_verification_status = false;
    education.comments = reason || "Rejected by tutor";
    education.Updated_by = Userid || req.user?.Userid;

    await education.save();

    const user = await User.findByPk(education.Userid);
    if (user && user.email) {
      const emailText = `Dear ${user.username},\n\nYour education record has been rejected.\n\nReason: ${reason || "None provided"}\n\nPlease review and resubmit.\n\nBest Regards,\nEducation Management System`;
      await sendEmail({ to: user.email, subject: "Education Record Rejected", text: emailText });
    }

    res.status(200).json({ message: "Record rejected", education });
  } catch (error) {
    console.error("❌ Error rejecting record:", error);
    res.status(500).json({ message: "Error rejecting record", error: error.message });
  }
};

// Bulk upload GPA data via Excel (STAFF)
export const bulkUploadGPA = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: "Invalid data format" });
    }

    let successCount = 0;
    let failedRecords = [];

    for (const row of data) {
      try {
        const { registerNumber, sem1, sem2, sem3, sem4, sem5, sem6, sem7, sem8, cgpa } = row;

        const studentDetail = await StudentDetails.findOne({ where: { registerNumber } });
        if (!studentDetail) {
          failedRecords.push({ registerNumber, reason: "Student not found" });
          continue;
        }

        let education = await StudentEducation.findOne({ where: { Userid: studentDetail.Userid } });

        if (education) {
          if (sem1 != null) education.semester_1_gpa = sanitizeNum(sem1);
          if (sem2 != null) education.semester_2_gpa = sanitizeNum(sem2);
          if (sem3 != null) education.semester_3_gpa = sanitizeNum(sem3);
          if (sem4 != null) education.semester_4_gpa = sanitizeNum(sem4);
          if (sem5 != null) education.semester_5_gpa = sanitizeNum(sem5);
          if (sem6 != null) education.semester_6_gpa = sanitizeNum(sem6);
          if (sem7 != null) education.semester_7_gpa = sanitizeNum(sem7);
          if (sem8 != null) education.semester_8_gpa = sanitizeNum(sem8);
          if (cgpa != null) education.cgpa = sanitizeNum(cgpa);
          education.Updated_by = req.user.Userid;
          await education.save();
        } else {
          education = await StudentEducation.create({
            Userid: studentDetail.Userid,
            semester_1_gpa: sanitizeNum(sem1),
            semester_2_gpa: sanitizeNum(sem2),
            semester_3_gpa: sanitizeNum(sem3),
            semester_4_gpa: sanitizeNum(sem4),
            semester_5_gpa: sanitizeNum(sem5),
            semester_6_gpa: sanitizeNum(sem6),
            semester_7_gpa: sanitizeNum(sem7),
            semester_8_gpa: sanitizeNum(sem8),
            cgpa: sanitizeNum(cgpa),
            Created_by: req.user.Userid,
            Updated_by: req.user.Userid,
          });
        }

        successCount++;
      } catch (error) {
        failedRecords.push({ registerNumber: row.registerNumber, reason: error.message });
      }
    }

    res.status(200).json({
      message: "Bulk upload completed",
      successCount,
      failedCount: failedRecords.length,
      failedRecords,
    });
  } catch (error) {
    console.error("❌ Error in bulk upload:", error);
    res.status(500).json({ message: "Error processing bulk upload", error: error.message });
  }
};

// Get all education records with statistics (STAFF)
export const getAllEducationRecords = async (req, res) => {
  try {
    const currentStaffId = req.user?.userId || req.user?.Userid;
    const userRole = (req.user?.roleName || req.user?.role || "").toLowerCase();
    const isGlobalAdmin = ["admin", "superadmin"].includes(userRole);

    const records = await StudentEducation.findAll({
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["userId", "userName", "userMail"],
          include: [
            {
              model: StudentDetails,
              as: "studentDetails",
              attributes: ["registerNumber", "staffId"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formattedRecords = records
      .map((record) => {
        const { organizer, ...rest } = record.get({ plain: true });
        return {
          ...rest,
          username: organizer?.username || "N/A",
          email: organizer?.userMail || "N/A",
          registerNumber: organizer?.studentDetails?.registerNumber || "N/A",
          staffId: organizer?.studentDetails?.staffId || "N/A",
        };
      })
      .filter((rec) => {
        if (isGlobalAdmin) return true;
        if (!currentStaffId) return true;
        return (
          String(rec.staffId) === String(currentStaffId) ||
          (req.user?.userNumber && String(rec.staffId) === String(req.user.userNumber))
        );
      });

    res.status(200).json({ success: true, records: formattedRecords });
  } catch (error) {
    console.error("Error fetching education records:", error.message);
    res.status(500).json({ success: false, message: "Error fetching education records", error: error.message });
  }
};


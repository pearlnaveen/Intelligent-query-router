import { Op, Sequelize } from "sequelize";
import { sequelize } from "../../config/mysql.js";
import { User, StudentDetails, Department, Role, StudentEducation } from "../../models/index.js";
import acadamicDb from "../../models/acadamic/index.js";
import ExcelJS from "exceljs";
import bcrypt from "bcrypt";
import DownloadHistory from "../../models/student/DownloadHistory.js";

export const exportData = async (req, res) => {
  const adminRole = await Role.findOne({ where: { roleName: 'Admin' } });
  const admin = await User.findOne({
    where: { roleId: adminRole?.roleId },
    attributes: ['Userid'],
  });

  const adminId = admin?.Userid;

  //console.log(adminId);

  const { role, filters, type } = req.body;


  try {
    let query = {}; // Define query object

    if (filters) {
      if (filters.username?.trim()) {
        query.username = { [Op.like]: `%${filters.username.trim()}%` };
      }

      if (filters.staffId?.trim()) {
        query.userNumber = filters.staffId.trim();
      }
      if (filters.registerNumber?.trim()) {
        query.registerNumber = filters.registerNumber.trim();
      }
      if (filters.batch?.trim()) {
        query.batch = filters.batch.trim();
      }
      if (filters.tutorEmail?.trim()) {
        query.tutorEmail = filters.tutorEmail.trim();
      }
    }

    let data, formattedData, worksheetName, columns;

    if (role === "staff") {
      const staffRole = await Role.findOne({ where: { roleName: 'Staff' } });
      if (filters?.departmentId?.trim()) {
        query["$Department.Deptacronym$"] = filters.departmentId.trim();
      }
      data = await User.findAll({
        where: { ...query, roleId: staffRole?.roleId },
        attributes: ["userName", "userMail", "userNumber", "departmentId"],
        include: [
          {
            model: Department,
            attributes: ["Deptacronym"],
            required: false,
          },
          {
            model: StudentDetails,
            as: "staffStudents", // Ensure alias matches the association
            attributes: ["registerNumber"],
            required: false, // Keep it false to get staff even if they have no students
          },
        ],
      });
      // Format staff data
      formattedData = data.map((entry) => {
        const studentRegNos = entry.staffStudents
          ? entry.staffStudents.map((s) => s.registerNumber).join(", ")
          : "N/A";
        return {
          username: entry.userName,
          email: entry.userMail,
          staffId: entry.userNumber,
          DeptAcronym: entry.Department?.Deptacronym || "N/A",
          StudentCount: entry.staffStudents ? entry.staffStudents.length : 0,
          StudentRegNos: studentRegNos,
        };
      });

      worksheetName = "Staff Data";
      columns = [
        { header: "Username", key: "username", width: 20 },
        { header: "Email", key: "email", width: 25 },
        { header: "Staff ID", key: "staffId", width: 15 },
        { header: "Department Acronym", key: "DeptAcronym", width: 20 },
        { header: "Student Count", key: "StudentCount", width: 15 },
        { header: "Student Reg Nos", key: "StudentRegNos", width: 30 },
      ];
    } else if (role === "student") {
      if (filters?.departmentId?.trim()) {
        query["$Department.Deptacronym$"] = filters.departmentId.trim();
      }
      data = await StudentDetails.findAll({
        where: query,
        attributes: ["registerNumber", "batch", "departmentId"],
        include: [
          {
            model: Department,
            attributes: ["Deptacronym"],
            required: false,
          },
          {
            model: User,
            as: "studentUser", // Alias for student's username
            attributes: ["userName"],
            required: true,
          },
          {
            model: User,
            as: "staffAdvisor", // Alias for tutor's name
            attributes: ["userName"],
            required: false,
          },
        ],
      });

      // Format student data
      formattedData = data.map((entry) => ({
        registerNumber: entry.registerNumber,
        username: entry.studentUser?.userName || "N/A", // Fetch student username
        batch: entry.batch,
        DeptAcronym: entry.Department?.Deptacronym || "N/A",
        tutorName: entry.staffAdvisor?.userName || "N/A", // Fetch tutor name
      }));


      worksheetName = "Student Data";
      columns = [
        { header: "Reg No", key: "registerNumber", width: 15 },
        { header: "Username", key: "username", width: 20 },
        { header: "Batch", key: "batch", width: 15 },
        { header: "Department Acronym", key: "DeptAcronym", width: 20 },
        { header: "Tutor Name", key: "tutorName", width: 25 },
      ];
    } else {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(worksheetName);
    worksheet.columns = columns;

    // Add data rows
    formattedData.forEach((entry) => worksheet.addRow(entry));

    // Calculate total records
    const total_records = formattedData.length;

    // Generate Excel file and calculate file size
    const buffer = await workbook.xlsx.writeBuffer();
    const file_size = buffer.byteLength / 1024;

    // Log download history
    await DownloadHistory.create({
      Userid: adminId,
      filename: `${role}_data.xlsx`,
      role,
      download_type: type,  // File type (e.g., Excel, CSV, etc.)
      file_size,            // File size in KB
      total_records,        // Number of records exported
    });

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${worksheetName.toLowerCase().replace(" ", "_")}.xlsx`
    );

    // Stream the Excel file to the response
    res.end(Buffer.from(buffer));
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({ message: "Error exporting data", error: error.message });
  }
};

export const addUser = async (req, res) => {
  const {
    username,
    userMail,
    password,
    role,
    staffId, // Staff's own ID (for Staff role)
    TutorId, // Tutor's staffId (for Student role)
    departmentId,
    registerNumber, // Student-specific
    year, // Student-specific
    course, // Student-specific
    batch, // Student-specific
  } = req.body;

  // Check if the user is authenticated
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not authenticated"
    });
  }

  const createdBy = req.user.userId;
  const userRole = req.user.roleName;

  // Validate basic required fields
  if (!username || !userMail || !password || !role) {
    return res.status(400).json({
      success: false,
      message: "Username, email, password, and role are required"
    });
  }

  // Check if user has permission to create this role
  const rolePermissions = {
    SuperAdmin: ["Student", "Staff", "DeptAdmin", "IrAdmin", "PgAdmin", "AcademicAdmin", "AcadamicAdmin", "academicadmin", "acadamicadmin", "NewgenAdmin", "PlacementAdmin"],
    DeptAdmin: ["Student", "Staff"],
    AcademicAdmin: ["Student", "Staff"],
    AcadamicAdmin: ["Student", "Staff"],
    academicadmin: ["Student", "Staff"],
    acadamicadmin: ["Student", "Staff"],
    IrAdmin: ["Student"],
    PgAdmin: ["Student"],
    NewgenAdmin: ["Student"],
    PlacementAdmin: ["Student"],
  };

  const allowedRoles = rolePermissions[userRole] || [];

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: `You do not have permission to create ${role} role`
    });
  }

  // Define which roles require department
  const rolesRequiringDept = ["Student", "Staff", "DeptAdmin", "AcademicAdmin", "AcadamicAdmin", "academicadmin", "acadamicadmin", "SuperAdmin"];
  const rolesWithoutDept = ["IrAdmin", "PgAdmin", "NewgenAdmin", "PlacementAdmin"];

  // Validate department requirement
  if (rolesRequiringDept.includes(role) && !departmentId) {
    return res.status(400).json({
      success: false,
      message: `Department is required for ${role} role`
    });
  }

  // For DeptAdmin, verify they can only add to their own department
  if (userRole === "DeptAdmin" && req.user.departmentId) {
    if (departmentId && parseInt(departmentId) !== req.user.departmentId) {
      return res.status(403).json({
        success: false,
        message: "You can only add users to your own department"
      });
    }
  }

  // Role-specific validations
  if (role === "Staff" && !staffId) {
    return res.status(400).json({
      success: false,
      message: "Staff ID is required for Staff role"
    });
  }

  if (role === "Student") {
    if (!registerNumber || !year || !course || !batch || !TutorId) {
      return res.status(400).json({
        success: false,
        message: "registerNumber, year, course, batch, and tutor are required for Student role"
      });
    }
  }

  try {
    // Check if the email already exists
    const existingUser = await User.findOne({ where: { userMail } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    // For Staff role, check if the staffId already exists
    if (role === "Staff") {
      const existingStaff = await User.findOne({ where: { userNumber: staffId } });
      if (existingStaff) {
        return res.status(409).json({
          success: false,
          message: "Staff ID already exists"
        });
      }
    }

    // For Student role, check if registerNumber already exists
    if (role === "Student") {
      const existingStudent = await StudentDetails.findOne({ where: { registerNumber: registerNumber } });
      if (existingStudent) {
        return res.status(409).json({
          success: false,
          message: "Registration number already exists"
        });
      }

      // Validate that the TutorId corresponds to an existing staff member
      const tutor = await User.findOne({
        where: { userNumber: TutorId, role: "Staff", status: "active" },
        attributes: ['Userid', 'userMail', 'username']
      });

      if (!tutor) {
        return res.status(404).json({
          success: false,
          message: "Tutor not found or inactive. Please select a valid staff member."
        });
      }
    }

    // Get roleId for the text role
    const targetRole = await Role.findOne({ where: { roleName: role } });
    if (!targetRole) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified"
      });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user data
    const userData = {
      username,
      userMail,
      password: hashedPassword,
      roleId: targetRole.roleId,
      status: 'active',
      Created_by: createdBy,
      Updated_by: createdBy,
    };

    // Add department for roles that require it
    if (rolesRequiringDept.includes(role)) {
      userData.departmentId = departmentId;
    }

    // Add staffId for Staff role
    if (role === "Staff") {
      userData.userNumber = staffId;
    }

    // Create the new User record
    const newUser = await User.create(userData);

    // If Student role, create StudentDetails record
    if (role === "Student") {
      // Get tutor details again (we already validated above)
      const tutor = await User.findOne({
        where: { userNumber: TutorId, role: "Staff" },
        attributes: ['userId', 'userMail', 'username']
      });

      // Determine semester based on year
      const semesterMap = {
        "1st YEAR": "1",
        "2nd YEAR": "3",
        "3rd YEAR": "5",
        "4th YEAR": "7"
      };

      await StudentDetails.create({
        Userid: newUser.userId,
        registerNumber,
        studentName: username || registerNumber, // Fallback to registerNumber if username is missing
        year,
        course,
        departmentId,
        // Deptid: departmentId, // Add missing Deptid
        batch,
        semester: semesterMap[year] || "1",
        staffId: tutor.userId, // Store the tutor's Userid
        tutorEmail: tutor.userMail, // Store the tutor's email
        Created_by: createdBy,
        Updated_by: createdBy,
      });
    }

    // Send success response
    return res.status(201).json({
      success: true,
      message: `${role} added successfully`,
      user: {
        userId: newUser.userId,
        username: newUser.username,
        email: newUser.userMail,
        role: role,
        departmentId: newUser.departmentId || null,
        staffId: newUser.userNumber || null,
      }
    });

  } catch (error) {
    console.error("❌ Error adding user:", error);

    // Handle specific database errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: "User with this email or ID already exists",
        error: error.message
      });
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: "Invalid department or tutor ID reference",
        error: error.message
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map(e => e.message)
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      message: "Error adding user",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
};
export const getStaff = async (req, res) => {
  try {
    const role = req.query.role;

    if (!role) {
      return res.status(400).json({ success: false, message: 'Role is required' });
    }

    const roleRecord = await Role.findOne({ where: { roleName: role } });
    if (!roleRecord) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Fetch users with the specified role
    const users = await User.findAll({
      where: { roleId: roleRecord.roleId },
      attributes: ['Userid', 'username', 'userMail', 'userNumber'],
      raw: true,
    });

    if (!users.length) {
      return res.status(200).json({ success: true, staff: [], message: 'No staff members found for the specified role' });
    }

    const staffList = users.map(user => ({
      userId: user.Userid,
      userNumber: user.userNumber,
      username: user.username,
      email: user.userMail,
    }));

    res.status(200).json({ success: true, staff: staffList });
  } catch (error) {
    console.error('❌ Error fetching staff members:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching staff members',
      error: error.message,
    });
  }
};
export const getStudentDetails = async (req, res) => {
  try {
    const { roleName, departmentId } = req.user || {};
    const whereClause = {};

    if (roleName && roleName !== "SuperAdmin" && roleName !== "Warden" && roleName !== "warden" && departmentId) {
      whereClause.departmentId = departmentId;
    }

    const students = await StudentDetails.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "studentUser", // Fetch user details of the student
          attributes: ["userName", "profileImage", "userMail"],
        },
        {
          model: User,
          as: "staffAdvisor", // Fetch staff details using staffId (which is actually Userid of staff)
          attributes: ["userId", "userNumber", "userName"],
        },
        {
          model: Department,
          as: "department",
          attributes: ["departmentId", "departmentName", "departmentAcr"],
        },
      ],
    });

    // Safely fetch education records without breaking student details
    const educationMap = new Map();
    try {
      const eduRecords = await StudentEducation.findAll({
        attributes: [
          "Userid",
          "tenth_medium_of_study",
          "twelfth_medium_of_study",
          "twelfth_physics_marks",
          "twelfth_chemistry_marks",
          "twelfth_maths_marks",
          "twelfth_percentage",
          "semester_1_gpa",
          "semester_2_gpa",
          "semester_3_gpa",
          "semester_4_gpa",
          "semester_5_gpa",
          "semester_6_gpa",
          "semester_7_gpa",
          "semester_8_gpa",
          "gpa",
          "cgpa",
          "has_arrears_history",
          "arrears_history_count",
          "has_standing_arrears",
          "standing_arrears_count",
          "standing_arrears_subjects",
        ],
      });
      eduRecords.forEach((rec) => {
        educationMap.set(String(rec.Userid), rec);
      });
    } catch (eduErr) {
      console.warn("Could not fetch StudentEducation records:", eduErr.message);
    }

    // Bulk resolve live academic data (GPAs, CGPA, standing arrears, arrear history) from acadamicDb
    const liveAcademicMap = new Map();
    try {
      const {
        StudentGrade: AcadStudentGrade,
        StudentSemesterGPA: AcadStudentSemesterGPA,
        Semester: AcadSemester,
        Course: AcadCourse,
        RegulationCourse: AcadRegulationCourse,
      } = acadamicDb;

      const regnos = [...new Set(students.map((s) => s.registerNumber).filter(Boolean))];

      if (regnos.length > 0) {
        // 1. Bulk fetch all semester GPAs and CGPA
        const gpaRows = AcadStudentSemesterGPA
          ? await AcadStudentSemesterGPA.findAll({
              where: { regno: { [Op.in]: regnos } },
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
            })
          : [];

        // 2. Bulk fetch all standing failed grades ('U')
        const failedGradeRows = AcadStudentGrade
          ? await AcadStudentGrade.findAll({
              where: {
                regno: { [Op.in]: regnos },
                grade: "U",
              },
              attributes: ["gradeId", "regno", "courseCode", "grade", "semesterId"],
            })
          : [];

        // Preload course titles & credits for failed subjects
        const failedCourseCodes = [...new Set(failedGradeRows.map((r) => r.courseCode))];
        const courseMetadataMap = new Map();
        if (AcadCourse && failedCourseCodes.length > 0) {
          const courses = await AcadCourse.findAll({
            where: { courseCode: { [Op.in]: failedCourseCodes } },
            attributes: ["courseCode", "courseTitle", "credits"],
          });
          for (const c of courses) {
            if (!courseMetadataMap.has(c.courseCode)) {
              courseMetadataMap.set(c.courseCode, {
                title: c.courseTitle,
                credits: c.credits,
              });
            }
          }
        }
        if (AcadRegulationCourse && failedCourseCodes.length > 0) {
          const regCourses = await AcadRegulationCourse.findAll({
            where: { courseCode: { [Op.in]: failedCourseCodes } },
            attributes: ["courseCode", "courseTitle", "credits"],
          });
          for (const rc of regCourses) {
            if (!courseMetadataMap.has(rc.courseCode) || !courseMetadataMap.get(rc.courseCode).title) {
              courseMetadataMap.set(rc.courseCode, {
                title: rc.courseTitle,
                credits: rc.credits,
              });
            }
          }
        }

        // Group GPA rows by regno
        const gpaByRegno = new Map();
        for (const row of gpaRows) {
          const key = String(row.regno).trim().toUpperCase();
          if (!gpaByRegno.has(key)) {
            gpaByRegno.set(key, []);
          }
          gpaByRegno.get(key).push(row);
        }

        // Group failed grades by regno
        const failedByRegno = new Map();
        for (const f of failedGradeRows) {
          const key = String(f.regno).trim().toUpperCase();
          if (!failedByRegno.has(key)) {
            failedByRegno.set(key, []);
          }
          failedByRegno.get(key).push(f);
        }

        for (const regno of regnos) {
          const lookupKey = String(regno).trim().toUpperCase();
          const studentGpaRows = gpaByRegno.get(lookupKey) || [];
          const studentFailedRows = failedByRegno.get(lookupKey) || [];

          const liveGpas = {};
          let latestCgpa = null;
          let latestGpa = null;
          let latestCredits = 0;
          let hadPastArrear = false;

          for (const row of studentGpaRows) {
            const semNo = row.Semester?.semesterNumber;
            if (semNo && Number(semNo) >= 1 && Number(semNo) <= 8) {
              liveGpas[`semester_${semNo}_gpa`] =
                row.gpa !== null && row.gpa !== undefined ? parseFloat(row.gpa) : null;
            }
            if (row.gpa !== null && row.gpa !== undefined) {
              latestGpa = parseFloat(row.gpa);
            }
            if (row.cgpa !== null && row.cgpa !== undefined) {
              latestCgpa = parseFloat(row.cgpa);
            }
            if (row.cumulativeEarnedCredits !== null && row.cumulativeEarnedCredits !== undefined) {
              latestCredits = parseFloat(row.cumulativeEarnedCredits);
            }
            if (row.hasOutstandingArrear) {
              hadPastArrear = true;
            }
          }

          const standingCount = studentFailedRows.length;
          const hasStanding = standingCount > 0;
          const subjects = studentFailedRows.map((r) => {
            const meta = courseMetadataMap.get(r.courseCode);
            return {
              subject_code: r.courseCode,
              subject_name: meta?.title || r.courseCode,
              credits: meta?.credits || null,
            };
          });

          liveAcademicMap.set(lookupKey, {
            liveGpas,
            latestCgpa,
            latestGpa,
            latestCredits,
            hasStanding,
            standingCount,
            subjects,
            hadPastArrear,
          });
        }
      }
    } catch (academicErr) {
      console.warn("Could not fetch live academic data from acadamicDb:", academicErr.message);
    }

    const studentData = students.map(student => {
      const edu = educationMap.get(String(student.Userid));
      const lookupKey = String(student.registerNumber || "").trim().toUpperCase();
      const live = liveAcademicMap.get(lookupKey);

      const mMarks = parseFloat(edu?.twelfth_maths_marks) || 0;
      const pMarks = parseFloat(edu?.twelfth_physics_marks) || 0;
      const cMarks = parseFloat(edu?.twelfth_chemistry_marks) || 0;
      let calculatedCutoff = null;
      if (mMarks > 0 || pMarks > 0 || cMarks > 0) {
        calculatedCutoff = Number((mMarks + (pMarks / 2) + (cMarks / 2)).toFixed(2));
      } else if (edu?.twelfth_percentage) {
        calculatedCutoff = Number((parseFloat(edu.twelfth_percentage) * 2).toFixed(2));
      }

      // Standing arrears
      const standingArrearsCount = live ? live.standingCount : (edu?.standing_arrears_count || 0);
      const hasStandingArrears = live ? live.hasStanding : (Boolean(edu?.has_standing_arrears) || standingArrearsCount > 0);
      const standingArrearsSubjects = live?.subjects?.length > 0 ? live.subjects : (edu?.standing_arrears_subjects || []);

      // History of arrears matching StudentBioData logic
      let hasArrearsHistory = false;
      let arrearsHistoryCount = 0;
      if (hasStandingArrears) {
        hasArrearsHistory = true;
        arrearsHistoryCount = Math.max(standingArrearsCount, edu?.arrears_history_count || 0);
      } else if (live?.hadPastArrear || edu?.has_arrears_history || (edu?.arrears_history_count && edu.arrears_history_count > 0)) {
        hasArrearsHistory = true;
        arrearsHistoryCount = edu?.arrears_history_count || 1;
      }

      // CGPA & GPA
      const cgpa = live?.latestCgpa !== null && live?.latestCgpa !== undefined
        ? live.latestCgpa
        : (edu?.cgpa !== null && edu?.cgpa !== undefined ? parseFloat(edu.cgpa) : null);

      const gpa = live?.latestGpa !== null && live?.latestGpa !== undefined
        ? live.latestGpa
        : (edu?.gpa !== null && edu?.gpa !== undefined ? parseFloat(edu.gpa) : null);

      const credits = live?.latestCredits || 0;

      return {
        id: student.studentId,
        studentId: student.studentId,
        Userid: student.Userid,
        userId: student.Userid,
        studentName: student.studentName || student.studentUser?.userName || "Unknown",
        tutorName: student.staffAdvisor ? student.staffAdvisor.userName : "Unknown",
        tutorEmail: student.tutorEmail,
        course: student.course,
        gender: student.gender || "Male",
        student_type: student.student_type || "Day-Scholar",
        admission_quota: student.admission_quota || student.seat_type || "Government Quota",
        seat_type: student.seat_type,
        lateral_entry: student.lateral_entry || "No",
        medium_of_study: edu?.twelfth_medium_of_study || edu?.tenth_medium_of_study || "English",
        cutoff: calculatedCutoff,
        twelfth_percentage: edu?.twelfth_percentage,
        twelfth_maths_marks: edu?.twelfth_maths_marks,
        twelfth_physics_marks: edu?.twelfth_physics_marks,
        twelfth_chemistry_marks: edu?.twelfth_chemistry_marks,
        semester_1_gpa: live?.liveGpas?.semester_1_gpa !== undefined && live?.liveGpas?.semester_1_gpa !== null
          ? live.liveGpas.semester_1_gpa
          : (edu?.semester_1_gpa !== null && edu?.semester_1_gpa !== undefined ? parseFloat(edu.semester_1_gpa) : null),
        semester_2_gpa: live?.liveGpas?.semester_2_gpa !== undefined && live?.liveGpas?.semester_2_gpa !== null
          ? live.liveGpas.semester_2_gpa
          : (edu?.semester_2_gpa !== null && edu?.semester_2_gpa !== undefined ? parseFloat(edu.semester_2_gpa) : null),
        semester_3_gpa: live?.liveGpas?.semester_3_gpa !== undefined && live?.liveGpas?.semester_3_gpa !== null
          ? live.liveGpas.semester_3_gpa
          : (edu?.semester_3_gpa !== null && edu?.semester_3_gpa !== undefined ? parseFloat(edu.semester_3_gpa) : null),
        semester_4_gpa: live?.liveGpas?.semester_4_gpa !== undefined && live?.liveGpas?.semester_4_gpa !== null
          ? live.liveGpas.semester_4_gpa
          : (edu?.semester_4_gpa !== null && edu?.semester_4_gpa !== undefined ? parseFloat(edu.semester_4_gpa) : null),
        semester_5_gpa: live?.liveGpas?.semester_5_gpa !== undefined && live?.liveGpas?.semester_5_gpa !== null
          ? live.liveGpas.semester_5_gpa
          : (edu?.semester_5_gpa !== null && edu?.semester_5_gpa !== undefined ? parseFloat(edu.semester_5_gpa) : null),
        semester_6_gpa: live?.liveGpas?.semester_6_gpa !== undefined && live?.liveGpas?.semester_6_gpa !== null
          ? live.liveGpas.semester_6_gpa
          : (edu?.semester_6_gpa !== null && edu?.semester_6_gpa !== undefined ? parseFloat(edu.semester_6_gpa) : null),
        semester_7_gpa: live?.liveGpas?.semester_7_gpa !== undefined && live?.liveGpas?.semester_7_gpa !== null
          ? live.liveGpas.semester_7_gpa
          : (edu?.semester_7_gpa !== null && edu?.semester_7_gpa !== undefined ? parseFloat(edu.semester_7_gpa) : null),
        semester_8_gpa: live?.liveGpas?.semester_8_gpa !== undefined && live?.liveGpas?.semester_8_gpa !== null
          ? live.liveGpas.semester_8_gpa
          : (edu?.semester_8_gpa !== null && edu?.semester_8_gpa !== undefined ? parseFloat(edu.semester_8_gpa) : null),
        cgpa: cgpa,
        gpa: gpa,
        credits: credits > 0 ? credits : null,
        has_arrears_history: hasArrearsHistory,
        arrears_history_count: arrearsHistoryCount,
        has_standing_arrears: hasStandingArrears,
        standing_arrears_count: standingArrearsCount,
        standing_arrears_subjects: standingArrearsSubjects,
        departmentId: student.departmentId,
        Deptid: student.departmentId,
        batch: student.batch,
        semester: student.semester,
        registerNumber: student.registerNumber,
        assignedStaffUserid: student.staffId,
        staffId: student.staffAdvisor ? student.staffAdvisor.userNumber : "Unknown",
        username: student.studentUser ? student.studentUser.userName : (student.studentName || "Unknown"),
        email: student.studentUser ? student.studentUser.userMail : "Unknown",
        image: student.studentUser ? student.studentUser.profileImage : "/uploads/default.jpg",
        profileImage: student.studentUser ? student.studentUser.profileImage : "/uploads/default.jpg",
        Deptacronym: student.department ? student.department.departmentAcr : "N/A",
        departmentName: student.department ? student.department.departmentName : "Computer Science and Engineering",
        department: student.department ? {
          ...student.department.toJSON(),
          Deptacronym: student.department.departmentAcr,
          departmentAcr: student.department.departmentAcr
        } : null,
      };
    });

    res.status(200).json(studentData);
  } catch (error) {
    console.error("Error fetching student details:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getStaffDetails = async (req, res) => {
  try {
    const staffRoles = await Role.findAll({
      where: {
        roleName: { [Op.in]: ['Staff', 'staff', 'teachingstaff', 'nonteachingstaff', 'Faculty', 'Teaching Staff'] }
      }
    });
    const staffRoleIds = staffRoles.map(r => r.roleId);

    const { roleName, departmentId } = req.user || {};
    const whereClause = {};

    if (staffRoleIds.length > 0) {
      whereClause.roleId = { [Op.in]: staffRoleIds };
    }

    if (roleName && roleName !== "SuperAdmin" && roleName !== "Admin" && departmentId) {
      whereClause.departmentId = departmentId;
    }

    const staffs = await User.findAll({
      where: whereClause,
      attributes: ["userId", "userName", "profileImage", "userNumber", "departmentId", "userMail"],
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["departmentId", "departmentName", "departmentAcr"],
        },
      ],
    });

    const staffData = staffs.map(staff => ({
      id: staff.userNumber,
      Userid: staff.userId,
      userId: staff.userId,
      email: staff.userMail,
      departmentId: staff.departmentId,
      Deptid: staff.departmentId,
      staffId: staff.userNumber,
      username: staff.userName,
      image: staff.profileImage || "/uploads/default.jpg",
      profileImage: staff.profileImage || "/uploads/default.jpg",
      Deptacronym: staff.department ? (staff.department.departmentAcr || staff.department.departmentName) : "N/A",
      departmentAcr: staff.department ? (staff.department.departmentAcr || staff.department.departmentName) : "N/A",
      departmentName: staff.department ? staff.department.departmentName : "N/A",
      department: staff.department ? {
        ...staff.department.toJSON(),
        Deptacronym: staff.department.departmentAcr || staff.department.departmentName,
        departmentAcr: staff.department.departmentAcr || staff.department.departmentName,
        departmentName: staff.department.departmentName
      } : "N/A",
    }));

    res.status(200).json(staffData);
  } catch (error) {
    console.error("Error fetching staff details:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const getDepartments = async (req, res) => {
  try {

    const { roleName, departmentId } = req.user || {};
    const whereClause = {};

    if (roleName && roleName !== "SuperAdmin" && departmentId) {
      whereClause.departmentId = departmentId;
    }

    const departments = await Department.findAll({
      where: whereClause
    });

    const serializedRows = departments.map(dept => {
      const plain = dept.toJSON();
      return {
        ...plain,
        Deptid: plain.departmentId,
        Deptacronym: plain.departmentAcr,
        departmentId: plain.departmentId,
        departmentAcr: plain.departmentAcr,
      };
    });

    res.status(200).json(serializedRows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, {
      include: [
        { model: Role, as: 'role', attributes: ['roleId', 'roleName'] },
        { model: Department, as: 'department', attributes: ['departmentId', 'departmentName', 'departmentAcr'] }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

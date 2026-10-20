import models from '../../models/acadamic/index.js';
const {
  Course, StaffCourse, StudentCourse, StudentDetails, User,
  CourseExamType, StudentResult, Batch, Semester, Section,
  Department, sequelize
} = models;

import { Op } from 'sequelize';
import ExcelJS from 'exceljs';
import catchAsync from '../../utils/catchAsync.js';
import { getOrSetCache, invalidateCachePrefixes, makeCacheKey, ttl } from '../../utils/cache.js';
import { resolveStudentDisplayName } from './studentNameResolver.js';

// --- HELPERS ---
const getUserId = (req) => {
  const id = req.user?.userId || req.user?.id;
  if (!id) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }
  return id;
};

/**
 * Robustly resolve Course records by numeric courseId OR string courseCode (e.g. "23CS54C" or "CS301_CS302"),
 * and verify that the logged-in staff member is assigned to at least one of the matching courses in StaffCourse.
 */
const resolveCourseAndVerifyStaff = async (userId, courseParam) => {
  const paramStr = String(courseParam || '').trim();
  if (!paramStr || paramStr === 'undefined' || paramStr === 'null') {
    const err = new Error('Valid course identifier is required');
    err.statusCode = 400;
    throw err;
  }

  // Split potential composite tokens (e.g. "23CS54C_23CS54D" or "CS301")
  const tokens = paramStr.split(/[_,-]/).map(t => t.trim()).filter(Boolean);

  const courseConditions = [];
  tokens.forEach(tok => {
    const num = Number(tok);
    if (Number.isSafeInteger(num) && num > 0) {
      courseConditions.push({ courseId: num });
    }
    courseConditions.push({ courseCode: tok });
  });

  const rawNum = Number(paramStr);
  if (Number.isSafeInteger(rawNum) && rawNum > 0) {
    courseConditions.push({ courseId: rawNum });
  }
  courseConditions.push({ courseCode: paramStr });

  // Find matching courses in DB
  const courses = await Course.findAll({
    where: { [Op.or]: courseConditions },
    include: [
      {
        model: Semester,
        include: [{ model: Batch }]
      },
      {
        model: Section,
        attributes: ['sectionId', 'sectionName']
      }
    ]
  });

  if (!courses || courses.length === 0) {
    const err = new Error(`Course not found for identifier "${paramStr}"`);
    err.statusCode = 404;
    throw err;
  }

  const courseIds = courses.map(c => c.courseId);

  // Verify staff assignment in StaffCourse
  const assignments = await StaffCourse.findAll({
    where: {
      Userid: userId,
      courseId: { [Op.in]: courseIds }
    }
  });

  if (!assignments || assignments.length === 0) {
    const err = new Error('Unauthorized: You are not assigned to this course.');
    err.statusCode = 403;
    throw err;
  }

  return { courses, primaryCourse: courses[0], courseIds };
};

/* =========================================================
   📌 STAFF SIDE CONTROLLERS
   ========================================================= */

/**
 * GET /institute_management_system/staff/results/courses/:courseId
 * Fetch course details, batch, sections, and exam types for a staff member's course.
 */
export const getStaffCourseDetails = catchAsync(async (req, res) => {
  const userId = getUserId(req);
  const { courseId: courseParam } = req.params;

  const { courses, primaryCourse, courseIds } = await resolveCourseAndVerifyStaff(userId, courseParam);

  // Get all exam types created for these courseIds (shared across all staff for this course)
  const examTypes = await CourseExamType.findAll({
    where: { courseId: { [Op.in]: courseIds } },
    include: [{ model: StudentResult, attributes: ['resultId', 'marks'] }],
    order: [['createdDate', 'ASC']]
  });

  const formattedExamTypes = examTypes.map((et) => {
    const totalResults = et.StudentResults ? et.StudentResults.length : 0;
    const enteredResults = et.StudentResults ? et.StudentResults.filter(r => r.marks !== null).length : 0;
    return {
      examTypeId: et.examTypeId,
      examTypeName: et.examTypeName,
      maxMarks: Number(et.maxMarks),
      description: et.description || '',
      createdDate: et.createdDate,
      totalResults,
      enteredResults
    };
  });

  const batchInfo = primaryCourse.Semester?.Batch;
  const allSections = [];
  courses.forEach(c => {
    if (c.Sections) {
      c.Sections.forEach(s => {
        if (s.sectionName && !allSections.includes(s.sectionName)) {
          allSections.push(s.sectionName);
        }
      });
    }
  });

  const sectionLabel = allSections.length > 0 ? allSections.join(', ') : 'A';

  res.json({
    status: 'success',
    data: {
      courseId: primaryCourse.courseId,
      courseCode: primaryCourse.courseCode,
      courseTitle: primaryCourse.courseTitle,
      degree: batchInfo?.degree || 'B.E',
      branch: batchInfo?.branch || 'CSE',
      batchYears: batchInfo?.batchYears || '2023-2027',
      section: sectionLabel,
      minMark: primaryCourse.minMark,
      maxMark: primaryCourse.maxMark,
      examTypes: formattedExamTypes
    }
  });
});

/**
 * POST /institute_management_system/staff/results/courses/:courseId/exam-types
 * Create a new Exam Type for a course (shared with all staff assigned to the course).
 */
export const createExamType = catchAsync(async (req, res) => {
  const userId = getUserId(req);
  const { courseId: courseParam } = req.params;
  const { examTypeName, maxMarks, description } = req.body;

  const { primaryCourse, courseIds } = await resolveCourseAndVerifyStaff(userId, courseParam);

  // Validation
  const trimmedName = String(examTypeName || '').trim();
  if (!trimmedName) {
    return res.status(400).json({ status: 'error', message: 'Exam type name is required.' });
  }

  const numericMaxMarks = Number(maxMarks);
  if (isNaN(numericMaxMarks) || numericMaxMarks <= 0) {
    return res.status(400).json({ status: 'error', message: 'Maximum marks must be a positive number.' });
  }

  // Prevent duplicate exam types for the same course (case-insensitive check)
  const existing = await CourseExamType.findOne({
    where: {
      courseId: { [Op.in]: courseIds },
      sequelizeWhere: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('examTypeName')),
        trimmedName.toLowerCase()
      )
    }
  });

  if (existing) {
    return res.status(400).json({
      status: 'error',
      message: `Exam type "${trimmedName}" already exists for this course.`
    });
  }

  const examType = await CourseExamType.create({
    courseId: primaryCourse.courseId,
    batchId: primaryCourse.Semester?.batchId || null,
    examTypeName: trimmedName,
    maxMarks: numericMaxMarks,
    description: description ? String(description).trim() : null,
    createdBy: String(userId)
  });

  // Invalidate result analysis caches
  await invalidateCachePrefixes(['result_analysis']);

  res.status(201).json({
    status: 'success',
    message: 'Exam type created successfully.',
    data: {
      examTypeId: examType.examTypeId,
      examTypeName: examType.examTypeName,
      maxMarks: Number(examType.maxMarks),
      description: examType.description || '',
      createdDate: examType.createdDate,
      enteredResults: 0,
      totalResults: 0
    }
  });
});

/**
 * DELETE /institute_management_system/staff/results/exam-types/:examTypeId
 * Delete an Exam Type and its associated student marks.
 */
export const deleteExamType = catchAsync(async (req, res) => {
  const userId = getUserId(req);
  const { examTypeId } = req.params;

  const examType = await CourseExamType.findByPk(examTypeId);
  if (!examType) {
    return res.status(404).json({ status: 'error', message: 'Exam type not found.' });
  }

  await resolveCourseAndVerifyStaff(userId, examType.courseId);

  await StudentResult.destroy({
    where: { examTypeId: Number(examTypeId) }
  });

  await examType.destroy();

  await invalidateCachePrefixes(['result_analysis']);

  res.json({
    status: 'success',
    message: 'Exam type and associated marks deleted successfully.'
  });
});

/**
 * GET /institute_management_system/staff/results/exam-types/:examTypeId/students
 * Fetch enrolled students for the course & their marks for the selected exam type.
 */
export const getStudentsForExamType = catchAsync(async (req, res) => {
  const userId = getUserId(req);
  const { examTypeId } = req.params;

  const examType = await CourseExamType.findByPk(examTypeId, {
    include: [{ model: Course, required: true }]
  });

  if (!examType) {
    return res.status(404).json({ status: 'error', message: 'Exam type not found.' });
  }

  const courseId = examType.courseId;
  const { courseIds } = await resolveCourseAndVerifyStaff(userId, courseId);

  // 1. Fetch staff section allocation for this course
  const staffAssignments = await StaffCourse.findAll({
    where: {
      Userid: userId,
      courseId: { [Op.in]: courseIds }
    },
    attributes: ['courseId', 'sectionId']
  });

  const sectionIds = [...new Set(staffAssignments.map(a => a.sectionId).filter(Boolean))];

  // 2. Filter enrolled students strictly by the allocated staff member's section(s)
  const studentCourseWhere = {
    courseId: { [Op.in]: courseIds }
  };
  if (sectionIds.length > 0) {
    studentCourseWhere.sectionId = { [Op.in]: sectionIds };
  }

  const enrollments = await StudentCourse.findAll({
    where: studentCourseWhere,
    include: [
      {
        model: StudentDetails,
        required: false,
        attributes: ['registerNumber', 'studentName', 'studentId', 'batch', 'section']
      }
    ],
    order: [
      [sequelize.col('StudentDetail.registerNumber'), 'ASC'],
      ['regno', 'ASC']
    ]
  });

  // 3. Fallback name resolution from User table for missing student names
  const regnos = enrollments.map(e => e.regno).filter(Boolean);
  const userMap = new Map();
  if (regnos.length > 0) {
    const userRows = await User.findAll({
      where: {
        [Op.or]: [
          { userNumber: { [Op.in]: regnos } },
          { username: { [Op.in]: regnos } }
        ]
      },
      attributes: ['userNumber', 'userName', 'username']
    });
    userRows.forEach(u => {
      const key = String(u.userNumber || u.username).trim().toUpperCase();
      if (key && u.userName) userMap.set(key, u.userName);
    });
  }

  // 4. Fetch existing marks for this exam type
  const existingResults = await StudentResult.findAll({
    where: { examTypeId: Number(examTypeId) }
  });

  const resultMap = new Map();
  existingResults.forEach((r) => {
    resultMap.set(String(r.regno).trim().toUpperCase(), {
      marks: r.marks !== null ? Number(r.marks) : null,
      updatedBy: r.updatedBy
    });
  });

  // 5. Build roster
  const rosterMap = new Map();
  enrollments.forEach((e, idx) => {
    const regno = e.regno || e.StudentDetail?.registerNumber;
    if (!regno) return;
    const normKey = String(regno).trim().toUpperCase();
    if (rosterMap.has(normKey)) return;

    const studentDetail = e.StudentDetail || e.StudentDetails || {};
    let resolvedName = resolveStudentDisplayName(studentDetail);
    if ((!resolvedName || resolvedName === normKey || resolvedName === 'N/A') && userMap.has(normKey)) {
      resolvedName = userMap.get(normKey);
    }

    const savedData = resultMap.get(normKey);
    rosterMap.set(normKey, {
      rollNo: rosterMap.size + 1,
      regno,
      studentName: resolvedName || regno,
      mark: savedData && savedData.marks !== undefined && savedData.marks !== null ? savedData.marks : '',
      status: savedData && savedData.marks !== undefined && savedData.marks !== null ? 'Saved' : 'Pending'
    });
  });

  res.json({
    status: 'success',
    data: {
      examType: {
        examTypeId: examType.examTypeId,
        examTypeName: examType.examTypeName,
        maxMarks: Number(examType.maxMarks),
        description: examType.description || '',
        courseCode: examType.Course.courseCode,
        courseTitle: examType.Course.courseTitle
      },
      students: [...rosterMap.values()]
    }
  });
});

/**
 * POST /institute_management_system/staff/results/exam-types/:examTypeId/marks/bulk
 * Bulk save/update student marks for an exam type (transactional & shared).
 */
export const saveBulkMarks = catchAsync(async (req, res) => {
  const userId = getUserId(req);
  const { examTypeId } = req.params;
  const { marks } = req.body;

  if (!Array.isArray(marks)) {
    return res.status(400).json({ status: 'error', message: 'Marks payload must be an array.' });
  }

  const examType = await CourseExamType.findByPk(examTypeId);
  if (!examType) {
    return res.status(404).json({ status: 'error', message: 'Exam type not found.' });
  }

  const courseId = examType.courseId;
  const maxMarks = Number(examType.maxMarks);

  await resolveCourseAndVerifyStaff(userId, courseId);

  // Validate marks before transaction
  const validationErrors = [];
  const processedRows = [];

  for (let i = 0; i < marks.length; i++) {
    const item = marks[i];
    const regno = String(item.regno || '').trim();
    if (!regno) continue;

    let markVal = null;
    if (item.mark !== '' && item.mark !== null && item.mark !== undefined) {
      markVal = Number(item.mark);
      if (isNaN(markVal)) {
        validationErrors.push(`Row ${i + 1} (${regno}): Invalid mark format "${item.mark}".`);
      } else if (markVal < 0) {
        validationErrors.push(`Row ${i + 1} (${regno}): Mark cannot be negative (${markVal}).`);
      } else if (markVal > maxMarks) {
        validationErrors.push(`Row ${i + 1} (${regno}): Mark (${markVal}) exceeds maximum marks (${maxMarks}).`);
      }
    }

    processedRows.push({
      examTypeId: Number(examTypeId),
      regno,
      marks: markVal,
      createdBy: String(userId),
      updatedBy: String(userId)
    });
  }

  if (validationErrors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed for some student marks.',
      errors: validationErrors.slice(0, 10)
    });
  }

  // Execute inside transaction for data integrity
  await sequelize.transaction(async (t) => {
    for (const row of processedRows) {
      const existing = await StudentResult.findOne({
        where: { examTypeId: row.examTypeId, regno: row.regno },
        transaction: t
      });

      if (existing) {
        existing.marks = row.marks;
        existing.updatedBy = row.updatedBy;
        await existing.save({ transaction: t });
      } else {
        await StudentResult.create(row, { transaction: t });
      }
    }
  });

  // Invalidate result analysis cache
  await invalidateCachePrefixes(['result_analysis']);

  res.json({
    status: 'success',
    message: 'Marks saved successfully.'
  });
});

/* =========================================================
   📌 ADMIN SIDE CONTROLLERS
   ========================================================= */

/**
 * GET /institute_management_system/admin/results/filters
 * Get distinct Degree, Branch, and Batch options for hierarchical admin filter.
 */
export const getAdminFilters = catchAsync(async (req, res) => {
  const batches = await Batch.findAll({
    where: { isActive: 'YES' },
    attributes: ['batchId', 'degree', 'branch', 'batch', 'batchYears'],
    order: [['degree', 'ASC'], ['branch', 'ASC'], ['batchYears', 'DESC']]
  });

  const degrees = [...new Set(batches.map(b => b.degree).filter(Boolean))];

  // Fetch available semester numbers from Semester model
  const semesterRows = await Semester.findAll({
    attributes: ['semesterNumber'],
    where: { isActive: 'YES' },
    order: [['semesterNumber', 'ASC']]
  });

  const semesters = [...new Set(semesterRows.map(s => s.semesterNumber).filter(Boolean))];
  if (semesters.length === 0) {
    semesters.push(1, 2, 3, 4, 5, 6, 7, 8);
  }

  res.json({
    status: 'success',
    data: {
      degrees,
      semesters,
      batches: batches.map(b => ({
        batchId: b.batchId,
        degree: b.degree,
        branch: b.branch,
        batch: b.batch,
        batchYears: b.batchYears
      }))
    }
  });
});

/**
 * GET /institute_management_system/admin/results/analysis
 * Fetch complete result analysis (Course-wise & Student-wise) with metrics.
 */
export const getAdminResultAnalysis = catchAsync(async (req, res) => {
  const { degree, branch, batchYears, semester } = req.query;

  if (!degree || !branch || !batchYears) {
    return res.status(400).json({
      status: 'error',
      message: 'Degree, Branch, and Batch filters are required.'
    });
  }

  const semesterNum = semester ? Number(semester) : null;
  const cacheKey = makeCacheKey('result_analysis', { degree, branch, batchYears, semester: semesterNum });

  const resultData = await getOrSetCache(cacheKey, async () => {
    // 1. Find matching Batch
    const batch = await Batch.findOne({
      where: {
        degree: String(degree).trim(),
        branch: String(branch).trim(),
        [Op.or]: [
          { batchYears: String(batchYears).trim() },
          { batch: String(batchYears).trim() }
        ]
      },
      include: [
        {
          model: Semester,
          include: [{ model: Course }]
        }
      ]
    });

    // 2. Fetch enrolled students belonging to this degree/branch/batch
    const students = await StudentDetails.findAll({
      where: {
        [Op.or]: [
          { batch: String(batchYears).trim() },
          { batch: String(batchYears).trim().slice(0, 4) },
          sequelize.where(sequelize.col('StudentDetails.batch'), 'LIKE', `%${String(batchYears).trim().slice(0, 4)}%`)
        ]
      },
      attributes: ['registerNumber', 'studentName', 'studentId', 'section', 'Userid'],
      order: [['registerNumber', 'ASC']]
    });

    const regnoList = students.map(s => s.registerNumber);

    // Fetch User names for missing student names
    const userMap = new Map();
    if (regnoList.length > 0) {
      const userRows = await User.findAll({
        where: {
          [Op.or]: [
            { userNumber: { [Op.in]: regnoList } },
            { username: { [Op.in]: regnoList } }
          ]
        },
        attributes: ['userNumber', 'userName', 'username']
      });

      userRows.forEach(u => {
        const k1 = u.userNumber ? String(u.userNumber).trim().toUpperCase() : null;
        const k2 = u.username ? String(u.username).trim().toUpperCase() : null;
        if (k1 && u.userName) userMap.set(k1, u.userName);
        if (k2 && u.userName) userMap.set(k2, u.userName);
      });
    }

    // 3. Retrieve Courses taken by these students / batch (filtered by semester if specified)
    const semesterNum = semester ? Number(semester) : null;

    let studentEnrollments = [];
    if (regnoList.length > 0) {
      studentEnrollments = await StudentCourse.findAll({
        where: { regno: { [Op.in]: regnoList } },
        attributes: ['regno', 'courseId']
      });
    }

    const enrolledCourseIds = [...new Set(studentEnrollments.map(sc => sc.courseId))];

    const semesterWhere = {};
    if (semesterNum && !isNaN(semesterNum) && semesterNum > 0) {
      semesterWhere.semesterNumber = semesterNum;
    }
    if (batch?.batchId) {
      semesterWhere.batchId = batch.batchId;
    }

    let courses = [];
    if (enrolledCourseIds.length > 0) {
      courses = await Course.findAll({
        where: { courseId: { [Op.in]: enrolledCourseIds } },
        attributes: ['courseId', 'courseCode', 'courseTitle', 'minMark', 'maxMark', 'semesterId'],
        include: [
          {
            model: Semester,
            required: true,
            where: semesterWhere
          }
        ],
        order: [['courseCode', 'ASC']]
      });
    }

    // Fallback 1: Try semester filter without strict batchId constraint if legacy records exist
    if (courses.length === 0 && semesterNum) {
      courses = await Course.findAll({
        where: enrolledCourseIds.length > 0 ? { courseId: { [Op.in]: enrolledCourseIds } } : {},
        attributes: ['courseId', 'courseCode', 'courseTitle', 'minMark', 'maxMark', 'semesterId'],
        include: [
          {
            model: Semester,
            required: true,
            where: { semesterNumber: semesterNum }
          }
        ],
        order: [['courseCode', 'ASC']]
      });
    }

    // Fallback 2: Fetch courses belonging to this batch & semester directly
    if (courses.length === 0) {
      courses = await Course.findAll({
        attributes: ['courseId', 'courseCode', 'courseTitle', 'minMark', 'maxMark', 'semesterId'],
        include: [
          {
            model: Semester,
            required: true,
            where: semesterWhere
          }
        ],
        order: [['courseCode', 'ASC']]
      });
    }

    const courseIds = courses.map(c => c.courseId);

    // 4. Fetch ExamTypes
    const examTypes = await CourseExamType.findAll({
      where: { courseId: { [Op.in]: courseIds } },
      include: [
        {
          model: StudentResult,
          include: [{ model: StudentDetails, attributes: ['registerNumber', 'studentName'] }]
        }
      ]
    });

    const enrollmentSet = new Set();
    studentEnrollments.forEach(e => {
      enrollmentSet.add(`${String(e.regno).trim().toUpperCase()}_${e.courseId}`);
    });
    const hasEnrollmentRecords = studentEnrollments.length > 0;

    // 5. Group by Course
    const courseWiseAnalysis = courses.map((course) => {
      const courseExamTypes = examTypes.filter(et => et.courseId === course.courseId);

      const formattedExamTypes = courseExamTypes.map((et) => {
        const maxMarks = Number(et.maxMarks);
        const passMarkThreshold = course.minMark ? (course.minMark / (course.maxMark || 100)) * maxMarks : maxMarks * 0.4;

        const results = et.StudentResults || [];
        const studentMarksList = [];
        let totalSum = 0;
        let enteredCount = 0;
        let pendingCount = 0;
        let highest = -1;
        let lowest = 999999;
        let passCount = 0;
        let failCount = 0;

        students.forEach((stud) => {
          const normReg = String(stud.registerNumber).trim().toUpperCase();
          let resolvedName = resolveStudentDisplayName(stud);
          if ((!resolvedName || resolvedName === normReg || resolvedName === 'N/A') && userMap.has(normReg)) {
            resolvedName = userMap.get(normReg);
          }

          const resRow = results.find(r => String(r.regno).trim().toUpperCase() === normReg);
          const markVal = resRow && resRow.marks !== null && resRow.marks !== undefined ? Number(resRow.marks) : null;

          if (markVal !== null) {
            enteredCount++;
            totalSum += markVal;
            if (markVal > highest) highest = markVal;
            if (markVal < lowest) lowest = markVal;

            if (markVal >= passMarkThreshold) {
              passCount++;
            } else {
              failCount++;
            }
          } else {
            pendingCount++;
          }

          studentMarksList.push({
            regno: stud.registerNumber,
            studentName: resolvedName || stud.registerNumber,
            mark: markVal
          });
        });

        const totalStudents = students.length;
        const average = enteredCount > 0 ? Number((totalSum / enteredCount).toFixed(1)) : 0;
        const passPercentage = enteredCount > 0 ? Number(((passCount / enteredCount) * 100).toFixed(1)) : 0;

        return {
          examTypeId: et.examTypeId,
          examTypeName: et.examTypeName,
          maxMarks,
          stats: {
            totalStudents,
            marksEntered: enteredCount,
            marksPending: pendingCount,
            average,
            highest: highest === -1 ? 0 : highest,
            lowest: lowest === 999999 ? 0 : lowest,
            passCount,
            failCount,
            passPercentage
          },
          students: studentMarksList
        };
      });

      return {
        courseId: course.courseId,
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        examTypes: formattedExamTypes
      };
    });

    // 6. Generate Student-wise Analysis matrix
    const studentWiseAnalysis = students.map((stud) => {
      const normReg = String(stud.registerNumber).trim().toUpperCase();
      let resolvedName = resolveStudentDisplayName(stud);
      if ((!resolvedName || resolvedName === normReg || resolvedName === 'N/A') && userMap.has(normReg)) {
        resolvedName = userMap.get(normReg);
      }

      const studentCourses = courseWiseAnalysis.map((c) => {
        const isStudying = !hasEnrollmentRecords || enrollmentSet.has(`${normReg}_${c.courseId}`);

        const examMarks = {};
        c.examTypes.forEach((et) => {
          if (!isStudying) {
            examMarks[et.examTypeName] = undefined;
          } else {
            const match = et.students.find(s => String(s.regno).trim().toUpperCase() === normReg);
            examMarks[et.examTypeName] = match && match.mark !== null && match.mark !== undefined ? match.mark : null;
          }
        });

        return {
          courseId: c.courseId,
          courseCode: c.courseCode,
          courseTitle: c.courseTitle,
          isStudying,
          marks: examMarks
        };
      });

      return {
        regno: stud.registerNumber,
        studentName: resolvedName || stud.registerNumber,
        section: stud.section || 'A',
        courses: studentCourses
      };
    });

    return {
      degree,
      branch,
      batchYears,
      totalStudents: students.length,
      courses: courseWiseAnalysis,
      students: studentWiseAnalysis
    };
  }, ttl.medium);

  res.json({
    status: 'success',
    data: resultData
  });
});

/**
 * GET /institute_management_system/admin/results/export
 * Download result analysis as a structured Excel file with Summary + Course sheets.
 */
export const exportAdminResultExcel = catchAsync(async (req, res) => {
  const { degree, branch, batchYears, semester } = req.query;

  if (!degree || !branch || !batchYears) {
    return res.status(400).send('Missing degree, branch, or batchYears params');
  }

  const semesterNum = semester ? Number(semester) : null;
  const cacheKey = makeCacheKey('result_analysis', { degree, branch, batchYears, semester: semesterNum });
  const analysisData = await getOrSetCache(cacheKey, async () => {
    const reqMock = { query: { degree, branch, batchYears, semester: semesterNum } };
    let capturedData = null;
    const resMock = { json: (obj) => { capturedData = obj.data; } };
    await getAdminResultAnalysis(reqMock, resMock, () => {});
    return capturedData;
  });

  if (!analysisData || !analysisData.courses) {
    return res.status(404).send('No result data found for the selected filter.');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EduVault Academic IMS';
  workbook.created = new Date();

  const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
  const SUBHEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } };
  const WHITE_BOLD_FONT = { color: { argb: 'FFFFFF' }, bold: true, size: 11 };
  const TITLE_FONT = { bold: true, size: 14, color: { argb: '1E293B' } };
  const BORDER_STYLE = {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } }
  };

  /* SHEET 1: Overall Analysis */
  const summarySheet = workbook.addWorksheet('Overall Analysis');

  summarySheet.addRow([`Academic Result Analysis Report`]).font = TITLE_FONT;
  summarySheet.addRow([`Degree: ${degree}  |  Branch: ${branch}  |  Batch: ${batchYears}`]).font = { italic: true, size: 11 };
  summarySheet.addRow([]);

  const allExamTypeNames = new Set();
  analysisData.courses.forEach(c => {
    c.examTypes.forEach(et => allExamTypeNames.add(et.examTypeName));
  });
  const examTypeList = Array.from(allExamTypeNames);

  const summaryHeaders = ['Register No', 'Student Name', 'Course', ...examTypeList];
  const headerRow = summarySheet.addRow(summaryHeaders);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = WHITE_BOLD_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  (analysisData.students || []).forEach((st) => {
    (st.courses || []).forEach((c) => {
      const rowVals = [st.regno, st.studentName, `${c.courseCode} - ${c.courseTitle}`];
      examTypeList.forEach((etName) => {
        const mark = c.marks ? c.marks[etName] : null;
        rowVals.push(mark !== null && mark !== undefined ? mark : '');
      });
      const r = summarySheet.addRow(rowVals);
      r.eachCell((cell) => { cell.border = BORDER_STYLE; });
    });
  });

  summarySheet.columns.forEach((col) => { col.width = 22; });

  /* SHEET 2+: Course Sheets */
  analysisData.courses.forEach((course) => {
    const safeSheetName = String(course.courseCode || 'Course').replace(/[/\\?*:[\]]/g, '').slice(0, 30);
    const sheet = workbook.addWorksheet(safeSheetName);

    sheet.addRow([`${course.courseCode} - ${course.courseTitle}`]).font = TITLE_FONT;
    sheet.addRow([`Degree: ${degree} | Branch: ${branch} | Batch: ${batchYears}`]).font = { italic: true, size: 10 };
    sheet.addRow([]);

    (course.examTypes || []).forEach((et) => {
      const etHeader = sheet.addRow([`Exam Type: ${et.examTypeName}  (Max Marks: ${et.maxMarks})`]);
      etHeader.font = { bold: true, size: 12, color: { argb: '1E40AF' } };
      sheet.addRow([]);

      const tableHeader = sheet.addRow(['Register No', 'Student Name', 'Mark', 'Max Marks', 'Status']);
      tableHeader.eachCell((cell) => {
        cell.fill = SUBHEADER_FILL;
        cell.font = WHITE_BOLD_FONT;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      (et.students || []).forEach((st) => {
        const markVal = st.mark !== null && st.mark !== undefined ? st.mark : '';
        const passMark = (course.minMark || (et.maxMarks * 0.4));
        let statusStr = 'Pending';
        if (markVal !== '') {
          statusStr = markVal >= passMark ? 'PASS' : 'FAIL';
        }

        const dataRow = sheet.addRow([
          st.regno,
          st.studentName,
          markVal,
          et.maxMarks,
          statusStr
        ]);

        dataRow.eachCell((cell, colNumber) => {
          cell.border = BORDER_STYLE;
          if (colNumber === 3 || colNumber === 4) {
            cell.alignment = { horizontal: 'right' };
          }
          if (colNumber === 5) {
            cell.alignment = { horizontal: 'center' };
            if (statusStr === 'PASS') cell.font = { color: { argb: '16A34A' }, bold: true };
            if (statusStr === 'FAIL') cell.font = { color: { argb: 'DC2626' }, bold: true };
          }
        });
      });

      sheet.addRow([]);
    });

    sheet.columns = [
      { width: 20 },
      { width: 30 },
      { width: 14 },
      { width: 14 },
      { width: 16 }
    ];
  });

  const filename = `Result_Analysis_${degree}_${branch}_${batchYears}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
});

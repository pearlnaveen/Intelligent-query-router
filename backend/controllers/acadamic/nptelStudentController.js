import db from "../../models/acadamic/index.js";
import catchAsync from "../../utils/catchAsync.js";
import { Op } from "sequelize";
import { recalculateStudentAcademicRows } from "./gradeController.js";

const {
  sequelize,
  NptelCourse,
  StudentNptelEnrollment,
  StudentDetails,
  Semester,
  StudentGrade,
  NptelCreditTransfer,
  StudentElectiveSelection,
  Course,
  User,
  Department
} = db;

// Helper to safely get current user ID (handles both 'id' from JWT and 'userId' naming)
const getCurrentUserId = (req) => req.query.userId || req.user?.id || req.user?.userId;

/**
 * Utility: Get Student Registration Number from User Session
 */
const getRegNo = async (req) => {
  const userId = getCurrentUserId(req);
  if (!userId) return null;

  let regno = req.user?.userNumber;
  if (!regno || req.query.userId) { // If userId provided in query, look up that user specifically
    const currentUser = await User.findByPk(userId, {
      attributes: ["userNumber"],
    });
    regno = currentUser?.userNumber || null;
  }

  if (!regno) return null;

  const student = await StudentDetails.findOne({
    where: { registerNumber: regno },
    attributes: ["registerNumber"],
  });

  return student?.registerNumber || null;
};

export const getNptelCourses = catchAsync(async (req, res) => {
  const userId = getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ status: "failure", message: "User not authenticated" });
  }

  const { semesterId } = req.query;

  const regno = await getRegNo(req);
  if (!regno) {
    return res.status(404).json({ status: "failure", message: "Student profile not found" });
  }

  // Find all course IDs already enrolled by this student across ANY semester
  const existingEnrollments = await StudentNptelEnrollment.findAll({
    where: { regno, isActive: 'YES' },
    attributes: ['nptelCourseId', 'semesterId']
  });
  const enrolledCourseIds = new Set(existingEnrollments.map(e => e.nptelCourseId));

  // Global catalogue - only active NPTEL courses NOT yet enrolled by this student in ANY semester
  const courses = await NptelCourse.findAll({
    where: {
      isActive: 'YES',
      ...(enrolledCourseIds.size > 0 ? { nptelCourseId: { [Op.notIn]: [...enrolledCourseIds] } } : {})
    },
    order: [['courseTitle', 'ASC']]
  });

  const enriched = courses.map(c => ({
    ...c.toJSON(),
    isEnrolled: false,
    enrolledSemesterId: null
  }));

  res.status(200).json({ status: "success", data: enriched });
});

export const enrollNptel = catchAsync(async (req, res) => {
  const userId = getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ status: "failure", message: "User not authenticated" });
  }

  const { semesterId, nptelCourseIds } = req.body;

  if (!semesterId || !Array.isArray(nptelCourseIds) || nptelCourseIds.length === 0) {
    return res.status(400).json({ status: "failure", message: "Invalid input data: semesterId and nptelCourseIds required" });
  }

  const regno = await getRegNo(req);
  if (!regno) {
    return res.status(404).json({ status: "failure", message: "Student profile not found" });
  }

  const transaction = await sequelize.transaction();
  try {
    const sem = await Semester.findOne({ where: { semesterId, isActive: 'YES' }, transaction });
    if (!sem) throw new Error("Invalid or inactive semester");

    // Guard: Prevent enrolling in any course that is already enrolled in ANY semester by this student
    const alreadyEnrolled = await StudentNptelEnrollment.findAll({
      where: {
        regno,
        nptelCourseId: { [Op.in]: nptelCourseIds },
        isActive: 'YES'
      },
      include: [{ model: NptelCourse, attributes: ['courseTitle'] }],
      transaction
    });
    if (alreadyEnrolled.length > 0) {
      const titles = alreadyEnrolled.map(e => e.NptelCourse?.courseTitle || e.nptelCourseId).join(', ');
      throw new Error(`Already enrolled in: ${titles}. A course can only be enrolled once across all semesters.`);
    }

    const validCourses = await NptelCourse.findAll({
      where: {
        nptelCourseId: { [Op.in]: nptelCourseIds },
        isActive: 'YES'
      },
      transaction
    });

    if (validCourses.length !== nptelCourseIds.length) {
      throw new Error("One or more courses were not found or are inactive");
    }

    let enrolledCount = 0;
    for (const courseId of nptelCourseIds) {
      const [record, created] = await StudentNptelEnrollment.findOrCreate({
        where: { regno, nptelCourseId: courseId, semesterId },
        defaults: { regno, nptelCourseId: courseId, semesterId, isActive: 'YES' },
        transaction
      });
      if (created) enrolledCount++;
    }

    await transaction.commit();
    res.status(200).json({ status: "success", message: `Enrolled in ${enrolledCount} course(s)`, enrolledCount });
  } catch (err) {
    await transaction.rollback();
    res.status(400).json({ status: "failure", message: err.message });
  }
});

export const getStudentNptelEnrollments = catchAsync(async (req, res) => {
  const userId = getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ status: "failure", message: "User not authenticated" });
  }

  const regno = await getRegNo(req);
  if (!regno) {
    return res.status(404).json({ status: "failure", message: "Student profile not found" });
  }

  const enrollments = await StudentNptelEnrollment.findAll({
    where: { regno, isActive: 'YES' },
    include: [
      { model: NptelCourse },
      { model: Semester },
      { model: NptelCreditTransfer }
    ],
    order: [[Semester, 'semesterNumber', 'DESC'], [NptelCourse, 'courseTitle', 'ASC']]
  });

  const courseCodes = enrollments.map(e => e.NptelCourse?.courseCode).filter(Boolean);
  const grades = courseCodes.length > 0
    ? await StudentGrade.findAll({ where: { regno, courseCode: { [Op.in]: courseCodes } } })
    : [];
  const gradeMap = new Map(grades.map(g => [g.courseCode, g.grade]));

  const data = enrollments.map(e => ({
    enrollmentId: e.enrollmentId,
    nptelCourseId: e.nptelCourseId,
    courseTitle: e.NptelCourse?.courseTitle,
    courseCode: e.NptelCourse?.courseCode,
    type: e.NptelCreditTransfer?.creditType || e.NptelCourse?.type || null,
    creditType: e.NptelCreditTransfer?.creditType || null,
    credits: e.NptelCourse?.credits,
    semesterNumber: e.Semester?.semesterNumber,
    semesterId: e.semesterId,
    importedGrade: gradeMap.get(e.NptelCourse?.courseCode) || null,
    studentStatus: e.NptelCreditTransfer?.studentStatus || null,
    studentRemarks: e.NptelCreditTransfer?.studentRemarks || null,
    studentRespondedAt: e.NptelCreditTransfer?.studentRespondedAt || null
  }));

  res.status(200).json({ status: "success", data });
});

export const requestCreditTransfer = catchAsync(async (req, res) => {
  const userId = getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ status: "failure", message: "User not authenticated" });
  }

  const { enrollmentId, decision, remarks, creditType } = req.body;

  if (!['accepted', 'rejected'].includes(decision)) {
    return res.status(400).json({ status: "failure", message: "Invalid decision" });
  }

  const regno = await getRegNo(req);
  if (!regno) {
    return res.status(404).json({ status: "failure", message: "Student profile not found" });
  }

  const enrollment = await StudentNptelEnrollment.findOne({
    where: { enrollmentId, regno },
    include: [
      { model: NptelCourse },
      { model: NptelCreditTransfer }
    ]
  });
  if (!enrollment) return res.status(404).json({ status: "failure", message: "Enrollment not found" });

  const gradeRecord = await StudentGrade.findOne({
    where: { regno, courseCode: enrollment.NptelCourse.courseCode }
  });
  if (!gradeRecord) return res.status(400).json({ status: "failure", message: "Grade not imported yet" });

  if (decision === 'rejected') {
    let transfer = await NptelCreditTransfer.findOne({ where: { enrollmentId } });
    if (transfer) {
      await transfer.update({
        grade: gradeRecord.grade,
        creditType: creditType || transfer.creditType || null,
        studentStatus: 'rejected',
        studentRemarks: remarks || null,
        studentRespondedAt: new Date()
      });
    } else {
      await NptelCreditTransfer.create({
        enrollmentId,
        regno,
        nptelCourseId: enrollment.nptelCourseId,
        grade: gradeRecord.grade,
        creditType: creditType || enrollment.NptelCreditTransfer?.creditType || null,
        studentStatus: 'rejected',
        studentRemarks: remarks || null,
        studentRespondedAt: new Date()
      });
    }

    await recalculateStudentAcademicRows(regno, null);

    return res.status(200).json({
      status: "success",
      message: "Credit transfer rejected."
    });
  }

  // Decision is 'accepted' -> validate creditType and limits
  const selectedType = creditType || enrollment.NptelCreditTransfer?.creditType;
  if (!selectedType || !['OEC', 'PEC'].includes(selectedType)) {
    return res.status(400).json({
      status: "failure",
      message: "Please choose whether to transfer this course as an Open Elective (OEC) or Professional Elective (PEC)."
    });
  }

  const courseCredits = Number(enrollment.NptelCourse?.credits || 0);

  // 1. LIMIT CHECK: Max 15 credits from NPTEL
  const otherAcceptedTransfers = await NptelCreditTransfer.findAll({
    where: {
      regno,
      studentStatus: 'accepted',
      enrollmentId: { [Op.ne]: enrollmentId }
    },
    include: [{ model: NptelCourse, attributes: ['credits'] }]
  });

  const currentNptelCredits = otherAcceptedTransfers.reduce(
    (sum, t) => sum + Number(t.NptelCourse?.credits || 0),
    0
  );

  if (currentNptelCredits + courseCredits > 15) {
    return res.status(400).json({
      status: "failure",
      message: `NPTEL credit transfer limit reached. Maximum 15 credits allowed from NPTEL. You already have ${currentNptelCredits} credits transferred, so you can transfer at most ${Math.max(0, 15 - currentNptelCredits)} more credit(s).`
    });
  }

  // 2. LIMIT CHECK: Max 9 OEC credits and Max 18 PEC credits (college regular + NPTEL)
  const catLimit = selectedType === 'OEC' ? 9 : 18;
  const catLabel = selectedType === 'OEC' ? 'Open Elective (OEC)' : 'Professional Elective (PEC)';

  // College regular completed credits for selectedType
  const passedRegularGrades = await StudentGrade.findAll({
    where: { regno, grade: { [Op.ne]: 'U' } },
    attributes: ['courseCode']
  });
  const passedCodes = [...new Set(passedRegularGrades.map(g => g.courseCode))];

  let collegeCatCredits = 0;
  if (passedCodes.length > 0) {
    const regCourses = await (db.RegulationCourse?.findAll({
      where: {
        courseCode: { [Op.in]: passedCodes },
        category: selectedType,
        isActive: 'YES'
      },
      attributes: ['courseCode', 'credits']
    }) || Promise.resolve([]));

    const countedCodes = new Set();
    for (const rc of regCourses) {
      if (!countedCodes.has(rc.courseCode)) {
        collegeCatCredits += Number(rc.credits || 0);
        countedCodes.add(rc.courseCode);
      }
    }

    const uncountedCodes = passedCodes.filter(c => !countedCodes.has(c));
    if (uncountedCodes.length > 0) {
      const fallbackCourses = await Course.findAll({
        where: {
          courseCode: { [Op.in]: uncountedCodes },
          category: selectedType
        },
        attributes: ['courseCode', 'credits']
      });
      for (const fc of fallbackCourses) {
        if (!countedCodes.has(fc.courseCode)) {
          collegeCatCredits += Number(fc.credits || 0);
          countedCodes.add(fc.courseCode);
        }
      }
    }
  }

  // Other NPTEL accepted transfers for selectedType
  const nptelCatCredits = otherAcceptedTransfers
    .filter(t => (t.creditType || t.NptelCourse?.type) === selectedType)
    .reduce((sum, t) => sum + Number(t.NptelCourse?.credits || 0), 0);

  const currentCatCredits = collegeCatCredits + nptelCatCredits;

  if (currentCatCredits + courseCredits > catLimit) {
    return res.status(400).json({
      status: "failure",
      message: `${catLabel} limit exceeded. Maximum ${catLimit} credits allowed. Currently you have ${currentCatCredits} credits (${collegeCatCredits} from regular + ${nptelCatCredits} from NPTEL). This course (${courseCredits} credits) would make it ${currentCatCredits + courseCredits} credits.`
    });
  }

  let transfer = await NptelCreditTransfer.findOne({ where: { enrollmentId } });
  if (transfer) {
    await transfer.update({
      grade: gradeRecord.grade,
      creditType: selectedType,
      studentStatus: 'accepted',
      studentRemarks: remarks || null,
      studentRespondedAt: new Date()
    });
  } else {
    await NptelCreditTransfer.create({
      enrollmentId,
      regno,
      nptelCourseId: enrollment.nptelCourseId,
      grade: gradeRecord.grade,
      creditType: selectedType,
      studentStatus: 'accepted',
      studentRemarks: remarks || null,
      studentRespondedAt: new Date()
    });
  }

  await recalculateStudentAcademicRows(regno, null);

  res.status(200).json({
    status: "success",
    message: `Credit transfer accepted as ${selectedType}!`
  });
});

export const computeStudentOecPecProgress = async (regno) => {
  if (!regno) return null;

  const student = await StudentDetails.findOne({
    where: { registerNumber: regno },
    include: [{ model: Department, as: 'department' }],
  });

  if (!student) return null;

  // Course limit requirements: OEC = 3 courses (9 credits), PEC = 6 courses (18 credits)
  const requiredMap = { OEC: 3, PEC: 6 };
  const requiredCreditsMap = { OEC: 9, PEC: 18 };

  // College elective enrollments
  const collegeEnrollments = await StudentElectiveSelection.findAll({
    where: {
      regno: student.registerNumber,
      status: { [Op.in]: ['pending', 'allocated'] }
    },
    include: [{
      model: Course,
      attributes: ['courseCode', 'category', 'credits'],
      where: { category: { [Op.in]: ['OEC', 'PEC'] } }
    }],
    attributes: ['selectionId'],
  });

  // NPTEL enrollments with credit transfer
  const nptelEnrollments = await StudentNptelEnrollment.findAll({
    where: { regno: student.registerNumber, isActive: 'YES' },
    include: [
      { model: NptelCourse, attributes: ['courseCode', 'type', 'credits'] },
      { model: NptelCreditTransfer, attributes: ['creditType', 'studentStatus'] }
    ],
    attributes: ['enrollmentId'],
  });

  const collegeEnrolledMap = { OEC: 0, PEC: 0 };
  const nptelEnrolledMap = { OEC: 0, PEC: 0 };
  const collegeCodesByType = { OEC: new Set(), PEC: new Set() };
  const nptelCodesByType = { OEC: new Set(), PEC: new Set() };

  for (const row of collegeEnrollments) {
    const course = row.Course;
    const cat = course?.category;
    const code = course?.courseCode;
    if (!cat || !code) continue;
    collegeEnrolledMap[cat] += 1;
    collegeCodesByType[cat].add(code);
  }

  let nptelTransferredCreditsTotal = 0;
  let nptelTransferredCountTotal = 0;
  let nptelTransferredOecCredits = 0;
  let nptelTransferredOecCount = 0;
  let nptelTransferredPecCredits = 0;
  let nptelTransferredPecCount = 0;

  for (const row of nptelEnrollments) {
    const course = row.NptelCourse;
    const transfer = row.NptelCreditTransfer;
    const code = course?.courseCode;
    if (!code) continue;

    const credits = Number(course?.credits || 0);
    const assignedType = transfer?.creditType || course?.type || 'OEC';
    nptelEnrolledMap[assignedType] = (nptelEnrolledMap[assignedType] || 0) + 1;
    nptelCodesByType[assignedType].add(code);

    if (transfer?.studentStatus === 'accepted') {
      nptelTransferredCountTotal += 1;
      nptelTransferredCreditsTotal += credits;

      if (assignedType === 'OEC') {
        nptelTransferredOecCredits += credits;
        nptelTransferredOecCount += 1;
      } else if (assignedType === 'PEC') {
        nptelTransferredPecCredits += credits;
        nptelTransferredPecCount += 1;
      }
    }
  }

  // All student passed grades
  const allPassedGrades = await StudentGrade.findAll({
    where: {
      regno: student.registerNumber,
      grade: { [Op.ne]: 'U' },
    },
    attributes: ['courseCode'],
  });
  const passedCodes = new Set(allPassedGrades.map((g) => g.courseCode));
  const passedCodesArr = Array.from(passedCodes);

  // Map to store actual course credits
  const courseCreditsLookup = new Map();

  // If student passed college courses in Course table that are OEC/PEC but weren't in StudentElectiveSelection
  if (passedCodesArr.length > 0) {
    const passedCourses = await Course.findAll({
      where: {
        courseCode: { [Op.in]: passedCodesArr },
        category: { [Op.in]: ['OEC', 'PEC'] }
      },
      attributes: ['courseCode', 'category', 'credits']
    });
    for (const c of passedCourses) {
      courseCreditsLookup.set(c.courseCode, Number(c.credits) || 0);
      if (c.category === 'OEC') collegeCodesByType.OEC.add(c.courseCode);
      if (c.category === 'PEC') collegeCodesByType.PEC.add(c.courseCode);
    }

    if (db.RegulationCourse) {
      const regCourses = await db.RegulationCourse.findAll({
        where: {
          courseCode: { [Op.in]: passedCodesArr },
          category: { [Op.in]: ['OEC', 'PEC'] }
        },
        attributes: ['courseCode', 'category', 'credits']
      });
      for (const rc of regCourses) {
        if (!courseCreditsLookup.has(rc.courseCode)) {
          courseCreditsLookup.set(rc.courseCode, Number(rc.credits) || 0);
        }
        if (rc.category === 'OEC') collegeCodesByType.OEC.add(rc.courseCode);
        if (rc.category === 'PEC') collegeCodesByType.PEC.add(rc.courseCode);
      }
    }
  }

  // Deduplicate: NPTEL courses must never be counted as college courses
  for (const code of nptelCodesByType.OEC) {
    collegeCodesByType.OEC.delete(code);
  }
  for (const code of nptelCodesByType.PEC) {
    collegeCodesByType.PEC.delete(code);
  }

  const gradeCompletedCollegeMap = { OEC: 0, PEC: 0 };
  const collegeCreditsMap = { OEC: 0, PEC: 0 };
  const gradeCompletedNptelMap = { OEC: 0, PEC: 0 };

  for (const code of collegeCodesByType.OEC) {
    if (passedCodes.has(code)) {
      gradeCompletedCollegeMap.OEC += 1;
      collegeCreditsMap.OEC += (courseCreditsLookup.get(code) || 3);
    }
  }
  for (const code of collegeCodesByType.PEC) {
    if (passedCodes.has(code)) {
      gradeCompletedCollegeMap.PEC += 1;
      collegeCreditsMap.PEC += (courseCreditsLookup.get(code) || 3);
    }
  }
  for (const code of nptelCodesByType.OEC) {
    if (passedCodes.has(code)) gradeCompletedNptelMap.OEC += 1;
  }
  for (const code of nptelCodesByType.PEC) {
    if (passedCodes.has(code)) gradeCompletedNptelMap.PEC += 1;
  }
  gradeCompletedNptelMap.OEC = Math.max(gradeCompletedNptelMap.OEC, nptelTransferredOecCount);
  gradeCompletedNptelMap.PEC = Math.max(gradeCompletedNptelMap.PEC, nptelTransferredPecCount);

  const enrolledTotal = {
    OEC: collegeEnrolledMap.OEC + nptelEnrolledMap.OEC,
    PEC: collegeEnrolledMap.PEC + nptelEnrolledMap.PEC,
  };

  const gradeCompletedTotal = {
    OEC: gradeCompletedCollegeMap.OEC + gradeCompletedNptelMap.OEC,
    PEC: gradeCompletedCollegeMap.PEC + gradeCompletedNptelMap.PEC,
  };

  const totalOecCredits = collegeCreditsMap.OEC + nptelTransferredOecCredits;
  const totalPecCredits = collegeCreditsMap.PEC + nptelTransferredPecCredits;

  return {
    required: requiredMap,
    requiredCredits: requiredCreditsMap,
    completed: enrolledTotal,
    enrolled: enrolledTotal,
    gradeCompleted: gradeCompletedTotal,
    completedCredits: {
      OEC: totalOecCredits,
      PEC: totalPecCredits,
    },
    remaining: {
      OEC: Math.max(0, requiredMap.OEC - enrolledTotal.OEC),
      PEC: Math.max(0, requiredMap.PEC - enrolledTotal.PEC),
    },
    fromNptel: nptelEnrolledMap,
    fromCollege: collegeEnrolledMap,
    gradeCompletedFromNptel: gradeCompletedNptelMap,
    gradeCompletedFromCollege: gradeCompletedCollegeMap,
    nptelCredits: {
      transferred: nptelTransferredCreditsTotal,
      max: 15,
      remaining: Math.max(0, 15 - nptelTransferredCreditsTotal),
      transferredCount: nptelTransferredCountTotal
    },
    oec: {
      completedCredits: totalOecCredits,
      nptelTransferredCredits: nptelTransferredOecCredits,
      collegeCredits: collegeCreditsMap.OEC,
      completed: gradeCompletedTotal.OEC,
      enrolled: enrolledTotal.OEC,
      total: requiredMap.OEC,
      remaining: Math.max(0, requiredMap.OEC - gradeCompletedTotal.OEC),
      remainingCredits: Math.max(0, requiredCreditsMap.OEC - totalOecCredits),
      creditsCompleted: totalOecCredits,
      maxCredits: requiredCreditsMap.OEC,
      nptelCount: nptelTransferredOecCount,
      collegeCount: gradeCompletedCollegeMap.OEC
    },
    pec: {
      completedCredits: totalPecCredits,
      nptelTransferredCredits: nptelTransferredPecCredits,
      collegeCredits: collegeCreditsMap.PEC,
      completed: gradeCompletedTotal.PEC,
      enrolled: enrolledTotal.PEC,
      total: requiredMap.PEC,
      remaining: Math.max(0, requiredMap.PEC - gradeCompletedTotal.PEC),
      remainingCredits: Math.max(0, requiredCreditsMap.PEC - totalPecCredits),
      creditsCompleted: totalPecCredits,
      maxCredits: requiredCreditsMap.PEC,
      nptelCount: nptelTransferredPecCount,
      collegeCount: gradeCompletedCollegeMap.PEC
    }
  };
};

export const getOecPecProgress = catchAsync(async (req, res) => {
  const targetUserId = req.query.userId || req.query.studentId;
  const targetRegno = req.query.regno;
  let regno = targetRegno;

  if (!regno && targetUserId) {
    const user = await User.findByPk(targetUserId, { attributes: ['userNumber'] });
    regno = user?.userNumber;
  }

  if (!regno) {
    regno = req.user?.userNumber;
  }
  if (!regno && (req.user?.id || req.user?.userId)) {
    const currentUser = await User.findByPk(req.user?.id || req.user?.userId, { attributes: ['userNumber'] });
    regno = currentUser?.userNumber;
  }

  if (!regno) {
    return res.status(404).json({ status: "failure", message: "User or register number not found" });
  }

  const data = await computeStudentOecPecProgress(regno);
  if (!data) {
    return res.status(404).json({ status: "failure", message: `Student profile not found for ${regno}` });
  }

  res.status(200).json({
    status: "success",
    data
  });
});

export const getStudentNptelSummary = catchAsync(async (req, res) => {
  const targetUserId = req.query.userId || req.query.studentId;
  const targetRegno = req.query.regno;
  let regno = targetRegno;

  if (!regno && targetUserId) {
    const user = await User.findByPk(targetUserId, { attributes: ['userNumber'] });
    regno = user?.userNumber;
  }

  if (!regno) {
    regno = await getRegNo(req);
  }

  if (!regno) {
    return res.status(404).json({ status: 'failure', message: 'Student register number not found' });
  }

  const enrollments = await StudentNptelEnrollment.findAll({
    where: { regno, isActive: 'YES' },
    include: [
      { model: NptelCourse },
      { model: Semester, attributes: ['semesterId', 'semesterNumber'] },
      { model: NptelCreditTransfer }
    ],
    order: [[Semester, 'semesterNumber', 'DESC'], [NptelCourse, 'courseTitle', 'ASC']]
  });

  const courseCodes = enrollments.map(e => e.NptelCourse?.courseCode).filter(Boolean);
  const grades = courseCodes.length > 0
    ? await StudentGrade.findAll({ where: { regno, courseCode: { [Op.in]: courseCodes } } })
    : [];
  const gradeMap = new Map(grades.map(g => [g.courseCode, g.grade]));

  let completedCount = 0;
  let transferredCount = 0;
  let transferredCredits = 0;
  let oecTransferredCredits = 0;
  let oecTransferredCount = 0;
  let pecTransferredCredits = 0;
  let pecTransferredCount = 0;

  const courses = enrollments.map(e => {
    const code = e.NptelCourse?.courseCode;
    const grade = gradeMap.get(code) || null;
    const credits = Number(e.NptelCourse?.credits || 0);
    const transfer = e.NptelCreditTransfer;
    const creditType = transfer?.creditType || e.NptelCourse?.type || null;

    if (grade && grade !== 'U') {
      completedCount++;
    }
    if (transfer?.studentStatus === 'accepted') {
      transferredCount++;
      transferredCredits += credits;

      if (creditType === 'OEC') {
        oecTransferredCredits += credits;
        oecTransferredCount++;
      } else if (creditType === 'PEC') {
        pecTransferredCredits += credits;
        pecTransferredCount++;
      }
    }

    return {
      enrollmentId: e.enrollmentId,
      nptelCourseId: e.nptelCourseId,
      courseTitle: e.NptelCourse?.courseTitle,
      courseCode: code,
      credits,
      semesterNumber: e.Semester?.semesterNumber,
      semesterId: e.semesterId,
      grade,
      studentStatus: transfer?.studentStatus || null,
      transferStatus: transfer?.studentStatus || null,
      creditType,
      studentRemarks: transfer?.studentRemarks,
      studentRespondedAt: transfer?.studentRespondedAt
    };
  });

  // Calculate OEC & PEC curriculum fulfillment stats
  const oecPecData = await computeStudentOecPecProgress(regno);

  res.status(200).json({
    status: 'success',
    data: {
      regno,
      completedCount,
      transferredCount,
      transferredCredits,
      maxCredits: 15,
      maxNptelCredits: 15,
      remainingCredits: Math.max(0, 15 - transferredCredits),
      remainingNptelCredits: Math.max(0, 15 - transferredCredits),
      courses,
      oec: {
        completedCredits: oecPecData?.oec?.completedCredits ?? oecTransferredCredits,
        nptelTransferredCredits: oecTransferredCredits,
        collegeCredits: oecPecData?.oec?.collegeCredits ?? 0,
        maxCredits: 9,
        remainingCredits: oecPecData?.oec?.remainingCredits ?? Math.max(0, 9 - oecTransferredCredits),
        completedCount: oecPecData?.oec?.completed ?? oecTransferredCount,
        nptelCount: oecTransferredCount,
        collegeCount: oecPecData?.oec?.collegeCount ?? 0,
        total: 3
      },
      pec: {
        completedCredits: oecPecData?.pec?.completedCredits ?? pecTransferredCredits,
        nptelTransferredCredits: pecTransferredCredits,
        collegeCredits: oecPecData?.pec?.collegeCredits ?? 0,
        maxCredits: 18,
        remainingCredits: oecPecData?.pec?.remainingCredits ?? Math.max(0, 18 - pecTransferredCredits),
        completedCount: oecPecData?.pec?.completed ?? pecTransferredCount,
        nptelCount: pecTransferredCount,
        collegeCount: oecPecData?.pec?.collegeCount ?? 0,
        total: 6
      }
    }
  });
});

export const studentNptelCreditDecision = requestCreditTransfer;

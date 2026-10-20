/**
 * Scripts/auto_enroll_and_accept_nptel.js
 *
 * Standalone CLI script to import past NPTEL grades from Excel (.xlsx) or CSV,
 * automatically enroll students for that semester, auto-accept credit transfers (OEC/PEC),
 * and recompute GPA/CGPA.
 *
 * Format expected:
 * | SL NO | Roll No. | Course code | GRADE | PEC / OEC |
 *
 * Usage:
 *   node Scripts/auto_enroll_and_accept_nptel.js <filePath> <semesterId_or_semesterNumber>
 *
 * Example:
 *   node Scripts/auto_enroll_and_accept_nptel.js ./past_nptel.xlsx 3
 */

import db from '../models/acadamic/index.js';
import XLSX from 'xlsx';
import { recalculateStudentAcademicRows } from '../controllers/acadamic/gradeController.js';

const {
  sequelize,
  StudentDetails,
  NptelCourse,
  StudentNptelEnrollment,
  NptelCreditTransfer,
  StudentGrade,
  Semester,
  GradePoint
} = db;

const normalizeHeader = (v) => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizeCode = (v) => String(v ?? '').replace(/\s+/g, '').toUpperCase();
const normalizeCreditType = (val) => {
  const norm = String(val ?? '').trim().toUpperCase();
  if (norm.includes('PEC')) return 'PEC';
  if (norm.includes('OEC')) return 'OEC';
  return 'OEC';
};

const normalizeGrade = (val) => {
  if (val === null || val === undefined) return null;
  const str = String(val).trim().toUpperCase().replace(/\s+/g, '');
  if (!str) return null;
  const gradeAliases = {
    S: 'S', OUTSTANDING: 'S',
    O: 'O',
    APLUS: 'A+', 'A+': 'A+',
    A: 'A',
    BPLUS: 'B+', 'B+': 'B+',
    B: 'B',
    CPLUS: 'C+', 'C+': 'C+',
    C: 'C',
    U: 'U', F: 'U', FAIL: 'U', RA: 'U'
  };
  return gradeAliases[str] || (['O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'S', 'C+'].includes(str) ? str : null);
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node Scripts/auto_enroll_and_accept_nptel.js <filePath> <semesterId_or_semesterNumber>');
    process.exit(1);
  }

  const [filePath, semArg] = args;
  await sequelize.authenticate();
  console.log('Database connected successfully.');

  let targetSemester = null;
  const numericSem = parseInt(semArg, 10);
  if (!isNaN(numericSem)) {
    targetSemester = await Semester.findByPk(numericSem);
    if (!targetSemester) {
      targetSemester = await Semester.findOne({ where: { semesterNumber: numericSem, isActive: 'YES' } });
    }
  }

  if (!targetSemester) {
    console.error(`Could not resolve semester with ID or number: ${semArg}`);
    process.exit(1);
  }

  const semesterId = targetSemester.semesterId;
  console.log(`Target Semester: ID ${semesterId} (Semester ${targetSemester.semesterNumber})`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });

  if (!matrix || matrix.length < 2) {
    console.error('File has no data.');
    process.exit(1);
  }

  // Find header row containing Roll No and Course code
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const cells = (matrix[i] || []).map(normalizeHeader);
    const hasRoll = cells.some(c => c.includes('roll') || c.includes('reg'));
    const hasCourse = cells.some(c => c.includes('course'));
    if (hasRoll && hasCourse) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) headerRowIdx = 0;

  const headers = matrix[headerRowIdx].map(normalizeHeader);
  const rollIdx = headers.findIndex(h => h.includes('roll') || h.includes('reg'));
  const courseIdx = headers.findIndex(h => h.includes('course'));
  const gradeIdx = headers.findIndex(h => h.includes('grade') || h.includes('result'));
  const typeIdx = headers.findIndex(h => h.includes('pec') || h.includes('oec') || h.includes('type') || h.includes('category'));

  if (rollIdx === -1 || courseIdx === -1 || gradeIdx === -1) {
    console.error('Could not identify required columns (Roll No., Course code, GRADE).');
    process.exit(1);
  }

  const rowsToProcess = [];
  for (let i = headerRowIdx + 1; i < matrix.length; i++) {
    const row = matrix[i] || [];
    const regno = normalizeCode(row[rollIdx]);
    const courseCode = normalizeCode(row[courseIdx]);
    const grade = normalizeGrade(row[gradeIdx]);
    const creditType = typeIdx !== -1 ? normalizeCreditType(row[typeIdx]) : 'OEC';

    // Guard: Skip if regno, courseCode, or grade is missing or blank
    if (!regno || !courseCode || !grade) continue;

    rowsToProcess.push({ regno, courseCode, grade, creditType });
  }

  console.log(`Found ${rowsToProcess.length} valid rows with non-empty grades.`);
  if (rowsToProcess.length === 0) {
    console.log('Nothing to process.');
    process.exit(0);
  }

  const transaction = await sequelize.transaction();
  try {
    const affectedRegnos = new Set();
    let enrolledCount = 0;
    let transferCount = 0;

    for (const item of rowsToProcess) {
      const student = await StudentDetails.findOne({
        where: { registerNumber: item.regno },
        transaction
      });

      if (!student) {
        console.warn(`[SKIP] Student not found with registerNumber: ${item.regno}`);
        continue;
      }

      // 1. Find or create NPTEL course
      let [nptelCourse] = await NptelCourse.findOrCreate({
        where: { courseCode: item.courseCode, isActive: 'YES' },
        defaults: {
          courseCode: item.courseCode,
          courseTitle: item.courseCode,
          credits: 3,
          type: item.creditType,
          isActive: 'YES',
          createdBy: 'admin-script'
        },
        transaction
      });

      // 2. Find or create StudentNptelEnrollment
      let [enrollment, enrCreated] = await StudentNptelEnrollment.findOrCreate({
        where: {
          regno: item.regno,
          nptelCourseId: nptelCourse.nptelCourseId,
          semesterId
        },
        defaults: {
          regno: item.regno,
          nptelCourseId: nptelCourse.nptelCourseId,
          semesterId,
          isActive: 'YES'
        },
        transaction
      });
      if (enrCreated) enrolledCount++;

      // 3. Upsert StudentGrade
      await StudentGrade.upsert({
        regno: item.regno,
        courseCode: item.courseCode,
        semesterId,
        grade: item.grade
      }, { transaction });

      // 4. Upsert NptelCreditTransfer as accepted
      const [transfer, trCreated] = await NptelCreditTransfer.findOrCreate({
        where: { enrollmentId: enrollment.enrollmentId },
        defaults: {
          enrollmentId: enrollment.enrollmentId,
          regno: item.regno,
          nptelCourseId: nptelCourse.nptelCourseId,
          grade: item.grade,
          creditType: item.creditType,
          studentStatus: 'accepted',
          studentRespondedAt: new Date()
        },
        transaction
      });

      if (!trCreated) {
        await transfer.update({
          grade: item.grade,
          creditType: item.creditType,
          studentStatus: 'accepted',
          studentRespondedAt: new Date()
        }, { transaction });
      }
      transferCount++;
      affectedRegnos.add(item.regno);
    }

    console.log(`Recalculating GPA/CGPA for ${affectedRegnos.size} students...`);
    for (const regno of affectedRegnos) {
      await recalculateStudentAcademicRows(regno, transaction);
    }

    await transaction.commit();
    console.log(`Success! Processed ${rowsToProcess.length} records (${enrolledCount} enrolled, ${transferCount} transfers accepted) across ${affectedRegnos.size} student(s).`);
  } catch (err) {
    await transaction.rollback();
    console.error('Transaction failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

main().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});

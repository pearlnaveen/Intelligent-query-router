import express from 'express';
import { requireAuth } from '../../../middlewares/requireauth.js';
import {
  getStaffCourseDetails,
  createExamType,
  deleteExamType,
  getStudentsForExamType,
  saveBulkMarks
} from '../../../controllers/acadamic/resultController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/courses/:courseId', getStaffCourseDetails);
router.post('/courses/:courseId/exam-types', createExamType);
router.delete('/exam-types/:examTypeId', deleteExamType);
router.get('/exam-types/:examTypeId/students', getStudentsForExamType);
router.post('/exam-types/:examTypeId/marks/bulk', saveBulkMarks);

export default router;

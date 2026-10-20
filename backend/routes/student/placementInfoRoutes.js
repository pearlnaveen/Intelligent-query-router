import express from 'express';
import {
  getPlacementInfo,
  updatePlacementInfo,
  addAttendedCompany,
  updateAttendedCompany,
  deleteAttendedCompany
} from '../../controllers/student/placementInfoController.js';
import { authenticate } from '../../middlewares/requireauth.js';

const router = express.Router();

router.get('/placement-info', authenticate, getPlacementInfo);
router.put('/placement-info', authenticate, updatePlacementInfo);
router.post('/placement-info/attended-company', authenticate, addAttendedCompany);
router.put('/placement-info/attended-company/:id', authenticate, updateAttendedCompany);
router.delete('/placement-info/attended-company/:id', authenticate, deleteAttendedCompany);

export default router;

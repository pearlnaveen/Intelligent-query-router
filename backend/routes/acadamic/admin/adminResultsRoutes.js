import express from 'express';
import { requireAuth } from '../../../middlewares/requireauth.js';
import {
  getAdminFilters,
  getAdminResultAnalysis,
  exportAdminResultExcel
} from '../../../controllers/acadamic/resultController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/filters', getAdminFilters);
router.get('/analysis', getAdminResultAnalysis);
router.get('/export', exportAdminResultExcel);

export default router;

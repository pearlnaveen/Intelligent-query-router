import express from 'express';
import { authenticate as authenticateToken } from '../../middlewares/requireauth.js';
import {
  getMemberships,
  getMembershipById,
  getMembershipProof,
  createMembership,
  updateMembership,
  deleteMembership,
  bulkCreateMemberships,
} from '../../controllers/staff/membershipController.js';
import multer from 'multer';

const router = express.Router();
const bulkUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/', authenticateToken, getMemberships);
router.get('/proof/:id', authenticateToken, getMembershipProof);
router.get('/:id', authenticateToken, getMembershipById);
router.post('/bulk', authenticateToken, bulkUpload.any(), bulkCreateMemberships);
router.post('/', authenticateToken, createMembership);
router.put('/:id', authenticateToken, updateMembership);
router.delete('/:id', authenticateToken, deleteMembership);

export default router;

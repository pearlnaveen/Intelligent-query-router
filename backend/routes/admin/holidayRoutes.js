import express from 'express';
import { authenticate } from '../../middlewares/requireauth.js';
import { addHoliday, addSundays, addThirdSaturdays, deleteHoliday, listHolidays } from '../../controllers/admin/holidayController.js';

const router = express.Router();
router.get('/holidays', authenticate, listHolidays);
router.post('/holidays', authenticate, addHoliday);
router.post('/holidays/add-sundays', authenticate, addSundays);
router.post('/holidays/add-third-saturdays', authenticate, addThirdSaturdays);
router.delete('/holidays/:id', authenticate, deleteHoliday);
export default router;

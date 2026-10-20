import { Op } from 'sequelize';
import Holiday from '../../models/admin/Holiday.js';

const isSuperAdmin = (user) => String(user?.roleName || user?.role || '').toLowerCase() === 'superadmin';

const academicYearRange = (academicYear) => {
  if (!/^\d{4}-\d{4}$/.test(academicYear || '')) return null;
  const [startYear, endYear] = academicYear.split('-').map(Number);
  if (endYear !== startYear + 1) return null;
  // The Holidays module rolls over on 1 January: 2027-2028 is the 2027 calendar year.
  return { start: `${startYear}-01-01`, end: `${startYear}-12-31` };
};

const normalizedDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : null;

export const listHolidays = async (req, res) => {
  try {
    const { academicYear, from, to } = req.query;
    const where = {};
    if (academicYear) where.academic_year = academicYear;
    if (req.query.holidayType) where.holiday_type = req.query.holidayType;
    if (normalizedDate(from) && normalizedDate(to)) where.holiday_date = { [Op.between]: [from, to] };
    const holidays = await Holiday.findAll({ where, order: [['holiday_date', 'ASC']] });
    res.json({ success: true, holidays });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load holidays', error: error.message });
  }
};

export const addHoliday = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ message: 'Only Super Admin can manage holidays' });
    const { name, holiday_date, academic_year } = req.body;
    const range = academicYearRange(academic_year);
    if (!name?.trim() || !normalizedDate(holiday_date) || !range || holiday_date < range.start || holiday_date > range.end) {
      return res.status(400).json({ message: 'Enter a holiday name and a date within the selected academic year' });
    }
    const [holiday, created] = await Holiday.findOrCreate({
      where: { holiday_date },
      defaults: { name: name.trim(), holiday_date, academic_year, holiday_type: 'government', created_by: req.user.userId },
    });
    if (!created) return res.status(409).json({ message: `${holiday.holiday_date} is already marked as ${holiday.name}` });
    res.status(201).json({ success: true, holiday });
  } catch (error) {
    res.status(500).json({ message: 'Unable to add holiday', error: error.message });
  }
};

const addRecurringHolidays = async (req, res, type) => {
  if (!isSuperAdmin(req.user)) return res.status(403).json({ message: 'Only Super Admin can manage holidays' });
  const range = academicYearRange(req.body.academic_year);
  if (!range) return res.status(400).json({ message: 'Select a valid academic year' });
  const dates = [];
  const cursor = new Date(`${range.start}T00:00:00Z`);
  const end = new Date(`${range.end}T00:00:00Z`);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    const date = cursor.getUTCDate();
    if ((type === 'sunday' && day === 0) || (type === 'third_saturday' && day === 6 && date >= 15 && date <= 21)) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const rows = dates.map(holiday_date => ({
    name: type === 'sunday' ? 'Sunday Holiday' : 'Third Saturday Holiday',
    holiday_date,
    academic_year: req.body.academic_year,
    holiday_type: type,
    created_by: req.user.userId,
  }));
  const created = await Holiday.bulkCreate(rows, { ignoreDuplicates: true });
  res.json({ success: true, added: created.length, message: `${type === 'sunday' ? 'Sundays' : 'Third Saturdays'} added for ${req.body.academic_year}` });
};

export const addSundays = (req, res) => addRecurringHolidays(req, res, 'sunday');
export const addThirdSaturdays = (req, res) => addRecurringHolidays(req, res, 'third_saturday');

export const deleteHoliday = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ message: 'Only Super Admin can manage holidays' });
    const deleted = await Holiday.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Holiday not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete holiday', error: error.message });
  }
};

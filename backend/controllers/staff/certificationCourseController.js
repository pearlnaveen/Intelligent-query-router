import fs from 'fs';
import path from 'path';
import { sequelize } from '../../config/mysql.js';
import { StaffCertificationCourse as CertificationCourse, CertificationCourseMaster } from '../../models/index.js';
import { deleteFile, getFullPath } from '../../middlewares/uploadCertConfig.js';
import { normalizeToDbDate } from '../../utils/dateHelper.js';

// helper functions carried over from old route
function calculateWeeks(hours) {
  if (!hours || hours <= 0) return 0;
  return Math.round((hours / 40) * 10) / 10;
}

function calculateHours(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const differenceInTime = to - from;
  return Math.ceil(differenceInTime / (1000 * 3600 * 24)) + 1;
}

function validateDates(fromDate, toDate, certificationDate) {
  const normFrom = normalizeToDbDate(fromDate);
  const normTo = normalizeToDbDate(toDate);
  const normCert = normalizeToDbDate(certificationDate);

  if (!normFrom || !normTo || !normCert) {
    return { isValid: false, message: 'Invalid date format. Expected format: DD-MM-YYYY' };
  }

  const from = new Date(normFrom);
  const to = new Date(normTo);
  const cert = new Date(normCert);

  if (from > to) {
    return { isValid: false, message: 'From date must be before or equal to to date' };
  }

  if (cert < from) {
    return { isValid: false, message: 'Certification date cannot be before course start date' };
  }

  return { isValid: true, normFrom, normTo, normCert };
}

// GET /certifications
export const getAllCertifications = async (req, res) => {
  try {
    const userId = req.user?.Userid || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'User ID not found' });

    const rows = await CertificationCourse.findAll({
      where: { Userid: userId },
      order: [['certification_date', 'DESC'], ['id', 'DESC']],
    });

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /certifications/my-certificates (optional query for other user)
export const getMyCertificates = async (req, res) => {
  try {
    const userId = req.query.UserId || req.query.userId || req.user?.Userid || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ message: 'UserId is required' });
    }

    const rows = await CertificationCourse.findAll({
      where: { Userid: userId },
      order: [['certification_date', 'DESC'], ['id', 'DESC']],
    });

    // wrap in object for frontend compatibility
    res.status(200).json({ certificates: rows });
  } catch (error) {
    console.error('Error fetching my certificates:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /certifications/:id
export const getCertificationById = async (req, res) => {
  try {
    const userId = req.user?.Userid || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'User ID not found' });

    const record = await CertificationCourse.findOne({
      where: { id: req.params.id, Userid: userId },
    });

    if (!record) {
      return res.status(404).json({ message: 'Certification not found' });
    }

    res.status(200).json(record);
  } catch (error) {
    console.error('Error fetching certification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to check if provider is NPTEL
function isNptelProvider(offeredBy) {
  if (!offeredBy || typeof offeredBy !== 'string') return false;
  return offeredBy.trim().toUpperCase().includes('NPTEL');
}

// Helper function to process and validate duration (Hours OR Weeks)
function processDuration(duration_type, hours, weeks) {
  const hasHours = hours !== undefined && hours !== null && String(hours).trim() !== '' && !isNaN(parseFloat(hours));
  const hasWeeks = weeks !== undefined && weeks !== null && String(weeks).trim() !== '' && !isNaN(parseFloat(weeks));

  const parsedHours = hasHours ? parseFloat(hours) : null;
  const parsedWeeks = hasWeeks ? parseFloat(weeks) : null;

  let selectedType = duration_type ? String(duration_type).trim() : '';
  if (!selectedType) {
    if (hasHours && !hasWeeks) selectedType = 'Hours';
    else if (hasWeeks && !hasHours) selectedType = 'Weeks';
  }

  const normType = selectedType.toLowerCase();

  if (normType === 'hours' || normType === 'hour') {
    if (!hasHours || parsedHours <= 0) {
      return { isValid: false, message: 'Please enter a valid positive number for Number of Hours.' };
    }
    return { isValid: true, hours: Math.round(parsedHours), weeks: null };
  }

  if (normType === 'weeks' || normType === 'week') {
    if (!hasWeeks || parsedWeeks <= 0) {
      return { isValid: false, message: 'Please enter a valid positive number for Number of Weeks.' };
    }
    return { isValid: true, hours: null, weeks: parseFloat(parsedWeeks.toFixed(1)) };
  }

  if (hasHours && hasWeeks && parsedHours > 0 && parsedWeeks > 0) {
    return { isValid: false, message: 'Please specify Duration Type (Hours or Weeks).' };
  }

  return { isValid: false, message: 'Course duration is required. Please select Course Duration Type (Hours or Weeks) and enter a valid value.' };
}

// POST /certifications
export const createCertification = async (req, res) => {
  let { course_name, offered_by, from_date, to_date, certification_date, duration_type, hours, weeks, nptel_category, status } = req.body;
  certification_date = certification_date || to_date;

  try {
    // basic validation
    if (!course_name?.trim() || !offered_by?.trim() || !from_date || !to_date) {
      if (req.file) deleteFile(req.file.path);
      return res.status(400).json({ message: 'Course name, offered by, from date, and to date are required' });
    }

    if (course_name.trim().length < 2) {
      if (req.file) deleteFile(req.file.path);
      return res.status(400).json({ message: 'Course name must be at least 2 characters long' });
    }

    if (offered_by.trim().length < 2) {
      if (req.file) deleteFile(req.file.path);
      return res.status(400).json({ message: 'Offered by must be at least 2 characters long' });
    }

    const dateValidation = validateDates(from_date, to_date, certification_date);
    if (!dateValidation.isValid) {
      if (req.file) deleteFile(req.file.path);
      return res.status(400).json({ message: dateValidation.message });
    }

    // Duration validation (Hours OR Weeks)
    const durationRes = processDuration(duration_type, hours, weeks);
    if (!durationRes.isValid) {
      if (req.file) deleteFile(req.file.path);
      return res.status(400).json({ message: durationRes.message });
    }

    // NPTEL Certification Category validation
    const isNptel = isNptelProvider(offered_by);
    let finalNptelCategory = null;
    if (isNptel) {
      if (!nptel_category?.trim()) {
        if (req.file) deleteFile(req.file.path);
        return res.status(400).json({ message: 'NPTEL Certification Category is required when Offered By is NPTEL.' });
      }
      finalNptelCategory = nptel_category.trim();
    }

    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) {
      if (req.file) deleteFile(req.file.path);
      return res.status(401).json({ message: 'User ID not found' });
    }

    const certificatePath = req.file ? `uploads/certificates/${req.file.filename}` : null;

    const record = await CertificationCourse.create({
      Userid: userId,
      course_name: course_name.trim(),
      offered_by: offered_by.trim(),
      from_date: dateValidation.normFrom,
      to_date: dateValidation.normTo,
      hours: durationRes.hours,
      weeks: durationRes.weeks,
      nptel_category: finalNptelCategory,
      certification_date: dateValidation.normCert,
      certificate_pdf: certificatePath,
      status: status?.trim() || 'Completed',
    });

    // Sync newly provided offering to Master Table if not present
    if (CertificationCourseMaster && offered_by.trim()) {
      try {
        await CertificationCourseMaster.findOrCreate({
          where: { course_name: offered_by.trim() },
          defaults: {
            course_name: offered_by.trim(),
            provider: offered_by.trim(),
            status: 'Active',
            description: 'User added provider'
          }
        });
      } catch (masterErr) {
        console.error('Note auto-syncing certification master table:', masterErr.message);
      }
    }

    res.status(201).json({
      message: 'Certification created successfully',
      id: record.id,
      file: req.file ? req.file.filename : null,
    });
  } catch (error) {
    if (req.file) deleteFile(req.file.path);
    console.error('Error creating certification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /certifications/:id
export const updateCertification = async (req, res) => {
  const { course_name, offered_by, from_date, to_date, certification_date, duration_type, hours, weeks, nptel_category, status } = req.body;

  try {
    if (!course_name?.trim() || !offered_by?.trim() || !from_date || !to_date || !certification_date) {
      if (req.file) deleteFile(req.file.path);
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (course_name.trim().length < 2) {
      if (req.file) deleteFile(req.file.path);
      return res.status(400).json({ message: 'Course name must be at least 2 characters long' });
    }

    if (offered_by.trim().length < 2) {
      if (req.file) deleteFile(req.file.path);
      return res.status(400).json({ message: 'Offered by must be at least 2 characters long' });
    }

    const dateValidation = validateDates(from_date, to_date, certification_date);
    if (!dateValidation.isValid) {
      if (req.file) deleteFile(req.file.path);
      return res.status(400).json({ message: dateValidation.message });
    }

    // Duration validation (Hours OR Weeks)
    const durationRes = processDuration(duration_type, hours, weeks);
    if (!durationRes.isValid) {
      if (req.file) deleteFile(req.file.path);
      return res.status(400).json({ message: durationRes.message });
    }

    // NPTEL Certification Category validation
    const isNptel = isNptelProvider(offered_by);
    let finalNptelCategory = null;
    if (isNptel) {
      if (!nptel_category?.trim()) {
        if (req.file) deleteFile(req.file.path);
        return res.status(400).json({ message: 'NPTEL Certification Category is required when Offered By is NPTEL.' });
      }
      finalNptelCategory = nptel_category.trim();
    }

    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) {
      if (req.file) deleteFile(req.file.path);
      return res.status(401).json({ message: 'User ID not found' });
    }

    const record = await CertificationCourse.findOne({
      where: { id: req.params.id, Userid: userId },
    });

    if (!record) {
      if (req.file) deleteFile(req.file.path);
      return res.status(404).json({ message: 'Certification not found or access denied' });
    }

    let certificatePath = record.certificate_pdf;
    if (req.file) {
      if (record.certificate_pdf) {
        const oldFile = getFullPath(record.certificate_pdf);
        deleteFile(oldFile);
      }
      certificatePath = `uploads/certificates/${req.file.filename}`;
    }

    record.course_name = course_name.trim();
    record.offered_by = offered_by.trim();
    record.from_date = dateValidation.normFrom;
    record.to_date = dateValidation.normTo;
    record.hours = durationRes.hours;
    record.weeks = durationRes.weeks;
    record.nptel_category = finalNptelCategory;
    record.certification_date = dateValidation.normCert;
    record.certificate_pdf = certificatePath;
    if (status !== undefined) record.status = status;

    await record.save();

    res.status(200).json({
      message: 'Certification updated successfully',
      file: req.file ? req.file.filename : null,
    });
  } catch (error) {
    if (req.file) deleteFile(req.file.path);
    console.error('Error updating certification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /certifications/:id
export const deleteCertification = async (req, res) => {
  try {
    const userId = req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'User ID not found' });

    const record = await CertificationCourse.findOne({
      where: { id: req.params.id, Userid: userId },
    });

    if (!record) {
      return res.status(404).json({ message: 'Certification not found or access denied' });
    }

    if (record.certificate_pdf) {
      const filePath = getFullPath(record.certificate_pdf);
      deleteFile(filePath);
    }

    await record.destroy();

    res.status(200).json({ message: 'Certification deleted successfully' });
  } catch (error) {
    console.error('Error deleting certification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

import { syncCertificationCourseMaster } from '../../services/masterSyncService.js';
import { parseBulkRecords } from '../../utils/bulkUploadHelper.js';

// POST /certifications/bulk
export const bulkCreateCertifications = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user?.Userid || req.user?.userId;
    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({ message: 'User ID not found' });
    }

    const rows = parseBulkRecords(req);
    if (!Array.isArray(rows) || rows.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'No records provided for bulk insert' });
    }

    const created = [];
    let rowIdx = 0;
    for (const r of rows) {
      rowIdx++;
      const courseName = (r.course_name || 'Certification Course').trim();
      const offeredBy = (r.offered_by || 'Online Platform').trim();

      if (courseName) {
        await syncCertificationCourseMaster(courseName, offeredBy, transaction);
      }

      // Bulk record duration validation
      const durationRes = processDuration(r.duration_type, r.hours, r.weeks);
      if (!durationRes.isValid) {
        throw new Error(`Row ${rowIdx}: ${durationRes.message}`);
      }

      // Bulk record NPTEL category validation
      const isNptel = isNptelProvider(offeredBy);
      let finalNptelCategory = null;
      if (isNptel) {
        if (!r.nptel_category?.trim()) {
          throw new Error(`Row ${rowIdx}: NPTEL Certification Category is required when Offered By is NPTEL.`);
        }
        finalNptelCategory = r.nptel_category.trim();
      }

      const certPath = typeof r.certificate_pdf === 'string' ? r.certificate_pdf : null;

      const record = await CertificationCourse.create({
        Userid: userId,
        course_name: courseName,
        offered_by: offeredBy,
        from_date: normalizeToDbDate(r.from_date) || new Date().toISOString().split('T')[0],
        to_date: normalizeToDbDate(r.to_date) || new Date().toISOString().split('T')[0],
        hours: durationRes.hours,
        weeks: durationRes.weeks,
        nptel_category: finalNptelCategory,
        certification_date: normalizeToDbDate(r.certification_date || r.to_date) || new Date().toISOString().split('T')[0],
        certificate_pdf: certPath,
      }, { transaction });
      created.push(record);
    }

    await transaction.commit();
    res.status(201).json({
      message: `Successfully imported ${created.length} certification courses`,
      count: created.length,
      data: created,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error bulk creating certifications:', error);
    res.status(400).json({
      message: `Failed to save bulk records: ${error.message}`,
      error: error.message,
      details: error.errors ? error.errors.map(e => e.message) : [error.message]
    });
  }
};

export const getCertificationPdf = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    const { id } = req.params;

    const record = await CertificationCourse.findByPk(id);
    if (!record || !record.certificate_pdf) {
      return res.status(404).json({ message: 'Certificate PDF not found' });
    }

    if (String(record.Userid) !== String(userId) && req.user?.roleName !== 'Admin' && req.user?.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized access to document' });
    }

    const relativePath = String(record.certificate_pdf).trim().replace(/\\/g, '/').replace(/^\/+/, '');
    const fullPath = path.isAbsolute(relativePath) ? relativePath : path.join(process.cwd(), relativePath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="certificate_${id}.pdf"`);
      return res.sendFile(fullPath);
    }

    return res.status(404).json({ message: 'Certificate PDF file not found on server' });
  } catch (error) {
    console.error('Error fetching certification PDF:', error);
    res.status(500).json({ message: 'Server error while retrieving PDF', error: error.message });
  }
};

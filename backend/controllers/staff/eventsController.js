import EventsAttended from '../../models/staff/EventsAttended.js';
import EventTypeMaster from '../../models/staff/EventTypeMaster.js';
import { parseBulkRecords } from '../../utils/bulkUploadHelper.js';
import { normalizeToDbDate } from '../../utils/dateHelper.js';

// validation middlewares used also in tests/other modules
export const validateEventInfo = (req, res, next) => {
  const data = req.body;
  const requiredFields = [
    'programme_name',
    'title',
    'from_date',
    'to_date',
    'mode',
    'organized_by',
    'participants',
  ];
  for (const field of requiredFields) {
    if (!data[field] || data[field].toString().trim() === '') {
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  const validModes = ['Online', 'Offline', 'Hybrid'];
  if (!validModes.includes(data.mode)) {
    return res.status(400).json({ message: 'Mode must be Online, Offline, or Hybrid' });
  }

  const normFrom = normalizeToDbDate(data.from_date);
  const normTo = normalizeToDbDate(data.to_date);
  if (!normFrom || !normTo) {
    return res.status(400).json({ message: 'Invalid date format. Expected format: DD-MM-YYYY' });
  }
  if (new Date(normFrom) > new Date(normTo)) {
    return res.status(400).json({ message: 'From date must be before to date' });
  }

  const participantsCount = parseInt(data.participants, 10);
  if (isNaN(participantsCount) || participantsCount <= 0) {
    return res.status(400).json({ message: 'Participants must be a positive number' });
  }

  const financialSupportBool = data.financial_support === true || data.financial_support === 'true';
  if (financialSupportBool) {
    if (data.support_amount === undefined || data.support_amount === null || data.support_amount === '') {
      return res.status(400).json({ message: 'Support amount is required when financial support is selected' });
    }
    const supportAmount = parseFloat(data.support_amount);
    if (isNaN(supportAmount) || supportAmount < 0) {
      return res.status(400).json({ message: 'Support amount must be a valid positive number' });
    }
  }



  if (data.organized_by && data.organized_by.trim().length > 100) {
    return res.status(400).json({ message: 'Organized by field cannot exceed 100 characters' });
  }

  next();
};

// helper to clean incoming body data
const cleanEventData = (data) => {
  const cleaned = {};
  const textFields = ['programme_name', 'title', 'mode', 'organized_by', 'venue'];
  textFields.forEach((field) => {
    if (data[field] && data[field].toString().trim() !== '') {
      cleaned[field] = data[field].toString().trim();
    }
  });



  const intFields = ['participants'];
  intFields.forEach((field) => {
    if (data[field] && data[field].toString().trim() !== '') {
      const val = parseInt(data[field], 10);
      if (!Number.isNaN(val)) cleaned[field] = val;
    }
  });

  const boolFields = ['financial_support'];
  boolFields.forEach((field) => {
    if (typeof data[field] !== 'undefined') {
      cleaned[field] = data[field] === true || data[field] === 'true';
    }
  });

  const dateFields = ['from_date', 'to_date'];
  dateFields.forEach((field) => {
    if (data[field] && data[field].toString().trim() !== '') {
      cleaned[field] = normalizeToDbDate(data[field]);
    }
  });

  if (data.support_amount !== undefined && data.support_amount !== null && data.support_amount !== '') {
    const amt = parseFloat(data.support_amount);
    if (!Number.isNaN(amt)) cleaned.support_amount = amt;
  }

  return cleaned;
};

// helper to format output record with document flags
const formatRecord = (row) => {
  if (!row) return null;
  const r = row.toJSON ? row.toJSON() : { ...row };

  const hasPermission = !!(r.permission_letter_link && (Buffer.isBuffer(r.permission_letter_link) ? r.permission_letter_link.length > 0 : String(r.permission_letter_link).trim().length > 0));
  const hasCert = !!(r.certificate_link && (Buffer.isBuffer(r.certificate_link) ? r.certificate_link.length > 0 : String(r.certificate_link).trim().length > 0));
  const hasFinProof = !!(r.financial_proof_link && (Buffer.isBuffer(r.financial_proof_link) ? r.financial_proof_link.length > 0 : String(r.financial_proof_link).trim().length > 0));
  const hasReport = !!(r.programme_report_link && (Buffer.isBuffer(r.programme_report_link) ? r.programme_report_link.length > 0 : String(r.programme_report_link).trim().length > 0));

  return {
    ...r,
    has_permission_letter: hasPermission,
    has_certificate: hasCert,
    has_financial_proof: hasFinProof,
    has_programme_report: hasReport,
    permission_letter_link: hasPermission ? 'available' : null,
    certificate_link: hasCert ? 'available' : null,
    financial_proof_link: hasFinProof ? 'available' : null,
    programme_report_link: hasReport ? 'available' : null,
  };
};

export const getAllEvents = async (req, res) => {
  try {
    const Userid = req.user?.userId || req.user?.Userid;
    if (!Userid) return res.status(401).json({ message: 'User not authenticated properly' });

    const records = await EventsAttended.findAll({
      where: { Userid },
      order: [['from_date', 'DESC'], ['id', 'DESC']],
    });

    const formattedRecords = records.map(formatRecord);

    res.status(200).json({ success: true, data: formattedRecords, count: formattedRecords.length });
  } catch (error) {
    console.error('Error fetching staff events attended:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching data', error: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const Userid = req.user?.userId || req.user?.Userid;
    if (!Userid) return res.status(401).json({ message: 'User not authenticated properly' });

    const record = await EventsAttended.findOne({ where: { id: req.params.id, Userid } });
    if (!record) return res.status(404).json({ success: false, message: 'Event not found' });
    res.status(200).json({ success: true, data: formatRecord(record) });
  } catch (error) {
    console.error('Error fetching staff event record:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching record', error: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const Userid = req.user?.userId || req.user?.Userid;
    if (!Userid) return res.status(401).json({ message: 'User not authenticated properly' });

    const cleanData = cleanEventData(req.body);

    // handle files
    if (req.files) {
      if (req.files.permission_letter_link) {
        cleanData.permission_letter_link = req.files.permission_letter_link[0].buffer;
      }
      if (req.files.certificate_link) {
        cleanData.certificate_link = req.files.certificate_link[0].buffer;
      }
      if (req.files.financial_proof_link) {
        cleanData.financial_proof_link = req.files.financial_proof_link[0].buffer;
      }
      if (req.files.programme_report_link) {
        cleanData.programme_report_link = req.files.programme_report_link[0].buffer;
      }
    }

    const newRecord = await EventsAttended.create({ Userid, ...cleanData });
    res.status(201).json({ success: true, message: 'Event created successfully', data: formatRecord(newRecord), id: newRecord.id });
  } catch (error) {
    console.error('Error creating staff event record:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Duplicate entry error' });
    }
    res.status(500).json({ success: false, message: 'Server error while creating record', error: error.message });
  }
};

export const bulkCreateEvents = async (req, res) => {
  try {
    const Userid = req.user?.userId || req.user?.Userid;
    if (!Userid) return res.status(401).json({ message: 'User not authenticated' });

    const records = parseBulkRecords(req);
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'No valid records provided for bulk upload' });
    }

    // Auto-create missing Event Types in EventTypeMaster
    const uniqueTypes = [...new Set(records.map(r => String(r.programme_name || '').trim()).filter(Boolean))];
    for (const typeName of uniqueTypes) {
      try {
        await EventTypeMaster.findOrCreate({
          where: { type_name: typeName },
          defaults: { status: 'Active', description: 'Added via Bulk Upload' }
        });
      } catch (err) {
        console.warn(`Note auto-creating EventTypeMaster '${typeName}':`, err.message);
      }
    }

    const preparedRecords = records.map((rec) => ({
      Userid,
      programme_name: String(rec.programme_name || 'Workshop').trim(),
      title: String(rec.title || 'Attended Event').trim(),
      from_date: normalizeToDbDate(rec.from_date) || new Date().toISOString().split('T')[0],
      to_date: normalizeToDbDate(rec.to_date) || new Date().toISOString().split('T')[0],
      mode: ['Online', 'Offline', 'Hybrid'].includes(rec.mode) ? rec.mode : 'Offline',
      organized_by: String(rec.organized_by || 'Organizing Body').trim(),
      venue: rec.venue ? String(rec.venue).trim() : null,
      participants: parseInt(rec.participants, 10) || 1,
      financial_support: rec.financial_support === true || rec.financial_support === 'true' || rec.financial_support === 'Yes',
      support_amount: rec.support_amount ? parseFloat(rec.support_amount) || 0 : 0,
      status: 'Pending',
      Created_by: Userid,
      permission_letter_link: typeof rec.permission_letter_link === 'string' ? rec.permission_letter_link : null,
      certificate_link: typeof rec.certificate_link === 'string' ? rec.certificate_link : null,
      financial_proof_link: typeof rec.financial_proof_link === 'string' ? rec.financial_proof_link : null,
      programme_report_link: typeof rec.programme_report_link === 'string' ? rec.programme_report_link : null,
    }));

    const created = await EventsAttended.bulkCreate(preparedRecords);
    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${created.length} event records`,
      count: created.length,
      data: created,
    });
  } catch (error) {
    console.error('Error bulk creating staff event records:', error);
    res.status(400).json({
      message: `Failed to save bulk records: ${error.message}`,
      error: error.message,
      details: error.errors ? error.errors.map(e => e.message) : [error.message]
    });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const Userid = req.user?.userId || req.user?.Userid;
    if (!Userid) return res.status(401).json({ message: 'User not authenticated properly' });

    const record = await EventsAttended.findOne({ where: { id: req.params.id, Userid } });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const cleanData = cleanEventData(req.body);
    if (req.files) {
      if (req.files.permission_letter_link) {
        cleanData.permission_letter_link = req.files.permission_letter_link[0].buffer;
      }
      if (req.files.certificate_link) {
        cleanData.certificate_link = req.files.certificate_link[0].buffer;
      }
      if (req.files.financial_proof_link) {
        cleanData.financial_proof_link = req.files.financial_proof_link[0].buffer;
      }
      if (req.files.programme_report_link) {
        cleanData.programme_report_link = req.files.programme_report_link[0].buffer;
      }
    }

    if (Object.keys(cleanData).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    await record.update(cleanData);
    res.status(200).json({ success: true, message: 'Event updated successfully', data: formatRecord(record) });
  } catch (error) {
    console.error('Error updating staff event record:', error);
    res.status(500).json({ success: false, message: 'Server error while updating record', error: error.message });
  }
};

export const patchEvent = async (req, res) => {
  // delegate to updateEvent since cleaning handles partial 
  return updateEvent(req, res);
};

export const getDocument = async (req, res) => {
  try {
    const Userid = req.user?.userId || req.user?.Userid;
    if (!Userid) return res.status(401).json({ message: 'User not authenticated properly' });

    const { id, type } = req.params;
    const validTypes = ['permission_letter_link', 'certificate_link', 'financial_proof_link', 'programme_report_link'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const record = await EventsAttended.findOne({ where: { id, Userid } });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const documentBuffer = record[type];
    if (!documentBuffer) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    let buffer;
    if (Buffer.isBuffer(documentBuffer)) {
      buffer = documentBuffer;
    } else if (typeof documentBuffer === 'string') {
      buffer = Buffer.from(documentBuffer, 'binary');
    } else {
      return res.status(500).json({ message: 'Invalid document data format' });
    }

    if (buffer.length === 0) {
      return res.status(404).json({ message: 'Document is empty' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${type}_${id}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error fetching document for staff event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const Userid = req.user?.userId || req.user?.Userid;
    if (!Userid) return res.status(401).json({ message: 'User not authenticated properly' });

    const record = await EventsAttended.findOne({ where: { id: req.params.id, Userid } });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    await record.destroy();
    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff event record:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting record', error: error.message });
  }
};

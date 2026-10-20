import EventsOrganized from '../../models/staff/EventsOrganized.js';
import EventCoordinator from '../../models/staff/EventCoordinator.js';
import EventResourcePerson from '../../models/staff/EventResourcePerson.js';
import { sequelize } from '../../config/mysql.js';
import { normalizeToDbDate } from '../../utils/dateHelper.js';

// helper to parse CSV/string/array into clean string array
const parseList = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(n => String(n).trim()).filter(Boolean);
  return String(input).split(',').map(n => n.trim()).filter(Boolean);
};

// validation middlewares reused in tests if necessary
export const validateOrganizedInfo = (req, res, next) => {
  const data = req.body;
  const requiredFields = [
    'program_name',
    'program_title',
    'from_date',
    'to_date',
  ];
  for (const field of requiredFields) {
    if (!data[field] || data[field].toString().trim() === '') {
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  // validate dates
  const normFrom = normalizeToDbDate(data.from_date);
  const normTo = normalizeToDbDate(data.to_date);
  if (!normFrom || !normTo) {
    return res.status(400).json({ message: 'Invalid date format. Expected format: DD-MM-YYYY' });
  }
  const from = new Date(normFrom);
  const to = new Date(normTo);
  if (from > to) {
    return res.status(400).json({ message: 'From date cannot be after to date' });
  }

  // Validate or default days if missing or <= 0
  if (data.days !== undefined && data.days !== null && data.days !== '') {
    const daysVal = parseInt(data.days, 10);
    if (isNaN(daysVal) || daysVal <= 0) {
      return res.status(400).json({ message: 'Number of days must be a positive integer' });
    }
    req.body.days = daysVal;
  } else {
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    req.body.days = diffDays || 1;
  }

  // Default coordinator_name, speaker_details, participants if missing
  if (!data.coordinator_name || data.coordinator_name.toString().trim() === '') {
    req.body.coordinator_name = 'Faculty Coordinator';
  }
  if (!data.speaker_details || data.speaker_details.toString().trim() === '') {
    req.body.speaker_details = 'Guest Speaker';
  }
  if (!data.participants || isNaN(parseInt(data.participants, 10)) || parseInt(data.participants, 10) <= 0) {
    req.body.participants = 1;
  }

  if (data.amount_sanctioned !== undefined && data.amount_sanctioned !== null && data.amount_sanctioned !== '') {
    const amt = parseFloat(data.amount_sanctioned);
    if (isNaN(amt) || amt < 0) {
      return res.status(400).json({ message: 'Amount sanctioned must be a non-negative number' });
    }
  }

  if (data.program_name && data.program_name.trim().length > 255) {
    return res.status(400).json({ message: 'Program name cannot exceed 255 characters' });
  }
  if (data.program_title && data.program_title.trim().length > 255) {
    return res.status(400).json({ message: 'Program title cannot exceed 255 characters' });
  }

  next();
};

// helper to trim/parse data
const cleanOrganizedData = (data) => {
  const cleaned = {};
  const textFields = [
    'program_name',
    'program_title',
    'coordinator_name',
    'co_coordinator_names',
    'with_funding',
    'with_self_supporting',
    'speaker_details',
    'funding_type',
    'funding_agency',
    'sponsored_by',
    'document_link',
  ];
  textFields.forEach((field) => {
    if (data[field] && data[field].toString().trim() !== '') {
      cleaned[field] = data[field].toString().trim();
    }
  });

  const intFields = ['days', 'participants'];
  intFields.forEach((field) => {
    if (data[field] && data[field].toString().trim() !== '') {
      const val = parseInt(data[field], 10);
      if (!Number.isNaN(val)) cleaned[field] = val;
    }
  });

  if (data.amount_sanctioned !== undefined && data.amount_sanctioned !== null && data.amount_sanctioned !== '') {
    const amt = parseFloat(data.amount_sanctioned);
    if (!Number.isNaN(amt)) cleaned.amount_sanctioned = amt;
  }

  if (data.amount_received !== undefined && data.amount_received !== null && data.amount_received !== '') {
    const amt = parseFloat(data.amount_received);
    if (!Number.isNaN(amt)) cleaned.amount_received = amt;
  }

  const dateFields = ['from_date', 'to_date'];
  dateFields.forEach((field) => {
    if (data[field] && data[field].toString().trim() !== '') {
      cleaned[field] = normalizeToDbDate(data[field]);
    }
  });

  if (cleaned.funding_type === 'Without Fund') {
    cleaned.funding_agency = null;
    cleaned.sponsored_by = null;
    cleaned.amount_sanctioned = null;
    cleaned.amount_received = null;
  }

  return cleaned;
};

export const getAllOrganized = async (req, res) => {
  try {
    const Userid = req.user?.Userid || req.user?.userId;
    if (!Userid) return res.status(401).json({ message: 'User not authenticated properly' });

    const records = await EventsOrganized.findAll({
      where: { Userid },
      attributes: {
        exclude: ['proof', 'documentation'],
        include: [
          [sequelize.literal('CASE WHEN proof IS NOT NULL AND LENGTH(proof) > 0 THEN 1 ELSE 0 END'), 'has_proof'],
          [sequelize.literal('CASE WHEN documentation IS NOT NULL AND LENGTH(documentation) > 0 THEN 1 ELSE 0 END'), 'has_documentation']
        ]
      },
      include: [
        { model: EventCoordinator, as: 'coordinators', attributes: ['id', 'coordinator_name'] },
        { model: EventResourcePerson, as: 'resourcePersons', attributes: ['id', 'person_name', 'designation', 'organization'] },
      ],
      order: [['from_date', 'DESC'], ['id', 'DESC']],
    });

    const result = records.map(r => {
      const j = r.toJSON();
      const coordList = Array.isArray(j.coordinators) && j.coordinators.length > 0
        ? j.coordinators.map(c => c.coordinator_name)
        : parseList(j.coordinator_name);
      const speakerList = Array.isArray(j.resourcePersons) && j.resourcePersons.length > 0
        ? j.resourcePersons.map(s => s.person_name)
        : parseList(j.speaker_details);

      const hasProof = Boolean(r.get('has_proof') || j.has_proof);
      const hasDoc = Boolean(r.get('has_documentation') || j.has_documentation);

      return {
        ...j,
        has_proof: hasProof,
        has_documentation: hasDoc,
        coordinator_name: coordList.join(', '),
        speaker_details: speakerList.join(', '),
        coordinatorList: coordList,
        resourcePersonList: speakerList,
      };
    });

    res.status(200).json({ success: true, data: result, count: result.length });
  } catch (error) {
    console.error('Error fetching events organized:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching data', error: error.message });
  }
};

export const getOrganizedById = async (req, res) => {
  try {
    const Userid = req.user?.Userid || req.user?.userId;
    if (!Userid) return res.status(401).json({ message: 'User not authenticated properly' });

    const record = await EventsOrganized.findOne({
      where: { id: req.params.id, Userid },
      attributes: {
        exclude: ['proof', 'documentation'],
        include: [
          [sequelize.literal('CASE WHEN proof IS NOT NULL AND LENGTH(proof) > 0 THEN 1 ELSE 0 END'), 'has_proof'],
          [sequelize.literal('CASE WHEN documentation IS NOT NULL AND LENGTH(documentation) > 0 THEN 1 ELSE 0 END'), 'has_documentation']
        ]
      },
      include: [
        { model: EventCoordinator, as: 'coordinators', attributes: ['id', 'coordinator_name'] },
        { model: EventResourcePerson, as: 'resourcePersons', attributes: ['id', 'person_name', 'designation', 'organization'] },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Entry not found' });

    const j = record.toJSON();
    const coordList = Array.isArray(j.coordinators) && j.coordinators.length > 0
      ? j.coordinators.map(c => c.coordinator_name)
      : parseList(j.coordinator_name);
    const speakerList = Array.isArray(j.resourcePersons) && j.resourcePersons.length > 0
      ? j.resourcePersons.map(s => s.person_name)
      : parseList(j.speaker_details);

    const hasProof = Boolean(record.get('has_proof') || j.has_proof);
    const hasDoc = Boolean(record.get('has_documentation') || j.has_documentation);

    res.status(200).json({
      success: true,
      data: {
        ...j,
        has_proof: hasProof,
        has_documentation: hasDoc,
        coordinator_name: coordList.join(', '),
        speaker_details: speakerList.join(', ')
      }
    });
  } catch (error) {
    console.error('Error fetching events organized record:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching record', error: error.message });
  }
};

export const createOrganized = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const Userid = req.user?.Userid || req.user?.userId;
    if (!Userid) {
      await t.rollback();
      return res.status(401).json({ message: 'User not authenticated properly' });
    }

    const cleanData = cleanOrganizedData(req.body);

    if (req.files) {
      if (req.files.proof) {
        cleanData.proof = req.files.proof[0].buffer;
      }
      if (req.files.documentation) {
        cleanData.documentation = req.files.documentation[0].buffer;
      }
    }

    const coordList = parseList(cleanData.coordinator_name);
    const speakerList = parseList(cleanData.speaker_details);

    cleanData.coordinator_name = coordList.join(', ');
    cleanData.speaker_details = speakerList.join(', ');

    const newRecord = await EventsOrganized.create({ Userid, ...cleanData }, { transaction: t });

    if (coordList.length > 0) {
      await EventCoordinator.bulkCreate(
        coordList.map(name => ({ event_id: newRecord.id, coordinator_name: name })),
        { transaction: t }
      );
    }
    if (speakerList.length > 0) {
      await EventResourcePerson.bulkCreate(
        speakerList.map(name => ({ event_id: newRecord.id, person_name: name })),
        { transaction: t }
      );
    }

    await t.commit();
    res.status(201).json({ success: true, message: 'Event organized created successfully', data: newRecord, id: newRecord.id });
  } catch (error) {
    await t.rollback();
    console.error('Error creating events organized record:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Duplicate entry error' });
    }
    res.status(500).json({ success: false, message: 'Server error while creating record', error: error.message });
  }
};

import { syncEventTypeMaster, syncFundingAgency } from '../../services/masterSyncService.js';
import { parseBulkRecords } from '../../utils/bulkUploadHelper.js';

export const bulkCreateEventsOrganized = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const Userid = req.user?.Userid || req.user?.userId;
    if (!Userid) {
      await t.rollback();
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const records = parseBulkRecords(req);
    if (!Array.isArray(records) || records.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'No valid records provided' });
    }

    const createdRecords = [];
    for (const rec of records) {
      const sponsoredBool = rec.sponsored === true || rec.sponsored === 'true' || rec.sponsored === 'Yes';
      const coordList = parseList(rec.coordinator_name || 'Faculty Coordinator');
      const speakerList = parseList(rec.speaker_details || 'Guest Speaker');
      const progName = String(rec.program_name || rec.programme_name || 'Workshop').trim();
      const coordName = String(rec.coordinator_name || 'Faculty Coordinator').trim();
      const coCoordNames = parseList(rec.co_coordinator_names).join(', ');
      const speakerDetails = String(rec.speaker_details || 'Guest Speaker').trim();
      const withFunding = (rec.with_funding === 'Yes' || rec.with_funding === true) ? 'Yes' : 'No';
      const withSelfSupporting = (rec.with_self_supporting === 'Yes' || rec.with_self_supporting === true) ? 'Yes' : 'No';
      const fromDate = normalizeToDbDate(rec.from_date) || new Date().toISOString().split('T')[0];
      const toDate = normalizeToDbDate(rec.to_date) || fromDate;
      
      const calcDays = parseInt(rec.days, 10) || Math.max(1, Math.ceil((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1);

      const record = await EventsOrganized.create({
        Userid,
        program_name: progName,
        program_title: String(rec.program_title || rec.title || 'Organized Event').trim(),
        coordinator_name: coordName,
        co_coordinator_names: coCoordNames,
        with_funding: withFunding,
        with_self_supporting: withSelfSupporting,
        speaker_details: speakerDetails,
        from_date: fromDate,
        to_date: toDate,
        days: calcDays,
        sponsored_by: rec.sponsored_by ? String(rec.sponsored_by).trim() : null,
        amount_sanctioned: rec.amount_sanctioned ? (parseFloat(rec.amount_sanctioned) || 0) : null,
        participants: parseInt(rec.participants || rec.no_of_participants, 10) || 1,
        document_link: rec.document_link ? String(rec.document_link).trim() : null,
        proof: typeof rec.proof === 'string' ? rec.proof : null,
        documentation: typeof rec.documentation === 'string' ? rec.documentation : null,
      }, { transaction: t });

      if (coordList.length > 0) {
        await EventCoordinator.bulkCreate(
          coordList.map(name => ({ event_id: record.id, coordinator_name: name })),
          { transaction: t }
        );
      }
      if (speakerList.length > 0) {
        await EventResourcePerson.bulkCreate(
          speakerList.map(name => ({ event_id: record.id, person_name: name })),
          { transaction: t }
        );
      }
      createdRecords.push(record);
    }

    await t.commit();
    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${createdRecords.length} organized events`,
      data: createdRecords,
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Error bulk creating events organized:', error);
    res.status(400).json({
      message: `Failed to save bulk records: ${error.message}`,
      error: error.message,
      details: error.errors ? error.errors.map(e => e.message) : [error.message]
    });
  }
};

export const updateOrganized = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const Userid = req.user?.Userid || req.user?.userId;
    if (!Userid) {
      await t.rollback();
      return res.status(401).json({ message: 'User not authenticated properly' });
    }

    const record = await EventsOrganized.findOne({ where: { id: req.params.id, Userid }, transaction: t });
    if (!record) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const cleanData = cleanOrganizedData(req.body);
    if (req.files) {
      if (req.files.proof) cleanData.proof = req.files.proof[0].buffer;
      if (req.files.documentation) cleanData.documentation = req.files.documentation[0].buffer;
    }

    const coordList = parseList(cleanData.coordinator_name || record.coordinator_name);
    const speakerList = parseList(cleanData.speaker_details || record.speaker_details);

    cleanData.coordinator_name = coordList.join(', ');
    cleanData.speaker_details = speakerList.join(', ');

    await record.update(cleanData, { transaction: t });

    // Refresh child rows
    await EventCoordinator.destroy({ where: { event_id: record.id }, transaction: t });
    if (coordList.length > 0) {
      await EventCoordinator.bulkCreate(
        coordList.map(name => ({ event_id: record.id, coordinator_name: name })),
        { transaction: t }
      );
    }

    await EventResourcePerson.destroy({ where: { event_id: record.id }, transaction: t });
    if (speakerList.length > 0) {
      await EventResourcePerson.bulkCreate(
        speakerList.map(name => ({ event_id: record.id, person_name: name })),
        { transaction: t }
      );
    }

    await t.commit();
    res.status(200).json({ success: true, message: 'Event entry updated successfully', data: record });
  } catch (error) {
    await t.rollback();
    console.error('Error updating events organized record:', error);
    res.status(500).json({ success: false, message: 'Server error while updating record', error: error.message });
  }
};

export const patchOrganized = async (req, res) => {
  return updateOrganized(req, res);
};

// return proof or documentation by id
export const getFile = async (req, res) => {
  try {
    const Userid = req.user?.Userid || req.user?.userId;
    if (!Userid) return res.status(401).json({ message: 'User not authenticated properly' });

    const { id } = req.params;
    const type = req.params.type || 'proof';
    if (!['proof', 'documentation'].includes(type)) {
      return res.status(400).json({ message: 'Invalid file type requested' });
    }

    const record = await EventsOrganized.findOne({ where: { id, Userid } });
    if (!record) return res.status(404).json({ success: false, message: 'Entry not found' });

    const buffer = record[type];
    if (!buffer || buffer.length === 0) {
      return res.status(404).json({ success: false, message: `${type} not available` });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.send(buffer);
  } catch (error) {
    console.error('Error fetching file for events organized:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteOrganized = async (req, res) => {
  try {
    const Userid = req.user?.Userid;
    if (!Userid) return res.status(401).json({ message: 'User not authenticated properly' });

    const record = await EventsOrganized.findOne({ where: { id: req.params.id, Userid } });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    await record.destroy();
    res.status(200).json({ success: true, message: 'Event entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting events organized record:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting record', error: error.message });
  }
};

import path from 'path';
import fs from 'fs';
import ProjectMentor from '../../models/staff/projectMentor.js';
import User from '../../models/User.js';
import { sequelize } from '../../config/mysql.js';

const isAdminUser = (user) => {
  const roleName = user?.roleName || user?.role || '';
  return typeof roleName === 'string' && roleName.toLowerCase().includes('admin');
};

const formatRecord = (row) => {
  const r = row.toJSON ? row.toJSON() : { ...row };
  return {
    id: r.id,
    Userid: r.Userid,
    staffId: r.user?.userId || r.Userid,
    staffName: r.user?.userName || null,
    project_title: r.project_title,
    student_name: r.student_name,
    register_number: r.register_number,
    student_details: r.student_details,
    event_details: r.event_details,
    participation_status: r.participation_status,
    certificate_link: r.certificate_link ? 'available' : null,
    proof_link: r.proof_link ? 'available' : null,
    has_certificate: !!r.certificate_link,
    has_proof: !!r.proof_link,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
};

const servePDF = (res, rawData, filename = 'document.pdf') => {
  if (!rawData) {
    return res.status(404).json({ message: 'Document not available' });
  }

  if (typeof rawData === 'string') {
    const str = rawData.trim();
    const possiblePaths = [
      path.isAbsolute(str) ? str : path.join(process.cwd(), str),
      path.join(process.cwd(), 'uploads', str),
      path.join(process.cwd(), 'uploads', 'project-mentors', str),
      path.join(process.cwd(), 'backend', 'uploads', 'project-mentors', str),
    ];
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          const stats = fs.statSync(p);
          if (stats.size > 0) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Cache-Control', 'no-cache');
            return res.sendFile(p);
          }
        }
      } catch (err) {
        // Ignore stat errors
      }
    }
  }

  let buffer;
  if (Buffer.isBuffer(rawData)) {
    buffer = rawData;
  } else if (typeof rawData === 'string') {
    if (rawData.startsWith('data:application/pdf;base64,')) {
      buffer = Buffer.from(rawData.replace(/^data:application\/pdf;base64,/, ''), 'base64');
    } else if (/^[A-Za-z0-9+/=]+\s*$/.test(rawData.trim()) && rawData.trim().length % 4 === 0 && rawData.trim().length > 100) {
      buffer = Buffer.from(rawData.trim(), 'base64');
    } else {
      buffer = Buffer.from(rawData, 'binary');
    }
  } else if (rawData instanceof Uint8Array || Array.isArray(rawData)) {
    buffer = Buffer.from(rawData);
  } else {
    buffer = Buffer.from(String(rawData));
  }

  if (!buffer || buffer.length === 0) {
    return res.status(404).json({ message: 'Document is empty' });
  }

  const pdfOffset = buffer.indexOf('%PDF-');
  if (pdfOffset === -1 || pdfOffset > 64) {
    return res.status(404).json({ message: 'No valid PDF document uploaded for this record' });
  }

  if (pdfOffset > 0) {
    buffer = buffer.slice(pdfOffset);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'no-cache');
  res.send(buffer);
};

// ─── GET ALL PROJECT MENTORS ──────────────────────────────────────────────────
export const getAllProjectMentors = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const whereClause = (isAdminUser(req.user) && req.query.all === 'true') ? {} : { Userid: userId };

    const records = await ProjectMentor.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'userName'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.status(200).json(records.map(formatRecord));
  } catch (error) {
    console.error('Error fetching project mentors:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET PROJECT MENTOR BY ID ────────────────────────────────────────────────
export const getProjectMentorById = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };

    const record = await ProjectMentor.findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'userName'],
        },
      ],
    });

    if (!record) {
      return res.status(404).json({ message: 'Project mentor record not found' });
    }

    res.status(200).json(formatRecord(record));
  } catch (error) {
    console.error('Error fetching project mentor by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── SERVE CERTIFICATE PDF ────────────────────────────────────────────────────
export const serveCertificate = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
    const record = await ProjectMentor.findOne({
      where: whereClause,
      attributes: ['certificate_link'],
    });

    if (!record || !record.certificate_link) {
      return res.status(404).json({ message: 'Certificate document not available' });
    }

    servePDF(res, record.certificate_link, 'certificate.pdf');
  } catch (error) {
    console.error('Error serving certificate:', error);
    res.status(500).json({ message: 'Server error while retrieving PDF' });
  }
};

// ─── SERVE PROOF PDF ───────────────────────────────────────────────────────────
export const serveProof = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
    const record = await ProjectMentor.findOne({
      where: whereClause,
      attributes: ['proof_link'],
    });

    if (!record || !record.proof_link) {
      return res.status(404).json({ message: 'Proof document not available' });
    }

    servePDF(res, record.proof_link, 'proof.pdf');
  } catch (error) {
    console.error('Error serving proof:', error);
    res.status(500).json({ message: 'Server error while retrieving PDF' });
  }
};

// ─── CREATE PROJECT MENTOR ────────────────────────────────────────────────────
export const createProjectMentor = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const {
      project_title,
      student_name,
      register_number,
      student_details,
      event_details,
      participation_status,
    } = req.body;

    if (!project_title || !event_details || !participation_status) {
      return res.status(400).json({ message: 'Required fields missing: Project Title, Event Details, Participation Status' });
    }

    const certificate_link = req.files?.certificate_link?.[0]?.path
      ? path.relative(process.cwd(), req.files.certificate_link[0].path).replace(/\\/g, '/')
      : null;

    const proof_link = req.files?.proof_link?.[0]?.path
      ? path.relative(process.cwd(), req.files.proof_link[0].path).replace(/\\/g, '/')
      : null;

    const newRecord = await ProjectMentor.create({
      Userid: userId,
      project_title: String(project_title).trim(),
      student_name: student_name ? String(student_name).trim() : null,
      register_number: register_number ? String(register_number).trim() : null,
      student_details: student_details ? String(student_details).trim() : (student_name ? `${student_name} (${register_number || ''})` : null),
      event_details: String(event_details).trim(),
      participation_status: String(participation_status).trim(),
      certificate_link,
      proof_link,
    });

    res.status(201).json({
      message: 'Project mentor record created successfully',
      id: newRecord.id,
      data: formatRecord(newRecord),
    });
  } catch (error) {
    console.error('Error creating project mentor:', error);
    res.status(500).json({ message: 'Server error while creating record' });
  }
};

// ─── UPDATE PROJECT MENTOR ────────────────────────────────────────────────────
export const updateProjectMentor = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
    const record = await ProjectMentor.findOne({ where: whereClause });

    if (!record) {
      return res.status(404).json({ message: 'Project mentor record not found' });
    }

    const {
      project_title,
      student_name,
      register_number,
      student_details,
      event_details,
      participation_status,
    } = req.body;

    if (!project_title || !event_details || !participation_status) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const certificate_link = req.files?.certificate_link?.[0]?.path
      ? path.relative(process.cwd(), req.files.certificate_link[0].path).replace(/\\/g, '/')
      : record.certificate_link;

    const proof_link = req.files?.proof_link?.[0]?.path
      ? path.relative(process.cwd(), req.files.proof_link[0].path).replace(/\\/g, '/')
      : record.proof_link;

    await record.update({
      project_title: String(project_title).trim(),
      student_name: student_name ? String(student_name).trim() : null,
      register_number: register_number ? String(register_number).trim() : null,
      student_details: student_details ? String(student_details).trim() : (student_name ? `${student_name} (${register_number || ''})` : null),
      event_details: String(event_details).trim(),
      participation_status: String(participation_status).trim(),
      certificate_link,
      proof_link,
    });

    res.status(200).json({ message: 'Project mentor record updated successfully' });
  } catch (error) {
    console.error('Error updating project mentor:', error);
    res.status(500).json({ message: 'Server error while updating record' });
  }
};

// ─── DELETE PROJECT MENTOR ────────────────────────────────────────────────────
export const deleteProjectMentor = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
    const record = await ProjectMentor.findOne({ where: whereClause });

    if (!record) {
      return res.status(404).json({ message: 'Project mentor record not found' });
    }

    if (record.certificate_link) {
      const p = path.join(process.cwd(), record.certificate_link);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) {}
      }
    }

    if (record.proof_link) {
      const p = path.join(process.cwd(), record.proof_link);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) {}
      }
    }

    await record.destroy();

    res.status(200).json({ message: 'Project mentor record deleted successfully' });
  } catch (error) {
    console.error('Error deleting project mentor:', error);
    res.status(500).json({ message: 'Server error while deleting record' });
  }
};

// ─── BULK CREATE PROJECT MENTORS ──────────────────────────────────────────────
export const bulkCreateProjectMentors = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const records = req.body.records || req.body.rows || req.body;
    if (!Array.isArray(records) || records.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'No valid records provided' });
    }

    const createdRecords = [];
    for (const rec of records) {
      const studentName = rec.student_name ? String(rec.student_name).trim() : null;
      const regNo = rec.register_number ? String(rec.register_number).trim() : null;
      const details = rec.student_details ? String(rec.student_details).trim() : (studentName ? `${studentName} (${regNo || ''})` : null);

      const newRec = await ProjectMentor.create({
        Userid: userId,
        project_title: String(rec.project_title || '').trim(),
        student_name: studentName,
        register_number: regNo,
        student_details: details,
        event_details: String(rec.event_details || '').trim(),
        participation_status: rec.participation_status ? String(rec.participation_status).trim() : 'Participated',
        certificate_link: rec.certificate_link ? String(rec.certificate_link).trim() : null,
        proof_link: rec.proof_link ? String(rec.proof_link).trim() : null,
      }, { transaction: t });
      createdRecords.push(newRec);
    }

    await t.commit();
    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${createdRecords.length} project mentor records`,
      data: createdRecords,
    });
  } catch (error) {
    await t.rollback();
    console.error('Error bulk creating project mentor records:', error);
    res.status(500).json({ message: 'Server error while bulk creating records', error: error.message });
  }
};

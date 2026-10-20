import Membership from '../../models/staff/Membership.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseBulkRecords } from '../../utils/bulkUploadHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage for Membership PDF uploads
const uploadDir = path.join(__dirname, '../../uploads/membership');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `membership_${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

export const membershipUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Helper function to serve stored PDF proof
const servePDF = (res, rawData, filename = 'membership_proof.pdf') => {
  if (!rawData) {
    return res.status(404).json({ message: 'Proof document not available' });
  }

  // Handle Buffer objects
  if (Buffer.isBuffer(rawData)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', rawData.length);
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(rawData);
  }

  if (typeof rawData === 'string') {
    const str = rawData.trim();
    if (!str || str === 'null' || str === 'undefined') {
      return res.status(404).json({ message: 'Proof document reference is empty' });
    }

    // Handle base64 string data
    if (str.startsWith('data:application/pdf;base64,')) {
      const base64Data = str.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(buffer);
    }

    const cleanStr = str.replace(/\\/g, '/');
    const filenameOnly = path.basename(cleanStr);

    const possiblePaths = [
      path.isAbsolute(str) ? str : path.join(process.cwd(), str),
      path.join(process.cwd(), cleanStr.startsWith('/') ? cleanStr.slice(1) : cleanStr),
      path.join(process.cwd(), 'uploads', cleanStr.startsWith('/') ? cleanStr.slice(1) : cleanStr),
      path.join(process.cwd(), 'uploads/membership', filenameOnly),
      path.join(process.cwd(), 'uploads', filenameOnly),
      path.join(process.cwd(), 'Uploads', filenameOnly),
      path.join(process.cwd(), 'Uploads/membership', filenameOnly),
      path.join(__dirname, '../../uploads/membership', filenameOnly),
      path.join(__dirname, '../../uploads', filenameOnly),
      path.join(__dirname, '../../Uploads/membership', filenameOnly),
      path.join(__dirname, '../../Uploads', filenameOnly),
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
        // Skip path error
      }
    }
  }

  return res.status(404).json({ message: 'Proof file not found on server' });
};

// ─── GET ALL MEMBERSHIPS ──────────────────────────────────────────────────────
export const getMemberships = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const rows = await Membership.findAll({
      where: { Userid: userId },
      order: [['id', 'DESC']],
    });

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching memberships:', error);
    res.status(500).json({ message: 'Server error while fetching memberships' });
  }
};

// ─── GET MEMBERSHIP BY ID ─────────────────────────────────────────────────────
export const getMembershipById = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const membership = await Membership.findOne({
      where: { id: req.params.id, Userid: userId },
    });

    if (!membership) return res.status(404).json({ message: 'Membership record not found' });

    res.status(200).json(membership);
  } catch (error) {
    console.error('Error fetching membership:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET PROOF DOCUMENT ───────────────────────────────────────────────────────
export const getMembershipProof = async (req, res) => {
  try {
    const membership = await Membership.findByPk(req.params.id);
    if (!membership || !membership.proof_document) {
      return res.status(404).json({ message: 'Proof document not available' });
    }

    servePDF(res, membership.proof_document, `membership_${membership.id}_proof.pdf`);
  } catch (error) {
    console.error('Error serving membership proof PDF:', error);
    res.status(500).json({ message: 'Server error retrieving PDF proof' });
  }
};

// ─── CREATE MEMBERSHIP ────────────────────────────────────────────────────────
export const createMembership = [
  membershipUpload.single('proof_document'),
  async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.Userid;
      if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

      const { society_name, position_grade, contributions, membership_number } = req.body;

      if (!society_name || !position_grade || !membership_number) {
        return res.status(400).json({
          message: 'Society Name, Grade/Position, and Membership Number are required',
        });
      }

      let proof_document = null;
      if (req.file) {
        proof_document = `/uploads/membership/${req.file.filename}`;
      } else if (req.body.proof_document && typeof req.body.proof_document === 'string' && req.body.proof_document.trim() !== '' && req.body.proof_document !== 'null' && req.body.proof_document !== 'undefined') {
        proof_document = req.body.proof_document.trim();
      }

      const newRecord = await Membership.create({
        Userid: userId,
        society_name: society_name.trim(),
        position_grade: position_grade.trim(),
        contributions: contributions ? contributions.trim() : null,
        membership_number: membership_number.trim(),
        proof_document,
      });

      res.status(201).json({
        message: 'Membership created successfully',
        data: newRecord,
      });
    } catch (error) {
      console.error('Error creating membership:', error);
      res.status(500).json({ message: 'Server error while creating membership', error: error.message });
    }
  },
];

// ─── UPDATE MEMBERSHIP ────────────────────────────────────────────────────────
export const updateMembership = [
  membershipUpload.single('proof_document'),
  async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.Userid;
      if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

      const membership = await Membership.findOne({
        where: { id: req.params.id, Userid: userId },
      });

      if (!membership) return res.status(404).json({ message: 'Membership record not found' });

      const { society_name, position_grade, contributions, membership_number } = req.body;

      if (!society_name || !position_grade || !membership_number) {
        return res.status(400).json({
          message: 'Society Name, Grade/Position, and Membership Number are required',
        });
      }

      let proof_document = membership.proof_document;
      if (req.file) {
        // Delete old file if present
        if (membership.proof_document && membership.proof_document.startsWith('/uploads/membership/')) {
          const oldPath = path.join(__dirname, '../..', membership.proof_document);
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
          }
        }
        proof_document = `/uploads/membership/${req.file.filename}`;
      } else if (req.body.proof_document === '' || req.body.proof_document === 'null' || req.body.remove_proof === 'true') {
        proof_document = null;
      } else if (req.body.proof_document && typeof req.body.proof_document === 'string' && req.body.proof_document.trim() !== '' && req.body.proof_document !== 'null' && req.body.proof_document !== 'undefined' && req.body.proof_document !== '[object Object]') {
        proof_document = req.body.proof_document.trim();
      }

      await membership.update({
        society_name: society_name.trim(),
        position_grade: position_grade.trim(),
        contributions: contributions ? contributions.trim() : null,
        membership_number: membership_number.trim(),
        proof_document,
      });

      res.status(200).json({
        message: 'Membership updated successfully',
        data: membership,
      });
    } catch (error) {
      console.error('Error updating membership:', error);
      res.status(500).json({ message: 'Server error while updating membership', error: error.message });
    }
  },
];

// ─── DELETE MEMBERSHIP ────────────────────────────────────────────────────────
export const deleteMembership = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const membership = await Membership.findOne({
      where: { id: req.params.id, Userid: userId },
    });

    if (!membership) return res.status(404).json({ message: 'Membership record not found' });

    // Clean up file if local upload
    if (membership.proof_document && membership.proof_document.startsWith('/uploads/membership/')) {
      const filePath = path.join(__dirname, '../..', membership.proof_document);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      }
    }

    await membership.destroy();

    res.status(200).json({ message: 'Membership deleted successfully' });
  } catch (error) {
    console.error('Error deleting membership:', error);
    res.status(500).json({ message: 'Server error while deleting membership' });
  }
};

// ─── BULK CREATE MEMBERSHIPS ──────────────────────────────────────────────────
export const bulkCreateMemberships = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const records = parseBulkRecords(req);
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'No valid records provided' });
    }

    const getVal = (rec, keys) => {
      for (const k of keys) {
        if (rec[k] !== undefined && rec[k] !== null && String(rec[k]).trim() !== '') {
          return String(rec[k]).trim();
        }
      }
      return '';
    };

    const prepared = records.map(rec => {
      const society_name = getVal(rec, ['society_name', 'professional_body', 'societyName', 'society', 'name_of_society', 'Name of Professional Society / Body', 'professional_society']);
      const position_grade = getVal(rec, ['position_grade', 'grade', 'level', 'position', 'grade_level_position', 'Grade / Level / Position']);
      const membership_number = getVal(rec, ['membership_number', 'membership_no', 'membership_id', 'member_no', 'Membership Number']);
      const contributions = getVal(rec, ['contributions', 'contributions_to_society', 'contributions_ay_2025_2026', 'Contributions']);
      const proof_document = getVal(rec, ['proof_document', 'proof', 'proof_link', 'document', 'Proof PDF File Name']);

      return {
        Userid: userId,
        society_name,
        position_grade,
        contributions: contributions || null,
        membership_number,
        proof_document: proof_document || null,
      };
    }).filter(rec => rec.society_name && rec.position_grade && rec.membership_number);

    if (prepared.length === 0) {
      return res.status(400).json({ message: 'No valid membership entries with required fields found' });
    }

    const created = await Membership.bulkCreate(prepared);

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${created.length} membership records`,
      data: created,
    });
  } catch (error) {
    console.error('Error bulk creating memberships:', error);
    res.status(500).json({ message: 'Server error while bulk creating memberships', error: error.message });
  }
};

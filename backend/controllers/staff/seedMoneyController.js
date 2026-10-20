import SeedMoney from '../../models/staff/SeedMoney.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sequelize } from '../../config/mysql.js';
import { normalizeToDbDate } from '../../utils/dateHelper.js';

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// ─── HELPER: serve a BLOB or disk file as PDF ──────────────────────────────────
const servePDF = (res, rawData, filename = 'document.pdf') => {
  if (!rawData) {
    return res.status(404).json({ message: 'Document not available' });
  }

  // 1. If rawData is a string file path or filename
  if (typeof rawData === 'string') {
    const str = rawData.trim();
    const possiblePaths = [
      path.isAbsolute(str) ? str : path.join(process.cwd(), str),
      path.join(process.cwd(), 'uploads', str),
      path.join(process.cwd(), 'uploads', 'seed-money', str),
      path.join(process.cwd(), 'public', str),
      path.join(process.cwd(), 'public', 'uploads', str),
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

  // 2. Convert rawData to Buffer if it's binary BLOB data
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

  // 3. Verify magic PDF header %PDF- within first 64 bytes
  const pdfOffset = buffer.indexOf('%PDF-');
  if (pdfOffset === -1 || pdfOffset > 64) {
    console.warn(`[servePDF] Stored document does not contain %PDF- magic header (offset: ${pdfOffset}). Returning 404.`);
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

export const getSeedMoneyEntries = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    const whereClause = userId ? { Userid: userId } : {};

    const entries = await SeedMoney.findAll({
      where: whereClause,
      attributes: [
        'id', 'Userid', 'project_title', 'project_duration', 'from_date', 'to_date', 'amount', 'outcomes', 'created_at', 'updated_at',
        [sequelize.literal('CASE WHEN proof_link IS NOT NULL AND OCTET_LENGTH(proof_link) > 5 THEN "available" ELSE NULL END'), 'proof_link']
      ],
      order: [['from_date', 'DESC'], ['id', 'DESC']]
    });
    res.status(200).json(entries);
  } catch (error) {
    console.error('Error fetching seed money data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSeedMoneyProof = async (req, res) => {
  try {
    const entry = await SeedMoney.findByPk(req.params.id, {
      attributes: ['proof_link']
    });

    if (!entry || !entry.proof_link) {
      return res.status(404).json({ message: 'PDF file not available' });
    }

    servePDF(res, entry.proof_link, 'seed_money_proof.pdf');
  } catch (error) {
    console.error('Error fetching proof file:', error);
    res.status(500).json({ message: 'Server error while retrieving PDF' });
  }
};

export const createSeedMoneyEntry = [
  memoryUpload.single('proof_link'),
  async (req, res) => {
    const {
      project_title,
      project_duration,
      from_date,
      to_date,
      amount,
      outcomes,
    } = req.body;

    if (
      !project_title ||
      !project_duration ||
      !from_date ||
      !to_date ||
      !amount
    ) {
      return res.status(400).json({ message: 'Required fields missing: Project Title, Project Duration, From Date, To Date, Amount' });
    }

    const proofBuffer = req.file ? req.file.buffer : null;
    const outcomesVal = (outcomes && typeof outcomes === 'string' && outcomes.trim() !== '') ? outcomes.trim() : 'N/A';

    try {
      const newEntry = await SeedMoney.create({
        Userid: req.user.userId,
        project_title,
        project_duration,
        from_date: normalizeToDbDate(from_date),
        to_date: normalizeToDbDate(to_date),
        amount,
        outcomes: outcomesVal,
        proof_link: proofBuffer,
      });

      res.status(201).json({
        message: 'Seed money project created successfully',
        id: newEntry.id,
      });
    } catch (error) {
      console.error('Error creating seed money project:', error);
      res.status(500).json({ message: 'Server error while creating project' });
    }
  },
];



export const updateSeedMoneyEntry = [
  memoryUpload.single('proof_link'),
  async (req, res) => {
    const {
      project_title,
      project_duration,
      from_date,
      to_date,
      amount,
      outcomes,
    } = req.body;

    if (
      !project_title ||
      !project_duration ||
      !from_date ||
      !to_date ||
      !amount ||
      !outcomes
    ) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    try {
      const entry = await SeedMoney.findByPk(req.params.id);

      if (!entry) {
        return res.status(404).json({ message: 'Seed money project not found' });
      }

      const updatedData = {
        project_title,
        project_duration,
        from_date,
        to_date,
        amount,
        outcomes,
      };

      if (req.file) {
        updatedData.proof_link = req.file.buffer;
      }

      await entry.update(updatedData);

      res.status(200).json({ message: 'Seed money project updated successfully' });
    } catch (error) {
      console.error('Error updating seed money project:', error);
      res.status(500).json({ message: 'Server error while updating project' });
    }
  },
];

export const deleteSeedMoneyEntry = async (req, res) => {
  try {
    const entry = await SeedMoney.findByPk(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: 'Seed money project not found' });
    }

    await entry.destroy();

    res.status(200).json({ message: 'Seed money project deleted successfully' });
  } catch (error) {
    console.error('Error deleting seed money project:', error);
    res.status(500).json({ message: 'Server error while deleting project' });
  }
};

import { parseBulkRecords } from '../../utils/bulkUploadHelper.js';

export const bulkCreateSeedMoney = async (req, res) => {
  try {
    const userId = req.user?.Userid || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'User ID missing' });

    const rows = parseBulkRecords(req);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'No records provided for bulk insert' });
    }

    const recordsToInsert = rows.map((r) => {
      return {
        Userid: userId,
        project_title: String(r.project_title || r.title || 'Seed Grant Project').trim(),
        project_duration: String(r.project_duration || r.duration || '1 year').trim(),
        from_date: r.from_date || new Date().toISOString().split('T')[0],
        to_date: r.to_date || new Date().toISOString().split('T')[0],
        amount: parseFloat(r.amount) || 0,
        outcomes: r.outcomes ? String(r.outcomes).trim() : 'Project initiated',
        proof_link: typeof r.proof_link === 'string' ? r.proof_link : null,
      };
    });

    const created = await SeedMoney.bulkCreate(recordsToInsert);
    res.status(201).json({
      message: `Successfully imported ${created.length} seed money records`,
      count: created.length,
      data: created,
    });
  } catch (error) {
    console.error('Error bulk creating seed money:', error);
    res.status(400).json({ message: `Failed to save bulk records: ${error.message}` });
  }
};
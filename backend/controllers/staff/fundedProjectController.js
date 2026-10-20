import { sequelize } from '../../config/mysql.js';
import path from 'path';
import fs from 'fs';
import FundedProject from '../../models/staff/FundedProject.js';
import FundedProjectPayment from '../../models/staff/FundedProjectPayment.js';
import ProjectCoPI from '../../models/staff/ProjectCoPI.js';
import ProjectStudent from '../../models/staff/ProjectStudent.js';
import FundedProjectRelease from '../../models/staff/FundedProjectRelease.js';
import { syncFundingAgency } from '../../services/masterSyncService.js';
import { parseBulkRecords } from '../../utils/bulkUploadHelper.js';
import { normalizeToDbDate } from '../../utils/dateHelper.js';

// ─── HELPER: shape a raw record for API response ───────────────────────────────
const formatRecord = (row) => {
  const r = row.toJSON ? row.toJSON() : { ...row };

  // Parse Co-PI names array
  let coPIList = [];
  if (Array.isArray(r.coPIs) && r.coPIs.length > 0) {
    coPIList = r.coPIs.map(c => typeof c === 'string' ? c : (c.co_pi_name || '')).filter(Boolean);
  } else if (r.co_pi_names) {
    if (Array.isArray(r.co_pi_names)) {
      coPIList = r.co_pi_names.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof r.co_pi_names === 'string') {
      coPIList = r.co_pi_names.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Parse Student names array
  let studentList = [];
  if (Array.isArray(r.students) && r.students.length > 0) {
    studentList = r.students.map(s => typeof s === 'string' ? s : (s.student_name || '')).filter(Boolean);
  } else if (r.student_names) {
    if (Array.isArray(r.student_names)) {
      studentList = r.student_names.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof r.student_names === 'string') {
      studentList = r.student_names.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  return {
    id: r.id,
    Userid: r.Userid,
    staffName: r.user?.userName ?? null,
    pi_name: r.pi_name,
    co_pi_names: coPIList.join(', '),
    co_pi_list: coPIList,
    coPIs: coPIList.map(name => ({ co_pi_name: name })),
    students_involved: r.students_involved || (studentList.length > 0 ? 'Yes' : 'No'),
    student_list: studentList,
    student_names: studentList,
    students: studentList.map(name => ({ student_name: name })),
    project_title: r.project_title,
    funding_agency: r.funding_agency,
    from_date: r.from_date,
    to_date: r.to_date,
    amount: r.amount,
    amount_received: r.amount_received,
    organization_name: r.organization_name,
    has_proof: !!r.proof,
    has_yearly_report: !!r.yearly_report,
    has_final_report: !!r.final_report,
    proof: r.proof ? 'available' : null,
    yearly_report: r.yearly_report ? 'available' : null,
    final_report: r.final_report ? 'available' : null,
    releases: Array.isArray(r.releases) ? r.releases.map(rel => ({
      id: rel.id,
      release_date: rel.release_date,
      amount_received: rel.amount_received,
      remarks: rel.remarks || '',
    })) : [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
};

// ─── INCLUDE clause reused in every SELECT ─────────────────────────────────────
const getIncludes = async () => {
  const { default: User } = await import('../../models/User.js');
  return [
    {
      model: User,
      as: 'user',
      attributes: ['userId', 'userName'],
    },
    {
      model: ProjectCoPI,
      as: 'coPIs',
      attributes: ['id', 'co_pi_name'],
    },
    {
      model: ProjectStudent,
      as: 'students',
      attributes: ['id', 'student_name'],
    },
    {
      model: FundedProjectRelease,
      as: 'releases',
      attributes: ['id', 'release_date', 'amount_received', 'remarks'],
    },
  ];
};

const isAdminUser = (user) => {
  const roleName = user?.roleName || user?.role || '';
  return typeof roleName === 'string' && roleName.toLowerCase().includes('admin');
};

// ─── GET ALL FUNDED PROJECTS ───────────────────────────────────────────────────
export const getAllFundedProjects = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const include = await getIncludes();

    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const whereClause = (isAdminUser(req.user) && req.query.all === 'true') ? {} : { Userid: userId };

    const records = await FundedProject.findAll({
      where: whereClause,
      include,
      order: [
        ['from_date', 'DESC'],
        ['id', 'DESC'],
        [{ model: FundedProjectRelease, as: 'releases' }, 'release_date', 'ASC']
      ],
    });

    res.status(200).json(records.map(formatRecord));
  } catch (error) {
    console.error('Error fetching funded projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET FUNDED PROJECT BY ID ─────────────────────────────────────────────────
export const getFundedProjectById = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const include = await getIncludes();

    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };

    const record = await FundedProject.findOne({
      where: whereClause,
      include,
      order: [
        [{ model: FundedProjectRelease, as: 'releases' }, 'release_date', 'ASC']
      ]
    });

    if (!record) {
      return res.status(404).json({ message: 'Funded project not found' });
    }

    res.status(200).json(formatRecord(record));
  } catch (error) {
    console.error('Error fetching funded project by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

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
      path.join(process.cwd(), 'uploads', 'funded-projects', str),
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

// ─── SERVE PROOF PDF ───────────────────────────────────────────────────────────
export const serveProof = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
    const record = await FundedProject.findOne({
      where: whereClause,
      attributes: ['proof'],
    });

    if (!record || !record.proof) {
      return res.status(404).json({ message: 'Proof document not available' });
    }

    servePDF(res, record.proof, 'proof.pdf');
  } catch (error) {
    console.error('Error serving proof:', error);
    res.status(500).json({ message: 'Server error while retrieving PDF' });
  }
};

// ─── SERVE YEARLY REPORT PDF ──────────────────────────────────────────────────
export const serveYearlyReport = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
    const record = await FundedProject.findOne({
      where: whereClause,
      attributes: ['yearly_report'],
    });

    if (!record || !record.yearly_report) {
      return res.status(404).json({ message: 'Yearly report not available' });
    }

    servePDF(res, record.yearly_report, 'yearly_report.pdf');
  } catch (error) {
    console.error('Error serving yearly report:', error);
    res.status(500).json({ message: 'Server error while retrieving PDF' });
  }
};

// ─── SERVE FINAL REPORT PDF ───────────────────────────────────────────────────
export const serveFinalReport = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
    const record = await FundedProject.findOne({
      where: whereClause,
      attributes: ['final_report'],
    });

    if (!record || !record.final_report) {
      return res.status(404).json({ message: 'Final report not available' });
    }

    servePDF(res, record.final_report, 'final_report.pdf');
  } catch (error) {
    console.error('Error serving final report:', error);
    res.status(500).json({ message: 'Server error while retrieving PDF' });
  }
};

// Helper: parse string or array into trimmed non-empty string array
const parseListInput = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(item => String(item).trim()).filter(Boolean);
        }
      } catch (e) {
        // Fallback to split if JSON parse fails
      }
    }
    return trimmed.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [];
};

// Helper to parse amount releases input array/JSON string
const parseReleasesList = (releasesInput) => {
    if (!releasesInput) return [];
    let list = releasesInput;
    if (typeof list === 'string') {
        try {
            list = JSON.parse(list);
            if (typeof list === 'string') {
                list = JSON.parse(list);
            }
        } catch (e) {
            console.error('[parseReleasesList] Error parsing JSON:', e.message);
            list = [];
        }
    }
    if (!Array.isArray(list)) {
        if (typeof list === 'object' && list !== null) {
            list = [list];
        } else {
            return [];
        }
    }
    return list
        .map(r => {
            if (!r || typeof r !== 'object') return null;
            const dateVal = r.release_date || r.releaseDate || r.date || '';
            let cleanDate = dateVal ? String(dateVal).split('T')[0].trim() : '';
            const parts = cleanDate.split(/[-/]/);
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    cleanDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else if (parts[2].length === 4) {
                    cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }
            const amountVal = parseFloat(r.amount_received ?? r.amountReceived ?? r.amount ?? 0) || 0;
            const remarksVal = r.remarks ? String(r.remarks).trim() : '';
            return {
                release_date: cleanDate,
                amount_received: amountVal,
                remarks: remarksVal,
            };
        })
        .filter(r => r && r.release_date && r.release_date.length >= 8);
};

// ─── CREATE FUNDED PROJECT ─────────────────────────────────────────────────────
export const createFundedProject = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      pi_name,
      co_pi_names,
      students_involved,
      student_names,
      project_title,
      funding_agency,
      from_date,
      to_date,
      amount,
      organization_name
    } = req.body;

    if (!pi_name || !project_title || !funding_agency || !from_date || !to_date || amount === undefined || amount === null || amount === '') {
      await t.rollback();
      return res.status(400).json({ message: 'Required fields missing: PI Name, Project Title, Funding Agency, From Date, To Date, Amount' });
    }

    const orgName = (organization_name && typeof organization_name === 'string' && organization_name.trim() !== '')
      ? organization_name.trim()
      : (funding_agency ? funding_agency.trim() : 'National Engineering College');

    const proof = req.files?.proof?.[0]?.path
      ? path.relative(process.cwd(), req.files.proof[0].path).replace(/\\/g, '/')
      : null;

    const yearly_report = req.files?.yearly_report?.[0]?.path
      ? path.relative(process.cwd(), req.files.yearly_report[0].path).replace(/\\/g, '/')
      : null;

    const final_report = req.files?.final_report?.[0]?.path
      ? path.relative(process.cwd(), req.files.final_report[0].path).replace(/\\/g, '/')
      : null;

    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ message: 'User ID missing' });
    }

    // Sync funding agency to master list
    if (funding_agency && funding_agency.trim()) {
      try {
        await syncFundingAgency(funding_agency.trim());
      } catch (agencyErr) {
        console.warn('Failed to sync funding agency master:', agencyErr.message);
      }
    }

    const coPIArray = parseListInput(co_pi_names);
    const studentsInvolvedVal = students_involved === 'Yes' || students_involved === true || students_involved === 'true' ? 'Yes' : 'No';
    const studentArray = studentsInvolvedVal === 'Yes' ? parseListInput(student_names) : [];

    const releasesList = parseReleasesList(req.body.releases);
    let totalReceived = releasesList.reduce((sum, r) => sum + Number(r.amount_received || 0), 0);
    if (releasesList.length === 0 && req.body.amount_received !== undefined && req.body.amount_received !== null && req.body.amount_received !== '') {
      totalReceived = parseFloat(req.body.amount_received) || 0;
    }

    const newRecord = await FundedProject.create({
      Userid: userId,
      pi_name: pi_name.trim(),
      co_pi_names: coPIArray.join(', ') || null,
      students_involved: studentsInvolvedVal,
      project_title: project_title.trim(),
      funding_agency: funding_agency.trim(),
      from_date: normalizeToDbDate(from_date),
      to_date: normalizeToDbDate(to_date),
      amount: parseFloat(amount) || 0,
      amount_received: totalReceived,
      organization_name: orgName,
      proof,
      yearly_report,
      final_report,
    }, { transaction: t });

    // Save individual Co-PI records
    if (coPIArray.length > 0) {
      await ProjectCoPI.bulkCreate(
        coPIArray.map(name => ({ project_id: newRecord.id, co_pi_name: name })),
        { transaction: t }
      );
    }

    // Save individual Student records if Students Involved
    if (studentsInvolvedVal === 'Yes' && studentArray.length > 0) {
      await ProjectStudent.bulkCreate(
        studentArray.map(name => ({ project_id: newRecord.id, student_name: name })),
        { transaction: t }
      );
    }

    // Save Amount Release entries in funded_project_releases
    if (releasesList.length > 0) {
      await FundedProjectRelease.bulkCreate(
        releasesList.map(rel => ({
          funded_project_id: newRecord.id,
          release_date: rel.release_date,
          amount_received: rel.amount_received,
          remarks: rel.remarks,
        })),
        { transaction: t }
      );
    }

    await t.commit();
    console.log(`Created FundedProject ID ${newRecord.id} with ${releasesList.length} releases`);

    res.status(201).json({
      message: 'Funded project created successfully',
      id: newRecord.id,
    });
  } catch (error) {
    await t.rollback();
    console.error('Error creating funded project:', error);
    res.status(500).json({ message: 'Server error while creating record' });
  }
};

// ─── UPDATE FUNDED PROJECT ─────────────────────────────────────────────────────
export const updateFundedProject = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ message: 'Unauthorized: userId missing' });
    }

    const {
      pi_name,
      co_pi_names,
      students_involved,
      student_names,
      project_title,
      funding_agency,
      from_date,
      to_date,
      amount,
      organization_name
    } = req.body;

    if (!pi_name || !project_title || !funding_agency || !from_date || !to_date || amount === undefined || amount === null || amount === '') {
      await t.rollback();
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const orgName = (organization_name && typeof organization_name === 'string' && organization_name.trim() !== '')
      ? organization_name.trim()
      : (funding_agency ? funding_agency.trim() : 'National Engineering College');

    const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
    const record = await FundedProject.findOne({ where: whereClause, transaction: t });

    if (!record) {
      await t.rollback();
      return res.status(404).json({ message: 'Funded project not found' });
    }

    // Sync funding agency to master list
    if (funding_agency && funding_agency.trim()) {
      try {
        await syncFundingAgency(funding_agency.trim());
      } catch (agencyErr) {
        console.warn('Failed to sync funding agency master:', agencyErr.message);
      }
    }

    const proof = req.files?.proof?.[0]?.path
      ? path.relative(process.cwd(), req.files.proof[0].path).replace(/\\/g, '/')
      : record.proof;

    const yearly_report = req.files?.yearly_report?.[0]?.path
      ? path.relative(process.cwd(), req.files.yearly_report[0].path).replace(/\\/g, '/')
      : record.yearly_report;

    const final_report = req.files?.final_report?.[0]?.path
      ? path.relative(process.cwd(), req.files.final_report[0].path).replace(/\\/g, '/')
      : record.final_report;

    const coPIArray = parseListInput(co_pi_names);
    const studentsInvolvedVal = students_involved === 'Yes' || students_involved === true || students_involved === 'true' ? 'Yes' : 'No';
    const studentArray = studentsInvolvedVal === 'Yes' ? parseListInput(student_names) : [];

    const releasesList = parseReleasesList(req.body.releases);
    let totalReceived = releasesList.reduce((sum, r) => sum + Number(r.amount_received || 0), 0);
    if (releasesList.length === 0 && req.body.amount_received !== undefined && req.body.amount_received !== null && req.body.amount_received !== '') {
      totalReceived = parseFloat(req.body.amount_received) || 0;
    }

    await record.update({
      pi_name: pi_name.trim(),
      co_pi_names: coPIArray.join(', ') || null,
      students_involved: studentsInvolvedVal,
      project_title: project_title.trim(),
      funding_agency: funding_agency.trim(),
      from_date,
      to_date,
      amount: parseFloat(amount) || 0,
      amount_received: totalReceived,
      organization_name: orgName,
      proof,
      yearly_report,
      final_report,
    }, { transaction: t });

    // Update child ProjectCoPI records
    await ProjectCoPI.destroy({ where: { project_id: record.id }, transaction: t });
    if (coPIArray.length > 0) {
      await ProjectCoPI.bulkCreate(
        coPIArray.map(name => ({ project_id: record.id, co_pi_name: name })),
        { transaction: t }
      );
    }

    // Update child ProjectStudent records
    await ProjectStudent.destroy({ where: { project_id: record.id }, transaction: t });
    if (studentsInvolvedVal === 'Yes' && studentArray.length > 0) {
      await ProjectStudent.bulkCreate(
        studentArray.map(name => ({ project_id: record.id, student_name: name })),
        { transaction: t }
      );
    }

    // Refresh Amount Release entries
    await FundedProjectRelease.destroy({ where: { funded_project_id: record.id }, transaction: t });
    if (releasesList.length > 0) {
      await FundedProjectRelease.bulkCreate(
        releasesList.map(rel => ({
          funded_project_id: record.id,
          release_date: rel.release_date,
          amount_received: rel.amount_received,
          remarks: rel.remarks,
        })),
        { transaction: t }
      );
    }

    await t.commit();
    console.log(`Updated FundedProject ID ${req.params.id} with ${releasesList.length} releases`);

    res.status(200).json({ message: 'Funded project updated successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error updating funded project:', error);
    res.status(500).json({ message: 'Server error while updating record' });
  }
};

// ─── DELETE FUNDED PROJECT ─────────────────────────────────────────────────────
export const deleteFundedProject = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

    const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
    const record = await FundedProject.findOne({ where: whereClause });

    if (!record) {
      return res.status(404).json({ message: 'Funded project not found' });
    }

    // Remove associated files from disk before destroying the row
    if (record.proof) {
      const proofPath = path.join(process.cwd(), record.proof);
      if (fs.existsSync(proofPath)) {
        fs.unlinkSync(proofPath);
      }
    }

    if (record.yearly_report) {
      const yearlyReportPath = path.join(process.cwd(), record.yearly_report);
      if (fs.existsSync(yearlyReportPath)) {
        fs.unlinkSync(yearlyReportPath);
      }
    }

    if (record.final_report) {
      const finalReportPath = path.join(process.cwd(), record.final_report);
      if (fs.existsSync(finalReportPath)) {
        fs.unlinkSync(finalReportPath);
      }
    }

    // Delete associated child records
    await ProjectCoPI.destroy({ where: { project_id: record.id } });
    await ProjectStudent.destroy({ where: { project_id: record.id } });
    await FundedProjectPayment.destroy({ where: { proposal_id: record.id } });

    await record.destroy();

    console.log(`Deleted FundedProject ID ${req.params.id}`);

    res.status(200).json({ message: 'Funded project deleted successfully' });
  } catch (error) {
    console.error('Error deleting funded project:', error);
    res.status(500).json({ message: 'Server error while deleting record' });
  }
};

// ─── GET ALL PAYMENT DETAILS FOR A PROJECT ────────────────────────────────────
export const getAllPaymentDetails = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Verify the project belongs to the user or admin
    const whereClause = isAdminUser(req.user) ? { id: proposalId } : { id: proposalId, Userid: userId };
    const project = await FundedProject.findOne({ where: whereClause });

    if (!project) {
      return res.status(404).json({ message: 'Funded project not found or access denied' });
    }

    const payments = await FundedProjectPayment.findAll({
      where: { proposal_id: proposalId },
      order: [['date', 'ASC']],
    });

    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET PAYMENT DETAIL BY ID ─────────────────────────────────────────────────
export const getPaymentDetailById = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const payment = await FundedProjectPayment.findByPk(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment detail not found' });
    }

    // Verify the project belongs to the user
    const whereClause = isAdminUser(req.user) ? { id: payment.proposal_id } : { id: payment.proposal_id, Userid: userId };
    const project = await FundedProject.findOne({ where: whereClause });

    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(payment);
  } catch (error) {
    console.error('Error fetching payment detail:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── CREATE PAYMENT DETAIL ────────────────────────────────────────────────────
export const createPaymentDetail = async (req, res) => {
  try {
    const { proposal_id, date, amount } = req.body;
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!proposal_id || !date || !amount) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    // Verify the project belongs to the user
    const whereClause = isAdminUser(req.user) ? { id: proposal_id } : { id: proposal_id, Userid: userId };
    const project = await FundedProject.findOne({ where: whereClause });

    if (!project) {
      return res.status(404).json({ message: 'Funded project not found or access denied' });
    }

    const newPayment = await FundedProjectPayment.create({
      proposal_id: parseInt(proposal_id),
      date,
      amount: parseFloat(amount) || 0,
    });

    // Update amount_received in funded project
    const payments = await FundedProjectPayment.findAll({
      where: { proposal_id: proposal_id }
    });

    const totalReceived = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    await project.update({ amount_received: totalReceived });

    console.log(`Created PaymentDetail ID ${newPayment.id} for FundedProject ID ${proposal_id}`);

    res.status(201).json({
      message: 'Payment detail created successfully',
      id: newPayment.id,
    });
  } catch (error) {
    console.error('Error creating payment detail:', error);
    res.status(500).json({ message: 'Server error while creating record' });
  }
};

// ─── UPDATE PAYMENT DETAIL ────────────────────────────────────────────────────
export const updatePaymentDetail = async (req, res) => {
  try {
    const { date, amount } = req.body;
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!date || !amount) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const payment = await FundedProjectPayment.findByPk(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment detail not found' });
    }

    // Verify the project belongs to the user
    const whereClause = isAdminUser(req.user) ? { id: payment.proposal_id } : { id: payment.proposal_id, Userid: userId };
    const project = await FundedProject.findOne({ where: whereClause });

    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await payment.update({
      date,
      amount: parseFloat(amount) || 0,
    });

    // Update amount_received in funded project
    const payments = await FundedProjectPayment.findAll({
      where: { proposal_id: payment.proposal_id }
    });

    const totalReceived = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    await project.update({ amount_received: totalReceived });

    console.log(`Updated PaymentDetail ID ${req.params.id}`);

    res.status(200).json({ message: 'Payment detail updated successfully' });
  } catch (error) {
    console.error('Error updating payment detail:', error);
    res.status(500).json({ message: 'Server error while updating record' });
  }
};

// ─── DELETE PAYMENT DETAIL ────────────────────────────────────────────────────
export const deletePaymentDetail = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const payment = await FundedProjectPayment.findByPk(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment detail not found' });
    }

    // Verify the project belongs to the user
    const whereClause = isAdminUser(req.user) ? { id: payment.proposal_id } : { id: payment.proposal_id, Userid: userId };
    const project = await FundedProject.findOne({ where: whereClause });

    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const proposalId = payment.proposal_id;
    await payment.destroy();

    // Update amount_received in funded project
    const payments = await FundedProjectPayment.findAll({
      where: { proposal_id: proposalId }
    });

    const totalReceived = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    await project.update({ amount_received: totalReceived });

    console.log(`Deleted PaymentDetail ID ${req.params.id}`);

    res.status(200).json({ message: 'Payment detail deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment detail:', error);
    res.status(500).json({ message: 'Server error while deleting record' });
  }
};

// ─── BULK CREATE ────────────────────────────────────────────────────────────────
export const bulkCreateFundedProjects = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const userId = req.user?.Userid || req.user?.userId;
    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({ message: 'User ID missing' });
    }

    const rows = parseBulkRecords(req);
    if (!Array.isArray(rows) || rows.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'No records provided for bulk insert' });
    }

    // Batch sync unique funding agencies
    const uniqueAgencies = [...new Set(rows.map(r => (r.funding_agency || '').trim()).filter(Boolean))];
    for (const agency of uniqueAgencies) {
      await syncFundingAgency(agency, transaction);
    }

    const recordsToInsert = rows.map((r) => {
      const agency = (r.funding_agency || '').trim() || 'Funding Agency';
      const piName = (r.pi_name || req.user?.userName || 'Faculty').trim();
      const title = (r.project_title || r.title || 'Funded Research Project').trim();
      const orgName = (r.organization_name || agency || 'National Engineering College').trim();

      return {
        Userid: userId,
        pi_name: piName,
        co_pi_names: r.co_pi_names ? String(r.co_pi_names).trim() : null,
        project_title: title,
        funding_agency: agency,
        organization_name: orgName,
        from_date: normalizeToDbDate(r.from_date) || new Date().toISOString().split('T')[0],
        to_date: normalizeToDbDate(r.to_date) || new Date().toISOString().split('T')[0],
        amount: parseFloat(r.amount) || 0,
        amount_received: parseFloat(r.amount_received) || 0,
        students_involved: ['Yes', 'No'].includes(r.students_involved) ? r.students_involved : 'No',
        proof: typeof r.proof === 'string' ? r.proof : null,
        yearly_report: typeof r.yearly_report === 'string' ? r.yearly_report : null,
        final_report: typeof r.final_report === 'string' ? r.final_report : null,
      };
    });

    const created = await FundedProject.bulkCreate(recordsToInsert, { transaction });

    await transaction.commit();
    res.status(201).json({
      message: `Successfully imported ${created.length} funded project proposals`,
      count: created.length,
      data: created,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error bulk creating funded projects:', error);
    res.status(400).json({
      message: `Failed to save bulk records: ${error.message}`,
      error: error.message,
      details: error.errors ? error.errors.map(e => e.message) : [error.message]
    });
  }
};

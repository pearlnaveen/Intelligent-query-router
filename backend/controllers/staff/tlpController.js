import fs from 'fs';
import path from 'path';
import TlpActivity from '../../models/student/TlpActivity.js';
import { parseBulkRecords } from '../../utils/bulkUploadHelper.js';

const getMimeFromFilename = (filename = '') => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'application/octet-stream';
};

const serveTlpProofDocument = (res, storedFilePath, fallbackFileName = 'tlp_proof') => {
  if (!storedFilePath || typeof storedFilePath !== 'string') {
    return res.status(404).json({ message: 'Document not available' });
  }

  const normalizedPath = storedFilePath.trim().replace(/\\/g, '/');
  const safeRelPath = normalizedPath.replace(/^\/+/, '');
  const diskPath = path.join(process.cwd(), safeRelPath);

  if (!fs.existsSync(diskPath) || !fs.statSync(diskPath).isFile()) {
    return res.status(404).json({ message: 'Document file not found' });
  }

  const fileName = path.basename(normalizedPath);
  const mimeType = getMimeFromFilename(fileName);
  const contentLength = fs.statSync(diskPath).size;

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${fallbackFileName || fileName}"`);
  res.setHeader('Content-Length', contentLength);
  res.setHeader('Cache-Control', 'no-cache');
  return res.sendFile(diskPath);
};

export const serveTlpProof = async (req, res) => {
  try {
    const requesterId = req.user?.Userid || req.user?.userId;
    if (!requesterId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const activity = await TlpActivity.findByPk(req.params.id, {
      attributes: ['Userid', 'image_file'],
    });

    if (!activity || !activity.image_file) {
      return res.status(404).json({ message: 'Proof document not available' });
    }

    if (Number(activity.Userid) !== Number(requesterId) && req.user?.roleName !== 'Admin' && req.user?.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    return serveTlpProofDocument(res, activity.image_file, 'tlp_proof');
  } catch (error) {
    console.error('Error serving TLP proof:', error);
    return res.status(500).json({ message: 'Server error while serving TLP proof' });
  }
};

export const submitTlpActivity = async (req, res) => {
  try {
    const Userid = req.user?.Userid || req.user?.userId;
    if (!Userid) return res.status(401).json({ message: 'Not authenticated' });

    const course_code_and_name = req.body.course_code_and_name || req.body.course_code || req.body.course_name || req.body.course || req.body.courseName;
    const activity_name = req.body.activity_name || req.body.activity || req.body.activityName || req.body.tlp_activity;
    const description = req.body.description !== undefined ? req.body.description : null;
    const imageFile = req.file ? `/uploads/activity/${req.file.filename}` : null;

    console.log('--- Submit TLP Debug ---');
    console.log('Userid:', Userid);
    console.log('req.body:', req.body);
    console.log('req.file:', req.file ? 'File present' : 'No file');

    // Validation
    if (!course_code_and_name || !String(course_code_and_name).trim() || !activity_name || !String(activity_name).trim()) {
      console.warn('❌ TLP submission failed - missing required fields');
      return res.status(400).json({ message: 'Course Code & Name and Activity Name are required' });
    }

    const record = await TlpActivity.create({
      Userid,
      course_code_and_name: String(course_code_and_name).trim(),
      activity_name: String(activity_name).trim(),
      description: description ? String(description).trim() : null,
      image_file: imageFile,
      status: 'Pending',
      Created_by: Userid,
      Updated_by: Userid,
    });

    console.log('✅ TLP activity created successfully. ID:', record.id);
    res.status(201).json({ message: 'TLP activity submitted successfully', activity: record });
  } catch (error) {
    console.error('❌ Error submitting TLP activity Exception:', error);
    res.status(500).json({ message: 'Error submitting TLP activity', error: error.message });
  }
};

export const bulkCreateTlpActivities = async (req, res) => {
  try {
    const Userid = req.user?.Userid || req.user?.userId;
    if (!Userid) return res.status(401).json({ message: 'Not authenticated' });

    const records = parseBulkRecords(req);
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'No valid records provided for bulk upload' });
    }

    const prepared = records.map(rec => {
      const course = rec.course_code_and_name || rec['Course Code & Name'] || rec['Course Code and Name'] || rec.course_code || rec.course_name || rec['Course Code'] || rec.course || '';
      const activity = rec.activity_name || rec['Activity Name'] || rec.activity || rec.tlp_activity || '';
      return {
        Userid,
        course_code_and_name: String(course).trim(),
        activity_name: String(activity).trim(),
        description: rec.description ? String(rec.description).trim() : null,
        status: 'Pending',
        Created_by: Userid,
        Updated_by: Userid,
        image_file: rec.image || rec.image_file || rec.file_path || rec.proof || null,
      };
    }).filter(r => r.course_code_and_name && r.activity_name);

    if (prepared.length === 0) {
      return res.status(400).json({ message: 'No valid records with required course_code_and_name and activity_name found' });
    }

    const created = await TlpActivity.bulkCreate(prepared);
    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${created.length} TLP activity records`,
      data: created,
    });
  } catch (error) {
    console.error('Error bulk creating TLP activities:', error);
    res.status(500).json({ message: 'Error bulk creating TLP activities', error: error.message });
  }
};

export const getStaffTlpActivities = async (req, res) => {
  try {
    const Userid = req.user?.Userid || req.user?.userId;
    if (!Userid) return res.status(401).json({ message: 'Not authenticated' });

    const activities = await TlpActivity.findAll({ where: { Userid }, order: [['created_at', 'DESC']] });
    res.json(activities);
  } catch (error) {
    console.error('Error fetching TLP activities', error);
    res.status(500).json({ message: 'Error fetching TLP activities', error: error.message });
  }
};

export const getTlpById = async (req, res) => {
  try {
    const { id } = req.params;
    const Userid = req.user?.Userid || req.user?.userId;

    const activity = await TlpActivity.findByPk(id);
    if (!activity) return res.status(404).json({ message: 'TLP activity not found' });

    if (Number(activity.Userid) !== Number(Userid) && req.user?.roleName !== 'Admin' && req.user?.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.json(activity);
  } catch (error) {
    console.error('Error fetching TLP activity', error);
    res.status(500).json({ message: 'Error fetching TLP activity', error: error.message });
  }
};

export const updateTlpActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const Userid = req.user?.Userid || req.user?.userId;
    if (!Userid) return res.status(401).json({ message: 'Not authenticated' });

    const activity = await TlpActivity.findByPk(id);
    if (!activity) return res.status(404).json({ message: 'TLP activity not found' });
    if (Number(activity.Userid) !== Number(Userid) && req.user?.roleName !== 'Admin' && req.user?.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized to update this TLP activity' });
    }
    if (activity.status !== 'Pending') return res.status(400).json({ message: 'Only pending activities can be updated' });

    const course_code_and_name = req.body.course_code_and_name || req.body.course_code || req.body.course_name || req.body.course || activity.course_code_and_name;
    const activity_name = req.body.activity_name || req.body.activity || req.body.activityName || activity.activity_name;
    const description = req.body.description !== undefined ? req.body.description : activity.description;
    const imageFile = req.file ? `/uploads/activity/${req.file.filename}` : activity.image_file;

    if (!course_code_and_name || !String(course_code_and_name).trim() || !activity_name || !String(activity_name).trim()) {
      return res.status(400).json({ message: 'Course Code & Name and Activity Name are required' });
    }

    activity.course_code_and_name = String(course_code_and_name).trim();
    activity.activity_name = String(activity_name).trim();
    activity.description = description ? String(description).trim() : null;
    activity.image_file = imageFile;
    activity.Updated_by = Userid;

    await activity.save();
    res.json({ message: 'TLP activity updated successfully', activity });
  } catch (error) {
    console.error('Error updating TLP activity:', error);
    res.status(500).json({ message: 'Error updating TLP activity', error: error.message });
  }
};

export const deleteTlpActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const Userid = req.user?.Userid || req.user?.userId;
    if (!Userid) return res.status(401).json({ message: 'Not authenticated' });

    const activity = await TlpActivity.findByPk(id);
    if (!activity) return res.status(404).json({ message: 'TLP activity not found' });

    if (Number(activity.Userid) !== Number(Userid) && req.user?.roleName !== 'Admin' && req.user?.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized to delete this TLP activity' });
    }

    await activity.destroy();
    res.json({ message: 'TLP activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting TLP activity:', error);
    res.status(500).json({ message: 'Error deleting TLP activity', error: error.message });
  }
};

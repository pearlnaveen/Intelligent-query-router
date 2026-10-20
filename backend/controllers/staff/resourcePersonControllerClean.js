import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import ResourcePerson from '../../models/staff/ResourcePerson.js';
import { sequelize } from '../../config/mysql.js';
import { parseBulkRecords } from '../../utils/bulkUploadHelper.js';

// Helper to determine if current user has admin role
const isAdminUser = (user) => {
    const roleName = user?.roleName || user?.role || user?.role_name || '';
    return typeof roleName === 'string' && roleName.toLowerCase().includes('admin');
};

// ─── GET ALL RESOURCE PERSON ENTRIES ─────────────────────────────────────────
export const getAllResourcePerson = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

        const whereClause = (isAdminUser(req.user) && req.query.all === 'true') ? {} : { Userid: userId };

        const rows = await ResourcePerson.findAll({
            where: whereClause,
            order: [['event_date', 'DESC'], ['created_at', 'DESC']],
        });
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching resource person entries:', error);
        res.status(500).json({ message: 'Server error while fetching records', error: error.message });
    }
};

// ─── GET RESOURCE PERSON BY ID ───────────────────────────────────────────────
export const getResourcePersonById = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

        const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
        const entry = await ResourcePerson.findOne({ where: whereClause });
        if (!entry) return res.status(404).json({ message: 'Resource person entry not found' });

        res.status(200).json(entry);
    } catch (error) {
        console.error('Error fetching resource person entry:', error);
        res.status(500).json({ message: 'Server error while fetching record', error: error.message });
    }
};

// ─── CREATE RESOURCE PERSON ──────────────────────────────────────────────────
export const createResourcePerson = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

        const { program_specification, title, venue, event_date } = req.body;

        if (!program_specification || !title || !venue || !event_date) {
            return res.status(400).json({ message: 'Required fields missing: Program Specification, Title, Venue, Event Date' });
        }

        const proof_link = req.files?.proofFile?.[0]?.filename || req.files?.proof_link?.[0]?.filename || null;
        const photo_link = req.files?.photoFile?.[0]?.filename || req.files?.photo_link?.[0]?.filename || null;

        const newRecord = await ResourcePerson.create({
            Userid: userId,
            program_specification: String(program_specification).trim(),
            title: String(title).trim(),
            venue: String(venue).trim(),
            event_date,
            proof_link,
            photo_link,
        });

        res.status(201).json({
            message: 'Resource person entry created successfully',
            id: newRecord.id,
            data: newRecord,
        });
    } catch (error) {
        console.error('Error creating resource person entry:', error);
        res.status(500).json({ message: 'Server error while creating record', error: error.message });
    }
};

// ─── UPDATE RESOURCE PERSON ──────────────────────────────────────────────────
export const updateResourcePerson = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

        const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
        const entry = await ResourcePerson.findOne({ where: whereClause });

        if (!entry) return res.status(404).json({ message: 'Resource person entry not found' });

        const { program_specification, title, venue, event_date } = req.body;

        if (!program_specification || !title || !venue || !event_date) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        let proof_link = entry.proof_link;
        let photo_link = entry.photo_link;

        if (req.files?.proofFile?.[0]?.filename) {
            proof_link = req.files.proofFile[0].filename;
        } else if (req.files?.proof_link?.[0]?.filename) {
            proof_link = req.files.proof_link[0].filename;
        }

        if (req.files?.photoFile?.[0]?.filename) {
            photo_link = req.files.photoFile[0].filename;
        } else if (req.files?.photo_link?.[0]?.filename) {
            photo_link = req.files.photo_link[0].filename;
        }

        await entry.update({
            program_specification: String(program_specification).trim(),
            title: String(title).trim(),
            venue: String(venue).trim(),
            event_date,
            proof_link,
            photo_link,
        });

        res.status(200).json({ message: 'Resource person entry updated successfully', data: entry });
    } catch (error) {
        console.error('Error updating resource person entry:', error);
        res.status(500).json({ message: 'Server error while updating record', error: error.message });
    }
};

// ─── DELETE RESOURCE PERSON ──────────────────────────────────────────────────
export const deleteResourcePerson = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

        const whereClause = isAdminUser(req.user) ? { id: req.params.id } : { id: req.params.id, Userid: userId };
        const entry = await ResourcePerson.findOne({ where: whereClause });

        if (!entry) return res.status(404).json({ message: 'Resource person entry not found' });

        const uploadsDir = path.resolve(process.cwd(), 'backend/uploads/resource_person');
        const altDir = path.resolve(process.cwd(), 'uploads/resource_person');

        [entry.proof_link, entry.photo_link].forEach(filename => {
            if (filename) {
                const safeName = path.basename(filename);
                [path.join(uploadsDir, safeName), path.join(altDir, safeName)].forEach(filePath => {
                    try {
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    } catch (err) {
                        // ignore file deletion errors
                    }
                });
            }
        });

        await entry.destroy();

        res.status(200).json({ message: 'Resource person entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting resource person entry:', error);
        res.status(500).json({ message: 'Server error while deleting record', error: error.message });
    }
};

// ─── BULK CREATE RESOURCE PERSON ──────────────────────────────────────────────
export const bulkCreateResourcePerson = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) {
            await t.rollback();
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const records = parseBulkRecords(req);
        if (!Array.isArray(records) || records.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: 'No valid records provided' });
        }

        const createdRecords = [];
        for (const rec of records) {
            const progSpec = rec.program_specification || rec['Program Specification'] || rec.programSpecification || rec.program_spec || '';
            const title = rec.title || rec.Title || rec.event_title || rec.eventTitle || '';
            const venue = rec.venue || rec.Venue || rec.event_venue || '';
            const eventDate = rec.event_date || rec['Event Date'] || rec.eventDate || rec.date || new Date().toISOString().split('T')[0];
            const proofLink = rec.proof_link || rec['Proof Link'] || rec.proofLink || null;
            const photoLink = rec.photo_link || rec['Photo Link'] || rec.photoLink || null;

            const newRec = await ResourcePerson.create({
                Userid: userId,
                program_specification: String(progSpec).trim(),
                title: String(title).trim(),
                venue: String(venue).trim(),
                event_date: eventDate,
                proof_link: proofLink ? String(proofLink).trim() : null,
                photo_link: photoLink ? String(photoLink).trim() : null,
            }, { transaction: t });
            createdRecords.push(newRec);
        }

        await t.commit();
        res.status(201).json({
            success: true,
            message: `Successfully uploaded ${createdRecords.length} resource person records`,
            data: createdRecords,
        });
    } catch (error) {
        await t.rollback();
        console.error('Error bulk creating resource person records:', error);
        res.status(500).json({ message: 'Server error while bulk creating records', error: error.message });
    }
};

// ─── HELPER: RESOLVE RESOURCE PERSON FILE PATH ───────────────────────────────
const findFilePath = (filename) => {
    const filenameStr = path.basename(String(filename).trim());
    const possiblePaths = [
        path.join(process.cwd(), 'backend', 'uploads', 'resource_person', filenameStr),
        path.join(process.cwd(), 'uploads', 'resource_person', filenameStr),
        path.join(process.cwd(), 'uploads', filenameStr),
        path.join(process.cwd(), filenameStr),
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
            return p;
        }
    }
    return null;
};

// ─── VIEW FILE ───────────────────────────────────────────────────────────────
export const viewFile = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const rawFilename = req.params.filename ? decodeURIComponent(req.params.filename) : '';
        const filename = path.basename(rawFilename);
        if (!filename) return res.status(400).json({ message: 'Filename is required' });

        // Security check: verify record ownership
        const whereClause = isAdminUser(req.user)
            ? { [Op.or]: [{ proof_link: filename }, { photo_link: filename }] }
            : { Userid: userId, [Op.or]: [{ proof_link: filename }, { photo_link: filename }] };

        const entry = await ResourcePerson.findOne({ where: whereClause });
        if (!entry) {
            return res.status(403).json({ message: 'Access denied: File not found or does not belong to you' });
        }

        const filePath = findFilePath(filename);
        if (!filePath) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        const ext = path.extname(filename).toLowerCase();
        let mimeType = 'application/pdf';
        if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error viewing resource person file:', error);
        res.status(500).json({ message: 'Server error while loading file', error: error.message });
    }
};

// ─── DOWNLOAD FILE ───────────────────────────────────────────────────────────
export const downloadFile = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const rawFilename = req.params.filename ? decodeURIComponent(req.params.filename) : '';
        const filename = path.basename(rawFilename);
        if (!filename) return res.status(400).json({ message: 'Filename is required' });

        // Security check: verify record ownership
        const whereClause = isAdminUser(req.user)
            ? { [Op.or]: [{ proof_link: filename }, { photo_link: filename }] }
            : { Userid: userId, [Op.or]: [{ proof_link: filename }, { photo_link: filename }] };

        const entry = await ResourcePerson.findOne({ where: whereClause });
        if (!entry) {
            return res.status(403).json({ message: 'Access denied: File not found or does not belong to you' });
        }

        const filePath = findFilePath(filename);
        if (!filePath) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        res.download(filePath, filename);
    } catch (error) {
        console.error('Error downloading resource person file:', error);
        res.status(500).json({ message: 'Server error while downloading file', error: error.message });
    }
};

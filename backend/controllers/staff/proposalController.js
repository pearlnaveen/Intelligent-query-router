import fs from 'fs';
import path from 'path';
import ConsultancyProposal from '../../models/staff/ConsultancyProposal.js';
import ConsultancyCoPI from '../../models/staff/ConsultancyCoPI.js';
import ConsultancyRelease from '../../models/staff/ConsultancyRelease.js';
import { sequelize } from '../../config/mysql.js';
import { parseBulkRecords } from '../../utils/bulkUploadHelper.js';
import { normalizeToDbDate } from '../../utils/dateHelper.js';

// ─── HELPER: serve a BLOB field as PDF ─────────────────────────────────────────
const servePDF = (res, rawData, filename = 'document.pdf') => {
    if (!rawData) {
        return res.status(404).json({ message: 'PDF document not available' });
    }

    // 1. If rawData is a string file path or filename
    if (typeof rawData === 'string') {
        const str = rawData.trim();
        const possiblePaths = [
            path.isAbsolute(str) ? str : path.join(process.cwd(), str),
            path.join(process.cwd(), 'uploads', str),
            path.join(process.cwd(), 'uploads', 'proposals', str),
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

    // 2. Convert rawData to Buffer
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
        return res.status(404).json({ message: 'PDF document is empty' });
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

// Helper to parse Co-PI input array/string
const parseCoPIList = (coPiInput) => {
    if (!coPiInput) return [];
    if (Array.isArray(coPiInput)) {
        return coPiInput.map(n => String(n).trim()).filter(Boolean);
    }
    return String(coPiInput)
        .split(',')
        .map(n => n.trim())
        .filter(Boolean);
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

// ─── GET ALL PROPOSALS ─────────────────────────────────────────────────────────
export const getAllProposals = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

        // Fetch rows without heavy BLOB columns and include child Co-PIs & Releases
        const rows = await ConsultancyProposal.findAll({
            where: { Userid: userId },
            attributes: {
                exclude: ['proof', 'yearly_report', 'order_copy', 'final_report'],
            },
            include: [
                { model: ConsultancyCoPI, as: 'coPIs', attributes: ['id', 'name'] },
                { model: ConsultancyRelease, as: 'releases', attributes: ['id', 'release_date', 'amount_received', 'remarks'] },
            ],
            order: [
                ['from_date', 'DESC'],
                ['id', 'DESC'],
                [{ model: ConsultancyRelease, as: 'releases' }, 'release_date', 'ASC']
            ],
        });

        // Check which rows have files with actual non-zero content via lightweight query
        const fileFlags = await ConsultancyProposal.findAll({
            where: { Userid: userId },
            attributes: [
                'id',
                [sequelize.literal('CASE WHEN proof IS NOT NULL AND OCTET_LENGTH(proof) > 5 THEN "available" ELSE NULL END'), 'proof'],
                [sequelize.literal('CASE WHEN yearly_report IS NOT NULL AND OCTET_LENGTH(yearly_report) > 5 THEN "available" ELSE NULL END'), 'yearly_report'],
                [sequelize.literal('CASE WHEN order_copy IS NOT NULL AND OCTET_LENGTH(order_copy) > 5 THEN "available" ELSE NULL END'), 'order_copy'],
                [sequelize.literal('CASE WHEN final_report IS NOT NULL AND OCTET_LENGTH(final_report) > 5 THEN "available" ELSE NULL END'), 'final_report'],
            ],
        });

        const flagMap = {};
        fileFlags.forEach((r) => {
            const j = r.toJSON();
            flagMap[j.id] = {
                proof: j.proof,
                yearly_report: j.yearly_report,
                order_copy: j.order_copy,
                final_report: j.final_report,
            };
        });

        const result = rows.map((r) => {
            const j = r.toJSON();
            const coPiArray = Array.isArray(j.coPIs) && j.coPIs.length > 0
                ? j.coPIs.map(c => c.name)
                : (j.co_pi_names ? j.co_pi_names.split(',').map(n => n.trim()).filter(Boolean) : []);
            return {
                ...j,
                co_pi_names: coPiArray.join(', '),
                coPIList: coPiArray,
                ...(flagMap[j.id] || {}),
            };
        });

        console.log(`[getAllProposals] Returning ${result.length} proposals for userId ${userId}`);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching proposals:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── GET PROPOSAL BY ID ────────────────────────────────────────────────────────
export const getProposalById = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

        const proposal = await ConsultancyProposal.findOne({
            where: { id: req.params.id, Userid: userId },
            attributes: { exclude: ['proof', 'yearly_report', 'order_copy', 'final_report'] },
            include: [
                { model: ConsultancyCoPI, as: 'coPIs', attributes: ['id', 'name'] },
                { model: ConsultancyRelease, as: 'releases', attributes: ['id', 'release_date', 'amount_received', 'remarks'] },
            ],
            order: [
                [{ model: ConsultancyRelease, as: 'releases' }, 'release_date', 'ASC']
            ],
        });

        if (!proposal) return res.status(404).json({ message: 'Proposal not found' });

        const j = proposal.toJSON();
        const coPiArray = Array.isArray(j.coPIs) && j.coPIs.length > 0
            ? j.coPIs.map(c => c.name)
            : (j.co_pi_names ? j.co_pi_names.split(',').map(n => n.trim()).filter(Boolean) : []);

        console.log(`[getProposalById] Proposal #${req.params.id} releases count:`, j.releases ? j.releases.length : 0);
        res.status(200).json({ ...j, co_pi_names: coPiArray.join(', '), coPIList: coPiArray });
    } catch (error) {
        console.error('Error fetching proposal:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── CREATE PROPOSAL ───────────────────────────────────────────────────────────
export const createProposal = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) {
            await t.rollback();
            return res.status(401).json({ message: 'Unauthorized: userId missing' });
        }

        const {
            pi_name, co_pi_names, project_title, industry,
            from_date, to_date, amount, organization_name,
        } = req.body;

        if (!pi_name || !project_title || !industry || !from_date || !to_date || !amount || !organization_name) {
            await t.rollback();
            return res.status(400).json({ message: 'Required fields missing' });
        }

        if (new Date(to_date) <= new Date(from_date)) {
            await t.rollback();
            return res.status(400).json({ message: 'To date must be greater than from date' });
        }

        const coPiList = parseCoPIList(co_pi_names);
        const proofBuffer = req.files?.proof?.[0]?.buffer ?? null;
        const yearlyReportBuffer = req.files?.yearly_report?.[0]?.buffer ?? null;
        const orderCopyBuffer = req.files?.order_copy?.[0]?.buffer ?? null;
        const finalReportBuffer = req.files?.final_report?.[0]?.buffer ?? null;

        const newRecord = await ConsultancyProposal.create({
            Userid: userId,
            pi_name: pi_name.trim(),
            co_pi_names: coPiList.join(', '),
            project_title: project_title.trim(),
            industry: industry.trim(),
            from_date,
            to_date,
            amount: parseFloat(amount) || 0,
            organization_name: organization_name.trim(),
            proof: proofBuffer,
            yearly_report: yearlyReportBuffer,
            order_copy: orderCopyBuffer,
            final_report: finalReportBuffer,
        }, { transaction: t });

        // Save normalized Co-PI rows in consultancy_co_pis
        if (coPiList.length > 0) {
            await ConsultancyCoPI.bulkCreate(
                coPiList.map(name => ({
                    consultancy_id: newRecord.id,
                    name,
                    Userid: userId,
                })),
                { transaction: t }
            );
        }

        // Save Amount Release entries in consultancy_releases
        const releasesList = parseReleasesList(req.body.releases);
        console.log(`[createProposal] Saving ${releasesList.length} releases for new proposal ID ${newRecord.id}. Raw:`, req.body.releases);
        if (releasesList.length > 0) {
            await ConsultancyRelease.bulkCreate(
                releasesList.map(rel => ({
                    consultancy_id: newRecord.id,
                    release_date: rel.release_date,
                    amount_received: rel.amount_received,
                    remarks: rel.remarks,
                })),
                { transaction: t }
            );
        }

        await t.commit();
        res.status(201).json({
            message: 'Proposal created successfully',
            id: newRecord.id,
        });
    } catch (error) {
        await t.rollback();
        console.error('Error creating proposal:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── UPDATE PROPOSAL ───────────────────────────────────────────────────────────
export const updateProposal = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) {
            await t.rollback();
            return res.status(401).json({ message: 'Unauthorized: userId missing' });
        }

        const proposal = await ConsultancyProposal.findOne({
            where: { id: req.params.id, Userid: userId },
            transaction: t,
        });

        if (!proposal) {
            await t.rollback();
            return res.status(404).json({ message: 'Proposal not found' });
        }

        const {
            pi_name, co_pi_names, project_title, industry,
            from_date, to_date, amount, organization_name,
        } = req.body;

        if (!pi_name || !project_title || !industry || !from_date || !to_date || !amount || !organization_name) {
            await t.rollback();
            return res.status(400).json({ message: 'Required fields missing' });
        }

        if (new Date(to_date) <= new Date(from_date)) {
            await t.rollback();
            return res.status(400).json({ message: 'To date must be greater than from date' });
        }

        const coPiList = parseCoPIList(co_pi_names);

        const updateData = {
            pi_name: pi_name.trim(),
            co_pi_names: coPiList.join(', '),
            project_title: project_title.trim(),
            industry: industry.trim(),
            from_date,
            to_date,
            amount: parseFloat(amount) || 0,
            organization_name: organization_name.trim(),
        };

        if (req.files?.proof?.[0]) updateData.proof = req.files.proof[0].buffer;
        if (req.files?.yearly_report?.[0]) updateData.yearly_report = req.files.yearly_report[0].buffer;
        if (req.files?.order_copy?.[0]) updateData.order_copy = req.files.order_copy[0].buffer;
        if (req.files?.final_report?.[0]) updateData.final_report = req.files.final_report[0].buffer;

        await proposal.update(updateData, { transaction: t });

        // Refresh normalized Co-PI rows
        await ConsultancyCoPI.destroy({ where: { consultancy_id: proposal.id }, transaction: t });
        if (coPiList.length > 0) {
            await ConsultancyCoPI.bulkCreate(
                coPiList.map(name => ({
                    consultancy_id: proposal.id,
                    name,
                    Userid: userId,
                })),
                { transaction: t }
            );
        }

        // Refresh Amount Release entries
        await ConsultancyRelease.destroy({ where: { consultancy_id: proposal.id }, transaction: t });
        const releasesList = parseReleasesList(req.body.releases);
        console.log(`[updateProposal] Proposal #${proposal.id} refreshing ${releasesList.length} releases. Raw:`, req.body.releases);
        if (releasesList.length > 0) {
            await ConsultancyRelease.bulkCreate(
                releasesList.map(rel => ({
                    consultancy_id: proposal.id,
                    release_date: rel.release_date,
                    amount_received: rel.amount_received,
                    remarks: rel.remarks,
                })),
                { transaction: t }
            );
        }

        await t.commit();
        res.status(200).json({ message: 'Proposal updated successfully' });
    } catch (error) {
        await t.rollback();
        console.error('Error updating proposal:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── DELETE PROPOSAL ───────────────────────────────────────────────────────────
export const deleteProposal = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });

        const deleted = await ConsultancyProposal.destroy({
            where: { id: req.params.id, Userid: userId },
        });

        if (!deleted) return res.status(404).json({ message: 'Proposal not found' });

        res.status(200).json({ message: 'Proposal deleted successfully' });
    } catch (error) {
        console.error('Error deleting proposal:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const bulkCreateProposals = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.Userid;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const records = parseBulkRecords(req);
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: 'No valid records provided' });
        }

        const currentYear = new Date().getFullYear();
        const defaultFrom = `${currentYear}-01-01`;
        const defaultTo = `${currentYear}-12-31`;
        const t = await sequelize.transaction();
        try {
            const createdProposals = [];
            for (const rec of records) {
                const piName = String(rec.pi_name || req.user?.userName || 'Faculty').trim();
                const coPiNamesStr = rec.co_pi_names ? String(rec.co_pi_names).trim() : null;
                const coPiList = parseCoPIList(coPiNamesStr);
                const projectTitle = String(rec.project_title || rec.facility_name || rec.title || 'Consultancy Work').trim();
                const industry = String(rec.industry || 'Consultancy').trim();
                const organizationName = String(rec.organization_name || rec.client_name || rec.organization || 'Client Organization').trim();
                const fromDate = normalizeToDbDate(rec.from_date) || defaultFrom;
                const toDate = normalizeToDbDate(rec.to_date) || defaultTo;
                const amount = Number(rec.amount) || 0;

                const proposal = await ConsultancyProposal.create({
                    Userid: userId,
                    pi_name: piName,
                    co_pi_names: coPiList.join(', '),
                    project_title: projectTitle,
                    industry: industry,
                    organization_name: organizationName,
                    from_date: fromDate,
                    to_date: toDate,
                    amount: amount,
                    proof: typeof rec.proof === 'string' ? rec.proof : null,
                    yearly_report: typeof rec.yearly_report === 'string' ? rec.yearly_report : null,
                    order_copy: typeof rec.order_copy === 'string' ? rec.order_copy : null,
                    final_report: typeof rec.final_report === 'string' ? rec.final_report : null,
                }, { transaction: t });

                if (coPiList.length > 0) {
                    await ConsultancyCoPI.bulkCreate(
                        coPiList.map(name => ({
                            consultancy_id: proposal.id,
                            name,
                            Userid: userId,
                        })),
                        { transaction: t }
                    );
                }
                createdProposals.push(proposal);
            }

            await t.commit();
            res.status(201).json({
                success: true,
                message: `Successfully uploaded ${createdProposals.length} consultancy proposals`,
                data: createdProposals,
            });
        } catch (err) {
            await t.rollback();
            throw err;
        }
    } catch (error) {
        console.error('Error in bulk creating consultancy proposals:', error);
        res.status(400).json({
            message: `Failed to save bulk records: ${error.message}`,
            error: error.message,
            details: error.errors ? error.errors.map(e => e.message) : [error.message]
        });
    }
};

// ─── SERVE FILE PDFs ───────────────────────────────────────────────────────────
export const serveProof = async (req, res) => {
    try {
        const row = await ConsultancyProposal.findByPk(req.params.id, {
            attributes: ['proof'],
        });
        if (!row || !row.proof) return res.status(404).json({ message: 'Proof document not available' });
        servePDF(res, row.proof, 'proof.pdf');
    } catch (error) {
        console.error('Error serving proof:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const serveYearlyReport = async (req, res) => {
    try {
        const row = await ConsultancyProposal.findByPk(req.params.id, {
            attributes: ['yearly_report'],
        });
        if (!row || !row.yearly_report) return res.status(404).json({ message: 'Yearly report not available' });
        servePDF(res, row.yearly_report, 'yearly_report.pdf');
    } catch (error) {
        console.error('Error serving yearly report:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const serveOrderCopy = async (req, res) => {
    try {
        const row = await ConsultancyProposal.findByPk(req.params.id, {
            attributes: ['order_copy'],
        });
        if (!row || !row.order_copy) return res.status(404).json({ message: 'Order copy not available' });
        servePDF(res, row.order_copy, 'order_copy.pdf');
    } catch (error) {
        console.error('Error serving order copy:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const serveFinalReport = async (req, res) => {
    try {
        const row = await ConsultancyProposal.findByPk(req.params.id, {
            attributes: ['final_report'],
        });
        if (!row || !row.final_report) return res.status(404).json({ message: 'Final report not available' });
        servePDF(res, row.final_report, 'final_report.pdf');
    } catch (error) {
        console.error('Error serving final report:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

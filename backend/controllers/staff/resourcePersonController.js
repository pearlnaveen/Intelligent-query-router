import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';

import ResourcePerson from '../../models/staff/ResourcePerson.js';
import { sequelize } from '../../config/mysql.js';
import { parseBulkRecords } from '../../utils/bulkUploadHelper.js';
import { syncEventTypeMaster } from '../../services/masterSyncService.js';
import { normalizeToDbDate } from '../../utils/dateHelper.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helper to determine if current user has admin role
// ─────────────────────────────────────────────────────────────────────────────
const isAdminUser = (user) => {
    const roleName =
        user?.roleName ||
        user?.role ||
        user?.role_name ||
        '';

    return (
        typeof roleName === 'string' &&
        roleName.toLowerCase().includes('admin')
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Safely delete uploaded file
// ─────────────────────────────────────────────────────────────────────────────
const safeUnlink = (filename) => {
    if (!filename) return;

    const safeName = path.basename(String(filename));

    const possiblePaths = [
        path.join(
            process.cwd(),
            'backend',
            'uploads',
            'resource_person',
            safeName
        ),
        path.join(
            process.cwd(),
            'uploads',
            'resource_person',
            safeName
        ),
        path.join(
            process.cwd(),
            'uploads',
            safeName
        ),
        path.join(process.cwd(), safeName),
    ];

    for (const filePath of possiblePaths) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return;
            }
        } catch (error) {
            console.warn(
                `Unable to delete file ${safeName}:`,
                error.message
            );
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Auto-sync table columns to add from_date, to_date, participants if missing
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
    try {
        await ResourcePerson.sync({ alter: true });
        console.log(
            '✓ ResourcePerson table schema synced successfully'
        );
    } catch (syncErr) {
        console.warn(
            'ResourcePerson auto-sync warning:',
            syncErr.message
        );
    }
})();

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL RESOURCE PERSON ENTRIES
// ─────────────────────────────────────────────────────────────────────────────
export const getAllResourcePerson = async (req, res) => {
    try {
        const userId =
            req.user?.userId ||
            req.user?.Userid;

        if (!userId) {
            return res.status(401).json({
                message: 'Unauthorized: userId missing',
            });
        }

        const whereClause =
            isAdminUser(req.user) && req.query.all === 'true'
                ? {}
                : { Userid: userId };

        const rows = await ResourcePerson.findAll({
            where: whereClause,
            order: [['event_date', 'DESC'], ['id', 'DESC']],
        });

        // Convert Buffer values to strings if required
        const result = rows.map((r) => {
            const j = r.toJSON();

            const fromDateVal =
                j.from_date ||
                j.event_date;

            const toDateVal =
                j.to_date ||
                fromDateVal;

            return {
                ...j,

                from_date: fromDateVal,

                to_date: toDateVal,

                event_date: fromDateVal,

                participants:
                    j.participants !== undefined &&
                        j.participants !== null
                        ? Number(j.participants)
                        : 0,

                proof_link:
                    j.proof_link
                        ? j.proof_link.toString('utf8')
                        : null,

                photo_link:
                    j.photo_link
                        ? j.photo_link.toString('utf8')
                        : null,
            };
        });

        res.status(200).json(result);

    } catch (error) {
        console.error(
            'Error fetching resource person entries:',
            error
        );

        res.status(500).json({
            message:
                'Server error while fetching records',
            error: error.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET RESOURCE PERSON BY ID
// ─────────────────────────────────────────────────────────────────────────────
export const getResourcePersonById = async (req, res) => {
    try {
        const userId =
            req.user?.userId ||
            req.user?.Userid;

        if (!userId) {
            return res.status(401).json({
                message: 'Unauthorized: userId missing',
            });
        }

        const whereClause = isAdminUser(req.user)
            ? { id: req.params.id }
            : {
                id: req.params.id,
                Userid: userId,
            };

        const entry = await ResourcePerson.findOne({
            where: whereClause,
        });

        if (!entry) {
            return res.status(404).json({
                message:
                    'Resource person entry not found',
            });
        }

        const j = entry.toJSON();

        const fromDateVal =
            j.from_date ||
            j.event_date;

        const toDateVal =
            j.to_date ||
            fromDateVal;

        res.status(200).json({
            ...j,

            from_date: fromDateVal,

            to_date: toDateVal,

            event_date: fromDateVal,

            participants:
                j.participants !== undefined &&
                    j.participants !== null
                    ? Number(j.participants)
                    : 0,

            proof_link:
                j.proof_link
                    ? j.proof_link.toString('utf8')
                    : null,

            photo_link:
                j.photo_link
                    ? j.photo_link.toString('utf8')
                    : null,
        });

    } catch (error) {
        console.error(
            'Error fetching resource person entry:',
            error
        );

        res.status(500).json({
            message:
                'Server error while fetching record',
            error: error.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE RESOURCE PERSON
// ─────────────────────────────────────────────────────────────────────────────
export const createResourcePerson = async (req, res) => {
    try {
        const userId =
            req.user?.userId ||
            req.user?.Userid;

        if (!userId) {
            return res.status(401).json({
                message:
                    'Unauthorized: userId missing',
            });
        }

        const {
            program_specification,
            title,
            venue,
            from_date,
            to_date,
            event_date,
            participants,
        } = req.body;

        const effectiveFromDate =
            from_date ||
            event_date;

        const effectiveToDate =
            to_date ||
            effectiveFromDate;

        const normalizedFromDate =
            normalizeToDbDate(effectiveFromDate);

        const normalizedToDate =
            normalizeToDbDate(effectiveToDate);

        if (
            !normalizedFromDate ||
            !normalizedToDate
        ) {
            if (req.files?.proofFile?.[0]) {
                safeUnlink(
                    req.files.proofFile[0].filename
                );
            }

            if (req.files?.photoFile?.[0]) {
                safeUnlink(
                    req.files.photoFile[0].filename
                );
            }

            return res.status(400).json({
                message:
                    'Invalid date format. Please enter a valid date.',
            });
        }

        const parsedParticipants =
            participants !== undefined &&
                participants !== null &&
                participants !== ''
                ? Number(participants)
                : 0;

        if (
            !program_specification ||
            !title ||
            !venue ||
            !effectiveFromDate ||
            !effectiveToDate
        ) {
            if (req.files?.proofFile?.[0]) {
                safeUnlink(
                    req.files.proofFile[0].filename
                );
            }

            if (req.files?.photoFile?.[0]) {
                safeUnlink(
                    req.files.photoFile[0].filename
                );
            }

            return res.status(400).json({
                message:
                    'Required fields missing: Program Specification, Title, Venue, From Date, and To Date are required',
            });
        }

        const proof_link =
            req.files?.proofFile?.[0]?.filename ||
            req.files?.proof_link?.[0]?.filename ||
            null;

        const photo_link =
            req.files?.photoFile?.[0]?.filename ||
            req.files?.photo_link?.[0]?.filename ||
            null;

        const newRecord =
            await ResourcePerson.create({
                Userid: userId,

                program_specification:
                    String(
                        program_specification
                    ).trim(),

                title:
                    String(title).trim(),

                venue:
                    String(venue).trim(),

                from_date:
                    normalizedFromDate,

                to_date:
                    normalizedToDate,

                event_date:
                    normalizedFromDate,

                participants:
                    Number.isFinite(
                        parsedParticipants
                    )
                        ? parsedParticipants
                        : 0,

                proof_link,

                photo_link,
            });

        res.status(201).json({
            message:
                'Resource person entry created successfully',

            id: newRecord.id,

            data: newRecord,
        });

    } catch (error) {
        console.error(
            'Error creating resource person entry:',
            error
        );

        res.status(500).json({
            message:
                'Server error while creating record',
            error: error.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE RESOURCE PERSON
// ─────────────────────────────────────────────────────────────────────────────
export const updateResourcePerson = async (req, res) => {
    try {
        const userId =
            req.user?.userId ||
            req.user?.Userid;

        if (!userId) {
            return res.status(401).json({
                message:
                    'Unauthorized: userId missing',
            });
        }

        const whereClause = isAdminUser(req.user)
            ? { id: req.params.id }
            : {
                id: req.params.id,
                Userid: userId,
            };

        const entry =
            await ResourcePerson.findOne({
                where: whereClause,
            });

        if (!entry) {
            return res.status(404).json({
                message:
                    'Resource person entry not found',
            });
        }

        const {
            program_specification,
            title,
            venue,
            from_date,
            to_date,
            event_date,
            participants,
        } = req.body;

        const effectiveFromDate =
            from_date ||
            event_date ||
            entry.from_date ||
            entry.event_date;

        const effectiveToDate =
            to_date ||
            effectiveFromDate ||
            entry.to_date;

        const parsedParticipants =
            participants !== undefined &&
                participants !== null &&
                participants !== ''
                ? Number(participants)
                : Number(entry.participants || 0);

        if (
            !program_specification ||
            !title ||
            !venue ||
            !effectiveFromDate ||
            !effectiveToDate
        ) {
            if (req.files?.proofFile?.[0]) {
                safeUnlink(
                    req.files.proofFile[0].filename
                );
            }

            if (req.files?.photoFile?.[0]) {
                safeUnlink(
                    req.files.photoFile[0].filename
                );
            }

            return res.status(400).json({
                message:
                    'Required fields missing',
            });
        }

        let proof_link =
            entry.proof_link;

        let photo_link =
            entry.photo_link;

        // Update proof file if a new one was uploaded
        if (
            req.files?.proofFile?.[0]?.filename
        ) {
            proof_link =
                req.files.proofFile[0].filename;

        } else if (
            req.files?.proof_link?.[0]?.filename
        ) {
            proof_link =
                req.files.proof_link[0].filename;
        }

        // Update photo file if a new one was uploaded
        if (
            req.files?.photoFile?.[0]?.filename
        ) {
            photo_link =
                req.files.photoFile[0].filename;

        } else if (
            req.files?.photo_link?.[0]?.filename
        ) {
            photo_link =
                req.files.photo_link[0].filename;
        }

        const updateData = {
            program_specification:
                (
                    program_specification ||
                    entry.program_specification ||
                    ''
                ).trim(),

            title:
                (
                    title ||
                    entry.title ||
                    ''
                ).trim(),

            venue:
                (
                    venue ||
                    entry.venue ||
                    ''
                ).trim(),

            from_date:
                effectiveFromDate,

            to_date:
                effectiveToDate,

            event_date:
                effectiveFromDate,

            participants:
                Number.isFinite(
                    parsedParticipants
                )
                    ? parsedParticipants
                    : 0,

            proof_link,

            photo_link,
        };

        await entry.update(updateData);

        res.status(200).json({
            message:
                'Resource person entry updated successfully',

            data: entry,
        });

    } catch (error) {
        console.error(
            'Error updating resource person entry:',
            error
        );

        res.status(500).json({
            message:
                'Server error while updating record',
            error: error.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE RESOURCE PERSON
// ─────────────────────────────────────────────────────────────────────────────
export const deleteResourcePerson = async (req, res) => {
    try {
        const userId =
            req.user?.userId ||
            req.user?.Userid;

        if (!userId) {
            return res.status(401).json({
                message:
                    'Unauthorized: userId missing',
            });
        }

        const whereClause = isAdminUser(req.user)
            ? { id: req.params.id }
            : {
                id: req.params.id,
                Userid: userId,
            };

        const entry =
            await ResourcePerson.findOne({
                where: whereClause,
            });

        if (!entry) {
            return res.status(404).json({
                message:
                    'Resource person entry not found',
            });
        }

        const uploadsDir = path.resolve(
            process.cwd(),
            'backend/uploads/resource_person'
        );

        const altDir = path.resolve(
            process.cwd(),
            'uploads/resource_person'
        );

        [
            entry.proof_link,
            entry.photo_link,
        ].forEach((filename) => {
            if (!filename) return;

            const safeName =
                path.basename(
                    String(filename)
                );

            [
                path.join(
                    uploadsDir,
                    safeName
                ),

                path.join(
                    altDir,
                    safeName
                ),
            ].forEach((filePath) => {
                try {
                    if (
                        fs.existsSync(
                            filePath
                        )
                    ) {
                        fs.unlinkSync(
                            filePath
                        );
                    }
                } catch (err) {
                    console.warn(
                        'Unable to delete file:',
                        err.message
                    );
                }
            });
        });

        await entry.destroy();

        res.status(200).json({
            message:
                'Resource person entry deleted successfully',
        });

    } catch (error) {
        console.error(
            'Error deleting resource person entry:',
            error
        );

        res.status(500).json({
            message:
                'Server error while deleting record',
            error: error.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// BULK CREATE RESOURCE PERSON
// ─────────────────────────────────────────────────────────────────────────────
export const bulkCreateResourcePerson = async (req, res) => {
    const transaction =
        await sequelize.transaction();

    try {
        const userId =
            req.user?.userId ||
            req.user?.Userid;

        if (!userId) {
            await transaction.rollback();

            return res.status(401).json({
                message: 'Unauthorized',
            });
        }

        const rows =
            parseBulkRecords(req);

        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {
            await transaction.rollback();

            return res.status(400).json({
                message:
                    'No records provided for bulk insert',
            });
        }

        // Sync event/program specification master values
        const uniqueTypes = [
            ...new Set(
                rows
                    .map((r) =>
                        (
                            r.program_specification ||
                            r.programSpecification ||
                            ''
                        ).trim()
                    )
                    .filter(Boolean)
            ),
        ];
        for (
            const typeName
            of uniqueTypes
        ) {
            await syncEventTypeMaster(
                typeName
            );
        }

        const recordsToInsert =
            rows.map((r) => {
                const spec =
                    (
                        r.program_specification ||
                        r['Program Specification'] ||
                        r.programSpecification ||
                        r.program_spec ||
                        'Guest Lecture'
                    ).trim();

                const title =
                    (
                        r.title ||
                        r.Title ||
                        r.event_title ||
                        r.eventTitle ||
                        'Session Talk'
                    ).trim();

                const venue =
                    (
                        r.venue ||
                        r.Venue ||
                        r.event_venue ||
                        'Institution'
                    ).trim();

                const rawFromDate =
                    r.from_date ||
                    r.fromDate ||
                    r.event_date ||
                    r['Event Date'] ||
                    r.eventDate ||
                    r.date;

                const fromDateVal =
                    normalizeToDbDate(rawFromDate) ||
                    (rawFromDate
                        ? String(rawFromDate)
                        : new Date()
                            .toISOString()
                            .split('T')[0]);

                const rawToDate =
                    r.to_date ||
                    r.toDate;

                const toDateVal =
                    normalizeToDbDate(rawToDate) ||
                    fromDateVal;

                const numParticipants =
                    r.participants ||
                    r.number_of_participants ||
                    r.numberOfParticipants ||
                    0;

                const proofLink =
                    r.proof_link ||
                    r['Proof Link'] ||
                    r.proofLink ||
                    null;

                const photoLink =
                    r.photo_link ||
                    r['Photo Link'] ||
                    r.photoLink ||
                    null;

                return {
                    Userid: userId,

                    program_specification:
                        spec,

                    title,

                    venue,

                    from_date:
                        fromDateVal,

                    to_date:
                        toDateVal,

                    event_date:
                        fromDateVal,

                    participants:
                        Number(numParticipants) ||
                        0,

                    proof_link:
                        proofLink
                            ? String(
                                proofLink
                            ).trim()
                            : null,

                    photo_link:
                        photoLink
                            ? String(
                                photoLink
                            ).trim()
                            : null,
                };
            });

        const created =
            await ResourcePerson.bulkCreate(
                recordsToInsert,
                {
                    transaction,
                }
            );

        await transaction.commit();

        res.status(201).json({
            success: true,

            message:
                `Successfully imported ${created.length} resource person records`,

            count:
                created.length,

            data:
                created,
        });

    } catch (error) {
        await transaction.rollback();

        console.error(
            'Error bulk creating resource person records:',
            error
        );

        res.status(400).json({
            message:
                `Failed to save bulk records: ${error.message}`,
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: RESOLVE RESOURCE PERSON FILE PATH
// ─────────────────────────────────────────────────────────────────────────────
const findFilePath = (filename) => {
    const filenameStr =
        path.basename(
            String(filename).trim()
        );

    const possiblePaths = [
        path.join(
            process.cwd(),
            'backend',
            'uploads',
            'resource_person',
            filenameStr
        ),

        path.join(
            process.cwd(),
            'uploads',
            'resource_person',
            filenameStr
        ),

        path.join(
            process.cwd(),
            'uploads',
            filenameStr
        ),

        path.join(
            process.cwd(),
            filenameStr
        ),
    ];

    for (
        const filePath
        of possiblePaths
    ) {
        try {
            if (
                fs.existsSync(filePath) &&
                fs.statSync(filePath).isFile()
            ) {
                return filePath;
            }
        } catch (error) {
            // Ignore invalid file path
        }
    }

    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// VIEW FILE
// ─────────────────────────────────────────────────────────────────────────────
export const viewFile = async (req, res) => {
    try {
        const userId =
            req.user?.userId ||
            req.user?.Userid;

        if (!userId) {
            return res.status(401).json({
                message: 'Unauthorized',
            });
        }

        const rawFilename =
            req.params.filename
                ? decodeURIComponent(
                    req.params.filename
                )
                : '';

        const filename =
            path.basename(
                rawFilename
            );

        if (!filename) {
            return res.status(400).json({
                message:
                    'Filename is required',
            });
        }

        // Security check: verify record ownership
        const whereClause =
            isAdminUser(req.user)
                ? {
                    [Op.or]: [
                        {
                            proof_link:
                                filename,
                        },
                        {
                            photo_link:
                                filename,
                        },
                    ],
                }
                : {
                    Userid: userId,

                    [Op.or]: [
                        {
                            proof_link:
                                filename,
                        },
                        {
                            photo_link:
                                filename,
                        },
                    ],
                };

        const entry =
            await ResourcePerson.findOne({
                where: whereClause,
            });

        if (!entry) {
            return res.status(403).json({
                message:
                    'Access denied: File not found or does not belong to you',
            });
        }

        const filePath =
            findFilePath(filename);

        if (!filePath) {
            return res.status(404).json({
                message:
                    'File not found on server',
            });
        }

        const ext =
            path.extname(
                filename
            ).toLowerCase();

        let mimeType =
            'application/pdf';

        if (
            ['.jpg', '.jpeg']
                .includes(ext)
        ) {
            mimeType =
                'image/jpeg';

        } else if (
            ext === '.png'
        ) {
            mimeType =
                'image/png';

        } else if (
            ext === '.gif'
        ) {
            mimeType =
                'image/gif';

        } else if (
            ext === '.webp'
        ) {
            mimeType =
                'image/webp';
        }

        res.setHeader(
            'Content-Type',
            mimeType
        );

        res.setHeader(
            'Content-Disposition',
            `inline; filename="${filename}"`
        );

        res.setHeader(
            'Cache-Control',
            'no-cache'
        );

        res.sendFile(filePath);

    } catch (error) {
        console.error(
            'Error viewing resource person file:',
            error
        );

        res.status(500).json({
            message:
                'Server error while loading file',
            error: error.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD FILE
// ─────────────────────────────────────────────────────────────────────────────
export const downloadFile = async (req, res) => {
    try {
        const userId =
            req.user?.userId ||
            req.user?.Userid;

        if (!userId) {
            return res.status(401).json({
                message: 'Unauthorized',
            });
        }

        const rawFilename =
            req.params.filename
                ? decodeURIComponent(
                    req.params.filename
                )
                : '';

        const filename =
            path.basename(
                rawFilename
            );

        if (!filename) {
            return res.status(400).json({
                message:
                    'Filename is required',
            });
        }

        // Security check: verify record ownership
        const whereClause =
            isAdminUser(req.user)
                ? {
                    [Op.or]: [
                        {
                            proof_link:
                                filename,
                        },
                        {
                            photo_link:
                                filename,
                        },
                    ],
                }
                : {
                    Userid: userId,

                    [Op.or]: [
                        {
                            proof_link:
                                filename,
                        },
                        {
                            photo_link:
                                filename,
                        },
                    ],
                };

        const entry =
            await ResourcePerson.findOne({
                where: whereClause,
            });

        if (!entry) {
            return res.status(403).json({
                message:
                    'Access denied: File not found or does not belong to you',
            });
        }

        const filePath =
            findFilePath(filename);

        if (!filePath) {
            return res.status(404).json({
                message:
                    'File not found on server',
            });
        }

        res.download(
            filePath,
            filename
        );

    } catch (error) {
        console.error(
            'Error downloading resource person file:',
            error
        );

        res.status(500).json({
            message:
                'Server error while downloading file',
            error: error.message,
        });
    }
};
import express from 'express';
import { sequelize } from '../config/mysql.js';
import ExcelJS from 'exceljs';
import { authenticate as authenticateToken } from '../middlewares/requireauth.js';

const router = express.Router();

// Middleware to attach req.user if bearer token or cookie present
const attachUserIfAuth = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => next());
  } catch (err) {
    next();
  }
};

// Helper function to enforce department isolation for Department Admins
const resolveAuthorizedDepartment = (req, requestedDept) => {
  if (!req.user) return requestedDept;

  const roleName = (req.user.roleName || req.user.role || '').toLowerCase();
  const isSuperAdmin = roleName === 'superadmin' || roleName === 'admin';

  if (isSuperAdmin) {
    return requestedDept;
  }

  // Dept Admin: enforce mapped department ID or acronym
  const userDept = req.user.departmentId || req.user.departmentAcr || req.user.departmentName;
  if (userDept) {
    return String(userDept);
  }

  return requestedDept;
};

// Helper function to build valid, error-free SQL queries across users, staff_details, and departments
const makeJoinQuery = (tableName, alias, userKey = 'Userid') => `
  SELECT ${alias}.*, 
    COALESCE(NULLIF(TRIM(CONCAT(COALESCE(sd.firstName, ''), ' ', COALESCE(sd.lastName, ''))), ''), NULLIF(u.userName, ''), 'Unknown Staff') AS staff_name, 
    COALESCE(NULLIF(sd.staffNumber, ''), NULLIF(u.userNumber, ''), CAST(u.userId AS CHAR), 'N/A') AS staff_id, 
    COALESCE(NULLIF(d.departmentAcr, ''), NULLIF(d.departmentName, ''), CAST(u.departmentId AS CHAR), 'N/A') AS department 
  FROM ${tableName} ${alias} 
  LEFT JOIN users u ON (${alias}.${userKey} = u.userId OR ${alias}.${userKey} = u.userNumber) 
  LEFT JOIN departments d ON u.departmentId = d.departmentId 
  LEFT JOIN staff_details sd ON (u.userId = sd.Userid OR u.userNumber = sd.staffNumber) 
  LEFT JOIN roles r ON u.roleId = r.roleId
  WHERE (r.roleName IS NULL OR LOWER(r.roleName) != 'student')
`;

// Activity mappings with their table names, specific columns, and date fields (following Staff Login display sequence)
const activityMappings = {
  Consultancy: {
    table: 'consultancy_proposals',
    alias: 'cp',
    dateColumn: 'from_date',
    columns: [
      'project_title',
      'industry',
      'organization_name',
      'pi_name',
      'co_pi_names',
      'from_date',
      'to_date',
      'duration',
      'amount',
      'amount_received_indicator',
      'amount_received',
      'amount_release_details',
      'proof',
      'order_copy',
      'yearly_report',
      'final_report',
    ],
    joinQuery: makeJoinQuery('consultancy_proposals', 'cp', 'Userid'),
  },
  Scholars: {
    table: 'scholars',
    alias: 's',
    dateColumn: 'created_at',
    columns: [
      'scholar_name',
      'scholar_type',
      'title',
      'domain',
      'institute',
      'university',
      'phd_registered_month',
      'phd_registered_year',
      'completed_month',
      'completed_year',
      'status',
      'publications',
    ],
    joinQuery: makeJoinQuery('scholars', 's', 'Userid'),
  },
  'Funded Project': {
    table: 'project_proposals',
    alias: 'pp',
    dateColumn: 'from_date',
    columns: [
      'project_title',
      'funding_agency',
      'organization_name',
      'pi_name',
      'co_pi_names',
      'students_involved',
      'student_details',
      'from_date',
      'to_date',
      'duration',
      'amount',
      'amount_received_indicator',
      'amount_received',
      'amount_release_details',
      'proof',
      'yearly_report',
      'final_report',
    ],
    joinQuery: makeJoinQuery('project_proposals', 'pp', 'Userid'),
  },
  'Seed Money': {
    table: 'seed_money',
    alias: 'sm',
    dateColumn: 'created_at',
    columns: [
      'project_title',
      'from_date',
      'to_date',
      'project_duration',
      'amount',
      'outcomes',
      'proof_link',
    ],
    joinQuery: makeJoinQuery('seed_money', 'sm', 'Userid'),
  },
  'Events Attended': {
    table: 'events_attended',
    fallbackTables: ['staff_events_attended'],
    alias: 'ea',
    dateColumn: 'from_date',
    columns: [
      'programme_name',
      'title',
      'organized_by',
      'venue',
      'mode',
      'from_date',
      'to_date',
      'duration',
      'participants',
      'financial_support',
      'support_amount',
      'permission_letter_link',
      'certificate_link',
      'financial_proof_link',
      'programme_report_link',
      'status',
    ],
    joinQuery: makeJoinQuery('events_attended', 'ea', 'Userid'),
  },
  'Industry Knowhow': {
    table: 'industry_knowhow',
    alias: 'ik',
    dateColumn: 'from_date',
    columns: [
      'internship_name',
      'title',
      'company',
      'venue',
      'from_date',
      'to_date',
      'duration',
      'participants',
      'outcomes',
      'financial_support',
      'support_amount',
      'certificate_link',
      'certificate_pdf',
    ],
    joinQuery: makeJoinQuery('industry_knowhow', 'ik', 'Userid'),
  },
  'Certification Courses': {
    table: 'staff_certification_courses',
    alias: 'cc',
    dateColumn: 'from_date',
    columns: [
      'course_name',
      'offered_by',
      'from_date',
      'to_date',
      'certification_date',
      'hours',
      'days',
      'weeks',
      'status',
      'certificate_pdf',
    ],
    joinQuery: makeJoinQuery('staff_certification_courses', 'cc', 'Userid'),
  },
  Publications: {
    table: 'book_chapters',
    alias: 'bc',
    dateColumn: 'publication_date',
    columns: [
      'publication_type',
      'publication_title',
      'publication_name',
      'authors_list',
      'publisher',
      'index_type',
      'impact_factor',
      'doi',
      'volume_no',
      'issue_no',
      'page_no',
      'citations',
      'published_month',
      'published_year',
      'publication_date',
      'publication_link',
    ],
    joinQuery: makeJoinQuery('book_chapters', 'bc', 'Userid'),
  },
  'Conference Details': {
    table: 'conference_details',
    alias: 'cd',
    dateColumn: 'created_at',
    columns: [
      'title_of_paper',
      'conference_name',
      'conference_type',
      'authors_list',
      'venue',
      'from_date',
      'to_date',
      'indexing',
      'doi',
      'page_no',
      'citations_count',
      'month_year',
      'status',
      'certificate_link',
    ],
    joinQuery: makeJoinQuery('conference_details', 'cd', 'Userid'),
  },
  'Events Organized': {
    table: 'events_organized',
    fallbackTables: ['staff_events_organized'],
    alias: 'eo',
    dateColumn: 'from_date',
    columns: [
      'program_name',
      'program_title',
      'coordinator_name',
      'co_coordinator_names',
      'speaker_details',
      'from_date',
      'to_date',
      'days',
      'participants',
      'funding_type',
      'funding_agency',
      'sponsored_by',
      'amount_sanctioned',
      'amount_received',
      'documentation',
      'document_link',
      'proof',
    ],
    joinQuery: makeJoinQuery('events_organized', 'eo', 'Userid'),
  },
  'H-Index': {
    table: 'h_index',
    alias: 'hi',
    dateColumn: 'created_at',
    columns: [
      'citations',
      'h_index',
      'i_index',
      'google_citations',
      'scopus_citations',
    ],
    joinQuery: makeJoinQuery('h_index', 'hi', 'Userid'),
  },
  'Resource Person': {
    table: 'resource_person',
    alias: 'rp',
    dateColumn: 'event_date',
    columns: [
      'id',
      'program_specification',
      'title',
      'venue',
      'from_date',
      'to_date',
      'participants',
      'event_date',
      'photo_link',
      'proof_link',
      'created_at',
    ],
    joinQuery: makeJoinQuery('resource_person', 'rp', 'Userid'),
  },
  Recognition: {
    table: 'recognition_appreciation',
    alias: 'ra',
    dateColumn: 'recognition_date',
    columns: [
      'category',
      'program_name',
      'recognition_date',
      'proof_link',
    ],
    joinQuery: makeJoinQuery('recognition_appreciation', 'ra', 'Userid'),
  },
  Membership: {
    table: 'memberships',
    alias: 'm',
    dateColumn: 'created_at',
    columns: [
      'society_name',
      'membership_number',
      'position_grade',
      'contributions',
      'proof_document',
    ],
    joinQuery: makeJoinQuery('memberships', 'm', 'Userid'),
  },
  'Patent/Product Development': {
    table: 'patent_product',
    fallbackTables: ['patent_products'],
    alias: 'pat',
    dateColumn: 'created_at',
    columns: [
      'project_title',
      'inventors_list',
      'patent_status',
      'month_year',
      'working_model',
      'working_model_proof_link',
      'prototype_developed',
      'prototype_proof_link',
      'patent_proof_link',
    ],
    joinQuery: makeJoinQuery('patent_product', 'pat', 'Userid'),
  },
  'Project Mentors': {
    table: 'project_mentors',
    alias: 'pm',
    dateColumn: 'created_at',
    columns: [
      'project_title',
      'event_details',
      'students_involved',
      'student_details',
      'participation_status',
      'certificate_link',
      'proof_link',
    ],
    joinQuery: makeJoinQuery('project_mentors', 'pm', 'Userid'),
  },
  Education: {
    table: 'education',
    alias: 'e',
    dateColumn: 'created_at',
    columns: [
      'tenth_institution',
      'tenth_university',
      'tenth_year',
      'tenth_cgpa_percentage',
      'twelfth_institution',
      'twelfth_university',
      'twelfth_year',
      'twelfth_cgpa_percentage',
      'ug_degree',
      'ug_specialization',
      'ug_institution',
      'ug_university',
      'ug_year',
      'ug_cgpa_percentage',
      'pg_degree',
      'pg_specialization',
      'pg_institution',
      'pg_university',
      'pg_year',
      'pg_cgpa_percentage',
      'mphil_degree',
      'mphil_specialization',
      'mphil_institution',
      'mphil_university',
      'mphil_year',
      'mphil_cgpa_percentage',
      'phd_title',
      'phd_college',
      'phd_university',
      'phd_guide_name',
      'phd_status',
      'phd_registration_year',
      'phd_completion_year',
    ],
    joinQuery: makeJoinQuery('education', 'e', 'Userid'),
  },
  'Personal Information': {
    table: 'personal_information',
    alias: 'pi',
    userKey: 'user_id',
    dateColumn: 'createdAt',
    columns: [
      'full_name',
      'date_of_birth',
      'gender',
      'mobile_number',
      'email',
      'officialEmail',
      'personalEmail',
      'communication_address',
      'permanent_address',
      'religion',
      'community',
      'caste',
      'post',
      'hasFellowship',
      'fellowshipName',
      'fellowshipAgency',
      'fellowshipAmount',
      'fellowshipDuration',
      'fellowshipDetails',
    ],
    joinQuery: makeJoinQuery('personal_information', 'pi', 'user_id'),
  },
  MOU: {
    table: 'mou',
    fallbackTables: ['staff_mous', 'mou_activities'],
    alias: 'm',
    dateColumn: 'signed_on',
    columns: [
      'company_name',
      'signed_on',
      'multidisciplinary',
      'coordinators_str',
      'departments_str',
      'mou_activities',
      'mou_copy_link',
    ],
    joinQuery: makeJoinQuery('mou', 'm', 'Userid'),
  },
  'TLP Management': {
    table: 'tlp_activities',
    alias: 'ta',
    userKey: 'userid',
    dateColumn: 'created_at',
    columns: [
      'course_code_and_name',
      'activity_name',
      'description',
      'status',
      'image_file',
    ],
    joinQuery: makeJoinQuery('tlp_activities', 'ta', 'userid'),
  },
  'Club Activity': {
    table: 'activities',
    alias: 'act',
    userKey: 'userid',
    dateColumn: 'created_at',
    columns: [
      'club_name',
      'event_name',
      'description',
      'venue',
      'level',
      'from_date',
      'to_date',
      'student_coordinators',
      'staff_coordinators',
      'participant_count',
      'funded',
      'funding_agency',
      'fund_received',
      'report_file',
    ],
    joinQuery: makeJoinQuery('activities', 'act', 'userid'),
  },
};

router.get('/admin-panel/departments', async (req, res) => {
  try {
    const departments = await sequelize.query('SELECT * FROM departments ORDER BY departmentName', {
      type: sequelize.QueryTypes.SELECT,
    });
    res.json(departments || []);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Helper to count records for a staff member across table & column fallbacks
const countActivityForStaff = async (mapping, staff) => {
  const tables = [mapping.table, ...(mapping.fallbackTables || [])];
  const uniqueTables = [...new Set(tables)];
  const targetUserId = staff.Userid;
  const targetStaffId = staff.staffId || staff.Userid;
  const colNames = [mapping.userKey, 'Userid', 'userid', 'user_id', 'Created_by'].filter(Boolean);
  const uniqueCols = [...new Set(colNames)];

  for (const table of uniqueTables) {
    for (const col of uniqueCols) {
      try {
        const rows = await sequelize.query(
          `SELECT COUNT(*) as count FROM \`${table}\` WHERE (\`${col}\` = ? OR \`${col}\` = ? OR CAST(\`${col}\` AS CHAR) = ?)`,
          {
            replacements: [targetUserId, targetStaffId, String(targetStaffId)],
            type: sequelize.QueryTypes.SELECT,
          }
        );
        const count = Number(rows?.[0]?.count || rows?.[0]?.['COUNT(*)'] || 0);
        if (count > 0) return count;
      } catch (err) {
        // Ignore missing table/column errors
      }
    }
  }
  return 0;
};

// Helper to fetch all records for a staff member across table & column fallbacks
const fetchActivityRowsForStaff = async (mapping, staff, fromDate, toDate) => {
  const tables = [mapping.table, ...(mapping.fallbackTables || [])];
  const uniqueTables = [...new Set(tables)];
  const targetUserId = staff.Userid;
  const targetStaffId = staff.staffId || staff.Userid;
  const colNames = [mapping.userKey, 'Userid', 'userid', 'user_id', 'Created_by'].filter(Boolean);
  const uniqueCols = [...new Set(colNames)];

  let allRows = [];
  let matchedTable = mapping.table;

  for (const table of uniqueTables) {
    for (const col of uniqueCols) {
      try {
        const queryParams = [targetUserId, targetStaffId || targetUserId, targetUserId, targetStaffId, String(targetStaffId)];
        let query = `
          SELECT t.*, 
            COALESCE(NULLIF(TRIM(CONCAT(COALESCE(sd.firstName, ''), ' ', COALESCE(sd.lastName, ''))), ''), NULLIF(u.userName, ''), 'Unknown Staff') AS staff_name, 
            COALESCE(NULLIF(sd.staffNumber, ''), NULLIF(u.userNumber, ''), CAST(u.userId AS CHAR), 'N/A') AS staff_id, 
            COALESCE(NULLIF(d.departmentAcr, ''), NULLIF(d.departmentName, ''), CAST(u.departmentId AS CHAR), 'N/A') AS department 
          FROM \`${table}\` t 
          LEFT JOIN users u ON (u.userId = ? OR u.userNumber = ?) 
          LEFT JOIN departments d ON u.departmentId = d.departmentId
          LEFT JOIN staff_details sd ON (u.userId = sd.Userid OR u.userNumber = sd.staffNumber)
          LEFT JOIN roles r ON u.roleId = r.roleId
          WHERE (t.\`${col}\` = ? OR t.\`${col}\` = ? OR CAST(t.\`${col}\` AS CHAR) = ?) 
            AND (r.roleName IS NULL OR LOWER(r.roleName) != 'student')
        `;

        const dateCol = mapping.dateColumn;
        if (dateCol && fromDate && fromDate.trim() !== '') {
          query += ` AND DATE(t.${dateCol}) >= ?`;
          queryParams.push(fromDate.trim());
        }
        if (dateCol && toDate && toDate.trim() !== '') {
          query += ` AND DATE(t.${dateCol}) <= ?`;
          queryParams.push(toDate.trim());
        }

        query += ` ORDER BY t.id DESC`;

        const rows = await sequelize.query(query, {
          replacements: queryParams,
          type: sequelize.QueryTypes.SELECT,
        });

        if (rows && rows.length > 0) {
          allRows = [...allRows, ...rows];
          matchedTable = table;
          break;
        }
      } catch (err) {
        // Ignore missing table/column errors
      }
    }
  }
  return { rows: allRows, table: matchedTable };
};

// Get staff data with their activities
router.get('/admin-panel/staff-with-activities', attachUserIfAuth, async (req, res) => {
  try {
    const rawDept = req.query.departmentId;
    const activeDept = resolveAuthorizedDepartment(req, rawDept);

    let query = `
      SELECT u.userId as Userid, u.userName as username, u.userMail as email, u.userNumber as staffId, u.departmentId as Deptid, u.profileImage as image, COALESCE(d.departmentAcr, u.departmentId, 'Staff') as department
      FROM users u 
      LEFT JOIN departments d ON u.departmentId = d.departmentId
      LEFT JOIN roles r ON u.roleId = r.roleId
      WHERE (r.roleName IS NULL OR LOWER(r.roleName) != 'student')
    `;
    const replacements = [];
    if (activeDept && activeDept !== 'null' && activeDept !== '') {
      query += ` AND (u.departmentId = ? OR d.departmentAcr = ? OR d.departmentName LIKE ?)`;
      replacements.push(activeDept, activeDept, `%${activeDept}%`);
    }
    query += ` ORDER BY u.userName`;

    const staffMembers = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    console.log(`Found ${staffMembers?.length || 0} staff members`);

    const staffArray = Array.isArray(staffMembers) ? staffMembers : [];

    const staffWithActivities = await Promise.all(
      staffArray.map(async (staff) => {
        const activities = [];

        for (const [activityName, mapping] of Object.entries(activityMappings)) {
          try {
            const count = await countActivityForStaff(mapping, staff);
            if (count > 0) {
              activities.push(activityName);
            }
          } catch (activityError) {
            // Safe handling
          }
        }

        return {
          ...staff,
          activities,
        };
      })
    );

    console.log(`Processed ${staffWithActivities.length} staff members with activities`);
    res.json(staffWithActivities);
  } catch (error) {
    console.error('Error fetching staff with activities:', error);
    res.status(500).json({ error: 'Failed to fetch staff data' });
  }
});

// Get ALL activity records for a specific staff member across all activity tables
router.get('/admin-panel/staff-all-activities-detail', attachUserIfAuth, async (req, res) => {
  try {
    const { userId, staffId, staffName, fromDate, toDate } = req.query;
    const activeDept = resolveAuthorizedDepartment(req, req.query.departmentId);

    if (!userId && !staffId && !staffName) {
      return res.status(400).json({ error: 'Missing staff identification parameter (userId, staffId, or staffName)' });
    }

    // 1. Fetch staff member info
    let staffQuery = `
      SELECT u.userId as Userid, u.userName as username, u.userMail as email, u.userNumber as staffId, u.departmentId as Deptid, u.profileImage as image, COALESCE(d.departmentAcr, u.departmentId, 'N/A') as department
      FROM users u 
      LEFT JOIN departments d ON u.departmentId = d.departmentId
      LEFT JOIN roles r ON u.roleId = r.roleId
      WHERE (r.roleName IS NULL OR LOWER(r.roleName) != 'student')
    `;
    const staffParams = [];
    if (userId && userId !== 'null' && userId !== '') {
      staffQuery += ` AND (u.userId = ? OR u.userNumber = ?)`;
      staffParams.push(userId, userId);
    } else if (staffId && staffId.trim() !== '') {
      staffQuery += ` AND (u.userNumber = ? OR u.userId = ?)`;
      staffParams.push(staffId.trim(), staffId.trim());
    } else if (staffName && staffName.trim() !== '') {
      staffQuery += ` AND (u.userName LIKE ? OR u.userNumber LIKE ? OR CAST(u.userId AS CHAR) = ?)`;
      staffParams.push(`%${staffName.trim()}%`, `%${staffName.trim()}%`, staffName.trim());
    }

    if (activeDept && activeDept !== 'null' && activeDept !== '') {
      staffQuery += ` AND (u.departmentId = ? OR d.departmentAcr = ? OR d.departmentName LIKE ?)`;
      staffParams.push(activeDept, activeDept, `%${activeDept}%`);
    }

    const staffRows = await sequelize.query(staffQuery, {
      replacements: staffParams,
      type: sequelize.QueryTypes.SELECT,
    });

    if (!staffRows || staffRows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found or access denied for selected department' });
    }

    const staff = staffRows[0];

    // 2. Query each activity table for ALL records belonging to this staff member
    const activitiesData = {};
    let totalRecords = 0;

    for (const [activityName, mapping] of Object.entries(activityMappings)) {
      try {
        let { rows, table } = await fetchActivityRowsForStaff(mapping, staff, fromDate, toDate);

        if (rows && rows.length > 0) {
          rows = await attachChildRecordsToRows(table, rows);
          const baseColumns = Array.isArray(mapping.columns) ? mapping.columns : [];
          const rowKeys = Object.keys(rows[0]);
          const excludeCols = [
            'id', 'Id', 'ID', 'Userid', 'userid', 'user_id', 'user_number', 'password', 'roleId',
            'created_at', 'createdAt', 'createdat', 'updated_at', 'updatedAt', 'updatedat',
            'Created_by', 'created_by', 'Updated_by', 'updated_by', 'Approved_by', 'forum',
            'staff_name', 'staff_id', 'department', 's_no', 'proof_available', 'proof_file_name'
          ];
          const activitySpecificColumns = [...new Set([...baseColumns, ...rowKeys])].filter(
            (col) => !excludeCols.includes(col) && !['created_at', 'createdat', 'createdat', 'updated_at', 'updatedat', 'updatedat'].includes(col.toLowerCase())
          );
          const columns = ['s_no', 'staff_name', 'staff_id', 'department', ...activitySpecificColumns, 'created_at', 'updated_at'];

          const normalizedRows = normalizeRowFiles(rows, table);

          activitiesData[activityName] = {
            table,
            columns,
            rows: normalizedRows,
            count: normalizedRows.length
          };
          totalRecords += normalizedRows.length;
        }
      } catch (actErr) {
        // Safe handling
      }
    }

    res.json({
      staff,
      activitiesData,
      totalRecords
    });
  } catch (error) {
    console.error('Error fetching staff all activities detail:', error);
    res.status(500).json({ error: 'Failed to fetch staff activity details' });
  }
});

const getValidVal = (...vals) => {
  for (const v of vals) {
    if (
      v !== undefined &&
      v !== null &&
      String(v).trim() !== '' &&
      String(v).trim() !== 'N/A' &&
      String(v).trim() !== 'undefined' &&
      String(v).trim() !== 'null'
    ) {
      return String(v).trim();
    }
  }
  return 'N/A';
};

// Helper date formatter for DD-MM-YYYY format
const formatDateDDMMYYYY = (val) => {
  if (!val || val === 'N/A' || val === 'null' || val === 'undefined') return 'N/A';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parts = trimmed.split('T')[0].split(' ')[0].split('-');
      if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return String(val);
};

// Enrich activity rows with child table data (release details, students, co-PIs, authors, inventors, MOU activities, etc.)
const attachChildRecordsToRows = async (tableName, rows) => {
  if (!rows || !Array.isArray(rows) || rows.length === 0) return rows;
  const ids = rows.map((r) => r.id || r.Id || r.ID).filter(Boolean);
  if (ids.length === 0) return rows;

  const tableLower = tableName.toLowerCase().trim();

  const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return val ? `₹${val}` : '₹0';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  // Safe helper to run fallback queries on child tables without throwing on missing columns
  const safeChildQuery = async (queries, replacementIds) => {
    for (const q of queries) {
      try {
        const [res] = await sequelize.query(q.sql, {
          replacements: q.replacements || [replacementIds],
        });
        if (res && res.length > 0) return res;
      } catch (err) {
        // Ignore column/table error and try next fallback
      }
    }
    return [];
  };

  // 1. Funded Projects (project_proposals)
  if (tableLower === 'project_proposals') {
    try {
      let releases = await safeChildQuery(
        [
          { sql: `SELECT * FROM funded_project_releases WHERE funded_project_id IN (?) ORDER BY release_date ASC, id ASC` },
          { sql: `SELECT * FROM funded_project_releases WHERE project_id IN (?) ORDER BY release_date ASC, id ASC` },
          { sql: `SELECT * FROM funded_project_releases WHERE project_proposal_id IN (?) ORDER BY release_date ASC, id ASC` },
        ],
        ids
      );

      let isPaymentFallback = false;
      if (!releases || releases.length === 0) {
        const payments = await safeChildQuery(
          [
            { sql: `SELECT * FROM funded_project_payments WHERE proposal_id IN (?) ORDER BY date ASC, id ASC` },
            { sql: `SELECT * FROM funded_project_payments WHERE funded_project_id IN (?) ORDER BY date ASC, id ASC` },
            { sql: `SELECT * FROM funded_project_payments WHERE project_id IN (?) ORDER BY date ASC, id ASC` },
          ],
          ids
        );
        if (payments && payments.length > 0) {
          releases = payments;
          isPaymentFallback = true;
        }
      }

      const students = await safeChildQuery(
        [
          { sql: `SELECT * FROM project_students WHERE project_id IN (?) ORDER BY id ASC` },
          { sql: `SELECT * FROM project_students WHERE project_proposal_id IN (?) ORDER BY id ASC` },
          { sql: `SELECT * FROM project_students WHERE funded_project_id IN (?) ORDER BY id ASC` },
        ],
        ids
      );

      const copis = await safeChildQuery(
        [
          { sql: `SELECT * FROM project_copis WHERE project_id IN (?) ORDER BY id ASC` },
          { sql: `SELECT * FROM project_copis WHERE project_proposal_id IN (?) ORDER BY id ASC` },
          { sql: `SELECT * FROM project_copis WHERE funded_project_id IN (?) ORDER BY id ASC` },
        ],
        ids
      );

      const releaseMap = {};
      const releaseSumMap = {};

      (releases || []).forEach((rel) => {
        const pId = rel.funded_project_id || rel.project_id || rel.project_proposal_id || rel.proposal_id;
        if (pId) {
          if (!releaseMap[pId]) releaseMap[pId] = [];
          const dateVal = isPaymentFallback ? rel.date : rel.release_date;
          const dateStr = formatDateDDMMYYYY(dateVal);
          const amtStr = formatCurrency(rel.amount_received || rel.amount);
          const remarksStr = rel.remarks && String(rel.remarks).trim() !== '' ? ` – ${String(rel.remarks).trim()}` : '';
          releaseMap[pId].push(`${dateStr} – ${amtStr}${remarksStr}`);

          const num = Number(rel.amount_received || rel.amount || 0);
          if (!isNaN(num)) {
            releaseSumMap[pId] = (releaseSumMap[pId] || 0) + num;
          }
        }
      });

      const studentMap = {};
      (students || []).forEach((s) => {
        const pId = s.project_id || s.project_proposal_id || s.funded_project_id;
        if (pId) {
          if (!studentMap[pId]) studentMap[pId] = [];
          const name = s.student_name || s.name;
          if (name) {
            const info = [name, s.register_number ? `Reg: ${s.register_number}` : '', s.department, s.year ? `Year ${s.year}` : ''].filter(Boolean).join(', ');
            studentMap[pId].push(info);
          }
        }
      });

      const copiMap = {};
      (copis || []).forEach((c) => {
        const pId = c.project_id || c.project_proposal_id || c.funded_project_id;
        const name = c.co_pi_name || c.name;
        if (pId && name) {
          if (!copiMap[pId]) copiMap[pId] = [];
          copiMap[pId].push(name);
        }
      });

      rows.forEach((r) => {
        const rowId = r.id || r.Id || r.ID;
        if (releaseMap[rowId] && releaseMap[rowId].length > 0) {
          r.amount_release_details = releaseMap[rowId].join('\n');
          r.amount_received_indicator = 'Yes';
          if ((!r.amount_received || Number(r.amount_received) === 0 || r.amount_received === 'N/A') && releaseSumMap[rowId]) {
            r.amount_received = releaseSumMap[rowId];
          }
        }
        if (studentMap[rowId] && studentMap[rowId].length > 0) {
          r.student_details = studentMap[rowId].join(', ');
          r.students_involved = 'Yes';
        }
        if (copiMap[rowId] && copiMap[rowId].length > 0) {
          r.co_pi_names = copiMap[rowId].join(', ');
        }
      });
    } catch (e) {
      console.error('Error attaching child records for project_proposals:', e.message);
    }
  }

  // 2. Consultancy Proposals (consultancy_proposals)
  if (tableLower === 'consultancy_proposals') {
    try {
      const releases = await safeChildQuery(
        [
          { sql: `SELECT * FROM consultancy_releases WHERE consultancy_id IN (?) ORDER BY release_date ASC, id ASC` },
          { sql: `SELECT * FROM consultancy_releases WHERE consultancy_proposal_id IN (?) ORDER BY release_date ASC, id ASC` },
        ],
        ids
      );

      const copis = await safeChildQuery(
        [
          { sql: `SELECT * FROM consultancy_co_pis WHERE consultancy_id IN (?) ORDER BY id ASC` },
          { sql: `SELECT * FROM consultancy_copis WHERE consultancy_id IN (?) ORDER BY id ASC` },
          { sql: `SELECT * FROM consultancy_co_pis WHERE consultancy_proposal_id IN (?) ORDER BY id ASC` },
          { sql: `SELECT * FROM consultancy_copis WHERE consultancy_proposal_id IN (?) ORDER BY id ASC` },
        ],
        ids
      );

      const releaseMap = {};
      const releaseSumMap = {};

      (releases || []).forEach((rel) => {
        const pId = rel.consultancy_id || rel.consultancy_proposal_id;
        if (pId) {
          if (!releaseMap[pId]) releaseMap[pId] = [];
          const dateStr = formatDateDDMMYYYY(rel.release_date);
          const amtStr = formatCurrency(rel.amount_received);
          const remarksStr = rel.remarks && String(rel.remarks).trim() !== '' ? ` – ${String(rel.remarks).trim()}` : '';
          releaseMap[pId].push(`${dateStr} – ${amtStr}${remarksStr}`);

          const num = Number(rel.amount_received || 0);
          if (!isNaN(num)) {
            releaseSumMap[pId] = (releaseSumMap[pId] || 0) + num;
          }
        }
      });

      const copiMap = {};
      (copis || []).forEach((c) => {
        const pId = c.consultancy_id || c.consultancy_proposal_id;
        const name = c.co_pi_name || c.name;
        if (pId && name) {
          if (!copiMap[pId]) copiMap[pId] = [];
          copiMap[pId].push(name);
        }
      });

      rows.forEach((r) => {
        const rowId = r.id || r.Id || r.ID;
        if (releaseMap[rowId] && releaseMap[rowId].length > 0) {
          r.amount_release_details = releaseMap[rowId].join('\n');
          r.amount_received_indicator = 'Yes';
          if ((!r.amount_received || Number(r.amount_received) === 0 || r.amount_received === 'N/A') && releaseSumMap[rowId]) {
            r.amount_received = releaseSumMap[rowId];
          }
        }
        if (copiMap[rowId] && copiMap[rowId].length > 0) {
          r.co_pi_names = copiMap[rowId].join(', ');
        }
      });
    } catch (e) {
      console.error('Error attaching child records for consultancy_proposals:', e.message);
    }
  }

  // 3. Book Chapters (book_chapters)
  if (tableLower === 'book_chapters') {
    try {
      const authors = await safeChildQuery(
        [{ sql: `SELECT book_chapter_id, author_name FROM book_chapter_authors WHERE book_chapter_id IN (?) ORDER BY author_order ASC, id ASC` }],
        ids
      );
      const authorMap = {};
      (authors || []).forEach((a) => {
        const pId = a.book_chapter_id;
        if (!authorMap[pId]) authorMap[pId] = [];
        authorMap[pId].push(a.author_name);
      });

      rows.forEach((r) => {
        const rowId = r.id || r.Id || r.ID;
        if (authorMap[rowId] && authorMap[rowId].length > 0) {
          r.authors_list = authorMap[rowId].join(', ');
        } else if (r.authors) {
          if (Array.isArray(r.authors)) {
            r.authors_list = r.authors.join(', ');
          } else if (typeof r.authors === 'string' && r.authors.trim()) {
            try {
              const parsed = JSON.parse(r.authors);
              if (Array.isArray(parsed)) r.authors_list = parsed.join(', ');
              else r.authors_list = r.authors;
            } catch (e) {
              r.authors_list = r.authors;
            }
          }
        }
      });
    } catch (e) { }
  }

  // 4. Conference Details (conference_details)
  if (tableLower === 'conference_details') {
    try {
      const authors = await safeChildQuery(
        [{ sql: `SELECT conference_detail_id, author_name FROM conference_authors WHERE conference_detail_id IN (?) ORDER BY author_order ASC, id ASC` }],
        ids
      );
      const authorMap = {};
      (authors || []).forEach((a) => {
        const pId = a.conference_detail_id;
        if (!authorMap[pId]) authorMap[pId] = [];
        authorMap[pId].push(a.author_name);
      });

      rows.forEach((r) => {
        const rowId = r.id || r.Id || r.ID;
        if (authorMap[rowId] && authorMap[rowId].length > 0) {
          r.authors_list = authorMap[rowId].join(', ');
        }
      });
    } catch (e) { }
  }

  // 5. Events Organized (events_organized / staff_events_organized)
  if (tableLower === 'events_organized' || tableLower === 'staff_events_organized') {
    try {
      const coords = await safeChildQuery(
        [
          { sql: `SELECT * FROM event_coordinators WHERE event_id IN (?) ORDER BY id ASC` },
          { sql: `SELECT * FROM event_coordinators WHERE event_organized_id IN (?) ORDER BY id ASC` },
        ],
        ids
      );

      const speakers = await safeChildQuery(
        [
          { sql: `SELECT * FROM event_resource_persons WHERE event_id IN (?) ORDER BY id ASC` },
          { sql: `SELECT * FROM event_resource_persons WHERE event_organized_id IN (?) ORDER BY id ASC` },
        ],
        ids
      );

      const coordMap = {};
      (coords || []).forEach((c) => {
        const pId = c.event_id || c.event_organized_id;
        const name = c.coordinator_name || c.name;
        if (pId && name) {
          if (!coordMap[pId]) coordMap[pId] = [];
          coordMap[pId].push(name);
        }
      });

      const speakerMap = {};
      (speakers || []).forEach((sp) => {
        const pId = sp.event_id || sp.event_organized_id;
        const name = sp.person_name || sp.speaker_name || sp.name;
        const desig = sp.designation ? ` (${sp.designation})` : '';
        if (pId && name) {
          if (!speakerMap[pId]) speakerMap[pId] = [];
          speakerMap[pId].push(`${name}${desig}`);
        }
      });

      rows.forEach((r) => {
        const rowId = r.id || r.Id || r.ID;
        if (coordMap[rowId] && coordMap[rowId].length > 0) {
          r.co_coordinator_names = coordMap[rowId].join(', ');
        }
        if (speakerMap[rowId] && speakerMap[rowId].length > 0) {
          r.speaker_details = speakerMap[rowId].join(', ');
        }
      });
    } catch (e) { }
  }

  // 6. Patent / Product Development (patent_product)
  if (tableLower === 'patent_product' || tableLower === 'patent_products') {
    try {
      const inventors = await safeChildQuery(
        [{ sql: `SELECT patent_id, inventor_name FROM patent_inventors WHERE patent_id IN (?) ORDER BY inventor_order ASC, id ASC` }],
        ids
      );
      const inventorMap = {};
      (inventors || []).forEach((inv) => {
        const pId = inv.patent_id;
        if (!inventorMap[pId]) inventorMap[pId] = [];
        inventorMap[pId].push(inv.inventor_name);
      });

      rows.forEach((r) => {
        const rowId = r.id || r.Id || r.ID;
        if (inventorMap[rowId] && inventorMap[rowId].length > 0) {
          r.inventors_list = inventorMap[rowId].join(', ');
        }
      });
    } catch (e) { }
  }

  // 7. Project Mentors (project_mentors)
  if (tableLower === 'project_mentors') {
    try {
      const students = await safeChildQuery(
        [
          { sql: `SELECT * FROM project_mentor_students WHERE project_mentor_id IN (?) ORDER BY id ASC` },
          { sql: `SELECT * FROM project_mentor_students WHERE mentor_id IN (?) ORDER BY id ASC` },
          { sql: `SELECT * FROM project_mentor_students WHERE project_id IN (?) ORDER BY id ASC` },
        ],
        ids
      );
      const studentMap = {};
      (students || []).forEach((s) => {
        const pId = s.project_mentor_id || s.mentor_id || s.project_id;
        if (pId) {
          if (!studentMap[pId]) studentMap[pId] = [];
          const name = s.student_name || s.name;
          if (name) {
            const info = [name, s.register_number ? `Reg: ${s.register_number}` : '', s.department, s.year ? `Year ${s.year}` : ''].filter(Boolean).join(', ');
            studentMap[pId].push(info);
          }
        }
      });

      rows.forEach((r) => {
        const rowId = r.id || r.Id || r.ID;
        if (studentMap[rowId] && studentMap[rowId].length > 0) {
          r.student_details = studentMap[rowId].join(', ');
          r.students_involved = 'Yes';
        }
      });
    } catch (e) { }
  }

  // 8. MOU (mou)
  if (tableLower === 'mou' || tableLower === 'staff_mous') {
    try {
      const mouActs = await safeChildQuery(
        [{ sql: `SELECT mou_id, activity_name, activity_date, description FROM mou_activities WHERE mou_id IN (?) ORDER BY activity_date ASC, id ASC` }],
        ids
      );
      const coords = await safeChildQuery(
        [{ sql: `SELECT mou_id, coordinator_name FROM mou_coordinators WHERE mou_id IN (?) ORDER BY id ASC` }],
        ids
      );
      const depts = await safeChildQuery(
        [{ sql: `SELECT mou_id, department_name FROM mou_dpt_mappings WHERE mou_id IN (?) ORDER BY id ASC` }],
        ids
      );

      const actMap = {};
      (mouActs || []).forEach((act) => {
        const pId = act.mou_id;
        if (!actMap[pId]) actMap[pId] = [];
        const dStr = formatDateDDMMYYYY(act.activity_date);
        actMap[pId].push(`${act.activity_name}${dStr && dStr !== 'N/A' ? ' (' + dStr + ')' : ''}${act.description ? ': ' + act.description : ''}`);
      });

      const coordMap = {};
      (coords || []).forEach((c) => {
        const pId = c.mou_id;
        if (!coordMap[pId]) coordMap[pId] = [];
        coordMap[pId].push(c.coordinator_name);
      });

      const deptMap = {};
      (depts || []).forEach((d) => {
        const pId = d.mou_id;
        if (!deptMap[pId]) deptMap[pId] = [];
        deptMap[pId].push(d.department_name);
      });

      rows.forEach((r) => {
        const rowId = r.id || r.Id || r.ID;
        if (actMap[rowId] && actMap[rowId].length > 0) {
          r.mou_activities = actMap[rowId].join('\n');
        }
        if (coordMap[rowId] && coordMap[rowId].length > 0) {
          r.coordinators_str = coordMap[rowId].join(', ');
        }
        if (deptMap[rowId] && deptMap[rowId].length > 0) {
          r.departments_str = deptMap[rowId].join(', ');
        }
      });
    } catch (e) { }
  }

  return rows;
};

// Helper function to normalize file columns, format dates, and process conditional fields
const normalizeRowFiles = (rows, tableName) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const newRow = { ...row };
    const rowId = newRow.id || newRow.Id || newRow.ID;

    // Staff details normalization
    newRow.staff_id = getValidVal(newRow.staff_id, newRow.staffId, newRow.userNumber, newRow.user_number, newRow.Userid, newRow.userId, newRow.user_id);
    newRow.staff_name = getValidVal(newRow.staff_name, newRow.username, newRow.userName, newRow.full_name);
    newRow.department = getValidVal(newRow.department, newRow.departmentAcr, newRow.departmentName, newRow.Deptacronym);

    // Dates & Duration Fallbacks
    newRow.from_date = getValidVal(newRow.from_date, newRow.fromDate, newRow.start_date, newRow.startDate, newRow.signed_on, newRow.publication_date, newRow.event_date, newRow.recognition_date);
    newRow.to_date = getValidVal(newRow.to_date, newRow.toDate, newRow.end_date, newRow.endDate);

    if (newRow.from_date !== 'N/A') newRow.from_date = formatDateDDMMYYYY(newRow.from_date);
    if (newRow.to_date !== 'N/A') newRow.to_date = formatDateDDMMYYYY(newRow.to_date);

    // Auto-compute duration if missing
    let durationVal = getValidVal(newRow.duration, newRow.project_duration, newRow.days);
    if (durationVal === 'N/A' && newRow.from_date !== 'N/A' && newRow.to_date !== 'N/A') {
      try {
        const fParts = newRow.from_date.split('-');
        const tParts = newRow.to_date.split('-');
        if (fParts.length === 3 && tParts.length === 3) {
          const f = new Date(`${fParts[2]}-${fParts[1]}-${fParts[0]}`);
          const t = new Date(`${tParts[2]}-${tParts[1]}-${tParts[0]}`);
          if (!isNaN(f.getTime()) && !isNaN(t.getTime())) {
            const diffTime = Math.abs(t.getTime() - f.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            durationVal = `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
          }
        }
      } catch (e) { }
    }
    if (durationVal !== 'N/A') {
      newRow.duration = durationVal;
      newRow.project_duration = durationVal;
    }

    // Proof available detection
    let proofFound = false;
    let proofPathOrLink = '';

    for (const [key, val] of Object.entries(newRow)) {
      if (val === null || val === undefined) continue;

      const keyLower = key.toLowerCase();

      // Format Date Fields to DD-MM-YYYY
      const isDateCol =
        keyLower.includes('_date') ||
        keyLower.includes('date_') ||
        keyLower === 'signed_on' ||
        keyLower === 'created_at' ||
        keyLower === 'createdat' ||
        keyLower === 'updated_at' ||
        keyLower === 'updatedat' ||
        keyLower === 'date_of_birth';

      if (isDateCol && val) {
        newRow[key] = formatDateDDMMYYYY(val);
      }

      const isFileCol =
        keyLower.includes('proof') ||
        keyLower.includes('report') ||
        keyLower.includes('copy') ||
        keyLower.includes('certificate') ||
        keyLower.includes('file') ||
        keyLower.includes('document') ||
        keyLower.includes('link') ||
        keyLower.includes('upload');

      // 1. Is it a Buffer object or serialized Buffer { type: 'Buffer', data: [...] }?
      if (Buffer.isBuffer(val) || (typeof val === 'object' && val !== null && (val.type === 'Buffer' || Array.isArray(val.data)))) {
        const buf = Buffer.isBuffer(val) ? val : Buffer.from(val.data || val);
        const str = buf.toString('utf8').trim();

        if (str.startsWith('%PDF-') || str.includes('MediaBox') || str.includes('/Catalog')) {
          if (rowId) {
            newRow[key] = `/admin-panel/view-document/${tableName}/${rowId}/${key}`;
            proofFound = true;
            if (!proofPathOrLink) proofPathOrLink = newRow[key];
          } else {
            newRow[key] = '[Binary Document]';
            proofFound = true;
          }
        } else if (str.length > 0 && !str.includes('\0')) {
          const cleanPath = str.replace(/\\/g, '/');
          newRow[key] = cleanPath.startsWith('uploads/') ? `/${cleanPath}` : cleanPath;
          proofFound = true;
          if (!proofPathOrLink) proofPathOrLink = newRow[key];
        } else if (rowId) {
          newRow[key] = `/admin-panel/view-document/${tableName}/${rowId}/${key}`;
          proofFound = true;
          if (!proofPathOrLink) proofPathOrLink = newRow[key];
        }
      }
      // 2. Is it a String containing serialized Buffer or file path?
      else if (typeof val === 'string') {
        const strVal = val.trim();
        if (strVal.includes('"type":"Buffer"')) {
          try {
            const parsed = JSON.parse(strVal);
            if (parsed && parsed.data) {
              const buf = Buffer.from(parsed.data);
              const str = buf.toString('utf8').trim();
              if (str.startsWith('%PDF-')) {
                newRow[key] = `/admin-panel/view-document/${tableName}/${rowId}/${key}`;
                proofFound = true;
                if (!proofPathOrLink) proofPathOrLink = newRow[key];
              } else if (str.length > 0 && !str.includes('\0')) {
                const cleanPath = str.replace(/\\/g, '/');
                newRow[key] = cleanPath.startsWith('uploads/') ? `/${cleanPath}` : cleanPath;
                proofFound = true;
                if (!proofPathOrLink) proofPathOrLink = newRow[key];
              }
            }
          } catch (e) {
            if (rowId) newRow[key] = `/admin-panel/view-document/${tableName}/${rowId}/${key}`;
            proofFound = true;
          }
        } else if (isFileCol || strVal.includes('\\') || strVal.startsWith('uploads') || strVal.startsWith('/uploads') || strVal.startsWith('http')) {
          const cleanPath = strVal.replace(/\\/g, '/');
          newRow[key] = cleanPath.startsWith('uploads/') ? `/${cleanPath}` : cleanPath;
          if (strVal !== '' && strVal !== 'N/A') {
            proofFound = true;
            if (!proofPathOrLink) proofPathOrLink = newRow[key];
          }
        }
      }
      // 3. If Javascript object
      else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const filePath = val.url || val.filePath || val.path || val.filename || val.name || val.originalName;
        if (filePath && typeof filePath === 'string') {
          const cleanPath = filePath.replace(/\\/g, '/');
          newRow[key] = cleanPath.startsWith('/') || cleanPath.startsWith('http') ? cleanPath : `/${cleanPath}`;
          proofFound = true;
          if (!proofPathOrLink) proofPathOrLink = newRow[key];
        } else if (isFileCol && rowId) {
          newRow[key] = `/admin-panel/view-document/${tableName}/${rowId}/${key}`;
          proofFound = true;
          if (!proofPathOrLink) proofPathOrLink = newRow[key];
        } else {
          newRow[key] = 'N/A';
        }
      }
    }

    // Set proof indicators (omitted proof_available / proof_file_name metadata fields in favor of direct proof documents)

    // Conditional Fields Logic (preserving valid data, resolving fallbacks)
    let stdVal = getValidVal(newRow.student_details, newRow.student_names, newRow.student_name, newRow.students);
    if (stdVal === 'N/A' && newRow.student_list) {
      if (Array.isArray(newRow.student_list)) stdVal = newRow.student_list.filter(Boolean).join(', ');
      else if (typeof newRow.student_list === 'string') stdVal = newRow.student_list;
    }
    if (stdVal === 'N/A' && typeof newRow.students === 'string' && newRow.students.trim()) {
      try {
        const parsed = JSON.parse(newRow.students);
        if (Array.isArray(parsed)) {
          stdVal = parsed.map(s => typeof s === 'string' ? s : (s.student_name || s.name || '')).filter(Boolean).join(', ');
        }
      } catch (e) { }
    }
    if (stdVal === 'N/A' && typeof newRow.student_names === 'string' && newRow.student_names.trim()) {
      try {
        const parsed = JSON.parse(newRow.student_names);
        if (Array.isArray(parsed)) {
          stdVal = parsed.map(s => String(s).trim()).filter(Boolean).join(', ');
        }
      } catch (e) { }
    }

    const hasStudentFlag = newRow.students_involved === 'Yes' || newRow.students_involved === true || newRow.students_involved === '1' || newRow.students_involved === 1;
    if (stdVal !== 'N/A' || hasStudentFlag) {
      newRow.students_involved = 'Yes';
      if (stdVal !== 'N/A') {
        newRow.student_details = stdVal;
      } else if (!newRow.student_details || newRow.student_details === 'N/A') {
        newRow.student_details = 'Student details recorded';
      }
    } else if (newRow.students_involved !== undefined || newRow.student_details !== undefined) {
      newRow.students_involved = 'No';
      newRow.student_details = 'N/A';
    }

    let relVal = getValidVal(newRow.amount_release_details, newRow.release_details);
    if (relVal === 'N/A' && Array.isArray(newRow.releases) && newRow.releases.length > 0) {
      const relLines = newRow.releases.map((rel) => {
        const dStr = formatDateDDMMYYYY(rel.release_date || rel.date);
        const aStr = formatCurrency(rel.amount_received || rel.amount);
        const rem = rel.remarks && String(rel.remarks).trim() !== '' ? ` – ${String(rel.remarks).trim()}` : '';
        return `${dStr} – ${aStr}${rem}`;
      });
      relVal = relLines.join('\n');
    }

    const recVal = getValidVal(newRow.amount_received, newRow.amountReceived, newRow.fund_received);
    const hasRecNum = Number(String(recVal).replace(/[^0-9.]/g, '')) > 0;
    const hasRecFlag = newRow.amount_received_indicator === 'Yes' || newRow.amount_received_indicator === true || newRow.amount_received_indicator === '1' || newRow.amount_received_indicator === 1;

    if (relVal !== 'N/A' || hasRecNum || hasRecFlag) {
      newRow.amount_received_indicator = 'Yes';
      if (relVal !== 'N/A') newRow.amount_release_details = relVal;
      if (recVal !== 'N/A') newRow.amount_received = recVal;
    } else if (newRow.amount_received !== undefined || newRow.amount_release_details !== undefined || newRow.amount_received_indicator !== undefined) {
      newRow.amount_received_indicator = 'No';
      newRow.amount_received = 'N/A';
      newRow.amount_release_details = 'N/A';
    }

    if (newRow.financial_support !== undefined || newRow.support_amount !== undefined) {
      const suppVal = getValidVal(newRow.support_amount, newRow.financial_support_details);
      const hasFinFlag = newRow.financial_support === true || newRow.financial_support === 1 || newRow.financial_support === 'Yes' || newRow.financial_support === '1';
      if (suppVal !== 'N/A' || hasFinFlag) {
        newRow.financial_support = 'Yes';
        if (suppVal !== 'N/A') newRow.support_amount = suppVal;
      } else {
        newRow.financial_support = 'No';
        newRow.support_amount = 'N/A';
      }
    }

    if (newRow.funded !== undefined || newRow.fund_received !== undefined) {
      const fundAmt = getValidVal(newRow.fund_received);
      const isFundedFlag = newRow.funded === true || newRow.funded === 1 || newRow.funded === 'Yes' || newRow.funded === '1';
      if (fundAmt !== 'N/A' || isFundedFlag) {
        newRow.funded = 'Yes';
        if (fundAmt !== 'N/A') newRow.fund_received = fundAmt;
      } else {
        newRow.funded = 'No';
        newRow.funding_agency = 'N/A';
        newRow.fund_received = 'N/A';
      }
    }

    if (newRow.working_model !== undefined) {
      newRow.working_model = (newRow.working_model === true || newRow.working_model === 1 || newRow.working_model === 'Yes') ? 'Yes' : 'No';
    }
    if (newRow.prototype_developed !== undefined) {
      newRow.prototype_developed = (newRow.prototype_developed === true || newRow.prototype_developed === 1 || newRow.prototype_developed === 'Yes') ? 'Yes' : 'No';
    }

    // Normalize created_at and updated_at directly from actual database timestamp fields (no artificial fallbacks)
    const rawCreatedAt = getValidVal(newRow.created_at, newRow.createdAt, newRow.createdat, row.created_at, row.createdAt, row.createdat);
    const rawUpdatedAt = getValidVal(newRow.updated_at, newRow.updatedAt, newRow.updatedat, row.updated_at, row.updatedAt, row.updatedat);

    newRow.created_at = rawCreatedAt !== 'N/A' ? formatDateDDMMYYYY(rawCreatedAt) : 'N/A';
    newRow.updated_at = rawUpdatedAt !== 'N/A' ? formatDateDDMMYYYY(rawUpdatedAt) : 'N/A';

    return newRow;
  });
};

// Serve BLOB / stored file documents dynamically from database table
router.get('/admin-panel/view-document/:tableName/:id/:columnName', async (req, res) => {
  try {
    const { tableName, id, columnName } = req.params;
    const [rows] = await sequelize.query(`SELECT \`${columnName}\` FROM \`${tableName}\` WHERE id = ?`, {
      replacements: [id],
    });

    if (!rows || rows.length === 0) {
      return res.status(404).send('Document not found');
    }

    let val = rows[0][columnName];
    if (!val) {
      return res.status(404).send('Document is empty');
    }

    if (Buffer.isBuffer(val)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${columnName}_${id}.pdf"`);
      return res.send(val);
    } else if (typeof val === 'object' && val !== null && (val.type === 'Buffer' || Array.isArray(val.data))) {
      const buf = Buffer.from(val.data || val);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${columnName}_${id}.pdf"`);
      return res.send(buf);
    } else if (typeof val === 'string') {
      const strVal = val.trim();
      if (strVal.includes('"type":"Buffer"')) {
        try {
          const parsed = JSON.parse(strVal);
          if (parsed && parsed.data) {
            const buf = Buffer.from(parsed.data);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${columnName}_${id}.pdf"`);
            return res.send(buf);
          }
        } catch (e) { }
      }
      if (strVal.startsWith('http')) {
        return res.redirect(strVal);
      }
      const cleanPath = strVal.replace(/\\/g, '/');
      const fullPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
      return res.redirect(fullPath);
    } else {
      return res.status(400).send('Invalid document format');
    }
  } catch (err) {
    console.error('Error serving document:', err);
    res.status(500).send('Error retrieving document');
  }
});

// Get activity-specific data
router.get('/admin-panel/activity-data/:tableName', attachUserIfAuth, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { departmentId, staffName, staffId, userId, fromDate, toDate } = req.query;
    const activeDept = resolveAuthorizedDepartment(req, departmentId);

    console.log('Request params:', { tableName, departmentId: activeDept, staffName, staffId, userId, fromDate, toDate });

    // Find the activity mapping
    const activityMapping = Object.values(activityMappings).find(
      (mapping) => mapping.table.toLowerCase() === tableName.toLowerCase().trim()
    );

    if (!activityMapping) {
      console.error('Invalid activity table:', tableName);
      return res.status(400).json({ error: 'Invalid activity table' });
    }

    console.log('Activity mapping found:', activityMapping);

    if (!activityMapping.joinQuery || !Array.isArray(activityMapping.columns) || !activityMapping.alias) {
      console.error('Invalid activity mapping structure:', activityMapping);
      return res.status(500).json({
        error: 'Invalid activity mapping configuration',
        details: 'Missing or invalid required properties in activity mapping',
      });
    }

    let query = activityMapping.joinQuery.trim();
    const queryParams = [];

    // Add filters
    const conditions = [];

    if (activeDept && activeDept !== 'null' && activeDept !== '') {
      conditions.push('(u.departmentId = ? OR d.departmentAcr = ? OR d.departmentName LIKE ?)');
      queryParams.push(activeDept, activeDept, `%${activeDept}%`);
    }

    if (userId && userId !== 'null' && userId !== '') {
      conditions.push('u.userId = ?');
      queryParams.push(userId);
    } else if (staffId && staffId.trim() !== '') {
      conditions.push('(u.userNumber = ? OR u.userId = ? OR u.userName LIKE ?)');
      queryParams.push(staffId.trim(), staffId.trim(), `%${staffId.trim()}%`);
    } else if (staffName && staffName.trim() !== '') {
      conditions.push('(u.userName LIKE ? OR u.userNumber LIKE ? OR CAST(u.userId AS CHAR) = ?)');
      queryParams.push(`%${staffName.trim()}%`, `%${staffName.trim()}%`, staffName.trim());
    }

    const dateCol = activityMapping.dateColumn || 'created_at';
    if (fromDate && fromDate.trim() !== '') {
      conditions.push(`DATE(${activityMapping.alias}.${dateCol}) >= ?`);
      queryParams.push(fromDate.trim());
    }

    if (toDate && toDate.trim() !== '') {
      conditions.push(`DATE(${activityMapping.alias}.${dateCol}) <= ?`);
      queryParams.push(toDate.trim());
    }

    if (conditions.length > 0) {
      if (query.toLowerCase().includes('where')) {
        query += ` AND ${conditions.join(' AND ')}`;
      } else {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    query += ` ORDER BY ${activityMapping.alias}.${dateCol} DESC`;

    console.log('Final query:', query);
    console.log('Query params:', queryParams);

    let rows = await sequelize.query(query, {
      replacements: queryParams,
      type: sequelize.QueryTypes.SELECT,
    });

    // Attach child records (installments, student details, co-PIs, authors, inventors, MOU activities)
    rows = await attachChildRecordsToRows(activityMapping.table, rows);

    // Standardized column ordering (placing created_at and updated_at as the last columns)
    const baseCols = activityMapping.columns.filter(c => !['created_at', 'createdat', 'createdAt', 'updated_at', 'updatedat', 'updatedAt'].includes(c));
    const columns = ['s_no', 'staff_name', 'staff_id', 'department', ...baseCols, 'created_at', 'updated_at'];

    console.log(`Found ${rows?.length || 0} rows for ${tableName}`);
    console.log('Columns:', columns);

    const normalizedRows = normalizeRowFiles(rows, activityMapping.table);

    res.json({
      data: normalizedRows || [],
      columns,
    });
  } catch (error) {
    console.error('Error fetching activity data:', error);
    res.status(500).json({
      error: 'Failed to fetch activity data',
      details: error.message,
    });
  }
});

// Header Titles Mapping for Standardized Institutional Excel Exports
const excelHeaderTitleMap = {
  s_no: 'SI No',
  staff_name: 'Staff Name',
  staff_id: 'Staff ID',
  department: 'Department',
  created_at: 'Created Date',
  updated_at: 'Updated Date',
  createdAt: 'Created Date',
  updatedAt: 'Updated Date',
  scholar_name: 'Scholar Name',
  scholar_type: 'Scholar Type',
  title: 'Title / Topic',
  domain: 'Research Domain',
  institute: 'Institute',
  university: 'University',
  phd_registered_month: 'Ph.D. Reg. Month',
  phd_registered_year: 'Ph.D. Reg. Year',
  completed_month: 'Completion Month',
  completed_year: 'Completion Year',
  status: 'Status',
  publications: 'Publications',
  proof: 'Proof / Sanction Order',
  project_title: 'Project Title',
  funding_agency: 'Funding Agency',
  organization_name: 'Organization Name',
  pi_name: 'PI Name',
  co_pi_names: 'Co-PI Names',
  students_involved: 'Students Involved',
  student_details: 'Student Details',
  from_date: 'From Date',
  to_date: 'To Date',
  amount: 'Sanctioned Amount (₹)',
  amount_received_indicator: 'Amount Received',
  amount_received: 'Total Amount Received (₹)',
  amount_release_details: 'Amount Release Details',
  project_duration: 'Project Duration',
  outcomes: 'Outcomes',
  programme_name: 'Programme Name',
  organized_by: 'Organized By',
  venue: 'Venue',
  mode: 'Mode',
  participants: 'Participants Count',
  financial_support: 'Financial Support',
  support_amount: 'Support Amount (₹)',
  company: 'Company / Industry',
  internship_name: 'Internship / Program Name',
  course_name: 'Course Name',
  offered_by: 'Offered By',
  certification_date: 'Certification Date',
  hours: 'Duration (Hours)',
  days: 'Duration (Days)',
  weeks: 'Duration (Weeks)',
  publication_type: 'Publication Type',
  publication_title: 'Publication Title',
  publication_name: 'Publication / Journal Name',
  authors_list: 'Authors List',
  publisher: 'Publisher',
  index_type: 'Indexing',
  impact_factor: 'Impact Factor',
  doi: 'DOI',
  volume_no: 'Volume No',
  issue_no: 'Issue No',
  page_no: 'Page No',
  citations: 'Citations',
  published_month: 'Published Month',
  published_year: 'Published Year',
  publication_date: 'Publication Date',
  title_of_paper: 'Title of Paper',
  conference_name: 'Conference Name',
  conference_type: 'Conference Type',
  indexing: 'Indexing',
  citations_count: 'Citations Count',
  month_year: 'Month & Year',
  program_name: 'Program Name',
  program_title: 'Program Title',
  coordinator_name: 'Coordinator Name',
  co_coordinator_names: 'Co-Coordinator Names',
  speaker_details: 'Resource Person / Speaker Details',
  funding_type: 'Funding Type',
  amount_sanctioned: 'Amount Sanctioned (₹)',
  h_index: 'H-Index',
  i_index: 'i-10 Index',
  google_citations: 'Google Scholar Citations',
  scopus_citations: 'Scopus Citations',
  program_specification: 'Program Specification',
  event_date: 'Event Date',
  category: 'Category',
  recognition_date: 'Recognition Date',
  society_name: 'Society / Organization Name',
  membership_number: 'Membership Number',
  position_grade: 'Grade / Position',
  contributions: 'Contributions',
  inventors_list: 'Inventors List',
  patent_status: 'Patent Status',
  working_model: 'Working Model Developed',
  prototype_developed: 'Prototype Developed',
  event_details: 'Event / Competition Details',
  participation_status: 'Participation Status / Awards',
  tenth_institution: '10th Institution',
  tenth_university: '10th Board',
  tenth_year: '10th Year',
  tenth_cgpa_percentage: '10th CGPA / %',
  twelfth_institution: '12th Institution',
  twelfth_university: '12th Board',
  twelfth_year: '12th Year',
  twelfth_cgpa_percentage: '12th CGPA / %',
  ug_degree: 'UG Degree',
  ug_specialization: 'UG Specialization',
  ug_institution: 'UG Institution',
  ug_university: 'UG University',
  ug_year: 'UG Year',
  ug_cgpa_percentage: 'UG CGPA / %',
  pg_degree: 'PG Degree',
  pg_specialization: 'PG Specialization',
  pg_institution: 'PG Institution',
  pg_university: 'PG University',
  pg_year: 'PG Year',
  pg_cgpa_percentage: 'PG CGPA / %',
  phd_title: 'Ph.D Title',
  phd_college: 'Ph.D College',
  phd_university: 'Ph.D University',
  phd_guide_name: 'Ph.D Guide Name',
  phd_status: 'Ph.D Status',
  phd_registration_year: 'Ph.D Reg. Year',
  phd_completion_year: 'Ph.D Completion Year',
  full_name: 'Full Name',
  date_of_birth: 'Date of Birth',
  gender: 'Gender',
  mobile_number: 'Mobile Number',
  email: 'Email',
  communication_address: 'Communication Address',
  permanent_address: 'Permanent Address',
  religion: 'Religion',
  community: 'Community',
  caste: 'Caste',
  post: 'Designation / Post',
  officialEmail: 'College Mail ID',
  personalEmail: 'Personal Mail ID',
  hasFellowship: 'Fellowship Received',
  fellowshipName: 'Fellowship Name',
  fellowshipAgency: 'Fellowship Agency',
  fellowshipAmount: 'Fellowship Amount (₹)',
  fellowshipDuration: 'Fellowship Duration',
  fellowshipDetails: 'Fellowship Details',
  company_name: 'Company / Organization Name',
  signed_on: 'Signed On Date',
  multidisciplinary: 'Multidisciplinary Details',
  coordinators_str: 'MOU Coordinators',
  departments_str: 'Participating Departments',
  mou_activities: 'MOU Activities',
  mou_copy_link: 'MOU Document Copy',
  course_code_and_name: 'Course Code & Name',
  activity_name: 'Activity Name',
  description: 'Description',
  image_file: 'TLP Proof Image',
  club_name: 'Club Name',
  event_name: 'Event Name',
  level: 'Level',
  student_coordinators: 'Student Coordinators',
  staff_coordinators: 'Staff Coordinators',
  participant_count: 'Participant Count',
  funded: 'Funded',
  fund_received: 'Fund Received (₹)',
  report_file: 'Club Activity Report',
  order_copy: 'Sanction / Order Copy',
  yearly_report: 'Yearly Progress Report',
  final_report: 'Final Completion Report',
  permission_letter_link: 'Permission Letter',
  certificate_link: 'Certificate Document',
  financial_proof_link: 'Financial Proof',
  programme_report_link: 'Programme Report',
  certificate_pdf: 'Certificate PDF',
  publication_link: 'Publication Link',
  sponsored_by: 'Sponsored By',
  documentation: 'Event Documentation',
  document_link: 'Document Link',
  photo_link: 'Event Photo',
  proof_link: 'Proof Link',
  proof_document: 'Proof Document',
  working_model_proof_link: 'Working Model Proof',
  prototype_proof_link: 'Prototype Proof',
  patent_proof_link: 'Patent Proof',
  mphil_degree: 'M.Phil Degree',
  mphil_specialization: 'M.Phil Specialization',
  mphil_institution: 'M.Phil Institution',
  mphil_university: 'M.Phil University',
  mphil_year: 'M.Phil Year',
  mphil_cgpa_percentage: 'M.Phil CGPA / %',
};

// Export to Excel Endpoint
router.post('/admin-panel/export-excel', attachUserIfAuth, async (req, res) => {
  try {
    const { viewMode, filters, data, columns } = req.body;
    const activeDept = resolveAuthorizedDepartment(req, filters?.department);
    const selectedActivity = filters?.activity;

    let filteredExportData = [];

    if (viewMode === 'activity' && selectedActivity && activityMappings[selectedActivity]) {
      // Fetch ACTUAL activity records directly from database for the selected activity
      const activityMapping = activityMappings[selectedActivity];
      let query = activityMapping.joinQuery.trim();
      const queryParams = [];
      const conditions = [];

      if (activeDept && activeDept !== 'null' && activeDept !== '') {
        conditions.push('(u.departmentId = ? OR d.departmentAcr = ? OR d.departmentName LIKE ?)');
        queryParams.push(activeDept, activeDept, `%${activeDept}%`);
      }

      if (filters?.staffName && filters.staffName.trim() !== '') {
        conditions.push('(u.userName LIKE ? OR u.userNumber LIKE ? OR CAST(u.userId AS CHAR) = ?)');
        queryParams.push(`%${filters.staffName.trim()}%`, `%${filters.staffName.trim()}%`, filters.staffName.trim());
      }


      const dateCol = activityMapping.dateColumn || 'created_at';
      if (filters?.fromDate && filters.fromDate.trim() !== '') {
        conditions.push(`DATE(${activityMapping.alias}.${dateCol}) >= ?`);
        queryParams.push(filters.fromDate.trim());
      }

      if (filters?.toDate && filters.toDate.trim() !== '') {
        conditions.push(`DATE(${activityMapping.alias}.${dateCol}) <= ?`);
        queryParams.push(filters.toDate.trim());
      }

      if (conditions.length > 0) {
        if (query.toLowerCase().includes('where')) {
          query += ` AND ${conditions.join(' AND ')}`;
        } else {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      query += ` ORDER BY ${activityMapping.alias}.${dateCol} DESC`;

      let rows = await sequelize.query(query, {
        replacements: queryParams,
        type: sequelize.QueryTypes.SELECT,
      });

      // Enrich with child records & normalize
      rows = await attachChildRecordsToRows(activityMapping.table, rows);
      filteredExportData = normalizeRowFiles(rows, activityMapping.table);
    } else {
      // Staff view export
      filteredExportData = Array.isArray(data) ? data : [];
    }

    const workbook = new ExcelJS.Workbook();
    const sheetTitle = viewMode === 'activity' ? (selectedActivity || 'Activity Report').slice(0, 31) : 'Staff Summary';
    const worksheet = workbook.addWorksheet(sheetTitle);

    if (viewMode === 'staff') {
      const staffColumns = [
        { header: 'SI No', key: 's_no', width: 10 },
        { header: 'Staff Name', key: 'username', width: 25 },
        { header: 'Staff ID', key: 'staffId', width: 18 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Activities Contributed', key: 'activities', width: 45 },
      ];

      worksheet.columns = staffColumns;

      const headerRow = worksheet.getRow(1);
      headerRow.height = 26;
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      filteredExportData.forEach((staff, idx) => {
        const row = worksheet.addRow({
          s_no: idx + 1,
          username: staff.username || staff.staff_name || 'Unknown',
          staffId: getValidVal(staff.staffId, staff.userNumber, staff.userId, staff.Userid),
          department: getValidVal(staff.department, staff.departmentAcr, staff.departmentName),
          email: staff.email || 'Unknown',
          activities: Array.isArray(staff.activities) ? staff.activities.join(', ') : 'None',
        });
        row.alignment = { vertical: 'top', horizontal: 'left' };
      });
    } else {
      // Activity Export Mode
      const activityMapping = activityMappings[selectedActivity];
      const defaultFields = ['s_no', 'staff_name', 'staff_id', 'department'];

      let exportCols = [];
      if (columns && Array.isArray(columns) && columns.length > 0) {
        exportCols = [...columns];
      } else if (activityMapping && Array.isArray(activityMapping.columns)) {
        exportCols = [...defaultFields, ...activityMapping.columns];
      } else {
        exportCols = [...defaultFields];
      }

      // Enforce common columns (SI No, Staff Name, Staff ID, Department) first, and Created/Updated Date last
      const excludeFirstAndLast = [...defaultFields, 'created_at', 'createdat', 'createdat', 'updated_at', 'updatedat', 'updatedat', 'id', 'userid', 'user_id', 'proof_available', 'proof_file_name'];
      const middleCols = exportCols.filter((c) => !excludeFirstAndLast.includes(c.toLowerCase()));
      exportCols = [...defaultFields, ...middleCols, 'created_at', 'updated_at'];
      exportCols = [...new Set(exportCols)];

      const excelColumns = exportCols.map((col) => {
        let headerTitle = excelHeaderTitleMap[col];
        if (!headerTitle) {
          headerTitle = col.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        }
        return {
          header: headerTitle,
          key: col,
          width: 24,
        };
      });

      worksheet.columns = excelColumns;

      // Header styling
      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      // Data Rows
      filteredExportData.forEach((item, index) => {
        const addedRow = worksheet.addRow({});
        addedRow.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

        exportCols.forEach((col) => {
          const colLower = col.toLowerCase();
          let rawVal;
          if (colLower === 's_no') {
            rawVal = item['s_no'] !== undefined ? item['s_no'] : index + 1;
          } else if (colLower === 'staff_name') {
            rawVal = getValidVal(item.staff_name, item.username, item.userName, item.full_name);
          } else if (colLower === 'staff_id') {
            rawVal = getValidVal(item.staff_id, item.staffId, item.userNumber, item.user_number, item.Userid, item.userId, item.user_id);
          } else if (colLower === 'department') {
            rawVal = getValidVal(item.department, item.departmentAcr, item.departmentName, item.Deptacronym);
          } else {
            // Flexible field value resolution
            rawVal = item[col] !== undefined ? item[col] : item[colLower];
            if (rawVal === undefined) {
              const camelKey = col.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
              rawVal = item[camelKey];
            }
          }

          let val = rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== '' ? rawVal : 'N/A';
          const strVal = String(val);

          const isFileCol =
            col === 'proof_file_name' ||
            colLower.includes('proof') ||
            colLower.includes('copy') ||
            colLower.includes('certificate') ||
            colLower.includes('file') ||
            colLower.includes('document') ||
            colLower.includes('link') ||
            colLower.includes('upload') ||
            strVal.startsWith('/Uploads') ||
            strVal.startsWith('http') ||
            /\.(pdf|png|jpg|jpeg|doc|docx)$/i.test(strVal);

          if (isFileCol && strVal !== 'N/A' && strVal !== '') {
            const host = req.get('host') || 'localhost:5173';
            const protocol = req.protocol || 'http';
            const origin = `${protocol}://${host}`;

            let cleanPath = strVal.replace(/\\/g, '/');
            let fullUrl = '';

            if (cleanPath.startsWith('http')) {
              fullUrl = cleanPath;
            } else {
              if (!cleanPath.startsWith('/')) {
                cleanPath = `/${cleanPath}`;
              }
              if (!cleanPath.startsWith('/institute_management_system')) {
                const prefix = cleanPath.startsWith('/uploads') || cleanPath.startsWith('/Uploads') || cleanPath.startsWith('/admin-panel') ? '' : '/uploads';
                cleanPath = `/institute_management_system${prefix}${cleanPath}`;
              }
              fullUrl = `${origin}${cleanPath}`;
            }

            let fileName = cleanPath.split('/').pop() || 'Proof';
            fileName = fileName.replace(/_/g, ' ').replace(/-/g, ' ');

            const cell = addedRow.getCell(col);
            cell.value = {
              text: `View Proof (${fileName})`,
              hyperlink: fullUrl,
              tooltip: `Click to open ${fileName}`
            };
            cell.font = { color: { argb: 'FF0000FF' }, underline: true };
          } else {
            addedRow.getCell(col).value = val;
          }
        });
      });
    }

    // Auto-fit column widths dynamically based on max line length
    worksheet.columns.forEach((column) => {
      let maxLen = column.header ? column.header.length : 12;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const cellStr = cell.value ? (typeof cell.value === 'object' ? cell.value.text || '' : String(cell.value)) : '';
        const lines = cellStr.split('\n');
        lines.forEach((l) => {
          if (l.length > maxLen) maxLen = l.length;
        });
      });
      column.width = Math.min(Math.max(maxLen + 4, 18), 55);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${viewMode === 'activity' ? (selectedActivity || 'activity').replace(/\s+/g, '_') : 'staff'}_report_${new Date().toISOString().split('T')[0]}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;


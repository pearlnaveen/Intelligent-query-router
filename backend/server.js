import express from 'express';
import { connectDB, sequelize } from './config/mysql.js';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import multer from 'multer';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import { 
  applyAssociations, 
  StudentPlacementInfo, 
  AttendedCompany, 
  BankDetails, 
  RelationDetails, 
  BookChapter, 
  BookChapterAuthor, 
  ConsultancyRelease, 
  FundedProjectRelease,
  Membership,
  ConferenceDetail,
  TlpActivity,
  Activity,
  MOU,
  ProjectMentor,
  PatentProduct
} from './models/index.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger.js';
import redisClient from './config/redis.js';
import { repairRecordsSchema } from './utils/repairRecordsSchema.js';
import holidayRoutes from './routes/admin/holidayRoutes.js';

// Import Routes
import leaveRoutes from './routes/student/leaveRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/admin/adminRoutes.js';
import tableRoutes from './routes/admin/tableRoutes.js';
import internRoutes from './routes/student/internshipRoutes.js';
import dashboardRoutes from './routes/student/DashboardRoutes.js';
import bulkRoutes from "./routes/admin/bulkRoutes.js";
import studentRoutes from "./routes/student/studentRoutes.js"
import locationRoutes from './routes/student/locationRoutes.js';
import activityRoutes from "./routes/admin/activityRoutes.js";
import ScholarshipRoutes from './routes/student/ScholarshipRoutes.js';
import eventRoutes from './routes/student/eventRoutes.js'
import eventAttendedRoutes from './routes/student/eventAttendedRoutes.js';
import OnlineCoursesRoutes from './routes/student/onlinecourseRoute.js'
import achievementRoutes from './routes/student/achievementRoutes.js'
import courseRoutes from './routes/student/CourseRoutes.js';
import biodataRoutes from './routes/student/bioDataRoutes.js';
import hackathonRoutes from './routes/student/hackathonRouts.js';
import extracurricularRoutes from "./routes/student/extracurricularRoutes.js";
import projectRoutes from "./routes/student/projectRoutes.js";
import publicationRoutes from "./routes/student/studentPublicationRoutes.js";
import nonCGPACategoryRoutes from "./routes/admin/nonCGPACategoryRoutes.js";
import CompetencyCoding from "./routes/student/competencyCodingRoutes.js";
import Noncgpa from "./routes/student/studentNonCGPARoutes.js";

import studentPdfRoutes from './routes/student/studentPdfRoutes.js';
// import skillRackRoutes from './routes/skillRackRoutes.js';

import certificationRoutes from './routes/staff/certificationRoutes.js';
import bookChapterRoutes from './routes/staff/bookChaptersRoutes.js';
import hIndexRoutes from './routes/staff/hindexRoutes.js';
import proposalsRoutes from './routes/staff/proposalRoutes.js';
import resourcePersonRoutes from './routes/staff/resourcePersonRoutes.js';
import seedMoneyRoutes from './routes/staff/seedMoneyRoutes.js';
import recognitionRoutes from './routes/staff/recognitionRoutes.js';
import membershipRoutes from './routes/staff/membershipRoutes.js';
import patentProductRoutes from './routes/staff/patentProductRoutes.js';
import projectMentorRoutes from './routes/staff/projectMentorRoutes.js';
import ScholarRoutes from './routes/staff/scholarRoutes.js';
import projectProposalRoutes from './routes/staff/fundedProjectRoutes.js';
import mouRoutes from './routes/staff/mouRoutes.js';
import StudentEducationRoutes from "./routes/student/educationRoutes.js";
import placementInfoRoutes from './routes/student/placementInfoRoutes.js';
import resumeGeneratorRoutes from "./routes/student/resumeGeneratorRoutes.js";
import resumeStaffRoutes from './routes/staff/resumeStaff.js';
import educationRoutes from './routes/staff/educationRoutes.js';

import adminPanelRoutes from './routes/adminPanelRoutes.js';
import staffIndustryRoutes from './routes/staff/industryRoutes.js';
import staffEventsRoutes from './routes/staff/eventsRoutes.js';
import staffEventsOrganizedRoutes from './routes/staff/eventsOrganizedRoutes.js';
import studentPanelRoutes from './routes/admin/studentPanelRoutes.js';
import certificateRoutes from "./routes/student/certificateRoutes.js";
import marksheetRoutes from "./routes/student/marksheetRoutes.js";

import facultyPublicRoutes from './routes/public/facultyRoutes.js';

import PersonalInfo from './routes/staff/personalRoutes.js';


import skillrackRoutes from "./routes/student/skillrackRoutes.js";
import studentStatusRoutes from "./routes/student/studentStatusRoutes.js";

// Activity Module Routes
import activityModuleRoutes from './routes/staff/activityRoutes.js';
import staffEventAttendedRoutes from './routes/staff/staffEventAttendedRoutes.js';
import activityApprovalRoutes from './routes/admin/activityApprovalRoutes.js';
import tlpRoutes from './routes/staff/tlpRoutes.js';
import tlpApprovalRoutes from './routes/admin/tlpApprovalRoutes.js';
import tlpPublicRoutes from './routes/public/tlpPublicRoutes.js';
import tlpCommentRoutes from './routes/public/tlpCommentRoutes.js';
import tlpCommentAdminRoutes from './routes/admin/tlpCommentAdminRoutes.js';


import adminRoleRoutes from './routes/adminRoutes.js';
import placementMainRoutes from './routes/placement/index.js';


import staffAttendanceRoutes from './routes/acadamic/staff/staffattendanceroutes.js';
import conferenceDetailRoutes from './routes/staff/conferenceDetailRoutes.js';
import fundingAgencyRoutes from './routes/staff/fundingAgencyRoutes.js';
import eventTypeRoutes from './routes/staff/eventTypeRoutes.js';
import certificationCourseMasterRoutes from './routes/staff/certificationCourseMasterRoutes.js';
import academicStaffRoutes from './routes/acadamic/staff/staffRoutes.js';



import { getStudentNptelEnrollments } from './controllers/acadamic/nptelStudentController.js';
import { authenticate } from './middlewares/requireauth.js';

//Acadamic
import { initDatabase } from './models/acadamic/index.js';
import AcadamicApp from './app.js';

dotenv.config();

const app = express();

// Trust proxy settings for Express to work correctly behind reverse proxies (Nginx/ALB/Cloudflare)
app.set('trust proxy', true);

const PORT = process.env.PORT || 5000;

// Connect to database and sync models
connectDB().then(async (connected) => {
  if (connected) {
    const syncMode = (process.env.DB_SYNC_MODE || 'none').toLowerCase();
    const shouldAlter = syncMode === 'alter';
    try {
      if (shouldAlter) {
        console.log('⏳ Syncing database models (DB_SYNC_MODE=alter)...');
        try {
          await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
          await sequelize.sync({ alter: true });
          console.log('✅ Database models synchronized successfully');
        } catch (alterErr) {
          console.warn('⚠️ Table alter sync warning (skipping alter sync):', alterErr.message);
          console.warn('👉 Tip: Set DB_SYNC_MODE=none in .env to disable alter table sync on production restarts.');
        }
      } else {
        console.log('⚡ DB_SYNC_MODE is "none": skipping alter table sync.');
      }

      // Apply safe, additive record schema updates on every server start.
      // This keeps deployed databases aligned after a code update.
      try {
        const additions = await repairRecordsSchema();
        console.log(additions ? `✅ Applied ${additions} record schema addition(s).` : '✅ Records schema is up to date.');
      } catch (schemaError) {
        console.error('❌ Failed to repair records schema:', schemaError.message);
      }

      // Ensure missing columns on staff_details table exist across all environments
      try {
        const columnsToAdd = [
          { name: 'designation', sql: "ALTER TABLE staff_details ADD COLUMN designation VARCHAR(150) NULL COMMENT 'Staff typed designation'" },
          { name: 'hasFellowship', sql: "ALTER TABLE staff_details ADD COLUMN hasFellowship VARCHAR(10) NULL DEFAULT 'No'" },
          { name: 'fellowshipName', sql: "ALTER TABLE staff_details ADD COLUMN fellowshipName VARCHAR(255) NULL" },
          { name: 'fellowshipAgency', sql: "ALTER TABLE staff_details ADD COLUMN fellowshipAgency VARCHAR(255) NULL" },
          { name: 'fellowshipAmount', sql: "ALTER TABLE staff_details ADD COLUMN fellowshipAmount DECIMAL(15, 2) NULL" },
          { name: 'fellowshipDuration', sql: "ALTER TABLE staff_details ADD COLUMN fellowshipDuration VARCHAR(100) NULL" },
          { name: 'fellowshipDetails', sql: "ALTER TABLE staff_details ADD COLUMN fellowshipDetails TEXT NULL" },
        ];

        for (const col of columnsToAdd) {
          const [cols] = await sequelize.query(`SHOW COLUMNS FROM staff_details LIKE '${col.name}'`);
          if (!cols || cols.length === 0) {
            await sequelize.query(col.sql);
            console.log(`✅ Added missing '${col.name}' column to staff_details table`);
          }
        }
      } catch (colErr) {
        console.error("Note checking/adding staff_details columns:", colErr.message);
      }

      // Ensure book_chapters and book_chapter_authors tables & columns exist across all environments
      try {
        await BookChapter.sync();
        await BookChapterAuthor.sync();
        await ConsultancyRelease.sync();
        await FundedProjectRelease.sync();
        await Membership.sync();
        await ConferenceDetail.sync();
        await TlpActivity.sync();
        await Activity.sync();
        await MOU.sync();
        await ProjectMentor.sync();
        await PatentProduct.sync();

        const bookChapterCols = [
          { name: 'published_month', sql: "ALTER TABLE book_chapters ADD COLUMN published_month VARCHAR(20) NULL" },
          { name: 'published_year', sql: "ALTER TABLE book_chapters ADD COLUMN published_year INT NULL" },
          { name: 'volume_no', sql: "ALTER TABLE book_chapters ADD COLUMN volume_no VARCHAR(50) NULL" },
          { name: 'issue_no', sql: "ALTER TABLE book_chapters ADD COLUMN issue_no VARCHAR(50) NULL" },
        ];

        for (const col of bookChapterCols) {
          const [cols] = await sequelize.query(`SHOW COLUMNS FROM book_chapters LIKE '${col.name}'`);
          if (!cols || cols.length === 0) {
            await sequelize.query(col.sql);
            console.log(`✅ Added missing '${col.name}' column to book_chapters table`);
          }
        }

        try {
          await sequelize.query("ALTER TABLE book_chapters MODIFY COLUMN publication_type VARCHAR(50) NOT NULL DEFAULT 'journal'");
          await sequelize.query("ALTER TABLE book_chapters MODIFY COLUMN index_type VARCHAR(50) NULL DEFAULT 'Scopus'");
          await sequelize.query("ALTER TABLE book_chapters MODIFY COLUMN publication_date DATE NULL");
        } catch (mErr) {
          // ignore column modification warnings
        }
      } catch (bcErr) {
        console.error("Note checking/adding book_chapters columns:", bcErr.message);
      }


      // Ensure missing columns in competency_coding, marksheet_statuses, events_organized, student_education_records, and StudentGrade exist
      try {
        const schemaPatches = [
          // competency_coding
          { table: 'competency_coding', name: 'career_objectives', sql: "ALTER TABLE `competency_coding` ADD COLUMN `career_objectives` VARCHAR(100) NULL COMMENT 'Core, Software, Higher Studies, Startup'" },
          { table: 'competency_coding', name: 'specialization_chosen', sql: "ALTER TABLE `competency_coding` ADD COLUMN `specialization_chosen` VARCHAR(255) NULL COMMENT 'Specialization chosen by student'" },
          { table: 'competency_coding', name: 'expected_ctc', sql: "ALTER TABLE `competency_coding` ADD COLUMN `expected_ctc` VARCHAR(100) NULL COMMENT 'Expected CTC'" },
          { table: 'competency_coding', name: 'communication_skills', sql: "ALTER TABLE `competency_coding` ADD COLUMN `communication_skills` VARCHAR(50) NULL COMMENT 'Low, Medium, High'" },

          // marksheet_statuses
          { table: 'marksheet_statuses', name: 'file_path', sql: "ALTER TABLE `marksheet_statuses` ADD COLUMN `file_path` VARCHAR(255) NULL" },
          { table: 'marksheet_statuses', name: 'file_name', sql: "ALTER TABLE `marksheet_statuses` ADD COLUMN `file_name` VARCHAR(255) NULL" },
          { table: 'marksheet_statuses', name: 'verification_status', sql: "ALTER TABLE `marksheet_statuses` ADD COLUMN `verification_status` ENUM('Pending', 'Approved', 'Rejected') NULL DEFAULT NULL" },
          { table: 'marksheet_statuses', name: 'verified_by', sql: "ALTER TABLE `marksheet_statuses` ADD COLUMN `verified_by` INT NULL" },
          { table: 'marksheet_statuses', name: 'verified_at', sql: "ALTER TABLE `marksheet_statuses` ADD COLUMN `verified_at` DATETIME NULL" },
          { table: 'marksheet_statuses', name: 'comments', sql: "ALTER TABLE `marksheet_statuses` ADD COLUMN `comments` TEXT NULL" },

          // events_organized
          { table: 'events_organized', name: 'with_funding', sql: "ALTER TABLE `events_organized` ADD COLUMN `with_funding` VARCHAR(10) NULL DEFAULT 'No'" },
          { table: 'events_organized', name: 'with_self_supporting', sql: "ALTER TABLE `events_organized` ADD COLUMN `with_self_supporting` VARCHAR(10) NULL DEFAULT 'No'" },
          { table: 'events_organized', name: 'document_link', sql: "ALTER TABLE `events_organized` ADD COLUMN `document_link` VARCHAR(500) NULL" },

          // student_education_records
          { table: 'student_education_records', name: 'degree_year_of_passing', sql: "ALTER TABLE `student_education_records` ADD COLUMN `degree_year_of_passing` INT NULL" },

          // StudentGrade
          { table: 'StudentGrade', name: 'semesterId', sql: "ALTER TABLE `StudentGrade` ADD COLUMN `semesterId` INT NULL" },
        ];

        for (const patch of schemaPatches) {
          try {
            const [tables] = await sequelize.query(`SHOW TABLES LIKE '${patch.table}'`);
            if (tables && tables.length > 0) {
              const [cols] = await sequelize.query(`SHOW COLUMNS FROM \`${patch.table}\` LIKE '${patch.name}'`);
              if (!cols || cols.length === 0) {
                await sequelize.query(patch.sql);
                console.log(`✅ Added missing '${patch.name}' column to ${patch.table} table`);
              }
            }
          } catch (itemErr) {
            console.warn(`Note checking column ${patch.table}.${patch.name}:`, itemErr.message);
          }
        }
      } catch (patchErr) {
        console.error("Note checking/adding missing schema columns:", patchErr.message);
      }

      // Ensure missing columns on resource_person & mou_activities tables exist across environments
      try {
        const rpCols = [
          { name: 'from_date', sql: "ALTER TABLE resource_person ADD COLUMN from_date DATE NULL" },
          { name: 'to_date', sql: "ALTER TABLE resource_person ADD COLUMN to_date DATE NULL" },
          { name: 'participants', sql: "ALTER TABLE resource_person ADD COLUMN participants INT NULL DEFAULT 0" },
        ];
        for (const col of rpCols) {
          const [cols] = await sequelize.query(`SHOW COLUMNS FROM resource_person LIKE '${col.name}'`);
          if (!cols || cols.length === 0) {
            await sequelize.query(col.sql);
          }
        }

        const mouActCols = [
          { name: 'from_date', sql: "ALTER TABLE mou_activities ADD COLUMN from_date DATE NULL" },
          { name: 'to_date', sql: "ALTER TABLE mou_activities ADD COLUMN to_date DATE NULL" },
          { name: 'resource_person_attended', sql: "ALTER TABLE mou_activities ADD COLUMN resource_person_attended VARCHAR(10) DEFAULT 'No'" },
          { name: 'rp_name', sql: "ALTER TABLE mou_activities ADD COLUMN rp_name VARCHAR(255) NULL" },
          { name: 'rp_organization', sql: "ALTER TABLE mou_activities ADD COLUMN rp_organization VARCHAR(255) NULL" },
          { name: 'rp_contact', sql: "ALTER TABLE mou_activities ADD COLUMN rp_contact VARCHAR(255) NULL" },
        ];
        for (const col of mouActCols) {
          const [cols] = await sequelize.query(`SHOW COLUMNS FROM mou_activities LIKE '${col.name}'`);
          if (!cols || cols.length === 0) {
            await sequelize.query(col.sql);
          }
        }
      } catch (extraErr) {
        console.error("Note checking/adding resource_person and mou_activities columns:", extraErr.message);
      }
      try {
        const rpCols = [
          { name: 'from_date', sql: "ALTER TABLE resource_person ADD COLUMN from_date DATE NULL" },
          { name: 'to_date', sql: "ALTER TABLE resource_person ADD COLUMN to_date DATE NULL" },
          { name: 'participants', sql: "ALTER TABLE resource_person ADD COLUMN participants INT NULL DEFAULT 0" },
        ];
        for (const col of rpCols) {
          const [cols] = await sequelize.query(`SHOW COLUMNS FROM resource_person LIKE '${col.name}'`);
          if (!cols || cols.length === 0) {
            await sequelize.query(col.sql);
          }
        }

        const mouActCols = [
          { name: 'from_date', sql: "ALTER TABLE mou_activities ADD COLUMN from_date DATE NULL" },
          { name: 'to_date', sql: "ALTER TABLE mou_activities ADD COLUMN to_date DATE NULL" },
          { name: 'resource_person_attended', sql: "ALTER TABLE mou_activities ADD COLUMN resource_person_attended VARCHAR(10) DEFAULT 'No'" },
          { name: 'rp_name', sql: "ALTER TABLE mou_activities ADD COLUMN rp_name VARCHAR(255) NULL" },
          { name: 'rp_organization', sql: "ALTER TABLE mou_activities ADD COLUMN rp_organization VARCHAR(255) NULL" },
          { name: 'rp_contact', sql: "ALTER TABLE mou_activities ADD COLUMN rp_contact VARCHAR(255) NULL" },
        ];
        for (const col of mouActCols) {
          const [cols] = await sequelize.query(`SHOW COLUMNS FROM mou_activities LIKE '${col.name}'`);
          if (!cols || cols.length === 0) {
            await sequelize.query(col.sql);
          }
        }
      } catch (extraErr) {
        console.error("Note checking/adding resource_person and mou_activities columns:", extraErr.message);
      }

      console.log('✅ Database models synchronized successfully');
    } catch (syncError) {
      console.error('❌ Failed to synchronize database models:', syncError);
    } finally {
      try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (fkeyErr) {
        console.error('Failed to re-enable FOREIGN_KEY_CHECKS:', fkeyErr.message);
      }
    }
  }
});

// Apply model associations
applyAssociations();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MySQL Connection Pool - EXPORTED for use in routes
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 100, // Expanded for 5000+ concurrency
  queueLimit: 0,
});

// Keep db as alias for backwards compatibility
const db = pool;

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password',
  },
});

// Base multer setup for general file uploads
const baseStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'Uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

const baseFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, and PDF files are allowed.'), false);
  }
  cb(null, true);
};

const baseUpload = multer({ storage: baseStorage, fileFilter: baseFileFilter });

// Feedback-specific multer setup
const feedbackStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'Uploads/feedback/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const feedbackFileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Only PDF, JPEG, and PNG files are allowed.'), false);
  }
  cb(null, true);
};

const feedbackUpload = multer({ storage: feedbackStorage, fileFilter: feedbackFileFilter });

//Acadamic

const startServer = async () => {
  // Initialize Academic DB (errors are non-fatal — server will still start)
  await initDatabase().catch(err => {
    console.warn('⚠️ Academic DB init warning (server will still start):', err.message);
  });

  // Academic app routes are mounted as middleware below.
};

startServer();

// middlewares
// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4000',
  'http://localhost:3000',
  'http://127.0.0.1:4000',
  'http://127.0.0.1:5173',
  'http://erp.nec.edu.in',
  'https://erp.nec.edu.in',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
     const isNecDomain = /^https?:\/\/([a-zA-Z0-9-]+\.)*nec\.edu\.in(:\d+)?$/.test(origin);

    if (isLocalhost || isNecDomain || allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
     console.warn(`⚠️ CORS blocked request from Origin: ${origin}`);
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  },
  credentials: true
}));
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Security Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Global Rate Limiting for all API requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => true, // Disable rate limit checks completely
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
});
app.use('/institute_management_system', apiLimiter);

// Request logging middlewares
app.use((req, res, next) => {
  logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static files
app.use('/institute_management_system/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/institute_management_system/Uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Test database connection
async function testConnection() {
  try {
    const connection = await db.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL database connection failed:', error.message);
    return false;
  }
}


// Route Registration
app.use(AcadamicApp); // Mount academic app routes and middlewares to the main app

// // Rewrite /institute_management_system/ requests to /institute_management_system/ as a fallback for routes not defined in AcadamicApp
// app.use((req, res, next) => {
//   if (req.url === '/institute_management_system') {
//     req.url = '/institute_management_system';
//   } else if (req.url.startsWith('/institute_management_system/')) {
//     req.url = req.url.replace('/institute_management_system/', '/institute_management_system/');
//   }
//   next();
// });

app.use('/institute_management_system/placement', placementMainRoutes);

app.use('/institute_management_system', dashboardRoutes);
app.use("/institute_management_system", biodataRoutes); // Moved up to prevent route collision
app.use("/institute_management_system/hackathon", hackathonRoutes);
app.use('/institute_management_system', authRoutes);
app.use('/institute_management_system', adminRoutes);
app.use('/institute_management_system', tableRoutes);
app.use('/institute_management_system', internRoutes);
app.use("/institute_management_system/bulk", bulkRoutes);
// NOTE: studentPdfRoutes should come AFTER studentRoutes to avoid route conflicts
// studentRoutes handles /institute_management_system/student (GET) and /institute_management_system/student/update (PUT)
// studentPdfRoutes handles /institute_management_system/student/generate-pdf/:userId, /institute_management_system/student/view-pdf/:userId, /institute_management_system/student/data/:userId
app.use("/institute_management_system", studentRoutes);
app.use("/institute_management_system", placementInfoRoutes);

app.use('/institute_management_system/student', studentPdfRoutes);
app.use('/institute_management_system/education', educationRoutes);
app.use("/institute_management_system/staff", PersonalInfo);
app.use('/institute_management_system/auth', authRoutes);

app.use('/institute_management_system/certifications', certificationRoutes);
app.use('/institute_management_system/book-chapters', bookChapterRoutes);
app.use('/institute_management_system/h-index', hIndexRoutes);
app.use('/institute_management_system/proposals', proposalsRoutes);
app.use('/institute_management_system/resource-person', resourcePersonRoutes);
app.use('/institute_management_system/seed-money', seedMoneyRoutes);
app.use('/institute_management_system/recognition', recognitionRoutes);
app.use('/institute_management_system/membership', membershipRoutes);
app.use('/institute_management_system/patent-product', patentProductRoutes);
app.use('/institute_management_system/project-mentors', projectMentorRoutes);
app.use('/institute_management_system/scholars', ScholarRoutes);
app.use('/institute_management_system/project-proposal', projectProposalRoutes); // also handles /institute_management_system/project-proposal/payment/*
app.use("/institute_management_system/skillrack", skillrackRoutes);
app.use("/institute_management_system/student-status", studentStatusRoutes);
app.use("/institute_management_system/student-education", StudentEducationRoutes);
app.use("/institute_management_system/extracurricular", extracurricularRoutes);
app.use("/institute_management_system/publications", publicationRoutes);
app.use("/institute_management_system/noncgpa-category", nonCGPACategoryRoutes);
app.use("/institute_management_system/competency-coding", CompetencyCoding);
app.use("/institute_management_system/noncgpa", Noncgpa);
app.use('/institute_management_system/industry', staffIndustryRoutes);
app.use('/institute_management_system/events', staffEventsRoutes);
app.use('/institute_management_system/events-organized', staffEventsOrganizedRoutes);
app.use('/institute_management_system/student/certificates', certificateRoutes);
app.use('/institute_management_system/student/marksheets', marksheetRoutes);
app.use('/institute_management_system/student-marksheets', marksheetRoutes);

// Admin Panel Routes
app.use('/institute_management_system', adminPanelRoutes);
app.use('/institute_management_system', studentPanelRoutes);
app.use("/institute_management_system/projects", projectRoutes);
// // Dummy routes to prevent dashboard and context 404s
// app.get('/institute_management_system/appraisals', (req, res) => res.json([]));
// app.get('/institute_management_system/industry', (req, res) => res.json([]));
// app.get('/institute_management_system/other/events-organized', (req, res) => res.json([]));
// app.get('/institute_management_system/nptel/admin/courses', (req, res) => res.json([]));
// // app.get('/institute_management_system/skillrack/my-record', (req, res) => res.json([]));
// // app.get('/institute_management_system/skillrack/my-stats', (req, res) => res.json({}));
// app.get('/institute_management_system/nptel/student/my-courses', (req, res) => res.json([]));
// app.get('/institute_management_system/pending-internships', (req, res) => res.json({ internships: [] }));
// app.get('/institute_management_system/pending-scholarships', (req, res) => res.json({ scholarships: [] }));
// app.get('/institute_management_system/event-organized/pending', (req, res) => res.json({ events: [] }));
// app.get('/institute_management_system/event-attended/pending', (req, res) => res.json({ events: [] }));
// app.get('/institute_management_system/all/pending-leaves', (req, res) => res.json({ leaves: [] }));
// app.get('/institute_management_system/pending-achievements', (req, res) => res.json({ achievements: [] }));
// app.get('/institute_management_system/publications/pending', (req, res) => res.json({ publications: [] }));
// app.get('/institute_management_system/competency-coding/pending', (req, res) => res.json({ competencyRecords: [] }));
// app.get('/institute_management_system/projects/pending', (req, res) => res.json({ projects: [] }));
// app.get('/institute_management_system/hackathon/pending', (req, res) => res.json({ events: [] }));
// app.get('/institute_management_system/extracurricular/pending', (req, res) => res.json({ activities: [] }));
// app.get('/institute_management_system/noncgpa/pending', (req, res) => res.json({ records: [] }));

app.use('/institute_management_system', locationRoutes);
app.use('/institute_management_system', activityRoutes);
app.use('/institute_management_system', ScholarshipRoutes);
app.use('/institute_management_system/event-organized', eventRoutes);
app.use('/institute_management_system/event-attended', eventAttendedRoutes);
app.use('/institute_management_system', leaveRoutes);
app.use('/institute_management_system', holidayRoutes);
app.use('/institute_management_system/online-courses', OnlineCoursesRoutes);
app.use('/institute_management_system', achievementRoutes);
app.use('/institute_management_system', courseRoutes);
// app.use("/institute_management_system", biodataRoutes); // Already moved up above
app.use('/institute_management_system/mou', mouRoutes);
app.use("/institute_management_system/student-certificate", certificateRoutes);
app.use("/institute_management_system/resume", resumeGeneratorRoutes);
app.use('/institute_management_system/resume-staff', resumeStaffRoutes);
app.use('/institute_management_system/admin', adminRoleRoutes);
app.use('/institute_management_system', placementMainRoutes);

// ============================================
// Activity Module Routes
// ============================================
app.use('/institute_management_system/activity', activityModuleRoutes);
app.use('/institute_management_system/admin/activity', activityApprovalRoutes);
app.use('/institute_management_system/staff/events-attended', staffEventAttendedRoutes);
// TLP Management routes
app.use('/institute_management_system/staff/tlp', tlpRoutes);
app.use('/institute_management_system/admin/tlp', tlpApprovalRoutes);
app.use('/institute_management_system/public/tlp', tlpPublicRoutes);
app.use('/institute_management_system/public/tlp', tlpCommentRoutes);
app.use('/institute_management_system/public/faculty', facultyPublicRoutes);
app.use('/institute_management_system/admin/tlp/comments', tlpCommentAdminRoutes);

app.use('/institute_management_system/staff/attendance', staffAttendanceRoutes);
app.use('/institute_management_system/staff/attendance-report', staffAttendanceRoutes);
app.use('/institute_management_system/conference-details', conferenceDetailRoutes);
app.use('/institute_management_system/funding-agencies', fundingAgencyRoutes);
app.use('/institute_management_system/certification-courses-master', certificationCourseMasterRoutes);
app.use('/institute_management_system/certification-courses', certificationCourseMasterRoutes);
app.use('/institute_management_system/event-types', eventTypeRoutes);


// Health check
app.get('/institute_management_system/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Error Handling middlewares
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    return res.status(400).json({ message: error.message });
  }

  console.error('Unhandled error:', error);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
  });
});

// 404 Handler
app.use((req, res) => {
  console.log(`⚠️ 404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found' });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DB_NAME || 'record2'}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the process using this port or set a different PORT in backend/.env.`);
    console.error('   Run: npx kill-port ' + PORT + '  OR  netstat -ano | findstr :' + PORT);
    process.exit(1);
  }
  throw error;
});

export default app;

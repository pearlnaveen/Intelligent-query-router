import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'record2',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
};

async function seed() {
  let connection;
  try {
    console.log('Connecting to database with config:', { ...dbConfig, password: '***' });
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL successfully.');

    await connection.beginTransaction();

    // 1) Clean existing placement data to ensure a fresh, predictable seed
    console.log('Clearing old placement data...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE feedback_rounds');
    await connection.query('TRUNCATE TABLE placement_feedback');
    await connection.query('TRUNCATE TABLE registered_student_placement');
    await connection.query('TRUNCATE TABLE upcomingdrives_placement');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // 2) Get some existing student details from student_details to register them
    const [students] = await connection.query(`
      SELECT sd.Userid as user_id, sd.registerNumber, sd.studentName, sd.batch, d.departmentAcr as department 
      FROM student_details sd
      JOIN departments d ON sd.departmentId = d.departmentId
    `);

    if (students.length === 0) {
      throw new Error('No students found in the database. Please ensure erpdata.sql is loaded.');
    }
    console.log(`Found ${students.length} students to register for placement drives.`);

    // 3) Create upcoming drives
    console.log('Seeding upcomingdrives_placement...');
    
    // Zoho drive
    const [zohoDriveResult] = await connection.query(`
      INSERT INTO upcomingdrives_placement 
        (company_name, batch, departments, tenth_percentage, twelfth_percentage, cgpa, history_of_arrears, standing_arrears, drive_date, drive_time, venue, salary, roles, Created_by, Updated_by, created_at, updated_at)
      VALUES 
        ('Zoho Corporation', '2023', '["CSE", "IT"]', 75.00, 75.00, 7.00, 0, 0, '2024-09-10', '09:00:00', 'NEC Seminar Hall', '8.5 LPA', '["Software Engineer", "Quality Assurance Engineer"]', 1, 1, NOW(), NOW())
    `);
    const zohoDriveId = zohoDriveResult.insertId;

    // TCS drive
    const [tcsDriveResult] = await connection.query(`
      INSERT INTO upcomingdrives_placement 
        (company_name, batch, departments, tenth_percentage, twelfth_percentage, cgpa, history_of_arrears, standing_arrears, drive_date, drive_time, venue, salary, roles, Created_by, Updated_by, created_at, updated_at)
      VALUES 
        ('TCS', '2023', '["CSE", "IT", "ECE", "MECH", "CIVIL"]', 60.00, 60.00, 6.00, 2, 0, '2024-10-15', '09:30:00', 'NEC Central Library Computing Lab', '3.6 LPA - 7.0 LPA', '["Ninja Developer", "Digital Developer"]', 1, 1, NOW(), NOW())
    `);
    const tcsDriveId = tcsDriveResult.insertId;

    // Accenture drive
    const [accentureDriveResult] = await connection.query(`
      INSERT INTO upcomingdrives_placement 
        (company_name, batch, departments, tenth_percentage, twelfth_percentage, cgpa, history_of_arrears, standing_arrears, drive_date, drive_time, venue, salary, roles, Created_by, Updated_by, created_at, updated_at)
      VALUES 
        ('Accenture', '2023', '["CSE", "IT", "ECE"]', 65.00, 65.00, 6.50, 0, 0, '2024-11-20', '10:00:00', 'NEC Main Block Auditorium', '4.5 LPA', '["Associate Software Engineer"]', 1, 1, NOW(), NOW())
    `);
    const accentureDriveId = accentureDriveResult.insertId;

    // Zoho upcoming drive for 2024 batch (so we can test upcoming drives)
    const [zohoUpcomingResult] = await connection.query(`
      INSERT INTO upcomingdrives_placement 
        (company_name, batch, departments, tenth_percentage, twelfth_percentage, cgpa, history_of_arrears, standing_arrears, drive_date, drive_time, venue, salary, roles, Created_by, Updated_by, created_at, updated_at)
      VALUES 
        ('Zoho Corporation', '2024', '["CSE", "IT", "AIDS"]', 75.00, 75.00, 7.00, 0, 0, '2026-10-12', '09:00:00', 'NEC Incubation Centre', '9.0 LPA', '["Software Developer", "Product Engineer"]', 1, 1, NOW(), NOW())
    `);

    // Cognizant upcoming drive for 2024 batch
    const [ctsUpcomingResult] = await connection.query(`
      INSERT INTO upcomingdrives_placement 
        (company_name, batch, departments, tenth_percentage, twelfth_percentage, cgpa, history_of_arrears, standing_arrears, drive_date, drive_time, venue, salary, roles, Created_by, Updated_by, created_at, updated_at)
      VALUES 
        ('Cognizant', '2024', '["CSE", "IT", "AIDS", "ECE"]', 60.00, 60.00, 6.00, 2, 0, '2026-11-05', '09:00:00', 'NEC Seminar Hall 2', '4.0 LPA', '["Programmer Analyst"]', 1, 1, NOW(), NOW())
    `);

    console.log('Seeding registered_student_placement...');
    
    // 4) Insert registrations and outcomes linked to actual students
    // We will distribute the students across Zoho and TCS to calculate statistics
    let placedCount = 0;
    
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const email = `${s.studentName.toLowerCase().replace(/\s+/g, '')}@nec.edu.in`;

      // Batch 2023 students register for 2023 drives
      if (s.batch === 2023) {
        // Register Student for Zoho Corporation
        if (i % 2 === 0) {
          // Every alternate student is registered for Zoho
          const placed = i % 4 === 0; // Every 4th student is placed at Zoho
          if (placed) placedCount++;

          await connection.query(`
            INSERT INTO registered_student_placement 
              (user_id, drive_id, registerNumber, username, college_email, personal_email, company_name, batch, department, status, current_round, placed, placement_package, placement_role, registration_date, updated_at)
            VALUES 
              (?, ?, ?, ?, ?, ?, 'Zoho Corporation', '2023', ?, ?, 4, ?, ?, ?, NOW(), NOW())
          `, [
            s.user_id, 
            zohoDriveId, 
            s.registerNumber, 
            s.studentName, 
            email, 
            email, 
            s.department, 
            placed ? 'Placed' : 'Rejected', 
            placed ? 1 : 0, 
            placed ? 8.50 : null, 
            placed ? 'Software Engineer' : null
          ]);
        }

        // Register everyone for TCS
        const placedTCS = i % 3 === 0 && i % 4 !== 0; // Some students placed at TCS (who are not already placed at Zoho)
        if (placedTCS) placedCount++;

        await connection.query(`
          INSERT INTO registered_student_placement 
            (user_id, drive_id, registerNumber, username, college_email, personal_email, company_name, batch, department, status, current_round, placed, placement_package, placement_role, registration_date, updated_at)
          VALUES 
            (?, ?, ?, ?, ?, ?, 'TCS', '2023', ?, ?, 3, ?, ?, ?, NOW(), NOW())
        `, [
          s.user_id, 
          tcsDriveId, 
          s.registerNumber, 
          s.studentName, 
          email, 
          email, 
          s.department, 
          placedTCS ? 'Placed' : 'Pending', 
          placedTCS ? 1 : 0, 
          placedTCS ? 4.00 : null, 
          placedTCS ? 'Ninja Developer' : null
        ]);
      } else if (s.batch === 2024) {
        // Batch 2024 registers for upcoming Zoho drive or CTS drive (but status is pending since drive is in future)
        if (i % 2 === 0) {
          await connection.query(`
            INSERT INTO registered_student_placement 
              (user_id, drive_id, registerNumber, username, college_email, personal_email, company_name, batch, department, status, current_round, placed, placement_package, placement_role, registration_date, updated_at)
            VALUES 
              (?, ?, ?, ?, ?, ?, 'Zoho Corporation', '2024', ?, 'Pending', 1, 0, null, null, NOW(), NOW())
          `, [s.user_id, zohoUpcomingResult.insertId, s.registerNumber, s.studentName, email, email, s.department]);
        } else {
          await connection.query(`
            INSERT INTO registered_student_placement 
              (user_id, drive_id, registerNumber, username, college_email, personal_email, company_name, batch, department, status, current_round, placed, placement_package, placement_role, registration_date, updated_at)
            VALUES 
              (?, ?, ?, ?, ?, ?, 'Cognizant', '2024', ?, 'Pending', 1, 0, null, null, NOW(), NOW())
          `, [s.user_id, ctsUpcomingResult.insertId, s.registerNumber, s.studentName, email, email, s.department]);
        }
      }
    }

    console.log('Seeding placement_feedback & feedback_rounds...');

    // 5) Add interview experience feedback for Zoho & TCS
    const cseStudents = students.filter(s => s.department === 'CSE' && s.batch === 2023);
    const itStudents = students.filter(s => s.department === 'IT' && s.batch === 2023);

    if (cseStudents.length > 0) {
      // Feedback from a placed CSE student at Zoho
      const s1 = cseStudents[0];
      const [feedbackResult] = await connection.query(`
        INSERT INTO placement_feedback 
          (student_id, registerNumber, student_name, course_branch, batch_year, company_name, industry_sector, job_role, work_location, ctc_fixed, ctc_variable, ctc_bonus, ctc_total, drive_mode, eligibility_criteria, total_rounds, overall_difficulty, online_test_platform, test_sections, test_questions_count, test_duration, memory_based_questions, coding_problems_links, technical_questions, hr_questions, tips_suggestions, company_expectations, final_outcome, process_difficulty_rating, company_communication_rating, overall_experience_rating, show_name_publicly, question_files, created_at, updated_at)
        VALUES 
          (?, ?, ?, 'B.E. CSE', '2023', 'Zoho Corporation', 'IT Products', 'Software Developer', 'Chennai', '8.0 LPA', '0.5 LPA', 'N/A', 8.50, 'On-Campus', 'No standing arrears, CGPA > 7.0', 4, 'Hard', 'HackerEarth', 'Aptitude, Basic Programming, Debugging', 25, '120 mins', 'Questions on arrays, string compression, and matrix rotation.', '[]', '1. Write code to detect and remove cycle in a linked list.\\n2. What is polymorphism and how does Java support dynamic binding?\\n3. Explain normalization in DBMS with examples.\\n4. Explain difference between SQL and NoSQL database.', '1. Tell me about yourself.\\n2. Why do you want to join Zoho instead of service-based companies?\\n3. Tell me about your final year project and your role in it.', 'Prepare core Data Structures (Trees, Graphs, Linked Lists) and Java OOPs thoroughly. Practice logical puzzles.', 'Strong problem-solving capability, coding accuracy, and good understanding of computer science fundamentals.', 'Placed', 4, 5, 5, 0, '[]', NOW(), NOW())
      `, [s1.user_id, s1.registerNumber, s1.studentName]);

      const feedbackId = feedbackResult.insertId;

      // Seed Zoho feedback rounds
      await connection.query(`
        INSERT INTO feedback_rounds (feedback_id, round_number, round_type, round_description, difficulty_level)
        VALUES 
          (?, 1, 'Aptitude & C Programming', 'Written test consisting of 20 mathematical aptitude questions and 10 C programming snippets to debug.', 'Medium'),
          (?, 2, 'Basic Coding Round', 'Solve 5 coding problems on basic logical puzzles and arrays on paper/editor. Focus on space-time complexity.', 'Medium'),
          (?, 3, 'Advanced Coding / Technical Interview', 'Solve 2 complex data structure problems (Matrix manipulation, tree traversal) and face core technical questions on OOPs and DBMS.', 'Hard'),
          (?, 4, 'HR Interview', 'General discussion about background, relocation, college life, and willingness to work at Zoho.', 'Easy')
      `, [feedbackId, feedbackId, feedbackId, feedbackId]);
    }

    if (itStudents.length > 0) {
      // Feedback from an IT student placed at TCS
      const s2 = itStudents[0];
      const [feedbackResult2] = await connection.query(`
        INSERT INTO placement_feedback 
          (student_id, registerNumber, student_name, course_branch, batch_year, company_name, industry_sector, job_role, work_location, ctc_fixed, ctc_variable, ctc_bonus, ctc_total, drive_mode, eligibility_criteria, total_rounds, overall_difficulty, online_test_platform, test_sections, test_questions_count, test_duration, memory_based_questions, coding_problems_links, technical_questions, hr_questions, tips_suggestions, company_expectations, final_outcome, process_difficulty_rating, company_communication_rating, overall_experience_rating, show_name_publicly, question_files, created_at, updated_at)
        VALUES 
          (?, ?, ?, 'B.Tech IT', '2023', 'TCS', 'IT Services', 'Ninja Developer', 'Kochi', '3.36 LPA', '0.24 LPA', 'N/A', 3.60, 'On-Campus', 'CGPA > 6.0, maximum 1 standing arrear allowed', 3, 'Medium', 'TCS iON', 'Aptitude, Verbal, Programming Logic, Coding', 40, '180 mins', 'Quantitative aptitude, paragraph ordering, finding outputs of simple pseudocodes.', '[]', '1. What is the difference between compiler and interpreter?\\n2. Write a program to reverse a string without using library functions.\\n3. Explain the difference between primary key and unique key in MySQL.', '1. Are you willing to work in night shifts or relocate?\\n2. What are your strengths and weaknesses?\\n3. Share an incident where you worked as a team to solve a problem.', 'Take Mock tests for TCS NQT aptitude section. Learn basic C/Python programming syntax.', 'Good communication skills, adaptability, and clear understanding of foundational IT concepts.', 'Placed', 3, 4, 4, 0, '[]', NOW(), NOW())
      `, [s2.user_id, s2.registerNumber, s2.studentName]);

      const feedbackId2 = feedbackResult2.insertId;

      // Seed TCS feedback rounds
      await connection.query(`
        INSERT INTO feedback_rounds (feedback_id, round_number, round_type, round_description, difficulty_level)
        VALUES 
          (?, 1, 'Online Test (TCS NQT)', 'Standard iON platform test. High weightage on quantitative aptitude, logical reasoning, and 2 simple coding questions.', 'Medium'),
          (?, 2, 'Technical Interview', 'Deep dive into resume projects, programming language of choice, and basic databases.', 'Medium'),
          (?, 3, 'HR & Managerial Interview', 'Behavioral round checking communication skills, cultural fit, and willingness to work shifts.', 'Easy')
      `, [feedbackId2, feedbackId2, feedbackId2]);
    }

    await connection.commit();
    console.log('✅ Seeding completed successfully!');
    return { success: true, message: 'Seeding completed successfully' };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export { seed };

if (process.argv[1] && process.argv[1].includes('seedPlacements.js')) {
  seed();
}

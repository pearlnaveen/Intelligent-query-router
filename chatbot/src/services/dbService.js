import pool from '../config/db.js';

/**
 * Clean up values to prevent display issues
 */
const formatCurrency = (val) => {
  if (val === null || val === undefined) return 'N/A';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return `${num.toFixed(2)} LPA`;
};

/**
 * Safe Database Query Service for Chatbot
 */
class DbService {
  /**
   * Helper to normalize department names
   */
  async getDepartmentId(deptAcr) {
    try {
      const [rows] = await pool.query(
        'SELECT departmentId FROM departments WHERE departmentAcr = ?',
        [deptAcr]
      );
      return rows.length > 0 ? rows[0].departmentId : null;
    } catch (error) {
      console.error('Error fetching department ID:', error);
      return null;
    }
  }

  /**
   * 1. Get Overall Placement Statistics
   */
  async getOverallPlacementStatistics(batchYear = '2023') {
    try {
      const batchStr = String(batchYear);
      // Uniquely placed count
      const [placedRows] = await pool.query(
        'SELECT COUNT(DISTINCT COALESCE(NULLIF(user_id, 0), NULLIF(registerNumber, ""), id)) as count FROM registered_student_placement WHERE batch = ? AND (placed = 1 OR placed = true OR status = "Placed")',
        [batchStr]
      );
      const placedCount = placedRows[0]?.count || 0;

      // Unique registered / participating count
      const [registeredRows] = await pool.query(
        'SELECT COUNT(DISTINCT COALESCE(NULLIF(user_id, 0), NULLIF(registerNumber, ""), id)) as count FROM registered_student_placement WHERE batch = ?',
        [batchStr]
      );
      const registeredCount = registeredRows[0]?.count || 0;

      // Total active students intake for the batch
      const [totalStudentsRows] = await pool.query(
        'SELECT COUNT(*) as count FROM student_details WHERE batch = ?',
        [batchStr]
      );
      let totalCount = totalStudentsRows[0]?.count || 0;

      if (totalCount < registeredCount) {
        totalCount = registeredCount;
      }

      return {
        batch: batchStr,
        placedCount,
        registeredCount,
        totalCount,
        percentParticipating: registeredCount > 0 ? ((placedCount / registeredCount) * 100).toFixed(1) : '0.0',
        percentTotal: totalCount > 0 ? ((placedCount / totalCount) * 100).toFixed(1) : '0.0'
      };
    } catch (error) {
      console.error('Error in getOverallPlacementStatistics:', error);
      throw error;
    }
  }

  /**
   * 2. Get Department-wise Placement Statistics
   */
  async getDepartmentPlacementStatistics(department, batchYear = '2023') {
    try {
      const batchStr = String(batchYear);
      // Uniquely placed count in department
      const [placedRows] = await pool.query(
        'SELECT COUNT(DISTINCT COALESCE(NULLIF(user_id, 0), NULLIF(registerNumber, ""), id)) as count FROM registered_student_placement WHERE batch = ? AND department = ? AND (placed = 1 OR placed = true OR status = "Placed")',
        [batchStr, department]
      );
      const placedCount = placedRows[0]?.count || 0;

      // Unique registered/participating count in department
      const [registeredRows] = await pool.query(
        'SELECT COUNT(DISTINCT COALESCE(NULLIF(user_id, 0), NULLIF(registerNumber, ""), id)) as count FROM registered_student_placement WHERE batch = ? AND department = ?',
        [batchStr, department]
      );
      const registeredCount = registeredRows[0]?.count || 0;

      // Total active students intake in department for the batch
      const deptId = await this.getDepartmentId(department);
      let totalCount = 0;
      if (deptId !== null) {
        const [totalStudentsRows] = await pool.query(
          'SELECT COUNT(*) as count FROM student_details WHERE batch = ? AND departmentId = ?',
          [batchStr, deptId]
        );
        totalCount = totalStudentsRows[0]?.count || 0;
      }

      if (totalCount < registeredCount) {
        totalCount = registeredCount;
      }

      return {
        batch: batchStr,
        department,
        placedCount,
        registeredCount,
        totalCount,
        percentParticipating: registeredCount > 0 ? ((placedCount / registeredCount) * 100).toFixed(1) : '0.0',
        percentTotal: totalCount > 0 ? ((placedCount / totalCount) * 100).toFixed(1) : '0.0'
      };
    } catch (error) {
      console.error('Error in getDepartmentPlacementStatistics:', error);
      throw error;
    }
  }

  /**
   * 3. Get Highest Package details
   */
  async getHighestPackage(filters = {}) {
    try {
      const { department, batch, company_name } = filters;
      let sql = 'SELECT MAX(placement_package) as max_package FROM registered_student_placement WHERE (placed = 1 OR placed = true OR status = "Placed")';
      const params = [];

      if (batch) {
        sql += ' AND batch = ?';
        params.push(String(batch));
      }
      if (department) {
        sql += ' AND department = ?';
        params.push(department);
      }
      if (company_name) {
        sql += ' AND company_name LIKE ?';
        params.push(`%${company_name}%`);
      }

      const [rows] = await pool.query(sql, params);
      const maxVal = rows[0]?.max_package;

      if (maxVal === null || maxVal === undefined) {
        return null;
      }

      // Fetch company and role details for this package
      let detailSql = 'SELECT DISTINCT company_name, placement_role, department, batch FROM registered_student_placement WHERE (placed = 1 OR placed = true OR status = "Placed") AND placement_package = ?';
      const detailParams = [maxVal];
      if (batch) {
        detailSql += ' AND batch = ?';
        detailParams.push(String(batch));
      }
      if (department) {
        detailSql += ' AND department = ?';
        detailParams.push(department);
      }
      const [detailRows] = await pool.query(detailSql, detailParams);

      return {
        maxPackage: maxVal,
        formattedPackage: formatCurrency(maxVal),
        placements: detailRows.map(r => ({
          company: r.company_name,
          role: r.placement_role || 'Software Developer',
          department: r.department,
          batch: r.batch
        }))
      };
    } catch (error) {
      console.error('Error in getHighestPackage:', error);
      throw error;
    }
  }

  /**
   * 4. Get Average Package
   */
  async getAveragePackage(filters = {}) {
    try {
      const { department, batch } = filters;
      let sql = 'SELECT AVG(placement_package) as avg_package FROM registered_student_placement WHERE (placed = 1 OR placed = true OR status = "Placed")';
      const params = [];

      if (batch) {
        sql += ' AND batch = ?';
        params.push(String(batch));
      }
      if (department) {
        sql += ' AND department = ?';
        params.push(department);
      }

      const [rows] = await pool.query(sql, params);
      const avgVal = rows[0]?.avg_package;

      if (avgVal === null || avgVal === undefined) {
        return null;
      }

      return {
        avgPackage: parseFloat(avgVal),
        formattedPackage: formatCurrency(avgVal)
      };
    } catch (error) {
      console.error('Error in getAveragePackage:', error);
      throw error;
    }
  }

  /**
   * 5. Get Recruiting Companies list
   */
  async getRecruitingCompanies(filters = {}) {
    try {
      const { department, batch } = filters;
      let sql = 'SELECT DISTINCT company_name FROM registered_student_placement WHERE (placed = 1 OR placed = true OR status = "Placed")';
      const params = [];

      if (batch) {
        sql += ' AND batch = ?';
        params.push(String(batch));
      }
      if (department) {
        sql += ' AND department = ?';
        params.push(department);
      }

      sql += ' ORDER BY company_name ASC';

      const [rows] = await pool.query(sql, params);
      return rows.map(r => r.company_name);
    } catch (error) {
      console.error('Error in getRecruitingCompanies:', error);
      throw error;
    }
  }

  /**
   * 6. Get Upcoming Placement Drives
   */
  async getUpcomingDrives(filters = {}) {
    try {
      const { department, batch } = filters;
      // In production we filter where drive_date >= CURRENT_DATE, but for seed testing we show all drives
      let sql = 'SELECT id, company_name, batch, departments, salary, roles, drive_date, drive_time, venue FROM upcomingdrives_placement';
      const params = [];

      if (batch) {
        sql += ' WHERE batch = ?';
        params.push(batch);
      }

      sql += ' ORDER BY drive_date ASC';
      const [rows] = await pool.query(sql, params);

      // Map rows and filter by department in memory because departments is stored as text list like ["CSE", "IT"]
      let matchedDrives = rows.map(d => {
        let depts = [];
        try {
          depts = JSON.parse(d.departments);
        } catch {
          depts = d.departments ? d.departments.split(',').map(s => s.trim()) : [];
        }
        return {
          id: d.id,
          company: d.company_name,
          batch: d.batch,
          departments: depts,
          salary: d.salary,
          roles: d.roles,
          date: d.drive_date,
          time: d.drive_time,
          venue: d.venue
        };
      });

      if (department) {
        matchedDrives = matchedDrives.filter(d => 
          d.departments.some(dep => dep.toUpperCase() === department.toUpperCase())
        );
      }

      return matchedDrives;
    } catch (error) {
      console.error('Error in getUpcomingDrives:', error);
      throw error;
    }
  }

  /**
   * 7. Get aggregated company interview experiences (Privacy safe: no student info)
   */
  async getCompanyInterviewFeedback(companyName) {
    try {
      // Find matching feedback records
      const [feedbackRows] = await pool.query(`
        SELECT id, course_branch, batch_year, company_name, job_role, work_location, ctc_total, 
               drive_mode, eligibility_criteria, total_rounds, overall_difficulty, online_test_platform, 
               test_sections, memory_based_questions, technical_questions, hr_questions, tips_suggestions, company_expectations
        FROM placement_feedback
        WHERE company_name LIKE ?
      `, [`%${companyName}%`]);

      if (feedbackRows.length === 0) {
        return null;
      }

      const aggregatedFeedback = [];

      for (const fb of feedbackRows) {
        // Fetch round details
        const [rounds] = await pool.query(`
          SELECT round_number, round_type, round_description, difficulty_level
          FROM feedback_rounds
          WHERE feedback_id = ?
          ORDER BY round_number ASC
        `, [fb.id]);

        aggregatedFeedback.push({
          role: fb.job_role,
          batch: fb.batch_year,
          difficulty: fb.overall_difficulty,
          roundsCount: fb.total_rounds,
          eligibility: fb.eligibility_criteria,
          testPlatform: fb.online_test_platform,
          testSections: fb.test_sections,
          memoryQuestions: fb.memory_based_questions,
          technicalQuestions: fb.technical_questions,
          hrQuestions: fb.hr_questions,
          tips: fb.tips_suggestions,
          expectations: fb.company_expectations,
          roundsList: rounds.map(r => ({
            number: r.round_number,
            type: r.round_type,
            description: r.round_description,
            difficulty: r.difficulty_level
          }))
        });
      }

      return {
        company: feedbackRows[0].company_name,
        experiences: aggregatedFeedback
      };
    } catch (error) {
      console.error('Error in getCompanyInterviewFeedback:', error);
      throw error;
    }
  }
}

export default new DbService();

import { queryReadOnly } from '../config/db.js';

class DbServiceLogin {
  // ----------------------------------------------------
  // 1. STUDENT SPECIFIC QUERIES (Filtered by regno)
  // ----------------------------------------------------

  /**
   * Overall Day Attendance for a specific student
   */
  async getStudentOverallAttendance(regno) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT COUNT(*) as totalDays, 
                SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as daysPresent,
                SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as daysAbsent
         FROM DayAttendance WHERE regno = ?`,
        [regno]
      );
      const totalDays = Number(rows[0]?.totalDays || 0);
      const daysPresent = Number(rows[0]?.daysPresent || 0);
      const daysAbsent = Number(rows[0]?.daysAbsent || 0);
      const percentage = totalDays > 0 ? Number(((daysPresent / totalDays) * 100).toFixed(1)) : 0;

      return {
        regno,
        totalDays,
        daysPresent,
        daysAbsent,
        percentage,
        isEligible: percentage >= 75
      };
    } catch (error) {
      console.error('Error in getStudentOverallAttendance:', error);
      throw error;
    }
  }

  /**
   * Subject-wise Period Attendance for a student (Filtered by active course enrollment if enrolled)
   */
  async getStudentSubjectwiseAttendance(regno) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT pa.courseId, c.courseCode, c.courseTitle,
                COUNT(pa.periodAttendanceId) as totalPeriods,
                SUM(CASE WHEN pa.status IN ('P','OD') THEN 1 ELSE 0 END) as presentPeriods
         FROM PeriodAttendance pa
         JOIN Course c ON pa.courseId = c.courseId
         WHERE pa.regno = ?
           AND (
             EXISTS (SELECT 1 FROM StudentCourse sc WHERE sc.regno = pa.regno AND sc.courseId = pa.courseId)
             OR NOT EXISTS (SELECT 1 FROM StudentCourse sc WHERE sc.regno = pa.regno)
           )
         GROUP BY pa.courseId, c.courseCode, c.courseTitle
         ORDER BY presentPeriods / NULLIF(totalPeriods, 0) DESC`,
        [regno]
      );

      return rows.map(r => {
        const total = Number(r.totalPeriods || 0);
        const present = Number(r.presentPeriods || 0);
        return {
          courseId: r.courseId,
          courseCode: r.courseCode || 'N/A',
          courseTitle: r.courseTitle || 'Course',
          totalPeriods: total,
          presentPeriods: present,
          percentage: total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0
        };
      });
    } catch (error) {
      console.error('Error in getStudentSubjectwiseAttendance:', error);
      throw error;
    }
  }

  /**
   * CGPA and Semester GPA for a student (with Cumulative Credits & Semester Filter support)
   */
  async getStudentCGPAAndGPA(regno, targetSem = null) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT sg.studentGPAId, sg.regno, sg.semesterId, sg.gpa, sg.cgpa, sg.earnedCredits, sg.totalCredits,
                sg.cumulativeEarnedCredits, sg.cumulativeTotalCredits, sg.cumulativeQualityPoints,
                s.semesterNumber
         FROM StudentSemesterGPA sg
         LEFT JOIN semester s ON sg.semesterId = s.semesterId
         WHERE sg.regno = ?
         ORDER BY s.semesterNumber DESC, sg.semesterId DESC`,
        [regno]
      );

      if (rows.length === 0) return null;

      const latest = rows[0];

      let totalEarnedSum = 0;
      let totalCreditsSum = 0;
      let totalQualitySum = 0;

      rows.forEach(r => {
        const eCredits = Number(r.earnedCredits || 0);
        const tCredits = Number(r.totalCredits || 0);
        const g = Number(r.gpa || r.cgpa || 0);
        totalEarnedSum += eCredits;
        totalCreditsSum += tCredits;
        totalQualitySum += (g * tCredits);
      });

      let currentCGPA = latest.cgpa ? Number(latest.cgpa) : null;
      if (!currentCGPA && totalCreditsSum > 0) {
        currentCGPA = Number((totalQualitySum / totalCreditsSum).toFixed(2));
      }
      if (!currentCGPA) {
        currentCGPA = latest.gpa ? Number(latest.gpa) : 0;
      }

      const overallEarnedCredits = latest.cumulativeEarnedCredits 
        ? Number(latest.cumulativeEarnedCredits) 
        : totalEarnedSum;

      const overallTotalCredits = latest.cumulativeTotalCredits 
        ? Number(latest.cumulativeTotalCredits) 
        : totalCreditsSum;

      let specificSemData = null;
      if (targetSem !== null) {
        const semNum = Number(targetSem);
        specificSemData = rows.find(r => Number(r.semesterNumber) === semNum || Number(r.semesterId) === semNum);
      }

      return {
        regno,
        currentCGPA,
        overallEarnedCredits,
        overallTotalCredits,
        latestSemester: latest.semesterNumber || 1,
        latestGPA: latest.gpa ? Number(latest.gpa) : null,
        specificSemData: specificSemData ? {
          semesterNumber: specificSemData.semesterNumber || targetSem,
          gpa: specificSemData.gpa ? Number(specificSemData.gpa) : null,
          cgpa: specificSemData.cgpa ? Number(specificSemData.cgpa) : null,
          earnedCredits: specificSemData.earnedCredits ? Number(specificSemData.earnedCredits) : null,
          totalCredits: specificSemData.totalCredits ? Number(specificSemData.totalCredits) : null
        } : null,
        history: rows.map(r => ({
          semesterNumber: r.semesterNumber || r.semesterId,
          gpa: r.gpa ? Number(r.gpa) : null,
          cgpa: r.cgpa ? Number(r.cgpa) : null,
          earnedCredits: r.earnedCredits ? Number(r.earnedCredits) : null,
          totalCredits: r.totalCredits ? Number(r.totalCredits) : null
        }))
      };
    } catch (error) {
      console.error('Error in getStudentCGPAAndGPA:', error);
      throw error;
    }
  }

  /**
   * Enrolled Courses for a student
   */
  async getStudentEnrolledCourses(regno) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT DISTINCT sc.courseId, c.courseCode, c.courseTitle, c.credits, c.category, c.type, sec.sectionName
         FROM StudentCourse sc
         JOIN Course c ON sc.courseId = c.courseId
         LEFT JOIN Section sec ON sc.sectionId = sec.sectionId
         WHERE sc.regno = ?
         ORDER BY c.courseCode ASC`,
        [regno]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentEnrolledCourses:', error);
      throw error;
    }
  }

  /**
   * Today's Timetable for a student
   */
  async getStudentTimetable(regno, dayOfWeek = null) {
    try {
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const targetDay = dayOfWeek ? dayOfWeek.toUpperCase() : days[new Date().getDay()];

      const [rows] = await queryReadOnly(
        `SELECT t.periodNumber, t.dayOfWeek, c.courseCode, c.courseTitle, sec.sectionName
         FROM StudentCourse sc
         JOIN Timetable t ON sc.courseId = t.courseId AND sc.sectionId = t.sectionId
         JOIN Course c ON t.courseId = c.courseId
         LEFT JOIN Section sec ON t.sectionId = sec.sectionId
         WHERE sc.regno = ? AND t.dayOfWeek = ? AND t.isActive = 'YES'
         ORDER BY t.periodNumber ASC`,
        [regno, targetDay]
      );
      return { day: targetDay, schedule: rows };
    } catch (error) {
      console.error('Error in getStudentTimetable:', error);
      throw error;
    }
  }

  /**
   * Student Course Outcome (CO) Marks
   */
  async getStudentCOMarks(regno) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT scm.coId, scm.consolidatedMark
         FROM StudentCOMarks scm
         WHERE scm.regno = ?`,
        [regno]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentCOMarks:', error);
      throw error;
    }
  }

  /**
   * Student Profile Data
   */
  async getStudentProfile(regno) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT sd.studentName, sd.registerNumber, sd.batch, sd.semester, sd.section,
                d.departmentName, d.departmentAcr, sd.personal_email, sd.student_type
         FROM student_details sd
         LEFT JOIN departments d ON sd.departmentId = d.departmentId
         WHERE sd.registerNumber = ?`,
        [regno]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error in getStudentProfile:', error);
      throw error;
    }
  }

  /**
   * Online Courses & NPTEL for a student
   */
  async getStudentOnlineCoursesAndNPTEL(userId, regno) {
    try {
      const [onlineRows] = await queryReadOnly(
        `SELECT id, course_name, type, provider_name, instructor_name, status, pending, tutor_approval_status, created_at
         FROM online_courses
         WHERE userid = ? OR created_by = ?
         ORDER BY id DESC`,
        [userId, userId]
      );

      const [nptelRows] = await queryReadOnly(
        `SELECT sn.id, sn.status, sn.assessment_marks, sn.exam_marks, sn.total_marks, sn.grade, sn.credit_transfer, sn.pending,
                nc.course_name, nc.provider_name, nc.instructor_name, nc.weeks, nc.department
         FROM student_nptel sn
         JOIN nptel_courses nc ON sn.course_id = nc.id
         WHERE sn.Userid = ?
         ORDER BY sn.id DESC`,
        [userId]
      );

      return {
        onlineCourses: onlineRows || [],
        nptelCourses: nptelRows || []
      };
    } catch (error) {
      console.error('Error in getStudentOnlineCoursesAndNPTEL:', error);
      return { onlineCourses: [], nptelCourses: [] };
    }
  }

  /**
   * Certifications for a student
   */
  async getStudentCertifications(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, certificate_type, certificate_name, verification_status, created_at
         FROM certificates
         WHERE userid = ?
         ORDER BY id DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentCertifications:', error);
      return [];
    }
  }

  /**
   * Internships for a student
   */
  async getStudentInternships(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, provider_name, domain, mode, start_date, end_date, status, stipend_amount, tutor_approval_status, pending
         FROM internships
         WHERE Userid = ?
         ORDER BY id DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentInternships:', error);
      return [];
    }
  }

  /**
   * Scholarships for a student
   */
  async getStudentScholarships(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, name, provider, type, year, status, appliedDate, receivedAmount, receivedDate, tutor_approval_status
         FROM scholarships
         WHERE Userid = ?
         ORDER BY id DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentScholarships:', error);
      return [];
    }
  }

  /**
   * Leave Requests for a student
   */
  async getStudentLeaveRequests(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, leave_type, start_date, end_date, reason, leave_status, tutor_approval_status
         FROM student_leave
         WHERE userid = ?
         ORDER BY id DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentLeaveRequests:', error);
      return [];
    }
  }

  /**
   * Hackathons for a student
   */
  async getStudentHackathons(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, event_name, organized_by, from_date, to_date, level_cleared, rounds, status, tutor_approval_status
         FROM hackathon_events
         WHERE Userid = ?
         ORDER BY id DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentHackathons:', error);
      return [];
    }
  }

  /**
   * Extracurricular activities for a student
   */
  async getStudentExtracurricular(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, type, level, from_date, to_date, status, prize, amount, description, tutor_approval_status
         FROM extracurricular_activities
         WHERE Userid = ?
         ORDER BY id DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentExtracurricular:', error);
      return [];
    }
  }

  /**
   * Projects for a student
   */
  async getStudentProjects(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, title, domain, link, description, techstack, start_date, end_date, github_link, status, rating, tutor_approval_status
         FROM student_projects
         WHERE Userid = ?
         ORDER BY id DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentProjects:', error);
      return [];
    }
  }

  /**
   * Competency & Coding for a student
   */
  async getStudentCompetencyCoding(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT present_competency, competency_level, gaps, gaps_description, steps, career_objectives, specialization_chosen, expected_ctc, communication_skills
         FROM competency_coding
         WHERE Userid = ?`,
        [userId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error in getStudentCompetencyCoding:', error);
      return null;
    }
  }

  /**
   * Skillrack details for a student
   */
  async getStudentSkillrack(userId, regno) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT total_programs_solved, level_1, level_2, level_3, level_4, level_5, level_6, daily_challenge, daily_test, aptitude_score, points, gold_medals, silver_medals, bronze_medals, skillrack_rank, c_programs, cpp_programs, java_programs, python_programs, sql_programs
         FROM skillrack
         WHERE Userid = ? OR registerNumber = ?`,
        [userId, regno]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error in getStudentSkillrack:', error);
      return null;
    }
  }

  /**
   * Publications for a student
   */
  async getStudentPublications(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, publication_type, publication_name, title, authors, index_type, doi, publisher, publication_status
         FROM student_publications
         WHERE Userid = ?
         ORDER BY id DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentPublications:', error);
      return [];
    }
  }

  /**
   * Non-CGPA courses for a student
   */
  async getStudentNonCGPA(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT sn.id, sn.category_no, sn.course_code, sn.course_name, sn.from_date, sn.to_date, sn.no_of_days, sn.pending, nc.course_name as category_course_name
         FROM student_noncgpa sn
         LEFT JOIN noncgpa_category nc ON sn.category_id = nc.id
         WHERE sn.Userid = ?
         ORDER BY sn.id DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentNonCGPA:', error);
      return [];
    }
  }

  /**
   * Class attendance percentage for a department & year/semester (Staff query)
   */
  async getStaffDepartmentClassAttendance({ department = 'CSE', year = null, semester = null, timeframe = 'today' }) {
    try {
      let targetSems = [];
      if (semester) {
        targetSems = [Number(semester)];
      } else if (year) {
        const yr = Number(year);
        if (yr === 1) targetSems = [1, 2];
        else if (yr === 2) targetSems = [3, 4];
        else if (yr === 3) targetSems = [5, 6];
        else if (yr === 4) targetSems = [7, 8];
      }

      let semClause = '';
      if (targetSems.length > 0) {
        semClause = ` AND sd.semester IN (${targetSems.join(',')})`;
      }

      let dateClause = '';
      if (timeframe === 'today') {
        dateClause = ` AND (DATE(da.attendanceDate) = CURDATE() OR da.attendanceDate = (SELECT MAX(attendanceDate) FROM DayAttendance))`;
      } else if (timeframe === 'month') {
        dateClause = ` AND MONTH(da.attendanceDate) = MONTH(CURDATE()) AND YEAR(da.attendanceDate) = YEAR(CURDATE())`;
      }

      const [rows] = await queryReadOnly(
        `SELECT COUNT(DISTINCT da.regno) as totalStudents,
                COUNT(da.dayAttendanceId) as totalRecords,
                SUM(CASE WHEN da.status = 'P' THEN 1 ELSE 0 END) as presentDays,
                SUM(CASE WHEN da.status = 'A' THEN 1 ELSE 0 END) as absentDays,
                MAX(da.attendanceDate) as latestDate
         FROM DayAttendance da
         JOIN student_details sd ON da.regno = sd.registerNumber
         JOIN departments d ON sd.departmentId = d.departmentId
         WHERE (d.departmentAcr LIKE ? OR d.departmentName LIKE ?)${semClause}${dateClause}`,
        [`%${department}%`, `%${department}%`]
      );

      const totalRecords = Number(rows[0]?.totalRecords || 0);
      const presentDays = Number(rows[0]?.presentDays || 0);
      const absentDays = Number(rows[0]?.absentDays || 0);
      const percentage = totalRecords > 0 ? Number(((presentDays / totalRecords) * 100).toFixed(1)) : 0;

      return {
        department,
        year: year || (semester ? `Sem ${semester}` : 'All Years'),
        timeframe,
        totalStudents: Number(rows[0]?.totalStudents || 0),
        totalRecords,
        presentDays,
        absentDays,
        percentage,
        latestDate: rows[0]?.latestDate || null
      };
    } catch (error) {
      console.error('Error in getStaffDepartmentClassAttendance:', error);
      return { department, year, timeframe, totalStudents: 0, totalRecords: 0, presentDays: 0, absentDays: 0, percentage: 0, latestDate: null };
    }
  }

  /**
   * Ranking of students based on CGPA for a department & year (Staff query)
   */
  async getStaffStudentCGPARanking({ department = 'CSE', year = null, semester = null, limit = 15 }) {
    try {
      let targetSems = [];
      if (semester) {
        targetSems = [Number(semester)];
      } else if (year) {
        const yr = Number(year);
        if (yr === 1) targetSems = [1, 2];
        else if (yr === 2) targetSems = [3, 4];
        else if (yr === 3) targetSems = [5, 6];
        else if (yr === 4) targetSems = [7, 8];
      }

      let semClause = '';
      if (targetSems.length > 0) {
        semClause = ` AND sd.semester IN (${targetSems.join(',')})`;
      }

      const [rows] = await queryReadOnly(
        `SELECT sd.registerNumber, sd.studentName, d.departmentAcr, sd.semester, sd.batch,
                sg.gpa, COALESCE(sg.cgpa, sg.gpa) as finalCgpa,
                sg.cumulativeEarnedCredits, sg.earnedCredits
         FROM student_details sd
         JOIN departments d ON sd.departmentId = d.departmentId
         JOIN (
           SELECT regno, MAX(studentGPAId) as latestGpaId
           FROM StudentSemesterGPA
           GROUP BY regno
         ) latest ON sd.registerNumber = latest.regno
         JOIN StudentSemesterGPA sg ON latest.latestGpaId = sg.studentGPAId
         WHERE (d.departmentAcr LIKE ? OR d.departmentName LIKE ?)${semClause}
         ORDER BY CAST(COALESCE(sg.cgpa, sg.gpa) AS DECIMAL(4,2)) DESC, CAST(sg.cumulativeEarnedCredits AS DECIMAL(5,2)) DESC
         LIMIT ?`,
        [`%${department}%`, `%${department}%`, Number(limit)]
      );

      return rows.map((r, index) => ({
        rank: index + 1,
        registerNumber: r.registerNumber,
        studentName: r.studentName || 'Student',
        department: r.departmentAcr,
        semester: r.semester,
        batch: r.batch,
        cgpa: r.finalCgpa ? Number(r.finalCgpa) : 0,
        gpa: r.gpa ? Number(r.gpa) : 0,
        cumulativeEarnedCredits: r.cumulativeEarnedCredits ? Number(r.cumulativeEarnedCredits) : 0
      }));
    } catch (error) {
      console.error('Error in getStaffStudentCGPARanking:', error);
      return [];
    }
  }

  /**
   * Education details for a student
   */
  async getStudentEducation(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT tenth_school_name, tenth_board, tenth_percentage, tenth_year_of_passing,
                twelfth_school_name, twelfth_board, twelfth_percentage, twelfth_year_of_passing,
                degree_institution_name, degree_name, degree_specialization, cgpa
         FROM student_education_records
         WHERE Userid = ?`,
        [userId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error in getStudentEducation:', error);
      return null;
    }
  }

  /**
   * Events Attended for a student
   */
  async getStudentEventsAttended(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, event_name, description, event_type, type_of_event, institution_name, mode, city, from_date, to_date, participation_status
         FROM event_attended
         WHERE userid = ?
         ORDER BY id DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentEventsAttended:', error);
      return [];
    }
  }

  /**
   * Events Organized for a student
   */
  async getStudentEventsOrganized(userId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, event_name, club_name, role, start_date, end_date, number_of_participants, funding_amount
         FROM events_organized_student
         WHERE Userid = ?
         ORDER BY id DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStudentEventsOrganized:', error);
      return [];
    }
  }

  /**
   * Placement details for a student
   */
  async getStudentPlacementInfo(userId) {
    try {
      const [infoRows] = await queryReadOnly(
        `SELECT career_objective, specialization, dream_company, expected_ctc
         FROM student_placement_infos
         WHERE Userid = ?`,
        [userId]
      );
      const [attendedRows] = await queryReadOnly(
        `SELECT company_name, rounds_cleared, status
         FROM student_attended_companies
         WHERE Userid = ?
         ORDER BY id DESC`,
        [userId]
      );
      return {
        placementInfo: infoRows[0] || null,
        attendedCompanies: attendedRows || []
      };
    } catch (error) {
      console.error('Error in getStudentPlacementInfo:', error);
      return { placementInfo: null, attendedCompanies: [] };
    }
  }

  /**
   * Detailed Personal Information (bank, relation, bio)
   */
  async getStudentFullPersonalDetails(userId, regno) {
    try {
      const profile = await this.getStudentProfile(regno);
      const [infoRows] = await queryReadOnly(
        `SELECT * FROM personal_information WHERE Userid = ?`,
        [userId]
      );
      const [bankRows] = await queryReadOnly(
        `SELECT * FROM bank_details WHERE Userid = ?`,
        [userId]
      );
      const [relRows] = await queryReadOnly(
        `SELECT * FROM relation_details WHERE Userid = ?`,
        [userId]
      );

      return {
        profile,
        personalInfo: infoRows[0] || null,
        bankDetails: bankRows[0] || null,
        relations: relRows || []
      };
    } catch (error) {
      console.error('Error in getStudentFullPersonalDetails:', error);
      return { profile: null, personalInfo: null, bankDetails: null, relations: [] };
    }
  }


  // ----------------------------------------------------
  // 2. STAFF SPECIFIC QUERIES (Filtered by Staff Taught Courses / Accessible Data)
  // ----------------------------------------------------

  /**
   * Overall Attendance percentage across classes taught by staff member
   */
  async getStaffClassAttendanceSummary(staffUserId) {
    try {
      // 1. Get staff assigned courses & sections
      const [allocations] = await queryReadOnly(
        `SELECT DISTINCT courseId, sectionId FROM StaffCourse WHERE Userid = ?`,
        [staffUserId]
      );

      if (allocations.length === 0) {
        return { totalSessions: 0, totalAttendanceRecords: 0, totalPresent: 0, percentage: 0 };
      }

      // 2. Get period attendance stats for these allocations
      const courseSectionPairs = allocations.map(a => `(courseId = ${a.courseId} AND sectionId = ${a.sectionId})`).join(' OR ');
      const [attRows] = await queryReadOnly(
        `SELECT COUNT(periodAttendanceId) as totalRecords,
                COUNT(DISTINCT CONCAT(attendanceDate, '_', periodNumber, '_', courseId, '_', sectionId)) as totalSessions,
                SUM(CASE WHEN status IN ('P', 'OD') THEN 1 ELSE 0 END) as totalPresent
         FROM PeriodAttendance
         WHERE (${courseSectionPairs})`
      );

      const totalRecords = Number(attRows[0]?.totalRecords || 0);
      const totalSessions = Number(attRows[0]?.totalSessions || 0);
      const totalPresent = Number(attRows[0]?.totalPresent || 0);
      const percentage = totalRecords > 0 ? Number(((totalPresent / totalRecords) * 100).toFixed(1)) : 0;

      return {
        totalSessions,
        totalAttendanceRecords: totalRecords,
        totalPresent,
        percentage
      };
    } catch (error) {
      console.error('Error in getStaffClassAttendanceSummary:', error);
      throw error;
    }
  }

  /**
   * Section-wise attendance breakdown for courses taught by staff
   */
  async getStaffAssignedSectionsAttendance(staffUserId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT sc.courseId, sc.sectionId, c.courseCode, c.courseTitle, sec.sectionName,
                COUNT(pa.periodAttendanceId) as totalRecords,
                SUM(CASE WHEN pa.status IN ('P', 'OD') THEN 1 ELSE 0 END) as presentRecords
         FROM StaffCourse sc
         JOIN Course c ON sc.courseId = c.courseId
         JOIN Section sec ON sc.sectionId = sec.sectionId
         LEFT JOIN PeriodAttendance pa ON sc.courseId = pa.courseId AND sc.sectionId = pa.sectionId
         WHERE sc.Userid = ?
         GROUP BY sc.courseId, sc.sectionId, c.courseCode, c.courseTitle, sec.sectionName`,
        [staffUserId]
      );

      return rows.map(r => {
        const total = Number(r.totalRecords || 0);
        const present = Number(r.presentRecords || 0);
        return {
          courseCode: r.courseCode,
          courseTitle: r.courseTitle,
          sectionName: r.sectionName,
          totalRecords: total,
          presentRecords: present,
          percentage: total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0
        };
      });
    } catch (error) {
      console.error('Error in getStaffAssignedSectionsAttendance:', error);
      throw error;
    }
  }

  /**
   * Query ANY student's attendance (Staff / Admin Authorization Required)
   */
  async getStudentAttendanceByStaff(searchQuery) {
    try {
      // Find matching student
      const [students] = await queryReadOnly(
        `SELECT sd.registerNumber, sd.studentName, sd.batch, sd.semester, d.departmentAcr
         FROM student_details sd
         LEFT JOIN departments d ON sd.departmentId = d.departmentId
         WHERE sd.registerNumber LIKE ? OR sd.studentName LIKE ?
         LIMIT 5`,
        [`%${searchQuery}%`, `%${searchQuery}%`]
      );

      if (students.length === 0) return null;

      const student = students[0];
      const overallAtt = await this.getStudentOverallAttendance(student.registerNumber);
      const subjectAtt = await this.getStudentSubjectwiseAttendance(student.registerNumber);

      return {
        studentInfo: student,
        overall: overallAtt,
        subjects: subjectAtt
      };
    } catch (error) {
      console.error('Error in getStudentAttendanceByStaff:', error);
      throw error;
    }
  }

  /**
   * Find students with attendance below threshold (< 75%) in staff classes
   */
  async getStaffLowAttendanceStudents(staffUserId, threshold = 75) {
    try {
      const [allocations] = await queryReadOnly(
        `SELECT DISTINCT courseId, sectionId FROM StaffCourse WHERE Userid = ?`,
        [staffUserId]
      );

      if (allocations.length === 0) return [];

      const pairs = allocations.map(a => `(pa.courseId = ${a.courseId} AND pa.sectionId = ${a.sectionId})`).join(' OR ');
      const [rows] = await queryReadOnly(
        `SELECT pa.regno, sd.studentName, c.courseCode,
                COUNT(pa.periodAttendanceId) as totalPeriods,
                SUM(CASE WHEN pa.status IN ('P', 'OD') THEN 1 ELSE 0 END) as presentPeriods
         FROM PeriodAttendance pa
         JOIN student_details sd ON pa.regno = sd.registerNumber
         JOIN Course c ON pa.courseId = c.courseId
         WHERE (${pairs})
         GROUP BY pa.regno, sd.studentName, c.courseCode
         HAVING (SUM(CASE WHEN pa.status IN ('P', 'OD') THEN 1 ELSE 0 END) / NULLIF(COUNT(pa.periodAttendanceId), 0)) * 100 < ?
         ORDER BY (SUM(CASE WHEN pa.status IN ('P', 'OD') THEN 1 ELSE 0 END) / NULLIF(COUNT(pa.periodAttendanceId), 0)) ASC
         LIMIT 15`,
        [threshold]
      );

      return rows.map(r => {
        const total = Number(r.totalPeriods || 0);
        const present = Number(r.presentPeriods || 0);
        return {
          regno: r.regno,
          studentName: r.studentName,
          courseCode: r.courseCode,
          percentage: total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0
        };
      });
    } catch (error) {
      console.error('Error in getStaffLowAttendanceStudents:', error);
      throw error;
    }
  }

  /**
   * Assigned Courses for staff
   */
  async getStaffAssignedCourses(staffUserId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT sc.staffCourseId, c.courseCode, c.courseTitle, c.credits, c.type, sec.sectionName, d.departmentAcr
         FROM StaffCourse sc
         JOIN Course c ON sc.courseId = c.courseId
         LEFT JOIN Section sec ON sc.sectionId = sec.sectionId
         LEFT JOIN departments d ON sc.departmentId = d.departmentId
         WHERE sc.Userid = ?
         ORDER BY c.courseCode ASC`,
        [staffUserId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStaffAssignedCourses:', error);
      throw error;
    }
  }

  /**
   * Staff Today's Timetable
   */
  async getStaffTimetable(staffUserId, dayOfWeek = null) {
    try {
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const targetDay = dayOfWeek ? dayOfWeek.toUpperCase() : days[new Date().getDay()];

      const [rows] = await queryReadOnly(
        `SELECT t.periodNumber, t.dayOfWeek, c.courseCode, c.courseTitle, sec.sectionName
         FROM StaffCourse sc
         JOIN Timetable t ON sc.courseId = t.courseId AND sc.sectionId = t.sectionId
         JOIN Course c ON t.courseId = c.courseId
         LEFT JOIN Section sec ON t.sectionId = sec.sectionId
         WHERE sc.Userid = ? AND t.dayOfWeek = ? AND t.isActive = 'YES'
         ORDER BY t.periodNumber ASC`,
        [staffUserId, targetDay]
      );
      return { day: targetDay, schedule: rows };
    } catch (error) {
      console.error('Error in getStaffTimetable:', error);
      throw error;
    }
  }

  /**
   * Staff Profile Details
   */
  async getStaffProfile(staffUserId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT st.staffId, st.firstName, st.lastName, st.designation, d.departmentName, d.departmentAcr, st.employeeMail, st.mobileNumber
         FROM staff_details st
         LEFT JOIN departments d ON st.departmentId = d.departmentId
         WHERE st.Userid = ?`,
        [staffUserId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error in getStaffProfile:', error);
      throw error;
    }
  }

  // ----------------------------------------------------
  // 3. STAFF WARD STUDENTS & ACTIVITIES QUERIES
  // ----------------------------------------------------

  /**
   * Get ward students assigned to a staff member
   */
  async getStaffWardStudents(staffUserId, staffEmail = null) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT sd.studentId, sd.Userid, sd.registerNumber, sd.studentName, sd.batch, sd.semester, sd.section,
                sd.student_type, sd.personal_phone, sd.personal_email, d.departmentAcr, d.departmentName
         FROM student_details sd
         LEFT JOIN departments d ON sd.departmentId = d.departmentId
         WHERE sd.staffId = ? OR (sd.tutorEmail = ? AND ? IS NOT NULL AND ? != '')
         ORDER BY sd.registerNumber ASC`,
        [staffUserId, staffEmail, staffEmail, staffEmail]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStaffWardStudents:', error);
      return [];
    }
  }

  /**
   * Checks student record and verifies access permission according to role/position tier:
   * 1. Student: Can access ONLY self details.
   * 2. Staff: Can access ONLY self details and assigned ward students.
   * 3. Dept Admin / HOD: Can access ALL records within their department.
   * 4. Super Admin / Principal / Director / Chairman: Can access ALL records institution-wide.
   */
  async checkStudentTutorWardAccess(authUser, targetRegNo) {
    try {
      if (!targetRegNo) return { exists: false, isAuthorized: false, student: null, accessReason: 'Missing target' };

      const cleanTarget = targetRegNo.toString().trim().toUpperCase();

      const [rows] = await queryReadOnly(
        `SELECT sd.studentId, sd.Userid, sd.registerNumber, sd.studentName, sd.batch, sd.semester, sd.section,
                sd.staffId, sd.tutorEmail, sd.student_type, sd.personal_phone, sd.personal_email,
                d.departmentName, d.departmentAcr, sd.departmentId,
                CONCAT(COALESCE(st.firstName, ''), ' ', COALESCE(st.lastName, '')) as tutorName
         FROM student_details sd
         LEFT JOIN departments d ON sd.departmentId = d.departmentId
         LEFT JOIN staff_details st ON sd.staffId = st.staffId
         WHERE sd.registerNumber = ? OR sd.studentName LIKE ?
         LIMIT 1`,
        [cleanTarget, `%${cleanTarget}%`]
      );

      if (rows.length === 0) {
        return { exists: false, isAuthorized: false, student: null, accessReason: 'NOT_FOUND' };
      }

      const student = rows[0];
      const tier = authUser?.accessTier || (authUser?.isHigherAuthority ? 'super_admin' : 'student');

      // Tier 1: Super Admin (Principal, Director, Chairman, SuperAdmin) - Full Institution Access
      if (tier === 'super_admin') {
        return { exists: true, isAuthorized: true, student, accessReason: 'SUPER_ADMIN_GRANTED' };
      }

      // Tier 2: Department Admin / HOD - Department Scope Access
      if (tier === 'dept_admin') {
        const userDept = authUser?.departmentId;
        const userDeptAcr = authUser?.departmentAcr ? authUser.departmentAcr.trim().toUpperCase() : null;
        const studentDept = student.departmentId;
        const studentDeptAcr = student.departmentAcr ? student.departmentAcr.trim().toUpperCase() : null;

        const isDeptMatch = (userDept && studentDept && Number(userDept) === Number(studentDept)) ||
                            (userDeptAcr && studentDeptAcr && userDeptAcr === studentDeptAcr);

        if (isDeptMatch) {
          return { exists: true, isAuthorized: true, student, accessReason: 'DEPT_ADMIN_GRANTED' };
        } else {
          return {
            exists: true,
            isAuthorized: false,
            student,
            accessReason: 'DEPT_MISMATCH',
            userDept: userDeptAcr || 'your department',
            studentDept: studentDeptAcr || 'another department'
          };
        }
      }

      // Tier 3: Student - Self Access Only
      if (tier === 'student' || authUser?.role === 'student') {
        const isSelfRegNo = authUser?.registerNumber && authUser.registerNumber.toUpperCase() === student.registerNumber.toUpperCase();
        const isSelfUserId = authUser?.userId && student.Userid && Number(authUser.userId) === Number(student.Userid);
        if (isSelfRegNo || isSelfUserId) {
          return { exists: true, isAuthorized: true, student, accessReason: 'SELF_GRANTED' };
        } else {
          return { exists: true, isAuthorized: false, student, accessReason: 'STUDENT_RESTRICTED' };
        }
      }

      // Tier 4: Staff / Faculty - Self & Assigned Ward Students Access
      const isStaffIdMatch = authUser && authUser.staffId && Number(student.staffId) === Number(authUser.staffId);
      const isEmailMatch = authUser && authUser.userMail && student.tutorEmail &&
        student.tutorEmail.trim().toLowerCase() === authUser.userMail.trim().toLowerCase();

      const isAuthorized = isStaffIdMatch || isEmailMatch;

      return {
        exists: true,
        isAuthorized: Boolean(isAuthorized),
        student,
        accessReason: isAuthorized ? 'WARD_MATCH' : 'WARD_MISMATCH'
      };
    } catch (error) {
      console.error('Error in checkStudentTutorWardAccess:', error);
      return { exists: false, isAuthorized: false, student: null, accessReason: 'ERROR' };
    }
  }

  /**
   * Get basic general details & academic summary for a student (with tutor-ward & higher authority authorization check)
   */
  async getStudentFullGeneralDetails(authUser, targetRegNo) {
    try {
      const access = await this.checkStudentTutorWardAccess(authUser, targetRegNo);
      if (!access.exists) {
        return { status: 'NOT_FOUND', message: `No student record found matching "${targetRegNo}" in the database.` };
      }

      if (!access.isAuthorized) {
        return {
          status: 'UNAUTHORIZED',
          student: access.student,
          message: `⚠️ **Access Restricted**: Student **${access.student.studentName}** (\`${access.student.registerNumber}\`) is not in your assigned tutor ward. Only assigned tutors or higher authorities (Principal, HODs, etc.) can access this student's data.`
        };
      }

      const s = access.student;
      const gpaData = await this.getStudentCGPAAndGPA(s.registerNumber);
      const attData = await this.getStudentOverallAttendance(s.registerNumber);
      const srData = await this.getStudentSkillrack(s.Userid, s.registerNumber);
      const projects = await this.getStudentProjects(s.Userid);
      const internships = await this.getStudentInternships(s.Userid);
      const { onlineCourses, nptelCourses } = await this.getStudentOnlineCoursesAndNPTEL(s.Userid, s.registerNumber);

      return {
        status: 'SUCCESS',
        student: s,
        gpaData,
        attData,
        srData,
        projectsCount: projects.length,
        internshipsCount: internships.length,
        coursesCount: onlineCourses.length + nptelCourses.length
      };
    } catch (error) {
      console.error('Error in getStudentFullGeneralDetails:', error);
      return { status: 'ERROR', message: 'An error occurred while fetching student details.' };
    }
  }

  /**
   * Get attendance breakdown for staff ward students
   */
  async getStaffWardStudentsAttendance(staffUserId, staffEmail = null) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT sd.registerNumber, sd.studentName, sd.semester, sd.batch, d.departmentAcr,
                COUNT(da.dayAttendanceId) as totalDays,
                SUM(CASE WHEN da.status = 'P' THEN 1 ELSE 0 END) as daysPresent,
                SUM(CASE WHEN da.status = 'A' THEN 1 ELSE 0 END) as daysAbsent
         FROM student_details sd
         LEFT JOIN departments d ON sd.departmentId = d.departmentId
         LEFT JOIN DayAttendance da ON sd.registerNumber = da.regno
         WHERE sd.staffId = ? OR (sd.tutorEmail = ? AND ? IS NOT NULL AND ? != '')
         GROUP BY sd.registerNumber, sd.studentName, sd.semester, sd.batch, d.departmentAcr
         ORDER BY sd.registerNumber ASC`,
        [staffUserId, staffEmail, staffEmail, staffEmail]
      );

      return rows.map(r => {
        const total = Number(r.totalDays || 0);
        const present = Number(r.daysPresent || 0);
        const absent = Number(r.daysAbsent || 0);
        const percentage = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;
        return {
          registerNumber: r.registerNumber,
          studentName: r.studentName,
          semester: r.semester,
          batch: r.batch,
          departmentAcr: r.departmentAcr,
          totalDays: total,
          daysPresent: present,
          daysAbsent: absent,
          percentage,
          isEligible: percentage >= 75
        };
      });
    } catch (error) {
      console.error('Error in getStaffWardStudentsAttendance:', error);
      return [];
    }
  }

  /**
   * Get academic progress details for ward students (or specific student if authorized)
   */
  async getStaffWardStudentsProgress(authUser, targetSearch = null) {
    try {
      const staffUserId = authUser?.userId;
      const staffEmail = authUser?.userMail;

      let wardStudents = [];

      if (authUser?.isHigherAuthority) {
        if (targetSearch) {
          const cleanTarget = targetSearch.trim().toUpperCase();
          const [sRows] = await queryReadOnly(
            `SELECT sd.studentId, sd.Userid, sd.registerNumber, sd.studentName, sd.batch, sd.semester, sd.section,
                    sd.student_type, sd.personal_phone, sd.personal_email, d.departmentAcr, d.departmentName
             FROM student_details sd
             LEFT JOIN departments d ON sd.departmentId = d.departmentId
             WHERE sd.registerNumber = ? OR sd.registerNumber LIKE ? OR sd.studentName LIKE ?`,
            [cleanTarget, `%${cleanTarget}%`, `%${cleanTarget}%`]
          );
          wardStudents = sRows;
        } else {
          wardStudents = await this.getStaffWardStudents(staffUserId, staffEmail);
        }
      } else {
        wardStudents = await this.getStaffWardStudents(staffUserId, staffEmail);
        if (targetSearch) {
          const lowerSearch = targetSearch.toLowerCase().trim();
          wardStudents = wardStudents.filter(s =>
            (s.registerNumber && s.registerNumber.toLowerCase().includes(lowerSearch)) ||
            (s.studentName && s.studentName.toLowerCase().includes(lowerSearch))
          );
        }
      }

      if (wardStudents.length === 0) return [];

      const progressList = [];

      for (const s of wardStudents) {
        const gpaData = await this.getStudentCGPAAndGPA(s.registerNumber);
        const attData = await this.getStudentOverallAttendance(s.registerNumber);
        const srData = await this.getStudentSkillrack(s.Userid, s.registerNumber);
        const projects = await this.getStudentProjects(s.Userid);
        const internships = await this.getStudentInternships(s.Userid);
        const { onlineCourses, nptelCourses } = await this.getStudentOnlineCoursesAndNPTEL(s.Userid, s.registerNumber);

        progressList.push({
          studentId: s.studentId,
          registerNumber: s.registerNumber,
          studentName: s.studentName,
          departmentAcr: s.departmentAcr,
          batch: s.batch,
          semester: s.semester,
          section: s.section,
          cgpa: gpaData?.currentCGPA || 'N/A',
          earnedCredits: gpaData?.overallEarnedCredits || 0,
          attendancePercentage: attData?.percentage || 0,
          isAttendanceEligible: attData?.isEligible || false,
          skillrackRank: srData?.skillrack_rank || 'N/A',
          programsSolved: srData?.total_programs_solved || 0,
          projectsCount: projects.length,
          internshipsCount: internships.length,
          coursesCount: onlineCourses.length + nptelCourses.length
        });
      }

      return progressList;
    } catch (error) {
      console.error('Error in getStaffWardStudentsProgress:', error);
      return [];
    }
  }

  /**
   * Staff Activity: Funded Projects
   */
  async getStaffFundedProjects(staffUserId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, pi_name, co_pi_names, project_title, funding_agency, from_date, to_date, amount, amount_received, organization_name, students_involved
         FROM project_proposals
         WHERE Userid = ?
         ORDER BY from_date DESC`,
        [staffUserId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStaffFundedProjects:', error);
      return [];
    }
  }

  /**
   * Staff Activity: Education Details
   */
  async getStaffEducationDetails(staffUserId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT ug_degree, ug_specialization, ug_institution, ug_year, ug_cgpa_percentage,
                pg_degree, pg_specialization, pg_institution, pg_year, pg_cgpa_percentage,
                phd_university, phd_title, phd_status, phd_guide_name, phd_completion_year,
                tenth_institution, tenth_year, twelfth_institution, twelfth_year
         FROM education
         WHERE Userid = ?`,
        [staffUserId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error in getStaffEducationDetails:', error);
      return null;
    }
  }

  /**
   * Staff Activity: Seed Money
   */
  async getStaffSeedMoney(staffUserId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, project_title, project_duration, from_date, to_date, amount, outcomes
         FROM seed_money
         WHERE Userid = ?
         ORDER BY id DESC`,
        [staffUserId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStaffSeedMoney:', error);
      return [];
    }
  }

  /**
   * Staff Activity: Patents & Products
   */
  async getStaffPatents(staffUserId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, project_title, patent_status, month_year, working_model, prototype_developed
         FROM patent_product
         WHERE Userid = ?
         ORDER BY id DESC`,
        [staffUserId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStaffPatents:', error);
      return [];
    }
  }

  /**
   * Staff Activity: Events Attended
   */
  async getStaffEventsAttendedDetails(staffUserId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, programme_name, title, from_date, to_date, mode, organized_by, venue, participants, financial_support, support_amount, status
         FROM staff_events_attended
         WHERE Userid = ?
         ORDER BY from_date DESC`,
        [staffUserId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStaffEventsAttendedDetails:', error);
      return [];
    }
  }

  /**
   * Staff Activity: Events Organized
   */
  async getStaffEventsOrganizedDetails(staffUserId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, program_name, program_title, coordinator_name, co_coordinator_names, speaker_details, from_date, to_date, days, funding_type, funding_agency, amount_sanctioned, amount_received, participants
         FROM events_organized
         WHERE Userid = ?
         ORDER BY from_date DESC`,
        [staffUserId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStaffEventsOrganizedDetails:', error);
      return [];
    }
  }

  /**
   * Staff Activity: Book Chapters & Publications
   */
  async getStaffBookChapters(staffUserId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, publication_type, publication_name, publication_title, authors, published_month, published_year, index_type, doi, citations, publisher
         FROM book_chapters
         WHERE Userid = ?
         ORDER BY published_year DESC`,
        [staffUserId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStaffBookChapters:', error);
      return [];
    }
  }

  /**
   * Staff Activity: Consultancy Proposals
   */
  async getStaffConsultancy(staffUserId) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT id, pi_name, co_pi_names, project_title, industry, from_date, to_date, amount, amount_received, organization_name
         FROM consultancy_proposals
         WHERE Userid = ?
         ORDER BY id DESC`,
        [staffUserId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStaffConsultancy:', error);
      return [];
    }
  }

  /**
   * Staff Summary of all submitted activities across the Activities Tab
   */
  async getStaffAllActivitiesSummary(staffUserId) {
    try {
      const fundedProjects = await this.getStaffFundedProjects(staffUserId);
      const education = await this.getStaffEducationDetails(staffUserId);
      const seedMoney = await this.getStaffSeedMoney(staffUserId);
      const patents = await this.getStaffPatents(staffUserId);
      const eventsAttended = await this.getStaffEventsAttendedDetails(staffUserId);
      const eventsOrganized = await this.getStaffEventsOrganizedDetails(staffUserId);
      const bookChapters = await this.getStaffBookChapters(staffUserId);
      const consultancy = await this.getStaffConsultancy(staffUserId);

      return {
        fundedProjects,
        education,
        seedMoney,
        patents,
        eventsAttended,
        eventsOrganized,
        bookChapters,
        consultancy
      };
    } catch (error) {
      console.error('Error in getStaffAllActivitiesSummary:', error);
      return {
        fundedProjects: [],
        education: null,
        seedMoney: [],
        patents: [],
        eventsAttended: [],
        eventsOrganized: [],
        bookChapters: [],
        consultancy: []
      };
    }
  }

  /**
   * Admin Global Overview Stats
   */
  async getAdminOverviewStats() {
    try {
      const [sRows] = await queryReadOnly('SELECT COUNT(*) as count FROM student_details');
      const [stRows] = await queryReadOnly('SELECT COUNT(*) as count FROM staff_details');
      const [cRows] = await queryReadOnly('SELECT COUNT(*) as count FROM Course WHERE isActive = "YES"');
      const [attRows] = await queryReadOnly('SELECT COUNT(*) as totalDays, SUM(CASE WHEN status = "P" THEN 1 ELSE 0 END) as presentDays FROM DayAttendance');

      const totalDays = Number(attRows[0]?.totalDays || 0);
      const presentDays = Number(attRows[0]?.presentDays || 0);
      const overallAtt = totalDays > 0 ? Number(((presentDays / totalDays) * 100).toFixed(1)) : 0;

      return {
        totalStudents: sRows[0]?.count || 0,
        totalStaff: stRows[0]?.count || 0,
        activeCourses: cRows[0]?.count || 0,
        overallAttendance: overallAtt
      };
    } catch (error) {
      console.error('Error in getAdminOverviewStats:', error);
      throw error;
    }
  }

  /**
   * Get Student Coding Profiles & External Links (LeetCode, GitHub, SkillRack, Portfolio)
   */
  async getStudentCodingProfilesAndLinks(userId, regno) {
    try {
      const [sRows] = await queryReadOnly(
        `SELECT skillrackProfile, githubProfile, leetcodeProfile, portfolioProfile
         FROM student_details
         WHERE Userid = ? OR registerNumber = ?`,
        [userId, regno]
      );
      const profiles = sRows[0] || {};

      const comp = await this.getStudentCompetencyCoding(userId);
      const sr = await this.getStudentSkillrack(userId, regno);

      return {
        skillrackProfile: profiles.skillrackProfile || null,
        githubProfile: profiles.githubProfile || null,
        leetcodeProfile: profiles.leetcodeProfile || null,
        portfolioProfile: profiles.portfolioProfile || null,
        otherPlatforms: comp?.other_platforms || [],
        competency: comp,
        skillrack: sr
      };
    } catch (error) {
      console.error('Error in getStudentCodingProfilesAndLinks:', error);
      return { skillrackProfile: null, githubProfile: null, leetcodeProfile: null, portfolioProfile: null, otherPlatforms: [], competency: null, skillrack: null };
    }
  }

  /**
   * Get Student Completed Courses Grouped by Course Category (Core, Elective, Non-CGPA, etc.)
   */
  async getStudentCompletedCoursesByCategory(userId, regno) {
    try {
      const [enrolled] = await queryReadOnly(
        `SELECT c.courseCode, c.courseTitle, c.credits, c.category, c.type
         FROM StudentCourse sc
         JOIN Course c ON sc.courseId = c.courseId
         WHERE sc.regno = ?
         ORDER BY c.category ASC, c.courseCode ASC`,
        [regno]
      );

      const nonCgpa = await this.getStudentNonCGPA(userId);

      const grouped = {};
      enrolled.forEach(c => {
        const cat = c.category || 'Core Courses';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(c);
      });

      if (nonCgpa.length > 0) {
        grouped['Non-CGPA Courses'] = nonCgpa.map(n => ({
          courseCode: n.course_code || 'NON-CGPA',
          courseTitle: n.course_name || n.category_course_name || 'Non-CGPA Course',
          credits: 0,
          category: 'Non-CGPA',
          type: 'Value Added',
          categoryNo: n.category_no,
          days: n.no_of_days,
          status: n.pending ? 'Pending Approval' : 'Verified'
        }));
      }

      return grouped;
    } catch (error) {
      console.error('Error in getStudentCompletedCoursesByCategory:', error);
      return {};
    }
  }

  /**
   * Get Skillrack Performance Summary for all Staff Ward Students
   */
  async getStaffWardStudentsSkillrack(staffUserId, staffEmail = null) {
    try {
      const [rows] = await queryReadOnly(
        `SELECT sd.registerNumber, sd.studentName, sd.Userid, sd.batch, sd.semester, d.departmentAcr,
                sr.total_programs_solved, sr.skillrack_rank, sr.daily_challenge, sr.daily_test,
                sr.gold_medals, sr.silver_medals, sr.bronze_medals
         FROM student_details sd
         LEFT JOIN departments d ON sd.departmentId = d.departmentId
         LEFT JOIN skillrack sr ON (sd.Userid = sr.Userid OR sd.registerNumber = sr.registerNumber)
         WHERE sd.staffId = ? OR (sd.tutorEmail = ? AND ? IS NOT NULL AND ? != '')
         ORDER BY sr.skillrack_rank ASC, sr.total_programs_solved DESC`,
        [staffUserId, staffEmail, staffEmail, staffEmail]
      );
      return rows;
    } catch (error) {
      console.error('Error in getStaffWardStudentsSkillrack:', error);
      return [];
    }
  }

  /**
   * Get Comprehensive Staff Dashboard Summary
   */
  async getStaffDashboardSummary(authUser) {
    try {
      const staffUserId = authUser?.userId;
      const staffEmail = authUser?.userMail;

      const profile = await this.getStaffProfile(staffUserId);
      const wards = await this.getStaffWardStudents(staffUserId, staffEmail);
      const wardAtt = await this.getStaffWardStudentsAttendance(staffUserId, staffEmail);
      const taughtCourses = await this.getStaffAssignedCourses(staffUserId);
      const activities = await this.getStaffAllActivitiesSummary(staffUserId);

      let totalWardAtt = 0;
      let shortageCount = 0;
      wardAtt.forEach(w => {
        totalWardAtt += w.percentage;
        if (w.percentage < 75) shortageCount++;
      });
      const avgWardAtt = wardAtt.length > 0 ? Number((totalWardAtt / wardAtt.length).toFixed(1)) : 0;

      return {
        profile,
        totalWards: wards.length,
        avgWardAttendance: avgWardAtt,
        shortageCount,
        taughtCoursesCount: taughtCourses.length,
        activitiesSummary: {
          fundedProjectsCount: activities.fundedProjects.length,
          seedMoneyCount: activities.seedMoney.length,
          patentsCount: activities.patents.length,
          eventsAttendedCount: activities.eventsAttended.length,
          eventsOrganizedCount: activities.eventsOrganized.length,
          publicationsCount: activities.bookChapters.length,
          consultancyCount: activities.consultancy.length,
          educationStatus: activities.education ? (activities.education.phd_status ? `Ph.D. (${activities.education.phd_status})` : 'Recorded') : 'Not Updated'
        }
      };
    } catch (error) {
      console.error('Error in getStaffDashboardSummary:', error);
      return null;
    }
  }

  /**
   * Verify staff access authorization based on user role and department
   */
  verifyStaffAccess(authUser, staff) {
    if (!authUser || !staff) return { exists: false, isAuthorized: true };

    const tier = authUser.accessTier || 'staff';

    // Super Admin Tier (Principal, Director, Chairman, SuperAdmin) - Full Institution Access
    if (tier === 'super_admin' || ['principal', 'director', 'chairman', 'superadmin', 'admin'].includes(authUser.role)) {
      return { exists: true, isAuthorized: true, staff, accessReason: 'SUPER_ADMIN_GRANTED' };
    }

    // Department Admin Tier (HOD, Dept Admin) - Department Scope Access Only
    if (tier === 'dept_admin' || ['hod', 'deptadmin'].includes(authUser.role)) {
      const userDept = authUser.departmentId;
      const userDeptAcr = authUser.departmentAcr ? authUser.departmentAcr.trim().toUpperCase() : null;
      const staffDept = staff.departmentId;
      const staffDeptAcr = staff.departmentAcr ? staff.departmentAcr.trim().toUpperCase() : null;

      const isDeptMatch = (userDept && staffDept && Number(userDept) === Number(staffDept)) ||
                          (userDeptAcr && staffDeptAcr && userDeptAcr === staffDeptAcr);

      if (isDeptMatch) {
        return { exists: true, isAuthorized: true, staff, accessReason: 'DEPT_ADMIN_GRANTED' };
      } else {
        return {
          exists: true,
          isAuthorized: false,
          staff,
          accessReason: 'DEPT_MISMATCH',
          userDept: userDeptAcr || 'your department',
          staffDept: staffDeptAcr || 'another department'
        };
      }
    }

    // Staff Tier - Self Access Only
    const isSelfStaffId = authUser.staffId && Number(authUser.staffId) === Number(staff.staffId);
    const isSelfUserId = authUser.userId && staff.Userid && Number(authUser.userId) === Number(staff.Userid);
    const isSelfEmail = authUser.userMail && staff.employeeMail && authUser.userMail.toLowerCase() === staff.employeeMail.toLowerCase();

    if (isSelfStaffId || isSelfUserId || isSelfEmail) {
      return { exists: true, isAuthorized: true, staff, accessReason: 'SELF_GRANTED' };
    }

    return { exists: true, isAuthorized: false, staff, accessReason: 'STAFF_RESTRICTED' };
  }

  /**
   * Search specific staff details and activities portfolio by staff name or staff ID or email
   */
  async getStaffDetailsAndActivitiesByAdmin(targetSearch, authUser = null) {
    try {
      const clean = targetSearch.toString().trim();
      const [stRows] = await queryReadOnly(
        `SELECT st.staffId, st.Userid, st.firstName, st.lastName, st.designation, st.employeeMail, st.mobileNumber,
                d.departmentName, d.departmentAcr, st.departmentId
         FROM staff_details st
         LEFT JOIN departments d ON st.departmentId = d.departmentId
         WHERE st.staffId = ? OR st.employeeMail = ? OR CONCAT(COALESCE(st.firstName,''), ' ', COALESCE(st.lastName,'')) LIKE ?
         LIMIT 1`,
        [clean, clean, `%${clean}%`]
      );

      if (stRows.length === 0) return null;

      const staff = stRows[0];
      const authCheck = this.verifyStaffAccess(authUser, staff);
      if (!authCheck.isAuthorized) {
        return authCheck;
      }

      const activities = await this.getStaffAllActivitiesSummary(staff.Userid);
      const taughtCourses = await this.getStaffAssignedCourses(staff.Userid);
      const wards = await this.getStaffWardStudents(staff.Userid, staff.employeeMail);

      return {
        isAuthorized: true,
        staff,
        activities,
        taughtCoursesCount: taughtCourses.length,
        wardStudentsCount: wards.length
      };
    } catch (error) {
      console.error('Error in getStaffDetailsAndActivitiesByAdmin:', error);
      return null;
    }
  }

  /**
   * Get department or institution staff activities summary
   */
  async getDepartmentStaffActivitiesSummary(deptAcrOrId = null) {
    try {
      let deptWhere = '';
      let params = [];
      if (deptAcrOrId) {
        deptWhere = `WHERE d.departmentAcr = ? OR d.departmentId = ?`;
        params = [deptAcrOrId, deptAcrOrId];
      }

      const [rows] = await queryReadOnly(
        `SELECT st.staffId, st.Userid, CONCAT(COALESCE(st.firstName,''), ' ', COALESCE(st.lastName,'')) as staffName,
                st.designation, d.departmentAcr,
                (SELECT COUNT(*) FROM project_proposals pp WHERE pp.Userid = st.Userid) as fundedProjects,
                (SELECT COUNT(*) FROM seed_money sm WHERE sm.Userid = st.Userid) as seedMoney,
                (SELECT COUNT(*) FROM patent_product pp WHERE pp.Userid = st.Userid) as patents,
                (SELECT COUNT(*) FROM staff_events_attended ea WHERE ea.Userid = st.Userid) as eventsAttended,
                (SELECT COUNT(*) FROM events_organized eo WHERE eo.Userid = st.Userid) as eventsOrganized,
                (SELECT COUNT(*) FROM book_chapters bc WHERE bc.Userid = st.Userid) as publications
         FROM staff_details st
         LEFT JOIN departments d ON st.departmentId = d.departmentId
         ${deptWhere}
         ORDER BY (fundedProjects + patents + publications) DESC`,
        params
      );
      return rows;
    } catch (error) {
      console.error('Error in getDepartmentStaffActivitiesSummary:', error);
      return [];
    }
  }

  /**
   * Get Administrator Dashboard Summary
   */
  async getAdminDashboardSummary() {
    try {
      const overview = await this.getAdminOverviewStats();

      const [deptBreakdown] = await queryReadOnly(
        `SELECT d.departmentAcr, d.departmentName,
                (SELECT COUNT(*) FROM student_details sd WHERE sd.departmentId = d.departmentId) as studentCount,
                (SELECT COUNT(*) FROM staff_details st WHERE st.departmentId = d.departmentId) as staffCount
         FROM departments d
         ORDER BY d.departmentId ASC`
      );

      const [fundedSummary] = await queryReadOnly(
        `SELECT COUNT(*) as totalProjects, COALESCE(SUM(amount), 0) as totalAmount, COALESCE(SUM(amount_received), 0) as totalReceived FROM project_proposals`
      );

      const [patentSummary] = await queryReadOnly(
        `SELECT COUNT(*) as totalPatents FROM patent_product`
      );

      const [pubSummary] = await queryReadOnly(
        `SELECT COUNT(*) as totalPubs FROM book_chapters`
      );

      return {
        overview,
        deptBreakdown,
        researchStats: {
          totalProjects: fundedSummary[0]?.totalProjects || 0,
          totalSanctionedAmount: fundedSummary[0]?.totalAmount || 0,
          totalReceivedAmount: fundedSummary[0]?.totalReceived || 0,
          totalPatents: patentSummary[0]?.totalPatents || 0,
          totalPublications: pubSummary[0]?.totalPubs || 0
        }
      };
    } catch (error) {
      console.error('Error in getAdminDashboardSummary:', error);
      return null;
    }
  }
}

export default new DbServiceLogin();

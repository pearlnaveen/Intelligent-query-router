import dbServiceLogin from '../services/dbService.js';
import contextService from '../services/contextService.js';

/**
 * Normalizes input string with spelling corrections and fuzzy replacements for common domain terms
 */
function normalizeInput(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    // Common Typos & Spelling Error Replacements
    .replace(/\bskillvack\b|\bskillrak\b|\bskilrack\b|\bskill\s*rack\b|\bskill-rack\b|\bskilrackprofile\b/g, 'skillrack')
    .replace(/\bplacemeent\b|\bplament\b|\bplasement\b|\bplaceement\b|\bplacemnt\b|\bplacement\s*drives?\b/g, 'placement')
    .replace(/\battenndance\b|\batendence\b|\batendance\b|\battendence\b|\batendense\b|\batten\b|\battend\b/g, 'attendance')
    .replace(/\bnon\s*cgpa\b|\bnon-cgpa\b|\bnon_cgpa\b|\bnoncgpa\b/g, 'noncgpa')
    .replace(/\badminstrator\b|\badministartor\b|\badminstration\b|\badminstrative\b|\badmins\b/g, 'administrator')
    .replace(/\bstaf\b|\bstff\b|\bfacuty\b|\bfaculties\b/g, 'staff')
    .replace(/\bstundent\b|\bstudnt\b|\bstudens\b/g, 'student')
    .replace(/\bactivites\b|\bactivitys\b|\bactvity\b/g, 'activities')
    .replace(/\bdashbord\b|\bdash\s*board\b|\bdashbaord\b/g, 'dashboard')
    .replace(/\bintership\b|\binternp\b|\binternships\b|\bintern\b/g, 'internship')
    .replace(/\bcerticate\b|\bcertifcate\b|\bcertificates\b|\bcertification\b/g, 'certification')
    .replace(/\bpublication\b|\bpublications\b|\bpublcation\b|\bjournal\b|\bpaper\b/g, 'publication')
    .replace(/\bhackathon\b|\bhackathons\b|\bhckathon\b/g, 'hackathon')
    .replace(/\bseed\s*money\b|\bseedmoney\b|\bsed\s*money\b/g, 'seedmoney')
    .replace(/\bfunded\s*project\b|\bfunded\s*projects\b|\bfundedproject\b|\bproject\s*proposal\b|\bproject\s*proposals\b/g, 'fundedproject')
    .replace(/\bpatent\b|\bpatents\b|\bpatet\b|\bpatent\s*product\b|\bworking\s*model\b|\bprototype\b/g, 'patent')
    .replace(/\bconsultancy\b|\bconsultency\b/g, 'consultancy')
    .replace(/\bmark\b|\bmarks\b/g, 'cgpa')
    .replace(/\bnptell\b|\bnptl\b|\bnptelcourse\b/g, 'nptel')
    .replace(/\bscholarship\b|\bscholarships\b|\bskolarship\b/g, 'scholarship')
    .replace(/\bleave\b|\bleaves\b|\bleaverequest\b/g, 'leave')
    .replace(/\bproject\b|\bprojects\b|\bprojct\b/g, 'project')
    .replace(/\bward\b|\bwards\b|\bwardstudent\b|\bwardstudents\b/g, 'ward')
    .replace(/\bcodeing\b|\bcoding\s*profile\b|\bleetcode\b|\bgithub\b|\bhackerrank\b|\bcodechef\b|\bportfolio\b/g, 'codingprofile')
    .replace(/[?!.,;:]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Extracts student or staff target name from raw message by stripping known intent keywords
 */
function extractTargetName(cleanMessage) {
  if (!cleanMessage) return null;
  const stripped = cleanMessage
    .replace(/\b(skillrack|attendance|status|progress|details|detail|profile|mark|marks|gpa|cgpa|for|of|student|students|staff|faculty|activity|activities|show|get|view|my|ward|wards|list|dashboard|summary|overview)\b/gi, '')
    .replace(/[?!.,;:]/g, '')
    .trim();

  if (stripped.length >= 3 && !/^[0-9]+$/.test(stripped)) {
    return stripped;
  }
  return null;
}

/**
 * Helper to parse department name/acronym from query string
 */
function parseDepartment(text) {
  const t = text.toUpperCase();
  if (t.includes('CSE') || t.includes('COMPUTER SCIENCE')) return 'CSE';
  if (t.includes('IT') || t.includes('INFORMATION TECH')) return 'IT';
  if (t.includes('ECE') || t.includes('ELECTRONICS AND COMM') || t.includes('ELECTRONICS & COMM')) return 'ECE';
  if (t.includes('EEE') || t.includes('ELECTRICAL')) return 'EEE';
  if (t.includes('MECH') || t.includes('MECHANICAL')) return 'MECH';
  if (t.includes('CIVIL')) return 'CIVIL';
  if (t.includes('AI&DS') || t.includes('AIDS') || t.includes('ARTIFICIAL INTELLIGENCE')) return 'AI&DS';
  return 'CSE';
}

/**
 * Helper to parse academic year (1st, 2nd, 3rd, 4th year) from query string
 */
function parseYear(text) {
  const lower = text.toLowerCase();
  if (lower.includes('iii yr') || lower.includes('iii year') || lower.includes('3rd year') || lower.includes('3rd yr') || lower.includes('3 year') || lower.includes('3 yr') || lower.includes('third year')) return 3;
  if (lower.includes('iv yr') || lower.includes('iv year') || lower.includes('4th year') || lower.includes('4th yr') || lower.includes('4 year') || lower.includes('4 yr') || lower.includes('final year')) return 4;
  if (lower.includes('ii yr') || lower.includes('ii year') || lower.includes('2nd year') || lower.includes('2nd yr') || lower.includes('2 year') || lower.includes('2 yr') || lower.includes('second year')) return 2;
  if (lower.includes('i yr') || lower.includes('i year') || lower.includes('1st year') || lower.includes('1st yr') || lower.includes('1 year') || lower.includes('1 yr') || lower.includes('first year')) return 1;
  return null;
}

/**
 * Helper to parse specific semester number from query
 */
function parseSpecificSemester(text) {
  const lower = text.toLowerCase();
  const match = lower.match(/\b([1-8])\s*(?:st|nd|rd|th)?\s*(?:sem|semester)\b|\b(?:sem|semester)\s*([1-8])\b/);
  if (match) {
    return Number(match[1] || match[2]);
  }
  return null;
}

/**
 * Main Controller for Authenticated DB-driven Queries
 */
export const handleAuthenticatedChatQuery = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const authUser = req.authUser || { isAuthenticated: false, role: 'guest' };

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const cleanMessage = message.trim();
    const norm = normalizeInput(cleanMessage);
    const sessionContext = contextService.getContext(sessionId);

    let reply = '';
    let sourceType = 'database';
    let intent = null;

    const role = (authUser.role || 'guest').toLowerCase();
    const isStudent = role === 'student';
    const isStaff = role === 'staff' || role === 'faculty' || role === 'admin' || role === 'superadmin' || role === 'deptadmin' || role === 'hod' || role === 'principal' || role === 'director' || role === 'chairman';
    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'deptadmin' || role === 'hod' || role === 'principal' || role === 'director' || role === 'chairman' || authUser.accessTier === 'super_admin' || authUser.accessTier === 'dept_admin' || authUser.isHigherAuthority;

    // Extract target register number, staff ID, or target name if mentioned in query
    const regNoMatch = cleanMessage.match(/\b(2[0-9]{6,15}|[0-9]{2}[A-Z]{2,4}[0-9]{3,5})\b/i);
    const mentionedRegNo = regNoMatch ? regNoMatch[1].toUpperCase() : null;

    const staffIdMatch = cleanMessage.match(/\b(ST[0-9]{2,6}|STAFF[0-9]{2,6}|EMP[0-9]{2,6})\b/i);
    const mentionedStaffId = staffIdMatch ? staffIdMatch[1].toUpperCase() : null;

    const targetName = extractTargetName(cleanMessage);
    const targetStudentSearch = mentionedRegNo || targetName;

    // Check if query is asking for ranking
    const isRankingQuery = norm.includes('rank') || norm.includes('ranking') || norm.includes('top student') || norm.includes('top cgpa');

    // ----------------------------------------------------
    // 1. ROLE-BASED DASHBOARD INTENT (Students, Staff, Administrators)
    // ----------------------------------------------------
    if (norm.includes('dashboard') || norm.includes('overview summary') || norm.includes('system dashboard')) {
      if (isAdmin) {
        const dash = await dbServiceLogin.getAdminDashboardSummary();
        if (dash) {
          const { overview, deptBreakdown, researchStats } = dash;
          reply = `🏛️ **Executive Administrator Dashboard** (${authUser.positionTitle || 'Admin'}):\n\n` +
                  `📊 **College-Wide Key Statistics**:\n` +
                  `- **Total Enrolled Students**: **${overview.totalStudents}**\n` +
                  `- **Total Faculty & Staff**: **${overview.totalStaff}**\n` +
                  `- **Active Academic Courses**: **${overview.activeCourses}**\n` +
                  `- **Overall College Attendance**: **${overview.overallAttendance}%**\n\n` +
                  `🏫 **Department Breakdown**:\n` +
                  (deptBreakdown.length > 0
                    ? deptBreakdown.map(d => `- **${d.departmentAcr}** (${d.departmentName}): **${d.studentCount}** Students | **${d.staffCount}** Faculty`).join('\n')
                    : '- No department records.') + `\n\n` +
                  `🔬 **Research & Innovation Portfolio**:\n` +
                  `- **Funded Projects**: **${researchStats.totalProjects}** (Sanctioned: ₹${researchStats.totalSanctionedAmount}, Received: ₹${researchStats.totalReceivedAmount})\n` +
                  `- **Patents & Products**: **${researchStats.totalPatents}** filed/granted\n` +
                  `- **Research Publications**: **${researchStats.totalPublications}** book chapters & journals\n\n` +
                  `*Tip: You can search any student or staff details by name or reg number, e.g. "student status" or "staff activities".*`;
        }
        intent = 'admin_dashboard';
      } else if (isStaff) {
        const dash = await dbServiceLogin.getStaffDashboardSummary(authUser);
        if (dash && dash.profile) {
          const { profile, totalWards, avgWardAttendance, shortageCount, taughtCoursesCount, activitiesSummary } = dash;
          reply = `👨‍🏫 **Faculty & Tutor Ward Dashboard for ${profile.firstName} ${profile.lastName || ''}** (\`${profile.staffId}\`):\n\n` +
                  `📋 **Staff Profile**: ${profile.designation || 'Faculty'} | Department: **${profile.departmentAcr || 'N/A'}** | Email: ${profile.employeeMail || 'N/A'}\n\n` +
                  `👥 **Tutor Ward Overview**:\n` +
                  `- **Assigned Tutor Ward Students**: **${totalWards}** students\n` +
                  `- **Average Ward Attendance**: **${avgWardAttendance}%**\n` +
                  `- **Attendance Shortage Defaulters (<75%)**: ${shortageCount > 0 ? `⚠️ **${shortageCount} student(s)**` : '✅ None'}\n\n` +
                  `📖 **Teaching Allocation**: **${taughtCoursesCount}** taught course(s) allocated\n\n` +
                  `💼 **My Staff Activities Portfolio**:\n` +
                  `- 💰 Funded Projects: **${activitiesSummary.fundedProjectsCount}** | 🌱 Seed Money Grants: **${activitiesSummary.seedMoneyCount}**\n` +
                  `- 📜 Patents: **${activitiesSummary.patentsCount}** | 💼 Consultancy Projects: **${activitiesSummary.consultancyCount}**\n` +
                  `- 🎪 FDPs Attended: **${activitiesSummary.eventsAttendedCount}** | 📢 Events Organized: **${activitiesSummary.eventsOrganizedCount}**\n` +
                  `- 📘 Publications: **${activitiesSummary.publicationsCount}** | 🎓 Education Status: **${activitiesSummary.educationStatus}**\n\n` +
                  `*Tip: Ask "students skillrack" to check ward coding ranks, or query specific student e.g., "student skillrack" or "student status".*`;
        }
        intent = 'staff_dashboard';
      } else {
        const overallAtt = await dbServiceLogin.getStudentOverallAttendance(authUser.registerNumber);
        const gpaData = await dbServiceLogin.getStudentCGPAAndGPA(authUser.registerNumber);
        const { onlineCourses, nptelCourses } = await dbServiceLogin.getStudentOnlineCoursesAndNPTEL(authUser.userId, authUser.registerNumber);
        const internships = await dbServiceLogin.getStudentInternships(authUser.userId);
        const projects = await dbServiceLogin.getStudentProjects(authUser.userId);
        const sr = await dbServiceLogin.getStudentSkillrack(authUser.userId, authUser.registerNumber);

        reply = `📊 **Comprehensive Student Dashboard for ${authUser.userName}** (\`${authUser.registerNumber}\`):\n\n` +
                `- 📈 **Overall Attendance**: **${overallAtt.percentage}%** (${overallAtt.isEligible ? 'Eligible ✅' : 'Shortage ⚠️'})\n` +
                `- 🎓 **Cumulative GPA (CGPA)**: **${gpaData?.currentCGPA || 'N/A'}** (Earned Credits: **${gpaData?.overallEarnedCredits || 'N/A'}**)\n` +
                `- 📘 **NPTEL & Online Courses**: ${nptelCourses.length + onlineCourses.length} course(s)\n` +
                `- 💼 **Internships Completed**: ${internships.length} internship(s)\n` +
                `- 🛠️ **Projects Built**: ${projects.length} project(s)\n` +
                `- 💻 **Skillrack Rank**: ${sr?.skillrack_rank || 'N/A'} (${sr?.total_programs_solved || 0} programs solved)\n\n` +
                `*Select any module from your left sidebar or ask me any question!*`;
        intent = 'student_dashboard';
      }
    }


    // ----------------------------------------------------
    // 2. STAFF & ADMINISTRATORS: SPECIFIC STUDENT SEARCH (BY REG NO OR NAME) & WARD SKILLRACK / STATUS
    // ----------------------------------------------------
    else if ((isStaff || isAdmin) && (
      targetStudentSearch ||
      norm.includes('ward') ||
      norm.includes('students skillrack') ||
      norm.includes('ward skillrack') ||
      norm.includes('my students skillrack') ||
      norm.includes('student status')
    )) {

      // A. WARD STUDENTS SKILLRACK SUMMARY (When staff asks "students skillrack", "ward skillrack" without specifying 1 student)
      if (norm.includes('skillrack') && (!targetStudentSearch || norm.includes('students skillrack') || norm.includes('ward skillrack') || norm.includes('my students skillrack'))) {
        const srList = await dbServiceLogin.getStaffWardStudentsSkillrack(authUser.userId, authUser.userMail);
        if (srList.length === 0) {
          reply = `No Skillrack performance records found for your assigned ward students in the database.`;
        } else {
          reply = `💻 **Skillrack Performance Overview for Your Assigned Ward Students (${srList.length} Students)**:\n\n` +
            srList.map((s, idx) => `${idx + 1}. **${s.studentName}** (\`${s.registerNumber}\` - Sem ${s.semester || 'N/A'})\n` +
                                   `   - **Skillrack Rank**: **${s.skillrack_rank || 'N/A'}** | Solved: **${s.total_programs_solved || 0}** programs\n` +
                                   `   - **Daily Challenge (DC)**: ${s.daily_challenge || 0} | **Daily Test (DT)**: ${s.daily_test || 0}\n` +
                                   `   - **Medals**: 🥇 Gold: ${s.gold_medals || 0} | 🥈 Silver: ${s.silver_medals || 0} | 🥉 Bronze: ${s.bronze_medals || 0}`).join('\n\n') +
            `\n\n*Tip: You can query Skillrack for a specific student by reg number or name.*`;
        }
        intent = 'staff_ward_students_skillrack';
      }

      // B. SPECIFIC STUDENT SKILLRACK QUERY BY REG NO OR NAME (e.g. "student skillrack")
      else if (targetStudentSearch && norm.includes('skillrack')) {
        const access = await dbServiceLogin.checkStudentTutorWardAccess(authUser, targetStudentSearch);
        if (!access.exists) {
          reply = `No student record found matching **"${targetStudentSearch}"** in the database.`;
        } else if (!access.isAuthorized) {
          reply = `⚠️ **Access Restricted**: Student **${access.student.studentName}** (\`${access.student.registerNumber}\`) is not in your assigned tutor ward or department scope.`;
        } else {
          const s = access.student;
          const sr = await dbServiceLogin.getStudentSkillrack(s.Userid, s.registerNumber);
          if (!sr) {
            reply = `No Skillrack performance statistics recorded for student **${s.studentName}** (\`${s.registerNumber}\`).`;
          } else {
            reply = `💻 **Skillrack Coding Performance for ${s.studentName}** (\`${s.registerNumber}\`):\n\n` +
                    `- **Skillrack Rank**: **${sr.skillrack_rank || 'N/A'}**\n` +
                    `- **Total Programs Solved**: **${sr.total_programs_solved || 0}**\n` +
                    `- **Daily Challenge (DC)**: ${sr.daily_challenge || sr.dc || 0} | **Daily Test (DT)**: ${sr.daily_test || sr.dt || 0}\n` +
                    `- **Medals**: 🥇 Gold: ${sr.gold_medals || 0} | 🥈 Silver: ${sr.silver_medals || 0} | 🥉 Bronze: ${sr.bronze_medals || 0}\n` +
                    `- **Language Solved**: C: ${sr.c_programs || 0}, C++: ${sr.cpp_programs || 0}, Java: ${sr.java_programs || 0}, Python: ${sr.python_programs || 0}, SQL: ${sr.sql_programs || 0}\n` +
                    `- **Level Progress**: L1: ${sr.level_1 || 0}, L2: ${sr.level_2 || 0}, L3: ${sr.level_3 || 0}, L4: ${sr.level_4 || 0}, L5: ${sr.level_5 || 0}, L6: ${sr.level_6 || 0}`;
          }
        }
        intent = 'staff_specific_student_skillrack';
      }

      // C. SPECIFIC STUDENT ATTENDANCE QUERY BY REG NO OR NAME (e.g. "student attendance")
      else if (targetStudentSearch && (norm.includes('attendance') || norm.includes('present') || norm.includes('absent'))) {
        const access = await dbServiceLogin.checkStudentTutorWardAccess(authUser, targetStudentSearch);
        if (!access.exists) {
          reply = `No student record found matching **"${targetStudentSearch}"** in the database.`;
        } else if (!access.isAuthorized) {
          reply = `⚠️ **Access Restricted**: Student **${access.student.studentName}** (\`${access.student.registerNumber}\`) is not in your assigned tutor ward or department.`;
        } else {
          const searchResult = await dbServiceLogin.getStudentAttendanceByStaff(access.student.registerNumber);
          if (!searchResult) {
            reply = `Could not load attendance details for student \`${access.student.registerNumber}\`.`;
          } else {
            const { studentInfo, overall, subjects } = searchResult;
            reply = `📊 **Attendance Report for Student**: **${studentInfo.studentName}** (Reg No: \`${studentInfo.registerNumber}\`)\n` +
                    `- **Department**: ${studentInfo.departmentAcr || 'N/A'}, Semester: ${studentInfo.semester || 'N/A'}\n` +
                    `- **Overall Attendance**: **${overall.percentage}%** (${overall.daysPresent} present / ${overall.totalDays} working days)\n` +
                    `- **Exam Eligibility**: ${overall.isEligible ? '✅ **Eligible (>= 75%)**' : '⚠️ **Low Attendance (< 75%)**'}\n\n` +
                    `📚 **Subject-wise Period Attendance Breakdown**:\n` +
                    (subjects.length > 0 ? subjects.map(s => `- **${s.courseCode}** (${s.courseTitle}): **${s.percentage}%** (${s.presentPeriods}/${s.totalPeriods} periods)`).join('\n') : '- No period records found.');
          }
        }
        intent = 'staff_student_attendance_search';
      }

      // D. SPECIFIC STUDENT FULL STATUS & GENERAL DETAILS BY REG NO OR NAME (e.g. "student status")
      else if (targetStudentSearch) {
        const details = await dbServiceLogin.getStudentFullGeneralDetails(authUser, targetStudentSearch);
        if (details.status === 'NOT_FOUND') {
          reply = details.message;
        } else if (details.status === 'UNAUTHORIZED') {
          reply = details.message;
        } else {
          const s = details.student;
          reply = `👤 **Student Status & Academic Profile: ${s.studentName}** (\`${s.registerNumber}\`):\n\n` +
                  `- 🏫 **Department**: ${s.departmentName || s.departmentAcr || 'N/A'}\n` +
                  `- 📅 **Batch**: ${s.batch || 'N/A'} | **Semester**: ${s.semester || 'N/A'} | **Section**: ${s.section || 'N/A'}\n` +
                  `- 📧 **Personal Email**: ${s.personal_email || 'N/A'}\n` +
                  `- 📞 **Personal Phone**: ${s.personal_phone || 'N/A'}\n` +
                  `- 🎒 **Student Type**: ${s.student_type || 'Day-Scholar'}\n` +
                  `- 👨‍🏫 **Assigned Tutor**: ${s.tutorName || s.tutorEmail || 'N/A'}\n\n` +
                  `📊 **Academic Performance Summary**:\n` +
                  `- 📈 **Overall Attendance**: **${details.attData?.percentage || 0}%** (${details.attData?.isEligible ? 'Eligible ✅' : 'Shortage ⚠️'})\n` +
                  `- 🎓 **Cumulative CGPA**: **${details.gpaData?.currentCGPA || 'N/A'}** (Total Earned Credits: **${details.gpaData?.overallEarnedCredits || 0}**)\n` +
                  `- 💻 **Skillrack Rank**: **${details.srData?.skillrack_rank || 'N/A'}** (${details.srData?.total_programs_solved || 0} solved)\n` +
                  `- 🛠️ **Projects**: ${details.projectsCount} | 💼 **Internships**: ${details.internshipsCount} | 📘 **Online Courses**: ${details.coursesCount}\n\n` +
                  `*Ask: "progress of ${s.registerNumber}" or "${s.studentName} skillrack" for deeper details!*`;
        }
        intent = 'staff_student_status_search';
      }

      // E. GENERAL WARD STUDENTS LIST
      else {
        const wards = await dbServiceLogin.getStaffWardStudents(authUser.userId, authUser.userMail);
        if (wards.length === 0) {
          reply = `No ward students currently assigned to your faculty profile in the system.`;
        } else {
          reply = `👨‍🏫 **My Assigned Ward Students (${wards.length} Total)**:\n\n` +
            wards.map((w, index) => `${index + 1}. **${w.studentName}** (\`${w.registerNumber}\`)\n   - Department: ${w.departmentAcr || 'N/A'} | Batch: ${w.batch || 'N/A'} | Semester: ${w.semester || 'N/A'} | Type: ${w.student_type || 'Day-Scholar'}\n   - Contact: 📧 ${w.personal_email || 'N/A'} | 📞 ${w.personal_phone || 'N/A'}`).join('\n\n') +
            `\n\n*Ask: "students skillrack", "my ward students attendance", or "my ward students progress" for deeper insights!*`;
        }
        intent = 'staff_ward_students_list';
      }
    }


    // ----------------------------------------------------
    // 3. STAFF ACTIVITIES & SPECIFIC STAFF DETAILS INTENT (Administrators & Staff)
    // ----------------------------------------------------
    else if ((isStaff || isAdmin) && (
      norm.includes('staff activities') ||
      norm.includes('faculty activities') ||
      norm.includes('staff detail') ||
      norm.includes('staff profile') ||
      norm.includes('faculty detail') ||
      mentionedStaffId ||
      (norm.includes('staff') && (norm.includes('fundedproject') || norm.includes('patent') || norm.includes('seedmoney') || norm.includes('event'))) ||
      (norm.includes('my') && (norm.includes('fundedproject') || norm.includes('seedmoney') || norm.includes('patent') || norm.includes('consultancy') || norm.includes('education') || norm.includes('activity') || norm.includes('activities')))
    )) {

      const targetStaffSearch = mentionedStaffId || (norm.includes('my') ? null : extractTargetName(cleanMessage));

      // Scenario A: Searching specific staff member details and activities portfolio by name or staff ID
      if (targetStaffSearch && !norm.includes('all staff')) {
        const staffRes = await dbServiceLogin.getStaffDetailsAndActivitiesByAdmin(targetStaffSearch, authUser);
        if (!staffRes) {
          reply = `No faculty record matching **"${targetStaffSearch}"** found in the database.`;
        } else if (!staffRes.isAuthorized) {
          reply = `🔒 **Access Denied**: As ${authUser.positionTitle || 'Department Administrator'} for **${staffRes.userDept || authUser.departmentAcr || 'your department'}**, you can only view faculty members in your department. Faculty **${staffRes.staff.firstName} ${staffRes.staff.lastName || ''}** belongs to **${staffRes.staffDept || 'another department'}**.`;
        } else {
          const { staff, activities, taughtCoursesCount, wardStudentsCount } = staffRes;
          reply = `👨‍🏫 **Faculty Profile & Activities Portfolio: ${staff.firstName} ${staff.lastName || ''}** (\`${staff.staffId}\`):\n\n` +
                  `- **Designation**: ${staff.designation || 'Faculty'} | Department: **${staff.departmentAcr || 'N/A'}**\n` +
                  `- **Contact Email**: ${staff.employeeMail || 'N/A'} | Mobile: ${staff.mobileNumber || 'N/A'}\n` +
                  `- **Tutor Ward Students**: **${wardStudentsCount}** assigned wards | **Taught Courses**: **${taughtCoursesCount}** allocated\n\n` +
                  `📊 **Submitted Activities Portfolio**:\n` +
                  `- 💰 **Funded Projects**: ${activities.fundedProjects.length} project(s)\n` +
                  `- 🌱 **Seed Money Grants**: ${activities.seedMoney.length} grant(s)\n` +
                  `- 📜 **Patents & Products**: ${activities.patents.length} patent(s)\n` +
                  `- 💼 **Consultancy Projects**: ${activities.consultancy.length} project(s)\n` +
                  `- 🎪 **Events Attended**: ${activities.eventsAttended.length} event(s)\n` +
                  `- 📢 **Events Organized**: ${activities.eventsOrganized.length} event(s)\n` +
                  `- 📘 **Publications & Books**: ${activities.bookChapters.length} publication(s)\n` +
                  `- 🎓 **Education Qualification**: ${activities.education ? (activities.education.phd_status ? `Ph.D. (${activities.education.phd_status})` : 'Degree Recorded') : 'Not Updated'}`;
        }
        intent = 'staff_details_search_admin';
      }

      // Scenario B: Querying self staff activities (e.g. "my funded projects", "my seed money", "my patents", "my education")
      else if (norm.includes('my') || !isAdmin) {
        if (norm.includes('fundedproject') || norm.includes('funded')) {
          const projects = await dbServiceLogin.getStaffFundedProjects(authUser.userId);
          if (projects.length === 0) {
            reply = `No funded project proposals recorded in your faculty profile. You can record sponsored research under the **Funded Projects** tab.`;
          } else {
            reply = `💰 **Funded Projects Portfolio for Faculty ${authUser.userName} (${projects.length})**:\n\n` +
              projects.map(p => `- **${p.project_title}**\n  PI: ${p.pi_name} | Co-PI: ${p.co_pi_names || 'None'}\n  Agency: **${p.funding_agency}** (${p.organization_name})\n  Sanctioned Amount: **₹${p.amount}** | Received: **₹${p.amount_received}**\n  Duration: ${new Date(p.from_date).toLocaleDateString()} to ${new Date(p.to_date).toLocaleDateString()} | Students Involved: \`${p.students_involved}\``).join('\n\n');
          }
          intent = 'staff_funded_projects';
        } else if (norm.includes('seedmoney')) {
          const seeds = await dbServiceLogin.getStaffSeedMoney(authUser.userId);
          if (seeds.length === 0) {
            reply = `No seed money project entries found in your profile. You can apply or document seed money grants under the **Seed Money** tab.`;
          } else {
            reply = `🌱 **Seed Money Grants for Faculty ${authUser.userName} (${seeds.length})**:\n\n` +
              seeds.map(s => `- **${s.project_title}** (Duration: ${s.project_duration})\n  Amount Granted: **₹${s.amount}**\n  Period: ${new Date(s.from_date).toLocaleDateString()} to ${new Date(s.to_date).toLocaleDateString()}\n  Outcomes: ${s.outcomes || 'N/A'}`).join('\n\n');
          }
          intent = 'staff_seed_money';
        } else if (norm.includes('patent')) {
          const patents = await dbServiceLogin.getStaffPatents(authUser.userId);
          if (patents.length === 0) {
            reply = `No patent or product development records found in your profile. You can record patents filed/granted under the **Patents & Projects** tab.`;
          } else {
            reply = `📜 **Patents & Product Innovations for Faculty ${authUser.userName} (${patents.length})**:\n\n` +
              patents.map(p => `- **${p.project_title}**\n  Status: \`${p.patent_status}\` | Month/Year: ${p.month_year}\n  Working Model: ${p.working_model ? '✅ Yes' : '❌ No'} | Prototype Developed: ${p.prototype_developed ? '✅ Yes' : '❌ No'}`).join('\n\n');
          }
          intent = 'staff_patents';
        } else {
          const summary = await dbServiceLogin.getStaffAllActivitiesSummary(authUser.userId);
          reply = `📊 **Staff Activities Summary for ${authUser.userName}**:\n\n` +
                  `- 💰 **Funded Projects**: ${summary.fundedProjects.length} project(s)\n` +
                  `- 🌱 **Seed Money Grants**: ${summary.seedMoney.length} grant(s)\n` +
                  `- 📜 **Patents & Products**: ${summary.patents.length} patent(s)\n` +
                  `- 💼 **Consultancy Projects**: ${summary.consultancy.length} project(s)\n` +
                  `- 🎪 **Events & FDPs Attended**: ${summary.eventsAttended.length} event(s)\n` +
                  `- 📢 **Events & Workshops Organized**: ${summary.eventsOrganized.length} event(s)\n` +
                  `- 📘 **Publications & Book Chapters**: ${summary.bookChapters.length} publication(s)\n` +
                  `- 🎓 **Education Details**: ${summary.education ? (summary.education.phd_status ? `Ph.D. (${summary.education.phd_status})` : 'UG/PG Recorded') : 'Not Updated'}\n\n` +
                  `*Ask specifically: "show my funded projects", "my seed money", "my patents", or "my education".*`;
          intent = 'staff_activities_summary';
        }
      }

      // Scenario C: Querying department or institution-wide staff activities overview (for Admins / HODs)
      else {
        let deptFilter = authUser.departmentAcr;
        if (authUser.accessTier === 'super_admin' || ['principal', 'director', 'chairman', 'superadmin', 'admin'].includes(authUser.role)) {
          deptFilter = null;
        }
        const summaryList = await dbServiceLogin.getDepartmentStaffActivitiesSummary(deptFilter);
        if (summaryList.length === 0) {
          reply = `No staff activities recorded in the database for department ${deptFilter || 'all'}.`;
        } else {
          reply = `📊 **Faculty Activities Summary for Department ${authUser.departmentAcr || 'Overview'} (${summaryList.length} Staff Members)**:\n\n` +
            summaryList.map(s => `- **${s.staffName}** (${s.designation || 'Faculty'} - \`${s.staffId}\`)\n` +
                                 `  Funded Projects: **${s.fundedProjects}** | Patents: **${s.patents}** | Publications: **${s.publications}** | Events Attended/Organized: **${s.eventsAttended}/${s.eventsOrganized}**`).join('\n\n') +
            `\n\n*Tip: You can query a specific faculty member by name or staff ID, e.g., "${summaryList[0]?.staffName || 'Dr. Suresh'} details".*`;
        }
        intent = 'department_staff_activities_summary';
      }
    }


    // ----------------------------------------------------
    // 4. STUDENT CODING PROFILE & LINKS INTENT (LeetCode, GitHub, SkillRack, Portfolio)
    // ----------------------------------------------------
    else if (norm.includes('codingprofile') || norm.includes('coding profile') || norm.includes('leetcode') || norm.includes('github')) {
      if (isStudent || authUser.userId) {
        const codeData = await dbServiceLogin.getStudentCodingProfilesAndLinks(authUser.userId, authUser.registerNumber);
        const { skillrackProfile, githubProfile, leetcodeProfile, portfolioProfile, competency, skillrack } = codeData;

        let linksText = '';
        if (skillrackProfile) linksText += `- 💻 **Skillrack Profile**: [Skillrack Handle / Link](${skillrackProfile})\n`;
        if (leetcodeProfile) linksText += `- 🚀 **LeetCode Profile**: [LeetCode Handle / Link](${leetcodeProfile})\n`;
        if (githubProfile) linksText += `- 🐙 **GitHub Profile**: [GitHub Profile Link](${githubProfile})\n`;
        if (portfolioProfile) linksText += `- 🌐 **Portfolio Website**: [Personal Portfolio Link](${portfolioProfile})\n`;

        if (!linksText) {
          linksText = `- *No external profile links added yet. Update LeetCode, GitHub & Skillrack URLs in your Student Personal Profile.*`;
        }

        reply = `💻 **Coding Profile & Handles for ${authUser.userName}** (\`${authUser.registerNumber || authUser.userId}\`):\n\n` +
                `🔗 **Coding Profile Links**:\n` + linksText + `\n` +
                `📊 **Competency & Skillrack Statistics**:\n` +
                `- **Competency Level**: **${competency?.competency_level || 'Intermediate'}**\n` +
                `- **Career Objectives**: ${competency?.career_objectives || 'Software Development / Core Engineering'}\n` +
                `- **Specialization**: ${competency?.specialization_chosen || 'N/A'}\n` +
                `- **Skillrack Total Programs Solved**: **${skillrack?.total_programs_solved || 0}** (Rank: **${skillrack?.skillrack_rank || 'N/A'}**)\n` +
                `- **Medals**: 🥇 ${skillrack?.gold_medals || 0} Gold | 🥈 ${skillrack?.silver_medals || 0} Silver | 🥉 ${skillrack?.bronze_medals || 0} Bronze`;

        intent = 'student_coding_profile_links';
      }
    }


    // ----------------------------------------------------
    // 5. STUDENT COMPLETED COURSE CATEGORY INTENT
    // ----------------------------------------------------
    else if (norm.includes('completed course') || norm.includes('course category') || norm.includes('passed course')) {
      if (isStudent || authUser.registerNumber) {
        const grouped = await dbServiceLogin.getStudentCompletedCoursesByCategory(authUser.userId, authUser.registerNumber);
        const categories = Object.keys(grouped);

        if (categories.length === 0) {
          reply = `No completed course records found for your active profile.`;
        } else {
          reply = `📚 **Completed Courses Breakdown by Category for ${authUser.userName}** (\`${authUser.registerNumber}\`):\n\n` +
            categories.map(cat => {
              const courses = grouped[cat];
              const totalCreds = courses.reduce((sum, c) => sum + (c.credits || 0), 0);
              return `📁 **Category: ${cat}** (${courses.length} course(s)${totalCreds > 0 ? `, ${totalCreds} Credits` : ''}):\n` +
                     courses.map(c => `   - **${c.courseCode}**: ${c.courseTitle} (${c.credits || 0} Credits, Type: ${c.type || 'Theory'})`).join('\n');
            }).join('\n\n');
        }
        intent = 'student_completed_course_categories';
      }
    }


    // ----------------------------------------------------
    // 6. STUDENT NON-CGPA INTENT
    // ----------------------------------------------------
    else if (norm.includes('noncgpa')) {
      if (isStudent || authUser.userId) {
        const nonCgpa = await dbServiceLogin.getStudentNonCGPA(authUser.userId);
        if (nonCgpa.length > 0) {
          reply = `🎗️ **Non-CGPA Value-Added Courses for ${authUser.userName}**:\n\n` +
                  nonCgpa.map(n => `- **Category ${n.category_no || 'N/A'}**: **${n.course_code} - ${n.course_name}**\n  Duration: ${n.no_of_days || 0} day(s) | Period: ${new Date(n.from_date).toLocaleDateString()} to ${new Date(n.to_date).toLocaleDateString()}\n  Status: ${n.pending ? '⏳ Pending Tutor Approval' : '✅ Verified'}`).join('\n');
        } else {
          reply = `No Non-CGPA course entries recorded in your profile. You can register your value-added Non-CGPA courses under the **Non CGPA** tab.`;
        }
        intent = 'student_noncgpa';
      }
    }


    // ----------------------------------------------------
    // 7. STAFF CGPA RANKING QUERY (Faculty/Admin only)
    // ----------------------------------------------------
    else if (isStaff && (isRankingQuery || (norm.includes('cgpa') && (norm.includes('year') || norm.includes('class') || norm.includes('cse') || norm.includes('it') || norm.includes('ece'))))) {
      const dept = parseDepartment(cleanMessage);
      const yr = parseYear(cleanMessage);
      const rankList = await dbServiceLogin.getStaffStudentCGPARanking({ department: dept, year: yr, limit: 15 });

      if (rankList.length === 0) {
        reply = `No student CGPA records found matching **${dept}** ${yr ? `${yr} Year` : ''} in the database.`;
      } else {
        const yrLabel = yr ? `${yr} Year` : 'All Years';
        reply = `🏆 **Student CGPA Rank List for ${dept} (${yrLabel})**:\n\n` +
                rankList.map(r => `**${r.rank}.** **${r.studentName || 'Student'}** (\`${r.registerNumber}\`)\n   - CGPA: **${r.cgpa}** | Latest GPA: **${r.gpa}** | Cumulative Earned Credits: **${r.cumulativeEarnedCredits}**`).join('\n\n');
      }
      intent = 'staff_student_cgpa_ranking';
    }


    // ----------------------------------------------------
    // 8. STAFF DEPARTMENT CLASS ATTENDANCE QUERY (Faculty/Admin only)
    // ----------------------------------------------------
    else if (isStaff && (norm.includes('attendance') || norm.includes('present') || norm.includes('absent') || norm.includes('shortage')) && (norm.includes('year') || norm.includes('today') || norm.includes('month') || norm.includes('cse') || norm.includes('it') || norm.includes('ece') || norm.includes('mech') || norm.includes('eee') || norm.includes('civil'))) {
      const dept = parseDepartment(cleanMessage);
      const yr = parseYear(cleanMessage);
      const isMonthly = norm.includes('month') || norm.includes('monthly') || norm.includes('cummulative') || norm.includes('cumulative');
      const timeframe = isMonthly ? 'month' : 'today';

      const attData = await dbServiceLogin.getStaffDepartmentClassAttendance({ department: dept, year: yr, timeframe });

      const yrLabel = yr ? `${yr} Year` : 'All Batches';
      const timeLabel = isMonthly ? 'Current Month (Cumulative)' : 'Today';

      reply = `📊 **Class Attendance Summary for ${dept} (${yrLabel})**:\n\n` +
              `- **Timeframe**: ${timeLabel}\n` +
              `- **Overall Attendance Percentage**: **${attData.percentage}%**\n` +
              `- **Total Enrolled Students Marked**: ${attData.totalStudents} students\n` +
              `- **Present Count**: ${attData.presentDays} | **Absent Count**: ${attData.absentDays}\n` +
              `- **Latest Date**: ${attData.latestDate ? new Date(attData.latestDate).toLocaleDateString() : 'N/A'}\n\n` +
              `*You can also ask: "ranking of students based on cgpa for iii yr cse" or "who has low attendance"*`;
      intent = 'staff_department_attendance';
    }


    // ----------------------------------------------------
    // 9. STUDENT CGPA & CREDITS INTENT (Specific Semester vs Overall Cumulative)
    // ----------------------------------------------------
    else if (norm.includes('cgpa') || norm.includes('gpa') || norm.includes('grade') || norm.includes('earned credit') || norm.includes('credit')) {
      const targetSem = parseSpecificSemester(cleanMessage);

      if (isStudent || authUser.registerNumber) {
        const gpaData = await dbServiceLogin.getStudentCGPAAndGPA(authUser.registerNumber, targetSem);

        if (!gpaData) {
          reply = `No grade point average records (CGPA/GPA) found for register number \`${authUser.registerNumber}\`.`;
        } else if (targetSem !== null && gpaData.specificSemData) {
          const sData = gpaData.specificSemData;
          reply = `🎓 **Academic Performance for Semester ${targetSem} for ${authUser.userName}** (\`${authUser.registerNumber}\`):\n\n` +
                  `- **Semester ${targetSem} GPA**: **${sData.gpa || 'N/A'}**\n` +
                  `- **Semester ${targetSem} CGPA**: **${sData.cgpa || sData.gpa || 'N/A'}**\n` +
                  `- **Earned Credits for Semester ${targetSem}**: **${sData.earnedCredits || 'N/A'}** / **${sData.totalCredits || 'N/A'}**\n\n` +
                  `*Overall Cumulative CGPA across all semesters is **${gpaData.currentCGPA}** with **${gpaData.overallEarnedCredits}** total cumulative credits earned.*`;
        } else {
          reply = `🎓 **Cumulative Academic Performance & Grades for ${authUser.userName}** (\`${authUser.registerNumber}\`):\n\n` +
                  `- **Current Cumulative CGPA**: **${gpaData.currentCGPA || 'N/A'}**\n` +
                  `- **Total Cumulative Earned Credits**: **${gpaData.overallEarnedCredits || 'N/A'}** / **${gpaData.overallTotalCredits || 'N/A'}** credits\n` +
                  `- **Latest Semester (Sem ${gpaData.latestSemester}) GPA**: **${gpaData.latestGPA || 'N/A'}**\n\n` +
                  `📚 **Semester-wise History Breakdown**:\n` +
                  (gpaData.history.length > 0
                    ? gpaData.history.map(h => `- **Semester ${h.semesterNumber}**: GPA: **${h.gpa || 'N/A'}** | CGPA: **${h.cgpa || h.gpa || 'N/A'}** | Earned Credits: **${h.earnedCredits || 0}**`).join('\n')
                    : 'No semester history recorded yet.') +
                  `\n\n*Tip: You can ask specifically for a single semester like "2 sem cgpa" or "semester 3 gpa".*`;
        }
        intent = 'student_cgpa';
      } else if (isStaff) {
        reply = `👨‍🏫 Faculty can review class student ranks using queries like *"ranking of students based on cgpa for iii yr cse"*.`;
        intent = 'staff_grades_info';
      }
    }


    // ----------------------------------------------------
    // 10. NPTEL & ONLINE COURSES INTENT
    // ----------------------------------------------------
    else if (norm.includes('nptel') || norm.includes('online course') || norm.includes('coursera') || norm.includes('udemy')) {
      if (isStudent || authUser.userId) {
        const { onlineCourses, nptelCourses } = await dbServiceLogin.getStudentOnlineCoursesAndNPTEL(authUser.userId, authUser.registerNumber);

        let onlineText = '';
        if (onlineCourses.length > 0) {
          onlineText += `💻 **Online Courses (${onlineCourses.length})**:\n` +
            onlineCourses.map(c => `- **${c.course_name}** (${c.type || 'Online'} by ${c.provider_name || 'N/A'})\n  Status: \`${c.status || 'Enrolled'}\` | Tutor Approval: ${c.tutor_approval_status ? '✅ Approved' : (c.pending ? '⏳ Pending' : '❌ Rejected')}`).join('\n');
        }

        let nptelText = '';
        if (nptelCourses.length > 0) {
          nptelText += `📘 **NPTEL Courses (${nptelCourses.length})**:\n` +
            nptelCourses.map(n => `- **${n.course_name}** (${n.weeks || 12} Weeks, ${n.department || 'NPTEL'})\n  Status: \`${n.status || 'In Progress'}\` | Total Marks: **${n.total_marks || 'N/A'}** | Grade: **${n.grade || 'N/A'}** | Credit Transfer: \`${n.credit_transfer || 'No'}\``).join('\n');
        }

        if (onlineText || nptelText) {
          reply = `🌐 **NPTEL & Online Courses Records for ${authUser.userName}** (\`${authUser.registerNumber || authUser.userId}\`):\n\n` +
                  [onlineText, nptelText].filter(Boolean).join('\n\n');
        } else {
          reply = `No NPTEL or Online Course enrollment records found in your profile. You can register new online courses under the **Online Courses** menu tab.`;
        }
        intent = 'student_online_courses';
      }
    }


    // ----------------------------------------------------
    // 11. CERTIFICATIONS INTENT
    // ----------------------------------------------------
    else if (norm.includes('certification')) {
      if (isStudent || authUser.userId) {
        const certs = await dbServiceLogin.getStudentCertifications(authUser.userId);
        if (certs.length > 0) {
          reply = `📜 **Certifications for ${authUser.userName}** (\`${authUser.registerNumber || authUser.userId}\`):\n\n` +
                  certs.map(c => `- **${c.certificate_name}** (${c.certificate_type})\n  Status: ${c.verification_status === 'Approved' ? '✅ Approved' : (c.verification_status === 'Rejected' ? '❌ Rejected' : '⏳ Pending Verification')}`).join('\n');
        } else {
          reply = `No certification documents found in your profile. You can upload academic and extra-curricular certificates under the **Certifications** menu tab.`;
        }
        intent = 'student_certifications';
      }
    }


    // ----------------------------------------------------
    // 12. INTERNSHIPS INTENT
    // ----------------------------------------------------
    else if (norm.includes('internship')) {
      if (isStudent || authUser.userId) {
        const internships = await dbServiceLogin.getStudentInternships(authUser.userId);
        if (internships.length > 0) {
          reply = `💼 **Internship Records for ${authUser.userName}**:\n\n` +
                  internships.map(i => `- **${i.provider_name}** (${i.domain || 'Tech'})\n  Mode: ${i.mode || 'Offline'} | Stipend: \`₹${i.stipend_amount || 0}\` | Status: \`${i.status || 'Completed'}\` | Tutor Status: ${i.tutor_approval_status ? '✅ Approved' : '⏳ Pending'}`).join('\n');
        } else {
          reply = `No internship records found in your profile. You can record your industrial training and internships under the **Internships** tab.`;
        }
        intent = 'student_internships';
      }
    }


    // ----------------------------------------------------
    // 13. SCHOLARSHIPS INTENT
    // ----------------------------------------------------
    else if (norm.includes('scholarship')) {
      if (isStudent || authUser.userId) {
        const scholarships = await dbServiceLogin.getStudentScholarships(authUser.userId);
        if (scholarships.length > 0) {
          reply = `🎁 **Scholarship Details for ${authUser.userName}**:\n\n` +
                  scholarships.map(s => `- **${s.name}** (${s.provider})\n  Type: ${s.type} (${s.year}) | Status: \`${s.status}\` | Amount: \`₹${s.receivedAmount || 0}\``).join('\n');
        } else {
          reply = `No scholarship records found in your profile. You can submit details of merit or need-based scholarships under the **Scholarships** tab.`;
        }
        intent = 'student_scholarships';
      }
    }


    // ----------------------------------------------------
    // 14. LEAVE REQUEST INTENT
    // ----------------------------------------------------
    else if (norm.includes('leave')) {
      if (isStudent || authUser.userId) {
        const leaves = await dbServiceLogin.getStudentLeaveRequests(authUser.userId);
        if (leaves.length > 0) {
          reply = `📝 **Leave Requests History for ${authUser.userName}**:\n\n` +
                  leaves.map(l => `- **${l.leave_type} Leave**: ${l.reason}\n  Dates: ${new Date(l.start_date).toLocaleDateString()} to ${new Date(l.end_date).toLocaleDateString()} | Status: ${l.leave_status === 'approved' ? '✅ Approved' : (l.leave_status === 'rejected' ? '❌ Rejected' : '⏳ Pending')}`).join('\n');
        } else {
          reply = `No leave application history found. You can submit digital leave applications under the **Leave Request** tab.`;
        }
        intent = 'student_leave';
      }
    }


    // ----------------------------------------------------
    // 15. HACKATHONS INTENT
    // ----------------------------------------------------
    else if (norm.includes('hackathon')) {
      if (isStudent || authUser.userId) {
        const hackathons = await dbServiceLogin.getStudentHackathons(authUser.userId);
        if (hackathons.length > 0) {
          reply = `⚡ **Hackathon Participation & Achievements for ${authUser.userName}**:\n\n` +
                  hackathons.map(h => `- **${h.event_name}** (Organized by ${h.organized_by})\n  Rounds Cleared: ${h.level_cleared || h.rounds} | Category: \`${h.status}\` | Status: ${h.tutor_approval_status ? '✅ Verified' : '⏳ Pending'}`).join('\n');
        } else {
          reply = `No hackathon participation records found. You can register your hackathon competitions and achievements under the **Hackathon** tab.`;
        }
        intent = 'student_hackathons';
      }
    }


    // ----------------------------------------------------
    // 16. EXTRACURRICULAR INTENT
    // ----------------------------------------------------
    else if (norm.includes('extracurricular') || norm.includes('fine art') || norm.includes('sports') || norm.includes('cultural') || norm.includes('debate')) {
      if (isStudent || authUser.userId) {
        const extra = await dbServiceLogin.getStudentExtracurricular(authUser.userId);
        if (extra.length > 0) {
          reply = `🏆 **Extracurricular Activities & Achievements for ${authUser.userName}**:\n\n` +
                  extra.map(e => `- **${e.type}** (${e.level} Level)\n  Status: \`${e.status}\` ${e.prize ? `| Prize: ${e.prize} Place` : ''} | Description: ${e.description || 'N/A'}`).join('\n');
        } else {
          reply = `No extracurricular activity records found. You can add your sports, fine arts, and cultural achievements under the **Extracurricular** tab.`;
        }
        intent = 'student_extracurricular';
      }
    }


    // ----------------------------------------------------
    // 17. PROJECTS INTENT
    // ----------------------------------------------------
    else if (norm.includes('project')) {
      if (isStudent || authUser.userId) {
        const projects = await dbServiceLogin.getStudentProjects(authUser.userId);
        if (projects.length > 0) {
          reply = `🛠️ **Project Portfolio for ${authUser.userName}**:\n\n` +
                  projects.map(p => `- **${p.title}** (Domain: ${p.domain})\n  Description: ${p.description || 'N/A'}\n  Status: \`${p.status}\` | GitHub: ${p.github_link || 'N/A'}`).join('\n');
        } else {
          reply = `No academic or personal project records found. You can document your software & hardware projects under the **Projects** tab.`;
        }
        intent = 'student_projects';
      }
    }


    // ----------------------------------------------------
    // 18. SKILLRACK INTENT FOR STUDENTS
    // ----------------------------------------------------
    else if (norm.includes('skillrack')) {
      if (isStudent || authUser.userId) {
        const sr = await dbServiceLogin.getStudentSkillrack(authUser.userId, authUser.registerNumber);
        if (sr) {
          reply = `💻 **Skillrack Coding Statistics for ${authUser.userName}** (\`${authUser.registerNumber || 'Student'}\`):\n\n` +
                  `- **Total Programs Solved**: **${sr.total_programs_solved || 0}**\n` +
                  `- **Skillrack Rank**: **${sr.skillrack_rank || 'N/A'}**\n` +
                  `- **Daily Challenge (DC)**: ${sr.daily_challenge || sr.dc || 0} | **Daily Test (DT)**: ${sr.daily_test || sr.dt || 0}\n` +
                  `- **Medals**: 🥇 Gold: ${sr.gold_medals || 0} | 🥈 Silver: ${sr.silver_medals || 0} | 🥉 Bronze: ${sr.bronze_medals || 0}\n` +
                  `- **Language Breakdown**: C: ${sr.c_programs || 0}, C++: ${sr.cpp_programs || 0}, Java: ${sr.java_programs || 0}, Python: ${sr.python_programs || 0}, SQL: ${sr.sql_programs || 0}\n` +
                  `- **Level Progress**: L1: ${sr.level_1 || 0}, L2: ${sr.level_2 || 0}, L3: ${sr.level_3 || 0}, L4: ${sr.level_4 || 0}, L5: ${sr.level_5 || 0}, L6: ${sr.level_6 || 0}`;
        } else {
          reply = `No Skillrack performance statistics found for your register number.`;
        }
        intent = 'student_skillrack';
      }
    }


    // ----------------------------------------------------
    // 19. PUBLICATIONS INTENT
    // ----------------------------------------------------
    else if (norm.includes('publication') || norm.includes('doi')) {
      if (isStudent || authUser.userId) {
        const pubs = await dbServiceLogin.getStudentPublications(authUser.userId);
        if (pubs.length > 0) {
          reply = `📄 **Research Publications & Patents for ${authUser.userName}**:\n\n` +
                  pubs.map(p => `- **${p.title}** (${p.publication_type} - ${p.publication_name || 'Publisher'})\n  Index: ${p.index_type || 'Scopus'} | Status: \`${p.publication_status}\` | DOI: ${p.doi || 'N/A'}`).join('\n');
        } else {
          reply = `No research publications found. You can add your journal papers, conference articles, and patents under the **Publications** tab.`;
        }
        intent = 'student_publications';
      }
    }


    // ----------------------------------------------------
    // 20. EDUCATION INTENT
    // ----------------------------------------------------
    else if (norm.includes('education') || norm.includes('school') || norm.includes('10th') || norm.includes('12th') || norm.includes('diploma') || norm.includes('hsc') || norm.includes('sslc')) {
      if (isStudent || authUser.userId) {
        const edu = await dbServiceLogin.getStudentEducation(authUser.userId);
        if (edu) {
          reply = `🏫 **Academic Background & Qualification for ${authUser.userName}**:\n\n` +
                  `- **10th Standard (SSLC)**: ${edu.tenth_school_name || 'N/A'} (${edu.tenth_board || 'State Board'}) -> **${edu.tenth_percentage || 'N/A'}%** (${edu.tenth_year_of_passing || 'N/A'})\n` +
                  `- **12th Standard / Diploma**: ${edu.twelfth_school_name || 'N/A'} (${edu.twelfth_board || 'HSC'}) -> **${edu.twelfth_percentage || 'N/A'}%** (${edu.twelfth_year_of_passing || 'N/A'})\n` +
                  `- **Current Degree**: ${edu.degree_name || 'B.E./B.Tech'} in ${edu.degree_specialization || 'Engineering'} (${edu.degree_institution_name || 'NEC'}) | CGPA: **${edu.cgpa || 'N/A'}**`;
        } else {
          reply = `No prior school or diploma records found. You can enter educational details under the **Education** tab.`;
        }
        intent = 'student_education';
      }
    }


    // ----------------------------------------------------
    // 21. PLACEMENT INTENT
    // ----------------------------------------------------
    else if (norm.includes('placement') || norm.includes('placed') || norm.includes('company') || norm.includes('interview')) {
      if (isStudent || authUser.userId) {
        const { placementInfo, attendedCompanies } = await dbServiceLogin.getStudentPlacementInfo(authUser.userId);

        let infoText = '';
        if (placementInfo) {
          infoText = `- **Career Objective**: ${placementInfo.career_objective || 'Software / Core'}\n` +
                     `- **Specialization**: ${placementInfo.specialization || 'N/A'}\n` +
                     `- **Dream Company**: ${placementInfo.dream_company || 'N/A'}\n` +
                     `- **Expected CTC**: ${placementInfo.expected_ctc || 'N/A'}\n\n`;
        }

        let companyText = '';
        if (attendedCompanies.length > 0) {
          companyText = `🏢 **Attended Campus Drives (${attendedCompanies.length})**:\n` +
            attendedCompanies.map(c => `- **${c.company_name}**: Rounds Cleared: ${c.rounds_cleared || 0} | Status: \`${c.status || 'In Progress'}\``).join('\n');
        } else {
          companyText = `No placement drive participation logged yet.`;
        }

        reply = `🚀 **Placement & Recruitment Summary for ${authUser.userName}**:\n\n` + infoText + companyText;
        intent = 'student_placement';
      }
    }


    // ----------------------------------------------------
    // 22. PERSONAL ATTENDANCE INTENTS
    // ----------------------------------------------------
    else if (norm.includes('attendance') || norm.includes('absent') || norm.includes('present') || norm.includes('eligible') || norm.includes('eligibility')) {

      // A. Student querying someone ELSE's attendance (Access Restricted)
      if (isStudent && mentionedRegNo && mentionedRegNo !== authUser.registerNumber) {
        intent = 'access_denied_student';
        sourceType = 'security';
        reply = `⚠️ **Access Restricted**: As a student, you are only authorized to view your own attendance and academic records. Viewing other students' data is restricted to faculty members.`;
      }

      // B. Staff querying low attendance list (< 75%)
      else if (isStaff && (norm.includes('low') || norm.includes('shortage') || norm.includes('defaulter') || norm.includes('below 75') || norm.includes('less than 75'))) {
        const lowList = await dbServiceLogin.getStaffLowAttendanceStudents(authUser.userId, 75);
        if (lowList.length === 0) {
          reply = `Great news! No students currently have attendance below 75% in your assigned classes. 👏`;
        } else {
          reply = `⚠️ **Students with Low Attendance (< 75%)**:\n\n` +
                  lowList.map(s => `- **${s.studentName}** (\`${s.regno}\`) - Course: **${s.courseCode}** -> **${s.percentage}%**`).join('\n');
        }
        intent = 'staff_low_attendance_list';
      }

      // C. Staff querying overall class / assigned sections attendance
      else if (isStaff) {
        if (norm.includes('subject') || norm.includes('section') || norm.includes('classwise') || norm.includes('breakdown')) {
          const sectionsAtt = await dbServiceLogin.getStaffAssignedSectionsAttendance(authUser.userId);
          if (sectionsAtt.length === 0) {
            reply = `No assigned sections or period attendance records found for your faculty profile.`;
          } else {
            reply = `📊 **Section-wise Attendance Summary for Assigned Taught Courses**:\n\n` +
                    sectionsAtt.map(s => `- **${s.courseCode}** (${s.courseTitle}) - **Section ${s.sectionName}**: **${s.percentage}%** (${s.presentRecords}/${s.totalRecords} attendances marked)`).join('\n');
          }
          intent = 'staff_section_attendance';
        } else {
          const staffStats = await dbServiceLogin.getStaffClassAttendanceSummary(authUser.userId);
          reply = `👨‍🏫 **Class Attendance Summary for Faculty**: **${authUser.userName}**\n\n` +
                  `- **Overall Average Attendance**: **${staffStats.percentage}%**\n` +
                  `- **Total Conducted Sessions**: ${staffStats.totalSessions} periods\n` +
                  `- **Total Student Attendances Marked**: ${staffStats.totalPresent} / ${staffStats.totalAttendanceRecords}\n\n` +
                  `*You can ask "show section attendance" for a section-wise breakdown or "who has low attendance" for students below 75%.*`;
          intent = 'staff_overall_attendance';
        }
      }

      // D. Student querying their own attendance
      else if (isStudent || authUser.registerNumber) {
        const studentRegNo = authUser.registerNumber;
        if (norm.includes('subject') || norm.includes('course') || norm.includes('breakdown')) {
          const subAtt = await dbServiceLogin.getStudentSubjectwiseAttendance(studentRegNo);
          reply = `📚 **Subject-wise Attendance Breakdown for ${authUser.userName}** (\`${studentRegNo}\`):\n\n` +
                  (subAtt.length > 0 ? subAtt.map(s => `- **${s.courseCode}** (${s.courseTitle}): **${s.percentage}%** (${s.presentPeriods}/${s.totalPeriods} periods)`).join('\n') : 'No subject-wise period attendance recorded yet.');
          intent = 'student_subjectwise_attendance';
        } else {
          const overallAtt = await dbServiceLogin.getStudentOverallAttendance(studentRegNo);
          reply = `📊 **Personal Attendance Status for ${authUser.userName}** (Reg No: \`${studentRegNo}\`):\n\n` +
                  `- **Total Working Days**: ${overallAtt.totalDays} days\n` +
                  `- **Days Present**: **${overallAtt.daysPresent}** days\n` +
                  `- **Days Absent**: ${overallAtt.daysAbsent} days\n` +
                  `- **Overall Attendance Percentage**: **${overallAtt.percentage}%**\n` +
                  `- **Exam Eligibility Status**: ${overallAtt.isEligible ? '✅ **Eligible to sit for exams (>= 75%)**' : '⚠️ **Attendance Shortage (< 75%)**'}`;
          intent = 'student_overall_attendance';
        }
      }
    }


    // ----------------------------------------------------
    // 23. ENROLLED / ASSIGNED COURSES INTENTS
    // ----------------------------------------------------
    else if (norm.includes('course') || norm.includes('courses') || norm.includes('subject') || norm.includes('subjects') || norm.includes('teaching') || norm.includes('ongoing')) {
      if (isStaff) {
        const staffCourses = await dbServiceLogin.getStaffAssignedCourses(authUser.userId);
        if (staffCourses.length === 0) {
          reply = `You currently have no allocated taught courses in the system.`;
        } else {
          reply = `📖 **Taught Courses & Allocated Sections for Faculty ${authUser.userName}**:\n\n` +
                  staffCourses.map(c => `- **${c.courseCode}**: ${c.courseTitle} (Section: **${c.sectionName || 'All'}**, Credits: ${c.credits}, Type: ${c.type})`).join('\n');
        }
        intent = 'staff_assigned_courses';
      } else if (isStudent || authUser.registerNumber) {
        const studentCourses = await dbServiceLogin.getStudentEnrolledCourses(authUser.registerNumber);
        reply = `📖 **Ongoing Enrolled Courses for ${authUser.userName}** (\`${authUser.registerNumber}\`):\n\n` +
                (studentCourses.length > 0 ? studentCourses.map(c => `- **${c.courseCode}**: ${c.courseTitle} (${c.credits} Credits, Type: ${c.type || 'Theory'})`).join('\n') : 'No enrolled courses found for current active semester.');
        intent = 'student_enrolled_courses';
      }
    }


    // ----------------------------------------------------
    // 24. TIMETABLE / SCHEDULE INTENTS
    // ----------------------------------------------------
    else if (norm.includes('timetable') || norm.includes('schedule') || norm.includes('today') || norm.includes('period')) {
      if (isStaff) {
        const tt = await dbServiceLogin.getStaffTimetable(authUser.userId);
        if (tt.schedule.length === 0) {
          reply = `📅 **Schedule for ${tt.day}**: No teaching periods scheduled today!`;
        } else {
          reply = `📅 **Faculty Timetable for Today (${tt.day})**:\n\n` +
                  tt.schedule.map(s => `- **Period ${s.periodNumber}**: **${s.courseCode}** (${s.courseTitle}) - Section ${s.sectionName || 'A'}`).join('\n');
        }
        intent = 'staff_timetable';
      } else if (isStudent || authUser.registerNumber) {
        const tt = await dbServiceLogin.getStudentTimetable(authUser.registerNumber);
        if (tt.schedule.length === 0) {
          reply = `📅 **Schedule for ${tt.day}**: No classes scheduled today!`;
        } else {
          reply = `📅 **Class Timetable for Today (${tt.day})**:\n\n` +
                  tt.schedule.map(s => `- **Period ${s.periodNumber}**: **${s.courseCode}** (${s.courseTitle})`).join('\n');
        }
        intent = 'student_timetable';
      }
    }


    // ----------------------------------------------------
    // 25. PROFILE INTENTS
    // ----------------------------------------------------
    else if (norm.includes('profile') || norm.includes('my detail') || norm.includes('who am i') || norm.includes('register number') || norm.includes('roll')) {
      if (isStudent || authUser.registerNumber) {
        const prof = await dbServiceLogin.getStudentProfile(authUser.registerNumber);
        if (prof) {
          reply = `👤 **Student Profile Details**:\n\n` +
                  `- **Name**: ${prof.studentName}\n` +
                  `- **Register Number**: \`${prof.registerNumber}\`\n` +
                  `- **Department**: ${prof.departmentName || prof.departmentAcr}\n` +
                  `- **Batch**: ${prof.batch} | Semester: ${prof.semester}\n` +
                  `- **Student Type**: ${prof.student_type || 'Day-Scholar'}`;
        } else {
          reply = `Profile details for student \`${authUser.registerNumber}\`.`;
        }
        intent = 'student_profile';
      } else if (isStaff) {
        const prof = await dbServiceLogin.getStaffProfile(authUser.userId);
        if (prof) {
          reply = `👤 **Faculty Profile Details**:\n\n` +
                  `- **Name**: ${prof.firstName} ${prof.lastName || ''}\n` +
                  `- **Staff ID**: \`${prof.staffId}\`\n` +
                  `- **Designation**: ${prof.designation || 'Faculty'}\n` +
                  `- **Department**: ${prof.departmentName || prof.departmentAcr}\n` +
                  `- **Email**: ${prof.employeeMail || 'N/A'}`;
        }
        intent = 'staff_profile';
      }
    }


    // ----------------------------------------------------
    // 26. DEFAULT FALLBACK (ROLE ADAPTIVE HELP)
    // ----------------------------------------------------
    if (!reply) {
      intent = 'authenticated_help';
      if (isAdmin) {
        reply = `Hello **${authUser.userName}** (${authUser.positionTitle || 'Administrator'})! 🏛️\n\nYou can query live institution-wide and department data:\n` +
                `- 🏛️ **Executive Dashboard**: *"Show admin dashboard"* or *"college overview"*\n` +
                `- 🔍 **Student & Staff Lookup**: *"student status"*, *"staff activities"*, *"student skillrack"*\n` +
                `- 👨‍🏫 **Staff Activities**: *"Show staff activities"*, *"Suresh staff details"*, *"funded projects summary"*\n` +
                `- 📊 **Class Attendance**: *"What is the attendance percentage of today for CSE III Year?"*\n` +
                `- 🏆 **CGPA Ranking**: *"Ranking of students based on CGPA for III Yr CSE"*\n`;
      } else if (isStaff) {
        reply = `Hello **${authUser.userName}** (Faculty / Staff)! 👨‍🏫\n\nYou can query live department, ward student & staff activities data:\n` +
                `- 👨‍🏫 **Faculty Dashboard**: *"Show staff dashboard"* or *"my dashboard"*\n` +
                `- 👥 **Ward Students**: *"Show me my ward students"*, *"students skillrack"*, *"My ward students progress"*\n` +
                `- 🔍 **Specific Student**: *"student skillrack"*, *"student attendance"*, *"student status"*\n` +
                `- 💼 **Staff Activities**: *"Show my funded projects"*, *"My seed money"*, *"My patents"*, *"My education"*\n` +
                `- 📊 **Class Attendance**: *"What is the attendance percentage of today for CSE III Year?"*\n` +
                `- 🏆 **Student CGPA Ranking**: *"Ranking of students based on CGPA for III Yr CSE"*\n`;
      } else {
        reply = `Hello **${authUser.userName}** (Student)! 🎓\n\nYou can query your personalized live academic data:\n` +
                `- **Student Dashboard**: *"Show my student dashboard"*\n` +
                `- **Coding Profile & Links**: *"Show my coding profile"* or *"LeetCode and GitHub profile"*\n` +
                `- **Course Categories**: *"Show my completed course category"* or *"non cgpa"*\n` +
                `- **Cumulative CGPA & Credits**: *"What is my CGPA?"* or *"What is my total credits earned?"*\n` +
                `- **Skillrack**: *"What is my Skillrack rank and solved problems?"*\n` +
                `- **NPTEL & Online Courses**: *"Show my NPTEL courses"*\n` +
                `- **Attendance & Eligibility**: *"What is my overall attendance percentage?"*\n`;
      }
    }

    contextService.updateContext(sessionId, {
      lastIntent: intent,
      updatedAt: Date.now()
    });

    return res.json({
      reply,
      sourceType,
      intent,
      language: 'en',
      userRole: role
    });

  } catch (error) {
    console.error('ChatbotLogin Controller Error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while querying the database.'
    });
  }
};

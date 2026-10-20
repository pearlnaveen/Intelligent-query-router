import jwt from 'jsonwebtoken';
import { queryReadOnly } from '../config/db.js';

/**
 * Authentication & Identity Context Middleware
 * Decodes JWT token or validates user object passed from authenticated frontend context.
 * Resolves exact student / staff database profiles.
 */
/**
 * Helper to determine if the user has Higher Authority privileges (Principal, HOD, SuperAdmin, or listed in HIGHER_AUTHORITY_EMAILS env)
 */
/**
 * Helper to resolve exact position and access tier based on user data
 */
export const resolveUserPosition = (userObj, staffProfile = null, dbRoleName = '') => {
  const email = (userObj.userMail || userObj.email || '').toString().trim().toLowerCase();
  const rawRole = (dbRoleName || userObj.role || '').toString().trim().toLowerCase();
  const designation = (staffProfile?.designation || userObj.designation || '').toString().trim().toLowerCase();
  const userIdentifier = (userObj.registerNumber || userObj.username || userObj.userName || userObj.userMail || userObj.email || '').toString().trim();
  const isStudentPattern = /^2[0-9]{6,15}/.test(userIdentifier) || /^2[0-9]{6,15}@/.test(userIdentifier);

  if (isStudentPattern || rawRole === 'student' || userObj.roleId === 4) {
    return { position: 'student', positionTitle: 'Student', accessTier: 'student' };
  }

  // Super Admin Tier (Principal, Director, Chairman, SuperAdmin)
  if (email.includes('principal') || designation.includes('principal') || rawRole === 'principal') {
    return { position: 'principal', positionTitle: 'Principal', accessTier: 'super_admin' };
  }
  if (email.includes('director') || designation.includes('director') || rawRole === 'director') {
    return { position: 'director', positionTitle: 'Director', accessTier: 'super_admin' };
  }
  if (email.includes('chairman') || designation.includes('chairman') || rawRole === 'chairman') {
    return { position: 'chairman', positionTitle: 'Chairman', accessTier: 'super_admin' };
  }
  if (['superadmin', 'admin', 'management'].includes(rawRole) || userObj.roleId === 1 || userObj.roleId === 2) {
    return { position: 'superadmin', positionTitle: 'Super Admin', accessTier: 'super_admin' };
  }

  // Department Admin Tier (HOD, Dept Administrator)
  if (email.startsWith('hod.') || designation.includes('hod') || designation.includes('head of department') || rawRole === 'hod') {
    return { position: 'hod', positionTitle: 'Head of Department (HOD)', accessTier: 'dept_admin' };
  }
  if (['deptadmin', 'academicadmin', 'iradmin', 'pgadmin', 'placementadmin'].includes(rawRole) || designation.includes('dept admin') || designation.includes('administrator')) {
    return { position: 'deptadmin', positionTitle: 'Department Administrator', accessTier: 'dept_admin' };
  }

  // Staff Tier (Faculty / Staff)
  return { position: 'staff', positionTitle: 'Staff / Faculty', accessTier: 'staff' };
};

/**
 * Helper to determine if the user has Higher Authority privileges (SuperAdmin or DeptAdmin tier)
 */
export const checkHigherAuthority = (authUser) => {
  if (!authUser) return false;
  if (authUser.accessTier === 'super_admin' || authUser.accessTier === 'dept_admin') return true;

  const role = (authUser.role || authUser.position || '').toLowerCase();
  if (['principal', 'director', 'chairman', 'hod', 'superadmin', 'admin', 'academicadmin', 'deptadmin', 'management'].includes(role)) {
    return true;
  }

  const userMail = (authUser.userMail || authUser.email || '').toString().trim().toLowerCase();
  if (!userMail) return false;

  const rawEnv = process.env.HIGHER_AUTHORITY_EMAILS || '';
  const allowedEmails = rawEnv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(userMail);
};

export const extractUserContext = async (req, res, next) => {
  try {
    let authUser = null;

    // 1. Try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sjf@1234');
        authUser = decoded;
      } catch (tokenErr) {
        // Fallback if expired or unverified
      }
    }

    // 2. Fallback to user object passed in body
    if (!authUser && req.body && req.body.user) {
      authUser = req.body.user;
    }

    if (!authUser) {
      req.authUser = { isAuthenticated: false, role: 'guest', position: 'guest', accessTier: 'guest', isHigherAuthority: false };
      return next();
    }

    const userId = authUser.userId || authUser.id;
    let role = (authUser.role || '').toLowerCase();

    if (!role && authUser.roleId) {
      if (authUser.roleId === 4) role = 'student';
      else if (authUser.roleId === 5) role = 'staff';
      else if ([1, 2, 3, 6].includes(authUser.roleId)) role = 'admin';
    }

    const userIdentifier = (authUser.registerNumber || authUser.username || authUser.userName || authUser.userMail || authUser.email || '').toString().trim();
    const isStudentPattern = /^2[0-9]{6,15}/.test(userIdentifier) || /^2[0-9]{6,15}@/.test(userIdentifier);

    if (isStudentPattern) {
      role = 'student';
    } else if (!role || role === 'user') {
      role = 'staff';
    }

    let userMail = authUser.userMail || authUser.email || null;
    let fullName = authUser.userName || authUser.username || authUser.name || userMail || '';
    let registerNumber = authUser.registerNumber || (isStudentPattern ? userIdentifier.split('@')[0] : null);
    let staffId = authUser.staffId || null;
    let departmentId = authUser.departmentId || null;
    let departmentAcr = authUser.departmentAcr || null;
    let departmentName = authUser.departmentName || null;
    let dbRoleName = '';
    let staffProfile = null;

    if (userId) {
      try {
        const [uRows] = await queryReadOnly(
          'SELECT u.userId, u.userName, u.userMail, u.roleId, u.departmentId, r.roleName, d.departmentAcr, d.departmentName FROM users u LEFT JOIN roles r ON u.roleId = r.roleId LEFT JOIN departments d ON u.departmentId = d.departmentId WHERE u.userId = ?',
          [userId]
        );
        if (uRows.length > 0) {
          const u = uRows[0];
          if (u.userMail && !userMail) userMail = u.userMail;
          if (u.roleName) dbRoleName = u.roleName;
          if (!departmentId) departmentId = u.departmentId;
          if (u.departmentAcr) departmentAcr = u.departmentAcr;
          if (u.departmentName) departmentName = u.departmentName;
        }

        if (role === 'student' || isStudentPattern) {
          const [sRows] = await queryReadOnly(
            'SELECT sd.studentId, sd.registerNumber, sd.studentName, sd.departmentId, sd.batch, sd.semester, sd.section, d.departmentAcr, d.departmentName FROM student_details sd LEFT JOIN departments d ON sd.departmentId = d.departmentId WHERE sd.Userid = ? OR sd.registerNumber = ? LIMIT 1',
            [userId, registerNumber || '']
          );
          if (sRows.length > 0) {
            registerNumber = sRows[0].registerNumber;
            fullName = sRows[0].studentName || fullName;
            departmentId = sRows[0].departmentId || departmentId;
            departmentAcr = sRows[0].departmentAcr || departmentAcr;
            departmentName = sRows[0].departmentName || departmentName;
            req.studentProfile = sRows[0];
          }
        } else {
          const [stRows] = await queryReadOnly(
            'SELECT st.staffId, st.firstName, st.lastName, st.departmentId, st.designation, d.departmentAcr, d.departmentName FROM staff_details st LEFT JOIN departments d ON st.departmentId = d.departmentId WHERE st.Userid = ? LIMIT 1',
            [userId]
          );
          if (stRows.length > 0) {
            staffProfile = stRows[0];
            staffId = stRows[0].staffId;
            fullName = `${stRows[0].firstName || ''} ${stRows[0].lastName || ''}`.trim() || fullName;
            departmentId = stRows[0].departmentId || departmentId;
            departmentAcr = stRows[0].departmentAcr || departmentAcr;
            departmentName = stRows[0].departmentName || departmentName;
            req.staffProfile = stRows[0];
          }
        }
      } catch (dbErr) {
        console.warn('Could not resolve extended user details from DB:', dbErr.message);
      }
    }

    // Resolve exact position and access tier
    const posInfo = resolveUserPosition({ ...authUser, registerNumber, userMail }, staffProfile, dbRoleName);
    const isHigherAuth = checkHigherAuthority({ ...authUser, accessTier: posInfo.accessTier, role: posInfo.position, userMail });

    req.authUser = {
      isAuthenticated: true,
      userId: userId || null,
      role: posInfo.position,
      position: posInfo.position,
      positionTitle: posInfo.positionTitle,
      accessTier: posInfo.accessTier,
      userName: fullName,
      userMail: userMail || null,
      registerNumber: registerNumber || null,
      staffId: staffId || null,
      departmentId: departmentId || null,
      departmentAcr: departmentAcr || null,
      departmentName: departmentName || null,
      isHigherAuthority: isHigherAuth
    };

    next();
  } catch (error) {
    console.error('Error in extractUserContext middleware:', error);
    req.authUser = { isAuthenticated: false, role: 'guest', position: 'guest', accessTier: 'guest', isHigherAuthority: false };
    next();
  }
};

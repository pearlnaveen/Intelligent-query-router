// controllers/student/skillRackController.js
import { User, StudentDetails, SkillRack, CompetencyCoding } from "../../models/index.js";
import { Op } from "sequelize";

console.log("📦 SkillRack Controller Loading...");

// ========================
// TEST ENDPOINT
// ========================
export const testSkillRackSetup = async (req, res) => {
  try {
    console.log("🔍 Testing SkillRack setup...");

    const tests = {
      modelsLoaded: {
        User: typeof User !== 'undefined',
        StudentDetails: typeof StudentDetails !== 'undefined',
        SkillRack: typeof SkillRack !== 'undefined',
      },
      modelMethods: {
        SkillRackFindOne: typeof SkillRack?.findOne === 'function',
        SkillRackFindAll: typeof SkillRack?.findAll === 'function',
        StudentDetailsFindOne: typeof StudentDetails?.findOne === 'function',
      }
    };

    let dbTest = { success: false, error: null, count: 0 };
    try {
      const count = await SkillRack.count();
      dbTest = { success: true, error: null, count };
    } catch (err) {
      dbTest = { success: false, error: err.message, count: 0 };
    }

    let studentTest = { success: false, error: null };
    const testUserId = req.query.UserId || req.query.userId || 4;
    try {
      const student = await StudentDetails.findOne({
        where: { Userid: testUserId },
        attributes: ["registerNumber", "Userid"]
      });
      studentTest = {
        success: true,
        error: null,
        found: !!student,
        data: student ? { registerNumber: student.registerNumber, Userid: student.Userid } : null
      };
    } catch (err) {
      studentTest = { success: false, error: err.message };
    }

    res.status(200).json({
      success: true,
      message: "SkillRack setup test completed",
      tests: {
        ...tests,
        database: dbTest,
        student: studentTest,
      }
    });
  } catch (error) {
    console.error("❌ Test error:", error);
    res.status(500).json({
      success: false,
      message: "Test failed",
      error: error.message,
      stack: error.stack
    });
  }
};

// ========================
// STUDENT ENDPOINTS
// ========================

export const getMySkillRackRecord = async (req, res) => {
  try {
    console.log("🔍 Getting SkillRack record...");
    const userId = req.user?.userId || req.user?.Userid || req.query.UserId || req.query.userId;
    const regno = req.query.regno || req.query.registerNumber;

    if (!userId && !regno) {
      return res.status(400).json({
        success: false,
        message: "User ID or Register Number is required"
      });
    }

    let studentDetails = null;
    if (userId) {
      studentDetails = await StudentDetails.findOne({
        where: { Userid: userId },
        attributes: ["registerNumber", "studentName", "Userid"]
      });
    }

    if (!studentDetails && regno) {
      studentDetails = await StudentDetails.findOne({
        where: { registerNumber: regno },
        attributes: ["registerNumber", "studentName", "Userid"]
      });
    }

    const regNumber = studentDetails?.registerNumber || regno;

    let skillrackRecord = null;
    if (regNumber || userId) {
      skillrackRecord = await SkillRack.findOne({
        where: {
          [Op.or]: [
            regNumber ? { registerNumber: regNumber } : null,
            userId ? { Userid: userId } : null
          ].filter(Boolean)
        }
      });
    }

    if (skillrackRecord && typeof skillrackRecord.level_details === 'string') {
      try {
        skillrackRecord.level_details = JSON.parse(skillrackRecord.level_details);
      } catch (e) {}
    }

    res.status(200).json({
      success: true,
      data: skillrackRecord || null,
      message: skillrackRecord ? null : "No SkillRack data available yet."
    });
  } catch (error) {
    console.error("❌ Error fetching SkillRack record:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching SkillRack record",
      error: error.message,
    });
  }
};

export const getSkillRackStats = async (req, res) => {
  try {
    console.log("📊 Getting SkillRack stats...");
    const userId = req.user?.userId || req.user?.Userid || req.query.UserId || req.query.userId;
    const regno = req.query.regno || req.query.registerNumber;

    if (!userId && !regno) {
      return res.status(400).json({
        success: false,
        message: "User ID or Register Number is required"
      });
    }

    let studentDetails = null;
    if (userId) {
      studentDetails = await StudentDetails.findOne({
        where: { Userid: userId },
        attributes: ["registerNumber", "studentName", "Userid"]
      });
    }

    if (!studentDetails && regno) {
      studentDetails = await StudentDetails.findOne({
        where: { registerNumber: regno },
        attributes: ["registerNumber", "studentName", "Userid"]
      });
    }

    const regNumber = studentDetails?.registerNumber || regno;

    let skillrackRecord = null;
    if (regNumber || userId) {
      skillrackRecord = await SkillRack.findOne({
        where: {
          [Op.or]: [
            regNumber ? { registerNumber: regNumber } : null,
            userId ? { Userid: userId } : null
          ].filter(Boolean)
        }
      });
    }

    let levelDetails = skillrackRecord?.level_details || null;
    if (typeof levelDetails === "string") {
      try {
        levelDetails = JSON.parse(levelDetails);
      } catch (e) {
        levelDetails = null;
      }
    }

    if (!skillrackRecord) {
      return res.status(200).json({
        success: true,
        stats: {
          totalPrograms: 0,
          levelProgress: { level_1: 0, level_2: 0, level_3: 0, level_4: 0, level_5: 0, level_6: 0 },
          languageDistribution: { c: 0, cpp: 0, java: 0, python: 0, sql: 0 },
          companyProgress: { mnc: 0, product: 0, dream: 0 },
          testsAndTracks: { codeTests: 0, codeTracks: 0, codeTutorial: 0, dailyChallenge: 0, dailyTest: 0 },
          medals: 0,
          goldMedals: 0,
          silverMedals: 0,
          bronzeMedals: 0,
          points: 0,
          rank: null,
          aptitudeScore: 0,
          dataStructurePrograms: 0,
          levelDetails: null,
        },
        message: "No data available"
      });
    }

    const stats = {
      totalPrograms: skillrackRecord.total_programs_solved || 0,
      lastWeek: skillrackRecord.last_week || 0,
      levelProgress: {
        level_1: skillrackRecord.level_1 || 0,
        level_2: skillrackRecord.level_2 || 0,
        level_3: skillrackRecord.level_3 || 0,
        level_4: skillrackRecord.level_4 || 0,
        level_5: skillrackRecord.level_5 || 0,
        level_6: skillrackRecord.level_6 || 0,
      },
      levelDetails: levelDetails,
      languageDistribution: {
        c: skillrackRecord.c_programs || 0,
        cpp: skillrackRecord.cpp_programs || 0,
        java: skillrackRecord.java_programs || 0,
        python: skillrackRecord.python_programs || 0,
        sql: skillrackRecord.sql_programs || 0,
      },
      companyProgress: {
        mnc: skillrackRecord.mnc_companies || 0,
        product: skillrackRecord.product_companies || 0,
        dream: skillrackRecord.dream_product_companies || 0,
      },
      testsAndTracks: {
        codeTests: skillrackRecord.code_tests || 0,
        codeTracks: skillrackRecord.code_tracks || 0,
        codeTutorial: skillrackRecord.code_tutor || skillrackRecord.code_tutorial || 0,
        codeTutor: skillrackRecord.code_tutor || skillrackRecord.code_tutorial || 0,
        dailyChallenge: skillrackRecord.dc || skillrackRecord.daily_challenge || 0,
        dailyTest: skillrackRecord.dt || skillrackRecord.daily_test || 0,
        dc: skillrackRecord.dc || skillrackRecord.daily_challenge || 0,
        dt: skillrackRecord.dt || skillrackRecord.daily_test || 0,
      },
      medals: skillrackRecord.bronze_medals || 0,
      goldMedals: skillrackRecord.gold_medals || 0,
      silverMedals: skillrackRecord.silver_medals || 0,
      bronzeMedals: skillrackRecord.bronze_medals || 0,
      points: skillrackRecord.points || 0,
      rank: skillrackRecord.skillrack_rank || null,
      aptitudeScore: skillrackRecord.aptitude_score ?? skillrackRecord.aptitude_test ?? 0,
      dataStructurePrograms: skillrackRecord.data_structure_programs || 0,
    };

    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("❌ Error calculating SkillRack stats:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating statistics",
      error: error.message
    });
  }
};

export const updateStudentLevelProgress = async (req, res) => {
  try {
    console.log("📝 Updating student level progress...");
    const userId = req.user?.userId || req.user?.Userid || req.body.UserId || req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const studentDetails = await StudentDetails.findOne({
      where: { Userid: userId }
    });

    if (!studentDetails || !studentDetails.registerNumber) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found"
      });
    }

    const { levelDetails } = req.body;
    if (!levelDetails) {
      return res.status(400).json({
        success: false,
        message: "Level details are required"
      });
    }

    const num = (v) => {
      const n = Number(v);
      return isNaN(n) || n < 0 ? 0 : n;
    };

    const l1 = levelDetails.level1 || {};
    const l2 = levelDetails.level2 || {};
    const l3 = levelDetails.level3 || {};
    const l4 = levelDetails.level4 || {};
    const l5 = levelDetails.level5 || {};
    const l6 = levelDetails.level6 || {};

    const level1Total = num(l1.c) + num(l1.cpp) + num(l1.java) + num(l1.python) + num(l1.mysql) + num(l1.ds_c) + num(l1.ds_java);
    const level2Total = num(l2.kickstart);
    const level3Total = num(l3.cts) + num(l3.infytq) + num(l3.other_mncs);
    const level4Total = num(l4.stack) + num(l4.heap) + num(l4.queue) + num(l4.binary_tree) + num(l4.searching) + num(l4.sorting);
    const level5Total = num(l5.product_companies);
    const level6Total = num(l6.mini_project) + num(l6.strings) + num(l6.greedy) + num(l6.comb_perm) + num(l6.backtracking) + num(l6.dp) + num(l6.graph) + num(l6.regex);

    const c_programs = num(l1.c);
    const cpp_programs = num(l1.cpp);
    const java_programs = num(l1.java);
    const python_programs = num(l1.python);
    const sql_programs = num(l1.mysql);
    const dc = num(l1.dc) || num(levelDetails.dc_dt?.dc) || num(levelDetails.dc);
    const dt = num(l1.dt) || num(levelDetails.dc_dt?.dt) || num(levelDetails.dt);
    const mnc_companies = level3Total;
    const product_companies = level5Total;
    const dream_product_companies = level6Total;
    const data_structure_programs = level4Total + num(l1.ds_c) + num(l1.ds_java);

    let skillrackRecord = await SkillRack.findOne({
      where: {
        [Op.or]: [
          { registerNumber: studentDetails.registerNumber },
          { Userid: userId }
        ]
      }
    });

    const calculatedTotalPrograms = c_programs + cpp_programs + java_programs + python_programs + sql_programs + level2Total + level3Total + level4Total + level5Total + level6Total;

    const updateFields = {
      level_1: level1Total,
      level_2: level2Total,
      level_3: level3Total,
      level_4: level4Total,
      level_5: level5Total,
      level_6: level6Total,
      level_details: levelDetails,
      total_programs_solved: (skillrackRecord && skillrackRecord.total_programs_solved > 0) 
        ? Math.max(skillrackRecord.total_programs_solved, calculatedTotalPrograms) 
        : calculatedTotalPrograms,
      c_programs,
      cpp_programs,
      java_programs,
      python_programs,
      sql_programs,
      dc: dc || (skillrackRecord ? skillrackRecord.dc : 0),
      dt: dt || (skillrackRecord ? skillrackRecord.dt : 0),
      mnc_companies,
      product_companies,
      dream_product_companies,
      data_structure_programs,
      last_updated: new Date()
    };

    if (skillrackRecord) {
      await skillrackRecord.update(updateFields);
    } else {
      let userName = studentDetails.studentName || "";
      if (!userName) {
        try {
          const u = await User.findByPk(userId);
          userName = u?.userName || "";
        } catch (e) {}
      }

      skillrackRecord = await SkillRack.create({
        registerNumber: studentDetails.registerNumber,
        Userid: userId,
        name: userName,
        ...updateFields
      });
    }

    try {
      const comp = await CompetencyCoding.findOne({ where: { Userid: userId } });
      if (comp) {
        await comp.update({
          skillrack_level_1: level1Total,
          skillrack_level_2: level2Total,
          skillrack_level_3: level3Total,
          skillrack_level_4: level4Total,
          skillrack_level_5: level5Total,
          skillrack_level_6: level6Total,
          skillrack_last_updated: new Date(),
        });
      }
    } catch (cErr) {
      console.warn("CompetencyCoding sync note:", cErr.message);
    }

    console.log("✅ Level progress updated successfully for", studentDetails.registerNumber);
    res.status(200).json({
      success: true,
      message: "Level progress updated successfully",
      data: skillrackRecord
    });
  } catch (error) {
    console.error("❌ Error updating level progress:", error);
    res.status(500).json({
      success: false,
      message: "Error updating level progress",
      error: error.message
    });
  }
};

export const getSkillRackLeaderboard = async (req, res) => {
  try {
    console.log("🏆 Getting leaderboard...");
    const { limit = 50 } = req.query;

    const leaderboard = await SkillRack.findAll({
      order: [
        ["total_programs_solved", "DESC"],
        ["skillrack_rank", "ASC"],
      ],
      limit: parseInt(limit),
      raw: true,
    });

    console.log(`📊 Found ${leaderboard.length} leaderboard entries`);

    const formattedLeaderboard = [];

    for (let index = 0; index < leaderboard.length; index++) {
      const record = leaderboard[index];
      let username = "Unknown";

      try {
        if (record.Userid) {
          const user = await User.findByPk(record.Userid, {
            attributes: ["userName"],
            raw: true,
          });
          if (user) {
            username = user.userName;
          }
        } else if (record.registerNumber) {
          const studentDetail = await StudentDetails.findOne({
            where: { registerNumber: record.registerNumber },
            attributes: ["Userid", "studentName"],
            raw: true,
          });

          if (studentDetail) {
            if (studentDetail.studentName) {
              username = studentDetail.studentName;
            } else if (studentDetail.Userid) {
              const user = await User.findByPk(studentDetail.Userid, {
                attributes: ["userName"],
                raw: true,
              });
              if (user) {
                username = user.userName;
              }
            }
          }
        }
      } catch (err) {
        console.log(`⚠️ Could not find user for leaderboard entry`);
      }

      formattedLeaderboard.push({
        position: index + 1,
        registerNumber: record.registerNumber,
        username: record.name || username,
        totalPrograms: record.total_programs_solved,
        rank: record.skillrack_rank,
        medals: record.bronze_medals,
      });
    }

    res.status(200).json({
      success: true,
      leaderboard: formattedLeaderboard
    });
  } catch (error) {
    console.error("❌ Error fetching leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leaderboard",
      error: error.message
    });
  }
};

// ========================
// STAFF ENDPOINTS
// ========================

export const getAllSkillRackRecords = async (req, res) => {
  try {
    console.log("📊 Fetching all SkillRack records...");

    const currentStaffId = req.user?.userId || req.user?.Userid;
    const userRole = (req.user?.roleName || req.user?.role || "").toLowerCase();
    const isGlobalAdmin = ["admin", "superadmin"].includes(userRole);

    if (!isGlobalAdmin) {
      if (!currentStaffId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Staff ID required.",
          records: [],
        });
      }

      // STRICT TUTOR-WARD ISOLATION:
      // A tutor can ONLY view their assigned ward students from StudentDetails
      const tutorStudents = await StudentDetails.findAll({
        where: {
          [Op.or]: [
            { staffId: currentStaffId },
            req.user?.userNumber ? { staffId: req.user.userNumber } : null,
            req.user?.userId ? { staffId: req.user.userId } : null,
            req.user?.Userid ? { staffId: req.user.Userid } : null,
          ].filter(Boolean),
        },
        attributes: [
          "studentId",
          "Userid",
          "studentName",
          "registerNumber",
          "staffId",
          "departmentId",
          "batch",
          "semester",
        ],
        raw: true,
      });

      console.log(`👨‍🏫 Tutor ${currentStaffId} has ${tutorStudents.length} ward students`);

      if (tutorStudents.length === 0) {
        return res.status(200).json({
          success: true,
          records: [],
          message: "No ward students assigned to you yet.",
        });
      }

      const wardRegNos = tutorStudents.map(s => s.registerNumber).filter(Boolean);
      const wardUserIds = tutorStudents.map(s => s.Userid).filter(Boolean);

      // Fetch SkillRack records for these ward students ONLY
      const skillRackRecords = await SkillRack.findAll({
        where: {
          [Op.or]: [
            wardRegNos.length > 0 ? { registerNumber: { [Op.in]: wardRegNos } } : null,
            wardUserIds.length > 0 ? { Userid: { [Op.in]: wardUserIds } } : null,
          ].filter(Boolean),
        },
        raw: true,
      });

      // Map SkillRack records by registerNumber and Userid
      const skillRackMap = new Map();
      skillRackRecords.forEach(rec => {
        if (rec.registerNumber) skillRackMap.set(String(rec.registerNumber).toLowerCase().trim(), rec);
        if (rec.Userid) skillRackMap.set(`uid_${rec.Userid}`, rec);
      });

      // Fetch user emails for ward students
      const users = await User.findAll({
        where: {
          Userid: { [Op.in]: wardUserIds },
        },
        attributes: ["Userid", "userName", "userMail"],
        raw: true,
      });
      const userMap = new Map();
      users.forEach(u => userMap.set(String(u.Userid), u));

      // Build the final response list for EVERY ward student
      const formattedRecords = tutorStudents.map(student => {
        const regKey = String(student.registerNumber || "").toLowerCase().trim();
        const rec = skillRackMap.get(regKey) || skillRackMap.get(`uid_${student.Userid}`) || {};
        const user = userMap.get(String(student.Userid)) || {};

        let levelDetails = rec.level_details || null;
        if (typeof levelDetails === "string") {
          try {
            levelDetails = JSON.parse(levelDetails);
          } catch (e) {
            levelDetails = null;
          }
        }

        return {
          id: rec.id || `ward_${student.studentId}`,
          studentId: student.studentId,
          Userid: student.Userid || rec.Userid || null,
          registerNumber: student.registerNumber || rec.registerNumber || "",
          name: student.studentName || rec.name || user.userName || "Unknown",
          username: student.studentName || rec.name || user.userName || "Unknown",
          email: user.userMail || "N/A",
          staffId: student.staffId || currentStaffId,
          total_programs_solved: rec.total_programs_solved || 0,
          last_week: rec.last_week || 0,
          code_tests: rec.code_tests || 0,
          code_tracks: rec.code_tracks || 0,
          code_tutor: rec.code_tutor || rec.code_tutorial || 0,
          code_tutorial: rec.code_tutor || rec.code_tutorial || 0,
          dc: rec.dc || rec.daily_challenge || 0,
          dt: rec.dt || rec.daily_test || 0,
          daily_challenge: rec.dc || rec.daily_challenge || 0,
          daily_test: rec.dt || rec.daily_test || 0,
          aptitude_score: rec.aptitude_score ?? rec.aptitude_test ?? 0,
          aptitude_test: rec.aptitude_score ?? rec.aptitude_test ?? 0,
          points: rec.points || 0,
          gold_medals: rec.gold_medals || 0,
          silver_medals: rec.silver_medals || 0,
          bronze_medals: rec.bronze_medals || 0,
          skillrack_rank: rec.skillrack_rank || null,
          level_1: rec.level_1 || 0,
          level_2: rec.level_2 || 0,
          level_3: rec.level_3 || 0,
          level_4: rec.level_4 || 0,
          level_5: rec.level_5 || 0,
          level_6: rec.level_6 || 0,
          c_programs: rec.c_programs || 0,
          cpp_programs: rec.cpp_programs || 0,
          java_programs: rec.java_programs || 0,
          python_programs: rec.python_programs || 0,
          sql_programs: rec.sql_programs || 0,
          mnc_companies: rec.mnc_companies || 0,
          product_companies: rec.product_companies || 0,
          dream_product_companies: rec.dream_product_companies || 0,
          data_structure_programs: rec.data_structure_programs || 0,
          level_details: levelDetails,
          last_updated: rec.last_updated || null,
          uploaded_by: rec.uploaded_by || null,
        };
      });

      // Sort by register number
      formattedRecords.sort((a, b) => String(a.registerNumber).localeCompare(String(b.registerNumber)));

      return res.status(200).json({
        success: true,
        records: formattedRecords,
      });
    } else {
      // ADMIN: Fetch all records across the college
      const allSkillRecords = await SkillRack.findAll({
        order: [["registerNumber", "ASC"]],
        raw: true,
      });

      const formattedRecords = [];
      for (const record of allSkillRecords) {
        let username = record.name || "Unknown";
        let email = "N/A";
        let studentStaffId = null;

        if (record.Userid) {
          const user = await User.findByPk(record.Userid, { attributes: ["userName", "userMail"], raw: true });
          if (user) {
            username = user.userName || username;
            email = user.userMail || "N/A";
          }
          const sd = await StudentDetails.findOne({ where: { Userid: record.Userid }, attributes: ["staffId", "studentName"], raw: true });
          if (sd) {
            studentStaffId = sd.staffId;
            if (sd.studentName) username = sd.studentName;
          }
        } else if (record.registerNumber) {
          const sd = await StudentDetails.findOne({ where: { registerNumber: record.registerNumber }, attributes: ["Userid", "staffId", "studentName"], raw: true });
          if (sd) {
            studentStaffId = sd.staffId;
            if (sd.studentName) username = sd.studentName;
            if (sd.Userid) {
              const user = await User.findByPk(sd.Userid, { attributes: ["userName", "userMail"], raw: true });
              if (user) {
                if (!sd.studentName) username = user.userName || username;
                email = user.userMail || "N/A";
              }
            }
          }
        }

        let levelDetails = record.level_details || null;
        if (typeof levelDetails === "string") {
          try {
            levelDetails = JSON.parse(levelDetails);
          } catch (e) {
            levelDetails = null;
          }
        }

        formattedRecords.push({
          ...record,
          name: username,
          username,
          email,
          staffId: studentStaffId || "N/A",
          level_details: levelDetails,
        });
      }

      return res.status(200).json({
        success: true,
        records: formattedRecords,
      });
    }
  } catch (error) {
    console.error("❌ Error fetching SkillRack records:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching SkillRack records",
      error: error.message
    });
  }
};

const normalizeSkillRackRow = (row) => {
  const cleanMap = {};
  for (const [key, val] of Object.entries(row || {})) {
    if (key !== undefined && key !== null) {
      const cleanKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey) {
        cleanMap[cleanKey] = val;
      }
    }
  }

  const getCleanVal = (patterns, defaultVal = 0) => {
    for (const p of patterns) {
      const cleanP = String(p).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanMap[cleanP] !== undefined && cleanMap[cleanP] !== null && String(cleanMap[cleanP]).trim() !== '') {
        const num = Number(String(cleanMap[cleanP]).replace(/,/g, '').trim());
        return isNaN(num) ? cleanMap[cleanP] : num;
      }
    }
    for (const p of patterns) {
      const cleanP = String(p).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!cleanP) continue;
      for (const [k, v] of Object.entries(cleanMap)) {
        if ((k.includes(cleanP) || cleanP.includes(k)) && v !== undefined && v !== null && String(v).trim() !== '') {
          const num = Number(String(v).replace(/,/g, '').trim());
          return isNaN(num) ? v : num;
        }
      }
    }
    return defaultVal;
  };

  const getCleanString = (patterns) => {
    for (const p of patterns) {
      const cleanP = String(p).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanMap[cleanP] !== undefined && cleanMap[cleanP] !== null) {
        const s = String(cleanMap[cleanP]).trim();
        if (s) return s;
      }
    }
    for (const p of patterns) {
      const cleanP = String(p).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!cleanP) continue;
      for (const [k, v] of Object.entries(cleanMap)) {
        if ((k.includes(cleanP) || cleanP.includes(k)) && v !== undefined && v !== null) {
          const s = String(v).trim();
          if (s) return s;
        }
      }
    }
    return "";
  };

  let registerNumber = getCleanString([
    "universityregnnumber",
    "universityregnumber",
    "universityregnno",
    "universityregno",
    "registernumber",
    "regnumber",
    "regno",
    "rollnumber",
    "rollno",
    "register",
    "regn",
    "reg"
  ]);

  if (!registerNumber) {
    for (const [k, v] of Object.entries(cleanMap)) {
      if ((k.includes('reg') || k.includes('roll') || k.includes('univ')) && v) {
        const s = String(v).trim();
        if (s) {
          registerNumber = s;
          break;
        }
      }
    }
  }

  let name = getCleanString([
    "studentname",
    "username",
    "fullname",
    "name",
    "student"
  ]);

  const total_programs_solved = getCleanVal([
    "programssolved",
    "totalprogramssolved",
    "totalprograms",
    "solvedprograms",
    "programs",
    "totalnoofprogramssolved"
  ], 0);

  const last_week = getCleanVal([
    "lastweek",
    "lastweeksolved",
    "week"
  ], 0);

  const code_tests = getCleanVal([
    "codetest",
    "codetests",
    "tests"
  ], 0);

  const code_tracks = getCleanVal([
    "codetrack",
    "codetracks",
    "tracks"
  ], 0);

  const code_tutor = getCleanVal([
    "codetutor",
    "codetutorial",
    "tutor",
    "tutorial"
  ], 0);

  const dc = getCleanVal([
    "dc",
    "dailychallenge"
  ], 0);

  const dt = getCleanVal([
    "dt",
    "dailytest"
  ], 0);

  const aptitude_score = getCleanVal([
    "aptitudescore",
    "aptitudetest",
    "aptitude",
    "apt"
  ], 0);

  const points = getCleanVal([
    "points",
    "point",
    "poin"
  ], 0);

  const gold_medals = getCleanVal([
    "goldmedals",
    "goldmedal",
    "gold",
    "golds"
  ], 0);

  const silver_medals = getCleanVal([
    "silvermedals",
    "silvermedal",
    "silver",
    "silvers"
  ], 0);

  const bronze_medals = getCleanVal([
    "bronzemedals",
    "bronzemedal",
    "bronze",
    "bronzes"
  ], 0);

  const skillrack_rank = getCleanVal([
    "skillrackrank",
    "rank"
  ], null);

  return {
    registerNumber,
    name,
    total_programs_solved,
    last_week,
    code_tests,
    code_tracks,
    code_tutor,
    code_tutorial: code_tutor,
    daily_challenge: dc,
    daily_test: dt,
    dc,
    dt,
    aptitude_test: aptitude_score,
    aptitude_score,
    points,
    gold_medals,
    silver_medals,
    bronze_medals,
    skillrack_rank,
  };
};

export const bulkUploadSkillRack = async (req, res) => {
  try {
    console.log("📤 Starting bulk upload...");
    const { data } = req.body;
    const uploadedBy = req.user?.userId || req.user?.Userid;
    const userRole = (req.user?.roleName || req.user?.role || "").toLowerCase();
    const isGlobalAdmin = ["admin", "superadmin"].includes(userRole);

    console.log("📦 Received data:", data ? `${data.length} records` : "none");
    console.log("👤 Uploaded by:", uploadedBy, "| Role:", userRole, "| isGlobalAdmin:", isGlobalAdmin);

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid data format. Expected array of records."
      });
    }

    if (!uploadedBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. User ID required."
      });
    }

    let successCount = 0;
    let failedRecords = [];
    const batchId = `BATCH_${Date.now()}`;

    for (const rawRow of data) {
      try {
        const normalized = normalizeSkillRackRow(rawRow);
        const { registerNumber, ...uploadedFields } = normalized;

        if (!registerNumber) {
          failedRecords.push({ registerNumber: "N/A", reason: "Registration number is required" });
          continue;
        }

        console.log(`Processing registerNumber: ${registerNumber}`);

        const studentDetail = await StudentDetails.findOne({ where: { registerNumber } });

        // TUTOR-WARD VALIDATION:
        // If the user is a tutor (non-admin), verify that the student is in their assigned ward
        if (!isGlobalAdmin) {
          if (!studentDetail) {
            failedRecords.push({
              registerNumber,
              reason: "Student not found in system or not assigned to your ward.",
            });
            continue;
          }

          const isStaffMatch = studentDetail.staffId && (
            String(studentDetail.staffId) === String(uploadedBy) ||
            (req.user?.userNumber && String(studentDetail.staffId) === String(req.user.userNumber)) ||
            (req.user?.userId && String(studentDetail.staffId) === String(req.user.userId)) ||
            (req.user?.Userid && String(studentDetail.staffId) === String(req.user.Userid))
          );

          if (!isStaffMatch) {
            console.warn(`⛔ Access Denied: Staff ${uploadedBy} attempted to upload for non-ward student ${registerNumber}`);
            failedRecords.push({
              registerNumber,
              reason: `Permission denied: ${studentDetail.studentName || registerNumber} is not assigned to your tutor ward.`,
            });
            continue;
          }
        }

        let existingRecord = await SkillRack.findOne({ where: { registerNumber } });

        if (existingRecord) {
          console.log(`  ✏️ Updating existing record for ${registerNumber} (Preserving student-entered progress)`);

          // PRESERVE ALL STUDENT-ENTERED DETAILS:
          // level_details, level_1 through level_6, languages, companies, and DSA
          const preservedLevelDetails = existingRecord.level_details;
          const preservedLevel1 = existingRecord.level_1 || 0;
          const preservedLevel2 = existingRecord.level_2 || 0;
          const preservedLevel3 = existingRecord.level_3 || 0;
          const preservedLevel4 = existingRecord.level_4 || 0;
          const preservedLevel5 = existingRecord.level_5 || 0;
          const preservedLevel6 = existingRecord.level_6 || 0;
          const preservedC = existingRecord.c_programs || 0;
          const preservedCpp = existingRecord.cpp_programs || 0;
          const preservedJava = existingRecord.java_programs || 0;
          const preservedPython = existingRecord.python_programs || 0;
          const preservedSql = existingRecord.sql_programs || 0;
          const preservedMnc = existingRecord.mnc_companies || 0;
          const preservedProduct = existingRecord.product_companies || 0;
          const preservedDream = existingRecord.dream_product_companies || 0;
          const preservedDSA = existingRecord.data_structure_programs || 0;

          const studentCalculatedSum = preservedLevel1 + preservedLevel2 + preservedLevel3 + preservedLevel4 + preservedLevel5 + preservedLevel6;

          // Determine total programs solved: prefer uploaded if > 0, otherwise keep existing
          const newTotalPrograms = uploadedFields.total_programs_solved > 0 
            ? uploadedFields.total_programs_solved 
            : (existingRecord.total_programs_solved || studentCalculatedSum);

          // Preserve daily challenge & daily test if student had values and upload has 0
          const newDc = uploadedFields.dc > 0 ? uploadedFields.dc : (existingRecord.dc || 0);
          const newDt = uploadedFields.dt > 0 ? uploadedFields.dt : (existingRecord.dt || 0);

          await existingRecord.update({
            ...uploadedFields,
            total_programs_solved: newTotalPrograms,
            dc: newDc,
            dt: newDt,
            daily_challenge: newDc,
            daily_test: newDt,
            // Explicitly preserve student manual fields
            level_details: preservedLevelDetails,
            level_1: preservedLevel1,
            level_2: preservedLevel2,
            level_3: preservedLevel3,
            level_4: preservedLevel4,
            level_5: preservedLevel5,
            level_6: preservedLevel6,
            c_programs: preservedC,
            cpp_programs: preservedCpp,
            java_programs: preservedJava,
            python_programs: preservedPython,
            sql_programs: preservedSql,
            mnc_companies: preservedMnc,
            product_companies: preservedProduct,
            dream_product_companies: preservedDream,
            data_structure_programs: preservedDSA,
            name: uploadedFields.name || existingRecord.name || studentDetail?.studentName || "",
            Userid: studentDetail?.Userid || existingRecord.Userid || null,
            last_updated: new Date(),
            uploaded_by: uploadedBy,
            upload_batch: batchId,
          });
        } else {
          console.log(`  ➕ Creating new record for ${registerNumber}`);
          await SkillRack.create({
            registerNumber,
            Userid: studentDetail?.Userid || null,
            name: uploadedFields.name || studentDetail?.studentName || "",
            ...uploadedFields,
            level_details: null,
            level_1: 0,
            level_2: 0,
            level_3: 0,
            level_4: 0,
            level_5: 0,
            level_6: 0,
            c_programs: 0,
            cpp_programs: 0,
            java_programs: 0,
            python_programs: 0,
            sql_programs: 0,
            mnc_companies: 0,
            product_companies: 0,
            dream_product_companies: 0,
            data_structure_programs: 0,
            last_updated: new Date(),
            uploaded_by: uploadedBy,
            upload_batch: batchId,
          });
        }

        // Also sync to CompetencyCoding if student exists
        if (studentDetail?.Userid) {
          try {
            const comp = await CompetencyCoding.findOne({ where: { Userid: studentDetail.Userid } });
            if (comp) {
              await comp.update({
                skillrack_total_programs: uploadedFields.total_programs_solved > 0 ? uploadedFields.total_programs_solved : (comp.skillrack_total_programs || 0),
                skillrack_dc: uploadedFields.dc > 0 ? uploadedFields.dc : (comp.skillrack_dc || 0),
                skillrack_dt: uploadedFields.dt > 0 ? uploadedFields.dt : (comp.skillrack_dt || 0),
                skillrack_code_tracks: uploadedFields.code_tracks,
                skillrack_code_tests: uploadedFields.code_tests,
                skillrack_code_tutor: uploadedFields.code_tutor,
                skillrack_aptitude_score: uploadedFields.aptitude_score,
                skillrack_points: uploadedFields.points,
                skillrack_gold_medal_count: uploadedFields.gold_medals,
                skillrack_silver_medal_count: uploadedFields.silver_medals,
                skillrack_bronze_medal_count: uploadedFields.bronze_medals,
                skillrack_rank: uploadedFields.skillrack_rank,
                skillrack_last_updated: new Date(),
              });
            }
          } catch (cErr) {
            console.warn("Could not sync CompetencyCoding:", cErr.message);
          }
        }

        successCount++;
      } catch (error) {
        console.error(`❌ Error processing registerNumber ${rawRow?.registerNumber || rawRow?.['University Regn Number']}:`, error);
        failedRecords.push({
          registerNumber: rawRow?.registerNumber || rawRow?.['University Regn Number'] || "Unknown",
          reason: error.message || "Unknown error"
        });
      }
    }

    console.log(`✅ Upload complete: ${successCount} success, ${failedRecords.length} failed`);

    res.status(200).json({
      success: true,
      message: `Bulk upload completed. Success: ${successCount}, Failed: ${failedRecords.length}`,
      successCount,
      failedCount: failedRecords.length,
      failedRecords,
      batchId,
    });
  } catch (error) {
    console.error("❌ Error in bulk upload:", error);
    res.status(500).json({
      success: false,
      message: "Error processing bulk upload",
      error: error.message
    });
  }
};

export const deleteSkillRackRecord = async (req, res) => {
  try {
    console.log("🗑️ Deleting / Resetting staff upload for record...");
    const { id } = req.params;
    const currentStaffId = req.user?.userId || req.user?.Userid;
    const userRole = (req.user?.roleName || req.user?.role || "").toLowerCase();
    const isGlobalAdmin = ["admin", "superadmin"].includes(userRole);

    let record = null;
    if (String(id).startsWith("ward_")) {
      const studentId = id.replace("ward_", "");
      const sd = await StudentDetails.findByPk(studentId);
      if (sd) {
        record = await SkillRack.findOne({ where: { registerNumber: sd.registerNumber } });
      }
    } else {
      record = await SkillRack.findByPk(id);
    }

    if (!record) {
      return res.status(200).json({
        success: true,
        message: "Record already clean or not found"
      });
    }

    if (!isGlobalAdmin && currentStaffId) {
      const student = await StudentDetails.findOne({
        where: {
          [Op.or]: [
            record.registerNumber ? { registerNumber: record.registerNumber } : null,
            record.Userid ? { Userid: record.Userid } : null,
          ].filter(Boolean),
          [Op.and]: [
            {
              [Op.or]: [
                { staffId: currentStaffId },
                req.user?.userNumber ? { staffId: req.user.userNumber } : null,
              ].filter(Boolean)
            }
          ]
        }
      });
      if (!student) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You can only manage SkillRack records for your own ward students."
        });
      }
    }

    // CHECK IF STUDENT HAS ENTERED DETAILS (Level 1..6 or level_details)
    const hasStudentLevelData = !!record.level_details ||
      (record.level_1 > 0) || (record.level_2 > 0) || (record.level_3 > 0) ||
      (record.level_4 > 0) || (record.level_5 > 0) || (record.level_6 > 0) ||
      (record.c_programs > 0) || (record.cpp_programs > 0) || (record.java_programs > 0) || (record.python_programs > 0);

    if (hasStudentLevelData) {
      // PRESERVE STUDENT'S LEVEL 1-6 & FORM DETAILS, CLEAR ONLY STAFF UPLOADED METRICS
      const studentSum = (record.level_1 || 0) + (record.level_2 || 0) + (record.level_3 || 0) + 
                         (record.level_4 || 0) + (record.level_5 || 0) + (record.level_6 || 0);

      await record.update({
        total_programs_solved: studentSum,
        last_week: 0,
        code_tests: 0,
        code_tracks: 0,
        code_tutor: 0,
        code_tutorial: 0,
        aptitude_score: 0,
        aptitude_test: 0,
        points: 0,
        gold_medals: 0,
        silver_medals: 0,
        bronze_medals: 0,
        skillrack_rank: null,
        uploaded_by: null,
        upload_batch: null,
        last_updated: new Date()
      });
      console.log(`✅ Staff metrics cleared, student level details preserved for ${record.registerNumber}`);
    } else {
      await record.destroy();
      console.log(`✅ Empty record deleted successfully for ${record.registerNumber}`);
    }

    res.status(200).json({
      success: true,
      message: "Record reset/deleted successfully while preserving student manual entries."
    });
  } catch (error) {
    console.error("❌ Error deleting record:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting record",
      error: error.message
    });
  }
};

export const bulkDeleteSkillRackRecords = async (req, res) => {
  try {
    console.log("🗑️ Bulk deleting / resetting SkillRack records...");
    const { ids } = req.body;
    const currentStaffId = req.user?.userId || req.user?.Userid;
    const userRole = (req.user?.roleName || req.user?.role || "").toLowerCase();
    const isGlobalAdmin = ["admin", "superadmin"].includes(userRole);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Array of record IDs is required for deletion"
      });
    }

    let affectedCount = 0;

    for (const rawId of ids) {
      try {
        let record = null;
        if (String(rawId).startsWith("ward_")) {
          const studentId = rawId.replace("ward_", "");
          const sd = await StudentDetails.findByPk(studentId);
          if (sd) {
            record = await SkillRack.findOne({ where: { registerNumber: sd.registerNumber } });
          }
        } else {
          record = await SkillRack.findByPk(rawId);
        }

        if (!record) continue;

        if (!isGlobalAdmin && currentStaffId) {
          const student = await StudentDetails.findOne({
            where: {
              [Op.or]: [
                record.registerNumber ? { registerNumber: record.registerNumber } : null,
                record.Userid ? { Userid: record.Userid } : null,
              ].filter(Boolean),
              [Op.and]: [
                {
                  [Op.or]: [
                    { staffId: currentStaffId },
                    req.user?.userNumber ? { staffId: req.user.userNumber } : null,
                  ].filter(Boolean)
                }
              ]
            }
          });
          if (!student) continue;
        }

        const hasStudentLevelData = !!record.level_details ||
          (record.level_1 > 0) || (record.level_2 > 0) || (record.level_3 > 0) ||
          (record.level_4 > 0) || (record.level_5 > 0) || (record.level_6 > 0) ||
          (record.c_programs > 0) || (record.cpp_programs > 0) || (record.java_programs > 0) || (record.python_programs > 0);

        if (hasStudentLevelData) {
          const studentSum = (record.level_1 || 0) + (record.level_2 || 0) + (record.level_3 || 0) + 
                             (record.level_4 || 0) + (record.level_5 || 0) + (record.level_6 || 0);

          await record.update({
            total_programs_solved: studentSum,
            last_week: 0,
            code_tests: 0,
            code_tracks: 0,
            code_tutor: 0,
            code_tutorial: 0,
            aptitude_score: 0,
            aptitude_test: 0,
            points: 0,
            gold_medals: 0,
            silver_medals: 0,
            bronze_medals: 0,
            skillrack_rank: null,
            uploaded_by: null,
            upload_batch: null,
            last_updated: new Date()
          });
        } else {
          await record.destroy();
        }

        affectedCount++;
      } catch (innerErr) {
        console.warn("Bulk delete record warning:", innerErr.message);
      }
    }

    console.log(`✅ Bulk processed ${affectedCount} records`);

    res.status(200).json({
      success: true,
      message: `Successfully reset/deleted ${affectedCount} record(s) preserving student manual entries`,
      deletedCount: affectedCount
    });
  } catch (error) {
    console.error("❌ Error in bulk delete:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting records",
      error: error.message
    });
  }
};

console.log("✅ SkillRack Controller Loaded Successfully");


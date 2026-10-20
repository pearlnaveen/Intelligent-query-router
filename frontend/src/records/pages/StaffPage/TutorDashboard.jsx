import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  FaSearch, FaSync, 
  FaEye, FaFileExcel, 
  FaSlidersH, FaPlus, FaTrashAlt, FaTimes, FaCheck,
  FaListUl, FaListOl,
  FaUndo, FaRedo
} from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { useAuth } from "../auth/AuthContext";
import API from "../../services/api";

// Helper to convert integer semester to Roman numerals
const toRoman = (num) => {
  const romanMap = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII'
  };
  return romanMap[num] || String(num);
};

// Helper to format semester to "III Year – V Semester"
const formatYearAndSem = (semesterInput) => {
  if (!semesterInput) return "III Year – V Semester";
  const s = parseInt(semesterInput, 10);
  if (isNaN(s) || s < 1) return "III Year – V Semester";
  const year = Math.ceil(s / 2);
  return `${toRoman(year)} Year – ${toRoman(s)} Semester`;
};

// Helper to format Batch into "2024 - 2028 Batch"
const formatBatchText = (batchInput) => {
  if (!batchInput) return "2024 - 2028 Batch";
  const b = String(batchInput).trim();
  if (b.includes("-")) {
    return b.endsWith("Batch") ? b : `${b} Batch`;
  }
  const yearNum = parseInt(b, 10);
  if (!isNaN(yearNum) && yearNum > 1900 && yearNum < 2100) {
    return `${yearNum} - ${yearNum + 4} Batch`;
  }
  return `${b} Batch`;
};

// Helper to compute Academic Year
const computeAcademicYear = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const startYr = currentMonth >= 5 ? currentYear : currentYear - 1;
  return `Academic Year ${startYr} – ${startYr + 1}`;
};

// Helper to extract clean department acronym
const getDepartmentAcronym = (deptStr, userDeptAcr) => {
  if (userDeptAcr && typeof userDeptAcr === "string" && userDeptAcr.trim().length > 0 && userDeptAcr.trim().length <= 6) {
    return userDeptAcr.trim().toUpperCase();
  }
  if (!deptStr || typeof deptStr !== "string") return "CSE";

  const d = deptStr.toLowerCase().trim();
  if (d.includes("computer science") || d.includes("cse")) return "CSE";
  if (d.includes("information tech") || d.includes("it")) return "IT";
  if (d.includes("electronics and communication") || d.includes("ece")) return "ECE";
  if (d.includes("electrical and electronics") || d.includes("eee")) return "EEE";
  if (d.includes("mechanical") || d.includes("mech")) return "MECH";
  if (d.includes("civil")) return "CIVIL";
  if (d.includes("artificial intelligence") || d.includes("ai & ds") || d.includes("aids")) return "AI&DS";
  if (d.includes("biomedical") || d.includes("bme")) return "BME";

  const clean = deptStr
    .replace(/^department of\s+/i, "")
    .split(/\s+/)
    .filter((w) => !["and", "of", "in", "&", "the"].includes(w.toLowerCase()))
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return clean || "CSE";
};

const defaultSlowLearnerPlan = `• Spend 1 hour on arrear subject + 1 hour on coding practice (Class Incharge hour / Tutor hour / Library hour).
• Practice 2–3 important questions daily from current semester units to avoid arrears.
• Focus on fundamentals (arrays, sorting, basic logic) before moving to advanced topics.
• Break complex topics into small, bite-sized lessons.
• For arrear preparation, focus strictly on question bank repeated questions.
• Complete 1 simple project every semester for hands-on experience.
• Solve 2–3 easy reasoning/aptitude questions daily.
• Do group study/discussion with friends for both arrears and coding.
• Weekly target: 5 coding problems + 2 arrear units revised.`;

const defaultOutstandingPlan = `• Aptitude Practice: Focus on reasoning, data interpretation, and analytical problem-solving.
• Focus on mastering Data Structures, Algorithms, System Design, and advanced problem-solving.
• Practice on Skillrack, LeetCode, HackerRank, and Codechef. Aim to solve at least 2-3 problems per day (Medium to Hard).
• Target: Solve 200+ problems by the end of 2nd year. Learn patterns (sliding window, backtracking, dynamic programming).
• Participate in coding contests weekly to improve speed and time management.
• Hands-on project development: Build full-stack apps with modern frameworks and deploy on cloud platforms.
• Select 1-2 core technologies (AI/ML, Cloud Architecture, Cyber Security, Web3) to specialize in.
• Prepare for product-tier placement drives and apply for high-stipend summer internships.`;

// Helper to format/convert plan text into bullet or numbered points
const formatTextAsPoints = (text, style = "bullet", startNum = 1) => {
  if (!text) return "";
  const lines = text.split("\n");
  let num = startNum;
  const result = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      // Strip existing bullet symbols like •, -, *, ▪, ▫, ►, –, —, 1., 1), etc.
      const clean = trimmed.replace(/^([•\-\*▪▫►–—]|\d+[\.\)])\s*/, "").trim();
      if (!clean) return "";
      if (style === "number") {
        const item = `${num}. ${clean}`;
        num++;
        return item;
      }
      return `• ${clean}`;
    })
    .filter(Boolean)
    .join("\n");
  return result;
};

// Custom Hook for high-performance, word-by-word & action-chunk Undo and Redo
const usePlanUndoRedo = (initialValue) => {
  const [text, setText] = useState(initialValue);
  const [pastCount, setPastCount] = useState(0);
  const [futureCount, setFutureCount] = useState(0);

  const textRef = useRef(initialValue);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const lastSnapshotRef = useRef(initialValue);
  const lastTypeTimeRef = useRef(Date.now());

  const syncCounts = () => {
    setPastCount(pastRef.current.length);
    setFutureCount(futureRef.current.length);
  };

  const init = (loadedText) => {
    const val = loadedText || "";
    textRef.current = val;
    lastSnapshotRef.current = val;
    pastRef.current = [];
    futureRef.current = [];
    lastTypeTimeRef.current = Date.now();
    setText(val);
    syncCounts();
  };

  const update = (newValOrFn, isImmediate = false) => {
    const prev = textRef.current;
    const next = typeof newValOrFn === "function" ? newValOrFn(prev) : newValOrFn;
    if (next === prev) return;

    const now = Date.now();
    // Detect natural word/phrase breaks (spaces, newlines, punctuation, multi-char edits or ~400ms typing pauses)
    const isWordBoundary = /[\s\.,;:\?!—–]$/.test(next) || (prev.length > 0 && /[\s\.,;:\?!—–]$/.test(prev));
    const isLargeChange = Math.abs(next.length - prev.length) > 1;
    const isTimeElapsed = now - lastTypeTimeRef.current > 400;

    if (isImmediate || isWordBoundary || isLargeChange || isTimeElapsed) {
      const snap = lastSnapshotRef.current;
      if (snap !== prev) {
        pastRef.current = [...pastRef.current.slice(-150), snap];
      } else if (pastRef.current.length === 0 || pastRef.current[pastRef.current.length - 1] !== prev) {
        pastRef.current = [...pastRef.current.slice(-150), prev];
      }
      lastSnapshotRef.current = next;
      futureRef.current = [];
    }

    lastTypeTimeRef.current = now;
    textRef.current = next;
    setText(next);
    syncCounts();
  };

  const undo = () => {
    const curr = textRef.current;
    // If user has typed characters since last snapshot, first undo those back to the last snapshot
    if (lastSnapshotRef.current !== curr) {
      futureRef.current = [curr, ...futureRef.current.slice(0, 150)];
      const target = lastSnapshotRef.current;
      textRef.current = target;
      setText(target);
      syncCounts();
      return;
    }

    if (pastRef.current.length === 0) return;

    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [curr, ...futureRef.current.slice(0, 150)];
    lastSnapshotRef.current = prev;
    lastTypeTimeRef.current = Date.now();

    textRef.current = prev;
    setText(prev);
    syncCounts();
  };

  const redo = () => {
    if (futureRef.current.length === 0) return;

    const curr = textRef.current;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current.slice(-150), curr];
    lastSnapshotRef.current = next;
    lastTypeTimeRef.current = Date.now();

    textRef.current = next;
    setText(next);
    syncCounts();
  };

  return {
    text,
    setText,
    textRef,
    canUndo: pastCount > 0 || (lastSnapshotRef.current !== textRef.current),
    canRedo: futureCount > 0,
    update,
    undo,
    redo,
    init,
  };
};

// Formats either the highlighted text selection in the textarea or the full plan
const applyFormatToPlan = (textareaRef, currentPlanText, updatePlanFn, style) => {
  const textarea = textareaRef.current;
  const fullText = textarea ? textarea.value : currentPlanText || "";

  if (!textarea) {
    updatePlanFn(formatTextAsPoints(fullText, style), true);
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  if (start !== end && start !== undefined && end !== undefined) {
    // Selection exists: format only the selected lines
    const lineStart = fullText.lastIndexOf("\n", start - 1) + 1;
    const nextNewline = fullText.indexOf("\n", end);
    const lineEnd = nextNewline === -1 ? fullText.length : nextNewline;

    const prefix = fullText.slice(0, lineStart);
    const selectedBlock = fullText.slice(lineStart, lineEnd);
    const suffix = fullText.slice(lineEnd);

    let startNum = 1;
    if (style === "number" && prefix) {
      const prevLines = prefix.trimEnd().split("\n");
      const lastPrevLine = prevLines[prevLines.length - 1]?.trim();
      const match = lastPrevLine?.match(/^(\d+)[\.\)]/);
      if (match) {
        startNum = parseInt(match[1], 10) + 1;
      }
    }

    const formattedBlock = formatTextAsPoints(selectedBlock, style, startNum);
    const newText = prefix + formattedBlock + suffix;

    updatePlanFn(newText, true);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          prefix.length,
          prefix.length + formattedBlock.length
        );
      }
    }, 0);
  } else {
    // No specific selection: format entire text
    const formatted = formatTextAsPoints(fullText, style);
    updatePlanFn(formatted, true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  }
};

const TutorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab routing: 'general' | 'backlog' | 'academic' | 'slow' | 'outstanding'
  const activeTab = searchParams.get("tab") || "general";
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState([]);
  const [staffInfo, setStaffInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Tutor designated Slow Learners & Outstanding Students (Set of register numbers)
  const [selectedSlowLearnerRegs, setSelectedSlowLearnerRegs] = useState([]);
  const [selectedOutstandingRegs, setSelectedOutstandingRegs] = useState([]);

  // Modal states for adding students (Single button per section)
  const [showAddSlowModal, setShowAddSlowModal] = useState(false);
  const [showAddOutstandingModal, setShowAddOutstandingModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

  // Editable plans for strategies with high-performance Undo/Redo
  const slowPlan = usePlanUndoRedo(defaultSlowLearnerPlan);
  const outstandingPlan = usePlanUndoRedo(defaultOutstandingPlan);
  const [isEditingPlans, setIsEditingPlans] = useState(false);

  // Textarea Refs for selection preservation
  const slowTextareaRef = useRef(null);
  const outstandingTextareaRef = useRef(null);

  const staffUserId = user?.userId || user?.Userid || user?.id;

  // Load Tutor Selections and Custom Plans from localStorage
  useEffect(() => {
    if (!staffUserId) return;
    try {
      const savedSlow = localStorage.getItem(`tutor_slow_learners_${staffUserId}`);
      if (savedSlow) {
        setSelectedSlowLearnerRegs(JSON.parse(savedSlow));
      }
      const savedOutstanding = localStorage.getItem(`tutor_outstanding_${staffUserId}`);
      if (savedOutstanding) {
        setSelectedOutstandingRegs(JSON.parse(savedOutstanding));
      }
      const savedSlowPlan = localStorage.getItem(`tutor_slow_plan_${staffUserId}`);
      if (savedSlowPlan) {
        slowPlan.init(savedSlowPlan);
      }
      const savedOutstandingPlan = localStorage.getItem(`tutor_outstanding_plan_${staffUserId}`);
      if (savedOutstandingPlan) {
        outstandingPlan.init(savedOutstandingPlan);
      }
    } catch (e) {
      console.error("Error reading saved tutor designations:", e);
    }
  }, [staffUserId]);

  const handleToggleEditPlans = () => {
    if (isEditingPlans) {
      if (staffUserId) {
        localStorage.setItem(`tutor_slow_plan_${staffUserId}`, slowPlan.text);
        localStorage.setItem(`tutor_outstanding_plan_${staffUserId}`, outstandingPlan.text);
      }
      toast.success("Strategy plan saved successfully!");
    }
    setIsEditingPlans((prev) => !prev);
  };

  // Save Tutor Selections to localStorage
  const saveSlowLearners = (newList) => {
    setSelectedSlowLearnerRegs(newList);
    if (staffUserId) {
      localStorage.setItem(`tutor_slow_learners_${staffUserId}`, JSON.stringify(newList));
    }
  };

  const saveOutstandingStudents = (newList) => {
    setSelectedOutstandingRegs(newList);
    if (staffUserId) {
      localStorage.setItem(`tutor_outstanding_${staffUserId}`, JSON.stringify(newList));
    }
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (!staffUserId) {
        throw new Error("Staff user ID not available.");
      }

      // Fetch staff profile & students
      let fetchedStaff = null;
      try {
        const staffRes = await API.get("/staff/staff");
        if (staffRes.data) {
          fetchedStaff = staffRes.data;
          setStaffInfo(fetchedStaff);
        }
      } catch (e) {
        console.warn("Could not fetch staff profile:", e.message);
      }

      const studentsRes = await API.get("/students").catch(() => ({ data: [] }));
      let allStudents = [];
      if (Array.isArray(studentsRes.data)) {
        allStudents = studentsRes.data;
      } else if (studentsRes.data?.students) {
        allStudents = studentsRes.data.students;
      } else if (studentsRes.data?.data) {
        allStudents = studentsRes.data.data;
      }

      // Filter students assigned to this tutor
      const assignedWards = allStudents.filter((s) => {
        return (
          String(s.assignedStaffUserid) === String(staffUserId) ||
          String(s.staff_id) === String(staffUserId) ||
          String(s.staffId) === String(staffUserId)
        );
      });

      // Sort assigned students strictly by roll / register number in ascending order
      assignedWards.sort((a, b) => {
        const regA = String(a.registerNumber || a.rollNo || a.roll_no || a.userNumber || "");
        const regB = String(b.registerNumber || b.rollNo || b.roll_no || b.userNumber || "");
        return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: "base" });
      });

      // Enrich any ward missing live academic data directly from student-education endpoint (same source as studentbio)
      const wardsNeedingEnrichment = assignedWards.filter(
        (w) => w.cgpa === null || w.cgpa === undefined || w.standing_arrears_count === undefined
      );

      if (wardsNeedingEnrichment.length > 0) {
        try {
          const enrichedResults = await Promise.all(
            wardsNeedingEnrichment.map(async (w) => {
              try {
                const eduRes = await API.get('/student-education/my-record', {
                  params: {
                    userId: w.Userid || w.userId || w.id,
                    regno: w.registerNumber,
                  },
                });
                const edu = eduRes.data?.education;
                if (!edu) return { reg: w.registerNumber, edu: null };
                return { reg: w.registerNumber, edu };
              } catch (e) {
                return { reg: w.registerNumber, edu: null };
              }
            })
          );

          const eduMap = new Map();
          for (const item of enrichedResults) {
            if (item && item.edu) {
              eduMap.set(String(item.reg).trim().toUpperCase(), item.edu);
            }
          }

          if (eduMap.size > 0) {
            assignedWards.forEach((w, idx) => {
              const lookupKey = String(w.registerNumber || "").trim().toUpperCase();
              const edu = eduMap.get(lookupKey);
              if (edu) {
                assignedWards[idx] = {
                  ...w,
                  semester_1_gpa: edu.semester_1_gpa ?? w.semester_1_gpa,
                  semester_2_gpa: edu.semester_2_gpa ?? w.semester_2_gpa,
                  semester_3_gpa: edu.semester_3_gpa ?? w.semester_3_gpa,
                  semester_4_gpa: edu.semester_4_gpa ?? w.semester_4_gpa,
                  semester_5_gpa: edu.semester_5_gpa ?? w.semester_5_gpa,
                  semester_6_gpa: edu.semester_6_gpa ?? w.semester_6_gpa,
                  semester_7_gpa: edu.semester_7_gpa ?? w.semester_7_gpa,
                  semester_8_gpa: edu.semester_8_gpa ?? w.semester_8_gpa,
                  cgpa: edu.cgpa ?? w.cgpa,
                  gpa: edu.gpa ?? w.gpa,
                  has_standing_arrears: edu.has_standing_arrears ?? w.has_standing_arrears,
                  standing_arrears_count: edu.standing_arrears_count ?? w.standing_arrears_count,
                  standing_arrears_subjects: edu.standing_arrears_subjects ?? w.standing_arrears_subjects,
                  has_arrears_history: edu.has_arrears_history ?? w.has_arrears_history,
                  arrears_history_count: edu.arrears_history_count ?? w.arrears_history_count,
                };
              }
            });
          }
        } catch (enrichErr) {
          console.warn("Non-critical enrichment notice:", enrichErr);
        }
      }

      setWards([...assignedWards]);
    } catch (err) {
      console.error("Error fetching tutor dashboard data:", err);
      toast.error("Failed to load tutor dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user, staffUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics Calculations
  const stats = useMemo(() => {
    const total = wards.length;
    const isMale = (w) => (w.gender || "").toLowerCase().startsWith("m");
    const isFemale = (w) => (w.gender || "").toLowerCase().startsWith("f");
    const boys = wards.filter(isMale).length;
    const girls = wards.filter(isFemale).length;

    // Admission Quota
    const isGovtQuota = (w) => {
      const q = (w.admission_quota || w.seat_type || "").toLowerCase();
      return q.includes("govt") || q.includes("government") || q.includes("gq") || (!q.includes("mgmt") && !q.includes("management") && !q.includes("mq"));
    };
    const isMgmtQuota = (w) => {
      const q = (w.admission_quota || w.seat_type || "").toLowerCase();
      return q.includes("mgmt") || q.includes("management") || q.includes("mq");
    };

    const gqBoys = wards.filter((w) => isMale(w) && isGovtQuota(w)).length;
    const gqGirls = wards.filter((w) => isFemale(w) && isGovtQuota(w)).length;
    const gqTotal = gqBoys + gqGirls;

    const mqBoys = wards.filter((w) => isMale(w) && isMgmtQuota(w)).length;
    const mqGirls = wards.filter((w) => isFemale(w) && isMgmtQuota(w)).length;
    const mqTotal = mqBoys + mqGirls;

    // Admission Via
    const isLateral = (w) => {
      const l = String(w.lateral_entry || "").toLowerCase();
      return l === "yes" || l.includes("lateral") || l.includes("diploma");
    };

    const plusTwoBoys = wards.filter((w) => isMale(w) && !isLateral(w)).length;
    const plusTwoGirls = wards.filter((w) => isFemale(w) && !isLateral(w)).length;
    const plusTwoTotal = plusTwoBoys + plusTwoGirls;

    const dipBoys = wards.filter((w) => isMale(w) && isLateral(w)).length;
    const dipGirls = wards.filter((w) => isFemale(w) && isLateral(w)).length;
    const dipTotal = dipBoys + dipGirls;

    // Medium of study
    const isTamil = (w) => (w.medium_of_study || "").toLowerCase().includes("tamil");
    const engBoys = wards.filter((w) => isMale(w) && !isTamil(w)).length;
    const engGirls = wards.filter((w) => isFemale(w) && !isTamil(w)).length;
    const engTotal = engBoys + engGirls;

    const tamBoys = wards.filter((w) => isMale(w) && isTamil(w)).length;
    const tamGirls = wards.filter((w) => isFemale(w) && isTamil(w)).length;
    const tamTotal = tamBoys + tamGirls;

    // Residence
    const isHosteller = (w) => (w.student_type || "").toLowerCase().includes("hostel");
    const dayBoys = wards.filter((w) => isMale(w) && !isHosteller(w)).length;
    const dayGirls = wards.filter((w) => isFemale(w) && !isHosteller(w)).length;
    const dayTotal = dayBoys + dayGirls;

    const hostBoys = wards.filter((w) => isMale(w) && isHosteller(w)).length;
    const hostGirls = wards.filter((w) => isFemale(w) && isHosteller(w)).length;
    const hostTotal = hostBoys + hostGirls;

    // Cutoff
    const cutoffList = wards
      .map((w) => {
        const c = parseFloat(w.cutoff);
        const name = w.studentName || w.username || "";
        return !isNaN(c) && c > 0 ? { cutoff: c, name } : null;
      })
      .filter(Boolean);

    let maxCutoff = { score: "-", name: "-" };
    let minCutoff = { score: "-", name: "-" };
    if (cutoffList.length > 0) {
      cutoffList.sort((a, b) => b.cutoff - a.cutoff);
      maxCutoff = { score: cutoffList[0].cutoff, name: cutoffList[0].name };
      minCutoff = { score: cutoffList[cutoffList.length - 1].cutoff, name: cutoffList[cutoffList.length - 1].name };
    }

    // Backlog & Arrears
    let withoutBacklog = 0;
    let withBacklogNoCurrent = 0;
    let currentArrears = 0;

    let cgpaAbove9 = 0;
    let cgpa85To9 = 0;
    let cgpa75To85 = 0;
    let cgpa7To75 = 0;
    let cgpa65To7 = 0;
    let cgpaBelow65 = 0;
    let cgpaArrears = 0;

    let totalCgpaSum = 0;
    let validCgpaCount = 0;

    wards.forEach((w) => {
      const standing = parseInt(w.standing_arrears_count || 0, 10);
      const hasStanding = Boolean(w.has_standing_arrears) || standing > 0;
      const history = parseInt(w.arrears_history_count || 0, 10);
      const hasHistory = Boolean(w.has_arrears_history) || history > 0;

      if (hasStanding) {
        currentArrears++;
        cgpaArrears++; // Arrear students are counted strictly under "Arrear" and excluded from CGPA brackets
      } else {
        if (hasHistory) {
          withBacklogNoCurrent++;
        } else {
          withoutBacklog++;
        }

        // Only students with zero standing arrears are counted in the CGPA range categories
        const cgpaVal = parseFloat(w.cgpa);
        if (!isNaN(cgpaVal) && cgpaVal > 0) {
          totalCgpaSum += cgpaVal;
          validCgpaCount++;
          if (cgpaVal >= 9.0) cgpaAbove9++;
          else if (cgpaVal >= 8.5) cgpa85To9++;
          else if (cgpaVal >= 7.5) cgpa75To85++;
          else if (cgpaVal >= 7.0) cgpa7To75++;
          else if (cgpaVal >= 6.5) cgpa65To7++;
          else cgpaBelow65++;
        }
      }
    });

    const averageCgpa = validCgpaCount > 0 ? (totalCgpaSum / validCgpaCount).toFixed(2) : "-";

    // Tutor Added Slow Learners list
    const slowLearners = wards.filter((w) => {
      const reg = String(w.registerNumber || w.rollNo || w.userNumber);
      return selectedSlowLearnerRegs.includes(reg);
    });

    // Tutor Added Outstanding Students list
    const outstandingStudents = wards.filter((w) => {
      const reg = String(w.registerNumber || w.rollNo || w.userNumber);
      return selectedOutstandingRegs.includes(reg);
    });

    return {
      total,
      boys,
      girls,
      gqBoys,
      gqGirls,
      gqTotal,
      mqBoys,
      mqGirls,
      mqTotal,
      plusTwoBoys,
      plusTwoGirls,
      plusTwoTotal,
      dipBoys,
      dipGirls,
      dipTotal,
      engBoys,
      engGirls,
      engTotal,
      tamBoys,
      tamGirls,
      tamTotal,
      dayBoys,
      dayGirls,
      dayTotal,
      hostBoys,
      hostGirls,
      hostTotal,
      maxCutoff,
      minCutoff,
      withoutBacklog,
      withBacklogNoCurrent,
      currentArrears,
      cgpaAbove9,
      cgpa85To9,
      cgpa75To85,
      cgpa7To75,
      cgpa65To7,
      cgpaBelow65,
      cgpaArrears,
      averageCgpa,
      slowLearners,
      outstandingStudents,
      lateralCount: dipTotal,
      regularCount: plusTwoTotal,
    };
  }, [wards, selectedSlowLearnerRegs, selectedOutstandingRegs]);

  // General Metadata
  const sampleDept = wards[0]?.departmentName || staffInfo?.department || "Computer Science and Engineering";
  const deptAcr = getDepartmentAcronym(sampleDept, user?.department?.departmentAcr || staffInfo?.departmentAcr);
  const sampleBatch = wards[0]?.batch || staffInfo?.batch || "2024 - 2028";
  const batchText = formatBatchText(sampleBatch);
  const sampleSem = wards[0]?.semester || "5";
  const yearSemText = formatYearAndSem(sampleSem);
  const academicYrText = computeAcademicYear();
  const tutorName = staffInfo?.name || user?.username || "Tutor";
  const tutorDesignation = staffInfo?.designation || "AP";

  // Filtered wards for table search
  const filteredWards = useMemo(() => {
    return wards.filter((w) => {
      const reg = (w.registerNumber || "").toLowerCase();
      const name = (w.username || w.studentName || "").toLowerCase();
      const q = searchTerm.toLowerCase();
      return reg.includes(q) || name.includes(q);
    });
  }, [wards, searchTerm]);

  // Handler to add/remove slow learner
  const handleToggleSlowLearner = (reg) => {
    const regStr = String(reg);
    if (selectedSlowLearnerRegs.includes(regStr)) {
      saveSlowLearners(selectedSlowLearnerRegs.filter((r) => r !== regStr));
      toast.info(`Removed ${regStr} from Slow Learners`);
    } else {
      saveSlowLearners([...selectedSlowLearnerRegs, regStr]);
      toast.success(`Added ${regStr} to Slow Learners`);
    }
  };

  // Handler to add/remove outstanding student
  const handleToggleOutstanding = (reg) => {
    const regStr = String(reg);
    if (selectedOutstandingRegs.includes(regStr)) {
      saveOutstandingStudents(selectedOutstandingRegs.filter((r) => r !== regStr));
      toast.info(`Removed ${regStr} from Outstanding Students`);
    } else {
      saveOutstandingStudents([...selectedOutstandingRegs, regStr]);
      toast.success(`Added ${regStr} to Outstanding Students`);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportData = wards.map((w, idx) => ({
        "S.No": idx + 1,
        "Register Number": w.registerNumber || "N/A",
        "Student Name": w.studentName || w.username || "N/A",
        "Gender": w.gender || "Male",
        "Admission Quota": w.admission_quota || "Government Quota",
        "Admission Via": w.lateral_entry === "Yes" ? "Diploma" : "+2",
        "Medium": w.medium_of_study || "English",
        "Residence": w.student_type || "Day-Scholar",
        "Cutoff": w.cutoff || "-",
        "I Sem GPA": w.semester_1_gpa ? Number(w.semester_1_gpa).toFixed(2) : "-",
        "II Sem GPA": w.semester_2_gpa ? Number(w.semester_2_gpa).toFixed(2) : "-",
        "III Sem GPA": w.semester_3_gpa ? Number(w.semester_3_gpa).toFixed(2) : "-",
        "IV Sem GPA": w.semester_4_gpa ? Number(w.semester_4_gpa).toFixed(2) : "-",
        "CGPA": w.cgpa ? Number(w.cgpa).toFixed(2) : "-",
        "Standing Arrears": w.standing_arrears_count > 0 ? w.standing_arrears_count : 0,
        "History of Arrears": w.arrears_history_count > 0 ? w.arrears_history_count : 0,
        "Slow Learner (Tutor Tag)": selectedSlowLearnerRegs.includes(String(w.registerNumber)) ? "Yes" : "No",
        "Outstanding (Tutor Tag)": selectedOutstandingRegs.includes(String(w.registerNumber)) ? "Yes" : "No",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tutor Ward Academic Details");
      XLSX.writeFile(wb, `Tutor_Ward_Academic_Details_${tutorName}_${batchText.replace(/\s+/g, "_")}.xlsx`);
      toast.success("Excel report exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel report.");
    }
  };

  const handleViewBio = (student) => {
    navigate(`/records/student-biodata/${student.Userid || student.userId || student.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Loading Tutor Dashboard...</h3>
          <p className="text-slate-500 text-sm mt-1">Calculating academic analytics & ward records</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ========================================================
            DASHBOARD TOP HEADER HERO
           ======================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-100">
                Tutor Ward Module
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Tutor Dashboard
              </h1>
              <p className="text-slate-500 text-sm max-w-2xl font-medium">
                Comprehensive academic monitoring & analytics for your assigned tutor wards.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={fetchData}
                title="Refresh student data"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-sm transition"
              >
                <FaSync size={13} /> Refresh
              </button>

              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm hover:shadow transition"
              >
                <FaFileExcel size={14} /> Export Excel
              </button>
            </div>
          </div>

          {/* Metadata Quick Strip */}
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase block text-[10px]">Department</span>
              <span className="text-slate-800 font-bold text-sm truncate block mt-0.5" title={sampleDept}>
                {deptAcr} ({sampleDept})
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase block text-[10px]">Batch & Sem</span>
              <span className="text-slate-800 font-bold text-sm block mt-0.5">
                {batchText} • {yearSemText}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase block text-[10px]">Academic Year</span>
              <span className="text-slate-800 font-bold text-sm block mt-0.5">
                {academicYrText}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase block text-[10px]">Tutor Incharge</span>
              <span className="text-slate-800 font-bold text-sm block mt-0.5">
                {tutorName}, {tutorDesignation}/{deptAcr}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================
            KEY METRICS STAT CARDS (CLEAN WITHOUT SYMBOLS)
           ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Wards</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
            <span className="text-[11px] font-semibold text-slate-500 block mt-1">
              {stats.boys} Boys • {stats.girls} Girls
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Zero Arrears</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.withoutBacklog}</div>
            <span className="text-[11px] font-semibold text-emerald-600 block mt-1">
              Never had backlogs
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Standing Arrears</span>
            <div className="text-2xl font-black text-rose-600 mt-1">{stats.currentArrears}</div>
            <span className="text-[11px] font-semibold text-rose-600 block mt-1">
              Active arrear students
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Slow Learners</span>
            <div className="text-2xl font-black text-amber-700 mt-1">{stats.slowLearners.length}</div>
            <span className="text-[11px] font-semibold text-slate-500 block mt-1">
              Tutor Added Wards
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding</span>
            <div className="text-2xl font-black text-purple-700 mt-1">{stats.outstandingStudents.length}</div>
            <span className="text-[11px] font-semibold text-slate-500 block mt-1">
              Tutor Added Achievers
            </span>
          </div>
        </div>

        {/* ========================================================
            PAGE NAVIGATION TABS (Strictly in 1 Line, Clean without Symbols)
           ======================================================== */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto scrollbar-none">
          <div className="flex items-center flex-nowrap gap-2 min-w-max">
            <button
              onClick={() => setActiveTab("general")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap flex-shrink-0 ${
                activeTab === "general"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              1. General Details
            </button>

            <button
              onClick={() => setActiveTab("backlog")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap flex-shrink-0 ${
                activeTab === "backlog"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              2. Backlog & CGPA Analytics
            </button>

            <button
              onClick={() => setActiveTab("academic")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap flex-shrink-0 ${
                activeTab === "academic"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              3. Academic Details (IV Sem GPA)
            </button>

            <button
              onClick={() => setActiveTab("slow")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                activeTab === "slow"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <span>4. Strategy for Slow Learners</span>
              {stats.slowLearners.length > 0 && (
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === "slow" ? "bg-white text-indigo-700" : "bg-amber-100 text-amber-800"}`}>
                  {stats.slowLearners.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("outstanding")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                activeTab === "outstanding"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <span>5. Strategy for Outstanding Students</span>
              {stats.outstandingStudents.length > 0 && (
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === "outstanding" ? "bg-white text-indigo-700" : "bg-purple-100 text-purple-800"}`}>
                  {stats.outstandingStudents.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================
            TAB 1: GENERAL DETAILS
           ======================================================== */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">General Batch Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Admission quotas, modes of entry, medium of school study, residence, and cutoff summary.
                  </p>
                </div>
              </div>

              {/* Main General Details Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left border-separate border-spacing-0 min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-3.5 px-6 border-b border-r border-slate-200 w-[280px]">Category</th>
                      <th className="py-3.5 px-6 border-b border-r border-slate-200 min-w-[240px]">Classification</th>
                      <th className="py-3.5 px-6 text-center border-b border-r border-slate-200 w-28 text-blue-700">Boys</th>
                      <th className="py-3.5 px-6 text-center border-b border-r border-slate-200 w-28 text-pink-700">Girls</th>
                      <th className="py-3.5 px-6 text-center border-b border-slate-200 w-32 text-indigo-950 bg-indigo-50/70">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {/* Row 1: Total Students */}
                    <tr className="bg-slate-50/70 font-bold">
                      <td colSpan={2} className="py-3.5 px-6 text-slate-900 font-extrabold border-b border-r border-slate-200">
                        Total Number of Students
                      </td>
                      <td className="py-3.5 px-6 text-center text-blue-700 font-bold border-b border-r border-slate-200">{stats.boys}</td>
                      <td className="py-3.5 px-6 text-center text-pink-700 font-bold border-b border-r border-slate-200">{stats.girls}</td>
                      <td className="py-3.5 px-6 text-center text-indigo-900 font-black border-b border-slate-200 bg-indigo-50/40">{stats.total}</td>
                    </tr>

                    {/* Row 2: Mode of Admission */}
                    <tr>
                      <td rowSpan={2} className="py-4 px-6 font-bold text-slate-900 align-middle bg-slate-50/40 border-r border-b border-slate-200">
                        Mode of Admission
                      </td>
                      <td className="py-3.5 px-6 text-slate-800 font-medium whitespace-nowrap border-r border-b border-slate-100">Government Quota (GQ)</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-100">{stats.gqBoys}</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-100">{stats.gqGirls}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-slate-900 bg-indigo-50/20 border-b border-slate-100">{stats.gqTotal}</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 text-slate-800 font-medium whitespace-nowrap border-r border-b border-slate-200">Management Quota (MQ)</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-200">{stats.mqBoys}</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-200">{stats.mqGirls}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-slate-900 bg-indigo-50/20 border-b border-slate-200">{stats.mqTotal}</td>
                    </tr>

                    {/* Row 3: Admission Via */}
                    <tr>
                      <td rowSpan={2} className="py-4 px-6 font-bold text-slate-900 align-middle bg-slate-50/40 border-r border-b border-slate-200">
                        Admission Via
                      </td>
                      <td className="py-3.5 px-6 text-slate-800 font-medium whitespace-nowrap border-r border-b border-slate-100">+2 Higher Secondary</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-100">{stats.plusTwoBoys}</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-100">{stats.plusTwoGirls}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-slate-900 bg-indigo-50/20 border-b border-slate-100">{stats.plusTwoTotal}</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 text-slate-800 font-medium whitespace-nowrap border-r border-b border-slate-200">Diploma (Lateral Entry)</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-200">{stats.dipBoys}</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-200">{stats.dipGirls}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-slate-900 bg-indigo-50/20 border-b border-slate-200">{stats.dipTotal}</td>
                    </tr>

                    {/* Row 4: Medium of Study */}
                    <tr>
                      <td rowSpan={2} className="py-4 px-6 font-bold text-slate-900 align-middle bg-slate-50/40 border-r border-b border-slate-200 leading-snug">
                        Medium of Study in<br />School / Polytechnic
                      </td>
                      <td className="py-3.5 px-6 text-slate-800 font-medium whitespace-nowrap border-r border-b border-slate-100">English Medium</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-100">{stats.engBoys}</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-100">{stats.engGirls}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-slate-900 bg-indigo-50/20 border-b border-slate-100">{stats.engTotal}</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 text-slate-800 font-medium whitespace-nowrap border-r border-b border-slate-200">Tamil Medium</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-200">{stats.tamBoys}</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-200">{stats.tamGirls}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-slate-900 bg-indigo-50/20 border-b border-slate-200">{stats.tamTotal}</td>
                    </tr>

                    {/* Row 5: Residence */}
                    <tr>
                      <td rowSpan={2} className="py-4 px-6 font-bold text-slate-900 align-middle bg-slate-50/40 border-r border-b border-slate-200">
                        Residence Type
                      </td>
                      <td className="py-3.5 px-6 text-slate-800 font-medium whitespace-nowrap border-r border-b border-slate-100">Day-Scholar</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-100">{stats.dayBoys}</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-100">{stats.dayGirls}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-slate-900 bg-indigo-50/20 border-b border-slate-100">{stats.dayTotal}</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 text-slate-800 font-medium whitespace-nowrap border-r border-b border-slate-200">Hosteller</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-200">{stats.hostBoys}</td>
                      <td className="py-3.5 px-6 text-center font-medium border-r border-b border-slate-200">{stats.hostGirls}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-slate-900 bg-indigo-50/20 border-b border-slate-200">{stats.hostTotal}</td>
                    </tr>

                    {/* Row 6: Cutoff Summary */}
                    <tr className="bg-slate-50/20">
                      <td rowSpan={2} className="py-4 px-6 font-bold text-slate-900 align-middle bg-slate-50/40 border-r border-slate-200">
                        12th Cut-off Marks
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-700 whitespace-nowrap border-r border-b border-slate-100">Maximum Cut-off:</td>
                      <td colSpan={3} className="py-3.5 px-6 text-slate-800 font-bold border-b border-slate-100">
                        {stats.maxCutoff.score !== "-" ? (
                          `${stats.maxCutoff.score} — ${stats.maxCutoff.name}`
                        ) : "-"}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/20">
                      <td className="py-3.5 px-6 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Minimum Cut-off:</td>
                      <td colSpan={3} className="py-3.5 px-6 text-slate-800 font-bold">
                        {stats.minCutoff.score !== "-" ? (
                          `${stats.minCutoff.score} — ${stats.minCutoff.name}`
                        ) : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: BACKLOG & CGPA ANALYTICS
           ======================================================== */}
        {activeTab === "backlog" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Arrear Status Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-5">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">
                    Arrears & Backlog Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    History and current standing arrear classification for total {stats.total} students ({stats.regularCount} Regular + {stats.lateralCount} Lateral).
                  </p>
                </div>

                <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-5 border-r border-slate-200 w-3/4">Arrear Category</th>
                        <th className="py-3 px-4 text-center w-1/4">Students</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-5 border-r border-slate-200">
                          <div className="font-bold text-slate-900 text-sm">Without Backlog</div>
                          <div className="text-xs text-slate-500 mt-0.5">Never had any arrears (clean academic track)</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[40px] px-3 py-1 rounded-full text-sm font-black bg-emerald-100 text-emerald-800">
                            {stats.withoutBacklog}
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-5 border-r border-slate-200">
                          <div className="font-bold text-slate-900 text-sm">With Backlog (No Current Arrear)</div>
                          <div className="text-xs text-slate-500 mt-0.5">Had arrears in previous semesters but cleared all</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[40px] px-3 py-1 rounded-full text-sm font-black bg-blue-100 text-blue-800">
                            {stats.withBacklogNoCurrent}
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-5 border-r border-slate-200">
                          <div className="font-bold text-slate-900 text-sm">Students Having Arrear Currently</div>
                          <div className="text-xs text-slate-500 mt-0.5">Active standing arrears requiring remediation</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[40px] px-3 py-1 rounded-full text-sm font-black ${
                            stats.currentArrears > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
                          }`}>
                            {stats.currentArrears}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CGPA Distribution Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-5">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">
                    CGPA Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Category-wise distribution of cumulative grade point average for your wards.
                  </p>
                </div>

                <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-5 border-r border-slate-200 w-3/4">CGPA Range</th>
                        <th className="py-3 px-4 text-center w-1/4">Students</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-5 border-r border-slate-200 font-semibold text-slate-800 text-sm">CGPA above 9</td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-800 text-sm">
                          {stats.cgpaAbove9 > 0 ? <span className="inline-flex px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">{stats.cgpaAbove9}</span> : <span className="text-slate-400 font-medium">Nil</span>}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-5 border-r border-slate-200 font-semibold text-slate-800 text-sm">CGPA 8.5 - 9.0</td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-800 text-sm">
                          {stats.cgpa85To9 > 0 ? <span className="inline-flex px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold">{stats.cgpa85To9}</span> : <span className="text-slate-400 font-medium">Nil</span>}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-5 border-r border-slate-200 font-semibold text-slate-800 text-sm">CGPA 7.5 - 8.5</td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-800 text-sm">
                          {stats.cgpa75To85 > 0 ? <span className="inline-flex px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">{stats.cgpa75To85}</span> : <span className="text-slate-400 font-medium">Nil</span>}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-5 border-r border-slate-200 font-semibold text-slate-800 text-sm">CGPA 7.0 - 7.5</td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-800 text-sm">
                          {stats.cgpa7To75 > 0 ? <span className="inline-flex px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-bold">{stats.cgpa7To75}</span> : <span className="text-slate-400 font-medium">Nil</span>}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-5 border-r border-slate-200 font-semibold text-slate-800 text-sm">CGPA 6.5 - 7.0</td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-800 text-sm">
                          {stats.cgpa65To7 > 0 ? <span className="inline-flex px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">{stats.cgpa65To7}</span> : <span className="text-slate-400 font-medium">0</span>}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-5 border-r border-slate-200 font-semibold text-slate-800 text-sm">CGPA &lt; 6.5</td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-800 text-sm">
                          {stats.cgpaBelow65 > 0 ? <span className="inline-flex px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold">{stats.cgpaBelow65}</span> : <span className="text-slate-400 font-medium">Nil</span>}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition bg-rose-50/30">
                        <td className="py-2.5 px-5 border-r border-slate-200 font-semibold text-rose-700 text-sm">Arrear</td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-800 text-sm">
                          {stats.cgpaArrears > 0 ? <span className="inline-flex px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">{stats.cgpaArrears}</span> : <span className="text-slate-400 font-medium">Nil</span>}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: ACADEMIC DETAILS TABLE (EXPANDED COLUMN WIDTHS, ZERO OVERLAP)
           ======================================================== */}
        {activeTab === "academic" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Academic Details of Students
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Semester GPAs (I, II, III, and IV Semester), Credits, CGPA, and Arrear Status for each ward.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search by Reg No or Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* HORIZONTALLY SCROLLABLE TABLE CONTAINER WITH GUARANTEED INDIVIDUAL COLUMN MIN-WIDTHS */}
            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
              <table 
                className="w-full text-left border-collapse" 
                style={{ width: "max-content", minWidth: "1650px" }}
              >
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-normal">
                    <th className="py-4 px-3 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "70px" }}>
                      S.No
                    </th>
                    <th className="py-4 px-4 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "160px" }}>
                      Reg. No.
                    </th>
                    <th className="py-4 px-5 text-left border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "260px" }}>
                      Student Name
                    </th>
                    <th className="py-4 px-3 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "110px" }}>
                      Credits
                    </th>
                    <th className="py-4 px-4 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "140px" }}>
                      12th Cutoff
                    </th>
                    <th className="py-4 px-3 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "110px" }}>
                      I Sem
                    </th>
                    <th className="py-4 px-3 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "110px" }}>
                      II Sem
                    </th>
                    <th className="py-4 px-3 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "110px" }}>
                      III Sem
                    </th>
                    <th className="py-4 px-3 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "110px" }}>
                      IV Sem
                    </th>
                    <th className="py-4 px-3 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "110px" }}>
                      CGPA
                    </th>
                    <th className="py-4 px-4 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "190px" }}>
                      Standing Arrears
                    </th>
                    <th className="py-4 px-4 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "170px" }}>
                      History Arrears
                    </th>
                    <th className="py-4 px-4 text-center whitespace-nowrap" style={{ minWidth: "120px" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredWards.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                        No students found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredWards.map((w, idx) => {
                      const formatGpaVal = (val) => {
                        const num = parseFloat(val);
                        return !isNaN(num) && num > 0 ? num.toFixed(2) : "-";
                      };
                      const sem1 = formatGpaVal(w.semester_1_gpa);
                      const sem2 = formatGpaVal(w.semester_2_gpa);
                      const sem3 = formatGpaVal(w.semester_3_gpa);
                      const sem4 = formatGpaVal(w.semester_4_gpa);
                      const cgpa = formatGpaVal(w.cgpa);
                      
                      // Format credits strictly as numeric value
                      const numericCredits = Number(w.credits) > 0 
                        ? Number(w.credits) 
                        : (Number(w.nptel_credits) || 0);

                      const standingCount = parseInt(w.standing_arrears_count || 0, 10);
                      const hasStanding = Boolean(w.has_standing_arrears) || standingCount > 0;
                      const historyCount = parseInt(w.arrears_history_count || 0, 10);

                      return (
                        <tr key={w.studentId || w.registerNumber || idx} className="hover:bg-slate-50/80 transition">
                          {/* 1. S.No */}
                          <td className="py-3.5 px-3 text-center border-r border-slate-200 text-slate-500 font-semibold text-xs whitespace-nowrap" style={{ minWidth: "70px" }}>
                            {idx + 1}
                          </td>

                          {/* 2. Reg. No. */}
                          <td className="py-3.5 px-4 text-center border-r border-slate-200 font-bold text-slate-800 font-mono text-xs whitespace-nowrap" style={{ minWidth: "160px" }}>
                            {w.registerNumber || "-"}
                          </td>

                          {/* 3. Student Name */}
                          <td className="py-3.5 px-5 border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "260px" }}>
                            <div className="font-bold text-slate-900 text-sm">{w.username || w.studentName || "-"}</div>
                            {w.email && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{w.email}</div>
                            )}
                          </td>

                          {/* 4. Credits (Numeric Only) */}
                          <td className="py-3.5 px-3 text-center border-r border-slate-200 text-sm font-bold text-slate-800 whitespace-nowrap" style={{ minWidth: "110px" }}>
                            {numericCredits}
                          </td>

                          {/* 5. 12th Cutoff */}
                          <td className="py-3.5 px-4 text-center border-r border-slate-200 font-semibold text-slate-700 whitespace-nowrap" style={{ minWidth: "140px" }}>
                            {w.cutoff || "-"}
                          </td>

                          {/* 6. I Sem */}
                          <td className="py-3.5 px-3 text-center border-r border-slate-200 font-medium text-slate-700 whitespace-nowrap" style={{ minWidth: "110px" }}>
                            {sem1}
                          </td>

                          {/* 7. II Sem */}
                          <td className="py-3.5 px-3 text-center border-r border-slate-200 font-medium text-slate-700 whitespace-nowrap" style={{ minWidth: "110px" }}>
                            {sem2}
                          </td>

                          {/* 8. III Sem */}
                          <td className="py-3.5 px-3 text-center border-r border-slate-200 font-medium text-slate-700 whitespace-nowrap" style={{ minWidth: "110px" }}>
                            {sem3}
                          </td>

                          {/* 9. IV Sem */}
                          <td className="py-3.5 px-3 text-center border-r border-slate-200 font-medium text-slate-700 whitespace-nowrap" style={{ minWidth: "110px" }}>
                            {sem4}
                          </td>

                          {/* 10. CGPA */}
                          <td className="py-3.5 px-3 text-center border-r border-slate-200 font-bold text-slate-800 whitespace-nowrap" style={{ minWidth: "110px" }}>
                            {cgpa}
                          </td>

                          {/* 11. Standing Arrears */}
                          <td className="py-3.5 px-4 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "190px" }}>
                            {hasStanding ? (
                              <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                                {standingCount} Arrear{standingCount > 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                                0 Arrears
                              </span>
                            )}
                          </td>

                          {/* 12. History Arrears */}
                          <td className="py-3.5 px-4 text-center border-r border-slate-200 whitespace-nowrap" style={{ minWidth: "170px" }}>
                            {historyCount > 0 ? (
                              <span className="text-xs font-semibold text-amber-700">{historyCount} History</span>
                            ) : (
                              <span className="text-xs text-slate-400">Nil</span>
                            )}
                          </td>

                          {/* 13. Action */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap" style={{ minWidth: "120px" }}>
                            <button
                              onClick={() => handleViewBio(w)}
                              title="View Student Biodata"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white text-xs font-bold transition shadow-sm"
                            >
                              <FaEye size={12} /> Bio
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: STRATEGY FOR SLOW LEARNERS (TUTOR MANAGED)
           ======================================================== */}
        {activeTab === "slow" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Strategy to Address Slow Learners
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tutor-managed slow learners list & personalized remedial action roadmap.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowAddSlowModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition"
                >
                  <FaPlus size={11} /> Add Slow Learner
                </button>

                <button
                  onClick={handleToggleEditPlans}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm"
                >
                  <FaSlidersH /> {isEditingPlans ? "Save Custom Plan" : "Edit Plan"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Identified Slow Learners List */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Designated Slow Learners ({stats.slowLearners.length})
                </h3>

                {stats.slowLearners.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center text-slate-600 text-sm font-semibold">
                    <p>No slow learners currently designated by tutor.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {stats.slowLearners.map((st) => {
                      const reg = String(st.registerNumber || st.rollNo || st.userNumber);
                      return (
                        <div key={reg} className="p-3.5 rounded-2xl bg-amber-50/40 hover:bg-amber-50/80 border border-amber-100 transition flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{st.studentName || st.username}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{reg}</div>
                            <div className="text-[11px] font-semibold text-slate-600 mt-1">
                              CGPA: {st.cgpa || "-"} • Arrears: {st.standing_arrears_count || 0}
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleSlowLearner(reg)}
                            title="Remove from slow learners list"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <FaTrashAlt size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Plan */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Remedial Coaching & Action Plan
                  </h3>
                  {isEditingPlans && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={slowPlan.undo}
                        disabled={!slowPlan.canUndo}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          slowPlan.canUndo
                            ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm cursor-pointer"
                            : "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed"
                        }`}
                        title="Undo (Ctrl+Z)"
                      >
                        <FaUndo size={10} /> Undo
                      </button>
                      <button
                        type="button"
                        onClick={slowPlan.redo}
                        disabled={!slowPlan.canRedo}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          slowPlan.canRedo
                            ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm cursor-pointer"
                            : "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed"
                        }`}
                        title="Redo (Ctrl+Y)"
                      >
                        <FaRedo size={10} /> Redo
                      </button>

                      <div className="h-4 w-px bg-slate-200 mx-0.5" />

                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFormatToPlan(slowTextareaRef, slowPlan.text, slowPlan.update, "bullet")}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-200 shadow-sm transition active:scale-95"
                        title="Format selected lines or full plan as bullet points"
                      >
                        <FaListUl size={11} className="text-amber-700" /> Make as Points
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFormatToPlan(slowTextareaRef, slowPlan.text, slowPlan.update, "number")}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 shadow-sm transition active:scale-95"
                        title="Format selected lines or full plan as numbered points"
                      >
                        <FaListOl size={11} className="text-slate-600" /> Numbered
                      </button>
                    </div>
                  )}
                </div>

                {isEditingPlans ? (
                  <div>
                    <textarea
                      ref={slowTextareaRef}
                      rows={12}
                      value={slowPlan.text}
                      onChange={(e) => slowPlan.update(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                          e.preventDefault();
                          if (e.shiftKey) {
                            slowPlan.redo();
                          } else {
                            slowPlan.undo();
                          }
                        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
                          e.preventDefault();
                          slowPlan.redo();
                        }
                      }}
                      placeholder="Type action points or select text and click 'Make as Points' or 'Numbered'..."
                      className="w-full p-4 rounded-2xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm leading-relaxed"
                    />
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 space-y-2 leading-relaxed">
                    {slowPlan.text
                      .split("\n")
                      .filter((l) => l.trim())
                      .map((line, idx) => {
                        const trimmed = line.trim();
                        const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("▪");
                        const isNum = /^\d+[\.\)]/.test(trimmed);
                        return (
                          <div key={idx} className="flex items-start gap-2.5">
                            {isBullet ? (
                              <span className="text-amber-600 font-bold select-none mt-0.5">•</span>
                            ) : null}
                            <span className={`flex-1 text-slate-800 ${!isBullet && !isNum ? "font-medium text-slate-900" : ""}`}>
                              {isBullet ? trimmed.replace(/^([•\-\*▪▫►–—])\s*/, "") : trimmed}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: STRATEGY FOR OUTSTANDING STUDENTS (TUTOR MANAGED)
           ======================================================== */}
        {activeTab === "outstanding" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Strategy to Address Outstanding Students
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tutor-managed high achievers list & advanced career acceleration roadmap.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowAddOutstandingModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition"
                >
                  <FaPlus size={11} /> Add Outstanding Student
                </button>

                <button
                  onClick={handleToggleEditPlans}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm"
                >
                  <FaSlidersH /> {isEditingPlans ? "Save Custom Plan" : "Edit Plan"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Identified Outstanding Students List */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Designated Top Achievers ({stats.outstandingStudents.length})
                </h3>

                {stats.outstandingStudents.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center text-slate-600 text-sm font-semibold">
                    <p>No outstanding students currently designated by tutor.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {stats.outstandingStudents.map((st) => {
                      const reg = String(st.registerNumber || st.rollNo || st.userNumber);
                      return (
                        <div key={reg} className="p-3.5 rounded-2xl bg-purple-50/40 hover:bg-purple-50/80 border border-purple-100 transition flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{st.studentName || st.username}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{reg}</div>
                            <div className="text-[11px] font-bold text-purple-700 mt-1">
                              CGPA: {st.cgpa || "-"}
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleOutstanding(reg)}
                            title="Remove from outstanding list"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <FaTrashAlt size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Advanced Action Plan */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Career Acceleration & Advanced Coding Roadmap
                  </h3>
                  {isEditingPlans && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={outstandingPlan.undo}
                        disabled={!outstandingPlan.canUndo}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          outstandingPlan.canUndo
                            ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm cursor-pointer"
                            : "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed"
                        }`}
                        title="Undo (Ctrl+Z)"
                      >
                        <FaUndo size={10} /> Undo
                      </button>
                      <button
                        type="button"
                        onClick={outstandingPlan.redo}
                        disabled={!outstandingPlan.canRedo}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          outstandingPlan.canRedo
                            ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm cursor-pointer"
                            : "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed"
                        }`}
                        title="Redo (Ctrl+Y)"
                      >
                        <FaRedo size={10} /> Redo
                      </button>

                      <div className="h-4 w-px bg-slate-200 mx-0.5" />

                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFormatToPlan(outstandingTextareaRef, outstandingPlan.text, outstandingPlan.update, "bullet")}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold border border-purple-200 shadow-sm transition active:scale-95"
                        title="Format selected lines or full plan as bullet points"
                      >
                        <FaListUl size={11} className="text-purple-700" /> Make as Points
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFormatToPlan(outstandingTextareaRef, outstandingPlan.text, outstandingPlan.update, "number")}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 shadow-sm transition active:scale-95"
                        title="Format selected lines or full plan as numbered points"
                      >
                        <FaListOl size={11} className="text-slate-600" /> Numbered
                      </button>
                    </div>
                  )}
                </div>

                {isEditingPlans ? (
                  <div>
                    <textarea
                      ref={outstandingTextareaRef}
                      rows={14}
                      value={outstandingPlan.text}
                      onChange={(e) => outstandingPlan.update(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                          e.preventDefault();
                          if (e.shiftKey) {
                            outstandingPlan.redo();
                          } else {
                            outstandingPlan.undo();
                          }
                        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
                          e.preventDefault();
                          outstandingPlan.redo();
                        }
                      }}
                      placeholder="Type action points or select text and click 'Make as Points' or 'Numbered'..."
                      className="w-full p-4 rounded-2xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm leading-relaxed"
                    />
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 space-y-2 leading-relaxed">
                    {outstandingPlan.text
                      .split("\n")
                      .filter((l) => l.trim())
                      .map((line, idx) => {
                        const trimmed = line.trim();
                        const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("▪");
                        const isNum = /^\d+[\.\)]/.test(trimmed);
                        return (
                          <div key={idx} className="flex items-start gap-2.5">
                            {isBullet ? (
                              <span className="text-purple-600 font-bold select-none mt-0.5">•</span>
                            ) : null}
                            <span className={`flex-1 text-slate-800 ${!isBullet && !isNum ? "font-medium text-slate-900" : ""}`}>
                              {isBullet ? trimmed.replace(/^([•\-\*▪▫►–—])\s*/, "") : trimmed}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 1: ADD SLOW LEARNER MODAL
           ======================================================== */}
        {showAddSlowModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Add Slow Learner
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select students to designate as Slow Learners.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddSlowModal(false);
                    setModalSearch("");
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <FaTimes size={16} />
                </button>
              </div>

              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search by student name or register number..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
                {wards
                  .filter((w) => {
                    const reg = (w.registerNumber || "").toLowerCase();
                    const name = (w.username || w.studentName || "").toLowerCase();
                    const q = modalSearch.toLowerCase();
                    return reg.includes(q) || name.includes(q);
                  })
                  .map((w) => {
                    const reg = String(w.registerNumber || w.rollNo || w.userNumber);
                    const isSelected = selectedSlowLearnerRegs.includes(reg);
                    const standing = parseInt(w.standing_arrears_count || 0, 10);
                    return (
                      <div key={reg} className="pt-2 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{w.username || w.studentName}</div>
                          <div className="text-xs text-slate-500 font-mono">{reg}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            CGPA: {w.cgpa || "-"} • Arrears: {standing > 0 ? `${standing} Standing` : "0"}
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleSlowLearner(reg)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-amber-600 text-white shadow-sm"
                              : "bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <FaCheck size={11} /> Added
                            </>
                          ) : (
                            <>
                              <FaPlus size={10} /> Add
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                <button
                  onClick={() => {
                    setShowAddSlowModal(false);
                    setModalSearch("");
                  }}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 2: ADD OUTSTANDING STUDENT MODAL
           ======================================================== */}
        {showAddOutstandingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Add Outstanding Student
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select students to designate as Outstanding Students.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddOutstandingModal(false);
                    setModalSearch("");
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <FaTimes size={16} />
                </button>
              </div>

              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search by student name or register number..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                  />
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
                {wards
                  .filter((w) => {
                    const reg = (w.registerNumber || "").toLowerCase();
                    const name = (w.username || w.studentName || "").toLowerCase();
                    const q = modalSearch.toLowerCase();
                    return reg.includes(q) || name.includes(q);
                  })
                  .map((w) => {
                    const reg = String(w.registerNumber || w.rollNo || w.userNumber);
                    const isSelected = selectedOutstandingRegs.includes(reg);
                    const standing = parseInt(w.standing_arrears_count || 0, 10);
                    return (
                      <div key={reg} className="pt-2 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{w.username || w.studentName}</div>
                          <div className="text-xs text-slate-500 font-mono">{reg}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            CGPA: {w.cgpa || "-"} • Arrears: {standing > 0 ? `${standing} Standing` : "0"}
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleOutstanding(reg)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-800"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <FaCheck size={11} /> Added
                            </>
                          ) : (
                            <>
                              <FaPlus size={10} /> Add
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                <button
                  onClick={() => {
                    setShowAddOutstandingModal(false);
                    setModalSearch("");
                  }}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TutorDashboard;


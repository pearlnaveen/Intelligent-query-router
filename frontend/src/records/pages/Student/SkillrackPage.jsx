import React, { useState, useEffect } from "react";
import {
  FaCode,
  FaChartBar,
  FaTrophy,
  FaBullseye,
  FaBuilding,
  FaLayerGroup,
  FaEdit,
  FaSave,
  FaUndo,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTachometerAlt,
  FaDatabase,
  FaRocket,
  FaBriefcase,
  FaSearch,
  FaSort,
  FaProjectDiagram,
  FaRandom,
  FaCodeBranch,
  FaShareAlt,
  FaCalendarAlt,
  FaUsers,
  FaClock,
  FaChevronDown,
  FaArrowLeft,
  FaWindowMaximize,
  FaCoffee,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { useSkillRack } from "../../contexts/SkillRackContext";
import { useAuth } from "../auth/AuthContext";

const LEVEL_CONFIG = [
  {
    level: 1,
    key: "level1",
    title: "Level 1",
    subtitle: "Language wise challenges (Tracks)",
    cardBg: "bg-[#f0f8ff] border-[#cbe4fc]",
    barColor: "from-sky-500 to-blue-600",
    items: [
      { key: "c", label: "C", target: 640 },
      { key: "cpp", label: "C++", target: 180 },
      { key: "java", label: "JAVA", target: 230 },
      { key: "python", label: "PYTHON", target: 180 },
      { key: "mysql", label: "MySQL", target: 53 },
      { key: "ds_c", label: "DS in C", target: 10, unit: "Chapters" },
      { key: "ds_java", label: "DS in JAVA", target: 15, unit: "Chapters" },
    ],
  },
  {
    level: 2,
    key: "level2",
    title: "Level 2",
    subtitle: "Kickstart",
    cardBg: "bg-[#eafaf1] border-[#c1f0d8]",
    barColor: "from-emerald-500 to-green-600",
    items: [
      { key: "kickstart", label: "Kickstart", target: 100 },
    ],
  },
  {
    level: 3,
    key: "level3",
    title: "Level 3",
    subtitle: "MNCs (TCS/CTS/WIPRO/INFOSYS)",
    cardBg: "bg-[#fef9e7] border-[#fde8a7]",
    barColor: "from-amber-400 to-yellow-500",
    items: [
      { key: "cts", label: "CTS", target: 35 },
      { key: "infytq", label: "InfyTQ", target: 15 },
      { key: "other_mncs", label: "Other MNCs", target: 200 },
    ],
  },
  {
    level: 4,
    key: "level4",
    title: "Level 4",
    subtitle: "Data Structures & Algorithms",
    cardBg: "bg-[#f4f3ff] border-[#ddd6fe]",
    barColor: "from-indigo-500 to-purple-600",
    items: [
      { key: "stack", label: "Stack", target: 10 },
      { key: "heap", label: "Heap", target: 5 },
      { key: "queue", label: "Queue", target: 5 },
      { key: "binary_tree", label: "Binary Tree", target: 5 },
      { key: "searching", label: "Searching Algorithms", target: 5 },
      { key: "sorting", label: "Sorting Algorithms", target: 10 },
    ],
  },
  {
    level: 5,
    key: "level5",
    title: "Level 5",
    subtitle: "Product Companies (Higher Salary)",
    cardBg: "bg-[#fdf2f8] border-[#fbcfe8]",
    barColor: "from-rose-400 to-pink-600",
    items: [
      { key: "product_companies", label: "Product Companies", target: 100 },
    ],
  },
  {
    level: 6,
    key: "level6",
    title: "Level 6",
    subtitle: "Dream Product Companies & Mini Project",
    cardBg: "bg-[#ecfeff] border-[#a5f3fc]",
    barColor: "from-cyan-400 to-teal-600",
    items: [
      { key: "mini_project", label: "Mini Project", target: 1 },
      { key: "strings", label: "Strings", target: 5 },
      { key: "greedy", label: "Greedy", target: 5 },
      { key: "comb_perm", label: "Combination Permutation", target: 5 },
      { key: "backtracking", label: "Backtracking", target: 5 },
      { key: "dp", label: "Dynamic Programming", target: 35 },
      { key: "graph", label: "Graph", target: 10 },
      { key: "regex", label: "Regular Expression", target: 5 },
    ],
  },
];

// Custom SVGs for languages and medals matching the design
const CLogo = () => (
  <svg className="w-10 h-10" viewBox="0 0 128 128">
    <path fill="#00599C" d="M117.5 33.5l-47-27.1c-4-2.3-9-2.3-13 0l-47 27.1c-4 2.3-6.5 6.6-6.5 11.2v54.2c0 4.6 2.5 8.9 6.5 11.2l47 27.1c2 1.2 4.3 1.7 6.5 1.7s4.5-.6 6.5-1.7l47-27.1c4-2.3 6.5-6.6 6.5-11.2V44.7c0-4.6-2.5-8.9-6.5-11.2z" />
    <path fill="#FFF" d="M64 25.6c-21.2 0-38.4 17.2-38.4 38.4s17.2 38.4 38.4 38.4c14.6 0 27.3-8.2 33.8-20.2l-14.7-7.4c-3.6 6.7-10.8 11.3-19.1 11.3-12 0-21.7-9.7-21.7-22.1s9.7-22.1 21.7-22.1c8.3 0 15.5 4.6 19.1 11.3l14.7-7.4C91.3 33.8 78.6 25.6 64 25.6z" />
  </svg>
);

const CppLogo = () => (
  <svg className="w-10 h-10" viewBox="0 0 128 128">
    <path fill="#00599C" d="M117.5 33.5l-47-27.1c-4-2.3-9-2.3-13 0l-47 27.1c-4 2.3-6.5 6.6-6.5 11.2v54.2c0 4.6 2.5 8.9 6.5 11.2l47 27.1c2 1.2 4.3 1.7 6.5 1.7s4.5-.6 6.5-1.7l47-27.1c4-2.3 6.5-6.6 6.5-11.2V44.7c0-4.6-2.5-8.9-6.5-11.2z" />
    <path fill="#FFF" d="M52 38c-14.4 0-26 11.6-26 26s11.6 26 26 26c9.9 0 18.5-5.5 22.9-13.7l-10-5c-2.4 4.5-7.3 7.7-12.9 7.7-8.3 0-15-6.7-15-15s6.7-15 15-15c5.6 0 10.5 3.2 12.9 7.7l10-5C70.5 43.5 61.9 38 52 38zm34 20h4v-4h4v4h4v4h-4v4h-4v-4h-4v-4zm18 0h4v-4h4v4h4v4h-4v4h-4v-4h-4v-4z" />
  </svg>
);

const JavaLogo = () => (
  <svg className="w-10 h-10" viewBox="0 0 128 128">
    <path fill="#EA2D2E" d="M46.7 89.2s-7.1 4.1 5 5.6c14.6 1.8 22.2 1.6 38.3-1.6 0 0 3.7 2.3 8.9 4.3-31.5 13-64.8-1.5-52.2-8.3M42.4 75.3s-7.8 5.4 3.7 7.1c14.3 2.1 27.6 2.3 49.3-2.1 0 0 2.5 2.6 6.1 4.3-37.4 12.3-73.4.6-59.1-9.3M69.8 49.9c5.1 5.9.8 11.4.8 11.4s12.9-6.6 7-15.4c-6.1-9.2-10.7-13.7 14.5-27.9-29.2 6.5-30.8 21.6-22.3 31.9M86.8 65.6s6 3.1-6.7 5.6c-15.6 3.1-32.8 3.3-44.5.9-4.7-.9-6.1-3.6-6.1-3.6s-1.8 2.6 3.8 5c19.1 8.2 64.9 4.3 74-2.8 7.4-5.8-20.5-5.1-20.5-5.1" />
    <path fill="#5382A1" d="M83.4 39.4c7.6 8.8-1.9 16.9-1.9 16.9s9.7-5 5.2-12.8c-4.4-7.9-6.9-11.7 9.4-23.5-20.8 3.9-22 11.3-12.7 19.4M49.2 103.5c23.5 1.5 39.8-.8 54.8-4.3 0 0-3.9 3.2-9.6 5.4-23.7 9.2-57.5 5.3-67.6-.8-5.3-3.2 5.1-4.7 22.4-.3" />
  </svg>
);

const PythonLogo = () => (
  <svg className="w-10 h-10" viewBox="0 0 128 128">
    <path fill="#3776AB" d="M63.5 14.5c-26.6 0-25 11.5-25 11.5l.1 11.9h25.4v3.6H28.4s-16.4 1.9-16.4 25.1c0 23.3 14.3 22.5 14.3 22.5h8.5v-12s-.5-14.3 14.1-14.3h24.4s13.4.2 13.4-13.1V27.8s1.7-13.3-23.2-13.3zm-13.7 7.7c2.6 0 4.7 2.1 4.7 4.7s-2.1 4.7-4.7 4.7-4.7-2.1-4.7-4.7 2.1-4.7 4.7-4.7z" />
    <path fill="#FFD43B" d="M64.5 113.5c26.6 0 25-11.5 25-11.5l-.1-11.9H64v-3.6h35.6s16.4-1.9 16.4-25.1c0-23.3-14.3-22.5-14.3-22.5h-8.5v12s.5 14.3-14.1 14.3H54.7s-13.4-.2-13.4 13.1v12.4s-1.7 13.3 23.2 13.3zm13.7-7.7c-2.6 0-4.7-2.1-4.7-4.7s2.1-4.7 4.7-4.7 4.7 2.1 4.7 4.7-2.1 4.7-4.7 4.7z" />
  </svg>
);

const MySQLDolphinLogo = () => (
  <svg className="w-10 h-10" viewBox="0 0 64 64" fill="none">
    <path
      d="M48.5 18c-3-6.5-10.5-8-16.5-4-5 3.3-7.5 9-6 15 1.5 6 6 10 11.5 12 6.5 2.3 14 1 18.5-3.5-3 0-5.5-1-7.5-3-1.5-1.5-2.5-3.5-2.5-5.5 0-3 2-6 5-7 2.5-.8 5.5-.3 7.5 1.5-1-3-4-5-7-5.5-4-.7-8 .5-10.5 3.5-1.5 1.8-2 4.2-1.5 6.5.5 2.3 2 4.2 4 5.5-4 0-7.5-2-9.5-5-2.5-3.8-2.5-9 0-13 2.5-4 7.5-6.5 12-5.5 3.5.8 6.5 3 8 6 1 2 1.5 4.5 1 7l3.5-2.5c.5-2.5.5-5-.5-7.5z"
      fill="#00758F"
    />
    <path
      d="M26 38c-4.5 2.5-10 2.5-14.5 0-2-1.1-4.5-1.5-6.5-.5 2 .5 4 1.5 5.5 3 3.5 3.5 9 5 13.5 3.5 1-.3 2-1 2-2.5v-3.5z"
      fill="#F29111"
    />
  </svg>
);

const MedalIcon = ({ number, ribbonColor = "#e65100" }) => (
  <div className="relative flex items-center justify-center">
    <svg className="w-10 h-10 drop-shadow" viewBox="0 0 64 64">
      <path d="M22 6 L32 26 L22 40 L12 26 Z" fill={ribbonColor} />
      <path d="M42 6 L32 26 L42 40 L52 26 Z" fill={ribbonColor} />
      <circle cx="32" cy="38" r="18" fill="#FFF" stroke="#e2e8f0" strokeWidth="2" />
      <circle cx="32" cy="38" r="15" fill="#f8fafc" />
      <text
        x="32"
        y="44"
        textAnchor="middle"
        fontSize="17"
        fontWeight="bold"
        fill="#1e293b"
      >
        {number}
      </text>
    </svg>
  </div>
);

const NetworkNodesIcon = () => (
  <svg className="w-9 h-9 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" fill="#6366f1" stroke="#4f46e5" />
    <circle cx="6" cy="19" r="3" fill="#818cf8" stroke="#4f46e5" />
    <circle cx="18" cy="19" r="3" fill="#818cf8" stroke="#4f46e5" />
    <line x1="12" y1="8" x2="6" y2="16" stroke="#6366f1" strokeWidth="2" />
    <line x1="12" y1="8" x2="18" y2="16" stroke="#6366f1" strokeWidth="2" />
  </svg>
);

const CityBuildingsIcon = ({ color = "#0284c7" }) => (
  <svg className="w-9 h-9" style={{ color }} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 2H9c-1.1 0-2 .9-2 2v4H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM5 20v-8h2v8H5zm6 0h-2v-4h2v4zm0-6h-2v-4h2v4zm0-6h-2V4h2v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm2 12v-8h2v8h-2z" />
  </svg>
);

const StudentSkillRackPage = () => {
  const {
    myRecord,
    stats,
    loading,
    error,
    fetchMyRecord,
    fetchMyStats,
    updateLevelProgress,
  } = useSkillRack();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [savingProgress, setSavingProgress] = useState(false);
  const [formData, setFormData] = useState({});

  const { user } = useAuth();
  const userId = user?.userId || user?.id;

  useEffect(() => {
    if (userId) {
      fetchMyRecord(userId);
      fetchMyStats(userId);
    }
  }, [userId, fetchMyRecord, fetchMyStats]);

  const getResolvedLevelDetails = () => {
    const raw = stats?.levelDetails || myRecord?.level_details || {};
    return {
      level1: {
        c: raw.level1?.c ?? stats?.languageDistribution?.c ?? 0,
        cpp: raw.level1?.cpp ?? stats?.languageDistribution?.cpp ?? 0,
        java: raw.level1?.java ?? stats?.languageDistribution?.java ?? 0,
        python: raw.level1?.python ?? stats?.languageDistribution?.python ?? 0,
        mysql: raw.level1?.mysql ?? stats?.languageDistribution?.sql ?? 0,
        ds_c: raw.level1?.ds_c ?? 0,
        ds_java: raw.level1?.ds_java ?? 0,
        dc: raw.level1?.dc ?? stats?.testsAndTracks?.dailyChallenge ?? stats?.testsAndTracks?.dc ?? 0,
        dt: raw.level1?.dt ?? stats?.testsAndTracks?.dailyTest ?? stats?.testsAndTracks?.dt ?? 0,
      },
      level2: {
        kickstart: raw.level2?.kickstart ?? stats?.levelProgress?.level_2 ?? 0,
      },
      level3: {
        cts: raw.level3?.cts ?? 0,
        infytq: raw.level3?.infytq ?? 0,
        other_mncs: raw.level3?.other_mncs ?? stats?.companyProgress?.mnc ?? 0,
      },
      level4: {
        stack: raw.level4?.stack ?? 0,
        heap: raw.level4?.heap ?? 0,
        queue: raw.level4?.queue ?? 0,
        binary_tree: raw.level4?.binary_tree ?? 0,
        searching: raw.level4?.searching ?? 0,
        sorting: raw.level4?.sorting ?? 0,
      },
      level5: {
        product_companies: raw.level5?.product_companies ?? stats?.companyProgress?.product ?? stats?.levelProgress?.level_5 ?? 0,
      },
      level6: {
        mini_project: raw.level6?.mini_project ?? 0,
        strings: raw.level6?.strings ?? 0,
        greedy: raw.level6?.greedy ?? 0,
        comb_perm: raw.level6?.comb_perm ?? 0,
        backtracking: raw.level6?.backtracking ?? 0,
        dp: raw.level6?.dp ?? 0,
        graph: raw.level6?.graph ?? 0,
        regex: raw.level6?.regex ?? 0,
      },
    };
  };

  useEffect(() => {
    if (stats || myRecord) {
      setFormData(getResolvedLevelDetails());
    }
  }, [stats, myRecord]);

  const handleInputChange = (levelKey, itemKey, value) => {
    const val = value === "" ? "" : Math.max(0, parseInt(value, 10) || 0);
    setFormData((prev) => ({
      ...prev,
      [levelKey]: {
        ...(prev[levelKey] || {}),
        [itemKey]: val,
      },
    }));
  };

  const handleResetForm = () => {
    setFormData(getResolvedLevelDetails());
    toast.info("Reset to last saved values");
  };

  const handleSaveProgress = async (e) => {
    if (e) e.preventDefault();
    setSavingProgress(true);
    try {
      const sanitized = {};
      for (const [lvlKey, items] of Object.entries(formData)) {
        sanitized[lvlKey] = {};
        for (const [k, v] of Object.entries(items)) {
          sanitized[lvlKey][k] = v === "" ? 0 : Number(v) || 0;
        }
      }

      await updateLevelProgress(sanitized);
      toast.success("SkillRack Level Progress updated successfully!");
      setActiveTab("dashboard");
    } catch (err) {
      toast.error(err.message || "Failed to update level progress");
    } finally {
      setSavingProgress(false);
    }
  };

  const levelDetails = getResolvedLevelDetails();

  // Helper to compute level solved and targets
  const getLevelSummary = (lvlKey) => {
    const cfg = LEVEL_CONFIG.find((c) => c.key === lvlKey);
    if (!cfg) return { solved: 0, target: 0, percentage: 0 };
    const items = levelDetails[lvlKey] || {};
    let solved = 0;
    let target = 0;
    cfg.items.forEach((it) => {
      const val = Number(items[it.key]) || 0;
      solved += val;
      if (it.target) target += it.target;
    });
    const percentage = target > 0 ? Math.min(100, Math.round((solved / target) * 100)) : 100;
    return { solved, target, percentage };
  };

  const l1Summary = getLevelSummary("level1");
  const l2Summary = getLevelSummary("level2");
  const l3Summary = getLevelSummary("level3");
  const l4Summary = getLevelSummary("level4");
  const l5Summary = getLevelSummary("level5");
  const l6Summary = getLevelSummary("level6");

  // Specific counts
  const cCount = Number(levelDetails.level1?.c ?? stats?.languageDistribution?.c ?? 0);
  const cppCount = Number(levelDetails.level1?.cpp ?? stats?.languageDistribution?.cpp ?? 0);
  const javaCount = Number(levelDetails.level1?.java ?? stats?.languageDistribution?.java ?? 0);
  const pythonCount = Number(levelDetails.level1?.python ?? stats?.languageDistribution?.python ?? 0);
  const mysqlCount = Number(levelDetails.level1?.mysql ?? stats?.languageDistribution?.sql ?? 0);
  const sqlCount = Number(stats?.languageDistribution?.sql ?? levelDetails.level1?.mysql ?? 0);

  const dsCount = Number(stats?.dataStructurePrograms || (l4Summary.solved + (Number(levelDetails.level1?.ds_c) || 0) + (Number(levelDetails.level1?.ds_java) || 0)) || 0);
  const mncCount = Number(stats?.companyProgress?.mnc || l3Summary.solved || 0);
  const productCount = Number(stats?.companyProgress?.product || l5Summary.solved || 0);
  const dreamCount = Number(stats?.companyProgress?.dream || l6Summary.solved || 0);

  // Metrics values from API or record
  const totalProgramsSolved = stats?.totalPrograms || myRecord?.total_programs_solved || (cCount + cppCount + javaCount + pythonCount + mysqlCount) || 0;
  const skillRackRank = stats?.rank || myRecord?.skillrack_rank || "N/A";
  const goldMedalsCount = stats?.goldMedals ?? myRecord?.gold_medals ?? 12;
  const silverMedalsCount = stats?.silverMedals ?? myRecord?.silver_medals ?? 8;
  const bronzeMedalsCount = stats?.bronzeMedals ?? stats?.medals ?? myRecord?.bronze_medals ?? 4;
  const aptitudeScore = stats?.aptitudeScore ?? myRecord?.aptitude_score ?? myRecord?.aptitude_test ?? 2335;

  return (
    <div className="p-4 sm:p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
            {error}
          </div>
        )}

        {loading && !stats && (
          <div className="p-4 bg-indigo-50 text-indigo-700 rounded-lg text-center font-medium">
            Loading SkillRack Progress...
          </div>
        )}

        {!myRecord && !loading && !stats && (
          <div className="bg-white rounded-xl shadow p-8 text-center border border-gray-100">
            <FaExclamationTriangle className="text-amber-500 text-5xl mx-auto mb-3" />
            <p className="text-xl font-bold text-gray-700 mb-1">No SkillRack Data Available</p>
            <p className="text-gray-500 mb-4 text-sm">Your tutor has not uploaded your SkillRack record yet.</p>
            <button
              onClick={() => setActiveTab("update-progress")}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition text-sm"
            >
              <FaEdit /> Enter Level Progress Manually
            </button>
          </div>
        )}

        {(myRecord || stats) && (
          <>
            {/* Top Navigation Bar: Dashboard & Update Progress Tabs */}
            <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition ${
                    activeTab === "dashboard"
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <FaTachometerAlt />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("update-progress")}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition ${
                    activeTab === "update-progress"
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <FaEdit />
                  Update Progress
                </button>
              </div>

              {activeTab === "dashboard" && (
                <button
                  onClick={() => setActiveTab("update-progress")}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-lg border border-indigo-200 transition"
                >
                  <FaEdit /> Edit Level Progress
                </button>
              )}
            </div>

            {/* ========================================================= */}
            {/* DASHBOARD TAB (Matches Exact Reference Image)            */}
            {/* ========================================================= */}
            {activeTab === "dashboard" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* 1. TOP METRICS CARDS (6 Cards Row - Clean Unified Design) */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                  {/* Card 1: Total Programs Solved */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col items-center justify-between text-center h-[100px]">
                    <div className="h-7 flex items-center justify-center text-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight text-center">
                        Total Programs Solved
                      </span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 tracking-tight leading-none text-center">{totalProgramsSolved}</p>
                  </div>

                  {/* Card 2: SkillRack Rank */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col items-center justify-between text-center h-[100px]">
                    <div className="h-7 flex items-center justify-center text-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight text-center">
                        SkillRack Rank
                      </span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 tracking-tight leading-none text-center">{skillRackRank}</p>
                  </div>

                  {/* Card 3: Gold Medals */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col items-center justify-between text-center h-[100px]">
                    <div className="h-7 flex items-center justify-center text-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight text-center">
                        Gold Medals
                      </span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 tracking-tight leading-none text-center">{goldMedalsCount}</p>
                  </div>

                  {/* Card 4: Silver Medals */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col items-center justify-between text-center h-[100px]">
                    <div className="h-7 flex items-center justify-center text-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight text-center">
                        Silver Medals
                      </span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 tracking-tight leading-none text-center">{silverMedalsCount}</p>
                  </div>

                  {/* Card 5: Bronze Medals */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col items-center justify-between text-center h-[100px]">
                    <div className="h-7 flex items-center justify-center text-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight text-center">
                        Bronze Medals
                      </span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 tracking-tight leading-none text-center">{bronzeMedalsCount}</p>
                  </div>

                  {/* Card 6: Aptitude Test Score */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col items-center justify-between text-center h-[100px]">
                    <div className="h-7 flex items-center justify-center text-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight text-center">
                        Aptitude Score
                      </span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 tracking-tight leading-none text-center">{aptitudeScore}</p>
                  </div>
                </div>

                {/* 2. LEVEL-WISE PROGRESS SECTION */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                  <div className="pb-3 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">
                      Level-wise Progress
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    {LEVEL_CONFIG.map((lvl) => {
                      const summary = getLevelSummary(lvl.key);
                      return (
                        <div
                          key={lvl.level}
                          className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between items-center text-center h-[150px] shadow-sm hover:border-slate-300 transition"
                        >
                          <div className="w-full flex flex-col items-center">
                            <h4 className="text-sm font-bold text-slate-900 leading-tight">{lvl.title}</h4>
                            <div className="h-8 flex items-center justify-center mt-1">
                              <p className="text-[11px] font-medium text-slate-500 leading-snug line-clamp-2 text-center">
                                {lvl.subtitle}
                              </p>
                            </div>
                          </div>

                          <div className="w-full pt-2 border-t border-slate-200/70 flex flex-col justify-end">
                            <div className="flex items-baseline justify-center font-black text-slate-900">
                              <span className="text-xl font-black text-slate-900 leading-none">{summary.solved}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. PROGRAMMING LANGUAGES SECTION */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                  <div className="pb-3 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">
                      Programming Languages
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                    {/* C */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-between text-center h-[142px] shadow-sm hover:border-slate-300 transition">
                      <div className="h-10 flex items-center justify-center">
                        <CLogo />
                      </div>
                      <span className="text-sm font-bold text-slate-800 leading-tight">C</span>
                      <div className="flex items-baseline justify-center">
                        <span className="text-xl font-black text-slate-900 leading-none">{cCount}</span>
                      </div>
                    </div>

                    {/* C++ */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-between text-center h-[142px] shadow-sm hover:border-slate-300 transition">
                      <div className="h-10 flex items-center justify-center">
                        <CppLogo />
                      </div>
                      <span className="text-sm font-bold text-slate-800 leading-tight">C++</span>
                      <div className="flex items-baseline justify-center">
                        <span className="text-xl font-black text-slate-900 leading-none">{cppCount}</span>
                      </div>
                    </div>

                    {/* Java */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-between text-center h-[142px] shadow-sm hover:border-slate-300 transition">
                      <div className="h-10 flex items-center justify-center">
                        <JavaLogo />
                      </div>
                      <span className="text-sm font-bold text-slate-800 leading-tight">Java</span>
                      <div className="flex items-baseline justify-center">
                        <span className="text-xl font-black text-slate-900 leading-none">{javaCount}</span>
                      </div>
                    </div>

                    {/* Python */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-between text-center h-[142px] shadow-sm hover:border-slate-300 transition">
                      <div className="h-10 flex items-center justify-center">
                        <PythonLogo />
                      </div>
                      <span className="text-sm font-bold text-slate-800 leading-tight">Python</span>
                      <div className="flex items-baseline justify-center">
                        <span className="text-xl font-black text-slate-900 leading-none">{pythonCount}</span>
                      </div>
                    </div>

                    {/* MySQL */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-between text-center h-[142px] shadow-sm hover:border-slate-300 transition">
                      <div className="h-10 flex items-center justify-center">
                        <MySQLDolphinLogo />
                      </div>
                      <span className="text-sm font-bold text-slate-800 leading-tight">MySQL</span>
                      <div className="flex items-baseline justify-center">
                        <span className="text-xl font-black text-slate-900 leading-none">{mysqlCount}</span>
                      </div>
                    </div>

                    {/* SQL */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-between text-center h-[142px] shadow-sm hover:border-slate-300 transition">
                      <div className="h-10 flex items-center justify-center text-slate-700">
                        <FaDatabase className="w-7 h-7" />
                      </div>
                      <span className="text-sm font-bold text-slate-800 leading-tight">SQL</span>
                      <div className="flex items-baseline justify-center">
                        <span className="text-xl font-black text-slate-900 leading-none">{sqlCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. COMPANY WISE PROGRAMS SECTION */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                  <div className="pb-3 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">
                      Company wise Programs
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Card 1: Data Structures */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between min-h-[96px] shadow-sm hover:border-slate-300 transition">
                      <div className="flex flex-col justify-center">
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">Data Structures</h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">(Stack/Queue/Tree/Heap)</p>
                      </div>
                      <div className="text-right flex flex-col items-end justify-center min-w-[70px]">
                        <p className="text-3xl font-black text-slate-900 leading-none">{dsCount}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 leading-none">Programs</p>
                      </div>
                    </div>

                    {/* Card 2: MNC Companies */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between min-h-[96px] shadow-sm hover:border-slate-300 transition">
                      <div className="flex flex-col justify-center">
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">MNC Companies</h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">(TCS/CTS/WIPRO/INFOSYS)</p>
                      </div>
                      <div className="text-right flex flex-col items-end justify-center min-w-[70px]">
                        <p className="text-3xl font-black text-slate-900 leading-none">{mncCount}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 leading-none">Programs</p>
                      </div>
                    </div>

                    {/* Card 3: Product Companies */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between min-h-[96px] shadow-sm hover:border-slate-300 transition">
                      <div className="flex flex-col justify-center">
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">Product Companies</h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">(Higher Salary)</p>
                      </div>
                      <div className="text-right flex flex-col items-end justify-center min-w-[70px]">
                        <p className="text-3xl font-black text-slate-900 leading-none">{productCount}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 leading-none">Programs</p>
                      </div>
                    </div>

                    {/* Card 4: Dream Product Companies */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between min-h-[96px] shadow-sm hover:border-slate-300 transition">
                      <div className="flex flex-col justify-center">
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">Dream Product Companies</h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">(Very High Salary)</p>
                      </div>
                      <div className="text-right flex flex-col items-end justify-center min-w-[70px]">
                        <p className="text-3xl font-black text-slate-900 leading-none">{dreamCount}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 leading-none">Programs</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* UPDATE PROGRESS TAB (Clean Unified Design)                */}
            {/* ========================================================= */}
            {activeTab === "update-progress" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Level 1: Language wise challenges (Tracks) */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-3">
                    <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs">
                      Level 1
                    </span>
                    <span className="text-sm font-bold text-slate-900">Language wise challenges (Tracks)</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {/* C */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          <CLogo />
                        </div>
                        <span className="text-xs font-bold text-slate-800">C</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level1?.c ?? ""}
                        onChange={(e) => handleInputChange("level1", "c", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* C++ */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          <CppLogo />
                        </div>
                        <span className="text-xs font-bold text-slate-800">C++</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level1?.cpp ?? ""}
                        onChange={(e) => handleInputChange("level1", "cpp", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Java */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          <JavaLogo />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Java</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level1?.java ?? ""}
                        onChange={(e) => handleInputChange("level1", "java", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Python */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          <PythonLogo />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Python</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level1?.python ?? ""}
                        onChange={(e) => handleInputChange("level1", "python", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* MySQL */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          <MySQLDolphinLogo />
                        </div>
                        <span className="text-xs font-bold text-slate-800">MySQL</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level1?.mysql ?? ""}
                        onChange={(e) => handleInputChange("level1", "mysql", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* DS in C */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaDatabase className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">DS in C</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level1?.ds_c ?? ""}
                        onChange={(e) => handleInputChange("level1", "ds_c", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* DS in Java */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaCoffee className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">DS in Java</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level1?.ds_java ?? ""}
                        onChange={(e) => handleInputChange("level1", "ds_java", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Level 2: Kickstart */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-3">
                    <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs">
                      Level 2
                    </span>
                    <span className="text-sm font-bold text-slate-900">Kickstart</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaRocket className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">Kickstart</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level2?.kickstart ?? ""}
                        onChange={(e) => handleInputChange("level2", "kickstart", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Level 3: MNCs (TCS / CTS / WIPRO / INFOSYS) */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-3">
                    <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs">
                      Level 3
                    </span>
                    <span className="text-sm font-bold text-slate-900">MNCs (TCS / CTS / WIPRO / INFOSYS)</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* CTS */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full border border-slate-700 text-slate-700 text-[8px] font-black flex items-center justify-center flex-shrink-0">
                          TCS
                        </span>
                        <span className="text-xs font-bold text-slate-800">CTS</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level3?.cts ?? ""}
                        onChange={(e) => handleInputChange("level3", "cts", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* InfyTQ */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-slate-800 font-black text-xs italic tracking-tighter flex-shrink-0">
                          infosys
                        </span>
                        <span className="text-xs font-bold text-slate-800">InfyTQ</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level3?.infytq ?? ""}
                        onChange={(e) => handleInputChange("level3", "infytq", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Other MNCs */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaBuilding className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">Other MNCs</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level3?.other_mncs ?? ""}
                        onChange={(e) => handleInputChange("level3", "other_mncs", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Level 4: Data Structures */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-3">
                    <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs">
                      Level 4
                    </span>
                    <span className="text-sm font-bold text-slate-900">Data Structures</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {/* Stack */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaLayerGroup className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">Stack</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level4?.stack ?? ""}
                        onChange={(e) => handleInputChange("level4", "stack", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Heap */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaProjectDiagram className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">Heap</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level4?.heap ?? ""}
                        onChange={(e) => handleInputChange("level4", "heap", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Queue */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5 flex-shrink-0">
                          <span className="w-1 h-3.5 bg-slate-600 rounded-xs"></span>
                          <span className="w-1 h-3.5 bg-slate-600 rounded-xs"></span>
                          <span className="w-1 h-3.5 bg-slate-600 rounded-xs"></span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">Queue</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level4?.queue ?? ""}
                        onChange={(e) => handleInputChange("level4", "queue", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Binary Tree */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaShareAlt className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">Binary Tree</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level4?.binary_tree ?? ""}
                        onChange={(e) => handleInputChange("level4", "binary_tree", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Searching Algorithms */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaSearch className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">Searching</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level4?.searching ?? ""}
                        onChange={(e) => handleInputChange("level4", "searching", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Sorting Algorithms */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaSort className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">Sorting</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level4?.sorting ?? ""}
                        onChange={(e) => handleInputChange("level4", "sorting", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Level 5: Product Companies */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-3">
                    <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs">
                      Level 5
                    </span>
                    <span className="text-sm font-bold text-slate-900">Product Companies</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaBriefcase className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">Product Companies</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level5?.product_companies ?? ""}
                        onChange={(e) => handleInputChange("level5", "product_companies", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Level 6: Dream Product Companies & Mini Project */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-3">
                    <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs">
                      Level 6
                    </span>
                    <span className="text-sm font-bold text-slate-900">Dream Product Companies & Mini Project</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Mini Project */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaWindowMaximize className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">Mini Project</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level6?.mini_project ?? ""}
                        onChange={(e) => handleInputChange("level6", "mini_project", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Strings */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-4 h-4 rounded bg-slate-700 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                          A
                        </span>
                        <span className="text-xs font-bold text-slate-800">Strings</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level6?.strings ?? ""}
                        onChange={(e) => handleInputChange("level6", "strings", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Greedy */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaBullseye className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">Greedy</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level6?.greedy ?? ""}
                        onChange={(e) => handleInputChange("level6", "greedy", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Combination & Permutation */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaRandom className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">Combination & Permutation</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level6?.comb_perm ?? ""}
                        onChange={(e) => handleInputChange("level6", "comb_perm", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Backtracking */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaCodeBranch className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">Backtracking</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level6?.backtracking ?? ""}
                        onChange={(e) => handleInputChange("level6", "backtracking", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Dynamic Programming */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaChartBar className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">Dynamic Programming</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level6?.dp ?? ""}
                        onChange={(e) => handleInputChange("level6", "dp", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Graph */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <FaShareAlt className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">Graph</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level6?.graph ?? ""}
                        onChange={(e) => handleInputChange("level6", "graph", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* Regular Expression */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-serif italic font-black text-slate-700 text-sm flex-shrink-0">
                          fx
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">Regular Expression</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level6?.regex ?? ""}
                        onChange={(e) => handleInputChange("level6", "regex", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* DC / DT (Daily Challenge & Daily Test) */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2.5">
                    <span className="text-sm font-bold text-slate-900">Daily Challenge & Daily Test (DC / DT)</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* DC (Daily Challenge) */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-800">DC (Daily Challenge)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level1?.dc ?? ""}
                        onChange={(e) => handleInputChange("level1", "dc", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    {/* DT (Daily Test) */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-800">DT (Daily Test)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.level1?.dt ?? ""}
                        onChange={(e) => handleInputChange("level1", "dt", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <FaUndo className="text-[11px]" /> Reset Values
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProgress}
                    disabled={savingProgress}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FaSave /> {savingProgress ? "Saving..." : "Save Progress"}
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentSkillRackPage;

import React, { useState, useEffect } from "react";
import { FaCode, FaChartLine, FaChartBar, FaPlus, FaEdit, FaTrash, FaGraduationCap, FaBriefcase } from "react-icons/fa";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from "recharts";
import { useCompetencyCoding } from "../../contexts/CompetencyCodingContext";
import { useAuth } from "../auth/AuthContext";
import { getCareerObjectiveLabel } from "../../utils/careerObjective";

const careerPrompts = {
  "Placement - Core": "Enter your dream core company and preferred role...",
  "Placement - Software": "Enter your dream software company and preferred role...",
  "Higher Studies": "Where would you like to study? Enter the course, college/university, and country...",
  Placement: "Enter your dream company and preferred role in placement...",
  Core: "Enter your dream company and preferred role in the core field...",
  Software: "Enter your dream software company and preferred role...",
};


const CompetencyCoding = () => {
  const {
    competencyRecord,
    platforms,
    loading,
    error,
    addOrUpdateCompetency,
    fetchCompetencyRecord,
    fetchPlatforms,
    addPlatform,
    updatePlatform,
    deletePlatform,
    clearError
  } = useCompetencyCoding();

  const [activeTab, setActiveTab] = useState('overview');
  const [localLoading, setLocalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { user } = useAuth();
  const userId = user?.userId || user?.id;


  // Overview Form State
  const [overviewForm, setOverviewForm] = useState({
    present_competency: "",
    competency_level: "Beginner",
    career_objectives: "",
    career_objective_details: {},
    specialization_chosen: "",
    expected_ctc: "",
    communication_skills: "",
    gaps: [],
    gaps_description: "",
    steps: [],
  });

  // Platform Form State
  const [platformForm, setPlatformForm] = useState({
    platform_name: "",
    level: "",
    no_of_problems_solved: 0,
    rank: "",
    easy_count: 0,
    medium_count: 0,
    hard_count: 0,
    description: "",
  });

  const [editingPlatformId, setEditingPlatformId] = useState(null);
  const [gapInput, setGapInput] = useState("");
  const [stepInput, setStepInput] = useState("");
  const [competencyInput, setCompetencyInput] = useState("");
  const [competencyPercent, setCompetencyPercent] = useState("");

  useEffect(() => {
    if (userId) {
      fetchCompetencyRecord(userId);
      fetchPlatforms(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (competencyRecord) {
      let gaps = competencyRecord.gaps || [];
      if (typeof gaps === "string") {
        try { gaps = JSON.parse(gaps); } catch (e) { gaps = []; }
      }
      let steps = competencyRecord.steps || [];
      if (typeof steps === "string") {
        try { steps = JSON.parse(steps); } catch (e) { steps = []; }
      }
      // Parse present_competency into an array of { name, percent } objects
      // Supports both "React:80, Python:60" (new) and "React, Python" (legacy)
      let presentCompetencies = competencyRecord.present_competency || "";
      if (typeof presentCompetencies === "string" && presentCompetencies.trim()) {
        presentCompetencies = presentCompetencies.split(",").map(s => {
          const trimmed = s.trim();
          const colonIdx = trimmed.lastIndexOf(":");
          if (colonIdx !== -1) {
            const name = trimmed.substring(0, colonIdx).trim();
            const pct = parseInt(trimmed.substring(colonIdx + 1).trim(), 10);
            return { name, percent: isNaN(pct) ? "" : pct };
          }
          return { name: trimmed, percent: "" };
        }).filter(c => c.name);
      } else if (!Array.isArray(presentCompetencies)) {
        presentCompetencies = [];
      }
      let careerObjDetails = competencyRecord.career_objective_details || {};
      if (typeof careerObjDetails === "string") {
        try { careerObjDetails = JSON.parse(careerObjDetails); } catch (e) { careerObjDetails = {}; }
      }
      if (careerObjDetails) {
        ['Higher Studies', 'Entrepreneur', 'Enterpreneur'].forEach(k => {
          if (typeof careerObjDetails[k] === 'string') {
            try {
              const parsed = JSON.parse(careerObjDetails[k]);
              if (typeof parsed === 'object' && parsed !== null) {
                careerObjDetails[k] = parsed;
              }
            } catch (e) {}
          }
        });
      }

      setOverviewForm({
        present_competency: presentCompetencies,
        competency_level: competencyRecord.competency_level || "Beginner",
        career_objectives: competencyRecord.career_objectives || "",
        career_objective_details: careerObjDetails,
        specialization_chosen: competencyRecord.specialization_chosen || "",
        expected_ctc: competencyRecord.expected_ctc || "",
        communication_skills: competencyRecord.communication_skills || "",
        gaps: Array.isArray(gaps) ? gaps : [],
        gaps_description: competencyRecord.gaps_description || "",
        steps: Array.isArray(steps) ? steps : [],
      });
    }
  }, [competencyRecord]);

  // Overview Handlers
  const handleAddCompetency = () => {
    const name = competencyInput.trim();
    if (!name) return;
    const pct = competencyPercent !== "" ? Math.min(100, Math.max(1, parseInt(competencyPercent, 10) || 1)) : "";
    setOverviewForm(prev => ({
      ...prev,
      present_competency: [
        ...(Array.isArray(prev.present_competency) ? prev.present_competency : []),
        { name, percent: pct }
      ]
    }));
    setCompetencyInput("");
    setCompetencyPercent("");
  };

  const handleRemoveCompetency = (index) => {
    setOverviewForm(prev => ({
      ...prev,
      present_competency: prev.present_competency.filter((_, i) => i !== index)
    }));
  };

  const handleAddGap = () => {
    if (gapInput.trim()) {
      setOverviewForm(prev => ({
        ...prev,
        gaps: [...prev.gaps, gapInput.trim()]
      }));
      setGapInput("");
    }
  };

  const handleRemoveGap = (index) => {
    setOverviewForm(prev => ({
      ...prev,
      gaps: prev.gaps.filter((_, i) => i !== index)
    }));
  };

  const handleAddStep = () => {
    if (stepInput.trim()) {
      setOverviewForm(prev => ({
        ...prev,
        steps: [...prev.steps, stepInput.trim()]
      }));
      setStepInput("");
    }
  };

  const handleRemoveStep = (index) => {
    setOverviewForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const getHigherStudiesData = () => {
    const hs = overviewForm.career_objective_details?.['Higher Studies'];
    if (typeof hs === 'object' && hs !== null) {
      return {
        exam: hs.exam || "",
        degree: hs.degree || "",
        university: hs.university || "",
        preparation_platform: hs.preparation_platform || (hs.online_platform ? "Online" : ""),
        platform_name: hs.platform_name || hs.online_platform || "",
        online_platform: hs.online_platform || hs.platform_name || "",
        attended_test: hs.attended_test !== undefined ? hs.attended_test : Boolean(hs.test_count || hs.score || hs.test_name),
        test_count: hs.test_count !== undefined ? hs.test_count : "",
        score: hs.score || "",
        test_name: hs.test_name || "",
      };
    }
    if (typeof hs === 'string' && hs.trim()) {
      try {
        const parsed = JSON.parse(hs);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            exam: parsed.exam || "",
            degree: parsed.degree || "",
            university: parsed.university || "",
            preparation_platform: parsed.preparation_platform || (parsed.online_platform ? "Online" : ""),
            platform_name: parsed.platform_name || parsed.online_platform || "",
            online_platform: parsed.online_platform || parsed.platform_name || "",
            attended_test: parsed.attended_test !== undefined ? parsed.attended_test : Boolean(parsed.test_count || parsed.score || parsed.test_name),
            test_count: parsed.test_count !== undefined ? parsed.test_count : "",
            score: parsed.score || "",
            test_name: parsed.test_name || "",
          };
        }
      } catch (e) {}
      return {
        exam: "",
        degree: "",
        university: hs,
        preparation_platform: "",
        platform_name: "",
        online_platform: "",
        attended_test: false,
        test_count: "",
        score: "",
        test_name: "",
      };
    }
    return {
      exam: "",
      degree: "",
      university: "",
      preparation_platform: "",
      platform_name: "",
      online_platform: "",
      attended_test: false,
      test_count: "",
      score: "",
      test_name: "",
    };
  };

  const updateHigherStudiesField = (fieldOrObj, value) => {
    setOverviewForm(prev => {
      const details = (typeof prev.career_objective_details === 'object' && prev.career_objective_details !== null)
        ? prev.career_objective_details
        : {};
      const hsRaw = details['Higher Studies'] || {};
      let currentHs = typeof hsRaw === 'string' ? (() => { try { return JSON.parse(hsRaw); } catch { return {}; } })() : hsRaw;
      if (typeof currentHs !== 'object' || currentHs === null) currentHs = {};

      const updates = (typeof fieldOrObj === 'object' && fieldOrObj !== null)
        ? fieldOrObj
        : { [fieldOrObj]: value };

      return {
        ...prev,
        career_objective_details: {
          ...details,
          'Higher Studies': {
            ...currentHs,
            ...updates
          }
        }
      };
    });
  };

  const getEntrepreneurData = () => {
    const objKey = (overviewForm.career_objectives === 'Enterpreneur' || overviewForm.career_objectives === 'Entrepreneur')
      ? overviewForm.career_objectives
      : 'Entrepreneur';
    const ent = overviewForm.career_objective_details?.[objKey] ||
      overviewForm.career_objective_details?.['Entrepreneur'] ||
      overviewForm.career_objective_details?.['Enterpreneur'];

    if (typeof ent === 'object' && ent !== null) {
      return {
        business_type: ent.business_type || "",
        field: ent.field || "",
        generation: ent.generation || "",
        expand: ent.expand !== undefined ? ent.expand : "",
        upgrade: ent.upgrade || "",
        business_details: ent.business_details || "",
        branches_to_open: ent.branches_to_open !== undefined ? ent.branches_to_open : (ent.expand !== undefined ? ent.expand : ""),
        funding: ent.funding !== undefined ? ent.funding : (ent.upgrade || "")
      };
    }
    if (typeof ent === 'string' && ent.trim()) {
      try {
        const parsed = JSON.parse(ent);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            business_type: parsed.business_type || "",
            field: parsed.field || "",
            generation: parsed.generation || "",
            expand: parsed.expand !== undefined ? parsed.expand : "",
            upgrade: parsed.upgrade || "",
            business_details: parsed.business_details || "",
            branches_to_open: parsed.branches_to_open !== undefined ? parsed.branches_to_open : (parsed.expand !== undefined ? parsed.expand : ""),
            funding: parsed.funding !== undefined ? parsed.funding : (parsed.upgrade || "")
          };
        }
      } catch (e) {}
      return {
        business_type: "",
        field: "",
        generation: "",
        expand: "",
        upgrade: "",
        business_details: ent,
        branches_to_open: "",
        funding: ""
      };
    }
    return {
      business_type: "",
      field: "",
      generation: "",
      expand: "",
      upgrade: "",
      business_details: "",
      branches_to_open: "",
      funding: ""
    };
  };

  const updateEntrepreneurField = (fieldOrObj, value) => {
    setOverviewForm(prev => {
      const objKey = (prev.career_objectives === 'Enterpreneur' || prev.career_objectives === 'Entrepreneur')
        ? prev.career_objectives
        : (overviewForm.career_objectives || 'Entrepreneur');

      const details = (typeof prev.career_objective_details === 'object' && prev.career_objective_details !== null)
        ? prev.career_objective_details
        : {};

      const entRaw = details[objKey] || details['Entrepreneur'] || details['Enterpreneur'] || {};
      let currentEnt = typeof entRaw === 'string' ? (() => { try { return JSON.parse(entRaw); } catch { return {}; } })() : entRaw;
      if (typeof currentEnt !== 'object' || currentEnt === null) currentEnt = {};

      const updates = (typeof fieldOrObj === 'object' && fieldOrObj !== null)
        ? fieldOrObj
        : { [fieldOrObj]: value };

      return {
        ...prev,
        career_objective_details: {
          ...details,
          [objKey]: {
            ...currentEnt,
            ...updates
          }
        }
      };
    });
  };

  const handleOverviewSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalLoading(true);
    setSuccessMessage("");

    try {
      const sanitizedDetails = {};
      if (typeof overviewForm.career_objective_details === 'object' && overviewForm.career_objective_details !== null) {
        Object.entries(overviewForm.career_objective_details).forEach(([k, v]) => {
          if (k) sanitizedDetails[k] = v;
        });
      }

      const isHigherStudiesOrEntrepreneur = [
        'Higher Studies',
        'Entrepreneur',
        'Enterpreneur'
      ].includes(overviewForm.career_objectives);

      await addOrUpdateCompetency({
        Userid: parseInt(userId),
        ...overviewForm,
        specialization_chosen: isHigherStudiesOrEntrepreneur ? "" : (overviewForm.specialization_chosen || ""),
        expected_ctc: isHigherStudiesOrEntrepreneur ? "" : (overviewForm.expected_ctc || ""),
        career_objective_details: sanitizedDetails,
        present_competency: Array.isArray(overviewForm.present_competency)
          ? overviewForm.present_competency
              .map(c => (typeof c === "object" ? `${c.name}${c.percent !== "" ? `:${c.percent}` : ""}` : c))
              .join(", ")
          : overviewForm.present_competency,
        gaps: JSON.stringify(overviewForm.gaps),
        steps: JSON.stringify(overviewForm.steps),
      });
      await fetchCompetencyRecord(userId);
      setSuccessMessage("Competency overview saved successfully!");
    } catch (err) {
      console.error("Error saving overview:", err);
    } finally {
      setLocalLoading(false);
    }
  };

  // Platform Handlers
  const handlePlatformSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalLoading(true);

    try {
      if (editingPlatformId) {
        await updatePlatform(editingPlatformId, {
          Userid: parseInt(userId),
          ...platformForm,
        });
      } else {
        await addPlatform({
          Userid: parseInt(userId),
          ...platformForm,
        });
      }
      await fetchPlatforms(userId);
      setPlatformForm({
        platform_name: "",
        level: "",
        no_of_problems_solved: 0,
        rank: "",
        easy_count: 0,
        medium_count: 0,
        hard_count: 0,
        description: "",
      });
      setEditingPlatformId(null);
    } catch (err) {
      console.error("Error saving platform:", err);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEditPlatform = (platform) => {
    setPlatformForm({
      platform_name: platform.platform_name,
      level: platform.level,
      no_of_problems_solved: platform.no_of_problems_solved || 0,
      rank: platform.rank || "",
      easy_count: platform.easy_count || 0,
      medium_count: platform.medium_count || 0,
      hard_count: platform.hard_count || 0,
      description: platform.description || "",
    });
    setEditingPlatformId(platform.id);
  };

  const handleDeletePlatform = async (platformId) => {
    if (window.confirm("Are you sure you want to delete this platform profile?")) {
      try {
        await deletePlatform(platformId, parseInt(userId));
        await fetchPlatforms(userId);
      } catch (err) {
        console.error("Error deleting platform:", err);
      }
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case "Expert": return "bg-indigo-100 text-blue-800";
      case "Advanced": return "bg-indigo-100 text-blue-800";
      case "Intermediate": return "bg-green-100 text-green-800";
      case "Beginner": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 bg-gradient-to-r from-indigo-50 to-indigo-50 rounded-lg shadow-md w-full min-h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center bg-gradient-to-r from-indigo-600 to-indigo-600 bg-clip-text text-transparent">
        Coding Competency
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg border-2 border-green-300">
          {successMessage}
        </div>
      )}

      {(loading || localLoading) && (
        <div className="mb-4 p-4 bg-indigo-100 text-indigo-700 rounded-lg text-center">
          Loading...
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: FaCode },
          { id: 'platforms', label: 'Coding Platforms', icon: FaChartLine },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            <tab.icon />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Competency Overview</h3>
          <form onSubmit={handleOverviewSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-gray-700 font-medium mb-1">Present Competency</label>
                <div className="flex items-end gap-2 mb-2">
                  {/* Skill Name — takes 3/4 of the row */}
                  <div className="flex-1" style={{ flex: 3 }}>
                    <label className="block text-gray-500 text-xs font-medium mb-1">Skill Name</label>
                    <input
                      type="text"
                      value={competencyInput}
                      onChange={(e) => setCompetencyInput(e.target.value)}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. React, Python, DSA..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCompetency())}
                    />
                  </div>
                  {/* Percentage — takes 1/3 of skill-name width (i.e. 1/4 of total row) */}
                  <div style={{ flex: 1 }}>
                    <label className="block text-gray-500 text-xs font-medium mb-1">Percentage (%)</label>
                    <input
                      type="number"
                      value={competencyPercent}
                      onChange={(e) => setCompetencyPercent(e.target.value)}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                      placeholder="1–100"
                      min="1"
                      max="100"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCompetency())}
                    />
                  </div>
                  {/* Add button — aligned to bottom of inputs */}
                  <button
                    type="button"
                    onClick={handleAddCompetency}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 self-end"
                  >
                    <FaPlus />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(overviewForm.present_competency) ? overviewForm.present_competency : []).map((skill, index) => {
                    const skillName = typeof skill === "object" ? skill.name : skill;
                    const skillPct = typeof skill === "object" ? skill.percent : "";
                    return (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 pl-3 pr-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
                      >
                        <span>{skillName}</span>
                        {skillPct !== "" && skillPct !== undefined && (
                          <span className="inline-flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[36px]">
                            {skillPct}%
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveCompetency(index)}
                          className="text-indigo-500 hover:text-indigo-900 leading-none"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* ── Competency Bar Chart ── */}
              <div className="col-span-2 mt-2">
                <label className="block text-gray-700 font-medium mb-3">
                  <FaChartBar className="inline mr-2 text-indigo-500" />
                  Competency Proficiency Chart
                </label>
                {(Array.isArray(overviewForm.present_competency) && overviewForm.present_competency.length > 0) ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-4 shadow-sm"
                  >
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={overviewForm.present_competency.map((s, i) => ({
                          name: typeof s === "object" ? s.name : s,
                          value: typeof s === "object" && s.percent !== "" ? Number(s.percent) : 0,
                          colorIdx: i,
                        }))}
                        margin={{ top: 28, right: 20, left: -10, bottom: 8 }}
                        barCategoryGap="35%"
                      >
                        <CartesianGrid vertical={false} stroke="#e0e7ff" strokeDasharray="4 4" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#4b5563", fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(99,102,241,0.08)" }}
                          formatter={(value) => [`${value}%`, "Proficiency"]}
                          contentStyle={{
                            borderRadius: "10px",
                            border: "1px solid #e0e7ff",
                            fontSize: "13px",
                          }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60} fill="#3b82f6">
                          <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(v) => v > 0 ? `${v}%` : ""}
                            style={{ fontSize: 12, fontWeight: 700, fill: "#374151" }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-44 bg-gradient-to-br from-indigo-50 to-white border border-dashed border-indigo-200 rounded-xl text-gray-400">
                    <FaChartBar className="text-4xl mb-2 text-indigo-200" />
                    <p className="text-sm font-medium">Add competencies above to see your proficiency chart</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Competency Level</label>
                <select
                  value={overviewForm.competency_level}
                  onChange={(e) => setOverviewForm({ ...overviewForm, competency_level: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Career Objectives</label>
                <select
                  value={overviewForm.career_objectives}
                  onChange={(e) => setOverviewForm({ ...overviewForm, career_objectives: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Career Objective</option>
                  <option value="Placement - Core">Placement - Core</option>
                  <option value="Placement - Software">Placement - Software</option>
                  <option value="Higher Studies">Higher Studies</option>
                  <option value="Entrepreneur">Entrepreneur</option>
                  {overviewForm.career_objectives && ![
                    'Placement - Core',
                    'Placement - Software',
                    'Higher Studies',
                    'Entrepreneur',
                    'Enterpreneur'
                  ].includes(overviewForm.career_objectives) && (
                    <option value={overviewForm.career_objectives}>
                      {overviewForm.career_objectives}
                    </option>
                  )}
                </select>
              </div>

              {/* Higher Studies Fields */}
              {overviewForm.career_objectives === 'Higher Studies' && (
                <div className="col-span-2 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/40 p-5 rounded-2xl border-2 border-indigo-200/90 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                    <FaGraduationCap className="text-indigo-600 text-xl" />
                    <h4 className="text-indigo-950 font-bold text-base">Higher Studies Details</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">
                        Exam <span className="text-xs text-gray-500 font-normal">(Which type of exam)</span>
                      </label>
                      <input
                        type="text"
                        list="exam-options"
                        value={getHigherStudiesData().exam}
                        onChange={(e) => updateHigherStudiesField('exam', e.target.value)}
                        placeholder="e.g., GATE, GRE, GMAT, IELTS, CAT..."
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <datalist id="exam-options">
                        <option value="GATE" />
                        <option value="GRE" />
                        <option value="GMAT" />
                        <option value="CAT" />
                        <option value="IELTS" />
                        <option value="TOEFL" />
                        <option value="UPSC" />
                        <option value="TANCET" />
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1">
                        Degree <span className="text-xs text-gray-500 font-normal">(Degree you are going to pursue)</span>
                      </label>
                      <input
                        type="text"
                        value={getHigherStudiesData().degree}
                        onChange={(e) => updateHigherStudiesField('degree', e.target.value)}
                        placeholder="e.g., M.Tech, M.S., MBA, Ph.D..."
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1">
                        University <span className="text-xs text-gray-500 font-normal">(University details)</span>
                      </label>
                      <input
                        type="text"
                        value={getHigherStudiesData().university}
                        onChange={(e) => updateHigherStudiesField('university', e.target.value)}
                        placeholder="e.g., Stanford University, IIT Madras..."
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1">
                        Preparation Platform
                      </label>
                      <select
                        value={getHigherStudiesData().preparation_platform}
                        onChange={(e) => updateHigherStudiesField('preparation_platform', e.target.value)}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">Select Platform Type</option>
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-gray-700 font-medium mb-1">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        value={getHigherStudiesData().platform_name}
                        onChange={(e) => {
                          updateHigherStudiesField({
                            platform_name: e.target.value,
                            online_platform: e.target.value
                          });
                        }}
                        placeholder={
                          getHigherStudiesData().preparation_platform === 'Offline'
                            ? "e.g., Coaching Institute / Academy Name..."
                            : "e.g., Coursera, NPTEL, edX, Unacademy..."
                        }
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-indigo-100">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!getHigherStudiesData().attended_test}
                        onChange={(e) => updateHigherStudiesField('attended_test', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-gray-800 font-medium text-sm">
                        Did you take any test / mock test?
                      </span>
                    </label>

                    {getHigherStudiesData().attended_test && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pl-4 border-l-2 border-indigo-400">
                        <div>
                          <label className="block text-gray-700 font-medium mb-1">
                            Test Count <span className="text-xs text-gray-500 font-normal">(Number of tests taken)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={getHigherStudiesData().test_count}
                            onChange={(e) => updateHigherStudiesField('test_count', e.target.value)}
                            placeholder="e.g., 3"
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1">
                            Exam / Test Name
                          </label>
                          <input
                            type="text"
                            value={getHigherStudiesData().test_name}
                            onChange={(e) => updateHigherStudiesField('test_name', e.target.value)}
                            placeholder="e.g., GATE Mock Test 1, GRE General Practice..."
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1">
                            Score <span className="text-xs text-gray-500 font-normal">(Score obtained)</span>
                          </label>
                          <input
                            type="text"
                            value={getHigherStudiesData().score}
                            onChange={(e) => updateHigherStudiesField('score', e.target.value)}
                            placeholder="e.g., 95 percentile, 320, 750..."
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Entrepreneur Fields */}
              {(overviewForm.career_objectives === 'Entrepreneur' || overviewForm.career_objectives === 'Enterpreneur') && (
                <div className="col-span-2 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/40 p-5 rounded-2xl border-2 border-indigo-200/90 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                    <FaBriefcase className="text-indigo-600 text-xl" />
                    <h4 className="text-indigo-950 font-bold text-base">Entrepreneur Details</h4>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Business Type <span className="text-xs text-gray-500 font-normal">(Family or Own Business)</span>
                    </label>
                    <select
                      value={getEntrepreneurData().business_type}
                      onChange={(e) => updateEntrepreneurField('business_type', e.target.value)}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Select Family or Own Business</option>
                      <option value="Family Business">Family Business</option>
                      <option value="Own Business">Own Business</option>
                    </select>
                  </div>

                  {/* If Family Business is selected */}
                  {(getEntrepreneurData().business_type === 'Family Business' || getEntrepreneurData().business_type === 'Family') && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-indigo-100"
                    >
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Field</label>
                        <input
                          type="text"
                          value={getEntrepreneurData().field}
                          onChange={(e) => updateEntrepreneurField('field', e.target.value)}
                          placeholder="Enter field / industry..."
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Generation</label>
                        <input
                          type="text"
                          value={getEntrepreneurData().generation}
                          onChange={(e) => updateEntrepreneurField('generation', e.target.value)}
                          placeholder="e.g., 1st Generation, 2nd Generation..."
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Number of Branches Opened</label>
                        <input
                          type="number"
                          min="0"
                          value={getEntrepreneurData().expand}
                          onChange={(e) => updateEntrepreneurField('expand', e.target.value)}
                          placeholder="Enter number of branches opened..."
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Upgrade</label>
                        <input
                          type="text"
                          value={getEntrepreneurData().upgrade}
                          onChange={(e) => updateEntrepreneurField('upgrade', e.target.value)}
                          placeholder="Enter upgrade details..."
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* If Own Business is selected */}
                  {(getEntrepreneurData().business_type === 'Own Business' || getEntrepreneurData().business_type === 'Own') && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-indigo-100"
                    >
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Field</label>
                        <input
                          type="text"
                          value={getEntrepreneurData().field}
                          onChange={(e) => updateEntrepreneurField('field', e.target.value)}
                          placeholder="Enter field / industry..."
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Business Details</label>
                        <input
                          type="text"
                          value={getEntrepreneurData().business_details}
                          onChange={(e) => updateEntrepreneurField('business_details', e.target.value)}
                          placeholder="Enter your business idea / details..."
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Number of Branches plan to open</label>
                        <input
                          type="number"
                          min="0"
                          value={getEntrepreneurData().branches_to_open !== undefined ? getEntrepreneurData().branches_to_open : getEntrepreneurData().expand}
                          onChange={(e) => {
                            updateEntrepreneurField({
                              branches_to_open: e.target.value,
                              expand: e.target.value
                            });
                          }}
                          placeholder="Enter number of branches plan to open..."
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Funding</label>
                        <select
                          value={getEntrepreneurData().funding}
                          onChange={(e) => {
                            updateEntrepreneurField({
                              funding: e.target.value,
                              upgrade: e.target.value
                            });
                          }}
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">Select Funding Source</option>
                          <option value="Government Scheme">Government Scheme</option>
                          <option value="Own Fund">Own Fund</option>
                          <option value="Partnership">Partnership</option>
                        </select>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Other Career Objectives Textarea */}
              {overviewForm.career_objectives &&
                overviewForm.career_objectives !== 'Higher Studies' &&
                overviewForm.career_objectives !== 'Entrepreneur' &&
                overviewForm.career_objectives !== 'Enterpreneur' &&
                careerPrompts[overviewForm.career_objectives] && (
                <div className="col-span-2">
                  <label htmlFor="career-objective-details" className="block text-gray-700 font-medium mb-1">
                    {getCareerObjectiveLabel(overviewForm.career_objectives)}
                  </label>
                  <textarea
                    id="career-objective-details"
                    value={overviewForm.career_objective_details[overviewForm.career_objectives] || ""}
                    onChange={(e) => setOverviewForm(prev => ({
                      ...prev,
                      career_objective_details: {
                        ...prev.career_objective_details,
                        [prev.career_objectives]: e.target.value,
                      },
                    }))}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="2"
                    maxLength={5000}
                    placeholder={careerPrompts[overviewForm.career_objectives]}
                  />
                </div>
              )}

              {/* Specialization Chosen & Expected CTC - Hidden for Higher Studies and Entrepreneur */}
              {overviewForm.career_objectives !== 'Higher Studies' &&
                overviewForm.career_objectives !== 'Entrepreneur' &&
                overviewForm.career_objectives !== 'Enterpreneur' && (
                <>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Specialization Chosen</label>
                    <input
                      type="text"
                      value={overviewForm.specialization_chosen}
                      onChange={(e) => setOverviewForm({ ...overviewForm, specialization_chosen: e.target.value })}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter specialization chosen..."
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Expected CTC</label>
                    <input
                      type="text"
                      value={overviewForm.expected_ctc}
                      onChange={(e) => setOverviewForm({ ...overviewForm, expected_ctc: e.target.value })}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. 6 LPA or 600000"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-gray-700 font-medium mb-1">Communication Skills</label>
                <select
                  value={overviewForm.communication_skills}
                  onChange={(e) => setOverviewForm({ ...overviewForm, communication_skills: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Communication Skill Level</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-gray-700 font-medium mb-1">Skill Gaps</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={gapInput}
                    onChange={(e) => setGapInput(e.target.value)}
                    className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Add a skill gap..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGap())}
                  />
                  <button
                    type="button"
                    onClick={handleAddGap}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    <FaPlus />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {overviewForm.gaps.map((gap, index) => (
                    <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-2">
                      {gap}
                      <button
                        type="button"
                        onClick={() => handleRemoveGap(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-gray-700 font-medium mb-1">Gaps Description</label>
                <textarea
                  value={overviewForm.gaps_description}
                  onChange={(e) => setOverviewForm({ ...overviewForm, gaps_description: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="2"
                  placeholder="Detailed description of skill gaps..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-gray-700 font-medium mb-1">Planned for Filling Gaps</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={stepInput}
                    onChange={(e) => setStepInput(e.target.value)}
                    className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Add a planned step for filling gaps..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStep())}
                  />
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <FaPlus />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {overviewForm.steps.map((step, index) => (
                    <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2">
                      {step}
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(index)}
                        className="text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition"
                disabled={loading || localLoading}
              >
                {localLoading ? "Saving..." : "Save Overview"}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Platforms Tab */}
      {activeTab === 'platforms' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Add/Edit Platform Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              {editingPlatformId ? 'Edit Platform Profile' : 'Add Platform Profile'}
            </h3>
            <form onSubmit={handlePlatformSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Platform Name *</label>
                  <input
                    type="text"
                    value={platformForm.platform_name}
                    onChange={(e) => setPlatformForm({ ...platformForm, platform_name: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., LeetCode, HackerRank"
                    required
                    disabled={!!editingPlatformId}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Level *</label>
                  <select
                    value={platformForm.level}
                    onChange={(e) => setPlatformForm({ ...platformForm, level: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select Level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Problems Solved</label>
                  <input
                    type="number"
                    value={platformForm.no_of_problems_solved}
                    onChange={(e) => setPlatformForm({ ...platformForm, no_of_problems_solved: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Rank</label>
                  <input
                    type="text"
                    value={platformForm.rank}
                    onChange={(e) => setPlatformForm({ ...platformForm, rank: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Your rank"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Easy Count</label>
                  <input
                    type="number"
                    value={platformForm.easy_count}
                    onChange={(e) => setPlatformForm({ ...platformForm, easy_count: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Medium Count</label>
                  <input
                    type="number"
                    value={platformForm.medium_count}
                    onChange={(e) => setPlatformForm({ ...platformForm, medium_count: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Hard Count</label>
                  <input
                    type="number"
                    value={platformForm.hard_count}
                    onChange={(e) => setPlatformForm({ ...platformForm, hard_count: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="0"
                  />
                </div>

                <div className="col-span-4">
                  <label className="block text-gray-700 font-medium mb-1">Description</label>
                  <textarea
                    value={platformForm.description}
                    onChange={(e) => setPlatformForm({ ...platformForm, description: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="2"
                    placeholder="Additional details about your profile..."
                  />
                </div>
              </div>

              <div className="flex justify-center gap-4">
                {editingPlatformId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlatformId(null);
                      setPlatformForm({
                        platform_name: "",
                        level: "",
                        no_of_problems_solved: 0,
                        rank: "",
                        easy_count: 0,
                        medium_count: 0,
                        hard_count: 0,
                        description: "",
                      });
                    }}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg shadow-md hover:shadow-lg transition"
                  >
                    Cancel
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-indigo-500 text-white rounded-lg shadow-md hover:shadow-lg transition"
                  disabled={loading || localLoading}
                >
                  {localLoading ? "Saving..." : editingPlatformId ? "Update Platform" : "Add Platform"}
                </motion.button>
              </div>
            </form>
          </div>

          {/* Platforms List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">My Platform Profiles</h3>
            {platforms.length === 0 ? (
              <p className="text-gray-500">No platform profiles added yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platforms.map((platform) => (
                  <div key={platform.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg text-gray-800">{platform.platform_name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getLevelColor(platform.level)}`}>
                        {platform.level}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      <p>Problems Solved: <span className="font-semibold">{platform.no_of_problems_solved || 0}</span></p>
                      {platform.rank && <p>Rank: <span className="font-semibold">{platform.rank}</span></p>}
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Easy: {platform.easy_count || 0}</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Medium: {platform.medium_count || 0}</span>
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Hard: {platform.hard_count || 0}</span>
                      </div>
                      {platform.description && (
                        <p className="text-xs text-gray-500 mt-2">{platform.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPlatform(platform)}
                        className="flex-1 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-600 text-sm"
                      >
                        <FaEdit className="inline mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlatform(platform.id)}
                        className="flex-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        <FaTrash className="inline mr-1" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CompetencyCoding;


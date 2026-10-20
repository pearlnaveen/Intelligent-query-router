import React, { useState, useEffect } from "react";
import { FaUpload, FaDownload, FaEye, FaTrash, FaTrophy, FaMedal, FaCode, FaChartLine } from "react-icons/fa";
import { motion } from "framer-motion";
import * as XLSX from 'xlsx';
import { useSkillRack } from "../../contexts/SkillRackContext";

const StaffSkillRackPage = () => {
  const {
    allRecords,
    loading,
    error,
    fetchAllRecords,
    bulkUploadSkillRack,
    deleteRecord,
    bulkDeleteRecords,
    clearError
  } = useSkillRack();

  const [activeTab, setActiveTab] = useState('view');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecordIds, setSelectedRecordIds] = useState(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  useEffect(() => {
    if (activeTab === 'view') {
      fetchAllRecords();
      setSelectedRecordIds(new Set());
    }
  }, [activeTab, fetchAllRecords]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setUploadStatus("");
    clearError();
  };

  const handleUploadExcel = async () => {
    if (!selectedFile) {
      setUploadStatus("⚠️ Please select a file first");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        console.log("Parsed Excel Raw Data:", rawJsonData);

        if (!rawJsonData || rawJsonData.length === 0) {
          setUploadStatus("❌ Error: The uploaded file is empty.");
          return;
        }

        // Clean and normalize each row client-side
        const processedRows = rawJsonData.map((row) => {
          const cleanMap = {};
          Object.keys(row || {}).forEach((k) => {
            const cleanK = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanK) {
              cleanMap[cleanK] = row[k];
            }
          });

          const findVal = (candidates, defaultVal = '') => {
            for (const cand of candidates) {
              const cleanC = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (cleanMap[cleanC] !== undefined && cleanMap[cleanC] !== null && String(cleanMap[cleanC]).trim() !== '') {
                return cleanMap[cleanC];
              }
            }
            // partial match fallback
            for (const cand of candidates) {
              const cleanC = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (!cleanC) continue;
              for (const [k, v] of Object.entries(cleanMap)) {
                if ((k.includes(cleanC) || cleanC.includes(k)) && v !== undefined && v !== null && String(v).trim() !== '') {
                  return v;
                }
              }
            }
            return defaultVal;
          };

          return {
            ...row,
            name: findVal(['Name', 'Student Name', 'Username', 'Student'], ''),
            registerNumber: String(findVal(['University Regn Number', 'University Reg Number', 'Register Number', 'Reg Number', 'Reg No', 'Roll Number', 'reg', 'roll'], '')).trim(),
            total_programs_solved: findVal(['Programs Solved', 'Total Programs Solved', 'Programs', 'total_programs_solved'], 0),
            last_week: findVal(['Last Week', 'LastWeek', 'last_week'], 0),
            code_tests: findVal(['Code Tests', 'CodeTests', 'code_tests'], 0),
            code_tracks: findVal(['Code Tracks', 'CodeTracks', 'code_tracks'], 0),
            code_tutor: findVal(['Code Tutor', 'Code Tutorial', 'code_tutor'], 0),
            dc: findVal(['DC', 'Daily Challenge', 'daily_challenge'], 0),
            dt: findVal(['DT', 'Daily Test', 'daily_test'], 0),
            aptitude_score: findVal(['Aptitude Score', 'Aptitude Test', 'aptitude_score'], 0),
            points: findVal(['Points', 'points'], 0),
            gold_medals: findVal(['Gold', 'Gold Medals', 'gold_medals'], 0),
            silver_medals: findVal(['Silver', 'Silver Medals', 'silver_medals'], 0),
            bronze_medals: findVal(['Bronze', 'Bronze Medals', 'bronze_medals'], 0),
            skillrack_rank: findVal(['SkillRack Rank', 'Rank', 'skillrack_rank'], null),
          };
        });

        // Filter valid student rows
        const validRows = processedRows.filter(r => r.registerNumber && String(r.registerNumber).trim() !== '');

        if (validRows.length === 0) {
          setUploadStatus("❌ Error: Could not detect student registration numbers. Please ensure your Excel file has a column for 'University Regn Number' or 'Register Number'.");
          return;
        }

        const result = await bulkUploadSkillRack(validRows);

        setUploadStatus(`✅ Success! Uploaded SkillRack data for ${result.successCount} students. ${result.failedCount > 0 ? `Failed: ${result.failedCount}` : ''}`);
        setSelectedFile(null);

        if (result.failedRecords && result.failedRecords.length > 0) {
          console.log("Failed records:", result.failedRecords);
        }

        fetchAllRecords();
      } catch (error) {
        setUploadStatus(`❌ Error: ${error.message || 'Failed to process Excel file'}`);
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const downloadTemplate = () => {
    const headers = [
      'Name',
      'University Regn Number',
      'Programs Solved',
      'Last Week',
      'Code Tests',
      'Code Tracks',
      'Code Tutor',
      'DC',
      'DT',
      'Aptitude Score',
      'Points',
      'Gold',
      'Silver',
      'Bronze',
      'SkillRack Rank'
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    ws['!cols'] = [
      { wch: 22 }, // Name
      { wch: 24 }, // University Regn Number
      { wch: 18 }, // Programs Solved
      { wch: 14 }, // Last Week
      { wch: 14 }, // Code Tests
      { wch: 14 }, // Code Tracks
      { wch: 14 }, // Code Tutor
      { wch: 10 }, // DC
      { wch: 10 }, // DT
      { wch: 16 }, // Aptitude Score
      { wch: 14 }, // Points
      { wch: 10 }, // Gold
      { wch: 10 }, // Silver
      { wch: 10 }, // Bronze
      { wch: 16 }  // SkillRack Rank
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SkillRack Template");
    XLSX.writeFile(wb, "student_skillrack_template.xlsx");
  };

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteRecord(id);
        setSelectedRecordIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        alert("Record deleted successfully!");
      } catch (err) {
        console.error("Error deleting record:", err);
        alert("Failed to delete record");
      }
    }
  };

  const filteredRecords = allRecords
    .filter(record =>
      (record.registerNumber && record.registerNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.name && record.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.username && record.username.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const regA = String(a.registerNumber || '');
      const regB = String(b.registerNumber || '');
      return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: 'base' });
    });

  // Multi-select handlers
  const handleToggleSelect = (id) => {
    setSelectedRecordIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllFilteredSelected = filteredRecords.length > 0 && filteredRecords.every(r => selectedRecordIds.has(r.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedRecordIds(new Set());
    } else {
      const allIds = new Set(filteredRecords.map(r => r.id).filter(Boolean));
      setSelectedRecordIds(allIds);
    }
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedRecordIds);
    if (idsToDelete.length === 0) return;

    if (window.confirm(`Are you sure you want to permanently delete ${idsToDelete.length} selected SkillRack record(s)?`)) {
      setIsDeletingBulk(true);
      try {
        await bulkDeleteRecords(idsToDelete);
        setSelectedRecordIds(new Set());
        alert(`Successfully deleted ${idsToDelete.length} record(s)!`);
        fetchAllRecords();
      } catch (err) {
        console.error("Bulk delete error:", err);
        alert("Failed to delete selected records: " + (err.message || 'Unknown error'));
      } finally {
        setIsDeletingBulk(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-200">
                <FaCode className="text-xl" />
              </span>
              Upload Student Skillrack
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Manage and bulk upload student SkillRack coding metrics, test scores, medals, and rankings
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold rounded-xl transition flex items-center gap-2 shadow-sm text-sm"
            >
              <FaDownload className="text-indigo-600" />
              Download Excel Template
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        {loading && (
          <div className="mb-4 p-3 bg-indigo-50 text-indigo-700 rounded-xl text-center text-sm font-semibold animate-pulse border border-indigo-200">
            Processing SkillRack records...
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('view')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition text-sm ${activeTab === 'view'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            <FaEye />
            Student Records ({allRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition text-sm ${activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            <FaUpload />
            Bulk Upload Template
          </button>
        </div>

        {/* View Records Tab */}
        {activeTab === 'view' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            {/* Top Toolbar */}
            <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search by Name or Reg Number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
                />
              </div>

              {/* Bulk Selection Action Bar */}
              {selectedRecordIds.size > 0 ? (
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl">
                  <span className="text-xs font-bold text-indigo-900">
                    {selectedRecordIds.size} record{selectedRecordIds.size > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeletingBulk}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
                  >
                    <FaTrash className="text-[11px]" />
                    {isDeletingBulk ? 'Deleting...' : `Delete Selected (${selectedRecordIds.size})`}
                  </button>
                  <button
                    onClick={() => setSelectedRecordIds(new Set())}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-semibold">
                  Showing {filteredRecords.length} of {allRecords.length} students (Sorted by Reg No)
                </div>
              )}
            </div>

            {/* Scrollable Fixed Table Container */}
            <div className="overflow-x-auto w-full">
              <table className="text-left border-collapse" style={{ minWidth: '2200px', width: '2200px' }}>
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-4 text-center" style={{ minWidth: '60px', width: '60px' }}>
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Select / Deselect All"
                      />
                    </th>
                    <th className="px-4 py-4 text-left" style={{ minWidth: '230px', width: '230px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        STUDENT NAME
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left" style={{ minWidth: '160px', width: '160px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        REG NUMBER
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ minWidth: '160px', width: '160px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        PROGRAMS SOLVED
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ minWidth: '120px', width: '120px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        LAST WEEK
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ minWidth: '120px', width: '120px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        CODE TESTS
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ minWidth: '130px', width: '130px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        CODE TRACKS
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ minWidth: '130px', width: '130px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        CODE TUTOR
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ minWidth: '100px', width: '100px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        DC
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ minWidth: '100px', width: '100px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        DT
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ minWidth: '130px', width: '130px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        APTITUDE
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ minWidth: '130px', width: '130px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        POINTS
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center" style={{ minWidth: '160px', width: '160px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        MEDALS (G/S/B)
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ minWidth: '120px', width: '120px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        RANK
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center" style={{ minWidth: '130px', width: '130px' }}>
                      <div className="whitespace-nowrap font-bold text-xs text-slate-700 uppercase tracking-wider">
                        ACTIONS
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-4 py-16 text-center text-slate-400 font-medium">
                        No SkillRack records found. Upload an Excel file to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => {
                      const isSelected = selectedRecordIds.has(record.id);
                      const gold = record.gold_medals || 0;
                      const silver = record.silver_medals || 0;
                      const bronze = record.bronze_medals || 0;
                      const dcVal = record.dc ?? record.daily_challenge ?? 0;
                      const dtVal = record.dt ?? record.daily_test ?? 0;
                      const tutorVal = record.code_tutor ?? record.code_tutorial ?? 0;
                      const aptScore = record.aptitude_score ?? record.aptitude_test ?? 0;

                      return (
                        <tr
                          key={record.id || record.registerNumber}
                          className={`transition ${isSelected ? 'bg-indigo-50/80 hover:bg-indigo-100/70' : 'hover:bg-slate-50/90'
                            }`}
                        >
                          <td className="px-3 py-3 text-center" style={{ minWidth: '60px', width: '60px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(record.id)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis" style={{ minWidth: '230px', width: '230px' }} title={record.name || record.username || '—'}>
                            {record.name || record.username || '—'}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-indigo-600 whitespace-nowrap" style={{ minWidth: '160px', width: '160px' }}>
                            {record.registerNumber}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-900 whitespace-nowrap" style={{ minWidth: '160px', width: '160px' }}>
                            {record.total_programs_solved ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600 whitespace-nowrap" style={{ minWidth: '120px', width: '120px' }}>
                            +{record.last_week ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right font-medium whitespace-nowrap" style={{ minWidth: '120px', width: '120px' }}>
                            {record.code_tests ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right font-medium whitespace-nowrap" style={{ minWidth: '130px', width: '130px' }}>
                            {record.code_tracks ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right font-medium whitespace-nowrap" style={{ minWidth: '130px', width: '130px' }}>
                            {tutorVal}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-indigo-700 whitespace-nowrap" style={{ minWidth: '100px', width: '100px' }}>
                            {dcVal}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-blue-700 whitespace-nowrap" style={{ minWidth: '100px', width: '100px' }}>
                            {dtVal}
                          </td>
                          <td className="px-4 py-3 text-right font-medium whitespace-nowrap" style={{ minWidth: '130px', width: '130px' }}>
                            {aptScore}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-purple-700 whitespace-nowrap" style={{ minWidth: '130px', width: '130px' }}>
                            {record.points ?? 0}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap font-medium" style={{ minWidth: '160px', width: '160px' }}>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-[11px]">
                              <span className="text-amber-500 font-bold" title="Gold">🥇{gold}</span>
                              <span className="text-slate-400 font-bold" title="Silver">🥈{silver}</span>
                              <span className="text-amber-700 font-bold" title="Bronze">🥉{bronze}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-900 whitespace-nowrap" style={{ minWidth: '120px', width: '120px' }}>
                            {record.skillrack_rank ? `#${record.skillrack_rank}` : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center" style={{ minWidth: '130px', width: '130px' }}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewDetails(record)}
                                className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition"
                                title="View Details"
                              >
                                <FaEye className="text-xs" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition"
                                title="Delete"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8"
          >
            <div className="max-w-3xl mx-auto space-y-6">

              {/* Instructions Banner */}
              <div className="p-5 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border border-indigo-200 rounded-2xl">
                <h4 className="font-bold text-indigo-950 mb-3 text-base flex items-center gap-2">
                  <span>📋</span> SkillRack Template Instructions
                </h4>
                <ul className="text-xs text-indigo-900 space-y-2 list-disc list-inside leading-relaxed font-medium">
                  <li>Download the official template Excel file using the button below.</li>
                  <li>Fill in the 15 required fields: <b>Name, University Regn Number, Programs Solved, Last Week, Code Tests, Code Tracks, Code Tutor, DC, DT, Aptitude Score, Points, Gold, Silver, Bronze, SkillRack Rank</b>.</li>
                  <li>Existing records matching the registration number will be automatically updated with the latest scores.</li>
                  <li>You can directly export the PDF/report into Excel and upload it here.</li>
                </ul>
                <div className="mt-4">
                  <button
                    onClick={downloadTemplate}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-2"
                  >
                    <FaDownload /> Download SkillRack Template (.xlsx)
                  </button>
                </div>
              </div>

              {/* File Upload Box */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50/50 hover:border-indigo-500 hover:bg-indigo-50/30 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                    <FaUpload className="text-2xl" />
                  </div>
                  <p className="text-base font-bold text-slate-800">
                    {selectedFile ? selectedFile.name : "Click or drag & drop SkillRack Excel file here"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports .xlsx, .xls, and .csv spreadsheet formats
                  </p>
                </div>
              </div>

              {/* Upload Button & Status */}
              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  onClick={handleUploadExcel}
                  disabled={!selectedFile || loading}
                  className={`px-8 py-3 rounded-xl font-extrabold text-sm transition flex items-center gap-2 shadow-md ${selectedFile && !loading
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-indigo-200 hover:shadow-lg scale-100 hover:scale-[1.02]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                  <FaUpload /> {loading ? 'Uploading SkillRack Data...' : 'Upload SkillRack Data'}
                </button>

                {uploadStatus && (
                  <div className={`w-full p-4 rounded-xl text-xs font-bold border text-center ${uploadStatus.includes('Success') || uploadStatus.includes('✅')
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                    {uploadStatus}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}

      </div>

      {/* Detail Modal */}
      {showModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
          >
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">
                  {selectedRecord.name || selectedRecord.username || "Student Details"}
                </h3>
                <p className="text-xs font-mono text-indigo-600 font-bold mt-0.5">
                  Reg No: {selectedRecord.registerNumber}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              {/* Highlight Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="text-xs text-indigo-700 font-semibold mb-1">Total Solved</div>
                  <div className="text-2xl font-black text-indigo-900">{selectedRecord.total_programs_solved ?? 0}</div>
                </div>
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="text-xs text-purple-700 font-semibold mb-1">Points</div>
                  <div className="text-2xl font-black text-purple-900">{selectedRecord.points ?? 0}</div>
                </div>
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-xs text-amber-700 font-semibold mb-1">SkillRack Rank</div>
                  <div className="text-2xl font-black text-amber-900">
                    {selectedRecord.skillrack_rank ? `#${selectedRecord.skillrack_rank}` : '—'}
                  </div>
                </div>
              </div>

              {/* Activity Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Coding Activity Breakdown
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Last Week Solved</span>
                    <span className="font-extrabold text-emerald-600 text-base">+{selectedRecord.last_week ?? 0}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Code Tests</span>
                    <span className="font-extrabold text-slate-800 text-base">{selectedRecord.code_tests ?? 0}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Code Tracks</span>
                    <span className="font-extrabold text-slate-800 text-base">{selectedRecord.code_tracks ?? 0}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Code Tutor</span>
                    <span className="font-extrabold text-slate-800 text-base">{selectedRecord.code_tutor ?? selectedRecord.code_tutorial ?? 0}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Daily Challenge (DC)</span>
                    <span className="font-extrabold text-indigo-600 text-base">{selectedRecord.dc ?? selectedRecord.daily_challenge ?? 0}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Daily Test (DT)</span>
                    <span className="font-extrabold text-blue-600 text-base">{selectedRecord.dt ?? selectedRecord.daily_test ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Medals & Aptitude */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                    Medals Won
                  </h4>
                  <div className="flex items-center justify-around text-center pt-2">
                    <div>
                      <div className="text-2xl">🥇</div>
                      <div className="text-xs font-bold text-slate-600 mt-1">Gold</div>
                      <div className="font-extrabold text-amber-900">{selectedRecord.gold_medals ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-2xl">🥈</div>
                      <div className="text-xs font-bold text-slate-600 mt-1">Silver</div>
                      <div className="font-extrabold text-slate-700">{selectedRecord.silver_medals ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-2xl">🥉</div>
                      <div className="text-xs font-bold text-slate-600 mt-1">Bronze</div>
                      <div className="font-extrabold text-amber-800">{selectedRecord.bronze_medals ?? 0}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 flex flex-col justify-center text-center">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    Aptitude Score
                  </h4>
                  <div className="text-3xl font-black text-emerald-700">
                    {selectedRecord.aptitude_score ?? selectedRecord.aptitude_test ?? 0}
                  </div>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">Total Aptitude Test Points</p>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default StaffSkillRackPage;

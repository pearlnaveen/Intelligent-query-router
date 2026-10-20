import React, { useState, useEffect, useMemo } from 'react';
import {
  Filter,
  FileSpreadsheet,
  Search,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Users,
  Award,
  Layers
} from 'lucide-react';
import {
  getAdminResultFilters,
  getAdminResultAnalysis,
  getAdminResultExportUrl
} from '../../services/resultService';

const ResultAnalysis = () => {
  // Filter Options & Selection
  const [filterData, setFilterData] = useState({ degrees: [], batches: [], semesters: [] });
  const [selectedDegree, setSelectedDegree] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

  // Available Branch & Batch Options based on hierarchy
  const [availableBranches, setAvailableBranches] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [availableSemesters, setAvailableSemesters] = useState([]);

  // Result Analysis Data
  const [analysisData, setAnalysisData] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  // Loading & Error states
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch Filters on Mount
  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    setLoadingFilters(true);
    try {
      const data = await getAdminResultFilters();
      setFilterData(data);

      const sList = data.semesters && data.semesters.length > 0 ? data.semesters : [1, 2, 3, 4, 5, 6, 7, 8];
      setAvailableSemesters(sList);
      setSelectedSemester(String(sList[0]));

      if (data.degrees && data.degrees.length > 0) {
        const firstDegree = data.degrees[0];
        setSelectedDegree(firstDegree);
        updateBranchesForDegree(firstDegree, data.batches);
      }
    } catch (err) {
      setError('Failed to load filter options');
    } finally {
      setLoadingFilters(false);
    }
  };

  const updateBranchesForDegree = (deg, allBatches) => {
    const matchingBatches = (allBatches || filterData.batches).filter((b) => b.degree === deg);
    const branches = [...new Set(matchingBatches.map((b) => b.branch).filter(Boolean))];
    setAvailableBranches(branches);

    if (branches.length > 0) {
      setSelectedBranch(branches[0]);
      updateBatchesForBranch(deg, branches[0], allBatches);
    } else {
      setSelectedBranch('');
      setAvailableBatches([]);
      setSelectedBatch('');
    }
  };

  const updateBatchesForBranch = (deg, br, allBatches) => {
    const matchingBatches = (allBatches || filterData.batches).filter(
      (b) => b.degree === deg && b.branch === br
    );
    const batchList = [...new Set(matchingBatches.map((b) => b.batchYears).filter(Boolean))];
    setAvailableBatches(batchList);

    if (batchList.length > 0) {
      setSelectedBatch(batchList[0]);
    } else {
      setSelectedBatch('');
    }
  };

  const handleDegreeChange = (deg) => {
    setSelectedDegree(deg);
    updateBranchesForDegree(deg, filterData.batches);
  };

  const handleBranchChange = (br) => {
    setSelectedBranch(br);
    updateBatchesForBranch(selectedDegree, br, filterData.batches);
  };

  // 2. Fetch Result Analysis Data
  const handleApplyFilters = async () => {
    if (!selectedDegree || !selectedBranch || !selectedBatch) {
      setError('Please select Degree, Branch, and Batch.');
      return;
    }

    setError('');
    setLoadingAnalysis(true);
    try {
      const res = await getAdminResultAnalysis({
        degree: selectedDegree,
        branch: selectedBranch,
        batchYears: selectedBatch,
        semester: selectedSemester
      });
      setAnalysisData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch result analysis');
      setAnalysisData(null);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Auto-apply filters when defaults load
  useEffect(() => {
    if (selectedDegree && selectedBranch && selectedBatch) {
      handleApplyFilters();
    }
  }, [availableBatches]);

  // 3. Download Excel Report
  const handleDownloadExcel = () => {
    if (!selectedDegree || !selectedBranch || !selectedBatch) return;
    const url = getAdminResultExportUrl({
      degree: selectedDegree,
      branch: selectedBranch,
      batchYears: selectedBatch,
      semester: selectedSemester
    });
    window.open(url, '_blank');
  };

  // 4. Flattened Columns for the Consolidated Matrix Table
  const tableColumns = useMemo(() => {
    if (!analysisData || !analysisData.courses) return [];

    const cols = [];
    analysisData.courses.forEach((course) => {
      if (courseSearch.trim()) {
        const q = courseSearch.toLowerCase();
        if (
          !course.courseCode.toLowerCase().includes(q) &&
          !course.courseTitle.toLowerCase().includes(q)
        ) {
          return;
        }
      }

      if (course.examTypes && course.examTypes.length > 0) {
        course.examTypes.forEach((et) => {
          cols.push({
            courseId: course.courseId,
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            examTypeId: et.examTypeId,
            examTypeName: et.examTypeName,
            maxMarks: et.maxMarks
          });
        });
      } else {
        // Course with no exam types created yet
        cols.push({
          courseId: course.courseId,
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          examTypeId: null,
          examTypeName: 'No Exams',
          maxMarks: null
        });
      }
    });

    return cols;
  }, [analysisData, courseSearch]);

  // Grouped courses for top header row
  const groupedCourses = useMemo(() => {
    const map = new Map();
    tableColumns.forEach((col) => {
      if (!map.has(col.courseId)) {
        map.set(col.courseId, {
          courseId: col.courseId,
          courseCode: col.courseCode,
          courseTitle: col.courseTitle,
          colSpan: 0
        });
      }
      map.get(col.courseId).colSpan += 1;
    });
    return [...map.values()];
  }, [tableColumns]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    if (!analysisData || !analysisData.students) return [];
    if (!studentSearch.trim()) return analysisData.students;

    const q = studentSearch.toLowerCase().trim();
    return analysisData.students.filter(
      (s) =>
        s.regno.toLowerCase().includes(q) ||
        (s.studentName && s.studentName.toLowerCase().includes(q))
    );
  }, [analysisData, studentSearch]);

  if (loadingFilters) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Loading filters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-slate-50 font-sans text-slate-800 pb-16">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Result Analysis Matrix</h1>
            <p className="text-xs text-slate-500">
              Consolidated result analysis matrix filtered by Degree, Branch, Batch & Semester.
            </p>
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={!analysisData}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all active:scale-95 ${
              analysisData
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel Report</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2>Filter Criteria</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
            {/* Degree */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Degree
              </label>
              <select
                value={selectedDegree}
                onChange={(e) => handleDegreeChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {filterData.degrees.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {availableBranches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Batch
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {availableBatches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {availableSemesters.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Apply Button */}
            <div>
              <button
                onClick={handleApplyFilters}
                disabled={loadingAnalysis}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loadingAnalysis ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Filter className="w-4 h-4" />
                )}
                <span>Apply Filters</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Body */}
        {loadingAnalysis ? (
          <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-base font-medium text-slate-700">Loading student result matrix...</p>
          </div>
        ) : !analysisData ? (
          <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No Analysis Data Loaded</h3>
            <p className="text-xs text-slate-400 mt-1">Select degree, branch, batch, and semester above and click "Apply Filters".</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full max-w-full">
            {/* Search & Stats Header Toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                  Total Students: <strong className="text-blue-600 font-bold">{analysisData.totalStudents}</strong>
                </span>
                <span className="text-xs text-slate-500">
                  {selectedDegree} - {selectedBranch} ({selectedBatch}) | Semester {selectedSemester}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student / regno..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-56 font-medium"
                  />
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter course..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-48 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Consolidated Matrix Table Container */}
            <div className="overflow-x-auto max-w-full max-h-[75vh] overflow-y-auto relative border-t border-slate-200">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <colgroup>
                  <col style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }} />
                  <col style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }} />
                  <col style={{ width: '220px', minWidth: '220px', maxWidth: '220px' }} />
                  {tableColumns.map((_, idx) => (
                    <col key={idx} style={{ width: '120px', minWidth: '120px' }} />
                  ))}
                </colgroup>
                <thead className="bg-slate-50 border-b border-slate-200">
                  {/* Top Header Row: Student Info + Course Group Headers */}
                  <tr className="bg-slate-50 text-slate-800 border-b border-slate-200">
                    <th className="py-3 px-2 w-[50px] min-w-[50px] max-w-[50px] border-b border-r border-slate-200 bg-slate-100 sticky top-0 left-0 z-50 text-center font-bold text-slate-700">
                      #
                    </th>
                    <th className="py-3 px-3 w-[130px] min-w-[130px] max-w-[130px] border-b border-r border-slate-200 bg-slate-100 sticky top-0 left-[50px] z-50 font-bold text-slate-800">
                      Register No
                    </th>
                    <th className="py-3 px-3 w-[220px] min-w-[220px] max-w-[220px] border-b border-r border-slate-200 bg-slate-100 sticky top-0 left-[180px] z-50 font-bold text-slate-800 truncate">
                      Student Name
                    </th>

                    {groupedCourses.map((c) => (
                      <th
                        key={c.courseId}
                        colSpan={c.colSpan}
                        className="py-2.5 px-3 border-b border-r border-slate-200 text-center bg-slate-50 text-slate-900 font-bold sticky top-0 z-30"
                        title={c.courseTitle}
                      >
                        <div className="truncate max-w-full mx-auto px-1">
                          <span className="text-blue-600 font-mono font-bold mr-1">{c.courseCode}</span>
                          <span className="text-slate-600 text-[11px] font-semibold">{c.courseTitle}</span>
                        </div>
                      </th>
                    ))}
                  </tr>

                  {/* Sub-Header Row: Exam Types */}
                  <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                    <th className="py-2 px-2 w-[50px] min-w-[50px] max-w-[50px] border-b border-r border-slate-200 bg-slate-100 sticky top-[45px] left-0 z-50"></th>
                    <th className="py-2 px-3 w-[130px] min-w-[130px] max-w-[130px] border-b border-r border-slate-200 bg-slate-100 sticky top-[45px] left-[50px] z-50"></th>
                    <th className="py-2 px-3 w-[220px] min-w-[220px] max-w-[220px] border-b border-r border-slate-200 bg-slate-100 sticky top-[45px] left-[180px] z-50"></th>

                    {tableColumns.map((col, idx) => (
                      <th
                        key={`${col.courseId}_${col.examTypeId || idx}`}
                        className="py-2 px-3 border-b border-r border-slate-200 text-center font-semibold text-[11px] bg-slate-100/90 text-slate-700 w-[120px] min-w-[120px] sticky top-[45px] z-30"
                      >
                        <div className="truncate text-slate-800 font-semibold">{col.examTypeName}</div>
                        {col.maxMarks && (
                          <span className="text-[10px] text-slate-500 font-mono font-normal block">
                            Max {col.maxMarks}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3 + tableColumns.length}
                        className="py-12 text-center text-slate-400 text-sm font-medium"
                      >
                        No students found matching the selected filter or search query.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, sIdx) => (
                      <tr key={student.regno} className="hover:bg-slate-50/90 transition-colors">
                        {/* Sticky Left Columns with Fixed Widths & Offsets */}
                        <td className="py-2.5 px-2 w-[50px] min-w-[50px] max-w-[50px] border-r border-slate-200 text-slate-400 font-mono text-center sticky left-0 bg-white z-20">
                          {sIdx + 1}
                        </td>
                        <td className="py-2.5 px-3 w-[130px] min-w-[130px] max-w-[130px] border-r border-slate-200 font-mono font-bold text-slate-800 sticky left-[50px] bg-white z-20">
                          {student.regno}
                        </td>
                        <td className="py-2.5 px-3 w-[220px] min-w-[220px] max-w-[220px] border-r border-slate-200 font-semibold text-slate-900 truncate sticky left-[180px] bg-white z-20">
                          {student.studentName || student.regno}
                        </td>

                        {/* Marks Cells */}
                        {tableColumns.map((col, cIdx) => {
                          const studentCourse = student.courses?.find(
                            (sc) => sc.courseId === col.courseId
                          );

                          const isStudying = studentCourse ? studentCourse.isStudying !== false : true;
                          const markVal = studentCourse?.marks ? studentCourse.marks[col.examTypeName] : null;

                          return (
                            <td
                              key={`${student.regno}_${col.courseId}_${col.examTypeId || cIdx}`}
                              className="py-2.5 px-3 border-r border-slate-200 text-center font-mono font-semibold w-[120px] min-w-[120px]"
                            >
                              {!isStudying ? (
                                // Student NOT studying this course (e.g. elective) -> Leave completely empty
                                <span className="text-slate-200 text-xs"></span>
                              ) : markVal !== null && markVal !== undefined ? (
                                // Mark present
                                <span className="text-slate-900 font-bold">{markVal}</span>
                              ) : (
                                // Enrolled but mark pending
                                <span className="text-slate-300 font-normal italic">--</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultAnalysis;

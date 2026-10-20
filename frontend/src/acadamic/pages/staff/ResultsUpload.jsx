import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  Save,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
  Layers,
  X,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import {
  getStaffCourseDetails,
  createExamType,
  deleteExamType,
  getStudentsForExamType,
  saveBulkMarks
} from '../../services/resultService';

const ResultsUpload = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Course metadata state
  const [courseInfo, setCourseInfo] = useState(null);
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState(null);

  // Student roster & marks state
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Loading & notification states
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', text: '' }

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newMaxMarks, setNewMaxMarks] = useState('50');
  const [newDescription, setNewDescription] = useState('');
  const [modalError, setModalError] = useState('');
  const [creatingExam, setCreatingExam] = useState(false);

  // Refs for keyboard navigation
  const inputRefs = useRef({});

  // Fetch course details on mount
  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    setLoadingCourse(true);
    try {
      const data = await getStaffCourseDetails(courseId);
      setCourseInfo(data);
      setExamTypes(data.examTypes || []);

      if (data.examTypes && data.examTypes.length > 0) {
        // Select first exam type by default
        handleSelectExamType(data.examTypes[0]);
      } else {
        setStudents([]);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to load course details');
    } finally {
      setLoadingCourse(false);
    }
  };

  const handleSelectExamType = async (et) => {
    if (isDirty) {
      if (!window.confirm('You have unsaved mark changes. Switch exam type anyway?')) {
        return;
      }
    }
    setSelectedExamType(et);
    setIsDirty(false);
    setLoadingStudents(true);
    try {
      const res = await getStudentsForExamType(et.examTypeId);
      setStudents(res.students || []);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to load student list');
    } finally {
      setLoadingStudents(false);
    }
  };

  const showToast = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Handle Mark Change
  const handleMarkChange = (regno, value) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.regno === regno) {
          const maxMarks = selectedExamType ? Number(selectedExamType.maxMarks) : 100;
          let error = '';

          if (value !== '' && value !== null) {
            const num = Number(value);
            if (isNaN(num)) {
              error = 'Invalid number';
            } else if (num < 0) {
              error = 'Cannot be negative';
            } else if (num > maxMarks) {
              error = `Exceeds max (${maxMarks})`;
            }
          }

          return {
            ...s,
            mark: value,
            error,
            status: value !== '' && !error ? 'Editing' : s.status
          };
        }
        return s;
      })
    );
    setIsDirty(true);
  };

  // Keyboard Navigation: Enter key moves to next student row
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const filtered = getFilteredStudents();
      const nextStudent = filtered[index + 1];
      if (nextStudent && inputRefs.current[nextStudent.regno]) {
        inputRefs.current[nextStudent.regno].focus();
        inputRefs.current[nextStudent.regno].select();
      }
    }
  };

  // Save All Marks
  const handleSaveAll = async () => {
    if (!selectedExamType) return;

    // Check for validation errors in rows
    const errorsExist = students.some((s) => s.error);
    if (errorsExist) {
      showToast('error', 'Please fix validation errors before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload = students.map((s) => ({
        regno: s.regno,
        mark: s.mark !== '' && s.mark !== null ? Number(s.mark) : null
      }));

      await saveBulkMarks(selectedExamType.examTypeId, payload);
      showToast('success', '✓ Marks saved successfully');
      setIsDirty(false);

      // Refresh student status to Saved
      setStudents((prev) =>
        prev.map((s) => ({
          ...s,
          status: s.mark !== '' && s.mark !== null ? 'Saved' : 'Pending'
        }))
      );

      // Refresh exam type counters
      fetchCourseDetails();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  // Modal Create Exam Type
  const handleCreateExamTypeSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    const trimmedName = newExamName.trim();
    const numMax = Number(newMaxMarks);

    if (!trimmedName) {
      setModalError('Exam type name is required.');
      return;
    }
    if (isNaN(numMax) || numMax <= 0) {
      setModalError('Maximum marks must be a positive number.');
      return;
    }

    setCreatingExam(true);
    try {
      const res = await createExamType(courseId, {
        examTypeName: trimmedName,
        maxMarks: numMax,
        description: newDescription.trim()
      });

      showToast('success', `Exam type "${trimmedName}" created!`);
      setShowModal(false);
      setNewExamName('');
      setNewMaxMarks('50');
      setNewDescription('');

      // Refresh exam types & select new
      const updatedDetails = await getStaffCourseDetails(courseId);
      setCourseInfo(updatedDetails);
      setExamTypes(updatedDetails.examTypes || []);

      const newlyCreated = (updatedDetails.examTypes || []).find(
        (et) => et.examTypeName.toLowerCase() === trimmedName.toLowerCase()
      );
      if (newlyCreated) {
        handleSelectExamType(newlyCreated);
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create exam type.');
    } finally {
      setCreatingExam(false);
    }
  };

  const handleDeleteExamType = async (e, et) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete "${et.examTypeName}"? All entered student marks for this exam will also be deleted.`
      )
    ) {
      return;
    }

    try {
      await deleteExamType(et.examTypeId);
      showToast('success', `Exam type "${et.examTypeName}" deleted.`);

      const updatedDetails = await getStaffCourseDetails(courseId);
      setCourseInfo(updatedDetails);
      const remaining = updatedDetails.examTypes || [];
      setExamTypes(remaining);

      if (selectedExamType?.examTypeId === et.examTypeId) {
        if (remaining.length > 0) {
          handleSelectExamType(remaining[0]);
        } else {
          setSelectedExamType(null);
          setStudents([]);
        }
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete exam type.');
    }
  };

  const getFilteredStudents = () => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.regno.toLowerCase().includes(q) ||
        s.studentName.toLowerCase().includes(q) ||
        String(s.rollNo).includes(q)
    );
  };

  const filteredStudents = getFilteredStudents();

  if (loadingCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium text-sm">Loading course details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-16">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl transition-all duration-300 text-white ${
            notification.type === 'success'
              ? 'bg-emerald-600 border border-emerald-500'
              : 'bg-rose-600 border border-rose-500'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : (
            <AlertCircle className="w-5 h-5 text-white" />
          )}
          <span className="font-medium text-sm">{notification.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/staff/dashboard')}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              title="Back to Dashboard"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 uppercase tracking-wider">
                  {courseInfo?.courseCode || 'CS301'}
                </span>
                <h1 className="text-xl font-bold text-slate-900">
                  {courseInfo?.courseTitle || 'Database Management Systems'}
                </h1>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Batch: <strong>{courseInfo?.batchYears || '2023-2027'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Section: <strong>{courseInfo?.section || 'A'}</strong>
                </span>
              </div>
            </div>
          </div>

          {isDirty && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 animate-pulse">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Unsaved changes</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Exam Types Toolbar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Exam Types</h2>
              <p className="text-xs text-slate-500">
                Shared exam types for this course. Created types are visible to all course staff.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Exam Type</span>
            </button>
          </div>

          {/* Exam Type Pills */}
          <div className="flex flex-wrap gap-3">
            {examTypes.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-2">
                No exam types created yet. Click "Add Exam Type" to create one.
              </p>
            ) : (
              examTypes.map((et) => {
                const isSelected = selectedExamType?.examTypeId === et.examTypeId;
                return (
                  <div
                    key={et.examTypeId}
                    onClick={() => handleSelectExamType(et)}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-xl font-medium text-sm cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span>{et.examTypeName}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Max {et.maxMarks}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteExamType(e, et)}
                      title="Delete Exam Type"
                      className={`p-1 rounded-md transition-colors ${
                        isSelected
                          ? 'hover:bg-emerald-700 text-white/80 hover:text-white'
                          : 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Exam & Mark Entry Table */}
        {selectedExamType ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Table Header Bar */}
            <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Selected Exam</span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                  <span>{selectedExamType.examTypeName}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                    Max Marks: {selectedExamType.maxMarks}
                  </span>
                </h3>
              </div>

              {/* Search & Save Controls */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-64"
                  />
                </div>

                <button
                  onClick={handleSaveAll}
                  disabled={saving || loadingStudents}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-md active:scale-95 ${
                    saving || loadingStudents
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg'
                  }`}
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save All Marks</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            {loadingStudents ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm">Loading student roster...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-base font-medium">No students found for this course.</p>
                <p className="text-xs text-slate-400 mt-1">Verify that students are enrolled in the course section.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-6 w-16">#</th>
                      <th className="py-3.5 px-6">Register No</th>
                      <th className="py-3.5 px-6">Student Name</th>
                      <th className="py-3.5 px-6 w-44">Mark</th>
                      <th className="py-3.5 px-6 w-32">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((st, idx) => (
                      <tr key={st.regno} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 text-slate-400 font-mono text-xs">{st.rollNo}</td>
                        <td className="py-3.5 px-6 font-mono font-medium text-slate-800">{st.regno}</td>
                        <td className="py-3.5 px-6 font-medium text-slate-900">{st.studentName}</td>
                        <td className="py-3.5 px-6">
                          <div className="relative">
                            <input
                              ref={(el) => (inputRefs.current[st.regno] = el)}
                              type="number"
                              min="0"
                              max={selectedExamType.maxMarks}
                              step="0.5"
                              value={st.mark}
                              onChange={(e) => handleMarkChange(st.regno, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, idx)}
                              placeholder={`0 - ${selectedExamType.maxMarks}`}
                              className={`w-32 px-3 py-1.5 text-sm font-semibold rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                                st.error
                                  ? 'border-rose-400 bg-rose-50 text-rose-800 focus:ring-rose-200'
                                  : 'border-slate-300 bg-white text-slate-900 focus:ring-emerald-500/20 focus:border-emerald-500'
                              }`}
                            />
                            {st.error && (
                              <span className="block text-[11px] font-medium text-rose-600 mt-1">
                                {st.error}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          {st.status === 'Saved' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Saved
                            </span>
                          ) : st.status === 'Editing' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Unsaved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200 shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No Exam Type Selected</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select an exam type above or click "Add Exam Type" to start entering marks.
            </p>
          </div>
        )}
      </div>

      {/* Add Exam Type Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add Exam Type</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateExamTypeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Exam Type Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Internal Assessment 1"
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Maximum Marks <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="50"
                  value={newMaxMarks}
                  onChange={(e) => setNewMaxMarks(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows="2"
                  placeholder="Short description..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingExam}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 flex items-center gap-2"
                >
                  {creatingExam && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Create Exam Type</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsUpload;

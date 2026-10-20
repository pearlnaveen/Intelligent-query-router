import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Clock3,
  BadgeCheck,
  XCircle
} from "lucide-react";
import { api } from "../../services/authService";
import { useAuth } from "../auth/AuthContext";
import {
  fetchStudentDetails,
  fetchSemesters,
  fetchNptelCourses,
  enrollNptelCourses,
  fetchStudentNptelEnrollments,
  fetchOecPecProgress
} from "../../services/studentService";

const NptelSelection = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [availableNptel, setAvailableNptel] = useState([]);
  const [enrolledNptel, setEnrolledNptel] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentSemesterNumber, setCurrentSemesterNumber] = useState(0);

  const getAllowedSemesters = (semesterData = [], studentSemesterNumber = 0) => {
    const bySemNo = new Map();
    [...semesterData]
      .sort((a, b) => Number(a.semesterNumber) - Number(b.semesterNumber))
      .forEach((sem) => {
        const semNo = Number(sem.semesterNumber);
        if (!semNo || bySemNo.has(semNo)) return;
        bySemNo.set(semNo, sem);
      });

    const unique = [...bySemNo.values()];
    if (!unique.length) return [];

    const current =
      unique.find((s) => Number(s.semesterNumber) === Number(studentSemesterNumber)) ||
      unique.find((s) => s.isActive === "YES") ||
      unique[unique.length - 1];

    const currentNo = Number(current?.semesterNumber || 0);
    return unique.filter((s) => {
      const semNo = Number(s.semesterNumber);
      return semNo > 0 && semNo <= currentNo;
    });
  };

  useEffect(() => {
    if (authLoading) return;
    if ((user?.role || "").toLowerCase() !== "student") {
      navigate("/records/login");
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const studentData = await fetchStudentDetails();
        const studentSemesterNumber = Number(studentData?.studentProfile?.semester || 0);
        setCurrentSemesterNumber(studentSemesterNumber);
        const sems = await fetchSemesters(studentData?.studentProfile?.batch);
        const filteredSemesters = getAllowedSemesters(sems, studentSemesterNumber);
        setSemesters(filteredSemesters);

        const defaultSemester =
          filteredSemesters.find((s) => Number(s.semesterNumber) === studentSemesterNumber) ||
          filteredSemesters.find((s) => s.isActive === "YES") ||
          filteredSemesters[0];
        setSelectedSemester(defaultSemester?.semesterId || "");

        const [prog, enrolls] = await Promise.all([
          fetchOecPecProgress(),
          fetchStudentNptelEnrollments()
        ]);

        setProgress(prog);
        setEnrolledNptel(enrolls);
      } catch (err) {
        setError("Failed to load NPTEL data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, authLoading, user?.role]);

  useEffect(() => {
    if (!selectedSemester) return;

    const loadNptel = async () => {
      try {
        const courses = await fetchNptelCourses(selectedSemester);
        setAvailableNptel(Array.isArray(courses) ? courses : []);
      } catch {
        setError("Failed to fetch NPTEL courses.");
      }
    };

    loadNptel();
  }, [selectedSemester]);

  const enrolledList = useMemo(
    () => (Array.isArray(enrolledNptel) ? enrolledNptel : (enrolledNptel?.data || [])),
    [enrolledNptel]
  );

  const enrolledCourseIdsSet = useMemo(
    () => new Set(enrolledList.map((e) => e.nptelCourseId)),
    [enrolledList]
  );

  const availableList = useMemo(
    () => (Array.isArray(availableNptel) ? availableNptel : (availableNptel?.data || [])),
    [availableNptel]
  );

  const selectableCourses = useMemo(
    () => availableList.filter((course) => !course.isEnrolled && !enrolledCourseIdsSet.has(course.nptelCourseId)),
    [availableList, enrolledCourseIdsSet]
  );

  const selectedCount = selectedIds.length;

  const handleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleEnroll = async () => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      await enrollNptelCourses(selectedSemester, selectedIds);
      setSuccess("Enrolled successfully.");
      setSelectedIds([]);
      const [enrolls, prog, refreshedCourses] = await Promise.all([
        fetchStudentNptelEnrollments(),
        fetchOecPecProgress(),
        selectedSemester ? fetchNptelCourses(selectedSemester) : Promise.resolve([])
      ]);
      setEnrolledNptel(enrolls);
      setProgress(prog);
      if (Array.isArray(refreshedCourses)) setAvailableNptel(refreshedCourses);
    } catch {
      setError("Enrollment failed.");
    } finally {
      setLoading(false);
    }
  };

  const [transferModalData, setTransferModalData] = useState(null);

  const handleStudentDecision = async (enrollmentId, decision, creditType = null) => {
    let remarks = "";
    if (decision === "rejected") {
      remarks = window.prompt("Optional reason for rejecting this credit transfer:") || "";
    }

    try {
      await api.post("/student/nptel-credit-transfer", {
        enrollmentId,
        decision,
        creditType,
        remarks: remarks || ""
      });

      toast.success(
        decision === "accepted"
          ? `Credit transfer accepted as ${creditType}!`
          : "Credit transfer rejected."
      );
      setTransferModalData(null);

      setEnrolledNptel((prev) => {
        const list = Array.isArray(prev) ? prev : (prev?.data || []);
        return list.map((e) =>
          e.enrollmentId === enrollmentId
            ? { ...e, studentStatus: decision, creditType: creditType || e.creditType }
            : e
        );
      });

      const [updatedEnrolls, prog] = await Promise.all([
        fetchStudentNptelEnrollments(),
        fetchOecPecProgress()
      ]);
      setEnrolledNptel(updatedEnrolls);
      setProgress(prog);
    } catch (err) {
      console.error("Decision error:", err);
      toast.error(err.response?.data?.message || "Failed to submit decision");
    }
  };

  if (loading && semesters.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-11 h-11 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Student Portal</p>
              <h1 className="text-2xl font-semibold text-slate-900 mt-1">NPTEL Course Selection</h1>
              <p className="text-sm text-slate-600 mt-1">
                Universal NPTEL courses. Enroll for your active semester and designate as OEC/PEC during credit transfer.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Choose Semester</option>
                {semesters.map((sem) => (
                  <option key={sem.semesterId} value={sem.semesterId}>
                    Semester {sem.semesterNumber} {Number(sem.semesterNumber) === currentSemesterNumber ? "- Current" : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={handleEnroll}
                disabled={selectedCount === 0 || loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedCount === 0 || loading
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                }`}
              >
                Enroll Selected ({selectedCount})
              </button>
            </div>
          </div>
        </div>

        {progress && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* OEC Progress Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700">OEC Progress (Max 9 Cr)</p>
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900">
                    {progress.completedCredits?.OEC ?? progress.oec?.completedCredits ?? 0}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    / {progress.requiredCredits?.OEC ?? 9} Credits Completed
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((progress.completedCredits?.OEC ?? progress.oec?.completedCredits ?? 0) / (progress.requiredCredits?.OEC ?? 9)) * 100))}%`
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                <span>NPTEL: {progress.oec?.nptelTransferredCredits ?? 0} Cr | Regular: {progress.oec?.collegeCredits ?? 0} Cr</span>
                <span className="font-semibold text-slate-700">
                  {progress.oec?.remainingCredits ?? Math.max(0, (progress.requiredCredits?.OEC ?? 9) - (progress.completedCredits?.OEC ?? 0))} Cr left
                </span>
              </div>
            </div>

            {/* PEC Progress Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700">PEC Progress (Max 18 Cr)</p>
                  <BookOpen className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900">
                    {progress.completedCredits?.PEC ?? progress.pec?.completedCredits ?? 0}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    / {progress.requiredCredits?.PEC ?? 18} Credits Completed
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className="bg-violet-600 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((progress.completedCredits?.PEC ?? progress.pec?.completedCredits ?? 0) / (progress.requiredCredits?.PEC ?? 18)) * 100))}%`
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                <span>NPTEL: {progress.pec?.nptelTransferredCredits ?? 0} Cr | Regular: {progress.pec?.collegeCredits ?? 0} Cr</span>
                <span className="font-semibold text-slate-700">
                  {progress.pec?.remainingCredits ?? Math.max(0, (progress.requiredCredits?.PEC ?? 18) - (progress.completedCredits?.PEC ?? 0))} Cr left
                </span>
              </div>
            </div>

            {/* NPTEL Quota Card */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-emerald-900">NPTEL Transfer Quota</p>
                  <BadgeCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-emerald-950">
                    {progress.nptelCredits?.transferred || 0}
                  </span>
                  <span className="text-sm font-medium text-emerald-800">
                    / {progress.nptelCredits?.max || 15} Credits Transferred
                  </span>
                </div>
                <div className="w-full bg-emerald-200/60 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((progress.nptelCredits?.transferred || 0) / (progress.nptelCredits?.max || 15)) * 100))}%`
                    }}
                  />
                </div>
              </div>
              <div className="text-xs text-emerald-700 mt-3 pt-2 border-t border-emerald-200/50 font-medium">
                {progress.nptelCredits?.remaining ?? 15} credit(s) remaining for NPTEL transfer
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-slate-900">Available NPTEL Catalogue</h2>
              <span className="text-xs text-slate-500">{selectableCourses.length} available to enroll</span>
            </div>
            {selectableCourses.length === 0 ? (
              <p className="text-sm text-slate-500">No NPTEL courses available to enroll.</p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {selectableCourses.map((course) => (
                  <label
                    key={course.nptelCourseId}
                    className={`flex gap-3 items-start rounded-xl border p-3.5 transition ${
                      course.isEnrolled
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 text-indigo-600 rounded"
                      checked={selectedIds.includes(course.nptelCourseId) || course.isEnrolled}
                      onChange={() => handleSelect(course.nptelCourseId)}
                      disabled={course.isEnrolled}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{course.courseTitle}</p>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                          {course.credits} Credits
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        {course.courseCode}
                      </p>
                      {course.isEnrolled && (
                        <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1 font-medium">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          Already enrolled
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {selectableCourses.length > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleEnroll}
                  disabled={selectedCount === 0 || loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    selectedCount === 0 || loading
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                  }`}
                >
                  Enroll Selected ({selectedCount})
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">My Enrolled NPTEL Courses</h2>
            {enrolledList.length === 0 ? (
              <p className="text-sm text-slate-500">No enrolled NPTEL courses yet.</p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {enrolledList.map((enroll) => (
                  <div key={enroll.enrollmentId} className="rounded-xl border border-slate-200 p-4 bg-white shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{enroll.courseTitle}</p>
                        <p className="text-xs text-slate-600 mt-1 font-mono">
                          {enroll.courseCode} • {enroll.credits} Credits
                        </p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Clock3 className="w-3.5 h-3.5 text-indigo-500" />
                          Enrolled in Semester {enroll.semesterNumber}
                        </p>
                      </div>
                      {enroll.importedGrade ? (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold border border-emerald-300">
                          Grade: {enroll.importedGrade}
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                          Grade Pending
                        </span>
                      )}
                    </div>

                    {enroll.importedGrade && (!enroll.studentStatus || enroll.studentStatus === "pending") && (
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 font-medium">Ready for Credit Transfer</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setTransferModalData(enroll)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
                          >
                            Accept Credit
                          </button>
                          <button
                            onClick={() => handleStudentDecision(enroll.enrollmentId, "rejected")}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {enroll.studentStatus && enroll.studentStatus !== "pending" && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Credit Status:</span>
                        <span
                          className={`font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
                            enroll.studentStatus === "accepted"
                              ? enroll.creditType === "PEC"
                                ? "bg-violet-100 text-violet-800 border border-violet-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-red-100 text-red-700 border border-red-200"
                          }`}
                        >
                          {enroll.studentStatus === "accepted" ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {enroll.studentStatus === "accepted"
                            ? `Transferred as ${enroll.creditType || 'OEC'}`
                            : "Transfer Rejected"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credit Transfer Modal */}
      {transferModalData && (
        <TransferCreditModal
          enrollment={transferModalData}
          progress={progress}
          onClose={() => setTransferModalData(null)}
          onConfirm={(type) => handleStudentDecision(transferModalData.enrollmentId, "accepted", type)}
        />
      )}
    </div>
  );
};

const TransferCreditModal = ({ enrollment, progress, onClose, onConfirm }) => {
  const [selectedType, setSelectedType] = useState('OEC');
  const courseCredits = Number(enrollment?.credits || 3);

  const nptelTransferred = Number(progress?.nptelCredits?.transferred || 0);
  const nptelRemaining = Number(progress?.nptelCredits?.remaining ?? (15 - nptelTransferred));
  const isNptelLimitExceeded = nptelRemaining < courseCredits;

  const currentOecCredits = Number(progress?.completedCredits?.OEC ?? progress?.oec?.completedCredits ?? 0);
  const isOecLimitExceeded = (currentOecCredits + courseCredits) > 9;

  const currentPecCredits = Number(progress?.completedCredits?.PEC ?? progress?.pec?.completedCredits ?? 0);
  const isPecLimitExceeded = (currentPecCredits + courseCredits) > 18;

  const canConfirm = !isNptelLimitExceeded && (
    (selectedType === 'OEC' && !isOecLimitExceeded) ||
    (selectedType === 'PEC' && !isPecLimitExceeded)
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <h3 className="text-xl font-bold text-slate-900 mb-1">Transfer NPTEL Course Credit</h3>
        <p className="text-xs text-slate-500 mb-4">
          Select whether this course should fulfill an Open Elective (OEC) or Professional Elective (PEC).
        </p>

        <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
          <p className="text-sm font-bold text-slate-800">{enrollment.courseTitle}</p>
          <div className="flex gap-4 mt-2 text-xs text-slate-600 font-mono">
            <span>Code: <strong>{enrollment.courseCode}</strong></span>
            <span>Credits: <strong>{courseCredits}</strong></span>
            <span>Grade: <strong className="text-emerald-700">{enrollment.importedGrade}</strong></span>
          </div>
        </div>

        {/* Quota Indicators */}
        <div className="space-y-2 mb-4 text-xs">
          <div className="flex justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
            <span>NPTEL Transfer Limit (Max 15 Cr):</span>
            <span className="font-bold">{nptelTransferred} / 15 Credits ({nptelRemaining} left)</span>
          </div>
          <div className="flex justify-between p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900">
            <span>OEC Quota (Max 9 Cr total):</span>
            <span className="font-bold">{currentOecCredits} / 9 Credits</span>
          </div>
          <div className="flex justify-between p-2.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-900">
            <span>PEC Quota (Max 18 Cr total):</span>
            <span className="font-bold">{currentPecCredits} / 18 Credits</span>
          </div>
        </div>

        {/* Option Selection */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => setSelectedType('OEC')}
            disabled={isOecLimitExceeded || isNptelLimitExceeded}
            className={`p-3.5 rounded-xl border text-left transition ${
              selectedType === 'OEC'
                ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600"
                : "border-slate-200 hover:border-indigo-300"
            } ${isOecLimitExceeded ? "opacity-50 cursor-not-allowed bg-slate-100" : ""}`}
          >
            <p className="text-sm font-bold text-slate-900">Open Elective (OEC)</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {isOecLimitExceeded ? "Max 9 credits limit reached" : `Will make total: ${currentOecCredits + courseCredits}/9 Cr`}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('PEC')}
            disabled={isPecLimitExceeded || isNptelLimitExceeded}
            className={`p-3.5 rounded-xl border text-left transition ${
              selectedType === 'PEC'
                ? "border-violet-600 bg-violet-50/50 ring-2 ring-violet-600"
                : "border-slate-200 hover:border-violet-300"
            } ${isPecLimitExceeded ? "opacity-50 cursor-not-allowed bg-slate-100" : ""}`}
          >
            <p className="text-sm font-bold text-slate-900">Professional Elective (PEC)</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {isPecLimitExceeded ? "Max 18 credits limit reached" : `Will make total: ${currentPecCredits + courseCredits}/18 Cr`}
            </p>
          </button>
        </div>

        {isNptelLimitExceeded && (
          <p className="text-xs text-red-600 mb-4 bg-red-50 p-2 rounded-lg border border-red-200 font-medium">
            ⚠️ You cannot transfer this course. The maximum degree limit of 15 credits from NPTEL has been reached.
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedType)}
            disabled={!canConfirm}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
          >
            Confirm Transfer as {selectedType}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NptelSelection;

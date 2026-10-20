import React, { useState, useEffect, useCallback } from "react";
  import {
    FaCertificate,
    FaFileAlt,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaSyncAlt,
    FaSearch,
    FaTrash,
    FaEye,
    FaDownload,
    FaCheck,
    FaTimes,
    FaSpinner,
    FaIdCard,
    FaGraduationCap,
    FaMedal,
    FaCog,
  } from "react-icons/fa";
  import { toast } from "react-toastify";
  import API from "../../../api";
  import config from "../../../config";
  import { useAuth } from "../auth/AuthContext";

  const CertificateApprovalPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [stats, setStats] = useState({
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    });

    const [activeTab, setActiveTab] = useState("Pending"); // "Pending", "Approved", "Rejected", "All"
    const [categoryFilter, setCategoryFilter] = useState("All Categories");
    const [searchTerm, setSearchTerm] = useState("");
    const [actionInProgress, setActionInProgress] = useState(null);

    const backendUrl = config.backendUrl || "http://localhost:5173/institute_management_system";

    const fetchSubmissions = useCallback(async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        const response = await API.get("/student/certificates/staff/submissions");
        if (response.data.success) {
          setSubmissions(response.data.submissions || []);
          if (response.data.stats) {
            setStats(response.data.stats);
          }
        }
      } catch (error) {
        console.error("Error fetching ward submissions:", error);
        toast.error("Failed to load ward certificate submissions");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

    useEffect(() => {
      fetchSubmissions();
    }, [fetchSubmissions]);

    // Handle Approve
    const handleApprove = async (item) => {
      try {
        setActionInProgress(item.id);
        const response = await API.post("/student/certificates/staff/approve", {
          type: item.type,
          id: item.rawId,
        });

        if (response.data.success) {
          toast.success(`Approved ${item.documentName} for ${item.studentName}`);
          fetchSubmissions(true);
        }
      } catch (error) {
        console.error("Approval error:", error);
        toast.error("Failed to approve submission");
      } finally {
        setActionInProgress(null);
      }
    };

    // Handle Reject
    const handleReject = async (item) => {
      try {
        setActionInProgress(item.id);
        const response = await API.post("/student/certificates/staff/reject", {
          type: item.type,
          id: item.rawId,
        });

        if (response.data.success) {
          toast.info(`Rejected ${item.documentName}`);
          fetchSubmissions(true);
        }
      } catch (error) {
        console.error("Rejection error:", error);
        toast.error("Failed to reject submission");
      } finally {
        setActionInProgress(null);
      }
    };

    // Handle Clear (Permanently Delete)
    const handleClear = async (item) => {
      if (!window.confirm(`Are you sure you want to permanently delete this submission (${item.documentName})?`)) {
        return;
      }

      try {
        setActionInProgress(item.id);
        const response = await API.post("/student/certificates/staff/clear", {
          type: item.type,
          id: item.rawId,
        });

        if (response.data.success) {
          toast.success("Record permanently deleted");
          fetchSubmissions(true);
        }
      } catch (error) {
        console.error("Clear error:", error);
        toast.error("Failed to delete record");
      } finally {
        setActionInProgress(null);
      }
    };

    // Handle Clear All Rejected
    const handleClearAllRejected = async () => {
      if (!window.confirm("Are you sure you want to permanently delete all rejected submissions?")) return;

      try {
        setRefreshing(true);
        const response = await API.post("/student/certificates/staff/clear-all");
        if (response.data.success) {
          toast.success("All rejected submissions permanently deleted");
          fetchSubmissions(true);
        }
      } catch (error) {
        console.error("Clear all error:", error);
        toast.error("Failed to delete rejected submissions");
      } finally {
        setRefreshing(false);
      }
    };

    // View PDF
    const handleView = (filePath) => {
      if (!filePath) {
        toast.warning("No document file available");
        return;
      }
      const cleanBase = backendUrl.replace(/\/$/, "");
      const cleanPath = filePath.replace(/^\//, "");
      const url = filePath.startsWith("http") ? filePath : `${cleanBase}/${cleanPath}`;
      window.open(url, "_blank");
    };

    // Download PDF
    const handleDownload = (filePath, fileName) => {
      if (!filePath) {
        toast.warning("No document file available for download");
        return;
      }
      const cleanBase = backendUrl.replace(/\/$/, "");
      const cleanPath = filePath.replace(/^\//, "");
      const url = filePath.startsWith("http") ? filePath : `${cleanBase}/${cleanPath}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "document.pdf";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Filter submissions
    const filteredSubmissions = submissions.filter((item) => {
      // 1. Status Filter Tab
      if (activeTab !== "All" && item.status !== activeTab) {
        return false;
      }

      // 2. Category Filter
      if (categoryFilter !== "All Categories") {
        if (categoryFilter === "Academic" && item.category !== "Academic") return false;
        if (categoryFilter === "Personal ID" && item.category !== "Personal ID") return false;
        if (categoryFilter === "Extra-Curricular" && item.category !== "Extra-Curricular") return false;
        if (categoryFilter === "Semester Marksheets" && item.type !== "marksheet") return false;
      }

      // 3. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const name = (item.studentName || "").toLowerCase();
        const regNo = (item.registerNumber || "").toLowerCase();
        const doc = (item.documentName || "").toLowerCase();
        const dept = (item.department || "").toLowerCase();
        return name.includes(q) || regNo.includes(q) || doc.includes(q) || dept.includes(q);
      }

      return true;
    });

    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-2xl shadow-md shadow-indigo-100">
                <FaCertificate />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Ward Certificate & Marksheet Approval
                </h1>
                <p className="text-sm font-medium text-gray-500 mt-0.5">
                  Review, verify and approve marksheets and certificates submitted by your ward students
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchSubmissions(true)}
              disabled={refreshing}
              className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <FaSyncAlt className={`text-xs ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: TOTAL SUBMISSIONS */}
            <div
              onClick={() => setActiveTab("All")}
              className={`p-5 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer transition ${
                activeTab === "All"
                  ? "bg-indigo-50/50 border-2 border-indigo-500"
                  : "bg-white border border-gray-200 hover:shadow-md"
              }`}
            >
              <div>
                <p
                  className={`text-[11px] font-extrabold uppercase tracking-wider ${
                    activeTab === "All" ? "text-indigo-600" : "text-gray-500"
                  }`}
                >
                  TOTAL SUBMISSIONS
                </p>
                <h2 className="text-3xl font-black text-gray-900 mt-1">{stats.total}</h2>
              </div>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activeTab === "All" ? "bg-indigo-100 text-indigo-700" : "bg-indigo-50 text-indigo-600"
                }`}
              >
                <FaFileAlt className="text-base" />
              </div>
            </div>

            {/* Card 2: PENDING APPROVAL */}
            <div
              onClick={() => setActiveTab("Pending")}
              className={`p-5 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer transition ${
                activeTab === "Pending"
                  ? "bg-amber-50/40 border-2 border-amber-400"
                  : "bg-white border border-gray-200 hover:shadow-md"
              }`}
            >
              <div>
                <p className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider">
                  PENDING APPROVAL
                </p>
                <h2 className="text-3xl font-black text-gray-900 mt-1">{stats.pending}</h2>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100/70 flex items-center justify-center text-amber-600">
                <FaClock className="text-base" />
              </div>
            </div>

            {/* Card 3: APPROVED */}
            <div
              onClick={() => setActiveTab("Approved")}
              className={`p-5 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer transition ${
                activeTab === "Approved"
                  ? "bg-emerald-50/40 border-2 border-emerald-400"
                  : "bg-white border border-gray-200 hover:shadow-md"
              }`}
            >
              <div>
                <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">
                  APPROVED
                </p>
                <h2 className="text-3xl font-black text-gray-900 mt-1">{stats.approved}</h2>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100/70 flex items-center justify-center text-emerald-600">
                <FaCheckCircle className="text-base" />
              </div>
            </div>

            {/* Card 4: REJECTED */}
            <div
              onClick={() => setActiveTab("Rejected")}
              className={`p-5 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer transition ${
                activeTab === "Rejected"
                  ? "bg-rose-50/40 border-2 border-rose-400"
                  : "bg-white border border-gray-200 hover:shadow-md"
              }`}
            >
              <div>
                <p className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider">
                  REJECTED
                </p>
                <h2 className="text-3xl font-black text-gray-900 mt-1">{stats.rejected}</h2>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-100/70 flex items-center justify-center text-rose-600">
                <FaTimesCircle className="text-base" />
              </div>
            </div>
          </div>

          {/* Filter Controls Row */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Segmented Tab Buttons */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 w-full md:w-auto">
              {["Pending", "Approved", "Rejected", "All"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 md:flex-initial px-5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === tab
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search & Category Filter & Clear All */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {/* Category Dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs md:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-gray-700 cursor-pointer"
              >
                <option value="All Categories">All Categories</option>
                <option value="Academic">Academic</option>
                <option value="Personal ID">Personal ID</option>
                <option value="Extra-Curricular">Extra-Curricular</option>
                <option value="Semester Marksheets">Semester Marksheets</option>
              </select>

              {/* Search Input */}
              <div className="relative flex-1 sm:w-64">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search student, reg no, cert..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs md:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 placeholder-gray-400"
                />
              </div>

              {/* Clear All Button (Visible in Rejected Tab) */}
              {activeTab === "Rejected" && stats.rejected > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllRejected}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <FaTrash className="text-xs" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* Data Table / Empty State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-3" />
              <span className="text-gray-500 font-semibold text-sm">
                Loading ward submissions...
              </span>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            /* Empty State (Image 3) */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl mx-auto mb-4">
                <FaCog className="animate-[spin_6s_linear_infinite]" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">No Records Found</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-medium">
                No submissions match the selected filters or search query.
              </p>
            </div>
          ) : (
            /* Submissions Table (Image 4 & 5) */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1640px] table-fixed">
                  <colgroup>
                    <col style={{ width: "320px" }} />
                    <col style={{ width: "270px" }} />
                    <col style={{ width: "210px" }} />
                    <col style={{ width: "190px" }} />
                    <col style={{ width: "220px" }} />
                    <col style={{ width: "160px" }} />
                    <col style={{ width: "270px" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-white border-b border-gray-200 text-gray-700 text-xs font-black uppercase tracking-wider whitespace-nowrap">
                      <th className="py-4.5 pl-8 pr-6">STUDENT DETAILS</th>
                      <th className="py-4.5 px-6">RECORD / DOCUMENT</th>
                      <th className="py-4.5 px-6">CATEGORY</th>
                      <th className="py-4.5 px-6">RECEIVED / INFO</th>
                      <th className="py-4.5 px-6">STATUS</th>
                      <th className="py-4.5 px-6 text-center">DOCUMENT</th>
                      <th className="py-4.5 px-6 text-center">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSubmissions.map((item) => {
                      const isActing = actionInProgress === item.id;
                      const verifier = item.verifiedBy || user?.userName || "Staff";

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                          {/* STUDENT DETAILS */}
                          <td className="py-4.5 pl-8 pr-6">
                            <div className="flex items-center gap-3.5">
                              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0">
                                {item.initial}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-gray-900 leading-snug whitespace-nowrap">
                                  {item.studentName}
                                </p>
                                <p className="text-xs font-semibold text-indigo-600 mt-0.5 whitespace-nowrap">
                                  {item.registerNumber} • {item.department}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* RECORD / DOCUMENT */}
                          <td className="py-4.5 px-6">
                            <p className="font-bold text-sm text-gray-800 whitespace-nowrap">{item.documentName}</p>
                            {item.certificateNumber && (
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                #{item.certificateNumber}
                              </p>
                            )}
                          </td>

                          {/* CATEGORY */}
                          <td className="py-4.5 px-6">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                              {item.category === "Personal ID" ? (
                                <FaIdCard className="text-blue-500 text-sm" />
                              ) : item.category === "Academic" ? (
                                <FaGraduationCap className="text-indigo-500 text-sm" />
                              ) : (
                                <FaMedal className="text-amber-500 text-sm" />
                              )}
                              <span>{item.category}</span>
                            </div>
                          </td>

                          {/* RECEIVED / INFO */}
                          <td className="py-4.5 px-6">
                            <div className={`flex items-center gap-1 text-xs font-bold ${item.receivedStatus ? "text-emerald-600" : "text-amber-600"} whitespace-nowrap`}>
                              {item.receivedStatus ? (
                                <>
                                  <FaCheck className="text-[10px]" />
                                  <span>Received</span>
                                </>
                              ) : (
                                <span>Not Received</span>
                              )}
                            </div>
                            {item.issueDate && (
                              <p className="text-[11px] text-gray-400 mt-0.5 whitespace-nowrap">
                                Issued: {new Date(item.issueDate).toLocaleDateString()}
                              </p>
                            )}
                          </td>

                          {/* STATUS */}
                          <td className="py-4.5 px-6">
                            <div>
                              {item.status === "Approved" ? (
                                <div>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                    <FaCheckCircle className="text-emerald-500 text-[11px]" />
                                    Approved
                                  </span>
                                  <p className="text-[11px] text-gray-400 mt-1 font-medium whitespace-nowrap">
                                    by {verifier}
                                  </p>
                                </div>
                              ) : item.status === "Rejected" ? (
                                <div>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                                    <FaTimesCircle className="text-rose-500 text-[11px]" />
                                    Rejected
                                  </span>
                                  <p className="text-[11px] text-gray-400 mt-1 font-medium whitespace-nowrap">
                                    by {verifier}
                                  </p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  Pending
                                </span>
                              )}
                            </div>
                          </td>

                          {/* DOCUMENT (View & Download) */}
                          <td className="py-4.5 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleView(item.filePath)}
                                title="View Document"
                                className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition cursor-pointer"
                              >
                                <FaEye className="text-xs" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownload(item.filePath, item.fileName)}
                                title="Download Document"
                                className="p-2 text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition cursor-pointer"
                              >
                                <FaDownload className="text-xs" />
                              </button>
                            </div>
                          </td>

                          {/* ACTIONS */}
                          <td className="py-4.5 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isActing ? (
                                <FaSpinner className="animate-spin text-indigo-600 text-sm" />
                              ) : item.status === "Approved" ? (
                                /* Approved Row Action: Reject */
                                <button
                                  type="button"
                                  onClick={() => handleReject(item)}
                                  className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                                >
                                  <FaTimes className="text-[10px]" />
                                  <span>Reject</span>
                                </button>
                              ) : item.status === "Rejected" ? (
                                /* Rejected Row Actions: Approve & Clear */
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(item)}
                                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                                  >
                                    <FaCheck className="text-[10px]" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleClear(item)}
                                    className="flex items-center gap-1 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                                  >
                                    <span>Clear</span>
                                  </button>
                                </>
                              ) : (
                                /* Pending Row Actions: Approve & Reject */
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(item)}
                                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                                  >
                                    <FaCheck className="text-[10px]" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReject(item)}
                                    className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                                  >
                                    <FaTimes className="text-[10px]" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  export default CertificateApprovalPage;

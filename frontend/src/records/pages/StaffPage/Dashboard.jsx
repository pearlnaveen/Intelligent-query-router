import { getCareerObjectiveDescription, getCareerObjectiveLabel } from "../../utils/careerObjective";
import React, { useState } from "react";
import { Mail, Info, Check, X, Send, Bell, Eye, Search } from "lucide-react";
import {
  FaGraduationCap,
  FaIdCard,
  FaMedal,
  FaCheck,
  FaTimes,
  FaEye,
  FaDownload,
} from "react-icons/fa";
import { useDashboardContext } from "../../contexts/DashboardContext.jsx";
import { toast } from "react-toastify";
import config from "../../../config";
import API from "../../../api";

const Dashboard = () => {
  const {
    certificateApprovals = [],
    allCertificateApprovals = [],
    certificateStats = { total: 0, pending: 0, approved: 0, rejected: 0 },
    internships = [],
    scholarships = [],
    leaves = [],
    events = [],
    eventsAttended = [],
    onlineCourses = [],
    achievements = [],
    publications = [],
    competencyCoding = [],
    nonCGPA = [],
    projects = [],
    hackathons = [],
    extracurricular = [],
    selectedItem,
    showCommonMessage,
    email,
    commonMessage,
    actionType,
    notifications = [],
    isLoading,
    setState,
    handleSendMessage,
    handleAction,
    addNotification,
    removeNotification,
    fetchPendingData
  } = useDashboardContext();

  const [activeTab, setActiveTab] = useState("certificateApprovals");
  const [certStatusFilter, setCertStatusFilter] = useState("Pending");
  const [certCategoryFilter, setCertCategoryFilter] = useState("All Categories");
  const [certSearchTerm, setCertSearchTerm] = useState("");
  const backendUrl = config.backendUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:5173/institute_management_system";

  const tabs = [
    { id: "certificateApprovals", name: "Pending Certificate Approvals", data: Array.isArray(certificateApprovals) ? certificateApprovals : [] },
    { id: "internships", name: "Pending Internships", data: Array.isArray(internships) ? internships : [] },
    { id: "scholarships", name: "Pending Scholarships", data: Array.isArray(scholarships) ? scholarships : [] },
    { id: "leaves", name: "Pending Leaves", data: Array.isArray(leaves) ? leaves : [] },
    { id: "events", name: "Pending Events", data: Array.isArray(events) ? events : [] },
    { id: "eventsAttended", name: "Pending Events Attended", data: Array.isArray(eventsAttended) ? eventsAttended : [] },
    { id: "onlineCourses", name: "Pending Online Courses", data: Array.isArray(onlineCourses) ? onlineCourses : [] },
    //{ id: "achievements", name: "Pending Achievements", data: Array.isArray(achievements) ? achievements : [] },
    { id: "publications", name: "Pending Publications", data: Array.isArray(publications) ? publications : [] },
    { id: "competencyCoding", name: "Pending Coding Competency", data: Array.isArray(competencyCoding) ? competencyCoding : [] },
    { id: "nonCGPA", name: "Pending Non-CGPA Courses", data: Array.isArray(nonCGPA) ? nonCGPA : [] },
    { id: "projects", name: "Pending Projects", data: Array.isArray(projects) ? projects : [] },
    { id: "hackathons", name: "Pending Hackathons", data: Array.isArray(hackathons) ? hackathons : [] },
    { id: "extracurricular", name: "Pending Extracurricular", data: Array.isArray(extracurricular) ? extracurricular : [] }
  ];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setState(prev => ({ ...prev, selectedItem: null }));
  };

  const handleClearRejected = async () => {
    try {
      const isConfirmed = window.confirm("Are you sure you want to clear all rejected submissions?");
      if (!isConfirmed) return;
      
      const response = await API.post("/student/certificates/staff/clear-all");
      if (response.data.success) {
        toast.success("All rejected submissions cleared successfully.");
        if (fetchPendingData) fetchPendingData();
      } else {
        toast.error("Failed to clear rejected submissions.");
      }
    } catch (error) {
      console.error("Error clearing rejected submissions:", error);
      toast.error("Error clearing rejected submissions");
    }
  };

  const formatFieldName = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/(?:^|\s)\S/g, a => a.toUpperCase())
      .replace(/Id/g, '')
      .replace(/^Is /, '')
      .trim();
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "Not Provided";
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'None';
    }

    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(value).toLocaleDateString();
    }

    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return new Date(value).toLocaleString();
    }

    return value.toString();
  };

  const renderItemDetails = (item) => {
    if (!item) return <p className="text-sm text-gray-500">No details available</p>;

    if (item.approvetype === "certificate-approval") {
      const docPath = item.filePath
        ? `${backendUrl}/${encodeURI(item.filePath.replace(/^\/+/, ''))}`
        : null;

      return (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-1">Submission Information</h3>
            <div><span className="font-medium text-gray-700">Student Name:</span> {item.studentName || item.username || "N/A"}</div>
            <div><span className="font-medium text-gray-700">Registration Number:</span> {item.registerNumber || "N/A"}</div>
            <div><span className="font-medium text-gray-700">Department:</span> {item.department || "N/A"}</div>
            <div><span className="font-medium text-gray-700">Document Name:</span> {item.documentName || item.title || "N/A"}</div>
            <div><span className="font-medium text-gray-700">Type:</span> {item.type === "marksheet" ? "Semester Marksheet" : "Certificate"}</div>
            <div><span className="font-medium text-gray-700">Category:</span> {item.category || "Academic"}</div>
            {item.issueDate && <div><span className="font-medium text-gray-700">Issue Date:</span> {new Date(item.issueDate).toLocaleDateString()}</div>}
            {item.certificateNumber && <div><span className="font-medium text-gray-700">Certificate Number:</span> {item.certificateNumber}</div>}
            {item.createdAt && <div><span className="font-medium text-gray-700">Submitted At:</span> {new Date(item.createdAt).toLocaleString()}</div>}
          </div>
          {docPath && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3 border-b pb-1">Attached Document</h3>
              <a
                href={docPath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
              >
                <Eye size={16} /> View Uploaded Document
              </a>
            </div>
          )}
        </div>
      );
    }

    const getUploadPath = () => {
      switch (item.approvetype) {
        case 'certificate-approval': return '';
        case 'internship': return 'uploads/';
        case 'leave': return 'uploads/leaves/';
        case 'online-course': return 'uploads/certificates/';
        case 'achievement': return 'uploads/achievements/';
        case 'event-attended': return 'uploads/event/';
        case 'publication': return 'uploads/publications/';
        case 'project': return 'uploads/projects/';
        case 'hackathon': return 'uploads/hackathons/';
        case 'extracurricular': return 'uploads/extracurricular/';
        case 'noncgpa': return 'uploads/noncgpa/';
        default: return 'uploads/';
      }
    };
    const baseUploadPath = getUploadPath();

    const excludedFields = [
      "id", "_id", "_v", "__v", "created_at", "updated_at", "createdAt", "updatedAt",
      "Userid", "Created_by", "Updated_by", "pending", "tutor_approval_status",
      "Approved_by", "approved_at", "messages", "updated_by", "created_by",
      "approvetype", "approved_by", "staffId", "status", "studentId", "userId", "stateID", "districtID"
    ];

    const documentFieldsConfig = {
      'certificate-approval': ['filePath', 'document', 'certificate', 'certificate_file'],
      'internship': ['document', 'certificate'],
      'scholarship': ['document', 'proof'],
      'event': ['document'],
      'event-attended': ['certificate_file', 'memento_proof', 'cash_prize_proof'],
      'leave': ['document'],
      'online-course': ['certificate_file', 'certificates'],
      'achievement': ['certificate_file'],
      'publication': ['document', 'paper_link'],
      'project': ['document', 'report_file'],
      'hackathon': ['certificate', 'certificate_file'],
      'extracurricular': ['certificate', 'document'],
      'noncgpa': ['certificate', 'document_proof']
    };

    const renderDocumentLink = (value) => {
      if (!value) return "Not Provided";

      try {
        if (Array.isArray(value)) {
          if (value.length === 0) return "Not Provided";

          return (
            <div className="flex flex-col gap-1">
              {value.map((file, index) => {
                const stringValue = String(file);
                if (!stringValue.trim()) return null;

                const documentPath = stringValue.startsWith('uploads/')
                  ? stringValue
                  : `${baseUploadPath}${stringValue}`;

                return (
                  <a
                    key={index}
                    href={`${backendUrl}/${encodeURI(documentPath.replace(/\\/g, "/"))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    View Document {value.length > 1 ? index + 1 : ''}
                  </a>
                );
              })}
            </div>
          );
        }

        const stringValue = String(value);
        if (!stringValue.trim()) return "Not Provided";

        const documentPath = stringValue.startsWith('uploads/')
          ? stringValue
          : `${baseUploadPath}${stringValue}`;

        return (
          <a
            href={`${backendUrl}/${encodeURI(documentPath.replace(/\\/g, "/"))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            View Document
          </a>
        );
      } catch (error) {
        console.error("Error rendering document link:", error);
        return "Invalid Document";
      }
    };

    const renderField = (key) => {
      if (key === 'career_objective_details') {
        return (
          <div key={key} className="mb-2">
            <p className="text-sm font-medium text-gray-700">{getCareerObjectiveLabel(item.career_objectives)}:</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{getCareerObjectiveDescription(item) || 'Not provided'}</p>
          </div>
        );
      }
      const value = item[key];
      const displayKey = formatFieldName(key);
      const isDocumentField = documentFieldsConfig[item.approvetype]?.includes(key);

      if (isDocumentField) {
        return (
          <div key={key} className="mb-2">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{displayKey}:</span> {renderDocumentLink(value)}
            </p>
          </div>
        );
      }

      if (key === 'achievement_details' && value && typeof value === 'object') {
        return (
          <div key={key} className="mb-3">
            <h3 className="font-semibold text-gray-800 mb-1">{displayKey}:</h3>
            <div className="bg-gray-100 p-3 rounded-md">
              {Object.entries(value).map(([subKey, subValue]) => {
                const subDisplayKey = formatFieldName(subKey);
                const isSubDocField = ['memento_proof', 'cash_prize_proof', 'certificate_file'].includes(subKey);

                if (isSubDocField) {
                  const getDocumentValue = (val) => {
                    if (!val) return null;
                    if (typeof val === 'string') return val;
                    if (val.path) return val.path;
                    if (val.url) return val.url;
                    return null;
                  };

                  const documentValue = Array.isArray(subValue)
                    ? subValue.map(getDocumentValue).filter(Boolean)
                    : getDocumentValue(subValue);

                  if (!documentValue || (Array.isArray(documentValue) && documentValue.length === 0)) {
                    return (
                      <div key={subKey} className="mb-1">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{subDisplayKey}:</span> Not Provided
                        </p>
                      </div>
                    );
                  }

                  if (Array.isArray(documentValue)) {
                    return (
                      <div key={subKey} className="mb-1">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{subDisplayKey}:</span>
                          <div className="flex flex-col gap-1 mt-1">
                            {documentValue.map((file, index) => {
                              const documentPath = file.startsWith('uploads/')
                                ? file
                                : `uploads/event/${file}`;

                              return (
                                <a
                                  key={index}
                                  href={`${backendUrl}/${encodeURI(documentPath.replace(/\\/g, "/"))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:underline"
                                >
                                  View {subDisplayKey} {documentValue.length > 1 ? index + 1 : ''}
                                </a>
                              );
                            })}
                          </div>
                        </p>
                      </div>
                    );
                  }

                  const documentPath = documentValue.startsWith('uploads/')
                    ? documentValue
                    : `uploads/event/${documentValue}`;

                  return (
                    <div key={subKey} className="mb-1">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{subDisplayKey}:</span>
                        <a
                          href={`${backendUrl}/${encodeURI(documentPath.replace(/\\/g, "/"))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline ml-1"
                        >
                          View {subDisplayKey}
                        </a>
                      </p>
                    </div>
                  );
                }

                return (
                  <div key={subKey} className="mb-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{subDisplayKey}:</span> {formatValue(subValue)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      return (
        <div key={key} className="mb-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{displayKey}:</span> {formatValue(value)}
          </p>
        </div>
      );
    };

    const priorityFields = {
      'certificate-approval': ['studentName', 'registerNumber', 'department', 'documentName', 'category', 'type', 'certificateNumber', 'issueDate', 'receivedStatus'],
      'internship': ['username', 'registerNumber', 'company', 'position', 'duration', 'description'],
      'scholarship': ['username', 'registerNumber', 'institution_name', 'amount', 'duration', 'reason'],
      'event': ['username', 'registerNumber', 'event_name', 'event_type', 'description', 'from_date', 'to_date'],
      'event-attended': ['username', 'registerNumber', 'event_name', 'event_type', 'description', 'date', 'achievement_details'],
      'leave': ['username', 'registerNumber', 'reason', 'from_date', 'to_date', 'type'],
      'online-course': ['username', 'registerNumber', 'course_name', 'platform', 'duration', 'description'],
      'achievement': ['username', 'registerNumber', 'title', 'description', 'category', 'date', 'achievement_details'],
      'publication': ['username', 'registerNumber', 'title', 'publication_type', 'publication_name', 'publisher', 'doi', 'index_type', 'publication_date'],
      'competency-coding': ['username', 'registerNumber', 'competency_level', 'present_competency', 'career_objectives', 'career_objective_details', 'specialization_chosen', 'expected_ctc', 'communication_skills', 'gaps_description'],
      'noncgpa': ['username', 'registerNumber', 'category', 'course_name', 'course_code', 'credits_awarded', 'semester'],
      'project': ['username', 'registerNumber', 'project_title', 'domain', 'guide_name', 'description', 'project_status', 'start_date', 'end_date'],
      'hackathon': ['username', 'registerNumber', 'hackathon_name', 'project_title', 'domain', 'team_size', 'role', 'outcome', 'description', 'start_date', 'end_date'],
      'extracurricular': ['username', 'registerNumber', 'activity_name', 'activity_type', 'level', 'organized_by', 'role', 'description', 'achievement', 'start_date', 'end_date']
    };

    const allFields = Object.keys(item)
      .filter(key => !excludedFields.includes(key))
      .sort((a, b) => {
        const priorityA = priorityFields[item.approvetype]?.indexOf(a) ?? -1;
        const priorityB = priorityFields[item.approvetype]?.indexOf(b) ?? -1;

        if (priorityA !== -1 && priorityB !== -1) return priorityA - priorityB;
        if (priorityA !== -1) return -1;
        if (priorityB !== -1) return 1;
        return a.localeCompare(b);
      });

    const basicInfoFields = [];
    const documentFields = [];
    const otherFields = [];

    allFields.forEach(key => {
      if (priorityFields[item.approvetype]?.includes(key)) {
        basicInfoFields.push(key);
      } else if (documentFieldsConfig[item.approvetype]?.includes(key) || key === 'achievement_details') {
        documentFields.push(key);
      } else {
        otherFields.push(key);
      }
    });

    return (
      <div className="space-y-4">
        {basicInfoFields.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-1">Basic Information</h3>
            {basicInfoFields.map(renderField)}
          </div>
        )}

        {documentFields.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-1">Documents & Achievements</h3>
            {documentFields.map(renderField)}
          </div>
        )}

        {otherFields.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-1">Additional Information</h3>
            {otherFields.map(renderField)}
          </div>
        )}
      </div>
    );
  };

  const handleViewDocument = (filePath) => {
    if (!filePath) {
      toast.warning("No document file available");
      return;
    }
    const cleanBase = backendUrl.replace(/\/$/, "");
    const cleanPath = filePath.replace(/^\//, "");
    const url = filePath.startsWith("http") ? filePath : `${cleanBase}/${cleanPath}`;
    window.open(url, "_blank");
  };

  const handleDownloadDocument = (filePath, fileName) => {
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

  const renderPendingItems = (items = []) => {
    if (isLoading) {
      return <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>;
    }

    if (activeTab === "certificateApprovals") {
      const baseItems = allCertificateApprovals.length > 0 ? allCertificateApprovals : items;
      const filteredCertItems = (baseItems || []).filter((item) => {
        if (certStatusFilter !== "All" && item.status !== certStatusFilter) return false;

        // 1. Category Filter
        if (certCategoryFilter !== "All Categories") {
          if (certCategoryFilter === "Academic" && item.category !== "Academic") return false;
          if (certCategoryFilter === "Personal ID" && item.category !== "Personal ID") return false;
          if (certCategoryFilter === "Extra-Curricular" && item.category !== "Extra-Curricular") return false;
          if (certCategoryFilter === "Semester Marksheets" && item.type !== "marksheet") return false;
        }

        // 2. Search query
        if (certSearchTerm.trim()) {
          const q = certSearchTerm.toLowerCase();
          const name = (item.studentName || item.username || "").toLowerCase();
          const regNo = (item.registerNumber || "").toLowerCase();
          const doc = (item.documentName || item.title || "").toLowerCase();
          const dept = (item.department || "").toLowerCase();
          return name.includes(q) || regNo.includes(q) || doc.includes(q) || dept.includes(q);
        }

        return true;
      });

      return (
        <div className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div onClick={() => setCertStatusFilter("All")} className={`p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer transition ${certStatusFilter === "All" ? "bg-indigo-50/50 border-2 border-indigo-500" : "bg-white border border-gray-200 hover:shadow-md"}`}>
              <div>
                <p className={`text-[11px] font-extrabold uppercase tracking-wider ${certStatusFilter === "All" ? "text-indigo-600" : "text-gray-500"}`}>TOTAL SUBMISSIONS</p>
                <h2 className="text-2xl font-black text-gray-900 mt-1">{certificateStats.total || 0}</h2>
              </div>
            </div>
            <div onClick={() => setCertStatusFilter("Pending")} className={`p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer transition ${certStatusFilter === "Pending" ? "bg-amber-50/40 border-2 border-amber-400" : "bg-white border border-gray-200 hover:shadow-md"}`}>
              <div>
                <p className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider">PENDING APPROVAL</p>
                <h2 className="text-2xl font-black text-gray-900 mt-1">{certificateStats.pending || 0}</h2>
              </div>
            </div>
            <div onClick={() => setCertStatusFilter("Approved")} className={`p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer transition ${certStatusFilter === "Approved" ? "bg-emerald-50/40 border-2 border-emerald-400" : "bg-white border border-gray-200 hover:shadow-md"}`}>
              <div>
                <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">APPROVED</p>
                <h2 className="text-2xl font-black text-gray-900 mt-1">{certificateStats.approved || 0}</h2>
              </div>
            </div>
            <div onClick={() => setCertStatusFilter("Rejected")} className={`p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer transition ${certStatusFilter === "Rejected" ? "bg-rose-50/40 border-2 border-rose-400" : "bg-white border border-gray-200 hover:shadow-md"}`}>
              <div>
                <p className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider">REJECTED</p>
                <h2 className="text-2xl font-black text-gray-900 mt-1">{certificateStats.rejected || 0}</h2>
              </div>
            </div>
          </div>

          {/* Controls Bar: Tabs + Category Filter + Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            {/* Segmented Tab Buttons */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 w-full sm:w-auto">
              {["Pending", "Approved", "Rejected", "All"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCertStatusFilter(tab)}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    certStatusFilter === tab
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
              
              {certStatusFilter === "Rejected" && (
                <button
                  type="button"
                  onClick={handleClearRejected}
                  className="flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-rose-100 text-rose-700 hover:bg-rose-200 ml-2"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={certCategoryFilter}
                onChange={(e) => setCertCategoryFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer"
              >
                <option value="All Categories">All Categories</option>
                <option value="Academic">Academic</option>
                <option value="Semester Marksheets">Semester Marksheets</option>
                <option value="Personal ID">Personal ID</option>
                <option value="Extra-Curricular">Extra-Curricular</option>
              </select>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search student, reg no, cert..."
                value={certSearchTerm}
                onChange={(e) => setCertSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {filteredCertItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
              <p className="text-gray-500 font-medium text-sm">
                No pending certificate submissions match the selected criteria.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px] table-fixed">
                  <colgroup>
                    <col style={{ width: "290px" }} />
                    <col style={{ width: "250px" }} />
                    <col style={{ width: "190px" }} />
                    <col style={{ width: "180px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "220px" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-white border-b border-gray-200 text-gray-700 text-xs font-black uppercase tracking-wider whitespace-nowrap">
                      <th className="py-4 pl-6 pr-4">STUDENT DETAILS</th>
                      <th className="py-4 px-4">RECORD / DOCUMENT</th>
                      <th className="py-4 px-4">CATEGORY</th>
                      <th className="py-4 px-4">RECEIVED / INFO</th>
                      <th className="py-4 px-4">STATUS</th>
                      <th className="py-4 px-4 text-center">DOCUMENT</th>
                      <th className="py-4 px-4 text-center">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCertItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        {/* STUDENT DETAILS */}
                        <td className="py-4 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0">
                              {item.initial || (item.studentName ? item.studentName.charAt(0).toUpperCase() : "S")}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-gray-900 leading-snug whitespace-nowrap">
                                {item.studentName || item.username || "Student"}
                              </p>
                              <p className="text-xs font-semibold text-indigo-600 mt-0.5 whitespace-nowrap">
                                {item.registerNumber} {item.department ? `• ${item.department}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* RECORD / DOCUMENT */}
                        <td className="py-4 px-4">
                          <p className="font-bold text-sm text-gray-800 whitespace-nowrap">
                            {item.documentName || item.title || "Document"}
                          </p>
                          {item.certificateNumber && (
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              #{item.certificateNumber}
                            </p>
                          )}
                        </td>

                        {/* CATEGORY */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                            {item.category === "Personal ID" ? (
                              <FaIdCard className="text-blue-500 text-sm" />
                            ) : item.category === "Academic" ? (
                              <FaGraduationCap className="text-indigo-500 text-sm" />
                            ) : (
                              <FaMedal className="text-amber-500 text-sm" />
                            )}
                            <span>{item.category || "Academic"}</span>
                          </div>
                        </td>

                        {/* RECEIVED / INFO */}
                        <td className="py-4 px-4">
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
                        <td className="py-4 px-4">
                          {item.status === "Approved" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              Approved
                            </span>
                          ) : item.status === "Rejected" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Pending
                            </span>
                          )}
                        </td>

                        {/* DOCUMENT */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewDocument(item.filePath)}
                              title="View Document"
                              className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition cursor-pointer"
                            >
                              <FaEye className="text-xs" />
                            </button>
                            {item.filePath && (
                              <button
                                type="button"
                                onClick={() => handleDownloadDocument(item.filePath, item.fileName || `${item.documentName || "document"}.pdf`)}
                                title="Download Document"
                                className="p-2 text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition cursor-pointer"
                              >
                                <FaDownload className="text-xs" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {item.status !== "Approved" && (
                              <button
                                type="button"
                                onClick={() => handleAction(item, "approve")}
                                title="Approve"
                                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                              >
                                <FaCheck className="text-[10px]" />
                                <span>Approve</span>
                              </button>
                            )}
                            {item.status !== "Rejected" && (
                              <button
                                type="button"
                                onClick={() => handleAction(item, "reject")}
                                title="Reject"
                                className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                              >
                                <FaTimes className="text-[10px]" />
                                <span>Reject</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setState(prev => ({ ...prev, selectedItem: item, actionType: "info" }))}
                              title="Details"
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200 transition cursor-pointer"
                            >
                              <Info size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (!items || items.length === 0) {
      return <p className="text-sm text-gray-600">No pending items at the moment.</p>;
    }

    return items.map((item) => {
      const isCertificateApproval = activeTab === "certificateApprovals";
      const isOnlineCourse = activeTab === "onlineCourses";
      const isAchievement = activeTab === "achievements";
      const isHackathon = activeTab === "hackathons";
      const isProject = activeTab === "projects";
      const isExtracurricular = activeTab === "extracurricular";
      const isPublication = activeTab === "publications";
      const isNonCGPA = activeTab === "nonCGPA";

      const isCompetencyCoding = activeTab === "competencyCoding";

      const title = isCertificateApproval
        ? item.documentName || item.title || "Certificate / Marksheet"
        : isOnlineCourse
        ? item.course_name || item.name || "Online Course"
        : isAchievement
          ? item.title || item.achievement_name || "Achievement"
          : isHackathon
            ? item.hackathon_name || "Hackathon"
            : isProject
              ? item.project_title || "Project"
              : isExtracurricular
                ? item.activity_name || "Extracurricular Activity"
                : isPublication
                  ? item.title || "Publication"
                  : isNonCGPA
                    ? item.course_name || "Non-CGPA Course"
                    : isCompetencyCoding
                      ? item.competency_level || "Competency Record"
                      : item.username || item.name || item.event_name || "N/A";

      const subtitle = isCertificateApproval
        ? `${item.category || "Academic"} • ${item.type === "marksheet" ? "Semester Marksheet" : "Certificate"} • ${item.studentName || item.username || "Student"}${item.department ? ` (${item.department})` : ""}${item.certificateNumber ? ` | Cert No: ${item.certificateNumber}` : ""}`
        : isOnlineCourse
        ? `${item.platform ? `Platform: ${item.platform}` : ''}${item.duration ? ` | Duration: ${item.duration}` : ''}`
        : isAchievement
          ? `${item.description || ''}${item.category ? ` | Category: ${item.category}` : ''}`
          : isPublication
            ? `${item.publication_type || ''}${item.publisher ? ` | Publisher: ${item.publisher}` : ''}`
            : isProject
              ? `${item.domain || ''}${item.project_status ? ` | Status: ${item.project_status}` : ''}`
              : isNonCGPA
                ? `${item.category || ''}${item.credits_awarded ? ` | Credits: ${item.credits_awarded}` : ''}`
                : isCompetencyCoding
                  ? `Aptitude: ${item.skillrack_aptitude_score || "N/A"} | Rank: ${item.skillrack_rank || "N/A"}`
                  : item?.description || item?.reason || item?.club_name || item?.institution_name || "";

      return (
        <div
          key={item?.id || Math.random()}
          className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow flex justify-between items-center"
        >
          <div className="w-3/4">
            <p className="text-lg font-semibold text-gray-800">
              {title}
              {(item?.registerNumber || item?.registerNumber) && ` (Reg No: ${item.registerNumber || item.registerNumber})`}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {subtitle}
            </p>
          </div>
          <div className="flex space-x-2">
            {item.filePath && (
              <a
                href={`${backendUrl}/${item.filePath.replace(/^\/+/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View Document"
                className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
              >
                <Eye size={16} />
              </a>
            )}
            <button
              onClick={() => setState(prev => ({ ...prev, selectedItem: item, actionType: "info" }))}
              title="Details"
              className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              <Info size={16} />
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, selectedItem: item, actionType: "approve" }))}
              title="Approve"
              className="bg-green-500 text-white p-2 rounded-md hover:bg-green-600 transition-colors"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, selectedItem: item, actionType: "reject" }))}
              title="Reject"
              className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      );
    });
  };

  const currentTab = tabs.find(tab => tab.id === activeTab);
  const currentTabData = currentTab?.data || [];

  return (
    <div className="flex flex-col h-screen p-6 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Approval Dashboard</h1>
        <div className="flex space-x-4">
          <div className="relative">
            <Bell
              onClick={() => addNotification(`You have ${currentTabData.length} pending ${activeTab} to approve/reject.`)}
              className="text-gray-600 text-xl cursor-pointer hover:text-indigo-600 transition-colors"
            />
            {currentTabData.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 transform translate-x-1/2 -translate-y-1/2">
                {currentTabData.length}
              </span>
            )}
          </div>
          <Mail
            onClick={() => setState(prev => ({ ...prev, showCommonMessage: !prev.showCommonMessage }))}
            className="text-gray-600 text-xl cursor-pointer hover:text-indigo-600 transition-colors"
          />
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Notifications</h2>
          {notifications.map((notification) => (
            <div key={notification.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md transition-colors">
              <p className="text-sm text-gray-700">{notification.message}</p>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-red-500 hover:text-red-600 text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {showCommonMessage && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Send Warning / Response</h2>
          <input
            type="email"
            placeholder="Student Email"
            value={email}
            onChange={(e) => setState(prev => ({ ...prev, email: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3 text-sm"
          />
          <textarea
            placeholder="Enter your message..."
            value={commonMessage}
            onChange={(e) => setState(prev => ({ ...prev, commonMessage: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3 text-sm"
            rows="3"
          />
          <div className="flex justify-end space-x-2">
            <button
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-md hover:bg-indigo-600 transition-colors text-sm"
              onClick={() => handleSendMessage("Reply")}
            >
              Reply
            </button>
            <button
              className="bg-yellow-500 text-white px-4 py-1.5 rounded-md hover:bg-yellow-600 transition-colors text-sm"
              onClick={() => handleSendMessage("Warning")}
            >
              Warning
            </button>
          </div>
        </div>
      )}

      <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap ${activeTab === tab.id
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.name} ({tab.data.length})
          </button>
        ))}
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        <h1 className="text-xl font-bold text-gray-800">
          {currentTab?.name || "Pending Items"}
        </h1>
        {renderPendingItems(currentTabData)}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {actionType === "info" ? "Details" : actionType === "approve" ? "Approve" : "Reject"}
            </h2>

            {actionType === "info" ? (
              <>
                <div className="mb-4 bg-indigo-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">
                    <span className="font-semibold">Name:</span>{" "}
                    {selectedItem.username || selectedItem.name || selectedItem.event_name || selectedItem.course_name || selectedItem.title || "N/A"}
                  </p>
                  {selectedItem.registerNumber && (
                    <p className="text-sm font-medium text-gray-700">
                      <span className="font-semibold">Reg No:</span> {selectedItem.registerNumber}
                    </p>
                  )}
                </div>
                {renderItemDetails(selectedItem)}
              </>
            ) : (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">
                  Are you sure you want to {actionType} this?
                </p>
                <div className="flex items-center border border-gray-300 rounded-full p-2 bg-gray-100">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={commonMessage}
                    onChange={(e) => setState(prev => ({ ...prev, commonMessage: e.target.value }))}
                    className="flex-1 bg-transparent outline-none px-2 text-sm"
                  />
                  <Send
                    size={20}
                    className="text-indigo-600 cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => handleAction(selectedItem, actionType)}
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setState(prev => ({ ...prev, selectedItem: null, actionType: null }))}
              className="mt-4 bg-red-500 text-white px-4 py-1.5 rounded-md hover:bg-red-600 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;


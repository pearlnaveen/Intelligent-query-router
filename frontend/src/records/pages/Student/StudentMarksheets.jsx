import React, { useState, useEffect, useRef } from "react";
import {
  FaFileAlt,
  FaUpload,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaInfoCircle,
  FaSave,
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../../api";
import { useAuth } from "../auth/AuthContext";
import config from "../../../config";

const StudentMarksheets = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingRow, setUploadingRow] = useState(null);
  const [data, setData] = useState([]);
  const fileInputRefs = useRef({});

  const backendUrl = config.backendUrl || "http://localhost:5173/institute_management_system";

  // 8 Semesters + Overall
  const semesters = Array.from({ length: 8 }, (_, i) => ({
    badge: `S${i + 1}`,
    name: `Semester ${i + 1}`,
  }));
  semesters.push({ badge: "O", name: "Overall marksheet" });

  const fetchMarksheets = async () => {
    try {
      setLoading(true);
      const userId = user?.userId || user?.id || localStorage.getItem("userId");
      if (!userId) return;

      const endpoints = [
        `/student/marksheets/${userId}`,
        `/student-marksheets/${userId}`,
        `/student/marksheets/list?userId=${userId}`,
        `/student-marksheets/list?userId=${userId}`,
        `/marksheets/${userId}`,
        `/marksheet/${userId}`,
      ];

      let response;
      let lastError;
      for (const ep of endpoints) {
        try {
          response = await API.get(ep);
          if (response?.data?.success) break;
        } catch (err) {
          lastError = err;
          if (err.response?.status === 404) {
            continue;
          }
          throw err;
        }
      }

      if (response?.data?.success) {
        setData(response.data.marksheets || []);
      } else if (lastError) {
        throw lastError;
      }
    } catch (error) {
      console.error("Error fetching marksheets:", error);
      toast.error("Failed to load marksheet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMarksheets();
    }
  }, [user]);

  const getRecord = (name) => {
    return (
      data.find((d) => d.marksheetName === name && d.category === "Semester") || {
        marksheetName: name,
        category: "Semester",
        receivedStatus: false,
        issueDate: "",
        certificateNumber: "",
        file_path: null,
        file_name: null,
        verification_status: null,
      }
    );
  };

  const handleStatusChange = (name, isReceived) => {
    const record = getRecord(name);
    // Don't allow changing if already approved
    if (record.verification_status === "Approved") {
      toast.info("Approved marksheets cannot be modified.");
      return;
    }

    const existingIndex = data.findIndex(
      (d) => d.marksheetName === name && d.category === "Semester"
    );
    const newData = [...data];

    if (existingIndex > -1) {
      const current = newData[existingIndex];
      const hasFile = Boolean(current.file_path);
      newData[existingIndex] = {
        ...current,
        receivedStatus: isReceived,
        file_path: isReceived ? current.file_path : null,
        file_name: isReceived ? current.file_name : null,
        issueDate: isReceived ? current.issueDate : "",
        certificateNumber: isReceived ? current.certificateNumber : "",
        verification_status: isReceived && hasFile ? current.verification_status || "Pending" : null,
      };
    } else {
      newData.push({
        marksheetName: name,
        category: "Semester",
        receivedStatus: isReceived,
        issueDate: "",
        certificateNumber: "",
        file_path: null,
        file_name: null,
        verification_status: null,
      });
    }
    setData(newData);
  };

  const handleInputChange = (name, field, value) => {
    const record = getRecord(name);
    if (record.verification_status === "Approved") return;

    const existingIndex = data.findIndex(
      (d) => d.marksheetName === name && d.category === "Semester"
    );
    const newData = [...data];

    if (existingIndex > -1) {
      newData[existingIndex] = {
        ...newData[existingIndex],
        [field]: value,
      };
    } else {
      newData.push({
        marksheetName: name,
        category: "Semester",
        receivedStatus: true,
        issueDate: "",
        certificateNumber: "",
        file_path: null,
        file_name: null,
        verification_status: null,
        [field]: value,
      });
    }
    setData(newData);
  };

  const handleFileUpload = async (name, file) => {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      toast.error("Please upload a valid PDF or image marksheet.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size must be under 15MB.");
      return;
    }

    try {
      setUploadingRow(name);
      const userId = user?.userId || user?.id || localStorage.getItem("userId");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("marksheet", file);
      if (userId) formData.append("userId", userId);
      formData.append("marksheetName", name);
      formData.append("category", "Semester");

      const uploadEndpoints = [
        "/student/marksheets/upload",
        "/student-marksheets/upload",
        "/student/marksheet/upload",
        "/student-marksheet/upload",
        "/marksheets/upload",
        "/marksheet/upload",
      ];

      let response;
      let lastErr;
      for (const ep of uploadEndpoints) {
        try {
          response = await API.post(ep, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          if (response?.data?.success) break;
        } catch (uploadErr) {
          lastErr = uploadErr;
          if (uploadErr.response?.status === 404) {
            continue;
          }
          throw uploadErr;
        }
      }

      if (!response && lastErr) {
        throw lastErr;
      }

      if (response?.data?.success) {
        const { filePath, fileName } = response.data;
        const existingIndex = data.findIndex(
          (d) => d.marksheetName === name && d.category === "Semester"
        );
        const newData = [...data];

        if (existingIndex > -1) {
          newData[existingIndex] = {
            ...newData[existingIndex],
            file_path: filePath,
            file_name: fileName,
            receivedStatus: true,
            verification_status: "Pending",
          };
        } else {
          newData.push({
            marksheetName: name,
            category: "Semester",
            receivedStatus: true,
            issueDate: "",
            certificateNumber: "",
            file_path: filePath,
            file_name: fileName,
            verification_status: "Pending",
          });
        }

        setData(newData);
        toast.success(`Uploaded ${fileName} for ${name}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.message || "Failed to upload marksheet file");
    } finally {
      setUploadingRow(null);
    }
  };

  const handleViewFile = (filePath) => {
    if (!filePath) return;
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      window.open(filePath, "_blank");
      return;
    }
    const cleanPath = filePath.replace(/^\//, "");
    const baseApi = API.defaults.baseURL || backendUrl;
    const cleanBase = baseApi.replace(/\/$/, "");
    const url = `${cleanBase}/${cleanPath}`;
    window.open(url, "_blank");
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const userId = user?.userId || user?.id || localStorage.getItem("userId");

      // Prepare data for all 8 semesters + overall
      const recordsToSave = semesters.map((sem) => {
        const rec = getRecord(sem.name);
        const isReceived = rec.receivedStatus === true;
        const hasFile = Boolean(rec.file_path && String(rec.file_path).trim() !== "");
        return {
          marksheetName: sem.name,
          category: "Semester",
          receivedStatus: isReceived,
          issueDate: isReceived ? rec.issueDate || null : null,
          certificateNumber: isReceived ? rec.certificateNumber || null : null,
          file_path: isReceived && hasFile ? rec.file_path : null,
          file_name: isReceived && hasFile ? rec.file_name : null,
        };
      });

      const updateEndpoints = [
        "/student/marksheets/update",
        "/student-marksheets/update",
        "/student/marksheet/update",
        "/student-marksheet/update",
        "/marksheets/update",
        "/marksheet/update",
      ];

      let response;
      let lastErr;
      for (const ep of updateEndpoints) {
        try {
          response = await API.post(ep, {
            userId,
            marksheets: recordsToSave,
          });
          if (response?.data?.success) break;
        } catch (saveErr) {
          lastErr = saveErr;
          if (saveErr.response?.status === 404) {
            continue;
          }
          throw saveErr;
        }
      }

      if (!response && lastErr) {
        throw lastErr;
      }

      if (response?.data?.success) {
        toast.success(response.data.message || "Marksheets updated successfully and sent for tutor verification!");
        if (response.data.marksheets) {
          setData(response.data.marksheets);
        } else {
          fetchMarksheets();
        }
      }
    } catch (error) {
      console.error("Error saving marksheets:", error);
      toast.error(error.response?.data?.message || "Failed to save marksheet records");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-2xl shadow-md shadow-indigo-100">
            <FaFileAlt />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
              Semester Marksheets
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-0.5">
              Keep your semester marksheet records updated for tutor verification.
            </p>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-3" />
            <span className="text-gray-500 font-semibold text-sm">Loading marksheets...</span>
          </div>
        ) : (
          /* Table Container with Horizontal Scroll */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1540px] table-fixed">
                <colgroup>
                  <col style={{ width: "240px" }} />
                  <col style={{ width: "140px" }} />
                  <col style={{ width: "180px" }} />
                  <col style={{ width: "220px" }} />
                  <col style={{ width: "240px" }} />
                  <col style={{ width: "280px" }} />
                  <col style={{ width: "220px" }} />
                </colgroup>
                <thead>
                  <tr className="bg-white border-b border-slate-300 divide-x divide-slate-300 text-gray-700 text-xs font-black uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3 px-6 text-left">SEMESTER</th>
                    <th className="py-3 px-6 text-center">RECEIVED</th>
                    <th className="py-3 px-6 text-center">NOT RECEIVED</th>
                    <th className="py-3 px-6 text-left">ISSUE DATE</th>
                    <th className="py-3 px-6 text-left">CERTIFICATE NO.</th>
                    <th className="py-3 px-6 text-left">UPLOAD MARKSHEET</th>
                    <th className="py-3 px-6 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-x divide-slate-300">
                  {semesters.map((sem) => {
                    const record = getRecord(sem.name);
                    const isApproved = record.verification_status === "Approved";
                    const isReceived = record.receivedStatus === true;
                    const isUploadingThis = uploadingRow === sem.name;

                    // Format date value for input (YYYY-MM-DD)
                    let formattedDate = "";
                    if (record.issueDate) {
                      try {
                        formattedDate = new Date(record.issueDate).toISOString().split("T")[0];
                      } catch {
                        formattedDate = record.issueDate;
                      }
                    }

                    return (
                      <tr
                        key={sem.name}
                        className="hover:bg-gray-50/70 transition-colors divide-x divide-slate-300"
                      >
                        {/* Semester Badge & Name */}
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                                isApproved
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-indigo-100 text-indigo-700"
                              }`}
                            >
                              {sem.badge}
                            </span>
                            <span className="font-bold text-sm text-gray-800 whitespace-nowrap">
                              {sem.name}
                            </span>
                          </div>
                        </td>

                        {/* Received Radio */}
                        <td className="py-3 px-6 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="radio"
                              name={`received-${sem.name}`}
                              checked={isReceived}
                              disabled={isApproved}
                              onChange={() => handleStatusChange(sem.name, true)}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </label>
                        </td>

                        {/* Not Received Radio */}
                        <td className="py-3 px-6 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="radio"
                              name={`received-${sem.name}`}
                              checked={record.receivedStatus === false}
                              disabled={isApproved}
                              onChange={() => handleStatusChange(sem.name, false)}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </label>
                        </td>

                        {/* Issue Date */}
                        <td className="py-3 px-6">
                          {isReceived ? (
                            <input
                              type="date"
                              value={formattedDate}
                              disabled={isApproved}
                              onChange={(e) =>
                                handleInputChange(sem.name, "issueDate", e.target.value)
                              }
                              className="w-full text-xs md:text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-700 transition"
                            />
                          ) : (
                            <div className="h-9"></div>
                          )}
                        </td>

                        {/* Certificate Number */}
                        <td className="py-3 px-6">
                          {isReceived ? (
                            <input
                              type="text"
                              placeholder="Enter #No"
                              value={record.certificateNumber || ""}
                              disabled={isApproved}
                              onChange={(e) =>
                                handleInputChange(sem.name, "certificateNumber", e.target.value)
                              }
                              className="w-full text-xs md:text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-700 placeholder-gray-400 transition"
                            />
                          ) : (
                            <div className="h-9"></div>
                          )}
                        </td>

                        {/* Upload Marksheet */}
                        <td className="py-3 px-6">
                          {!isReceived ? (
                            <div className="text-center text-gray-300 font-bold text-lg">—</div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                {/* Hidden File Input */}
                                <input
                                  type="file"
                                  accept=".pdf,application/pdf"
                                  disabled={isApproved}
                                  ref={(el) => (fileInputRefs.current[sem.name] = el)}
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleFileUpload(sem.name, e.target.files[0]);
                                    }
                                  }}
                                />

                                {/* Upload PDF Button */}
                                <button
                                  type="button"
                                  disabled={isApproved || isUploadingThis}
                                  onClick={() => fileInputRefs.current[sem.name]?.click()}
                                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all ${
                                    isApproved
                                      ? "bg-indigo-300 cursor-not-allowed opacity-60"
                                      : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer"
                                  }`}
                                  title={
                                    isApproved
                                      ? "Marksheet has been approved by tutor and cannot be replaced"
                                      : "Upload PDF Marksheet"
                                  }
                                >
                                  {isUploadingThis ? (
                                    <FaSpinner className="animate-spin text-sm" />
                                  ) : (
                                    <FaUpload className="text-xs" />
                                  )}
                                  <span>{isUploadingThis ? "Uploading..." : "Upload PDF"}</span>
                                </button>

                                {/* Eye view button if file exists */}
                                {record.file_path && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewFile(record.file_path)}
                                    title="View uploaded PDF"
                                    className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg border border-indigo-100 transition cursor-pointer"
                                  >
                                    <FaEye className="text-xs" />
                                  </button>
                                )}

                                {!record.file_path && !isUploadingThis && (
                                  <span className="text-xs text-gray-400 font-medium">No file</span>
                                )}
                              </div>

                              {/* Uploaded File Name (Visible, but not clickable) */}
                              {record.file_path && (
                                <div
                                  className="text-xs text-gray-600 flex items-center gap-1.5 font-medium truncate max-w-[220px] select-text cursor-default"
                                  title={record.file_name || "marksheet.pdf"}
                                >
                                  <span className="text-gray-400">📄</span>
                                  <span className="truncate">
                                    {record.file_name || "marksheet.pdf"}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Approval Status */}
                        <td className="py-3 px-6 text-center">
                          {!isReceived ? (
                            <span className="text-gray-300 font-bold text-lg">—</span>
                          ) : isApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <FaCheckCircle className="text-emerald-500 text-[11px]" />
                              Approved
                            </span>
                          ) : record.verification_status === "Rejected" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <FaTimesCircle className="text-rose-500 text-[11px]" />
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Bar */}
            <div className="p-4 md:p-6 bg-white border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-indigo-700 text-xs md:text-sm font-medium">
                <FaInfoCircle className="text-base text-indigo-600 flex-shrink-0" />
                <span>
                  Saving will send a notification to your allocated tutor. Approved records cannot be edited.
                </span>
              </div>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-sm transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {saving ? (
                  <FaSpinner className="animate-spin text-sm" />
                ) : (
                  <FaSave className="text-xs" />
                )}
                <span>{saving ? "Saving Records..." : "Save All Records"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentMarksheets;

import React, { useState, useRef } from "react";
import {
  FaUpload,
  FaEye,
  FaTrash,
  FaGraduationCap,
  FaIdCard,
  FaTrophy,
  FaDownload,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaSpinner,
  FaFileAlt,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { useCertificateContext } from "../../contexts/CertificateContext";
import config from "../../../config";
import { useAuth } from "../auth/AuthContext";

const StudentCertificate = () => {
  const [activeTab, setActiveTab] = useState("academic");
  const [uploadingName, setUploadingName] = useState(null);
  const fileInputRefs = useRef({});

  const { user } = useAuth();
  const { certificates, loading, uploadCertificate, deleteCertificate, fetchCertificates } =
    useCertificateContext();

  const backendUrl = config.backendUrl || "http://localhost:5173/institute_management_system";

  // Certificate categories with 10th and 12th marksheets separated
  const certificateCategories = {
    academic: [
      "10th Marksheet",
      "12th Marksheet",
      "Diploma Certificate",
      "Degree Certificate",
      "Transfer Certificate (TC)",
      "Course Completion Certificate",
      "Internship Certificate",
    ],
    personal: [
      "Aadhar Card / National ID",
      "Birth Certificate",
      "Passport",
      "Driving License",
      "Voter ID",
      "Pan Card",
    ],
    extracurricular: [
      "Online Course Certificates",
      "Hackathon Participation",
      "Sports Certificates",
      "Cultural Event Certificates",
      "Language Proficiency Certificates",
    ],
  };

  // Map activeTab to backend ENUM values
  const categoryMap = {
    academic: "Academic",
    personal: "Personal ID",
    extracurricular: "Extra-Curricular",
  };

  // Filter certificates by selected category
  const filteredCertificates = Array.isArray(certificates)
    ? certificates.filter((cert) => cert.certificate_type === categoryMap[activeTab])
    : [];

  // Find uploaded record for a specific certificate name
  const getUploadedRecord = (certName) => {
    return (
      certificates.find(
        (c) =>
          c.certificate_name === certName &&
          c.certificate_type === categoryMap[activeTab]
      ) ||
      certificates.find((c) => c.certificate_name === certName) ||
      null
    );
  };

  // Handle file selection and upload
  const handleFileSelect = async (file, certificateType) => {
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("Please upload only PDF files.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should not exceed 5MB.");
      return;
    }

    try {
      setUploadingName(certificateType);
      await uploadCertificate(file, categoryMap[activeTab], certificateType);
      if (fetchCertificates) {
        fetchCertificates();
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploadingName(null);
    }
  };

  // View certificate in new tab
  const handleViewCertificate = (filePath) => {
    if (!filePath) return;
    const cleanBase = backendUrl.replace(/\/$/, "");
    const cleanPath = filePath.replace(/^\//, "");
    const url = filePath.startsWith("http") ? filePath : `${cleanBase}/${cleanPath}`;
    window.open(url, "_blank");
  };

  // Download certificate
  const handleDownloadCertificate = (filePath, fileName) => {
    if (!filePath) return;
    const cleanBase = backendUrl.replace(/\/$/, "");
    const cleanPath = filePath.replace(/^\//, "");
    const url = filePath.startsWith("http") ? filePath : `${cleanBase}/${cleanPath}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "certificate.pdf";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete certificate (if pending/rejected)
  const handleDeleteCertificate = async (id) => {
    if (window.confirm("Are you sure you want to delete this certificate?")) {
      await deleteCertificate(id);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Title */}
        <div className="text-center mb-2">
          <h1 className="text-3xl md:text-4xl font-black text-indigo-700 tracking-tight">
            Student Certificates
          </h1>
        </div>

        {/* 3 Main Category Tabs */}
        <div className="flex justify-center items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("academic")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm md:text-base font-bold transition-all cursor-pointer shadow-sm ${
              activeTab === "academic"
                ? "bg-indigo-600 text-white shadow-indigo-100 ring-2 ring-indigo-600/30"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <FaGraduationCap className="text-base" />
            <span>Academic</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm md:text-base font-bold transition-all cursor-pointer shadow-sm ${
              activeTab === "personal"
                ? "bg-indigo-600 text-white shadow-indigo-100 ring-2 ring-indigo-600/30"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <FaIdCard className="text-base" />
            <span>Personal ID</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("extracurricular")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm md:text-base font-bold transition-all cursor-pointer shadow-sm ${
              activeTab === "extracurricular"
                ? "bg-indigo-600 text-white shadow-indigo-100 ring-2 ring-indigo-600/30"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <FaTrophy className="text-base" />
            <span>Extra-Curricular</span>
          </button>
        </div>

        {/* Upload Cards Section */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2.5">
              {activeTab === "academic" && <FaGraduationCap className="text-indigo-600" />}
              {activeTab === "personal" && <FaIdCard className="text-indigo-600" />}
              {activeTab === "extracurricular" && <FaTrophy className="text-indigo-600" />}
              <span>
                Upload {activeTab === "academic" && "Academic Certificates"}
                {activeTab === "personal" && "Personal Documents"}
                {activeTab === "extracurricular" && "Extra-Curricular Certificates"}
              </span>
            </h2>
            <div className="flex items-center gap-2 mt-2 text-xs md:text-sm text-indigo-700 font-medium">
              <FaInfoCircle className="text-indigo-600 flex-shrink-0" />
              <span>
                After uploading, an approval request will be sent to your allocated tutor automatically.
                Uploading again replaces the previous file.
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {certificateCategories[activeTab].map((certName) => {
              const uploadedCert = getUploadedRecord(certName);
              const isApproved = uploadedCert?.verification_status === "Approved";
              const isRejected = uploadedCert?.verification_status === "Rejected";
              const isPending = uploadedCert && !isApproved && !isRejected;
              const isUploading = uploadingName === certName;

              return (
                <div
                  key={certName}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  {/* Top Row: Title + Status Badge */}
                  {/* Top Row: Title */}
                  <div className="flex items-center justify-between gap-2 min-h-[28px]">
                    <span
                      className="text-gray-900 font-bold text-sm leading-snug"
                      title={certName}
                    >
                      {certName}
                    </span>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-1">
                    {/* Hidden Native File Input */}
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      disabled={isApproved}
                      ref={(el) => (fileInputRefs.current[certName] = el)}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileSelect(e.target.files[0], certName);
                          e.target.value = "";
                        }
                      }}
                    />

                    {/* Main Upload / Replace / Approved Button */}
                    <button
                      type="button"
                      disabled={isApproved || isUploading}
                      onClick={() => fileInputRefs.current[certName]?.click()}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold shadow-sm transition-all ${
                        isApproved
                          ? "bg-indigo-300 text-white cursor-not-allowed opacity-60"
                          : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white cursor-pointer"
                      }`}
                      title={
                        isApproved
                          ? "Certificate has been approved by tutor and cannot be replaced"
                          : uploadedCert
                          ? "Replace existing uploaded PDF"
                          : "Upload PDF Certificate"
                      }
                    >
                      {isUploading ? (
                        <>
                          <FaSpinner className="animate-spin text-xs" />
                          <span>Uploading...</span>
                        </>
                      ) : isApproved ? (
                        <>
                          <FaCheckCircle className="text-xs" />
                          <span>Approved</span>
                        </>
                      ) : uploadedCert ? (
                        <>
                          <FaUpload className="text-xs" />
                          <span>Replace PDF</span>
                        </>
                      ) : (
                        <>
                          <FaUpload className="text-xs" />
                          <span>Upload PDF</span>
                        </>
                      )}
                    </button>

                    {/* Eye View Button (Available if file exists) */}
                    {uploadedCert?.certificate_file && (
                      <button
                        type="button"
                        onClick={() => handleViewCertificate(uploadedCert.certificate_file)}
                        title="View uploaded PDF"
                        className="p-2.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition cursor-pointer shrink-0"
                      >
                        <FaEye className="text-sm" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Uploaded Certificates Table Section */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-6">
            Uploaded Certificates ({filteredCertificates.length})
          </h3>

          {loading ? (
            <div className="text-center py-12">
              <FaSpinner className="animate-spin text-3xl text-indigo-600 mx-auto mb-2" />
              <p className="text-gray-500 font-semibold text-sm">Loading certificates...</p>
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <FaFileAlt className="text-4xl text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium text-sm">
                No certificates uploaded yet for this category.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full text-left border-collapse table-fixed min-w-[720px]">
                <colgroup>
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "32%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "24%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-indigo-600 text-white text-xs font-black uppercase tracking-wider">
                    <th className="py-3.5 px-5">Certificate Type</th>
                    <th className="py-3.5 px-4">File Name</th>
                    <th className="py-3.5 px-4 text-center">Upload Date</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredCertificates.map((cert, idx) => {
                    const isApproved = cert.verification_status === "Approved";
                    const isRejected = cert.verification_status === "Rejected";

                    // Extract a clean file name
                    const rawFileName =
                      cert.certificate_file?.split("/")?.pop() ||
                      cert.certificate_file ||
                      "certificate.pdf";

                    const uploadDate = cert.createdAt
                      ? new Date(cert.createdAt).toLocaleDateString()
                      : "N/A";

                    return (
                      <tr key={cert.id || idx} className="hover:bg-gray-50/70 transition-colors">
                        {/* Certificate Type */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2 font-bold text-sm text-gray-900 truncate">
                            <span className="text-indigo-600 text-base shrink-0">📄</span>
                            <span className="truncate" title={cert.certificate_name}>
                              {cert.certificate_name}
                            </span>
                          </div>
                        </td>

                        {/* File Name (Unclickable) */}
                        <td className="py-4 px-4">
                          <div
                            className="flex items-center gap-2 text-xs md:text-sm font-medium text-gray-700 truncate max-w-full select-text cursor-default"
                            title={rawFileName}
                          >
                            <span className="text-gray-400 shrink-0">📄</span>
                            <span className="truncate">{rawFileName}</span>
                          </div>
                        </td>

                        {/* Upload Date */}
                        <td className="py-4 px-4 text-center text-xs md:text-sm font-medium text-gray-600 whitespace-nowrap">
                          {uploadDate}
                        </td>

                        {/* Approval Status */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            {isApproved ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                  <FaCheckCircle className="text-emerald-500 text-[11px]" />
                                  Approved
                                </span>
                                <p className="text-[11px] text-emerald-600 mt-1 font-medium whitespace-nowrap">
                                  Approved by tutor
                                </p>
                              </div>
                            ) : isRejected ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                                  <FaTimesCircle className="text-rose-500 text-[11px]" />
                                  Rejected
                                </span>
                                <p className="text-[11px] text-rose-600 mt-1 font-medium whitespace-nowrap">
                                  Rejected by tutor
                                </p>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  Pending
                                </span>
                                <p className="text-[11px] text-amber-600 mt-1 font-medium whitespace-nowrap">
                                  Awaiting tutor review
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCertificate;

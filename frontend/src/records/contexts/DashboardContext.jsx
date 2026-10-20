import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../pages/auth/AuthContext";
import API from "../../api";

const DashboardContext = createContext();

const approvalTypes = {
  internship: { endpoint: "internships", stateKey: "internships", name: "Internship" },
  scholarship: { endpoint: "scholarships", stateKey: "scholarships", name: "Scholarship" },
  event: { endpoint: "events", stateKey: "events", name: "Event" },
  "event-attended": { endpoint: "events-attended", stateKey: "eventsAttended", name: "Event Attended" },
  leave: { endpoint: "student-leave", stateKey: "leaves", name: "Leave" },
  "online-course": { endpoint: "online-courses", stateKey: "onlineCourses", name: "Online Course" },
  publication: { endpoint: "publications", stateKey: "publications", name: "Publication" },
  "competency-coding": { endpoint: "competency-coding", stateKey: "competencyCoding", name: "Competency Coding" },
  noncgpa: { endpoint: "noncgpa", stateKey: "nonCGPA", name: "Non CGPA" },
  project: { endpoint: "projects", stateKey: "projects", name: "Project" },
  hackathon: { endpoint: "hackathon", stateKey: "hackathons", name: "Hackathon" },
  extracurricular: { endpoint: "extracurricular", stateKey: "extracurricular", name: "Extracurricular" },
  "certificate-approval": { endpoint: "student/certificates/staff", stateKey: "certificateApprovals", name: "Certificate Approval" }
};

const safeFilter = (data, staffId, isAdmin) => {
  if (!Array.isArray(data)) return [];
  if (isAdmin) return data;
  return data.filter(item => item && String(item?.staffId) === String(staffId));
};

export const DashboardProvider = ({ children }) => {
  const [pendingData, setPendingData] = useState({
    certificateApprovals: [],
    internships: [],
    scholarships: [],
    events: [],
    eventsAttended: [],
    leaves: [],
    onlineCourses: [],
    achievements: [],
    publications: [],
    competencyCoding: [],
    nonCGPA: [],
    projects: [],
    hackathons: [],
    extracurricular: []
  });

  const [state, setState] = useState({
    selectedItem: null,
    showCommonMessage: false,
    email: "",
    commonMessage: "",
    actionType: null,
    isLoading: false,
    notifications: [],
    error: null
  });

  const { user } = useAuth();
  const staffId = user?.userId || user?.id || "";
  const isAdmin = user?.role === 'Admin' || user?.roleName === 'Admin';

  const fetchPendingData = useCallback(async () => {
    if (!staffId) {
      // Silently return if not authenticated
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const endpoints = [
        "/pending-internships",
        "/pending-scholarships",
        "/event-organized/pending",
        "/event-attended/pending",
        "/all/pending-leaves",
        "/online-courses/pending",
        "/publications/pending",
        "/competency-coding/pending",
        "/noncgpa/pending",
        "/projects/pending",
        "/hackathon/pending",
        "/extracurricular/pending"
      ];

      const responses = await Promise.all(
        endpoints.map(async endpoint => {
          try {
            const response = await API.get(endpoint);
            return response.data;
          } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            return { data: [] }; // Return empty array structure if request fails
          }
        })
      );

      let pendingCertificates = [];
      let allCertificates = [];
      let certificateStats = { total: 0, pending: 0, approved: 0, rejected: 0 };
      try {
        let certRes;
        try {
          certRes = await API.get("/student/certificates/staff/submissions");
        } catch (cErr) {
          if (cErr.response?.status === 404) {
            certRes = await API.get("/student-certificate/staff/submissions");
          } else {
            throw cErr;
          }
        }
        if (certRes?.data?.success && Array.isArray(certRes.data.submissions)) {
          certificateStats = certRes.data.stats || certificateStats;
          allCertificates = certRes.data.submissions.map(item => ({
              id: item.id,
              rawId: item.rawId,
              type: item.type,
              approvetype: "certificate-approval",
              username: item.studentName,
              studentName: item.studentName,
              name: item.studentName,
              registerNumber: item.registerNumber,
              department: item.department,
              documentName: item.documentName,
              title: item.documentName,
              category: item.category,
              filePath: item.filePath,
              document: item.filePath,
              certificate: item.filePath,
              certificate_file: item.filePath,
              fileName: item.fileName,
              issueDate: item.issueDate,
              certificateNumber: item.certificateNumber,
              receivedStatus: item.receivedStatus,
              status: item.status,
              verifiedBy: item.verifiedBy,
              initial: item.initial || (item.studentName ? item.studentName.charAt(0).toUpperCase() : "S"),
              createdAt: item.createdAt,
            }));
          pendingCertificates = allCertificates.filter(s => s.status === "Pending");
        }
      } catch (certFetchErr) {
        console.error("Error fetching certificate approvals in DashboardContext:", certFetchErr);
      }

      setPendingData({
        certificateStats,
        allCertificateApprovals: allCertificates,
        certificateApprovals: pendingCertificates,
        internships: safeFilter(responses[0]?.internships || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "internship"
        })),
        scholarships: safeFilter(responses[1]?.scholarships || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "scholarship"
        })),
        events: safeFilter(responses[2]?.events || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "event"
        })),
        eventsAttended: safeFilter(responses[3]?.events || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "event-attended"
        })),
        leaves: safeFilter(responses[4]?.leaves || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "leave"
        })),
        onlineCourses: safeFilter(responses[5]?.courses || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "online-course"
        })),
        achievements: [],
        publications: safeFilter(responses[6]?.publications || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "publication"
        })),
        competencyCoding: safeFilter(responses[7]?.competencyRecords || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "competency-coding"
        })),
        nonCGPA: safeFilter(responses[8]?.records || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "noncgpa"
        })),
        projects: safeFilter(responses[9]?.projects || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "project"
        })),
        hackathons: safeFilter(responses[10]?.events || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "hackathon"
        })),
        extracurricular: safeFilter(responses[11]?.activities || [], staffId, isAdmin).map(item => ({
          ...item,
          approvetype: "extracurricular"
        }))
      });
      console.log("DashboardContext Fetched Data! staffId:", staffId, "user:", user);
      console.log("responses[0] (internships):", responses[0]);
    } catch (error) {
      console.error("Error in fetchPendingData:", error);
      setState(prev => ({ ...prev, error: error.message }));
      toast.error("Error loading dashboard data");
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [staffId, isAdmin]);

  const handleSendMessage = useCallback(async (type) => {
    if (!state.email || !state.commonMessage) {
      toast.error("Please enter an email and message.");
      return;
    }

    try {
      const isConfirmed = window.confirm(`Are you sure you want to send this ${type}?`);
      if (!isConfirmed) return;

      const response = await API.post("/messages/send", {
        email: state.email,
        message: state.commonMessage,
        type
      });

      if (response.status !== 200 && response.status !== 201) throw new Error("Failed to send message");

      toast.success(`${type} sent successfully.`);
      setState(prev => ({
        ...prev,
        email: "",
        commonMessage: "",
        showCommonMessage: false
      }));
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      toast.error("Error sending message");
    }
  }, [state.email, state.commonMessage]);

  const handleAction = useCallback(async (item, action) => {
    if (!item?.approvetype || !item?.id) {
      toast.error("Invalid item data");
      return;
    }

    // Special handling for Certificate & Marksheet Approvals
    if (item.approvetype === "certificate-approval") {
      try {
        const isConfirmed = window.confirm(`Are you sure you want to ${action} ${item.documentName || "this submission"} for ${item.studentName || "student"}?`);
        if (!isConfirmed) return;

        const actionPath = action === "approve"
          ? "/student/certificates/staff/approve"
          : "/student/certificates/staff/reject";

        let response;
        try {
          response = await API.post(actionPath, {
            type: item.type,
            id: item.rawId,
          });
        } catch (postErr) {
          if (postErr.response?.status === 404) {
            const fallbackPath = action === "approve"
              ? "/student-certificate/staff/approve"
              : "/student-certificate/staff/reject";
            response = await API.post(fallbackPath, {
              type: item.type,
              id: item.rawId,
            });
          } else {
            throw postErr;
          }
        }

        if (response.data.success) {
          toast.success(`${item.documentName || "Certificate"} ${action}d successfully.`);
          setPendingData(prev => {
            const newStatus = action === "approve" ? "Approved" : "Rejected";
            return {
              ...prev,
              certificateApprovals: (prev.certificateApprovals || []).filter(req => req.id !== item.id),
              allCertificateApprovals: (prev.allCertificateApprovals || []).map(req => 
                req.id === item.id ? { ...req, status: newStatus } : req
              ),
              certificateStats: {
                ...prev.certificateStats,
                pending: Math.max(0, (prev.certificateStats?.pending || 1) - 1),
                approved: action === "approve" ? (prev.certificateStats?.approved || 0) + 1 : (prev.certificateStats?.approved || 0),
                rejected: action === "reject" ? (prev.certificateStats?.rejected || 0) + 1 : (prev.certificateStats?.rejected || 0),
              }
            };
          });
          setState(prev => ({
            ...prev,
            selectedItem: null,
            actionType: null,
            commonMessage: ""
          }));
        } else {
          toast.error(response.data.message || `Failed to ${action} item`);
        }
      } catch (err) {
        console.error("Error in certificate approval handleAction:", err);
        toast.error(`Error processing ${action}`);
      }
      return;
    }

    try {
      const isConfirmed = window.confirm(`Are you sure you want to ${action} this ${item.approvetype}?`);
      if (!isConfirmed) return;

      const { endpoint, stateKey } = approvalTypes[item.approvetype] || {};
      if (!endpoint) throw new Error("Invalid approval type");

      let approveUrl = `/${endpoint}/${item.id}/approve`;
      let putBody = {
        approved: action === "approve",
        message: state.commonMessage,
        Userid: staffId, // Include Userid for backward compatibility if needed
      };

      const response = await API.put(approveUrl, putBody);

      if (response.status !== 200 && response.status !== 201) throw new Error("Failed to process request");

      toast.success(`Request ${action}d successfully.`);

      // Update the local state to remove the processed item
      if (stateKey) {
        setPendingData(prev => ({
          ...prev,
          [stateKey]: (prev[stateKey] || []).filter(req => req.id !== item.id)
        }));
      }

      setState(prev => ({
        ...prev,
        selectedItem: null,
        actionType: null,
        commonMessage: ""
      }));
    } catch (error) {
      console.error("Error in handleAction:", error);
      toast.error("Error processing request");
    }
  }, [state.commonMessage, staffId]);

  const addNotification = useCallback((message) => {
    setState(prev => ({
      ...prev,
      notifications: [...(prev.notifications || []), { id: Date.now(), message }]
    }));
  }, []);

  const removeNotification = useCallback((id) => {
    setState(prev => ({
      ...prev,
      notifications: (prev.notifications || []).filter(n => n.id !== id)
    }));
  }, []);

  useEffect(() => {
    let interval;
    try {
      fetchPendingData();
      interval = setInterval(fetchPendingData, 5 * 60 * 1000);
    } catch (error) {
      console.error("Error initializing dashboard:", error);
    }
    return () => clearInterval(interval);
  }, [fetchPendingData]);

  const contextValue = {
    ...pendingData,
    ...state,
    setState,
    handleSendMessage,
    handleAction,
    addNotification,
    removeNotification,
    staffId,
    fetchPendingData
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboardContext must be used within a DashboardProvider");
  }
  return context;
};


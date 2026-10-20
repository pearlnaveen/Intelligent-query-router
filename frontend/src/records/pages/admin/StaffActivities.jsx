import React, { useState, useEffect, useRef } from "react";
import { 
  FaSearch, 
  FaUserTie, 
  FaUndo, 
  FaFileExport, 
  FaUsers, 
  FaFileUpload, 
  FaCalendarAlt, 
  FaCertificate, 
  FaBook, 
  FaAward, 
  FaUserGraduate, 
  FaChevronDown, 
  FaFilter,
  FaEye,
  FaFileAlt,
  FaExternalLinkAlt
} from "react-icons/fa";
import { useAuth } from "../auth/AuthContext";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5173/institute_management_system";

const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    ...options?.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { credentials: "include", ...options, headers });
};

const getStaffDepartment = (staff, departments = []) => {
  if (!staff) return "N/A";

  const directAcr = staff.Deptacronym || staff.departmentAcr || (typeof staff.department === "string" ? staff.department : null);
  if (directAcr && directAcr !== "N/A" && directAcr !== "Staff") return directAcr;

  if (staff.department && typeof staff.department === "object") {
    const nestedAcr = staff.department.Deptacronym || staff.department.departmentAcr || staff.department.departmentName;
    if (nestedAcr && nestedAcr !== "N/A" && nestedAcr !== "Staff") return nestedAcr;
  }

  const staffDeptId = staff.departmentId ?? staff.Deptid;
  if (staffDeptId !== undefined && staffDeptId !== null && departments && departments.length > 0) {
    const matchedDept = departments.find(
      (dept) => String(dept.departmentId ?? dept.Deptid) === String(staffDeptId)
    );
    if (matchedDept) {
      const deptAcr = matchedDept.Deptacronym || matchedDept.departmentAcr || matchedDept.departmentName || matchedDept.Deptname;
      if (deptAcr && deptAcr !== "N/A") return deptAcr;
    }
  }

  if (staff.departmentName && staff.departmentName !== "N/A") return staff.departmentName;

  return "N/A";
};

function AdminPanel() {
  const { user } = useAuth();
  const userRole = (user?.role || user?.roleName || "").toLowerCase();
  const userDeptAcr = (user?.departmentAcr || user?.department?.departmentAcr || user?.department || "").toUpperCase();

  const isSuperAdmin = userRole === "superadmin" || userRole === "admin";
  const isCseAdmin = isSuperAdmin || userDeptAcr === "CSE" || (user?.username || "").toLowerCase().includes("cse") || userRole.includes("cse");

  const [departments, setDepartments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [staffData, setStaffData] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  // Filter states
  const [searchStaffName, setSearchStaffName] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [searchActivity, setSearchActivity] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Autocomplete & Dropdown Refs
  const [showStaffAutocomplete, setShowStaffAutocomplete] = useState(false);
  const autocompleteRef = useRef(null);
  const activityFieldsRef = useRef(null);

  // Activity field selection states
  const [availableActivityFields, setAvailableActivityFields] = useState([]);
  const [selectedActivityFields, setSelectedActivityFields] = useState([]);
  const [isActivityFieldsDropdownOpen, setIsActivityFieldsDropdownOpen] = useState(false);
  const [activityColumns, setActivityColumns] = useState([]);
  
  // UI states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('staff');

  // Text Modal state
  const [detailModal, setDetailModal] = useState({ isOpen: false, title: "", content: "" });
  const [staffActivityModal, setStaffActivityModal] = useState({
    isOpen: false,
    staff: null,
    loading: false,
    data: null,
    selectedTab: 'All',
    error: null
  });

  const activityList = [
    { name: 'Scholars', table: 'scholars' },
    { name: 'Consultancy', table: 'consultancy_proposals' },
    { name: 'Funded Project', table: 'project_proposals' },
    { name: 'Seed Money', table: 'seed_money' },
    { name: 'Events Attended', table: 'events_attended' },
    { name: 'Industry Knowhow', table: 'industry_knowhow' },
    { name: 'Certification Courses', table: 'staff_certification_courses' },
    { name: 'Publications', table: 'book_chapters' },
    { name: 'Conference Details', table: 'conference_details' },
    { name: 'Events Organized', table: 'events_organized' },
    { name: 'H-Index', table: 'h_index' },
    { name: 'Resource Person', table: 'resource_person' },
    { name: 'Recognition', table: 'recognition_appreciation' },
    { name: 'Membership', table: 'memberships' },
    { name: 'Patent/Product Development', table: 'patent_product' },
    { name: 'Project Mentors', table: 'project_mentors' },
    { name: 'Education', table: 'education' },
    { name: 'Personal Information', table: 'personal_information' },
    { name: 'MOU', table: 'mou' },
    { name: 'TLP Management', table: 'tlp_activities' },
    { name: 'Club Activity', table: 'activities' }
  ];

  const ensureArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data === null || data === undefined) return [];
    return [data];
  };

  const getValidValue = (...vals) => {
    for (const v of vals) {
      if (
        v !== undefined &&
        v !== null &&
        String(v).trim() !== '' &&
        String(v).trim() !== 'N/A' &&
        String(v).trim() !== 'undefined' &&
        String(v).trim() !== 'null'
      ) {
        return String(v).trim();
      }
    }
    return 'N/A';
  };

  // Close autocomplete & dropdowns on click outside (mouse + touch)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowStaffAutocomplete(false);
      }
      if (activityFieldsRef.current && !activityFieldsRef.current.contains(event.target)) {
        setIsActivityFieldsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Fetch available fields for selected activity
  const fetchActivityFields = async (activityName) => {
    try {
      const activity = activityList.find(act => act.name === activityName);
      if (!activity) {
        setAvailableActivityFields([]);
        setSelectedActivityFields([]);
        return;
      }

      const response = await authFetch(`${backendUrl}/admin-panel/activity-data/${activity.table}`);
      if (!response.ok) throw new Error(`Failed to fetch ${activityName} fields`);
      const fieldsData = await response.json();
      const cols = ensureArray(fieldsData?.columns);

      const defaultFields = ['s_no', 'staff_name', 'staff_id', 'department'];
      const selectableFields = [...new Set(cols.filter(field => 
        !['s_no', 'staff_name', 'staff_id', 'department', 'id', 'userid', 'user_id', 'forum', 'created_at', 'createdat', 'updated_at', 'updatedat', 'created_by', 'updated_by', 'proof_available', 'proof_file_name'].includes(field.toLowerCase())
      ))];

      setAvailableActivityFields(selectableFields);
      setSelectedActivityFields(defaultFields);
    } catch (error) {
      console.error(`Error fetching ${activityName} fields:`, error);
      setError(`Failed to load fields for ${activityName}`);
      setAvailableActivityFields([]);
      setSelectedActivityFields(['s_no', 'staff_name', 'staff_id', 'department']);
    }
  };

  const fallbackDepartments = [
    { departmentId: '1', departmentAcr: 'CSE', departmentName: 'Computer Science & Engineering' },
    { departmentId: '2', departmentAcr: 'ECE', departmentName: 'Electronics & Communication Engineering' },
    { departmentId: '3', departmentAcr: 'EEE', departmentName: 'Electrical & Electronics Engineering' },
    { departmentId: '4', departmentAcr: 'MECH', departmentName: 'Mechanical Engineering' },
    { departmentId: '5', departmentAcr: 'CIVIL', departmentName: 'Civil Engineering' },
    { departmentId: '6', departmentAcr: 'IT', departmentName: 'Information Technology' },
    { departmentId: '7', departmentAcr: 'AI&DS', departmentName: 'Artificial Intelligence & Data Science' }
  ];

  // Helper to determine logged-in admin's mapped department
  const getUserAssignedDept = (deptList = departments) => {
    if (isSuperAdmin) return null;

    const rawUserDept = (
      user?.departmentAcr ||
      user?.department?.departmentAcr ||
      user?.departmentName ||
      user?.department?.departmentName ||
      user?.department ||
      userDeptAcr ||
      ""
    ).toString().toUpperCase();

    const userDeptId = (user?.departmentId || user?.Deptid || "").toString();

    const activeList = deptList.length > 0 ? deptList : fallbackDepartments;

    const match = activeList.find((d) => {
      const dId = String(d.departmentId || d.Deptid || "");
      const dAcr = String(d.departmentAcr || d.Deptacronym || "").toUpperCase();
      const dName = String(d.departmentName || d.Deptname || "").toUpperCase();

      return (
        (userDeptId && dId === userDeptId) ||
        (rawUserDept && dAcr === rawUserDept) ||
        (rawUserDept && dName.includes(rawUserDept)) ||
        (rawUserDept && rawUserDept.includes(dAcr))
      );
    });

    if (match) {
      return {
        deptId: String(match.departmentId || match.Deptid),
        deptAcr: String(match.departmentAcr || match.Deptacronym).toUpperCase(),
        deptName: String(match.departmentName || match.Deptname),
      };
    }

    return { deptId: userDeptId || rawUserDept, deptAcr: rawUserDept, deptName: rawUserDept };
  };

  // Fetch departments from database with fallback
  const fetchDepartments = async () => {
    try {
      const response = await authFetch(`${backendUrl}/admin-panel/departments`);
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      let deptList = ensureArray(data);
      if (deptList.length === 0) {
        deptList = fallbackDepartments;
      }
      setDepartments(deptList);
      return deptList;
    } catch (error) {
      console.error('Error fetching departments, using default list:', error);
      setDepartments(fallbackDepartments);
      return fallbackDepartments;
    }
  };

  // Fetch staff data from database
  const fetchStaffData = async (departmentId = null) => {
    try {
      const activeDept = departmentId !== null ? departmentId : (userDeptAcr || "");
      const params = activeDept ? `?departmentId=${activeDept}` : '';
      const response = await authFetch(`${backendUrl}/admin-panel/staff-with-activities${params}`);
      if (!response.ok) throw new Error('Failed to fetch staff data');
      const data = await response.json();
      const staffArray = ensureArray(data);
      setStaffData(staffArray);
      setFilteredData(staffArray);
      return staffArray;
    } catch (error) {
      console.error('Error fetching staff data:', error);
      setError('Failed to load staff data');
      setStaffData([]);
      setFilteredData([]);
      return [];
    }
  };

  // Fetch activity-specific data with selected fields and dates
  const fetchActivityData = async (activityName, departmentId = null, staffName = null, fields = null, fDate = fromDate, tDate = toDate, staffUserId = null) => {
    try {
      const activity = activityList.find(act => act.name === activityName);
      if (!activity) {
        setActivityData([]);
        setFilteredData([]);
        setActivityColumns([]);
        return;
      }

      const activeDept = departmentId !== null ? departmentId : (userDeptAcr || "");

      const params = new URLSearchParams();
      if (activeDept) params.append('departmentId', activeDept);
      if (staffUserId) params.append('userId', staffUserId);
      else if (staffName) params.append('staffName', staffName);
      if (fDate) params.append('fromDate', fDate);
      if (tDate) params.append('toDate', tDate);
      if (fields && fields.length > 0) params.append('fields', fields.join(','));

      const response = await authFetch(`${backendUrl}/admin-panel/activity-data/${activity.table}?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch ${activityName} data: ${errorText}`);
      }

      const responseData = await response.json();
      if (!responseData?.data || !Array.isArray(responseData.columns)) {
        throw new Error('Invalid response structure from server');
      }

      const activityArray = ensureArray(responseData.data);
      const columnsArray = ensureArray(responseData.columns);

      setActivityData(activityArray);
      setActivityColumns(columnsArray);
      setFilteredData(activityArray);
      setViewMode('activity');
    } catch (error) {
      console.error(`Error fetching ${activityName} data:`, error);
      setError(`Failed to load ${activityName} data: ${error.message}`);
      setActivityData([]);
      setFilteredData([]);
      setActivityColumns([]);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setError(null);
      try {
        const deptList = await fetchDepartments();
        
        let initialDept = "";
        if (!isSuperAdmin) {
          const assigned = getUserAssignedDept(deptList);
          initialDept = assigned?.deptId || assigned?.deptAcr || "";
          setSearchDepartment(initialDept);
        }
        
        await fetchStaffData(initialDept);
        setActivities(activityList);
      } catch (error) {
        console.error('Error initializing data:', error);
        setError('Failed to initialize staff activities for department');
        setActivities(activityList);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user, userDeptAcr]);

  // Responsive items per page
  useEffect(() => {
    const updateItemsPerPage = () => {
      if (window.innerWidth < 768) {
        setItemsPerPage(5);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(8);
      } else {
        setItemsPerPage(10);
      }
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  // Handle activity change
  const handleActivityChange = (activityName) => {
    setSearchActivity(activityName);
    setSelectedActivityFields([]);
    setAvailableActivityFields([]);
    if (activityName) {
      fetchActivityFields(activityName);
      fetchActivityData(activityName, searchDepartment, searchStaffName, null, fromDate, toDate);
    } else {
      setViewMode('staff');
      fetchStaffData(searchDepartment);
    }
  };

  // Handle department change
  const handleDepartmentChange = (departmentId) => {
    setSearchDepartment(departmentId);
    if (searchActivity) {
      fetchActivityData(searchActivity, departmentId, searchStaffName, selectedActivityFields, fromDate, toDate);
    } else {
      fetchStaffData(departmentId);
    }
  };

  // Handle activity field selection & auto-close
  const handleActivityFieldToggle = (fieldName) => {
    const defaultFields = ['s_no', 'staff_name', 'staff_id', 'department'];
    if (defaultFields.includes(fieldName.toLowerCase())) {
      return;
    }

    setSelectedActivityFields((prev) => {
      if (prev.includes(fieldName)) {
        return prev.filter(f => f !== fieldName);
      } else {
        return [...prev, fieldName];
      }
    });
  };

  // Select/Deselect all activity fields & auto-close
  const handleSelectAllActivityFields = () => {
    const defaultFields = ['s_no', 'staff_name', 'staff_id', 'department'];
    if (selectedActivityFields.length === (availableActivityFields.length + defaultFields.length)) {
      setSelectedActivityFields(defaultFields);
    } else {
      setSelectedActivityFields([...defaultFields, ...availableActivityFields]);
    }
    setIsActivityFieldsDropdownOpen(false);
  };

  // Handle search
  const handleSearch = async () => {
    // Date Range Validation: From Date cannot be greater than To Date
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      const msg = "From Date cannot be greater than To Date";
      setError(msg);
      alert(msg);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (searchActivity) {
        await fetchActivityData(searchActivity, searchDepartment, searchStaffName, selectedActivityFields, fromDate, toDate);
      } else {
        const staffArray = await fetchStaffData(searchDepartment);
        let filtered = staffArray;

        if (searchStaffName.trim() !== "") {
          const q = searchStaffName.toLowerCase().trim();
          filtered = filtered.filter(staff => 
            (staff.username || "").toLowerCase().includes(q) || 
            (staff.staffId || "").toLowerCase().includes(q)
          );
        }

        setFilteredData(filtered);
        setViewMode('staff');
      }
      setCurrentPage(1);
    } catch (error) {
      console.error('Error during search:', error);
      setError('Search failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset filters
  const resetFilters = async () => {
    setSearchStaffName("");
    
    let defaultDept = "";
    if (!isSuperAdmin) {
      const assigned = getUserAssignedDept(departments);
      defaultDept = assigned?.deptId || assigned?.deptAcr || "";
    }
    
    setSearchDepartment(defaultDept);
    setSearchActivity("");
    setFromDate("");
    setToDate("");
    setSelectedActivityFields([]);
    setAvailableActivityFields([]);
    setCurrentPage(1);
    setViewMode('staff');
    setActivityColumns([]);
    setError(null);
    setLoading(true);
    try {
      await fetchStaffData(defaultDept);
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const handleExportToExcel = async () => {
    try {
      const dataToExport = ensureArray(filteredData);
      const effectiveViewMode = searchActivity ? 'activity' : viewMode;

      if (effectiveViewMode === 'staff' && dataToExport.length === 0) {
        alert('No data to export');
        return;
      }

      let exportData = dataToExport;
      if (effectiveViewMode === 'staff') {
        exportData = dataToExport.map(staff => ({
          ...staff,
          department: getStaffDepartment(staff, departments)
        }));
      }

      const defaultFields = ['s_no', 'staff_name', 'staff_id', 'department'];
      let exportColumns = effectiveViewMode === 'activity' ? activityColumns : null;
      if (effectiveViewMode === 'activity') {
        const activeFields = selectedActivityFields.length > 0 ? selectedActivityFields : availableActivityFields;
        exportColumns = [
          ...defaultFields,
          ...activeFields.filter(col => !defaultFields.includes(col.toLowerCase()))
        ];
        exportColumns = [...new Set(exportColumns)];
      }

      const exportPayload = {
        viewMode: effectiveViewMode,
        filters: {
          staffName: searchStaffName,
          department: searchDepartment,
          activity: searchActivity,
          fromDate,
          toDate,
          selectedActivityFields
        },
        data: exportData,
        columns: exportColumns
      };

      const response = await authFetch(`${backendUrl}/admin-panel/export-excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportPayload),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${viewMode === 'activity' ? (searchActivity || 'activity').replace(/\s+/g, '_') : 'staff'}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Handle opening full staff activity breakdown modal
  const handleOpenStaffActivityModal = async (staff) => {
    setStaffActivityModal({
      isOpen: true,
      staff,
      loading: true,
      data: null,
      selectedTab: 'All',
      error: null
    });

    try {
      const response = await authFetch(
        `${backendUrl}/admin-panel/staff-all-activities-detail?userId=${staff.Userid}&staffId=${staff.staffId || ''}&fromDate=${fromDate || ''}&toDate=${toDate || ''}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch staff activity history');
      }
      const result = await response.json();
      setStaffActivityModal({
        isOpen: true,
        staff: result.staff || staff,
        loading: false,
        data: result,
        selectedTab: 'All',
        error: null
      });
    } catch (err) {
      console.error('Error fetching staff activities:', err);
      setStaffActivityModal({
        isOpen: true,
        staff,
        loading: false,
        data: null,
        selectedTab: 'All',
        error: err.message || 'Failed to load activities'
      });
    }
  };

  // Handle staff activity click
  const handleStaffActivityClick = (staff, activityName) => {
    setSearchStaffName(staff.username || "");
    setSearchActivity(activityName);
    fetchActivityFields(activityName);
    fetchActivityData(activityName, searchDepartment, staff.username || "", null, fromDate, toDate, staff.Userid);
  };

  // Staff Autocomplete Matching Suggestions
  const staffSuggestions = staffData.filter(staff => {
    if (!searchStaffName.trim()) return false;
    const q = searchStaffName.toLowerCase();
    const nameMatch = (staff.username || "").toLowerCase().includes(q);
    const idMatch = (staff.staffId || "").toLowerCase().includes(q);
    return nameMatch || idMatch;
  });

  // Pagination logic
  const safeFilteredData = ensureArray(filteredData);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeFilteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeFilteredData.length / itemsPerPage);

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const getActivityIcon = (activity) => {
    const iconMap = {
      'Scholars': <FaUsers className="w-4 h-4" />,
      'Consultancy': <FaFileUpload className="w-4 h-4" />,
      'Funded Project': <FaFileUpload className="w-4 h-4" />,
      'Seed Money': <FaFileUpload className="w-4 h-4" />,
      'Events Attended': <FaCalendarAlt className="w-4 h-4" />,
      'Industry Knowhow': <FaUserTie className="w-4 h-4" />,
      'Certification Courses': <FaCertificate className="w-4 h-4" />,
      'Publications': <FaBook className="w-4 h-4" />,
      'Conference Details': <FaBook className="w-4 h-4" />,
      'Events Organized': <FaAward className="w-4 h-4" />,
      'H-Index': <FaFileUpload className="w-4 h-4" />,
      'Resource Person': <FaUserGraduate className="w-4 h-4" />,
      'Recognition': <FaAward className="w-4 h-4" />,
      'Membership': <FaUserTie className="w-4 h-4" />,
      'Patent/Product Development': <FaFileUpload className="w-4 h-4" />,
      'Project Mentors': <FaUsers className="w-4 h-4" />,
      'Education': <FaBook className="w-4 h-4" />,
      'Personal Information': <FaUserTie className="w-4 h-4" />,
      'MOU': <FaFileAlt className="w-4 h-4" />,
      'TLP Management': <FaFileAlt className="w-4 h-4" />,
      'Club Activity': <FaUsers className="w-4 h-4" />
    };
    return iconMap[activity] || <FaFileUpload className="w-4 h-4" />;
  };

  const renderStaffTable = () => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-xs text-left border-collapse" style={{ minWidth: '1000px' }}>
          <thead className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white">
            <tr>
              <th className="w-[80px] min-w-[80px] px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap border-r border-indigo-400/30">Image</th>
              <th className="w-[130px] min-w-[130px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap border-r border-indigo-400/30">Staff ID</th>
              <th className="w-[220px] min-w-[220px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap border-r border-indigo-400/30">Name</th>
              <th className="w-[260px] min-w-[260px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap border-r border-indigo-400/30">Email</th>
              <th className="w-[140px] min-w-[140px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap border-r border-indigo-400/30">Department</th>
              <th className="w-[180px] min-w-[180px] px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">Activities</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((staff, index) => {
              const department = getStaffDepartment(staff, departments);
              return (
                <tr key={staff.Userid || index} className="hover:bg-indigo-50/40 transition-colors">
                  <td className="w-[80px] min-w-[80px] px-4 py-3.5 align-middle text-center border-r border-gray-200">
                    {staff.image && staff.image !== '/Uploads/default.jpg' ? (
                      <img
                        src={`${backendUrl}${staff.image}`}
                        alt={`${staff.username || "Unknown"}'s avatar`}
                        className="w-10 h-10 rounded-full object-cover border-2 border-indigo-200 shadow-xs mx-auto"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center border-2 border-indigo-200 mx-auto">
                        <FaUserTie className="w-5 h-5 text-indigo-600" />
                      </div>
                    )}
                  </td>
                  <td className="w-[130px] min-w-[130px] px-4 py-3.5 align-middle text-left border-r border-gray-200">
                    <span className="bg-indigo-50 text-black border border-indigo-200 px-2.5 py-1 rounded-md text-xs font-semibold inline-block whitespace-nowrap">
                      {staff.staffId || "N/A"}
                    </span>
                  </td>
                  <td className="w-[220px] min-w-[220px] px-4 py-3.5 align-middle text-left border-r border-gray-200">
                    <div className="text-xs font-semibold text-black whitespace-normal break-words leading-relaxed" title={staff.username}>{staff.username || "Unknown"}</div>
                    <div className="text-[11px] text-gray-600 mt-0.5 font-medium">Faculty Member</div>
                  </td>
                  <td className="w-[260px] min-w-[260px] px-4 py-3.5 align-middle text-left border-r border-gray-200">
                    <div className="text-xs font-normal text-black whitespace-normal break-all leading-relaxed" title={staff.email}>{staff.email || "Unknown"}</div>
                  </td>
                  <td className="w-[140px] min-w-[140px] px-4 py-3.5 align-middle text-left border-r border-gray-200">
                    <span className="bg-blue-50 text-black border border-blue-200 px-2.5 py-1 rounded-md text-xs font-semibold inline-block whitespace-nowrap">
                      {department}
                    </span>
                  </td>
                  <td className="w-[180px] min-w-[180px] px-4 py-3.5 align-middle text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenStaffActivityModal(staff)}
                      className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                      title={`Click to view all activity details for ${staff.username}`}
                    >
                      <FaEye className="mr-1.5 text-xs" /> View Activities
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const formatColumnValue = (value, columnName) => {
    if (value === null || value === undefined || value === "") return "N/A";

    const colLower = (columnName || "").toLowerCase();

    // Safely extract string value if value is an Object or Buffer JSON
    let strVal = "";
    if (typeof value === "object" && value !== null) {
      if (value.url || value.filePath || value.path || value.filename || value.name || value.originalName) {
        strVal = String(value.url || value.filePath || value.path || value.filename || value.name || value.originalName);
      } else if (value.type === 'Buffer' || Array.isArray(value.data)) {
        strVal = "";
      } else {
        strVal = "";
      }
    } else {
      strVal = String(value);
    }

    if (strVal === "[object Object]" || strVal.includes('{"type":"Buffer"') || strVal.includes('"type":"Buffer"') || strVal === "{}" || strVal === "[]") {
      strVal = "";
    }

    // Proof Document / File Link Rendering
    const isFileCol = 
      colLower.includes('proof') || 
      colLower.includes('copy') || 
      colLower.includes('certificate') || 
      colLower.includes('file') || 
      colLower.includes('document') || 
      colLower.includes('link') || 
      colLower.includes('upload') ||
      colLower.includes('report') ||
      strVal.startsWith('/Uploads') || 
      strVal.startsWith('/uploads') || 
      strVal.startsWith('/admin-panel/view-document') ||
      strVal.startsWith('http') || 
      /\.(pdf|png|jpg|jpeg|doc|docx)$/i.test(strVal);

    if (isFileCol && strVal !== "N/A" && strVal !== "") {
      let cleanPath = strVal.replace(/\\/g, '/');
      let fileUrl = "";
      if (cleanPath.startsWith('http')) {
        fileUrl = cleanPath;
      } else {
        if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;
        if (cleanPath.startsWith('/institute_management_system')) {
          fileUrl = `${backendUrl.replace('/institute_management_system', '')}${cleanPath}`;
        } else {
          fileUrl = `${backendUrl}${cleanPath}`;
        }
      }

      let rawName = cleanPath.split('/').pop() || columnName;
      let displayLabel = columnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (colLower === 'proof') {
        displayLabel = 'Proof / Sanction Order';
      } else if (rawName && !rawName.includes('view-document') && !rawName.includes('Buffer')) {
        displayLabel = rawName.replace(/_/g, ' ').replace(/-/g, ' ');
        if (displayLabel.length > 25) {
          displayLabel = displayLabel.substring(0, 22) + '...';
        }
      }

      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 shadow-xs transition hover:bg-indigo-100 max-w-full overflow-hidden"
          title={`Click to open document`}
        >
          <FaFileAlt className="mr-1.5 text-indigo-500 shrink-0 text-sm" />
          <span className="truncate">View Proof ({displayLabel})</span>
          <FaExternalLinkAlt className="ml-1.5 text-[10px] text-indigo-400 shrink-0" />
        </a>
      );
    }

    if (colLower.includes('date') || colLower.includes('created') || colLower.includes('updated')) {
      if (!value || value === 'N/A' || value === 'null' || value === 'undefined') return 'N/A';
      const str = String(value).trim();
      if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str;
      const parts = str.split('T')[0].split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const date = new Date(value);
      return isNaN(date.getTime()) ? str : date.toLocaleDateString('en-GB');
    }
    if ((colLower.includes('amount') || colLower.includes('sanctioned')) && !isNaN(value)) {
      return `₹${parseFloat(value).toLocaleString()}`;
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return strVal;
  };

  const renderActivityTable = () => {
    const defaultFields = ['s_no', 'staff_name', 'staff_id', 'department'];
    const activeMiddleFields = selectedActivityFields.length > 0 
      ? selectedActivityFields.filter(col => !defaultFields.includes(col.toLowerCase()) && !['created_at', 'createdat', 'updated_at', 'updatedat'].includes(col.toLowerCase()))
      : availableActivityFields.filter(col => !defaultFields.includes(col.toLowerCase()) && !['created_at', 'createdat', 'updated_at', 'updatedat'].includes(col.toLowerCase()));

    const displayColumns = [
      ...defaultFields,
      ...activeMiddleFields,
      'created_at',
      'updated_at'
    ];
    const uniqueDisplayColumns = [...new Set(displayColumns)].filter(
      col => !['id', 'userid', 'user_id', 'forum', 'created_by', 'updated_by', 'proof_available', 'proof_file_name'].includes(col.toLowerCase())
    );
    const tableMinWidth = Math.max(1200, uniqueDisplayColumns.length * 220);

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left border-collapse" style={{ minWidth: `${tableMinWidth}px` }}>
            <thead className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white">
              <tr>
                {uniqueDisplayColumns.map((column, index) => {
                  let headerTitle = column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const colLower = column.toLowerCase();
                  if (colLower === 's_no') headerTitle = 'SI. No';
                  if (colLower === 'staff_name') headerTitle = 'Staff Name';
                  if (colLower === 'staff_id') headerTitle = 'Staff ID';
                  if (colLower === 'department') headerTitle = 'Department';
                  if (colLower === 'created_at' || colLower === 'createdat') headerTitle = 'Created Date';
                  if (colLower === 'updated_at' || colLower === 'updatedat') headerTitle = 'Updated Date';

                  const isIdCol = colLower === 's_no';
                  const isLongHeader = headerTitle.length > 18;
                  const widthClass = isIdCol 
                    ? 'w-[70px] min-w-[70px] text-center' 
                    : isLongHeader 
                      ? 'w-[250px] min-w-[250px] text-left' 
                      : 'w-[200px] min-w-[200px] text-left';

                  return (
                    <th
                      key={index}
                      className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider border-r border-indigo-400/30 ${widthClass}`}
                    >
                      <div className="whitespace-normal break-words leading-snug">{headerTitle}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((item, index) => (
                <tr key={item.id || item.Userid || index} className="hover:bg-indigo-50/40 transition-colors">
                  {uniqueDisplayColumns.map((column, colIndex) => {
                    const colLower = column.toLowerCase();
                    const isIdCol = colLower === 's_no';
                    const isLongHeader = column.length > 18;
                    const widthClass = isIdCol 
                      ? 'w-[70px] min-w-[70px] text-center whitespace-nowrap font-semibold bg-gray-50/30' 
                      : isLongHeader 
                        ? 'w-[250px] min-w-[250px] max-w-[360px] text-left' 
                        : 'w-[200px] min-w-[200px] max-w-[320px] text-left';

                    let rawVal;
                    if (colLower === 's_no') {
                      rawVal = indexOfFirstItem + index + 1;
                    } else if (colLower === 'staff_name') {
                      rawVal = getValidValue(item.staff_name, item.username, item.userName, item.full_name);
                    } else if (colLower === 'staff_id') {
                      rawVal = getValidValue(item.staff_id, item.staffId, item.userNumber, item.user_number, item.Userid, item.userId, item.user_id);
                    } else if (colLower === 'department') {
                      rawVal = getValidValue(item.department, getStaffDepartment(item, departments), item.departmentAcr, item.departmentName);
                    } else if (colLower === 'created_at' || colLower === 'createdat') {
                      rawVal = getValidValue(item.created_at, item.createdAt, item.createdat);
                    } else if (colLower === 'updated_at' || colLower === 'updatedat') {
                      rawVal = getValidValue(item.updated_at, item.updatedAt, item.updatedat);
                    } else {
                      rawVal = item[column] !== undefined ? item[column] : item[colLower];
                    }
                    const formatted = formatColumnValue(rawVal, column);

                    return (
                      <td 
                        key={colIndex} 
                        className={`px-4 py-3.5 text-xs text-black align-top border-r border-gray-200 ${widthClass}`}
                      >
                        {typeof formatted === 'string' ? (
                          <div className="whitespace-pre-wrap break-words leading-relaxed text-black font-normal">
                            {formatted}
                          </div>
                        ) : (
                          <div className="leading-relaxed text-black font-normal">
                            {formatted}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderActivityFieldsDropdown = () => (
    <div className="space-y-2" ref={activityFieldsRef}>
      <label className="block text-sm font-medium text-gray-700">Activity Fields</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsActivityFieldsDropdownOpen(!isActivityFieldsDropdownOpen)}
          disabled={!searchActivity || availableActivityFields.length === 0}
          className="w-full p-3 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-left bg-white flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <span className="text-gray-700 flex items-center">
            <FaFilter className="mr-2 text-indigo-600" />
            {!searchActivity 
              ? "Select activity first" 
              : availableActivityFields.length === 0 
                ? "No fields available"
                : `${selectedActivityFields.length} field(s) selected`
            }
          </span>
          <FaChevronDown className={`w-4 h-4 transition-transform ${isActivityFieldsDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isActivityFieldsDropdownOpen && availableActivityFields.length > 0 && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 border-b">
              <button
                type="button"
                onClick={handleSelectAllActivityFields}
                className="w-full text-left p-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded"
              >
                {selectedActivityFields.length === availableActivityFields.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="p-2">
              {availableActivityFields.map((field, index) => (
                <label key={index} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded">
                  <input
                    type="checkbox"
                    checked={selectedActivityFields.includes(field)}
                    onChange={() => handleActivityFieldToggle(field)}
                    disabled={['s_no', 'staff_name', 'staff_id', 'department'].includes(field.toLowerCase())}
                    className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading && !staffData.length) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-lg">Loading admin panel...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-600">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Error Loading Data</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mr-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Reset Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">
            {viewMode === 'staff' ? 'Staff Management System' : `${searchActivity} Activity Details`}
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Filter Options</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">

            {/* Staff Name Autocomplete Filter - Real-time filtering as typing */}
            <div className="space-y-2 relative" ref={autocompleteRef}>
              <label className="block text-sm font-medium text-gray-700">Staff Name</label>
              <input
                type="text"
                value={searchStaffName}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchStaffName(val);
                  setShowStaffAutocomplete(true);
                  if (viewMode === 'staff') {
                    const q = val.toLowerCase().trim();
                    let filtered = [...staffData];
                    if (q !== "") {
                      filtered = filtered.filter(staff => 
                        (staff.username || "").toLowerCase().includes(q) || 
                        (staff.staffId || "").toLowerCase().includes(q)
                      );
                    }
                    // Sort matching staff names in alphabetical order
                    filtered.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
                    setFilteredData(filtered);
                    setCurrentPage(1);
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                onFocus={() => setShowStaffAutocomplete(true)}
                placeholder="Enter staff name"
                className="w-full p-3 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              />
              {showStaffAutocomplete && staffSuggestions.length > 0 && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                  {staffSuggestions.map((staff, idx) => (
                    <div
                      key={staff.Userid || idx}
                      onClick={() => {
                        setSearchStaffName(staff.username || "");
                        setShowStaffAutocomplete(false);
                        if (viewMode === 'staff') {
                          const q = (staff.username || "").toLowerCase().trim();
                          let filtered = staffData.filter(s => (s.username || "").toLowerCase().includes(q));
                          filtered.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
                          setFilteredData(filtered);
                        } else {
                          handleSearch();
                        }
                      }}
                      className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 text-xs flex justify-between items-center transition"
                    >
                      <div>
                        <div className="font-semibold text-gray-900">{staff.username}</div>
                        <div className="text-gray-500">ID: {staff.staffId || "N/A"}</div>
                      </div>
                      <span className="bg-indigo-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">
                        {staff.department || "Staff"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Activities</label>
              <select
                value={searchActivity}
                onChange={(e) => handleActivityChange(e.target.value)}
                className="w-full p-3 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">All Activities (Staff View)</option>
                {activities.map((activity) => (
                  <option key={activity.name} value={activity.name}>
                    {activity.name}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="w-full p-3 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              />
            </div>

            {/* To Date Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="w-full p-3 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              />
            </div>

            {/* Activity Fields Filter */}
            {renderActivityFieldsDropdown()}

            {/* Action Buttons */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Actions</label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="p-3 bg-gradient-to-r from-indigo-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-indigo-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm font-medium disabled:opacity-50"
                >
                  <FaSearch className="mr-2" /> Search
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={resetFilters}
                    disabled={loading}
                    className="flex-1 p-2 bg-gray-500 text-white rounded-lg flex items-center justify-center hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition text-sm disabled:opacity-50"
                  >
                    <FaUndo className="mr-1" /> Reset
                  </button>
                  <button
                    onClick={handleExportToExcel}
                    disabled={loading || safeFilteredData.length === 0}
                    className="flex-1 p-2 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition text-sm disabled:opacity-50"
                  >
                    <FaFileExport className="mr-1" /> Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 flex items-center gap-4 flex-wrap">
              <span>
                Showing {currentItems.length} of {safeFilteredData.length} {viewMode === 'staff' ? 'staff members' : 'records'}
              </span>
              {viewMode === 'activity' && searchActivity && (
                <span className="bg-indigo-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                  Activity: {searchActivity}
                </span>
              )}
              {searchDepartment && (
                <span className="bg-indigo-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                  Department ID: {searchDepartment}
                </span>
              )}
              {(fromDate || toDate) && (
                <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-semibold">
                  Date: {fromDate || "Start"} to {toDate || "End"}
                </span>
              )}
              {selectedActivityFields.length > 0 && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                  Fields: {selectedActivityFields.length} selected
                </span>
              )}
            </div>
            <div className="text-sm text-indigo-600 font-medium">
              Page {currentPage} of {totalPages || 1}
            </div>
          </div>
        </div>

        {/* Active Activity Fields Display */}
        {selectedActivityFields.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg mb-6">
            <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
              <FaFilter className="mr-2" />
              Active Activity Fields:
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedActivityFields.map(field => (
                <span 
                  key={field}
                  className="bg-indigo-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium flex items-center"
                >
                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  {!['s_no', 'staff_name', 'department'].includes(field.toLowerCase()) && (
                    <button
                      onClick={() => handleActivityFieldToggle(field)}
                      className="ml-2 text-indigo-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              <button
                onClick={() => setSelectedActivityFields(['s_no', 'staff_name', 'department'])}
                className="text-indigo-600 hover:text-blue-800 text-xs font-medium underline"
              >
                Clear all fields
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            {safeFilteredData.length > 0 ? (
              viewMode === 'staff' ? renderStaffTable() : renderActivityTable()
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center text-gray-500">
                  <FaUsers className="w-12 h-12 mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No data found</p>
                  <p className="text-sm">Try adjusting your search criteria or activity fields</p>
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 py-4 px-6 border-t">
              <div className="flex justify-between items-center">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Long Text Details Modal */}
      {detailModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">{detailModal.title}</h3>
            <div className="max-h-80 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap border p-3 rounded bg-gray-50 mb-4">
              {detailModal.content}
            </div>
            <div className="text-right">
              <button
                onClick={() => setDetailModal({ isOpen: false, title: "", content: "" })}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Activity Breakdown Modal - Displays ALL records submitted by this staff member */}
      {staffActivityModal.isOpen && staffActivityModal.staff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                {staffActivityModal.staff.image && staffActivityModal.staff.image !== '/Uploads/default.jpg' ? (
                  <img
                    src={`${backendUrl}${staffActivityModal.staff.image}`}
                    alt="Staff Avatar"
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200"
                  />
                ) : (
                  <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-indigo-200">
                    <FaUserTie className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg leading-tight">{staffActivityModal.staff.username}</h3>
                  <div className="flex items-center gap-2 text-xs text-indigo-100 mt-0.5">
                    <span>Staff ID: <strong>{staffActivityModal.staff.staffId || "N/A"}</strong></span>
                    <span>•</span>
                    <span>Department: <strong>{staffActivityModal.staff.department || "N/A"}</strong></span>
                    <span>•</span>
                    <span>Email: <strong>{staffActivityModal.staff.email || "N/A"}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {staffActivityModal.data?.totalRecords !== undefined && (
                  <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
                    Total Records: {staffActivityModal.data.totalRecords}
                  </span>
                )}
                <button
                  onClick={() => setStaffActivityModal({ isOpen: false, staff: null, loading: false, data: null, selectedTab: 'All', error: null })}
                  className="text-white/80 hover:text-white text-2xl font-bold transition leading-none px-2"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            {staffActivityModal.data?.activitiesData && Object.keys(staffActivityModal.data.activitiesData).length > 0 && (
              <div className="bg-indigo-50/80 px-6 py-2 border-b border-indigo-100 flex items-center gap-2 overflow-x-auto shrink-0">
                <button
                  onClick={() => setStaffActivityModal(prev => ({ ...prev, selectedTab: 'All' }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    staffActivityModal.selectedTab === 'All'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  All Activities ({staffActivityModal.data.totalRecords})
                </button>

                {Object.entries(staffActivityModal.data.activitiesData).map(([actName, actObj]) => (
                  <button
                    key={actName}
                    onClick={() => setStaffActivityModal(prev => ({ ...prev, selectedTab: actName }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
                      staffActivityModal.selectedTab === actName
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                    }`}
                  >
                    <span>{actName}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      staffActivityModal.selectedTab === actName ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {actObj.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-gray-50/50">
              {staffActivityModal.loading ? (
                <div className="flex flex-col justify-center items-center py-16 text-gray-500 space-y-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
                  <p className="text-sm font-medium">Fetching complete activity history for {staffActivityModal.staff.username}...</p>
                </div>
              ) : staffActivityModal.error ? (
                <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-semibold text-sm mb-1">Failed to load activity details</p>
                  <p className="text-xs text-gray-600 mb-3">{staffActivityModal.error}</p>
                  <button
                    onClick={() => handleOpenStaffActivityModal(staffActivityModal.staff)}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              ) : !staffActivityModal.data || staffActivityModal.data.totalRecords === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                  <FaUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-700">No activity records found</p>
                  <p className="text-xs text-gray-500 mt-1">This staff member has not submitted any activity records yet.</p>
                </div>
              ) : (
                Object.entries(staffActivityModal.data.activitiesData).map(([actName, actObj]) => {
                  if (staffActivityModal.selectedTab !== 'All' && staffActivityModal.selectedTab !== actName) {
                    return null;
                  }

                  const cols = actObj.columns || [];
                  const rows = actObj.rows || [];

                  const modalPage = staffActivityModal.modalPages?.[actName] || 1;
                  const modalLimit = 5;
                  const modalTotalPages = Math.ceil(rows.length / modalLimit);
                  const startIndex = (modalPage - 1) * modalLimit;
                  const currentPaginatedRows = rows.slice(startIndex, startIndex + modalLimit);
                  const modalMiddleCols = (cols || []).filter(c => !['id', 'userid', 'user_id', 'forum', 'created_at', 'createdat', 'updated_at', 'updatedat', 'created_by', 'updated_by', 'proof_available', 'proof_file_name'].includes(c.toLowerCase()));
                  const modalDisplayCols = [...modalMiddleCols, 'created_at', 'updated_at'];
                  const tableMinWidth = Math.max(1200, modalDisplayCols.length * 180);

                  return (
                    <div key={actName} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6">
                      <div className="bg-indigo-50/80 px-4 py-3 border-b border-indigo-100 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-indigo-600">{getActivityIcon(actName)}</span>
                          <h4 className="font-bold text-sm text-gray-900">{actName}</h4>
                          <span className="bg-indigo-100 text-indigo-900 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {rows.length} {rows.length === 1 ? 'Record' : 'Records'}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const s = staffActivityModal.staff;
                            setStaffActivityModal({ isOpen: false, staff: null, loading: false, data: null, selectedTab: 'All', modalPages: {}, error: null });
                            handleStaffActivityClick(s, actName);
                          }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          Open in Main View →
                        </button>
                      </div>

                      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm custom-scrollbar mb-4">
                        <table className="min-w-full divide-y divide-gray-200 border-collapse" style={{ minWidth: `${tableMinWidth}px` }}>
                          <thead className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white">
                            <tr>
                              {modalDisplayCols.map((c, i) => {
                                let headerTitle = c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                const colLower = c.toLowerCase();
                                if (colLower === 's_no') headerTitle = 'SI. No';
                                if (colLower === 'staff_name') headerTitle = 'Staff Name';
                                if (colLower === 'staff_id') headerTitle = 'Staff ID';
                                if (colLower === 'department') headerTitle = 'Department';
                                if (colLower === 'created_at' || colLower === 'createdat') headerTitle = 'Created Date';
                                if (colLower === 'updated_at' || colLower === 'updatedat') headerTitle = 'Updated Date';

                                const isIdCol = colLower === 's_no';
                                return (
                                  <th key={i} className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-r border-indigo-400/30 ${isIdCol ? 'w-[70px] min-w-[70px] text-center' : 'w-[180px] min-w-[180px] text-left'}`}>
                                    {headerTitle}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {currentPaginatedRows.map((row, rIdx) => (
                              <tr key={row.id || row.Userid || rIdx} className="hover:bg-indigo-50/40 transition-colors">
                                {modalDisplayCols.map((c, cIdx) => {
                                  const colLower = c.toLowerCase();
                                  const isIdCol = colLower === 's_no';
                                  let rawVal;
                                  if (colLower === 's_no') {
                                    rawVal = startIndex + rIdx + 1;
                                  } else if (colLower === 'staff_name') {
                                    rawVal = getValidValue(row.staff_name, row.username, row.userName, staffActivityModal.staff?.username);
                                  } else if (colLower === 'staff_id') {
                                    rawVal = getValidValue(row.staff_id, row.staffId, row.userNumber, row.user_number, row.Userid, row.userId, staffActivityModal.staff?.staffId);
                                  } else if (colLower === 'department') {
                                    rawVal = getValidValue(row.department, staffActivityModal.staff?.department, getStaffDepartment(row, departments));
                                  } else if (colLower === 'created_at' || colLower === 'createdat') {
                                    rawVal = getValidValue(row.created_at, row.createdAt, row.createdat);
                                  } else if (colLower === 'updated_at' || colLower === 'updatedat') {
                                    rawVal = getValidValue(row.updated_at, row.updatedAt, row.updatedat);
                                  } else {
                                    rawVal = row[c] !== undefined ? row[c] : row[colLower];
                                  }
                                  const formatted = formatColumnValue(rawVal, c);

                                  return (
                                    <td 
                                      key={cIdx} 
                                      className={`px-4 py-3.5 text-xs text-black align-top border-r border-gray-200 ${isIdCol ? 'w-[70px] min-w-[70px] text-center whitespace-nowrap font-semibold bg-gray-50/30' : 'w-[180px] min-w-[180px] max-w-[320px] text-left'}`}
                                    >
                                      {typeof formatted === 'string' ? (
                                        <div className="whitespace-pre-wrap break-words leading-relaxed text-black font-normal">
                                          {formatted}
                                        </div>
                                      ) : (
                                        <div className="leading-relaxed text-black font-normal">
                                          {formatted}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Modal Table Pagination Controls */}
                      {modalTotalPages > 1 && (
                        <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-200">
                          <button
                            type="button"
                            disabled={modalPage === 1}
                            onClick={() => setStaffActivityModal(prev => ({
                              ...prev,
                              modalPages: { ...prev.modalPages, [actName]: modalPage - 1 }
                            }))}
                            className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                          >
                            Previous
                          </button>
                          <span className="text-xs text-gray-700 font-medium">
                            Page <strong>{modalPage}</strong> of <strong>{modalTotalPages}</strong> ({rows.length} total records)
                          </span>
                          <button
                            type="button"
                            disabled={modalPage === modalTotalPages}
                            onClick={() => setStaffActivityModal(prev => ({
                              ...prev,
                              modalPages: { ...prev.modalPages, [actName]: modalPage + 1 }
                            }))}
                            className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t flex justify-between items-center shrink-0">
              <div className="text-xs text-gray-500 font-medium">
                Showing all submitted records for <strong>{staffActivityModal.staff.username}</strong>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStaffActivityModal({ isOpen: false, staff: null, loading: false, data: null, selectedTab: 'All', error: null })}
                  className="px-4 py-2 bg-gray-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;


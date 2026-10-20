import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, Download, Upload, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getFundingAgencies, bulkCreateActivities } from '../../services/api';
import { formatDisplayDate } from '../../utils/dateUtils';
import DataTable from '../../components/DataTable';
import ExcelBulkUploadModal from '../../components/ExcelBulkUploadModal';
import TagInput from '../../components/TagInput';
import MasterSelect from '../../components/MasterSelect';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';

const getCleanFileUrl = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return null;
  const trimmed = filePath.trim().replace(/\\/g, '/');
  if (!trimmed) return null;

  const filename = trimmed.split('/').pop();
  if (!filename || ['activity_report.pdf', 'sample.pdf', 'template.pdf', 'none', 'n/a', 'null', 'undefined'].includes(filename.toLowerCase())) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const parts = trimmed.split('/');
  const rawFileName = parts.pop();
  let cleanFileName = rawFileName;
  try {
    cleanFileName = encodeURIComponent(decodeURIComponent(rawFileName));
  } catch (e) {
    cleanFileName = encodeURIComponent(rawFileName);
  }

  const dirPath = parts.join('/');
  if (trimmed.startsWith('/institute_management_system/')) {
    return `/uploads/activity/${cleanFileName}`;
  }
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const cleanDir = dirPath.startsWith('/') ? dirPath : `/${dirPath}`;
    return `${cleanDir}/${cleanFileName}`;
  }
  return `/uploads/activity/${cleanFileName}`;
};

const isPdfFile = (filePath) => {
  if (!filePath) return false;
  const cleaned = String(filePath).toLowerCase().split('?')[0];
  return cleaned.endsWith('.pdf');
};

const isImageFile = (filePath) => {
  if (!filePath) return false;
  const cleaned = String(filePath).toLowerCase().split('?')[0];
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].some(ext => cleaned.endsWith(ext));
};

const getReportUrl = (activity) => {
  if (!activity) return null;
  const filePath = activity.proofDocument || activity.report_file;
  const cleanUrl = getCleanFileUrl(filePath);
  if (!cleanUrl) return null;
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }

  const defaultBackend = `${window.location.protocol}//${window.location.hostname}:5173/institute_management_system`;
  const baseUrl = import.meta.env.VITE_BACKEND_URL || defaultBackend;
  return `${baseUrl}${cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl}`;
};


const renderBulletedCoordinators = (coordStr) => {
  if (!coordStr || !coordStr.toString().trim()) {
    return <span className="text-gray-400 italic text-xs">-</span>;
  }
  const list = coordStr.toString().split(',').map(s => s.trim()).filter(Boolean);
  if (list.length === 0) return <span className="text-gray-400 italic text-xs">-</span>;

  return (
    <ul className="text-xs font-semibold text-gray-800 space-y-0.5 my-1">
      {list.map((name, idx) => (
        <li key={idx} className="flex items-center gap-1.5 truncate max-w-[190px]" title={name}>
          <span className="text-indigo-600 font-bold text-sm">•</span>
          <span className="truncate">{name}</span>
        </li>
      ))}
    </ul>
  );
};

const ActivityPage = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [file, setFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [pdfViewerState, setPdfViewerState] = useState({
    isOpen: false,
    url: null,
    title: '',
    fileName: ''
  });


  const [formData, setFormData] = useState({
    from_date: '',
    to_date: '',
    student_coordinators: '',
    staff_coordinators: '',
    club_name: '',
    event_name: '',
    description: '',
    venue: '',
    department: '',
    participant_count: '',
    level: '',
    funded: false,
    funding_agency: '',
    fund_received: ''
  });

  // Fetch activities
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/activity');
      setActivities(response.data.activities || response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
          resetForm();
        }
        if (isExcelModalOpen) {
          setIsExcelModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isExcelModalOpen]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File size exceeds the maximum limit of 50MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer?.files?.[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File size exceeds the maximum limit of 50MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const normalizeMultiValues = (str) => {
    if (!str) return '';
    return str
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .join(', ');
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    const missingFields = [];
    if (!formData.from_date) missingFields.push('From Date');
    if (!formData.to_date) missingFields.push('To Date');
    if (!formData.student_coordinators || !formData.student_coordinators.trim()) missingFields.push('Student Coordinators');
    if (!formData.participant_count || isNaN(Number(formData.participant_count)) || Number(formData.participant_count) <= 0) missingFields.push('Participant Count');
    if (!formData.level) missingFields.push('Level');

    if (missingFields.length > 0) {
      toast.error(`Please complete mandatory fields: ${missingFields.join(', ')}`);
      return;
    }

    if (new Date(formData.from_date) > new Date(formData.to_date)) {
      toast.error('From Date cannot be later than To Date');
      return;
    }

    if (formData.funded && formData.fund_received !== '' && formData.fund_received !== null && formData.fund_received !== undefined) {
      const cleaned = String(formData.fund_received).replace(/[^0-9.]/g, '');
      if (cleaned !== '') {
        const num = Number(cleaned);
        if (isNaN(num) || !isFinite(num) || num < 0) {
          toast.error('Amount Received must be a valid non-negative number (e.g. 5000 or 25000.50)');
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const submitData = new FormData();
      submitData.append('from_date', formData.from_date);
      submitData.append('to_date', formData.to_date);
      submitData.append('student_coordinators', normalizeMultiValues(formData.student_coordinators));
      submitData.append('staff_coordinators', normalizeMultiValues(formData.staff_coordinators));
      submitData.append('participant_count', formData.participant_count);
      submitData.append('level', formData.level);
      submitData.append('club_name', formData.club_name || '');
      submitData.append('event_name', formData.event_name || '');
      submitData.append('description', formData.description || '');
      submitData.append('department', formData.department || '');
      submitData.append('venue', formData.venue || '');
      submitData.append('funded', formData.funded ? 'true' : 'false');
      if (formData.funded) {
        if (formData.funding_agency) submitData.append('funding_agency', formData.funding_agency);
        if (formData.fund_received !== '' && formData.fund_received !== null && formData.fund_received !== undefined) {
          const cleanedAmt = String(formData.fund_received).replace(/[^0-9.]/g, '');
          if (cleanedAmt) submitData.append('fund_received', cleanedAmt);
        }
      }

      if (file) {
        submitData.append('report_file', file);
      }

      if (isEditing && currentActivity) {
        await api.put(`/activity/${currentActivity.id}`, submitData);
        toast.success('Activity updated successfully');
      } else {
        await api.post('/activity/submit', submitData);
        toast.success('Activity submitted successfully');
      }

      setIsModalOpen(false);
      resetForm();
      fetchActivities();
    } catch (error) {
      console.error('Error submitting activity:', error, error.response?.data);
      const serverMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to submit activity';
      toast.error(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      from_date: '',
      to_date: '',
      student_coordinators: '',
      staff_coordinators: '',
      club_name: '',
      event_name: '',
      description: '',
      venue: '',
      department: '',
      participant_count: '',
      level: '',
      funded: false,
      funding_agency: '',
      fund_received: ''
    });
    setFile(null);
    setIsEditing(false);
    setCurrentActivity(null);
  };

  // Open modal for new activity
  const handleAddNew = () => {
    resetForm();
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEditActivity = (activity) => {
    setCurrentActivity(activity);
    setFormData({
      from_date: activity.from_date?.split('T')[0] || '',
      to_date: activity.to_date?.split('T')[0] || '',
      student_coordinators: activity.student_coordinators || '',
      staff_coordinators: activity.staff_coordinators || '',
      club_name: activity.club_name || '',
      event_name: activity.event_name || '',
      description: activity.description || '',
      venue: activity.venue || '',
      department: activity.department || '',
      participant_count: activity.participant_count || '',
      level: activity.level || '',
      funded: activity.funded || false,
      funding_agency: activity.funding_agency || '',
      fund_received: activity.fund_received ?? ''
    });
    setIsEditing(true);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  // View activity details
  const handleViewActivity = (activity) => {
    setCurrentActivity(activity);
    setFormData({
      from_date: activity.from_date?.split('T')[0] || '',
      to_date: activity.to_date?.split('T')[0] || '',
      student_coordinators: activity.student_coordinators || '',
      staff_coordinators: activity.staff_coordinators || '',
      club_name: activity.club_name || '',
      event_name: activity.event_name || '',
      description: activity.description || '',
      venue: activity.venue || '',
      department: activity.department || '',
      participant_count: activity.participant_count || '',
      level: activity.level || '',
      funded: activity.funded || false,
      funding_agency: activity.funding_agency || '',
      fund_received: activity.fund_received ?? ''
    });
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  // Delete activity
  const handleDelete = async (id) => {
    if (!globalThis.confirm('Are you sure you want to delete this activity?')) return;

    try {
      await api.delete(`/activity/${id}`);
      toast.success('Activity deleted successfully');
      fetchActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
    }
  };

  // Download / View proof document via PDF Viewer Modal, same as Consultancy module
  const handleViewReport = async (activity) => {
    if (!activity || !activity.id) {
      toast.error('Club activity record missing');
      return;
    }

    try {
      const response = await api.get(`/activity/${activity.id}/report`, { responseType: 'blob' });
      if (!response.data || response.data.size === 0) {
        toast.error('Report document is empty or unavailable');
        return;
      }

      if (response.data.type === 'application/json' || (response.data.type && response.data.type.includes('html'))) {
        const text = await response.data.text();
        try {
          const json = JSON.parse(text);
          toast.error(json.message || 'Report document file not found on server');
        } catch {
          toast.error('Report document file not found on server');
        }
        return;
      }

      const filename = String(activity?.proofDocument || activity?.report_file || 'activity_report.pdf').split(/[/\\]/).pop() || 'activity_report.pdf';
      const isPdf = isPdfFile(filename);
      const isImg = isImageFile(filename);
      const mimeType = (response.data.type || '').toLowerCase();
      let isImage = isImg;
      let targetMime = isPdf ? 'application/pdf' : (isImg ? (filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg') : 'image/jpeg');

      if (mimeType.startsWith('image/')) {
        isImage = true;
        targetMime = response.data.type;
      } else if (mimeType.includes('pdf')) {
        isImage = false;
        targetMime = 'application/pdf';
      }

      const blob = new Blob([response.data], { type: targetMime });
      const blobUrl = window.URL.createObjectURL(blob);
      const activityTitle = activity.event_name || activity.club_name || 'Club Activity';

      setPdfViewerState({
        isOpen: true,
        url: blobUrl,
        title: `Report - ${activityTitle}`,
        fileName: filename,
        isImage: isImage
      });
    } catch (error) {
      console.error('Error opening report document:', error);
      let errorMsg = 'Report document not available';
      if (error.response && error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errorMsg = json.message;
        } catch { }
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      toast.error(errorMsg);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const columns = [
    {
      header: 'From Date',
      field: 'from_date',
      render: (row) => row.from_date ? formatDisplayDate(row.from_date) || 'N/A' : 'N/A'
    },
    {
      header: 'To Date',
      field: 'to_date',
      render: (row) => row.to_date ? formatDisplayDate(row.to_date) || 'N/A' : 'N/A'
    },
    {
      header: 'Club Name',
      field: 'club_name',
      render: (row) => <span className="font-semibold text-gray-900">{row.club_name || '-'}</span>
    },
    {
      header: 'Event Name',
      field: 'event_name',
      render: (row) => <span className="font-semibold text-indigo-700">{row.event_name || '-'}</span>
    },
    {
      header: 'Staff Coordinators',
      field: 'staff_coordinators',
      render: (row) => renderBulletedCoordinators(row.staff_coordinators)
    },
    {
      header: 'Student Coordinators',
      field: 'student_coordinators',
      render: (row) => renderBulletedCoordinators(row.student_coordinators)
    },
    {
      header: 'Venue',
      field: 'venue',
      render: (row) => row.venue || '-'
    },
    {
      header: 'Department',
      field: 'department',
      render: (row) => row.department || '-'
    },
    {
      header: 'Level',
      field: 'level',
      render: (row) => <span className="font-medium text-gray-800">{row.level || '-'}</span>
    },
    {
      header: 'Participants',
      field: 'participant_count',
      render: (row) => <span className="font-semibold text-gray-800">{row.participant_count}</span>
    },
    {
      header: 'Funded',
      field: 'funded',
      render: (row) => row.funded ? (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">Yes</span>
      ) : (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">No</span>
      )
    },
    {
      header: 'Funding Agency',
      field: 'funding_agency',
      render: (row) => row.funding_agency || '-'
    },
    {
      header: 'Fund Received',
      field: 'fund_received',
      render: (row) => {
        if (row.fund_received !== null && row.fund_received !== undefined && row.fund_received !== '' && !isNaN(Number(row.fund_received))) {
          return `₹${Number(row.fund_received).toLocaleString('en-IN')}`;
        }
        return '-';
      }
    },
    {
      header: 'Description',
      field: 'description',
      render: (row) => <span className="text-xs text-gray-600">{row.description || '-'}</span>
    },
    {
      header: 'Proof Document',
      field: 'report_file',
      render: (row) => {
        const reportUrl = getReportUrl(row);
        return reportUrl ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleViewReport(row);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
          >
            <FileText size={14} />
            <span>View Report</span>
          </button>
        ) : (
          <span className="text-gray-400 text-xs">No File</span>
        );
      }
    },
    {
      header: 'Status',
      field: 'status',
      render: (row) => (
        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(row.status)}`}>
            {row.status || 'Pending'}
          </span>
          {row.status === 'Rejected' && row.rejection_reason && (
            <div className="text-xs text-red-600 mt-1 max-w-[180px] break-words">
              <span className="font-semibold">Reason:</span> {row.rejection_reason}
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Club Activity</h2>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-md font-semibold text-sm shadow-xs cursor-pointer"
            onClick={() => setIsExcelModalOpen(true)}
          >
            <Upload size={16} />
            Excel Bulk Upload
          </button>
          <button
            onClick={handleAddNew}
            className="btn flex items-center gap-2 text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 px-4 py-2 rounded-md shadow-md text-sm font-semibold cursor-pointer"
          >
            <Plus size={16} />
            Add Activity
          </button>
        </div>
      </div>

      <DataTable
        data={activities}
        columns={columns}
        wrapText={true}
        onView={handleViewActivity}
        onEdit={(row) => {
          if (row.status !== 'Pending') {
            toast.error('Only pending activities can be edited');
            return;
          }
          handleEditActivity(row);
        }}
        onDelete={(row) => handleDelete(row.id)}
        isLoading={loading}
      />

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isViewMode ? 'View Activity' : (isEditing ? 'Edit Activity' : 'Add New Activity')}
          size="lg"
          showFooter={false}
        >
          <div>
            {isViewMode ? (
              <div className="space-y-6">
                {/* Status & Funding Header */}
                <div className="flex flex-wrap items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 gap-3">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Approval Status</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${getStatusColor(currentActivity?.status)}`}>
                      {currentActivity?.status || 'Pending'}
                    </span>
                  </div>
                  {formData.funded && (
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-800 bg-green-100 px-3 py-1.5 rounded-full border border-green-200">
                        💰 Funded Activity
                      </span>
                    </div>
                  )}
                </div>

                {/* Rejection Reason (If Rejected) */}
                {currentActivity?.status === 'Rejected' && currentActivity?.rejection_reason && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                    <div className="text-sm font-bold text-red-800 mb-1">Rejection Reason</div>
                    <p className="text-red-700 text-sm">{currentActivity.rejection_reason}</p>
                  </div>
                )}

                {/* Key Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Club & Event */}
                  <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                    <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Event & Club Name</div>
                    <p className="text-lg font-extrabold text-gray-900">{formData.event_name || 'N/A'}</p>
                    {formData.club_name && (
                      <p className="text-sm font-medium text-indigo-600 mt-0.5">Club: <span className="font-bold">{formData.club_name}</span></p>
                    )}
                  </div>

                  {/* Dates & Participation */}
                  <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                    <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Dates & Participation</div>
                    <p className="text-sm font-bold text-gray-800">
                      📅 {formData.from_date || 'N/A'} &nbsp;➔&nbsp; {formData.to_date || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      👥 Participant Count: <span className="font-bold text-gray-900">{formData.participant_count || '0'}</span> | Level: <span className="font-bold text-gray-900">{formData.level || 'N/A'}</span>
                    </p>
                  </div>

                  {/* Venue & Department */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Venue & Department</div>
                    <p className="text-sm text-gray-800"><span className="font-semibold">Venue:</span> {formData.venue || 'N/A'}</p>
                    <p className="text-sm text-gray-800"><span className="font-semibold">Department:</span> {formData.department || 'N/A'}</p>
                  </div>

                  {/* Funding Details */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Funding Information</div>
                    <p className="text-sm text-gray-800"><span className="font-semibold">Funded:</span> {formData.funded ? 'Yes' : 'No'}</p>
                    {formData.funded && (
                      <>
                        <p className="text-sm text-gray-800"><span className="font-semibold">Funding Agency:</span> {formData.funding_agency || 'N/A'}</p>
                        <p className="text-sm text-gray-800"><span className="font-semibold">Amount Received:</span> {formData.fund_received ? `₹${Number(formData.fund_received).toLocaleString()}` : 'N/A'}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Coordinators Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Staff Coordinators */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Staff Coordinators</div>
                    {formData.staff_coordinators ? (
                      <ul className="space-y-1 bg-white p-3 rounded-lg border border-gray-200">
                        {formData.staff_coordinators.split(',').map((name, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                            <span className="text-indigo-600 font-extrabold text-base">•</span>
                            <span>{name.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No staff coordinators listed</p>
                    )}
                  </div>

                  {/* Student Coordinators */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Student Coordinators</div>
                    {formData.student_coordinators ? (
                      <ul className="space-y-1 bg-white p-3 rounded-lg border border-gray-200 max-h-36 overflow-y-auto custom-scrollbar">
                        {formData.student_coordinators.split(',').map((name, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                            <span className="text-indigo-600 font-extrabold text-base">•</span>
                            <span>{name.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No student coordinators listed</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                {formData.description && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Description</div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-gray-200">
                      {formData.description}
                    </p>
                  </div>
                )}

                {/* Report File Section */}
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Uploaded Activity Report / Proof</div>
                  {getReportUrl(currentActivity) ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-indigo-200">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="text-indigo-600 shrink-0" size={20} />
                        <span className="text-xs font-semibold text-gray-800 truncate max-w-xs">
                          {currentActivity?.proofDocument || currentActivity?.report_file || 'activity_report.pdf'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewReport(currentActivity)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer shrink-0"
                      >
                        <Eye size={14} /> View Report
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No report uploaded</p>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Participant Count */}
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="participant_count">
                        Participant Count *
                      </label>
                      <input
                        id="participant_count"
                        type="number"
                        name="participant_count"
                        value={formData.participant_count}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter number of participants"
                        required
                      />
                    </div>

                    {/* Level */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="level">
                        Level *
                      </label>
                      <select
                        id="level"
                        name="level"
                        value={formData.level}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      >
                        <option value="">Select Level</option>
                        <option value="Department">Department</option>
                        <option value="Institute">Institute</option>
                        <option value="State">State</option>
                        <option value="National">National</option>
                        <option value="International">International</option>
                      </select>
                    </div>

                    {/* Funded */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="funded">
                        Funded
                      </label>
                      <select
                        id="funded"
                        name="funded"
                        value={formData.funded ? 'true' : 'false'}
                        onChange={(e) => setFormData({ ...formData, funded: e.target.value === 'true' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>

                    {/* Funding Agency (conditional) */}
                    {formData.funded && (
                      <MasterSelect
                        label="Funding Agency"
                        name="funding_agency"
                        value={formData.funding_agency}
                        onChange={handleInputChange}
                        masterType="funding-agency"
                        displayField="agency_name"
                        placeholder="Select Funding Agency"
                      />
                    )}

                    {/* Fund Received (conditional) */}
                    {formData.funded && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="fund_received">
                          Fund Received
                        </label>
                        <input
                          id="fund_received"
                          type="number"
                          step="any"
                          min="0"
                          name="fund_received"
                          value={formData.fund_received}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Enter fund amount received (e.g. 5000 or 25000.50)"
                        />
                      </div>
                    )}

                    {/* Venue */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="venue">
                        Venue
                      </label>
                      <input
                        id="venue"
                        type="text"
                        name="venue"
                        value={formData.venue}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter venue"
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="department">
                        Department
                      </label>
                      <input
                        id="department"
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter department"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="description">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter a brief description of the activity"
                      />
                    </div>

                    {/* File Upload */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Report File (PDF) - Max 50MB
                      </label>
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('report-file-input')?.click()}
                        className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50/50'
                          }`}
                      >
                        <Upload className="mx-auto mb-2 text-indigo-500" size={28} />
                        <p className="text-gray-700 text-sm font-medium mb-1">
                          Drag & drop your PDF file here, or{' '}
                          <span className="text-indigo-600 font-bold hover:underline">
                            click to browse
                          </span>
                        </p>
                        <p className="text-xs text-gray-400">PDF files only (Max 50MB)</p>
                        <input
                          id="report-file-input"
                          type="file"
                          onChange={handleFileChange}
                          className="hidden"
                          accept=".pdf,application/pdf"
                        />
                        {file ? (
                          <div className="mt-3 inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs" onClick={(e) => e.stopPropagation()}>
                            <span>✓ {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setFile(null); }}
                              className="text-green-700 hover:text-red-600 font-bold ml-1"
                              title="Remove selected file"
                            >
                              ✕
                            </button>
                          </div>
                        ) : isEditing && (currentActivity?.proofDocument || currentActivity?.report_file) ? (
                          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-indigo-600 font-medium" onClick={(e) => e.stopPropagation()}>
                            <span>📄 Existing file: <span className="font-bold">{(currentActivity.proofDocument || currentActivity.report_file).split('/').pop()}</span></span>
                            <button
                              type="button"
                              onClick={() => handleViewReport(currentActivity)}
                              className="px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded font-bold transition-colors cursor-pointer"
                            >
                              View PDF
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submitting && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {submitting ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update Activity' : 'Submit Activity')}
                    </button>
                  </div>
                </form>
            )}
          </div>
        </Modal>
      )}
      {/* Excel Bulk Upload Modal */}
      <ExcelBulkUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="Bulk Upload Club Activity"
        columns={[
          { key: 'from_date', label: 'From Date', required: true, type: 'date', example: '2026-08-10' },
          { key: 'to_date', label: 'To Date', required: true, type: 'date', example: '2026-08-10' },
          { key: 'student_coordinators', label: 'Student Coordinators', required: true, example: 'Rahul, Anita' },
          { key: 'staff_coordinators', label: 'Staff Coordinators', required: false, example: 'Dr. Smith' },
          { key: 'club_name', label: 'Club Name', required: false, example: 'Robotics Club' },
          { key: 'event_name', label: 'Event Name', required: false, example: 'Tech Expo 2026' },
          { key: 'participant_count', label: 'Participant Count', required: true, type: 'number', example: 100 },
          { key: 'level', label: 'Level', required: true, example: 'Institute' },
          { key: 'venue', label: 'Venue', required: false, example: 'Seminar Hall 1' },
          { key: 'department', label: 'Department', required: false, example: 'CSE' },
          { key: 'funded', label: 'Funded', required: false, example: 'No' },
          { key: 'funding_agency', label: 'Funding Agency', required: false, example: 'DST' },
          { key: 'fund_received', label: 'Fund Received', required: false, type: 'number', example: 5000 },
          { key: 'description', label: 'Description', required: false, example: 'Annual Tech Workshop' },
          { key: 'report_file', label: 'Report / Proof Document File Name', required: false, type: 'file', example: 'activity_report.pdf' },
        ]}
        onUpload={async (validRows) => {
          try {
            await bulkCreateActivities(validRows);
            toast.success(`Successfully uploaded ${validRows.length} club activities!`);
            fetchActivities();
          } catch (err) {
            console.error('Error bulk uploading activities:', err);
            toast.error(err.response?.data?.message || 'Failed to upload bulk activity records');
          }
        }}
        templateFilename="Club_Activity_Template.xlsx"
      />

      {/* Document Viewer Modal */}
      {pdfViewerState.isOpen && (
        <Modal
          isOpen={pdfViewerState.isOpen}
          onClose={() => {
            if (pdfViewerState.url && pdfViewerState.url.startsWith('blob:')) {
              URL.revokeObjectURL(pdfViewerState.url);
            }
            setPdfViewerState({ isOpen: false, url: null, title: '', fileName: '', isImage: false });
          }}
          title={pdfViewerState.title || 'View Document'}
          size="2xl"
        >
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-200">
              <span className="text-xs font-semibold text-gray-600 truncate max-w-md">
                {pdfViewerState.fileName}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={pdfViewerState.url}
                  download={pdfViewerState.fileName || 'document'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors border border-indigo-200 shadow-2xs"
                >
                  Download File
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const w = window.open();
                    if (w) {
                      if (pdfViewerState.isImage) {
                        w.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>${pdfViewerState.title || 'Document Image'}</title>
                              <style>
                                html, body { margin: 0; padding: 0; height: 100%; display: flex; align-items: center; justify-content: center; background: #0e0e0e; }
                                img { max-width: 100%; max-height: 100%; object-fit: contain; }
                              </style>
                            </head>
                            <body>
                              <img src="${pdfViewerState.url}" alt="${pdfViewerState.title || 'Image'}" />
                            </body>
                          </html>
                        `);
                      } else {
                        w.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>${pdfViewerState.title || 'PDF Document'}</title>
                              <style>
                                html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #525659; }
                                iframe { width: 100%; height: 100%; border: none; }
                              </style>
                            </head>
                            <body>
                              <iframe src="${pdfViewerState.url}"></iframe>
                            </body>
                          </html>
                        `);
                      }
                    } else {
                      toast.error('Pop-up blocked by browser');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 rounded-md transition-colors border border-gray-300 shadow-2xs cursor-pointer"
                >
                  Open in New Window
                </button>
              </div>
            </div>

            <div className="w-full h-[75vh] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-inner flex items-center justify-center p-2">
              {pdfViewerState.isImage ? (
                <img
                  src={pdfViewerState.url}
                  alt={pdfViewerState.title}
                  className="max-w-full max-h-full object-contain rounded-md shadow-sm"
                />
              ) : (
                <object
                  data={pdfViewerState.url}
                  type="application/pdf"
                  className="w-full h-full"
                >
                  <div className="text-center p-6 space-y-3">
                    <p className="text-gray-700 font-medium">Your browser does not support inline PDF viewing.</p>
                    <a
                      href={pdfViewerState.url}
                      download={pdfViewerState.fileName || 'document.pdf'}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm"
                    >
                      Download PDF File
                    </a>
                  </div>
                </object>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ActivityPage;


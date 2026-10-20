import React, { useState, useEffect, useRef } from 'react';
import { Plus, File, Upload } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import MasterSelect from '../../components/MasterSelect';
import FileUploadField from '../../components/FileUploadField';
import ExcelBulkUploadModal from '../../components/ExcelBulkUploadModal';
import toast from 'react-hot-toast';
import api, { getCertifications, getCertificationCoursesMaster, bulkCreateCertifications } from '../../services/api';
import { formatDisplayDate } from '../../utils/dateUtils';

const NPTEL_CATEGORIES = [
  { value: '', label: 'Select NPTEL Category' },
  { value: 'Elite', label: 'Elite' },
  { value: 'Elite + Silver', label: 'Elite + Silver' },
  { value: 'Elite + Gold', label: 'Elite + Gold' },
  { value: 'Successfully Completed', label: 'Successfully Completed' },
  { value: 'Domain Scholar', label: 'Domain Scholar' }
];

const isNptelProvider = (offeredBy) => {
  return Boolean(offeredBy && String(offeredBy).trim().toUpperCase().includes('NPTEL'));
};

const CertificationsPage = () => {
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentCertification, setCurrentCertification] = useState(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const defaultOfferedBy = [
    { value: '', label: 'Select Offered By Organization' },
    { value: 'NPTEL / SWAYAM', label: 'NPTEL / SWAYAM' },
    { value: 'Coursera', label: 'Coursera' },
    { value: 'edX', label: 'edX' },
    { value: 'Udemy', label: 'Udemy' },
    { value: 'LinkedIn Learning', label: 'LinkedIn Learning' },
    { value: 'Cisco Networking Academy', label: 'Cisco Networking Academy' },
    { value: 'AWS Academy', label: 'AWS Academy' },
    { value: 'Google Career Certificates', label: 'Google Career Certificates' },
    { value: 'Microsoft Learn', label: 'Microsoft Learn' },
    { value: 'IBM SkillsBuild', label: 'IBM SkillsBuild' },
    { value: 'Oracle Academy', label: 'Oracle Academy' },
    { value: 'Infosys Springboard', label: 'Infosys Springboard' }
  ];
  const [masterCourseOptions, setMasterCourseOptions] = useState([]);
  const [offeredByOptions, setOfferedByOptions] = useState(defaultOfferedBy);

  const certExcelColumns = [
    {
      key: 'course_name',
      label: 'Course Name',
      aliases: ['Course', 'Name of Course', 'Course Title'],
      required: true,
      options: masterCourseOptions.length > 0 ? masterCourseOptions : ['NPTEL Online Certification', 'SWAYAM Course', 'Coursera Specialization', 'Udemy Professional Certificate', 'edX Verified Certificate'],
      isDynamicMaster: true,
      example: 'Deep Learning Specialization'
    },
    {
      key: 'offered_by',
      label: 'Offered By',
      aliases: ['Offered By Organization', 'Provider', 'OfferedBy', 'Platform', 'Organization'],
      required: true,
      options: offeredByOptions.map(o => o.label).filter(l => l && !l.startsWith('Select')),
      isDynamicMaster: true,
      example: 'NPTEL'
    },
    { key: 'from_date', label: 'From Date', aliases: ['Start Date', 'FromDate', 'Course From Date'], required: true, type: 'date', example: '2026-01-01' },
    { key: 'to_date', label: 'To Date', aliases: ['End Date', 'ToDate', 'Course To Date'], required: true, type: 'date', example: '2026-03-31' },
    { key: 'duration_type', label: 'Duration Type (Hours or Weeks)', aliases: ['Duration Type', 'DurationType', 'Unit', 'Hours or Weeks', 'Duration Unit'], required: false, options: ['Hours', 'Weeks'], example: 'Hours' },
    { key: 'hours', label: 'Number of Hours (if Duration Type is Hours)', aliases: ['Number of Hours', 'Hours', 'No of Hours', 'No. of Hours'], required: false, type: 'number', example: 40 },
    { key: 'weeks', label: 'Number of Weeks (if Duration Type is Weeks)', aliases: ['Number of Weeks', 'Weeks', 'No of Weeks', 'No. of Weeks'], required: false, type: 'number', example: 6 },
    { key: 'nptel_category', label: 'NPTEL Certification Category (Required for NPTEL)', aliases: ['NPTEL Category', 'NPTEL Certification Category', 'Category'], required: false, options: ['Elite', 'Elite + Silver', 'Elite + Gold', 'Successfully Completed', 'Domain Scholar'], example: 'Elite + Silver' },
    { key: 'certification_date', label: 'Certification Date', aliases: ['Cert Date', 'Date of Certification', 'CertificationDate'], required: true, type: 'date', example: '2026-04-01' },
    { key: 'certificate_pdf', label: 'Certificate Document File Name', aliases: ['Certificate PDF', 'Certificate File', 'Document'], required: false, type: 'file', example: 'certification_proof.pdf' }
  ];

  const handleBulkUploadCertifications = async (validRows) => {
    try {
      const response = await bulkCreateCertifications(validRows);
      toast.success(response?.data?.message || `Successfully imported ${validRows.length} certification courses`);
      await fetchCertifications();
      await fetchOfferedByList();
    } catch (error) {
      console.error('Error bulk saving certifications:', error);
      const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save bulk records';
      toast.error(errMsg);
      throw error;
    }
  };
  const fileInputRef = useRef(null);

  const fetchOfferedByList = async () => {
    try {
      const res = await getCertificationCoursesMaster({ status: 'Active' });
      let list = [];
      if (Array.isArray(res)) list = res;
      else if (Array.isArray(res?.data)) list = res.data;
      else if (Array.isArray(res?.data?.data)) list = res.data.data;

      if (list.length > 0) {
        setMasterCourseOptions([...new Set(list.map(c => c.course_name).filter(Boolean))]);
        setOfferedByOptions([
          { value: '', label: 'Select Offered By' },
          ...list.map(c => ({ value: c.course_name, label: `${c.course_name}${c.provider && c.provider !== c.course_name ? ` (${c.provider})` : ''}` }))
        ]);
      }
    } catch (err) {
      console.error('Error fetching certification master list:', err);
    }
  };

  useEffect(() => {
    fetchOfferedByList();
  }, []);

  // File state
  const [certificateFile, setCertificateFile] = useState(null);

  const [formData, setFormData] = useState({
    course_name: '',
    offered_by: '',
    from_date: '',
    to_date: '',
    duration_type: '',
    hours: '',
    weeks: '',
    nptel_category: '',
    certification_date: '',
    status: 'Completed'
  });

  const fetchCertifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/certifications');
      let certsData = [];
      if (response) {
        if (Array.isArray(response)) certsData = response;
        else if (response.data) {
          if (Array.isArray(response.data)) certsData = response.data;
          else if (response.data.data && Array.isArray(response.data.data)) certsData = response.data.data;
        }
      }
      setCertifications(certsData);
    } catch (error) {
      console.error('Error fetching certifications:', error);
      toast.error('Failed to load certifications');
      setCertifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertifications();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };

      // Clear NPTEL category if provider is changed away from NPTEL
      if (name === 'offered_by' && !isNptelProvider(value)) {
        updated.nptel_category = '';
      }

      return updated;
    });
  };

  const resetForm = () => {
    setFormData({
      course_name: '',
      offered_by: '',
      from_date: '',
      to_date: '',
      duration_type: '',
      hours: '',
      weeks: '',
      nptel_category: '',
      certification_date: '',
      status: 'Completed'
    });
    setCertificateFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setCurrentCertification(null);
    setIsViewMode(false);
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const ensureOfferedByInOptions = (offeredBy) => {
    if (!offeredBy) return;
    setOfferedByOptions((prev) => {
      if (prev.some((opt) => opt.value === offeredBy)) return prev;
      return [...prev, { value: offeredBy, label: offeredBy }];
    });
  };

  const handleEdit = (certification) => {
    setCurrentCertification(certification);
    ensureOfferedByInOptions(certification.offered_by);

    const fromDate = certification.from_date ? certification.from_date.split('T')[0] : '';
    const toDate = certification.to_date ? certification.to_date.split('T')[0] : '';
    const certDate = certification.certification_date ? certification.certification_date.split('T')[0] : '';

    let durationType = 'Hours';
    if (certification.weeks != null && parseFloat(certification.weeks) > 0 && (certification.hours == null || parseFloat(certification.hours) <= 0)) {
      durationType = 'Weeks';
    }

    setFormData({
      course_name: certification.course_name || '',
      offered_by: certification.offered_by || '',
      from_date: fromDate,
      to_date: toDate,
      duration_type: durationType,
      hours: certification.hours != null ? certification.hours.toString() : '',
      weeks: certification.weeks != null ? certification.weeks.toString() : '',
      nptel_category: certification.nptel_category || '',
      certification_date: certDate,
      status: certification.status || 'Completed'
    });
    setCertificateFile(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (certification) => {
    setCurrentCertification(certification);
    ensureOfferedByInOptions(certification.offered_by);

    const fromDate = certification.from_date ? certification.from_date.split('T')[0] : '';
    const toDate = certification.to_date ? certification.to_date.split('T')[0] : '';
    const certDate = certification.certification_date ? certification.certification_date.split('T')[0] : '';

    let durationType = 'Hours';
    if (certification.weeks != null && parseFloat(certification.weeks) > 0 && (certification.hours == null || parseFloat(certification.hours) <= 0)) {
      durationType = 'Weeks';
    }

    setFormData({
      course_name: certification.course_name || '',
      offered_by: certification.offered_by || '',
      from_date: fromDate,
      to_date: toDate,
      duration_type: durationType,
      hours: certification.hours != null ? certification.hours.toString() : '',
      weeks: certification.weeks != null ? certification.weeks.toString() : '',
      nptel_category: certification.nptel_category || '',
      certification_date: certDate,
      status: certification.status || 'Completed'
    });
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (certification) => {
    if (window.confirm(`Are you sure you want to delete this certification: ${certification.course_name}?`)) {
      try {
        await api.delete(`/certifications/${certification.id}`);
        toast.success('Certification deleted successfully');
        fetchCertifications();
      } catch (error) {
        console.error('Error deleting certification:', error);
        toast.error('Failed to delete certification');
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    if (!formData.course_name.trim() || !formData.offered_by.trim() || !formData.from_date || !formData.to_date || !formData.certification_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Duration Validation (Hours OR Weeks)
    if (!formData.duration_type) {
      toast.error('Please select Course Duration Type (Hours or Weeks)');
      return;
    }

    if (formData.duration_type === 'Hours') {
      const h = parseFloat(formData.hours);
      if (!formData.hours || isNaN(h) || h <= 0) {
        toast.error('Please enter a valid positive number for Number of Hours');
        return;
      }
    } else if (formData.duration_type === 'Weeks') {
      const w = parseFloat(formData.weeks);
      if (!formData.weeks || isNaN(w) || w <= 0) {
        toast.error('Please enter a valid positive number for Number of Weeks');
        return;
      }
    }

    // NPTEL Category Validation
    const isNptel = isNptelProvider(formData.offered_by);
    if (isNptel && !formData.nptel_category?.trim()) {
      toast.error('NPTEL Certification Category is required when Offered By is NPTEL');
      return;
    }

    if (!currentCertification && !certificateFile) {
      toast.error('Please upload a certificate PDF');
      return;
    }

    const fromDate = new Date(formData.from_date);
    const toDate = new Date(formData.to_date);
    const certDate = new Date(formData.certification_date);

    if (fromDate > toDate) {
      toast.error('From date must be before or equal to to date');
      return;
    }

    if (certDate < fromDate) {
      toast.error('Certification date cannot be before course start date');
      return;
    }

    try {
      setIsSubmitting(true);

      const submitData = new FormData();
      submitData.append('course_name', formData.course_name.trim());
      submitData.append('offered_by', formData.offered_by.trim());
      submitData.append('from_date', formData.from_date);
      submitData.append('to_date', formData.to_date);
      submitData.append('duration_type', formData.duration_type);

      if (formData.duration_type === 'Hours') {
        submitData.append('hours', formData.hours);
        submitData.append('weeks', '');
      } else {
        submitData.append('weeks', formData.weeks);
        submitData.append('hours', '');
      }

      if (isNptel) {
        submitData.append('nptel_category', formData.nptel_category.trim());
      } else {
        submitData.append('nptel_category', '');
      }

      submitData.append('certification_date', formData.certification_date);
      submitData.append('status', formData.status || 'Completed');

      if (certificateFile) {
        submitData.append('certificate_pdf', certificateFile);
      }

      if (currentCertification) {
        await api.put(`/certifications/${currentCertification.id}`, submitData);
        toast.success('Certification updated successfully');
      } else {
        await api.post('/certifications', submitData);
        toast.success('Certification created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      fetchCertifications();
      fetchOfferedByList();
    } catch (error) {
      console.error('Error saving certification:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save certification';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return formatDisplayDate(dateString);
  };

  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    let normalized = String(filePath).replace(/\\/g, '/');
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }
    normalized = normalized.replace(/^\/+/, '');
    if (!normalized.toLowerCase().startsWith('uploads/')) {
      normalized = `uploads/${normalized}`;
    }
    const baseUrl = (api.defaults?.baseURL || 'http://localhost:4000/institute_management_system').replace(/\/+$/, '');
    return `${baseUrl}/${normalized}`;
  };

  const columns = [
    { field: 'course_name', header: 'Course Name' },
    { field: 'offered_by', header: 'Offered By' },
    {
      field: 'nptel_category',
      header: 'NPTEL Category',
      render: (row) => row.nptel_category || '-'
    },
    {
      field: 'from_date',
      header: 'From Date',
      render: (row) => formatDate(row.from_date)
    },
    {
      field: 'to_date',
      header: 'To Date',
      render: (row) => formatDate(row.to_date)
    },
    {
      field: 'duration',
      header: 'Duration',
      render: (row) => (
        row.hours != null && row.hours > 0
          ? `${row.hours} Hours`
          : row.weeks != null && row.weeks > 0
            ? `${row.weeks} Weeks`
            : '-'
      )
    },
    {
      field: 'certification_date',
      header: 'Certification Date',
      render: (row) => formatDate(row.certification_date)
    },
    {
      field: 'status',
      header: 'Status',
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.status === 'Completed' ? 'bg-green-100 text-green-800' :
            row.status === 'Ongoing' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
          {row.status || 'Completed'}
        </span>
      )
    },
    {
      field: 'certificate_pdf',
      header: 'Certificate',
      render: (rowData) => (
        <div className="text-center">
          {rowData.certificate_pdf ? (
            <a
              href={getFileUrl(rowData.certificate_pdf)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-full transition-colors duration-200 border border-indigo-200">
              <File size={14} />
              View PDF
            </a>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Certification Courses</h1>
        <div className="flex items-center gap-3">
          <button
            className="btn flex items-center gap-2 text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-md shadow-sm text-sm font-semibold transition-colors"
            onClick={() => setIsBulkModalOpen(true)}
          >
            <Upload size={16} />
            Bulk Upload Excel
          </button>
          <button
            className="btn flex items-center gap-2 text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-blue-800 hover:to-indigo-500 px-4 py-2 rounded-md shadow-md text-sm font-semibold transition-colors"
            onClick={handleAddNew}
          >
            <Plus size={16} />
            Add Certification Course
          </button>
        </div>
      </div>

      <DataTable
        data={certifications}
        columns={columns}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        size="lg"
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={isViewMode ? 'View Certification' : currentCertification ? 'Edit Certification' : 'Add New Certification'}
        onSubmit={!isViewMode ? handleSubmit : null}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Course Name"
              name="course_name"
              value={formData.course_name}
              onChange={handleInputChange}
              required
              disabled={isViewMode}
              placeholder="e.g., Machine Learning Fundamentals"
            />
            <MasterSelect
              label="Offered By"
              name="offered_by"
              value={formData.offered_by}
              onChange={handleInputChange}
              masterType="certification-course"
              required
              disabled={isViewMode}
            />
          </div>

          {/* Conditional NPTEL Category Field */}
          {isNptelProvider(formData.offered_by) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  NPTEL Certification Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="nptel_category"
                  value={formData.nptel_category}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {NPTEL_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="From Date"
              name="from_date"
              type="date"
              value={formData.from_date}
              onChange={handleInputChange}
              required
              disabled={isViewMode}
            />
            <FormField
              label="To Date"
              name="to_date"
              type="date"
              value={formData.to_date}
              onChange={handleInputChange}
              required
              disabled={isViewMode}
            />
          </div>

          {/* Duration Type Selection (Hours OR Weeks) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Course Duration <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-700">
                  <input
                    type="radio"
                    name="duration_type"
                    value="Hours"
                    checked={formData.duration_type === 'Hours'}
                    onChange={() => {
                      setFormData(prev => ({ ...prev, duration_type: 'Hours', weeks: '' }));
                    }}
                    disabled={isViewMode}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  Hours
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-700">
                  <input
                    type="radio"
                    name="duration_type"
                    value="Weeks"
                    checked={formData.duration_type === 'Weeks'}
                    onChange={() => {
                      setFormData(prev => ({ ...prev, duration_type: 'Weeks', hours: '' }));
                    }}
                    disabled={isViewMode}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  Weeks
                </label>
              </div>
            </div>

            {/* Dynamic numerical input based on duration_type */}
            {formData.duration_type === 'Hours' ? (
              <FormField
                label="Number of Hours"
                name="hours"
                type="number"
                value={formData.hours}
                onChange={handleInputChange}
                required
                disabled={isViewMode}
                placeholder="e.g., 40"
                min="1"
              />
            ) : formData.duration_type === 'Weeks' ? (
              <FormField
                label="Number of Weeks"
                name="weeks"
                type="number"
                step="0.1"
                value={formData.weeks}
                onChange={handleInputChange}
                required
                disabled={isViewMode}
                placeholder="e.g., 6"
                min="0.1"
              />
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Certification Date"
              name="certification_date"
              type="date"
              value={formData.certification_date}
              onChange={handleInputChange}
              required
              disabled={isViewMode}
            />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status || 'Completed'}
                onChange={handleInputChange}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="Completed">Completed</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Registered">Registered</option>
                <option value="Pursuing">Pursuing</option>
              </select>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="mb-4">
            <FileUploadField
              label="Certificate PDF"
              name="certificate_pdf"
              accept=".pdf"
              value={isViewMode ? currentCertification?.certificate_pdf : (certificateFile || currentCertification?.certificate_pdf)}
              onChange={(file) => setCertificateFile(file)}
              onClear={() => setCertificateFile(null)}
              required={!isViewMode && !currentCertification}
              disabled={isViewMode}
              hint={currentCertification ? "Upload a new PDF to replace current document" : "PDF format up to 10MB"}
            />
          </div>

        </div>
      </Modal>

      {/* Bulk Upload Modal */}
      <ExcelBulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Upload Certification Courses"
        columns={certExcelColumns}
        onUpload={handleBulkUploadCertifications}
        templateFilename="Certification_Courses_Template.xlsx"
      />
    </div>
  );
};

export default CertificationsPage;
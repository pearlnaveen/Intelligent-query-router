import React, { useState, useEffect } from 'react';
import { Plus, FileText, Upload, ExternalLink } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import FileUploadField from '../../components/FileUploadField';
import TagInput from '../../components/TagInput';
import ExcelBulkUploadModal from '../../components/ExcelBulkUploadModal';
import MasterSelect from '../../components/MasterSelect';
import api, {
  getEventsOrganized,
  createEventOrganized,
  updateEventOrganized,
  deleteEventOrganized,
  bulkCreateEventsOrganized,
  getEventTypes
} from '../../services/api';
import toast from 'react-hot-toast';
import { formatDisplayDate } from '../../utils/dateUtils';

const EventsOrganizedPage = () => {
  const [eventsOrganized, setEventsOrganized] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [pdfViewerState, setPdfViewerState] = useState({
    isOpen: false,
    url: null,
    title: '',
    fileName: ''
  });

  const defaultProgramOptions = [
    'FDP',
    'Conference',
    'Workshop',
    'Seminar',
    'International Webinar',
  ];
  const [masterProgramOptions, setMasterProgramOptions] = useState(defaultProgramOptions);

  const booleanOptions = [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
  ];

  const [formData, setFormData] = useState({
    program_name: '',
    program_title: '',
    coordinator_name: '',
    co_coordinator_names: [],
    with_funding: 'No',
    with_self_supporting: 'No',
    speaker_details: '',
    from_date: '',
    to_date: '',
    days: '',
    sponsored_by: '',
    amount_sanctioned: '',
    participants: '',
    proof: null,
    document_link: '',
  });

  const fetchEventsOrganized = async () => {
    try {
      setLoading(true);
      const response = await getEventsOrganized();
      let arr = [];
      if (response) {
        if (Array.isArray(response)) arr = response;
        else if (response.data) {
          if (Array.isArray(response.data)) arr = response.data;
          else if (response.data.data && Array.isArray(response.data.data)) arr = response.data.data;
        }
      }
      setEventsOrganized(arr);
    } catch (error) {
      console.error('Error fetching Events Organized data:', error);
      toast.error('Failed to load Events Organized data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterProgramOptions = async () => {
    try {
      const response = await getEventTypes({ status: 'Active' });
      let list = [];
      if (Array.isArray(response)) list = response;
      else if (Array.isArray(response?.data)) list = response.data;
      else if (Array.isArray(response?.data?.data)) list = response.data.data;

      if (list.length > 0) {
        const fetchedNames = list.map(item => item.type_name || item.name || item.program_name).filter(Boolean);
        const combined = Array.from(new Set([...fetchedNames, ...defaultProgramOptions]));
        setMasterProgramOptions(combined);
      }
    } catch (error) {
      console.error('Error fetching master event types:', error);
    }
  };

  useEffect(() => {
    fetchEventsOrganized();
    fetchMasterProgramOptions();
  }, []);

  useEffect(() => {
    if (isExcelModalOpen) {
      fetchMasterProgramOptions();
    }
  }, [isExcelModalOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if ((name === 'from_date' || name === 'to_date') && updated.from_date && updated.to_date) {
        const from = new Date(updated.from_date);
        const to = new Date(updated.to_date);
        if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from <= to) {
          const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          updated.days = diffDays.toString();
        }
      }
      return updated;
    });
  };

  const parseCoordinators = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return String(val).split(',').map(s => s.trim()).filter(Boolean);
  };

  const resetForm = () => {
    setFormData({
      program_name: '',
      program_title: '',
      coordinator_name: '',
      co_coordinator_names: [],
      with_funding: 'No',
      with_self_supporting: 'No',
      speaker_details: '',
      from_date: '',
      to_date: '',
      days: '',
      sponsored_by: '',
      amount_sanctioned: '',
      participants: '',
      proof: null,
      document_link: '',
    });
    setCurrentRecord(null);
    setIsViewMode(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '—';
    return formatDisplayDate(dateString);
  };

  const handleViewProof = async (id, title) => {
    try {
      const recordId = id || currentRecord?.id;
      if (!recordId) {
        toast.error('Record ID is missing');
        return;
      }
      const response = await api.get(`/events-organized/proof/${recordId}`, { responseType: 'blob' });

      if (!response.data || response.data.size === 0) {
        toast.error('Proof document is empty or unavailable');
        return;
      }

      if (response.data?.type === 'application/json') {
        const text = await response.data.text();
        try {
          const json = JSON.parse(text);
          toast.error(json.message || 'Proof document not available');
        } catch {
          toast.error('Proof document not available');
        }
        return;
      }

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const docTitle = title || currentRecord?.program_title || currentRecord?.program_name || 'Event Organized Proof';

      setPdfViewerState({
        isOpen: true,
        url: url,
        title: `Proof - ${docTitle}`,
        fileName: `Proof_${recordId}.pdf`
      });
    } catch (error) {
      console.error('Error fetching proof:', error);
      toast.error('Error loading proof document');
    }
  };

  const renderFileLink = (record) => {
    if (!record || (!record.proof && !record.has_proof)) {
      return <span className="text-gray-400 text-sm">No file</span>;
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleViewProof(record.id, record.program_title);
        }}
        className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-full transition-colors duration-200 border border-indigo-200 font-medium"
        title="View Proof Document"
      >
        <FileText size={14} />
        View PDF
      </button>
    );
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setCurrentRecord(record);
    setFormData({
      program_name: record.program_name || '',
      program_title: record.program_title || '',
      coordinator_name: record.coordinator_name || '',
      co_coordinator_names: parseCoordinators(record.co_coordinator_names),
      with_funding: record.with_funding || (record.amount_sanctioned || record.sponsored_by ? 'Yes' : 'No'),
      with_self_supporting: record.with_self_supporting || 'No',
      speaker_details: record.speaker_details || '',
      from_date: formatDate(record.from_date) || '',
      to_date: formatDate(record.to_date) || '',
      days: record.days?.toString() || '',
      sponsored_by: record.sponsored_by || '',
      amount_sanctioned: record.amount_sanctioned?.toString() || '',
      participants: record.participants?.toString() || '',
      proof: null,
      document_link: record.document_link || '',
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setCurrentRecord(record);
    setFormData({
      program_name: record.program_name || '',
      program_title: record.program_title || '',
      coordinator_name: record.coordinator_name || '',
      co_coordinator_names: parseCoordinators(record.co_coordinator_names),
      with_funding: record.with_funding || (record.amount_sanctioned || record.sponsored_by ? 'Yes' : 'No'),
      with_self_supporting: record.with_self_supporting || 'No',
      speaker_details: record.speaker_details || '',
      from_date: formatDate(record.from_date) || '',
      to_date: formatDate(record.to_date) || '',
      days: record.days?.toString() || '',
      sponsored_by: record.sponsored_by || '',
      amount_sanctioned: record.amount_sanctioned?.toString() || '',
      participants: record.participants?.toString() || '',
      proof: null,
      document_link: record.document_link || '',
    });
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (record) => {
    if (window.confirm(`Are you sure you want to delete the event "${record.program_title || record.program_name}"?`)) {
      try {
        await deleteEventOrganized(record.id);
        toast.success('Event record deleted successfully');
        fetchEventsOrganized();
      } catch (error) {
        console.error('Error deleting Event record:', error);
        toast.error('Failed to delete Event record');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (!formData.program_name || !formData.program_title || !formData.coordinator_name ||
        !formData.speaker_details || !formData.from_date || !formData.to_date || !formData.participants) {
        toast.error('Please fill in all required fields (Name of Programme, Title, Coordinator Name, Speaker Details, From Date, To Date, No. of Participants)');
        return;
      }

      const fromDate = new Date(formData.from_date);
      const toDate = new Date(formData.to_date);
      if (fromDate > toDate) {
        toast.error('From Date cannot be after To Date');
        return;
      }

      const submitData = new FormData();
      submitData.append('program_name', formData.program_name);
      submitData.append('program_title', formData.program_title);
      submitData.append('coordinator_name', formData.coordinator_name);

      const coCoordsStr = Array.isArray(formData.co_coordinator_names)
        ? formData.co_coordinator_names.join(', ')
        : formData.co_coordinator_names;
      submitData.append('co_coordinator_names', coCoordsStr || '');

      submitData.append('with_funding', formData.with_funding);
      submitData.append('with_self_supporting', formData.with_self_supporting);
      submitData.append('speaker_details', formData.speaker_details);
      submitData.append('from_date', formData.from_date);
      submitData.append('to_date', formData.to_date);
      submitData.append('days', formData.days || '1');
      submitData.append('sponsored_by', formData.sponsored_by || '');
      submitData.append('amount_sanctioned', formData.amount_sanctioned || '');
      submitData.append('participants', formData.participants);
      submitData.append('document_link', formData.document_link || '');

      if (formData.proof) {
        submitData.append('proof', formData.proof);
      }

      if (currentRecord) {
        await updateEventOrganized(currentRecord.id, submitData);
        toast.success('Event updated successfully');
      } else {
        await createEventOrganized(submitData);
        toast.success('Event created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      fetchEventsOrganized();
    } catch (error) {
      console.error('Error saving Event:', error);
      toast.error('Failed to save Event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { field: 'program_name', header: 'Name of the Programme' },
    { field: 'program_title', header: 'Title of the Programme' },
    { field: 'coordinator_name', header: 'Name of the Coordinator / Convener' },
    {
      field: 'co_coordinator_names',
      header: 'Name of the Co-coordinator(s)',
      render: (row) => {
        const val = row.co_coordinator_names || row.coordinators;
        if (!val) return '—';
        let list = [];
        if (Array.isArray(val)) {
          list = val.map(item => (typeof item === 'object' ? item.coordinator_name : String(item))).filter(Boolean);
        } else if (typeof val === 'string') {
          list = val.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (list.length === 0) return '—';
        return (
          <ul className="list-disc list-inside space-y-1 text-left text-sm">
            {list.map((name, idx) => (
              <li key={idx} className="break-words">{name}</li>
            ))}
          </ul>
        );
      }
    },
    {
      field: 'with_funding',
      header: 'With Funding',
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.with_funding === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
          {row.with_funding || 'No'}
        </span>
      )
    },
    {
      field: 'with_self_supporting',
      header: 'With Self Supporting',
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.with_self_supporting === 'Yes' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
          {row.with_self_supporting || 'No'}
        </span>
      )
    },
    { field: 'speaker_details', header: 'Name of the Speaker & Designation and Organization' },
    {
      field: 'from_date',
      header: 'From Date',
      render: (rowData) => formatDateForDisplay(rowData.from_date)
    },
    {
      field: 'to_date',
      header: 'To Date',
      render: (rowData) => formatDateForDisplay(rowData.to_date)
    },
    { field: 'days', header: 'No. of Days' },
    { field: 'sponsored_by', header: 'Sponsored By' },
    {
      field: 'amount_sanctioned',
      header: 'Amount Sanctioned',
      render: (row) => (row.amount_sanctioned ? `₹${Number(row.amount_sanctioned).toLocaleString('en-IN')}` : '—')
    },
    { field: 'participants', header: 'No. of Participants' },
    {
      field: 'proof',
      header: 'Proof Document',
      render: (row) => renderFileLink(row)
    },
    {
      field: 'document_link',
      header: 'Link (Permission, Brochure, Attendance, etc.)',
      render: (row) => (
        row.document_link ? (
          <a
            href={row.document_link.startsWith('http') ? row.document_link : `https://${row.document_link}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 underline font-medium text-xs"
          >
            <ExternalLink size={13} />
            View Link
          </a>
        ) : (
          <span className="text-gray-400 text-sm">No link</span>
        )
      )
    }
  ];

  const excelColumns = [
    {
      key: 'program_name',
      label: 'Name of the Programme',
      required: true,
      options: masterProgramOptions,
      isDynamicMaster: true,
      example: 'Workshop'
    },
    { key: 'program_title', label: 'Title of the Programme', required: true, example: 'AI & ML in Healthcare' },
    { key: 'coordinator_name', label: 'Name of the Coordinator / Convener', required: true, example: 'Dr. Sarah Connor' },
    { key: 'co_coordinator_names', label: 'Name of the Co-coordinator(s)', required: false, example: 'Dr. A. Sharma, Prof. B. Kumar' },
    { key: 'with_funding', label: 'With Funding', required: true, options: ['Yes', 'No'], example: 'Yes' },
    { key: 'with_self_supporting', label: 'With Self Supporting', required: true, options: ['Yes', 'No'], example: 'No' },
    { key: 'speaker_details', label: 'Name of the Speaker & Designation and Organization', required: true, example: 'Dr. C. Roy, Professor, IIT Madras' },
    { key: 'from_date', label: 'From Date', required: true, type: 'date', example: '2026-06-10' },
    { key: 'to_date', label: 'To Date', required: true, type: 'date', example: '2026-06-12' },
    { key: 'days', label: 'No. of Days', required: false, type: 'number', example: 3 },
    { key: 'sponsored_by', label: 'Sponsored By', required: false, example: 'AICTE / IEEE' },
    { key: 'amount_sanctioned', label: 'Amount Sanctioned', required: false, type: 'number', example: 100000 },
    { key: 'participants', label: 'No. of Participants', required: true, type: 'number', example: 120 },
    { key: 'proof', label: 'Proof Document File Name', required: false, type: 'file', example: 'event_proof.pdf' },
    { key: 'document_link', label: 'Link (Permission Letter, Brochure, etc.)', required: false, example: 'https://drive.google.com/...' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Events Organized</h1>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn flex items-center gap-2 text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-md shadow-sm text-sm font-semibold transition-colors"
              onClick={() => setIsExcelModalOpen(true)}
            >
              <Upload size={16} />
              Excel Bulk Upload
            </button>
            <button
              onClick={handleAddNew}
              className="btn flex items-center gap-2 text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 px-4 py-2 rounded-md shadow-md text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              Add New Event
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <DataTable
            data={eventsOrganized}
            columns={columns}
            wrapText={true}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={loading}
          />
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isViewMode ? 'View Event' : currentRecord ? 'Edit Event' : 'Add New Event'}
          onSubmit={!isViewMode ? handleSubmit : null}
          isSubmitting={isSubmitting}
          size="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* 1. Name of the Programme */}
              <MasterSelect
                label="Name of the Programme"
                name="program_name"
                masterType="event-type"
                displayField="type_name"
                value={formData.program_name}
                onChange={handleInputChange}
                required
                disabled={isViewMode}
                placeholder="Select Programme..."
              />

              {/* 2. Title of the Programme */}
              <div className="md:col-span-2">
                <FormField
                  label="Title of the Programme"
                  name="program_title"
                  type="textarea"
                  value={formData.program_title}
                  onChange={handleInputChange}
                  required
                  disabled={isViewMode}
                  placeholder="Enter title of the programme"
                />
              </div>

              {/* 3. Name of the Coordinator / Convener */}
              <FormField
                label="Name of the Coordinator / Convener"
                name="coordinator_name"
                value={formData.coordinator_name}
                onChange={handleInputChange}
                required
                disabled={isViewMode}
                placeholder="Enter coordinator / convener name"
              />

              {/* 4. Name of the Co-coordinator(s) - 2NF TagInput */}
              <div className="md:col-span-2">
                <TagInput
                  label="Name of the Co-coordinator(s)"
                  values={formData.co_coordinator_names}
                  onChange={(tags) => setFormData((prev) => ({ ...prev, co_coordinator_names: tags }))}
                  placeholder="Type co-coordinator name and press enter..."
                  buttonText="Add Co-coordinator"
                  disabled={isViewMode}
                />
              </div>

              {/* 5. With Funding */}
              <FormField
                label="With Funding"
                name="with_funding"
                type="select"
                options={booleanOptions}
                value={formData.with_funding}
                onChange={handleInputChange}
                required
                disabled={isViewMode}
              />

              {/* 6. With Self Supporting */}
              <FormField
                label="With Self Supporting"
                name="with_self_supporting"
                type="select"
                options={booleanOptions}
                value={formData.with_self_supporting}
                onChange={handleInputChange}
                required
                disabled={isViewMode}
              />

              {/* 7. Name of the Speaker & Designation and Organization */}
              <div className="md:col-span-2">
                <FormField
                  label="Name of the Speaker & Designation and Organization"
                  name="speaker_details"
                  type="textarea"
                  value={formData.speaker_details}
                  onChange={handleInputChange}
                  required
                  disabled={isViewMode}
                  placeholder="Enter speaker name, designation, and organization"
                />
              </div>

              {/* 8. From Date */}
              <FormField
                label="From Date"
                name="from_date"
                type="date"
                value={formData.from_date}
                onChange={handleInputChange}
                required
                disabled={isViewMode}
              />

              {/* 9. To Date */}
              <FormField
                label="To Date"
                name="to_date"
                type="date"
                value={formData.to_date}
                onChange={handleInputChange}
                required
                disabled={isViewMode}
              />

              {/* 10. No. of Days */}
              <FormField
                label="No. of Days"
                name="days"
                type="number"
                value={formData.days}
                onChange={handleInputChange}
                disabled={isViewMode}
                placeholder="Auto-calculated from dates"
              />

              {/* 11. Sponsored By */}
              <FormField
                label="Sponsored By"
                name="sponsored_by"
                value={formData.sponsored_by}
                onChange={handleInputChange}
                disabled={isViewMode}
                placeholder="Enter sponsoring agency (if applicable)"
              />

              {/* 12. Amount Sanctioned */}
              <FormField
                label="Amount Sanctioned (₹)"
                name="amount_sanctioned"
                type="number"
                step="0.01"
                value={formData.amount_sanctioned}
                onChange={handleInputChange}
                disabled={isViewMode}
                placeholder="e.g. 50000.00"
              />

              {/* 13. No. of Participants */}
              <FormField
                label="No. of Participants"
                name="participants"
                type="number"
                value={formData.participants}
                onChange={handleInputChange}
                required
                disabled={isViewMode}
                placeholder="Enter number of participants"
              />

              {/* 14. Proof Document */}
              <div className="md:col-span-2">
                <FileUploadField
                  label="Proof Document"
                  name="proof"
                  accept=".pdf"
                  value={formData.proof || ((currentRecord?.has_proof || currentRecord?.proof) ? 'available' : null)}
                  disabled={isViewMode}
                  onChange={(file) => setFormData((prev) => ({ ...prev, proof: file }))}
                  onClear={() => setFormData((prev) => ({ ...prev, proof: null }))}
                  onView={(currentRecord?.has_proof || currentRecord?.proof) ? () => handleViewProof(currentRecord.id, currentRecord.program_title) : undefined}
                  hint="PDF document up to 10MB"
                />
              </div>

              {/* 15. Link */}
              <div className="md:col-span-2">
                <FormField
                  label="Link - Whether the Permission Letter, Programme Brochure, Participants List, Attendance, Resource Persons Details, Programme Schedule, Utilization Certificate, and Report are uploaded"
                  name="document_link"
                  type="url"
                  value={formData.document_link}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  placeholder="https://drive.google.com/... or link to documents"
                />
              </div>

              {isViewMode && (
                <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
                  {(currentRecord?.has_proof || currentRecord?.proof) && (
                    <button
                      type="button"
                      onClick={() => handleViewProof(currentRecord.id, currentRecord.program_title)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors cursor-pointer"
                    >
                      <FileText size={16} />
                      View Uploaded Document
                    </button>
                  )}
                  {formData.document_link && (
                    <a
                      href={formData.document_link.startsWith('http') ? formData.document_link : `https://${formData.document_link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md shadow-sm transition-colors"
                    >
                      <ExternalLink size={16} />
                      Open Document Link
                    </a>
                  )}
                </div>
              )}

            </div>
          </div>
        </Modal>

        {/* PDF Viewer Modal */}
        {pdfViewerState.isOpen && (
          <Modal
            isOpen={pdfViewerState.isOpen}
            onClose={() => {
              if (pdfViewerState.url) {
                URL.revokeObjectURL(pdfViewerState.url);
              }
              setPdfViewerState({ isOpen: false, url: null, title: '', fileName: '' });
            }}
            title={pdfViewerState.title || 'View PDF Document'}
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
                    download={pdfViewerState.fileName || 'document.pdf'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors border border-indigo-200 shadow-2xs"
                  >
                    Download PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const w = window.open();
                      if (w) {
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

              <div className="w-full h-[75vh] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-inner flex items-center justify-center">
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
              </div>
            </div>
          </Modal>
        )}

        {/* Excel Bulk Upload Modal */}
        <ExcelBulkUploadModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          title="Bulk Upload Events Organized"
          columns={excelColumns}
          onUpload={async (validRows) => {
            await bulkCreateEventsOrganized(validRows);
            fetchEventsOrganized();
          }}
          templateFilename="Events_Organized_Template.xlsx"
        />
      </div>
    </div>
  );
};

export default EventsOrganizedPage;
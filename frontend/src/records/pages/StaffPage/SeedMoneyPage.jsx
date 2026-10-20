import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit, Trash2, FileText, Upload } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import FileUploadField from '../../components/FileUploadField';
import ExcelBulkUploadModal from '../../components/ExcelBulkUploadModal';
import {
  api,
  getSeedMoneyEntries,
  createSeedMoneyEntry,
  updateSeedMoneyEntry,
  deleteSeedMoneyEntry,
  bulkCreateSeedMoney,
} from '../../services/api';
import toast from 'react-hot-toast';
import { formatDisplayDate } from '../../utils/dateUtils';

const SeedMoneyPage = () => {
  const [entries, setEntries] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfViewerState, setPdfViewerState] = useState({
    isOpen: false,
    url: null,
    title: '',
    fileName: ''
  });
  const [formData, setFormData] = useState({
    projectTitle: '',
    duration: '',
    fromDate: '',
    toDate: '',
    amount: '',
    outcomes: '',
    proofLink: null
  });

  const resetForm = () => {
    setFormData({
      projectTitle: '',
      duration: '',
      fromDate: '',
      toDate: '',
      amount: '',
      outcomes: '',
      proofLink: null
    });
    setEditingItem(null);
    setIsViewOnly(false);
  };

  // Fetch all seed money entries
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getSeedMoneyEntries();
      let arr = [];
      if (response) {
        if (Array.isArray(response)) arr = response;
        else if (Array.isArray(response.data)) arr = response.data;
        else if (Array.isArray(response.data?.data)) arr = response.data.data;
      }
      setEntries(arr);
    } catch (error) {
      console.error('Error fetching seed money entries:', error);
      toast.error('Failed to fetch seed money entries');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize data fetch on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Reset form when editing item changes
  useEffect(() => {
    if (editingItem) {
      setFormData({
        projectTitle: editingItem.project_title || '',
        duration: editingItem.project_duration || '',
        fromDate: editingItem.from_date ? editingItem.from_date.split('T')[0] : '',
        toDate: editingItem.to_date ? editingItem.to_date.split('T')[0] : '',
        amount: editingItem.amount || '',
        outcomes: editingItem.outcomes || '',
        proofLink: null // Always null for file input
      });
    } else {
      resetForm();
    }
  }, [editingItem]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === 'file') {
      const file = files[0];
      if (file) {
        // Validate file type
        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
          toast.error('Please select a PDF file only');
          e.target.value = '';
          return;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error('File size must be less than 10MB');
          e.target.value = '';
          return;
        }

        console.log('File selected:', file.name, file.type, file.size);
      }

      setFormData(prev => ({
        ...prev,
        [name]: file || null,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (isViewOnly) return;

    // Validation
    const validationErrors = [];
    if (!formData.projectTitle.trim()) validationErrors.push('Project Title is required');
    if (!formData.duration.trim()) validationErrors.push('Duration is required');
    if (!formData.fromDate) validationErrors.push('From Date is required');
    if (!formData.toDate) validationErrors.push('To Date is required');
    if (!formData.amount.trim()) validationErrors.push('Amount is required');

    // Date validation
    if (formData.fromDate && formData.toDate) {
      const fromDate = new Date(formData.fromDate);
      const toDate = new Date(formData.toDate);
      if (fromDate >= toDate) {
        validationErrors.push('From Date must be before To Date');
      }
    }

    // Validation
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(', '));
      return;
    }

    // Prepare form data
    const formDataToSend = new FormData();
    formDataToSend.append('project_title', formData.projectTitle.trim());
    formDataToSend.append('project_duration', formData.duration.trim());
    formDataToSend.append('from_date', formData.fromDate);
    formDataToSend.append('to_date', formData.toDate);
    formDataToSend.append('amount', formData.amount.trim());
    formDataToSend.append('outcomes', (formData.outcomes && formData.outcomes.trim()) ? formData.outcomes.trim() : 'N/A');

    if (formData.proofLink) {
      formDataToSend.append('proof_link', formData.proofLink);
      console.log('Uploading file:', formData.proofLink.name);
    }

    setLoading(true);
    try {
      if (editingItem) {
        await updateSeedMoneyEntry(editingItem.id, formDataToSend);
        toast.success('Entry updated successfully');
      } else {
        await createSeedMoneyEntry(formDataToSend);
        toast.success('Entry added successfully');
      }

      setModalOpen(false);
      resetForm();
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error saving entry:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save entry';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete operation
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await deleteSeedMoneyEntry(id);
      toast.success('Entry deleted successfully');
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting entry:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete entry';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle view operation
  const handleView = (item) => {
    console.log('Viewing item:', item);
    setEditingItem(item);
    setIsViewOnly(true);
    setModalOpen(true);
  };

  // Handle edit operation
  const handleEdit = (item) => {
    console.log('Editing item:', item);
    setEditingItem(item);
    setIsViewOnly(false);
    setModalOpen(true);
  };

  // Handle PDF viewing
  const handleViewProof = async (id, projectTitle = '') => {
    try {
      const response = await api.get(`/seed-money/proof/${id}`, { responseType: 'blob' });

      if (!response.data || response.data.size === 0) {
        toast.error('Proof document is empty or unavailable');
        return;
      }

      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        try {
          const json = JSON.parse(text);
          toast.error(json.message || 'Proof document not available');
        } catch {
          toast.error('Proof document not available');
        }
        return;
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      setPdfViewerState({
        isOpen: true,
        url: url,
        title: `Proof Document - ${projectTitle || 'Seed Money'}`,
        fileName: 'seed_money_proof.pdf'
      });
    } catch (error) {
      console.error('Error fetching proof PDF:', error);
      let errorMsg = 'Proof document not available';
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

  // Close modal handler
  const handleCloseModal = () => {
    setModalOpen(false);
    resetForm();
  };

  // Table columns configuration
  const columns = [
    {
      header: 'Project Title',
      field: 'project_title',
      render: (row) => (
        <div className="font-medium text-gray-900">
          {row.project_title || 'N/A'}
        </div>
      )
    },
    {
      header: 'Project Duration',
      field: 'project_duration',
      render: (row) => (
        <span className="text-gray-700">
          {row.project_duration || 'N/A'}
        </span>
      )
    },
    {
      header: 'From Date',
      field: 'from_date',
      render: (row) => (
        <span className="text-gray-700 whitespace-nowrap">
          {row.from_date ? formatDisplayDate(row.from_date) : 'N/A'}
        </span>
      )
    },
    {
      header: 'To Date',
      field: 'to_date',
      render: (row) => (
        <span className="text-gray-700 whitespace-nowrap">
          {row.to_date ? formatDisplayDate(row.to_date) : 'N/A'}
        </span>
      )
    },
    {
      header: 'Amount (₹)',
      field: 'amount',
      render: (row) => (
        <span className="text-gray-700 font-medium">
          ₹{row.amount ? Number(row.amount).toLocaleString() : '0'}
        </span>
      )
    },
    {
      header: 'Project Outcomes',
      field: 'outcomes',
      render: (row) => (
        <div className="text-gray-700">
          {row.outcomes || 'N/A'}
        </div>
      )
    },
    {
      header: 'Proof Document',
      field: 'proof_link',
      render: (row) => (
        row.proof_link ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleViewProof(row.id, row.project_title);
            }}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-full transition-colors duration-200 border border-indigo-200 font-medium"
            title="Click to view PDF"
          >
            <FileText size={14} />
            View PDF
          </button>
        ) : (
          <span className="text-gray-400 text-sm">No file</span>
        )
      ),
    },
  ];

  const excelColumns = [
    { key: 'project_title', label: 'Project Title', required: true, example: 'IoT Based Smart Agriculture' },
    { key: 'project_duration', label: 'Project Duration', required: true, example: '1 Year' },
    { key: 'from_date', label: 'From Date', required: true, type: 'date', example: '2026-01-01' },
    { key: 'to_date', label: 'To Date', required: true, type: 'date', example: '2026-12-31' },
    { key: 'amount', label: 'Amount (₹)', required: true, type: 'number', example: 50000 },
    { key: 'outcomes', label: 'Project Outcomes', required: false, example: '1 Prototype Developed' },
    { key: 'proof_link', label: 'Proof Document File Name', required: false, type: 'file', example: 'seed_money_proof.pdf' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Seed Money</h2>
            <p className="text-sm text-gray-600">Submit and manage internal seed money grants</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-md font-semibold text-sm shadow-xs"
              onClick={() => setIsExcelModalOpen(true)}
            >
              <Upload size={16} />
              Excel Bulk Upload
            </button>
            <button
              type="button"
              className="btn flex items-center gap-2 text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 px-4 py-2 rounded-md shadow-md text-sm font-semibold"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
            >
              <Plus size={16} />
              Add Seed Money
            </button>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
              <p className="text-gray-500">Get started by adding your first seed money entry.</p>
            </div>
          ) : (
            <DataTable
              data={entries}
              columns={columns}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={(item) => handleDelete(item.id)}
              wrapText={true}
            />
          )}
        </div>

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          title={
            editingItem
              ? (isViewOnly ? 'View Seed Money Entry' : 'Edit Seed Money Entry')
              : 'Add New Seed Money Entry'
          }
          onSubmit={handleSubmit}
          disableSubmit={isViewOnly || loading}
          submitText={loading ? 'Saving...' : (editingItem ? 'Update Entry' : 'Add Entry')}
          size="lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Title */}
            <FormField
              label="Project Title"
              name="projectTitle"
              value={formData.projectTitle}
              onChange={handleChange}
              readOnly={isViewOnly}
              required
              placeholder="Enter project title"
            />

            {/* Duration */}
            <FormField
              label="Project Duration"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              readOnly={isViewOnly}
              required
              placeholder="e.g., 6 months, 1 year"
            />

            {/* From Date */}
            <FormField
              label="From Date"
              name="fromDate"
              type="date"
              value={formData.fromDate}
              onChange={handleChange}
              readOnly={isViewOnly}
              required
            />

            {/* To Date */}
            <FormField
              label="To Date"
              name="toDate"
              type="date"
              value={formData.toDate}
              onChange={handleChange}
              readOnly={isViewOnly}
              required
            />

            {/* Amount */}
            <FormField
              label="Amount (in Lacs)"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              readOnly={isViewOnly}
              required
              placeholder="0.00"
            />

            {/* Outcomes */}
            <FormField
              label="Project Outcomes"
              name="outcomes"
              type="textarea"
              rows="4"
              value={formData.outcomes}
              onChange={handleChange}
              readOnly={isViewOnly}
              required
              placeholder="Describe the expected or achieved outcomes..."
            />

            {/* File Upload */}
            <div>
              <FileUploadField
                label="Proof Document"
                name="proofLink"
                accept=".pdf"
                value={formData.proofLink || (editingItem?.proof_link ? 'available' : null)}
                disabled={isViewOnly}
                onChange={(file) => setFormData((prev) => ({ ...prev, proofLink: file }))}
                onClear={() => setFormData((prev) => ({ ...prev, proofLink: null }))}
                onView={editingItem?.proof_link ? () => handleViewProof(editingItem.id, editingItem.project_title) : undefined}
                hint="PDF file up to 10MB"
              />
            </div>
          </div>
        </Modal>

        {/* Excel Bulk Upload Modal */}
        <ExcelBulkUploadModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          title="Bulk Upload Seed Money"
          columns={excelColumns}
          onUpload={async (validRows) => {
            await bulkCreateSeedMoney(validRows);
            fetchData();
          }}
          templateFilename="Seed_Money_Template.xlsx"
        />

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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 rounded-md transition-colors border border-gray-300 shadow-2xs"
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
      </div>
    </div>
  );
};

export default SeedMoneyPage;
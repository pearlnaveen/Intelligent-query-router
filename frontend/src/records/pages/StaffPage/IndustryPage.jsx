import React, { useState, useEffect } from 'react';
import { Plus, FileText, ExternalLink, X, Upload } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import FileUploadField from '../../components/FileUploadField';
import ExcelBulkUploadModal from '../../components/ExcelBulkUploadModal';
import {
  getIndustryKnowhow,
  createIndustryKnowhow,
  updateIndustryKnowhow,
  deleteIndustryKnowhow,
  getIndustryCertificatePDF,
  bulkCreateIndustryKnowhow
} from '../../services/api';
import toast from 'react-hot-toast';
import { formatDisplayDate } from '../../utils/dateUtils';

const IndustryPage = () => {
  const [industry, setIndustry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [pdfViewerState, setPdfViewerState] = useState({
    isOpen: false,
    url: null,
    title: '',
    fileName: ''
  });

  const [formData, setFormData] = useState({
    internship_name: '',
    title: '',
    company: '',
    outcomes: '',
    from_date: '',
    to_date: '',
    venue: '',
    participants: '',
    financial_support: false,
    support_amount: '',
    certificate_link: ''
  });

  const fetchIndustry = async () => {
    try {
      setLoading(true);
      const response = await getIndustryKnowhow();

      let dataArray = [];

      if (response && response.data) {
        if (response.data.data && Array.isArray(response.data.data)) {
          dataArray = response.data.data;
        } else if (Array.isArray(response.data)) {
          dataArray = response.data;
        } else if (response.data.success && Array.isArray(response.data.data)) {
          dataArray = response.data.data;
        } else {
          dataArray = [];
        }
      } else if (Array.isArray(response)) {
        dataArray = response;
      } else {
        dataArray = [];
      }

      setIndustry(dataArray);
    } catch (error) {
      console.error('Error fetching industry knowhow:', error);
      toast.error('Failed to load industry knowhow');
      setIndustry([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndustry();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleViewPDF = async (id) => {
    try {
      const blob = await getIndustryCertificatePDF(id);
      if (!blob) {
        toast.error('Certificate document not available');
        return;
      }

      if (blob.type === 'application/json') {
        const text = await blob.text();
        try {
          const json = JSON.parse(text);
          toast.error(json.message || 'Certificate document not available');
        } catch {
          toast.error('Certificate document not available');
        }
        return;
      }

      if (blob.size === 0) {
        toast.error('Certificate document is empty or unavailable');
        return;
      }

      const itemTitle = currentItem?.title || currentItem?.internship_name || 'Industry Know How';
      const url = window.URL.createObjectURL(blob);

      setPdfViewerState({
        isOpen: true,
        url: url,
        title: `Certificate - ${itemTitle}`,
        fileName: 'Industry_Certificate.pdf'
      });
    } catch (error) {
      console.error('Error viewing PDF:', error);
      toast.error('Failed to view certificate PDF');
    }
  };

  const resetForm = () => {
    setFormData({
      internship_name: '',
      title: '',
      company: '',
      outcomes: '',
      from_date: '',
      to_date: '',
      venue: '',
      participants: '',
      financial_support: false,
      support_amount: '',
      certificate_link: ''
    });
    setCurrentItem(null);
    setIsViewMode(false);
    setPdfFile(null);
    setRemovePdf(false);
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setCurrentItem(item);
    setFormData({
      internship_name: item.internship_name || '',
      title: item.title || '',
      company: item.company || '',
      outcomes: item.outcomes || '',
      from_date: item.from_date ? item.from_date.split('T')[0] : '',
      to_date: item.to_date ? item.to_date.split('T')[0] : '',
      venue: item.venue || '',
      participants: item.participants?.toString() || '',
      financial_support: Boolean(item.financial_support),
      support_amount: item.support_amount?.toString() || '',
      certificate_link: item.certificate_link || ''
    });
    setIsViewMode(false);
    setPdfFile(null);
    setRemovePdf(false);
    setIsModalOpen(true);
  };

  const handleView = (item) => {
    setCurrentItem(item);
    setFormData({
      internship_name: item.internship_name || '',
      title: item.title || '',
      company: item.company || '',
      outcomes: item.outcomes || '',
      from_date: item.from_date ? item.from_date.split('T')[0] : '',
      to_date: item.to_date ? item.to_date.split('T')[0] : '',
      venue: item.venue || '',
      participants: item.participants?.toString() || '',
      financial_support: Boolean(item.financial_support),
      support_amount: item.support_amount?.toString() || '',
      certificate_link: item.certificate_link || ''
    });
    setIsViewMode(true);
    setPdfFile(null);
    setRemovePdf(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete this industry knowhow: ${item.title}?`)) {
      try {
        await deleteIndustryKnowhow(item.id);
        toast.success('Industry knowhow deleted successfully');
        fetchIndustry();
      } catch (error) {
        console.error('Error deleting industry knowhow:', error);
        toast.error('Failed to delete industry knowhow');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const requiredFields = ['internship_name', 'title', 'company', 'from_date', 'to_date', 'participants'];
      const missingFields = requiredFields.filter(field => !formData[field] || formData[field].toString().trim() === '');

      if (missingFields.length > 0) {
        toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
        return;
      }

      if (new Date(formData.from_date) > new Date(formData.to_date)) {
        toast.error('From date cannot be later than to date');
        return;
      }

      if (parseInt(formData.participants) <= 0) {
        toast.error('Number of participants must be greater than 0');
        return;
      }

      const submitData = new FormData();
      submitData.append('internship_name', formData.internship_name.trim());
      submitData.append('title', formData.title.trim());
      submitData.append('company', formData.company.trim());
      submitData.append('outcomes', (formData.outcomes || 'N/A').trim());
      submitData.append('from_date', formData.from_date);
      submitData.append('to_date', formData.to_date);
      submitData.append('venue', (formData.venue || formData.company || 'Main Campus').trim());
      submitData.append('participants', parseInt(formData.participants));
      submitData.append('financial_support', Boolean(formData.financial_support));

      if (formData.financial_support && formData.support_amount) {
        const amount = parseFloat(formData.support_amount);
        if (amount <= 0) {
          toast.error('Please enter a valid support amount');
          return;
        }
        submitData.append('support_amount', amount);
      } else {
        submitData.append('support_amount', '');
      }

      submitData.append('certificate_link', (formData.certificate_link || '').trim());

      if (pdfFile) {
        submitData.append('certificate_pdf', pdfFile);
      }

      if (currentItem && removePdf) {
        submitData.append('remove_pdf', 'true');
      }

      if (currentItem) {
        await updateIndustryKnowhow(currentItem.id, submitData);
        toast.success('Industry knowhow updated successfully');
      } else {
        await createIndustryKnowhow(submitData);
        toast.success('Industry knowhow created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      fetchIndustry();
    } catch (error) {
      console.error('Error saving industry knowhow:', error);

      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 400) {
        toast.error('Invalid data provided. Please check all fields.');
      } else {
        toast.error('Failed to save industry knowhow. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async (validRows) => {
    try {
      await bulkCreateIndustryKnowhow(validRows);
      toast.success(`Successfully uploaded ${validRows.length} industry knowhow records!`);
      fetchIndustry();
    } catch (error) {
      console.error('Error bulk uploading industry knowhow:', error);
      toast.error(error.response?.data?.message || 'Failed to upload bulk industry knowhow records');
    }
  };

  const formatDate = (dateString) => {
    return formatDisplayDate(dateString);
  };

  const formatDuration = (fromDate, toDate) => {
    if (!fromDate && !toDate) return '-';
    if (fromDate && !toDate) return formatDate(fromDate);
    if (!fromDate && toDate) return formatDate(toDate);
    return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
  };

  const renderCertificateLink = (value) => {
    if (!value) return '-';
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 hover:text-blue-800 flex items-center gap-1"
      >
        <ExternalLink size={14} />
        View
      </a>
    );
  };

  const formatFinancialSupport = (isSupported, amount) => {
    if (!isSupported) return 'No';
    return `Yes (₹${amount || 0})`;
  };

  const columns = [
    { field: 'internship_name', header: 'Internship / Training / Collaboration' },
    { field: 'title', header: 'Title of Program' },
    { field: 'company', header: 'Company / Organization & Place' },
    {
      field: 'outcomes',
      header: 'Outcomes',
      render: (item) => item.outcomes || '-'
    },
    {
      field: 'duration',
      header: 'Duration',
      render: (item) => formatDuration(item.from_date, item.to_date)
    },
    { field: 'venue', header: 'Venue' },
    {
      field: 'participants',
      header: 'Participants',
      render: (item) => item.participants ?? '-'
    },
    {
      field: 'financial_support',
      header: 'Financial Support',
      render: (item) => formatFinancialSupport(item.financial_support, item.support_amount)
    },
    {
      field: 'certificate_link',
      header: 'Link',
      render: (item) => renderCertificateLink(item.certificate_link)
    },
    {
      field: 'has_pdf',
      header: 'Certificate PDF',
      render: (item) =>
        item.has_pdf ? (
          <button
            onClick={() => handleViewPDF(item.id)}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-full border border-indigo-200 transition-colors"
          >
            <FileText size={14} /> PDF
          </button>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        ),
    },
  ];

  const excelColumns = [
    { key: 'internship_name', label: 'Name of the Internship / Training / Collaboration', required: true, example: 'Faculty Industry Training' },
    { key: 'title', label: 'Title of the Program', required: true, example: 'Cloud Architecture & DevOps' },
    { key: 'company', label: 'Name of the Company & Place or Name of the R&D Organization or Reputed Institution', required: true, example: 'Tata Consultancy Services, Chennai' },
    { key: 'outcomes', label: 'Outcomes of Internship / Training / Collaboration', required: false, example: 'Organized 2 student workshops, 1 prototype developed' },
    { key: 'from_date', label: 'From Date', required: true, type: 'date', example: '2026-05-01' },
    { key: 'to_date', label: 'To Date', required: true, type: 'date', example: '2026-05-15' },
    { key: 'venue', label: 'Venue', required: false, example: 'TCS Campus, Chennai' },
    { key: 'participants', label: 'Number of Participants', required: false, type: 'number', example: 30 },
    { key: 'financial_support', label: 'Received Financial Support from NEC (Yes/No)', required: false, options: ['Yes', 'No'], example: 'Yes' },
    { key: 'support_amount', label: 'If Received, Mention the Amount', required: false, type: 'number', example: 15000 },
    { key: 'certificate_link', label: 'Certificate Link / File Name', required: false, type: 'file', example: 'industry_certificate.pdf' },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Industry Knowhow</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and track industry internships, trainings & collaborations</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-md font-semibold text-sm shadow-xs transition-colors"
            onClick={() => setIsExcelModalOpen(true)}
          >
            <Upload size={16} />
            Excel Bulk Upload
          </button>
          <button
            onClick={handleAddNew}
            className="btn flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md shadow-md text-sm font-semibold transition-all"
          >
            <Plus size={16} />
            Add New Industry Knowhow
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <DataTable
          data={Array.isArray(industry) ? industry : []}
          columns={columns}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={loading}
          wrapText={true}
          emptyMessage="No industry knowhow records found. Add your first record to get started."
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={isViewMode ? 'View Industry Knowhow' : currentItem ? 'Edit Industry Knowhow' : 'Add New Industry Knowhow'}
        onSubmit={!isViewMode ? handleSubmit : null}
        isSubmitting={isSubmitting}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">

          {/* Name of Internship / Training / Collaboration */}
          <FormField
            label="Name of the Internship / Training / Collaboration *"
            name="internship_name"
            value={formData.internship_name}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            placeholder="Enter internship or training name"
          />

          {/* Title of the Program */}
          <FormField
            label="Title of the Program *"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            placeholder="Enter program title"
          />

          {/* Company / R&D Organization */}
          <div className="md:col-span-2">
            <FormField
              label="Name of the Company & Place or Name of the R&D Organization or Reputed Institution *"
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              required
              disabled={isViewMode}
              placeholder="Enter company, place or organization name"
            />
          </div>

          {/* Outcomes */}
          <div className="md:col-span-2">
            <FormField
              label="Outcomes of Internship / Training / Collaboration *"
              name="outcomes"
              type="textarea"
              value={formData.outcomes}
              onChange={handleInputChange}
              required
              disabled={isViewMode}
              placeholder="Mention number of programs organized, working models/prototypes developed, joint research papers published, funded projects received, etc."
            />
          </div>

          {/* From Date & To Date */}
          <FormField
            label="From Date *"
            name="from_date"
            type="date"
            value={formData.from_date}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
          />
          <FormField
            label="To Date *"
            name="to_date"
            type="date"
            value={formData.to_date}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
          />

          {/* Venue */}
          <FormField
            label="Venue *"
            name="venue"
            value={formData.venue}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            placeholder="Enter venue / location"
          />

          {/* Number of Participants */}
          <FormField
            label="Number of Participants *"
            name="participants"
            type="number"
            value={formData.participants}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            min="1"
            placeholder="e.g. 30"
          />

          {/* Received Financial Support from NEC */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="financial_support"
              name="financial_support"
              checked={formData.financial_support}
              onChange={handleInputChange}
              disabled={isViewMode}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="financial_support" className="text-sm font-medium text-gray-700">
              Received Financial Support from NEC (Yes/No)
            </label>
          </div>

          {/* If Received, Mention the Amount */}
          {formData.financial_support && (
            <FormField
              label="If Received, Mention the Amount (₹)"
              name="support_amount"
              type="number"
              value={formData.support_amount}
              onChange={handleInputChange}
              disabled={isViewMode}
              min="0"
              step="0.01"
              placeholder="e.g. 15000"
            />
          )}

          {/* Certificate Link */}
          <div className="md:col-span-2">
            <FormField
              label="Certificate Link"
              name="certificate_link"
              value={formData.certificate_link}
              onChange={handleInputChange}
              disabled={isViewMode}
              placeholder="https://..."
            />
          </div>

          {/* Certificate PDF File */}
          <div className="md:col-span-2">
            <FileUploadField
              label="Certificate PDF"
              name="pdfFile"
              accept=".pdf"
              value={pdfFile || (currentItem && currentItem.has_pdf && !removePdf ? `available` : null)}
              onChange={(file) => setPdfFile(file)}
              onClear={() => { setPdfFile(null); setRemovePdf(true); }}
              onView={currentItem?.has_pdf ? () => handleViewPdf(currentItem.id) : undefined}
              disabled={isViewMode}
              hint="PDF format up to 10MB"
            />
          </div>

          {isViewMode && (
            <div className="md:col-span-2 flex flex-wrap gap-4 pt-2 border-t border-gray-100">
              {formData.certificate_link && (
                <a
                  href={formData.certificate_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
                >
                  <ExternalLink size={15} />
                  View Certificate Link
                </a>
              )}
              {currentItem && currentItem.has_pdf && (
                <button
                  type="button"
                  onClick={() => handleViewPDF(currentItem.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
                >
                  <FileText size={15} />
                  View Certificate PDF
                </button>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Excel Bulk Upload Modal */}
      <ExcelBulkUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="Bulk Upload Industry Knowhow"
        columns={excelColumns}
        onUpload={async (validRows) => {
          await handleBulkUpload(validRows);
        }}
        templateFilename="Industry_Knowhow_Template.xlsx"
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
  );
};

export default IndustryPage;
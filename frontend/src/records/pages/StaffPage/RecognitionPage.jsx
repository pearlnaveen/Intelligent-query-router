import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, ExternalLink, Upload } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import ExcelBulkUploadModal from '../../components/ExcelBulkUploadModal';
import {
  getRecognitions,
  createRecognition,
  updateRecognition,
  deleteRecognition,
  bulkCreateRecognitions
} from '../../services/api';
import toast from 'react-hot-toast';
import { formatDisplayDate } from '../../utils/dateUtils';

const RecognitionPage = () => {
  const [recognitions, setRecognitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentRecognition, setCurrentRecognition] = useState(null);
  const [pdfViewerState, setPdfViewerState] = useState({
    isOpen: false,
    url: null,
    title: '',
    fileName: '',
    isImage: false
  });

  const [formData, setFormData] = useState({
    category: '',
    program_name: '',
    recognition_date: '',
    proof_link: ''
  });

  const fetchRecognitions = async () => {
    try {
      setLoading(true);
      const response = await getRecognitions();
      let arr = [];
      if (response) {
        if (Array.isArray(response)) arr = response;
        else if (Array.isArray(response.data)) arr = response.data;
        else if (Array.isArray(response.data?.data)) arr = response.data.data;
      }
      setRecognitions(arr);
    } catch (error) {
      console.error('Error fetching recognitions:', error);
      toast.error('Failed to load recognitions');
      setRecognitions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecognitions();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const resetForm = () => {
    setFormData({
      category: '',
      program_name: '',
      recognition_date: '',
      proof_link: ''
    });
    setCurrentRecognition(null);
    setIsViewMode(false);
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (recognition) => {
    setCurrentRecognition(recognition);
    setFormData({
      category: recognition.category || '',
      program_name: recognition.program_name || '',
      recognition_date: recognition.recognition_date ? recognition.recognition_date.split('T')[0] : '',
      proof_link: recognition.proof_link || ''
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (recognition) => {
    setCurrentRecognition(recognition);
    setFormData({
      category: recognition.category || '',
      program_name: recognition.program_name || '',
      recognition_date: recognition.recognition_date ? recognition.recognition_date.split('T')[0] : '',
      proof_link: recognition.proof_link || ''
    });
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (recognition) => {
    if (window.confirm(`Are you sure you want to delete this recognition: ${recognition.program_name}?`)) {
      try {
        await deleteRecognition(recognition.id);
        toast.success('Recognition deleted successfully');
        fetchRecognitions();
      } catch (error) {
        console.error('Error deleting recognition:', error);
        toast.error('Failed to delete recognition');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (!formData.category || !formData.program_name || !formData.recognition_date) {
        toast.error('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      const submitData = {
        category: formData.category,
        program_name: formData.program_name,
        recognition_date: formData.recognition_date,
        proof_link: formData.proof_link || null
      };

      if (currentRecognition) {
        await updateRecognition(currentRecognition.id, submitData);
        toast.success('Recognition updated successfully');
      } else {
        await createRecognition(submitData);
        toast.success('Recognition created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      fetchRecognitions();
    } catch (error) {
      console.error('Error saving recognition:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save recognition';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewProofLink = (linkUrl, title = 'Recognition Proof') => {
    if (!linkUrl) {
      toast.error('Proof link not available');
      return;
    }
    const fullUrl = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    const fileExt = fullUrl.toLowerCase().split('.').pop();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
    const fileName = fullUrl.split('/').pop() || 'recognition_proof';

    setPdfViewerState({
      isOpen: true,
      url: fullUrl,
      title: title,
      fileName: fileName,
      isImage: isImage
    });
  };

  const renderProofLink = (row) => {
    if (!row.proof_link) {
      return <span className="text-gray-400 text-sm">No link</span>;
    }

    const fullUrl = row.proof_link.startsWith('http') ? row.proof_link : `https://${row.proof_link}`;

    return (
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 hover:text-indigo-800 underline font-medium text-sm inline-flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink size={14} />
        View Link
      </a>
    );
  };

  const columns = [
    { field: 'category', header: 'Category' },
    { field: 'program_name', header: 'Program Name' },
    {
      field: 'recognition_date',
      header: 'Recognition Date',
      render: (row) => formatDisplayDate(row.recognition_date) || '-'
    },
    {
      field: 'proof_link',
      header: 'Proof Link',
      render: (row) => renderProofLink(row)
    }
  ];

  const excelColumns = [
    { key: 'category', label: 'Category', required: true, example: 'Best Faculty Award' },
    { key: 'program_name', label: 'Program / Award Name', required: true, example: 'State Education Excellence Summit' },
    { key: 'recognition_date', label: 'Recognition Date', required: true, type: 'date', example: '2026-03-20' },
    { key: 'proof_link', label: 'Proof Document File Name', required: false, type: 'file', example: 'recognition_proof.pdf' },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Recognition & Awards</h2>
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
            onClick={handleAddNew}
            className="btn flex items-center gap-2 text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 px-4 py-2 rounded-md shadow-md text-sm font-semibold"
          >
            <Plus size={16} />
            Add New Recognition
          </button>
        </div>
      </div>

      <DataTable
        data={recognitions}
        columns={columns}
        wrapText={true}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isViewMode ? 'View Recognition' : currentRecognition ? 'Edit Recognition' : 'Add New Recognition'}
        onSubmit={!isViewMode ? handleSubmit : null}
        isSubmitting={isSubmitting}
      >
        <div className="grid grid-cols-1 gap-4">
          <FormField
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            placeholder="e.g., Best Paper Award, Excellence Award"
          />

          <FormField
            label="Program Name"
            name="program_name"
            value={formData.program_name}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            placeholder="e.g., International Conference on AI"
          />

          <FormField
            label="Recognition Date"
            name="recognition_date"
            type="date"
            value={formData.recognition_date}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
          />

          <FormField
            label="Proof Link (Optional)"
            name="proof_link"
            type="url"
            value={formData.proof_link}
            onChange={handleInputChange}
            disabled={isViewMode}
            placeholder="https://example.com/certificate"
          />

          {isViewMode && formData.proof_link && (
            <div className="pt-2">
              <a
                href={formData.proof_link.startsWith('http') ? formData.proof_link : `https://${formData.proof_link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors cursor-pointer"
              >
                <ExternalLink size={16} />
                View Link
              </a>
            </div>
          )}
        </div>
      </Modal>

      {/* Excel Bulk Upload Modal */}
      <ExcelBulkUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="Bulk Upload Recognition & Awards"
        columns={excelColumns}
        onUpload={async (validRows) => {
          await bulkCreateRecognitions(validRows);
          fetchRecognitions();
        }}
        templateFilename="Recognitions_Template.xlsx"
      />
      {/* Document Viewer Modal */}
      {pdfViewerState.isOpen && (
        <Modal
          isOpen={pdfViewerState.isOpen}
          onClose={() => {
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
                      w.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>${pdfViewerState.title || 'Document'}</title>
                            <style>
                              html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #525659; display: flex; justify-content: center; align-items: center; }
                              iframe, img { max-width: 100%; max-height: 100%; border: none; }
                            </style>
                          </head>
                          <body>
                            ${pdfViewerState.isImage ? `<img src="${pdfViewerState.url}" alt="Document" />` : `<iframe src="${pdfViewerState.url}" style="width:100%;height:100%;"></iframe>`}
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

export default RecognitionPage;
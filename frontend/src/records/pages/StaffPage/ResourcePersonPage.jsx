import React, { useState, useEffect } from 'react';
import { Plus, Download, Eye, X, Upload } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import FileUploadField from '../../components/FileUploadField';
import ExcelBulkUploadModal from '../../components/ExcelBulkUploadModal';
import {
  getResourcePersonEntries,
  createResourcePersonEntry,
  updateResourcePersonEntry,
  deleteResourcePersonEntry,
  viewResourcePersonFile,
  downloadResourcePersonFile,
  getEventTypes,
  bulkCreateResourcePerson
} from '../../services/api';
import toast from 'react-hot-toast';
import { formatDisplayDate } from '../../utils/dateUtils';

const ResourcePersonPage = () => {
  const [entries, setEntries] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [pdfViewerState, setPdfViewerState] = useState({
    isOpen: false,
    url: null,
    title: '',
    fileName: '',
    isImage: false
  });
  const defaultSpecifications = [
    { value: '', label: 'Select Event Type / Program Specification' },
    { value: 'Keynote Speaker', label: 'Keynote Speaker' },
    { value: 'Session Chair', label: 'Session Chair' },
    { value: 'Guest Lecture', label: 'Guest Lecture' },
    { value: 'Expert Talk', label: 'Expert Talk' },
    { value: 'Workshop Resource Person', label: 'Workshop Resource Person' },
    { value: 'FDP Resource Person', label: 'FDP Resource Person' },
    { value: 'Panelist / Judge', label: 'Panelist / Judge' },
    { value: 'Seminar Speaker', label: 'Seminar Speaker' },
    { value: 'Webinar Presenter', label: 'Webinar Presenter' },
    { value: 'Other Academic Contributions', label: 'Other Academic Contributions' }
  ];
  const [eventTypeOptions, setEventTypeOptions] = useState(defaultSpecifications);

  useEffect(() => {
    const fetchEventTypesList = async () => {
      try {
        const res = await getEventTypes({ status: 'Active' });
        let list = [];
        if (Array.isArray(res)) list = res;
        else if (Array.isArray(res?.data)) list = res.data;
        else if (Array.isArray(res?.data?.data)) list = res.data.data;

        if (list.length > 0) {
          setEventTypeOptions([
            { value: '', label: 'Select Event Type' },
            ...list.map(t => ({ value: t.type_name, label: t.type_name }))
          ]);
        }
      } catch (err) {
        console.error('Error fetching event types:', err);
      }
    };
    fetchEventTypesList();
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    programSpecification: '',
    title: '',
    venue: '',
    fromDate: '',
    toDate: '',
    participants: '',
    proofFile: null,
    photoFile: null
  });
  const [fileNames, setFileNames] = useState({
    proofFile: '',
    photoFile: ''
  });

  const resetForm = () => {
    setFormData({
      programSpecification: '',
      title: '',
      venue: '',
      fromDate: '',
      toDate: '',
      participants: '',
      proofFile: null,
      photoFile: null
    });
    setFileNames({
      proofFile: '',
      photoFile: ''
    });
    setEditingItem(null);
    setIsViewOnly(false);
  };

  const fetchData = async () => {
    try {
      const response = await getResourcePersonEntries();
      const list = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.data) ? response.data.data : [];
      setEntries(list);
    } catch (error) {
      toast.error('Failed to fetch entries');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        programSpecification: editingItem.program_specification || '',
        title: editingItem.title || '',
        venue: editingItem.venue || '',
        fromDate: editingItem.from_date ? editingItem.from_date.split('T')[0] : (editingItem.event_date ? editingItem.event_date.split('T')[0] : ''),
        toDate: editingItem.to_date ? editingItem.to_date.split('T')[0] : (editingItem.from_date ? editingItem.from_date.split('T')[0] : (editingItem.event_date ? editingItem.event_date.split('T')[0] : '')),
        participants: editingItem.participants !== undefined && editingItem.participants !== null ? editingItem.participants : '',
        proofFile: null,
        photoFile: null
      });
      setFileNames({
        proofFile: editingItem.proof_link || '',
        photoFile: editingItem.photo_link || ''
      });
    } else {
      resetForm();
    }
  }, [editingItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const file = files[0];

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Only PNG, JPEG, PDF, GIF, and WebP files are allowed.');
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit');
        return;
      }

      setFormData(prev => ({
        ...prev,
        [name]: file
      }));
      setFileNames(prev => ({
        ...prev,
        [name]: file.name
      }));
    }
  };

  const removeFile = (fieldName) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: null
    }));
    setFileNames(prev => ({
      ...prev,
      [fieldName]: ''
    }));
  };

  const handleSubmit = async () => {
    const spec = (formData.programSpecification || '').trim();
    const title = (formData.title || '').trim();
    const venue = (formData.venue || '').trim();
    const fromDate = formData.fromDate;
    const toDate = formData.toDate;
    const participants = formData.participants;

    if (!spec || !title || !venue || !fromDate || !toDate || participants === '' || participants === null || participants === undefined) {
      toast.error('Please fill all required fields');
      return;
    }

    if (new Date(toDate) < new Date(fromDate)) {
      toast.error('To Date cannot be earlier than From Date');
      return;
    }

    try {
      setIsSubmitting(true);
      const formDataObj = new FormData();
      formDataObj.append('program_specification', spec);
      formDataObj.append('title', title);
      formDataObj.append('venue', venue);
      formDataObj.append('from_date', fromDate);
      formDataObj.append('to_date', toDate);
      formDataObj.append('participants', participants);

      if (formData.proofFile) {
        formDataObj.append('proofFile', formData.proofFile);
      }
      if (formData.photoFile) {
        formDataObj.append('photoFile', formData.photoFile);
      }

      if (editingItem) {
        await updateResourcePersonEntry(editingItem.id, formDataObj);
        toast.success('Entry updated successfully');
      } else {
        await createResourcePersonEntry(formDataObj);
        toast.success('Entry added successfully');
      }
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving resource person entry:', error);
      const serverMessage = error.response?.data?.message || 'Failed to save entry';
      toast.error(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    console.log('Delete button clicked for ID:', id);
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        console.log('Making delete API call for ID:', id);
        const response = await deleteResourcePersonEntry(id);
        console.log('Delete API response:', response);
        toast.success('Entry deleted');
        fetchData();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete entry');
      }
    }
  };

  const handleView = (item) => {
    setEditingItem(item);
    setIsViewOnly(true);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsViewOnly(false);
    setModalOpen(true);
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return formatDisplayDate(dateString) || 'N/A';
  };

  const handleViewDocument = async (filename, label = 'Document') => {
    if (!filename || !filename.toString().trim()) {
      toast.error('Document file not available');
      return;
    }
    const filenameStr = filename.toString().trim();
    const fileExt = filenameStr.toLowerCase().split('.').pop();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);

    try {
      const blob = await viewResourcePersonFile(filenameStr);
      if (!blob || blob.size === 0) {
        toast.error('Document file is empty or unavailable');
        return;
      }
      if (blob.type === 'application/json') {
        const text = await blob.text();
        try {
          const json = JSON.parse(text);
          toast.error(json.message || 'Document not available');
        } catch {
          toast.error('Document not available');
        }
        return;
      }

      const mimeType = isImage ? `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}` : 'application/pdf';
      const typedBlob = blob.type ? blob : new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(typedBlob);

      setPdfViewerState({
        isOpen: true,
        url: url,
        title: `${label} - ${editingItem?.title || editingItem?.program_specification || filenameStr}`,
        fileName: filenameStr,
        isImage: isImage
      });
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Failed to load document');
    }
  };

  const FileLink = ({ filename, label = 'Document' }) => {
    if (!filename || !filename.toString().trim()) return <span className="text-gray-400 text-sm">No file</span>;

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleViewDocument(filename, label);
        }}
        className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-full transition-colors duration-200 border border-indigo-200 font-medium cursor-pointer"
        title={`View ${label}`}
      >
        <Eye size={14} />
        View {label}
      </button>
    );
  };

  const columns = [
    { header: 'Program Specification', field: 'program_specification', wrap: true },
    { header: 'Title', field: 'title', wrap: true },
    { header: 'Venue', field: 'venue', wrap: true },
    {
      header: 'From Date',
      field: 'from_date',
      render: (row) => formatDate(row.from_date || row.event_date)
    },
    {
      header: 'To Date',
      field: 'to_date',
      render: (row) => formatDate(row.to_date || row.from_date || row.event_date)
    },
    {
      header: 'No. of Participants',
      field: 'participants',
      render: (row) => row.participants ?? 'N/A'
    },
    {
      header: 'Proof',
      field: 'proof_link',
      render: (row) => <FileLink filename={row.proof_link} label="Proof" />
    },
    {
      header: 'Photo',
      field: 'photo_link',
      render: (row) => <FileLink filename={row.photo_link} label="Photo" />
    },
  ];

  const excelColumns = [
    { key: 'program_specification', label: 'Program Specification', required: true, options: eventTypeOptions.map(o => o.label).filter(l => l && !l.startsWith('Select')), example: 'Guest Lecture' },
    { key: 'title', label: 'Title of Talk / Session', required: true, example: 'Keynote on AI in Robotics' },
    { key: 'venue', label: 'Venue / Organization', required: true, example: 'IIT Madras' },
    { key: 'from_date', label: 'From Date', required: true, type: 'date', example: '2026-04-15' },
    { key: 'to_date', label: 'To Date', required: true, type: 'date', example: '2026-04-16' },
    { key: 'participants', label: 'Number of Participants', required: true, type: 'number', example: '150' },
    { key: 'proof_link', label: 'Proof Document File Name', required: false, type: 'file', example: 'resource_person_proof.pdf' },
    { key: 'photo_link', label: 'Event Photo File Name', required: false, type: 'file', example: 'event_photo.jpg' },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Resource Person</h2>
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
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="btn flex items-center gap-2 text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 px-4 py-2 rounded-md shadow-md text-sm font-semibold"
          >
            <Plus size={16} />
            Add Resource Person
          </button>
        </div>
      </div>

      <DataTable
        data={entries}
        columns={columns}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={(item) => handleDelete(item.id)}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={isViewOnly ? 'View Resource Person Entry' : editingItem ? 'Edit Resource Person Entry' : 'Add Resource Person Entry'}
        onSubmit={!isViewOnly ? handleSubmit : null}
        isSubmitting={isSubmitting}
      >
        <FormField
          label="Program Specification*"
          name="programSpecification"
          type="select"
          value={formData.programSpecification}
          onChange={handleChange}
          disabled={isViewOnly}
          required
          options={eventTypeOptions}
        />
        <FormField
          label="Title*"
          name="title"
          value={formData.title}
          onChange={handleChange}
          disabled={isViewOnly}
          required
        />
        <FormField
          label="Venue*"
          name="venue"
          value={formData.venue}
          onChange={handleChange}
          disabled={isViewOnly}
          required
        />
        <FormField
          label="From Date*"
          name="fromDate"
          type="date"
          value={formData.fromDate}
          onChange={handleChange}
          disabled={isViewOnly}
          required
        />
        <FormField
          label="To Date*"
          name="toDate"
          type="date"
          value={formData.toDate}
          onChange={handleChange}
          disabled={isViewOnly}
          required
        />
        <FormField
          label="Number of Participants*"
          name="participants"
          type="number"
          min="0"
          value={formData.participants}
          onChange={handleChange}
          disabled={isViewOnly}
          required
        />

        {/* Proof File Upload */}
        <FileUploadField
          label="Proof File"
          name="proofFile"
          accept=".png,.jpg,.jpeg,.pdf,.gif,.webp"
          value={formData.proofFile || (editingItem?.proof_link ? 'available' : null)}
          disabled={isViewOnly}
          onChange={(file) => setFormData((prev) => ({ ...prev, proofFile: file }))}
          onClear={() => setFormData((prev) => ({ ...prev, proofFile: null }))}
          onView={editingItem?.proof_link ? () => handleViewDocument(editingItem.proof_link, 'Proof Document') : undefined}
          hint="PNG, JPEG, PDF, GIF, WebP up to 10MB"
        />

        {/* Photo File Upload */}
        <FileUploadField
          label="Photo File"
          name="photoFile"
          accept=".png,.jpg,.jpeg,.pdf,.gif,.webp"
          value={formData.photoFile || (editingItem?.photo_link ? 'available' : null)}
          disabled={isViewOnly}
          onChange={(file) => setFormData((prev) => ({ ...prev, photoFile: file }))}
          onClear={() => setFormData((prev) => ({ ...prev, photoFile: null }))}
          onView={editingItem?.photo_link ? () => handleViewDocument(editingItem.photo_link, 'Photo Document') : undefined}
          hint="PNG, JPEG, PDF, GIF, WebP up to 10MB"
        />

        {isViewOnly && (editingItem?.proof_link || editingItem?.photo_link) && (
          <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
            {editingItem?.proof_link && (
              <button
                type="button"
                onClick={() => handleViewDocument(editingItem.proof_link, 'Proof Document')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors cursor-pointer"
              >
                <Eye size={16} />
                View Proof File
              </button>
            )}
            {editingItem?.photo_link && (
              <button
                type="button"
                onClick={() => handleViewDocument(editingItem.photo_link, 'Photo Document')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md shadow-sm transition-colors cursor-pointer"
              >
                <Eye size={16} />
                View Photo File
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Document Viewer Modal */}
      {pdfViewerState.isOpen && (
        <Modal
          isOpen={pdfViewerState.isOpen}
          onClose={() => {
            if (pdfViewerState.url) {
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

      {/* Excel Bulk Upload Modal */}
      <ExcelBulkUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="Bulk Upload Resource Person Records"
        columns={excelColumns}
        onUpload={async (validRows) => {
          await bulkCreateResourcePerson(validRows);
          fetchData();
        }}
        templateFilename="Resource_Person_Template.xlsx"
      />
    </div>
  );
};

export default ResourcePersonPage;
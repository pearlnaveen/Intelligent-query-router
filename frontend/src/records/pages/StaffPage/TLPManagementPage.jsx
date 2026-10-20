import React, { useState, useEffect } from 'react';
import { Plus, Eye, Pencil, Trash2, Upload, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { bulkCreateTlpActivities } from '../../services/api';
import DataTable from '../../components/DataTable';
import FileUploadField from '../../components/FileUploadField';
import ExcelBulkUploadModal from '../../components/ExcelBulkUploadModal';
import Modal from '../../components/Modal';

const getCleanFileUrl = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return null;
  const trimmed = filePath.trim().replace(/\\/g, '/');
  if (!trimmed) return null;

  const filename = trimmed.split('/').pop();
  if (!filename || ['none', 'n/a', 'null', 'undefined'].includes(filename.toLowerCase())) return null;

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

const getTlpFileUrl = (filePath) => {
  const cleanUrl = getCleanFileUrl(filePath);
  if (!cleanUrl) return null;
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }

  const defaultBackend = `${window.location.protocol}//${window.location.hostname}:5173/institute_management_system`;
  const baseUrl = import.meta.env.VITE_BACKEND_URL || defaultBackend;
  return `${baseUrl}${cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl}`;
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

const TLPManagementPage = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    course_code_and_name: '',
    activity_name: '',
    description: ''
  });
  const [selectedTLP, setSelectedTLP] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pdfViewerState, setPdfViewerState] = useState({
    isOpen: false,
    url: null,
    title: '',
    fileName: '',
    isImage: false
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this TLP activity record?')) return;
    try {
      await api.delete(`/staff/tlp/${id}`);
      toast.success('TLP activity deleted successfully');
      fetchActivities();
    } catch (err) {
      console.error('Error deleting TLP activity', err);
      toast.error(err.response?.data?.message || 'Failed to delete activity');
    }
  };

  const excelColumns = [
    { key: 'course_code_and_name', label: 'Course Code & Name', required: true, example: '21CS601 Deep Learning' },
    { key: 'activity_name', label: 'Activity Name', required: true, example: 'Flipped Classroom' },
    { key: 'description', label: 'Description', required: false, example: 'Interactive session on CNN architecture' },
    { key: 'image', label: 'Activity Proof Image File Name', required: false, type: 'file', example: 'tlp_proof.jpg' }
  ];

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff/tlp');
      console.debug('GET /staff/tlp response:', res.data);
      setActivities(res.data.activities || res.data || []);
    } catch (err) {
      console.error('Error fetching TLP activities', err);
      toast.error('Failed to fetch TLP activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActivities(); }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showForm) {
          setShowForm(false);
          setEditingId(null);
          setFile(null);
        }
        if (isViewModalOpen) {
          setIsViewModalOpen(false);
          setSelectedTLP(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, isViewModalOpen]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({ course_code_and_name: '', activity_name: '', description: '' });
    setFile(null);
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('course_code_and_name', form.course_code_and_name || '');
      data.append('activity_name', form.activity_name || '');
      data.append('description', form.description || '');
      if (file) data.append('image', file);

      if (editingId) {
        await api.put(`/staff/tlp/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('TLP activity updated successfully');
      } else {
        await api.post('/staff/tlp/submit', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('TLP activity submitted successfully');
      }
      resetForm();
      fetchActivities();
    } catch (err) {
      console.error('Error submitting', err);
      toast.error(err.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tlp) => {
    if (tlp.status !== 'Pending') {
      toast.error('Only pending TLPs can be edited');
      return;
    }
    setForm({ course_code_and_name: tlp.course_code_and_name || '', activity_name: tlp.activity_name || '', description: tlp.description || '' });
    setEditingId(tlp.id);
    setFile(null);
    setShowForm(true);
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (s === 'approved') return 'bg-green-100 text-green-800';
    if (s === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const handleView = (activity) => {
    setSelectedTLP(activity);
    setIsViewModalOpen(true);
  };

  const handleViewTlpDocument = async (activity, title = 'TLP Proof') => {
    if (!activity || !activity.id) {
      toast.error('TLP record missing');
      return;
    }

    try {
      const response = await api.get(`/staff/tlp/proof/${activity.id}`, { responseType: 'blob' });
      if (!response.data || response.data.size === 0) {
        toast.error('Document is empty or unavailable');
        return;
      }

      if (response.data.type === 'application/json' || (response.data.type && response.data.type.includes('html'))) {
        const text = await response.data.text();
        try {
          const json = JSON.parse(text);
          toast.error(json.message || 'Document not available');
        } catch {
          toast.error('Document not available');
        }
        return;
      }

      const fileName = String(activity.image_file || activity.filename || 'tlp_proof').split(/[/\\]/).pop() || 'tlp_proof';
      const isPdf = isPdfFile(fileName);
      const isImg = isImageFile(fileName);
      const mimeType = (response.data.type || '').toLowerCase();
      let isImage = isImg;
      let targetMime = isPdf ? 'application/pdf' : (isImg ? (fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg') : 'image/jpeg');

      if (mimeType.startsWith('image/')) {
        isImage = true;
        targetMime = response.data.type;
      } else if (mimeType.includes('pdf')) {
        isImage = false;
        targetMime = 'application/pdf';
      }

      const blob = new Blob([response.data], { type: targetMime });
      const blobUrl = window.URL.createObjectURL(blob);

      setPdfViewerState({
        isOpen: true,
        url: blobUrl,
        title: title,
        fileName: fileName,
        isImage: isImage
      });
    } catch (error) {
      console.error('Error fetching TLP document blob:', error);
      let errorMsg = 'Document not available';
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

  const columns = [
    {
      header: 'Activity Name',
      field: 'activity_name',
      wrap: true,
      render: (row) => <span className="font-semibold text-gray-900">{row.activity_name || '-'}</span>
    },
    {
      header: 'Course Code & Name',
      field: 'course_code_and_name',
      wrap: true,
      render: (row) => <span className="text-gray-700">{row.course_code_and_name || '-'}</span>
    },
    {
      header: 'Description',
      field: 'description',
      wrap: true,
      render: (row) => <span className="text-gray-600">{row.description || '-'}</span>
    },
    {
      header: 'Proof / File',
      field: 'image_file',
      render: (row) => {
        const fileUrl = getTlpFileUrl(row.image_file);
        const isPdf = isPdfFile(row.image_file);
        return fileUrl ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleViewTlpDocument(row, `TLP Proof - ${row.activity_name || 'Activity'}`);
            }}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full transition-colors cursor-pointer"
          >
            {isPdf ? <FileText size={14} /> : <ExternalLink size={14} />}
            <span>{isPdf ? 'View PDF' : 'View Image'}</span>
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
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(row.status)}`}>
          {row.status || 'Pending'}
        </span>
      )
    }
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">TLP Management</h2>
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
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
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
        onView={handleView}
        onEdit={(row) => handleEdit(row)}
        onDelete={(row) => handleDelete(row.id)}
        isLoading={loading}
      />

      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => resetForm()}
          title={editingId ? 'Edit TLP Activity' : 'Add TLP Activity'}
          size="md"
          showFooter={false}
        >
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="course_code_and_name" className="block text-sm font-medium mb-1">Course Code & Name *</label>
                <input id="course_code_and_name" name="course_code_and_name" value={form.course_code_and_name} onChange={handleChange} className="w-full border p-2 rounded" required placeholder="e.g. 21CS601 Deep Learning" />
              </div>
              <div>
                <label htmlFor="activity_name" className="block text-sm font-medium mb-1">Activity Name *</label>
                <input id="activity_name" name="activity_name" value={form.activity_name} onChange={handleChange} className="w-full border p-2 rounded" required placeholder="e.g. Flipped Classroom" />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                <textarea id="description" name="description" value={form.description} onChange={handleChange} className="w-full border p-2 rounded" rows={4} placeholder="Enter activity details..."></textarea>
              </div>

              <div className="md:col-span-2">
                <FileUploadField
                  label="Image / Document Upload"
                  name="image"
                  accept="image/*,application/pdf"
                  value={file}
                  onChange={(uploadedFile) => setFile(uploadedFile)}
                  onClear={() => setFile(null)}
                  hint="Images or PDF document up to 10MB"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => resetForm()} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded font-semibold text-sm cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitting} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded font-semibold text-sm transition-colors cursor-pointer">
                {submitting ? (editingId ? 'Updating...' : 'Submitting...') : (editingId ? 'Update Activity' : 'Submit Activity')}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* Staff view modal for submitted TLP */}
      {isViewModalOpen && selectedTLP && (
        <Modal
          isOpen={isViewModalOpen && Boolean(selectedTLP)}
          onClose={() => { setIsViewModalOpen(false); setSelectedTLP(null); }}
          title="TLP Activity Details"
          size="md"
          showFooter={false}
        >
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <div className="block text-sm font-semibold text-gray-700 mb-2">Course Code & Name</div>
                <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg font-medium">{selectedTLP.course_code_and_name || 'N/A'}</p>
              </div>
              <div>
                <div className="block text-sm font-semibold text-gray-700 mb-2">Activity Name</div>
                <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg font-medium">{selectedTLP.activity_name || 'N/A'}</p>
              </div>

              <div className="md:col-span-2">
                <div className="block text-sm font-semibold text-gray-700 mb-2">Description</div>
                <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg break-words whitespace-pre-wrap">{selectedTLP.description || 'N/A'}</p>
              </div>

              {(() => {
                const fileUrl = getTlpFileUrl(selectedTLP.image_file);
                if (!fileUrl) return null;
                const isPdf = isPdfFile(selectedTLP.image_file);

                return (
                  <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-700">Uploaded Activity Proof</span>
                      <button
                        type="button"
                        onClick={() => handleViewTlpDocument(selectedTLP, `TLP Proof - ${selectedTLP.activity_name || 'Activity'}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye size={14} />
                        <span>View Proof in Pop-up</span>
                      </button>
                    </div>
                    {!isPdf ? (
                      <div
                        onClick={() => handleViewTlpDocument(selectedTLP, `TLP Proof - ${selectedTLP.activity_name || 'Activity'}`)}
                        className="block text-center cursor-pointer group"
                        title="Click to view image pop-up"
                      >
                        <img
                          src={fileUrl}
                          alt="TLP Proof"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="max-h-72 w-auto mx-auto object-contain rounded-lg shadow-sm border border-slate-200 group-hover:opacity-90 transition-opacity"
                        />
                        <p className="text-xs text-slate-500 mt-2 font-medium">Click thumbnail to view full size image pop-up ↗</p>
                      </div>
                    ) : (
                      <div className="p-6 text-center border-2 border-dashed border-indigo-200 rounded-lg bg-white">
                        <FileText size={44} className="mx-auto text-indigo-600 mb-2" />
                        <p className="text-sm font-semibold text-slate-800">PDF Document Attached</p>
                        <button
                          type="button"
                          onClick={() => handleViewTlpDocument(selectedTLP, `TLP Proof - ${selectedTLP.activity_name || 'Activity'}`)}
                          className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Eye size={14} />
                          <span>View PDF Document</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="md:col-span-2">
                <div className="block text-sm font-semibold text-gray-700 mb-2">Status</div>
                <p><span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedTLP.status)}`}>{selectedTLP.status || 'Pending'}</span></p>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100"><button onClick={() => { setIsViewModalOpen(false); setSelectedTLP(null); }} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold text-sm cursor-pointer transition-colors">Close</button></div>
          </div>
        </Modal>
      )}

      {/* Excel Bulk Upload Modal */}
      <ExcelBulkUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="Bulk Upload TLP Activities"
        columns={excelColumns}
        onUpload={async (validRows) => {
          await bulkCreateTlpActivities(validRows);
          fetchActivities();
        }}
        templateFilename="TLP_Activities_Template.xlsx"
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

export default TLPManagementPage;


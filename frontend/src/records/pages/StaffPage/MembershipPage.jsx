import React, { useState, useEffect } from 'react';
import { Plus, Upload, Eye, FileText, ExternalLink } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import FileUploadField from '../../components/FileUploadField';
import ExcelBulkUploadModal from '../../components/ExcelBulkUploadModal';
import api, {
  getMemberships,
  createMembership,
  updateMembership,
  deleteMembership,
  bulkCreateMemberships
} from '../../services/api';
import toast from 'react-hot-toast';

const MembershipPage = () => {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentMembership, setCurrentMembership] = useState(null);

  // PDF Viewer Modal State
  const [pdfViewerState, setPdfViewerState] = useState({
    isOpen: false,
    url: null,
    title: '',
    fileName: '',
  });

  // File state
  const [proofFile, setProofFile] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    society_name: '',
    position_grade: '',
    contributions: '',
    membership_number: '',
  });

  // Excel Bulk Upload Column Schema
  const membershipExcelColumns = [
    {
      key: 'society_name',
      label: 'Name of Professional Society / Body',
      required: true,
      example: 'IEEE (Institute of Electrical and Electronics Engineers)',
      aliases: ['society_name', 'society', 'professional_society', 'professional_body', 'name_of_society'],
    },
    {
      key: 'position_grade',
      label: 'Grade / Level / Position',
      required: true,
      example: 'Senior Member',
      aliases: ['position_grade', 'grade', 'level', 'position', 'grade_level_position'],
    },
    {
      key: 'contributions',
      label: 'Contributions',
      required: false,
      example: 'Served as Technical Program Committee Chair and organized 2 national workshops.',
      aliases: ['contributions', 'contributions_to_society', 'contributions_ay_2025_2026', 'ay_2025_2026'],
    },
    {
      key: 'membership_number',
      label: 'Membership Number',
      required: true,
      example: 'IEEE-98765432',
      aliases: ['membership_number', 'membership_no', 'membership_id', 'member_no'],
    },
    {
      key: 'proof_document',
      label: 'Proof PDF File Name',
      required: false,
      type: 'file',
      example: 'ieee_membership_proof.pdf',
      aliases: ['proof_document', 'proof', 'proof_link', 'document'],
    },
  ];

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const response = await getMemberships();
      let data = [];
      if (response) {
        if (Array.isArray(response)) data = response;
        else if (Array.isArray(response.data)) data = response.data;
        else if (Array.isArray(response.data?.data)) data = response.data.data;
      }
      setMemberships(data);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      toast.error('Failed to load membership records');
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      society_name: '',
      position_grade: '',
      contributions: '',
      membership_number: '',
    });
    setProofFile(null);
    setCurrentMembership(null);
    setIsViewMode(false);
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (membership) => {
    setCurrentMembership(membership);
    setFormData({
      society_name: membership.society_name || '',
      position_grade: membership.position_grade || '',
      contributions: membership.contributions || '',
      membership_number: membership.membership_number || '',
    });
    setProofFile(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (membership) => {
    setCurrentMembership(membership);
    setFormData({
      society_name: membership.society_name || '',
      position_grade: membership.position_grade || '',
      contributions: membership.contributions || '',
      membership_number: membership.membership_number || '',
    });
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (membership) => {
    if (window.confirm(`Are you sure you want to delete this membership: ${membership.society_name}?`)) {
      try {
        await deleteMembership(membership.id);
        toast.success('Membership record deleted successfully');
        fetchMemberships();
      } catch (error) {
        console.error('Error deleting membership:', error);
        toast.error('Failed to delete membership record');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (!formData.society_name.trim() || !formData.position_grade.trim() || !formData.membership_number.trim()) {
        toast.error('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      const submitData = new FormData();
      submitData.append('society_name', formData.society_name.trim());
      submitData.append('position_grade', formData.position_grade.trim());
      submitData.append('contributions', formData.contributions ? formData.contributions.trim() : '');
      submitData.append('membership_number', formData.membership_number.trim());

      if (proofFile) {
        submitData.append('proof_document', proofFile);
      }

      if (currentMembership) {
        await updateMembership(currentMembership.id, submitData);
        toast.success('Membership record updated successfully');
      } else {
        await createMembership(submitData);
        toast.success('Membership record created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      await fetchMemberships();
    } catch (error) {
      console.error('Error saving membership:', error);
      toast.error(error.response?.data?.message || 'Failed to save membership record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async (validRows) => {
    try {
      await bulkCreateMemberships(validRows);
      toast.success(`Successfully uploaded ${validRows.length} membership records`);
      setIsBulkModalOpen(false);
      await fetchMemberships();
    } catch (error) {
      console.error('Error bulk uploading memberships:', error);
      toast.error(error.response?.data?.message || 'Failed to complete bulk upload');
    }
  };

  const handleViewProof = async (id, title = '') => {
    try {
      const response = await api.get(`/membership/proof/${id}`, { responseType: 'blob' });

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
      const blobUrl = window.URL.createObjectURL(blob);
      setPdfViewerState({
        isOpen: true,
        url: blobUrl,
        title: `Proof Document - ${title || 'Membership'}`,
        fileName: `membership_${id}_proof.pdf`,
      });
    } catch (error) {
      console.error('Error fetching membership proof PDF:', error);
      let errorMsg = 'Proof document not available on server';
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

  const closePdfViewer = () => {
    if (pdfViewerState.url && pdfViewerState.url.startsWith('blob:')) {
      URL.revokeObjectURL(pdfViewerState.url);
    }
    setPdfViewerState({ isOpen: false, url: null, title: '', fileName: '' });
  };

  // Table Columns Setup
  const columns = [
    {
      field: 'society_name',
      header: 'Professional Society / Body',
      render: (row) => (
        <span className="font-semibold text-gray-900 leading-snug break-words whitespace-normal block max-w-xs">
          {row.society_name}
        </span>
      ),
    },
    {
      field: 'position_grade',
      header: 'Grade / Level / Position',
      render: (row) => (
        <span className="text-gray-700 leading-snug break-words whitespace-normal block max-w-xs">
          {row.position_grade}
        </span>
      ),
    },
    {
      field: 'membership_number',
      header: 'Membership Number',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 break-all max-w-[200px]">
          {row.membership_number}
        </span>
      ),
    },
    {
      field: 'contributions',
      header: 'Contributions',
      render: (row) => (
        row.contributions ? (
          <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-line break-words max-w-md">
            {row.contributions}
          </div>
        ) : (
          <span className="text-gray-400 italic text-xs">None specified</span>
        )
      ),
    },
    {
      field: 'proof_document',
      header: 'Proof Document',
      render: (row) => {
        if (!row.proof_document) {
          return <span className="text-gray-400 text-xs italic">No Proof</span>;
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleViewProof(row.id, row.society_name);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors border border-indigo-200 cursor-pointer"
            title="View PDF Proof"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View PDF</span>
          </button>
        );
      },
    },
  ];

  return (
    <div>
      {/* Module Header - Matching other activity modules */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Membership</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn flex items-center gap-2 text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-md shadow-sm text-sm font-semibold transition-colors cursor-pointer"
            onClick={() => setIsBulkModalOpen(true)}
          >
            <Upload size={16} />
            <span>Excel Bulk Upload</span>
          </button>
          <button
            type="button"
            className="btn flex items-center gap-2 text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-blue-800 hover:to-indigo-500 px-4 py-2 rounded-md shadow-md text-sm font-semibold transition-colors cursor-pointer"
            onClick={handleAddNew}
          >
            <Plus size={16} />
            <span>Add New Membership</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={memberships}
        columns={columns}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
        wrapText={true}
      />

      {/* Modal Form for Add / Edit / View - Size LG for wider responsive popup layout */}
      <Modal
        isOpen={isModalOpen}
        size="lg"
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={
          isViewMode
            ? 'View Membership Details'
            : currentMembership
            ? 'Edit Membership Record'
            : 'Add New Membership'
        }
        onSubmit={!isViewMode ? handleSubmit : null}
        submitText={currentMembership ? 'Update' : 'Save'}
        isSubmitting={isSubmitting}
      >
        <div 
          className="space-y-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
        >
          {/* Row 1: Society Name & Position/Grade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Name of the Professional Society / Body (National or International Level)"
              required={!isViewMode}
            >
              <input
                type="text"
                name="society_name"
                value={formData.society_name}
                onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                disabled={isViewMode}
                placeholder="e.g., IEEE, ISTE, ACM, CSI, IEI, ASME"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all duration-300 bg-gray-50 focus:bg-white disabled:bg-gray-100 disabled:text-gray-600"
              />
            </FormField>

            <FormField
              label="Name of the Grade / Level / Position"
              required={!isViewMode}
            >
              <input
                type="text"
                name="position_grade"
                value={formData.position_grade}
                onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                disabled={isViewMode}
                placeholder="e.g., Life Member, Senior Member, Fellow, Chair"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all duration-300 bg-gray-50 focus:bg-white disabled:bg-gray-100 disabled:text-gray-600"
              />
            </FormField>
          </div>

          {/* Row 2: Membership Number & Proof Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Membership Number"
              required={!isViewMode}
            >
              <input
                type="text"
                name="membership_number"
                value={formData.membership_number}
                onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                disabled={isViewMode}
                placeholder="e.g., IEEE-98765432 or LM-123456"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all duration-300 bg-gray-50 focus:bg-white disabled:bg-gray-100 disabled:text-gray-600"
              />
            </FormField>

            {/* Standard FileUploadField Component for UI parity with other modules */}
            <FileUploadField
              label="Proof Document"
              name="proof_document"
              accept=".pdf"
              value={isViewMode ? currentMembership?.proof_document : (proofFile || currentMembership?.proof_document)}
              onChange={(file) => setProofFile(file)}
              onClear={() => setProofFile(null)}
              onView={() => {
                if (proofFile) {
                  const localUrl = URL.createObjectURL(proofFile);
                  setPdfViewerState({
                    isOpen: true,
                    url: localUrl,
                    title: `Proof Document - ${formData.society_name || 'New Document'}`,
                    fileName: proofFile.name || 'membership_proof.pdf',
                  });
                } else if (currentMembership?.id) {
                  handleViewProof(currentMembership.id, currentMembership.society_name);
                } else {
                  toast.error('No proof document available to view');
                }
              }}
              disabled={isViewMode}
              hint={currentMembership ? "Upload a new PDF to replace current document" : "PDF format up to 10MB"}
            />
          </div>

          {/* Row 3: Contributions (Full Width Textarea) */}
          <div>
            <FormField
              label="Contributions"
              required={false}
            >
              <textarea
                name="contributions"
                value={formData.contributions}
                onChange={handleInputChange}
                disabled={isViewMode}
                rows={3}
                placeholder="Describe your contributions, active roles, organized events, reviews, etc. during AY 2025–2026"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all duration-300 bg-gray-50 focus:bg-white disabled:bg-gray-100 disabled:text-gray-600 resize-y"
              />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* PDF Proof Viewer Modal */}
      {pdfViewerState.isOpen && (
        <Modal
          isOpen={pdfViewerState.isOpen}
          onClose={closePdfViewer}
          title={pdfViewerState.title || 'View PDF Document'}
          size="2xl"
        >
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-200">
              <span className="text-xs font-semibold text-gray-600 truncate max-w-md">
                {pdfViewerState.fileName || pdfViewerState.title}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={pdfViewerState.url}
                  download={pdfViewerState.fileName || 'membership_proof.pdf'}
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
                    download={pdfViewerState.fileName || 'membership_proof.pdf'}
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
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        columns={membershipExcelColumns}
        onUpload={handleBulkUpload}
        title="Bulk Upload Membership Records"
        templateFilename="Membership_Template.xlsx"
      />
    </div>
  );
};

export default MembershipPage;

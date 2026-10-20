import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Edit, Trash2, Eye, X, FileText, Upload } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import FileUploadField from '../../components/FileUploadField';
import ExcelBulkUploadModal from '../../components/ExcelBulkUploadModal';
import {
  api,
  getProposals, getProposal, createProposal, updateProposal, deleteProposal,
  getPaymentDetails, createPaymentDetail, updatePaymentDetail, deletePaymentDetail,
  bulkCreateProposals
} from '../../services/api';
import toast from 'react-hot-toast';
import { formatDisplayDate } from '../../utils/dateUtils';

const ProposalsPage = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentProposal, setCurrentProposal] = useState(null);

  // Payment details states
  const [showAmountDetails, setShowAmountDetails] = useState(false);
  const [amountDetails, setAmountDetails] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentPaymentDetail, setCurrentPaymentDetail] = useState(null);
  const [isPaymentViewMode, setIsPaymentViewMode] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Amount Release Details popup modal state
  const [releaseDetailsModal, setReleaseDetailsModal] = useState({
    isOpen: false,
    proposal: null
  });

  const [formData, setFormData] = useState({
    pi_name: '',
    co_pi_names: [],
    project_title: '',
    industry: '',
    from_date: '',
    to_date: '',
    amount: '',
    releases: [],
    proof: null,
    yearly_report: null,
    order_copy: null,
    final_report: null,
    organization_name: ''
  });

  const [coPiInput, setCoPiInput] = useState('');

  const [paymentFormData, setPaymentFormData] = useState({
    date: '',
    amount: ''
  });

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const response = await getProposals();
      setProposals(response.data);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const fetchAmountDetails = async (projectId) => {
    try {
      setPaymentLoading(true);
      const response = await getPaymentDetails(projectId);
      setAmountDetails(response.data);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast.error('Failed to load payment details');
      setAmountDetails([]);
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      // Validate PDF
      if (files[0].type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        e.target.value = '';
        return;
      }
      // Validate size (10MB)
      if (files[0].size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        e.target.value = '';
        return;
      }
      setFormData({
        ...formData,
        [name]: files[0]
      });
    }
  };

  const handleAddCoPi = () => {
    if (coPiInput.trim()) {
      setFormData({
        ...formData,
        co_pi_names: [...formData.co_pi_names, coPiInput.trim()]
      });
      setCoPiInput('');
    }
  };

  const handleRemoveCoPi = (index) => {
    setFormData({
      ...formData,
      co_pi_names: formData.co_pi_names.filter((_, i) => i !== index)
    });
  };

  const handleAddReleaseRow = () => {
    setFormData(prev => ({
      ...prev,
      releases: [
        ...prev.releases,
        { release_date: '', amount_received: '', remarks: '' }
      ]
    }));
  };

  const handleReleaseChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.releases];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return { ...prev, releases: updated };
    });
  };

  const handleRemoveReleaseRow = (index) => {
    setFormData(prev => ({
      ...prev,
      releases: prev.releases.filter((_, i) => i !== index)
    }));
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'N/A';
    return formatDisplayDate(dateStr) || 'N/A';
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentFormData({
      ...paymentFormData,
      [name]: value
    });
  };

  const [pdfViewerState, setPdfViewerState] = useState({
    isOpen: false,
    url: null,
    title: '',
    fileName: ''
  });

  const handleViewFile = async (fileType, proposalObj = null) => {
    try {
      const targetProposal = proposalObj || currentProposal;
      if (!targetProposal || !targetProposal.id) {
        toast.error('Proposal record missing');
        return;
      }
      let endpoint = '';
      let displayLabel = 'Proof Document';
      if (fileType === 'proof' || fileType === 'Proof') {
        endpoint = `/proposals/proof/${targetProposal.id}`;
        displayLabel = 'Proof Document';
      } else if (fileType === 'yearly_report' || fileType === 'Yearly Report') {
        endpoint = `/proposals/yearly-report/${targetProposal.id}`;
        displayLabel = 'Yearly Report';
      } else if (fileType === 'order_copy' || fileType === 'Order Copy') {
        endpoint = `/proposals/order-copy/${targetProposal.id}`;
        displayLabel = 'Order Copy';
      } else if (fileType === 'final_report' || fileType === 'Final Report') {
        endpoint = `/proposals/final-report/${targetProposal.id}`;
        displayLabel = 'Final Report';
      }

      const response = await api.get(endpoint, { responseType: 'blob' });

      if (!response.data || response.data.size === 0) {
        toast.error('Document is empty or unavailable');
        return;
      }

      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        try {
          const json = JSON.parse(text);
          toast.error(json.message || 'Document not available');
        } catch {
          toast.error('Document not available');
        }
        return;
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      setPdfViewerState({
        isOpen: true,
        url: url,
        title: `${displayLabel} - ${targetProposal.project_title || targetProposal.pi_name || 'Consultancy'}`,
        fileName: `${fileType}.pdf`
      });
    } catch (error) {
      console.error(`Error fetching ${fileType}:`, error);
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

  const resetForm = () => {
    setFormData({
      pi_name: '',
      co_pi_names: [],
      project_title: '',
      industry: '',
      from_date: '',
      to_date: '',
      amount: '',
      releases: [],
      proof: null,
      yearly_report: null,
      order_copy: null,
      final_report: null,
      organization_name: ''
    });
    setCoPiInput('');
    setCurrentProposal(null);
    setIsViewMode(false);
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      date: '',
      amount: ''
    });
    setCurrentPaymentDetail(null);
    setIsPaymentViewMode(false);
  };

  const renderFileLink = (proposal, label) => {
    if (!proposal) {
      return <span className="text-gray-400">No file</span>;
    }

    let fileField = '';
    if (label === 'Proof') {
      fileField = 'proof';
    } else if (label === 'Yearly Report') {
      fileField = 'yearly_report';
    } else if (label === 'Order Copy') {
      fileField = 'order_copy';
    } else if (label === 'Final Report') {
      fileField = 'final_report';
    }

    if (!proposal[fileField]) {
      return <span className="text-gray-400">No file</span>;
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleViewFile(fileField, proposal);
        }}
        className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-full transition-colors duration-200 border border-indigo-200 font-medium"
        title={`View ${label}`}
      >
        <FileText size={14} />
        View {label}
      </button>
    );
  };

  const renderCoPiNames = (coPiNames) => {
    if (!coPiNames) {
      return <span className="text-gray-400">None</span>;
    }

    const names = coPiNames.split(',').map(name => name.trim()).filter(name => name);

    if (names.length === 0) {
      return <span className="text-gray-400">None</span>;
    }

    return (
      <div className="space-y-1">
        {names.map((name, index) => (
          <div key={index} className="text-sm">
            • {name}
          </div>
        ))}
      </div>
    );
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenReleaseDetailsModal = async (proposal) => {
    let targetProposal = proposal;
    try {
      const response = await getProposal(proposal.id);
      if (response && response.data) {
        targetProposal = response.data;
        setProposals(prev => prev.map(p => p.id === proposal.id ? response.data : p));
      }
    } catch (err) {
      console.error('Error fetching latest release details:', err);
    }
    setReleaseDetailsModal({ isOpen: true, proposal: targetProposal });
  };

  const handleEdit = async (proposal) => {
    let targetProposal = proposals.find(p => p.id === proposal.id) || proposal;
    try {
      const response = await getProposal(proposal.id);
      if (response && response.data) {
        targetProposal = response.data;
        setProposals(prev => prev.map(p => p.id === proposal.id ? response.data : p));
      }
    } catch (err) {
      console.error('Error fetching latest proposal details for edit:', err);
    }

    setCurrentProposal(targetProposal);
    const coPiArray = targetProposal.co_pi_names
      ? targetProposal.co_pi_names.split(',').map(name => name.trim()).filter(name => name)
      : [];

    const releasesList = Array.isArray(targetProposal.releases)
      ? targetProposal.releases.map(r => ({
          id: r.id,
          release_date: r.release_date ? r.release_date.split('T')[0] : '',
          amount_received: r.amount_received ?? '',
          remarks: r.remarks || ''
        }))
      : [];

    setFormData({
      pi_name: targetProposal.pi_name || '',
      co_pi_names: coPiArray,
      project_title: targetProposal.project_title || '',
      industry: targetProposal.industry || '',
      from_date: targetProposal.from_date ? targetProposal.from_date.split('T')[0] : '',
      to_date: targetProposal.to_date ? targetProposal.to_date.split('T')[0] : '',
      amount: targetProposal.amount?.toString() || '',
      releases: releasesList,
      proof: null,
      yearly_report: null,
      order_copy: null,
      final_report: null,
      organization_name: targetProposal.organization_name || ''
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = async (proposal) => {
    let targetProposal = proposals.find(p => p.id === proposal.id) || proposal;
    try {
      const response = await getProposal(proposal.id);
      if (response && response.data) {
        targetProposal = response.data;
        setProposals(prev => prev.map(p => p.id === proposal.id ? response.data : p));
      }
    } catch (err) {
      console.error('Error fetching latest proposal details for view:', err);
    }

    setCurrentProposal(targetProposal);
    const coPiArray = targetProposal.co_pi_names
      ? targetProposal.co_pi_names.split(',').map(name => name.trim()).filter(name => name)
      : [];

    const releasesList = Array.isArray(targetProposal.releases)
      ? targetProposal.releases.map(r => ({
          id: r.id,
          release_date: r.release_date ? r.release_date.split('T')[0] : '',
          amount_received: r.amount_received ?? '',
          remarks: r.remarks || ''
        }))
      : [];

    setFormData({
      pi_name: targetProposal.pi_name || '',
      co_pi_names: coPiArray,
      project_title: targetProposal.project_title || '',
      industry: targetProposal.industry || '',
      from_date: targetProposal.from_date ? targetProposal.from_date.split('T')[0] : '',
      to_date: targetProposal.to_date ? targetProposal.to_date.split('T')[0] : '',
      amount: targetProposal.amount?.toString() || '',
      releases: releasesList,
      proof: null,
      yearly_report: null,
      order_copy: null,
      final_report: null,
      organization_name: targetProposal.organization_name || ''
    });
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (proposal) => {
    if (window.confirm(`Are you sure you want to delete this proposal: ${proposal.project_title}?`)) {
      try {
        await deleteProposal(proposal.id);
        toast.success('Proposal deleted successfully');
        await fetchProposals();
      } catch (error) {
        console.error('Error deleting proposal:', error);
        toast.error('Failed to delete proposal');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (!formData.pi_name || !formData.project_title || !formData.from_date || !formData.to_date || !formData.amount) {
        toast.error('Please fill in required fields (PI Name, Title, Dates, Amount)');
        setIsSubmitting(false);
        return;
      }

      // Date validation
      if (new Date(formData.to_date) <= new Date(formData.from_date)) {
        toast.error('To date must be greater than from date');
        setIsSubmitting(false);
        return;
      }

      // Validate release rows if present
      if (formData.releases && formData.releases.length > 0) {
        for (let i = 0; i < formData.releases.length; i++) {
          const rel = formData.releases[i];
          if (!rel.release_date || rel.amount_received === '' || rel.amount_received === null || isNaN(Number(rel.amount_received))) {
            toast.error(`Please fill Release Date and Amount Received for Release row #${i + 1}`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Create FormData object for file uploads
      const submitData = new FormData();
      submitData.append('pi_name', formData.pi_name);
      submitData.append('co_pi_names', Array.isArray(formData.co_pi_names) ? formData.co_pi_names.join(', ') : (formData.co_pi_names || ''));
      submitData.append('project_title', formData.project_title);
      submitData.append('industry', formData.industry || 'Consultancy');
      submitData.append('from_date', formData.from_date);
      submitData.append('to_date', formData.to_date);
      submitData.append('amount', formData.amount.toString());
      submitData.append('organization_name', formData.organization_name || formData.industry || 'N/A');
      submitData.append('releases', JSON.stringify(formData.releases || []));

      // Append files if they exist
      if (formData.proof) {
        submitData.append('proof', formData.proof);
      }
      if (formData.yearly_report) {
        submitData.append('yearly_report', formData.yearly_report);
      }
      if (formData.order_copy) {
        submitData.append('order_copy', formData.order_copy);
      }
      if (formData.final_report) {
        submitData.append('final_report', formData.final_report);
      }

      if (currentProposal) {
        await updateProposal(currentProposal.id, submitData);
        toast.success('Proposal updated successfully');
      } else {
        await createProposal(submitData);
        toast.success('Proposal created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      await fetchProposals();
    } catch (error) {
      console.error('Error saving proposal:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save proposal';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewAmountDetails = (projectId) => {
    setSelectedProjectId(projectId);
    fetchAmountDetails(projectId);
    setShowAmountDetails(true);
  };

  const handleAddPaymentDetail = () => {
    resetPaymentForm();
    setIsPaymentModalOpen(true);
  };

  const handleEditPaymentDetail = (paymentDetail) => {
    setCurrentPaymentDetail(paymentDetail);
    setPaymentFormData({
      date: paymentDetail.date ? paymentDetail.date.split('T')[0] : '',
      amount: paymentDetail.amount?.toString() || ''
    });
    setIsPaymentViewMode(false);
    setIsPaymentModalOpen(true);
  };

  const handleViewPaymentDetail = (paymentDetail) => {
    setCurrentPaymentDetail(paymentDetail);
    setPaymentFormData({
      date: paymentDetail.date ? paymentDetail.date.split('T')[0] : '',
      amount: paymentDetail.amount?.toString() || ''
    });
    setIsPaymentViewMode(true);
    setIsPaymentModalOpen(true);
  };

  const handleDeletePaymentDetail = async (paymentDetail) => {
    if (window.confirm(`Are you sure you want to delete this payment of ₹${Number(paymentDetail.amount).toLocaleString()}?`)) {
      try {
        await deletePaymentDetail(paymentDetail.id);
        toast.success('Payment detail deleted successfully');
        fetchAmountDetails(selectedProjectId);
      } catch (error) {
        console.error('Error deleting payment detail:', error);
        toast.error('Failed to delete payment detail');
      }
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (!paymentFormData.date || !paymentFormData.amount) {
        toast.error('Please fill in all required fields');
        return;
      }

      const paymentData = {
        ...paymentFormData,
        proposal_id: selectedProjectId
      };

      if (currentPaymentDetail) {
        await updatePaymentDetail(currentPaymentDetail.id, paymentData);
        toast.success('Payment detail updated successfully');
      } else {
        await createPaymentDetail(paymentData);
        toast.success('Payment detail created successfully');
      }

      setIsPaymentModalOpen(false);
      resetPaymentForm();
      fetchAmountDetails(selectedProjectId);
    } catch (error) {
      console.error('Error saving payment detail:', error);
      toast.error('Failed to save payment detail');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (fromDate, toDate) => {
    if (!fromDate || !toDate) return '';

    const from = new Date(fromDate);
    const to = new Date(toDate);

    return `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`;
  };

  const columns = [
    { field: 'pi_name', header: 'PI Name' },
    {
      field: 'co_pi_names',
      header: 'Co-PI Names',
      render: (row) => renderCoPiNames(row.co_pi_names)
    },
    { field: 'project_title', header: 'Project Title' },
    { field: 'industry', header: 'Industry' },
    {
      field: 'duration',
      header: 'Duration',
      render: (row) => formatDuration(row.from_date, row.to_date)
    },
    {
      field: 'amount',
      header: 'Amount (₹)',
      render: (row) => {
        const releasesCount = Array.isArray(row.releases) ? row.releases.length : 0;
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className="font-semibold text-gray-900">₹{Number(row.amount || 0).toLocaleString()}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenReleaseDetailsModal(row);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline flex items-center gap-1 cursor-pointer"
            >
              {releasesCount > 0 ? `View Details (${releasesCount} ${releasesCount === 1 ? 'Release' : 'Releases'})` : 'View Details'}
            </button>
          </div>
        );
      }
    },
    { field: 'organization_name', header: 'Organization' },
    {
      field: 'proof',
      header: 'Proof',
      render: (row) => renderFileLink(row, 'Proof')
    },
    {
      field: 'yearly_report',
      header: 'Yearly Report',
      render: (row) => renderFileLink(row, 'Yearly Report')
    },
    {
      field: 'order_copy',
      header: 'Order Copy',
      render: (row) => renderFileLink(row, 'Order Copy')
    },
    {
      field: 'final_report',
      header: 'Final Report',
      render: (row) => renderFileLink(row, 'Final Report')
    },
  ];

  const excelColumns = [
    { key: 'pi_name', label: 'PI Name', required: true, example: 'Dr. John Smith' },
    { key: 'co_pi_names', label: 'Co-PI Names', required: false, example: 'Dr. Alice, Dr. Bob' },
    { key: 'project_title', label: 'Project Title', required: true, example: 'Structural Testing Consultancy' },
    { key: 'industry', label: 'Industry', required: true, example: 'Civil Engineering / Testing' },
    { key: 'organization_name', label: 'Organization / Client Name', required: true, example: 'L&T Construction' },
    { key: 'from_date', label: 'From Date', required: true, type: 'date', example: '2026-01-01' },
    { key: 'to_date', label: 'To Date', required: true, type: 'date', example: '2026-12-31' },
    { key: 'amount', label: 'Amount (₹)', required: true, type: 'number', example: 150000 },
    { key: 'proof', label: 'Proof Document File Name', required: false, type: 'file', example: 'proposal_proof.pdf' },
    { key: 'yearly_report', label: 'Yearly Report File Name', required: false, type: 'file', example: 'yearly_report.pdf' },
    { key: 'order_copy', label: 'Order Copy File Name', required: false, type: 'file', example: 'order_copy.pdf' },
    { key: 'final_report', label: 'Final Report File Name', required: false, type: 'file', example: 'final_report.pdf' },
  ];

  const selectedProject = proposals.find(p => p.id === selectedProjectId);
  const totalPaidAmount = amountDetails.reduce((sum, detail) => sum + Number(detail.amount), 0);

  return (
    <div>
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Consultancy Proposals</h2>
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
            Add New Consultancy
          </button>
        </div>
      </div>

      <DataTable
        data={proposals}
        columns={columns}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
        wrapText={true}
      />

      {showAmountDetails && selectedProject && (
        <div className="mt-8 border rounded-md p-4 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold">
                Payment Details for: {selectedProject.project_title}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Total Project Amount: ₹{Number(selectedProject.amount).toLocaleString()} |
                Total Paid: ₹{totalPaidAmount.toLocaleString()} |
                Remaining: ₹{(Number(selectedProject.amount) - totalPaidAmount).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddPaymentDetail}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md py-2 px-4 text-sm font-semibold"
              >
                <Plus size={14} />
                Add Payment
              </button>
              <button
                onClick={() => setShowAmountDetails(false)}
                className="text-gray-500 hover:text-gray-700 px-3 py-2"
              >
                Close
              </button>
            </div>
          </div>

          {paymentLoading ? (
            <div className="text-center py-4">Loading payment details...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {amountDetails.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                        No payment details found. Click "Add Payment" to create one.
                      </td>
                    </tr>
                  ) : (
                    amountDetails.map((detail) => (
                      <tr key={detail.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(detail.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ₹{Number(detail.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewPaymentDetail(detail)}
                              className="text-indigo-600 hover:text-blue-900"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEditPaymentDetail(detail)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeletePaymentDetail(detail)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {amountDetails.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr className="font-medium">
                      <td className="px-6 py-4 text-sm">Total Paid</td>
                      <td className="px-6 py-4 text-sm font-bold">
                        ₹{totalPaidAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* Proposal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isViewMode ? 'View Proposal' : currentProposal ? 'Edit Proposal' : 'Add New Proposal'}
        onSubmit={!isViewMode ? handleSubmit : null}
        isSubmitting={isSubmitting}
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="PI Name"
            name="pi_name"
            value={formData.pi_name}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
          />

          {/* Co-PI Names with dynamic add/remove */}
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700">
              Co-PI Names
            </label>
            <div className="p-2 border-2 border-indigo-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-400 bg-white flex flex-wrap items-center gap-2 min-h-[48px] shadow-xs">
              {formData.co_pi_names.map((name, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full border border-indigo-200"
                >
                  <span>{name}</span>
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCoPi(index)}
                      className="hover:text-red-600 focus:outline-none transition-colors"
                      title="Remove Co-PI"
                    >
                      <X size={14} />
                    </button>
                  )}
                </span>
              ))}
              {!isViewMode && (
                <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                  <input
                    type="text"
                    value={coPiInput}
                    onChange={(e) => setCoPiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCoPi();
                      }
                    }}
                    placeholder={formData.co_pi_names.length === 0 ? "Type Co-PI name and click Add..." : "Add another Co-PI..."}
                    className="flex-1 border-none bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 p-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddCoPi}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm"
                  >
                    Add Co-PI
                  </button>
                </div>
              )}
            </div>
          </div>

          <FormField
            label="Project Title"
            name="project_title"
            value={formData.project_title}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            className="md:col-span-2"
          />

          <FormField
            label="Industry"
            name="industry"
            value={formData.industry}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
          />

          <FormField
            label="Organization Name"
            name="organization_name"
            value={formData.organization_name}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
          />

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
            min={formData.from_date}
          />

          <FormField
            label="Total Consultancy Amount (₹)"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            min="0"
            step="0.01"
          />

          {/* Amount Release Details Section */}
          <div className="md:col-span-2 space-y-3 border-t pt-4 mt-2">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-md font-bold text-gray-800">
                  Amount Release Details
                </h3>
                <p className="text-xs text-gray-500">
                  Add payment installment / release dates and amounts for this consultancy project.
                </p>
              </div>
              {!isViewMode && (
                <button
                  type="button"
                  onClick={handleAddReleaseRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-xs"
                >
                  <Plus size={14} />
                  Add Release
                </button>
              )}
            </div>

            {/* Releases Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-10">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Release Date *</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Amount Received (₹) *</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Remarks (Optional)</th>
                    {!isViewMode && (
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase w-16">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.releases.length === 0 ? (
                    <tr>
                      <td colSpan={isViewMode ? 4 : 5} className="px-4 py-4 text-center text-xs text-gray-500">
                        No release details added yet. {!isViewMode && 'Click "Add Release" to add a release entry.'}
                      </td>
                    </tr>
                  ) : (
                    formData.releases.map((rel, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-medium text-gray-500 text-center">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={rel.release_date || ''}
                            onChange={(e) => handleReleaseChange(idx, 'release_date', e.target.value)}
                            disabled={isViewMode}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 text-gray-800"
                            required
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Amount"
                            value={rel.amount_received ?? ''}
                            onChange={(e) => handleReleaseChange(idx, 'amount_received', e.target.value)}
                            disabled={isViewMode}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 text-gray-800"
                            required
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="e.g. First Installment"
                            value={rel.remarks || ''}
                            onChange={(e) => handleReleaseChange(idx, 'remarks', e.target.value)}
                            disabled={isViewMode}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 text-gray-800"
                          />
                        </td>
                        {!isViewMode && (
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveReleaseRow(idx)}
                              className="p-1 text-red-600 hover:text-red-800 rounded transition-colors"
                              title="Delete Release"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {formData.releases.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold text-xs border-t border-gray-200">
                    {(() => {
                      const totalRec = (formData.releases || []).reduce((sum, r) => sum + (Number(r.amount_received) || 0), 0);
                      const bal = (Number(formData.amount) || 0) - totalRec;
                      return (
                        <tr>
                          <td colSpan={2} className="px-3 py-2 text-gray-700 text-right">Total Received:</td>
                          <td className="px-3 py-2 text-indigo-700 font-bold">₹{totalRec.toLocaleString()}</td>
                          <td colSpan={isViewMode ? 1 : 2} className="px-3 py-2 text-gray-600">
                            Balance: <span className={bal < 0 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>₹{bal.toLocaleString()}</span>
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* File Upload Fields */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4 mt-2">
            <h3 className="md:col-span-2 text-md font-bold text-gray-800 border-b pb-1">
              Documents & Reports (PDF only, max 10MB)
            </h3>

            <FileUploadField
              label="Proof Document"
              name="proof"
              accept=".pdf"
              value={formData.proof || currentProposal?.proof}
              onChange={(file) => setFormData(prev => ({ ...prev, proof: file }))}
              onClear={() => setFormData(prev => ({ ...prev, proof: null }))}
              onView={currentProposal?.proof ? () => handleViewFile('proof') : undefined}
              disabled={isViewMode}
            />

            <FileUploadField
              label="Yearly Report"
              name="yearly_report"
              accept=".pdf"
              value={formData.yearly_report || currentProposal?.yearly_report}
              onChange={(file) => setFormData(prev => ({ ...prev, yearly_report: file }))}
              onClear={() => setFormData(prev => ({ ...prev, yearly_report: null }))}
              onView={currentProposal?.yearly_report ? () => handleViewFile('yearly_report') : undefined}
              disabled={isViewMode}
            />

            <FileUploadField
              label="Order Copy"
              name="order_copy"
              accept=".pdf"
              value={formData.order_copy || currentProposal?.order_copy}
              onChange={(file) => setFormData(prev => ({ ...prev, order_copy: file }))}
              onClear={() => setFormData(prev => ({ ...prev, order_copy: null }))}
              onView={currentProposal?.order_copy ? () => handleViewFile('order_copy') : undefined}
              disabled={isViewMode}
            />

            <FileUploadField
              label="Final Report"
              name="final_report"
              accept=".pdf"
              value={formData.final_report || currentProposal?.final_report}
              onChange={(file) => setFormData(prev => ({ ...prev, final_report: file }))}
              onClear={() => setFormData(prev => ({ ...prev, final_report: null }))}
              onView={currentProposal?.final_report ? () => handleViewFile('final_report') : undefined}
              disabled={isViewMode}
            />
          </div>
        </div>
      </Modal>

      {/* Payment Detail Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={isPaymentViewMode ? 'View Payment Detail' : currentPaymentDetail ? 'Edit Payment Detail' : 'Add Payment Detail'}
        onSubmit={!isPaymentViewMode ? handlePaymentSubmit : null}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <FormField
            label="Payment Date"
            name="date"
            type="date"
            value={paymentFormData.date}
            onChange={handlePaymentInputChange}
            required
            disabled={isPaymentViewMode}
          />

          <FormField
            label="Amount (₹)"
            name="amount"
            type="number"
            value={paymentFormData.amount}
            onChange={handlePaymentInputChange}
            required
            disabled={isPaymentViewMode}
            min="0"
            step="0.01"
          />
        </div>
      </Modal>

      {/* Excel Bulk Upload Modal */}
      <ExcelBulkUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="Bulk Upload Consultancy Proposals"
        columns={excelColumns}
        onUpload={async (validRows) => {
          await bulkCreateProposals(validRows);
          fetchProposals();
        }}
        templateFilename="Consultancy_Proposals_Template.xlsx"
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
      {/* View Details Popup Modal */}
      {(() => {
        const activeReleaseProposal = releaseDetailsModal.proposal;

        if (!releaseDetailsModal.isOpen || !activeReleaseProposal) return null;

        const releasesList = Array.isArray(activeReleaseProposal.releases) ? activeReleaseProposal.releases : [];
        const totalAmount = Number(activeReleaseProposal.amount || 0);
        const totalReceived = releasesList.reduce(
          (sum, r) => sum + Number(r.amount_received || 0), 0
        );
        const balance = totalAmount - totalReceived;

        return (
          <Modal
            isOpen={releaseDetailsModal.isOpen}
            onClose={() => setReleaseDetailsModal({ isOpen: false, proposal: null })}
            title="View Details - Amount Release Details"
            size="lg"
          >
            <div className="space-y-5 p-1">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/60 p-4 rounded-xl border border-indigo-200/80 shadow-2xs flex flex-wrap justify-between items-center gap-3">
                <div>
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Project Title</span>
                  <span className="text-base font-bold text-gray-900">{activeReleaseProposal.project_title}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Total Consultancy Amount</span>
                  <span className="text-xl font-extrabold text-indigo-950">
                    ₹{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-1">
                  Amount Release History
                </h4>

                {releasesList.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed text-sm">
                    No amount release history recorded for this consultancy project.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {releasesList.map((rel, idx) => (
                      <div
                        key={rel.id || idx}
                        className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-3.5 rounded-lg border border-gray-200 text-sm transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shadow-2xs">
                            {idx + 1}
                          </span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">
                              {formatDateDisplay(rel.release_date)} → <span className="text-indigo-700 font-bold">₹{Number(rel.amount_received || 0).toLocaleString()}</span>
                            </span>
                            {rel.remarks && (
                              <span className="text-xs text-gray-500 italic mt-0.5">
                                Remarks: {rel.remarks}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary Box */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-wrap justify-between items-center gap-4 text-sm font-semibold shadow-2xs">
                <div>
                  <span className="text-gray-600">Total Received : </span>
                  <span className="text-emerald-700 font-bold text-base">₹{totalReceived.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Balance Amount : </span>
                  <span className={balance > 0 ? "text-amber-600 font-bold text-base" : balance < 0 ? "text-red-600 font-bold text-base" : "text-emerald-600 font-bold text-base"}>
                    ₹{balance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

export default ProposalsPage;

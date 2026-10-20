import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Download, ExternalLink, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Pagination from '../../components/Pagination';

const getTlpFileUrl = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return null;
  const trimmed = filePath.trim().replace(/\\/g, '/');
  if (!trimmed) return null;

  const filename = trimmed.split('/').pop()?.toLowerCase();
  const placeholders = ['none', 'n/a', 'null', 'undefined'];
  if (placeholders.includes(filename)) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const defaultBackend = `${window.location.protocol}//${window.location.hostname}:5173/institute_management_system`;
  const baseUrl = import.meta.env.VITE_BACKEND_URL || defaultBackend;

  if (trimmed.startsWith('/institute_management_system/')) {
    const host = baseUrl.replace(/\/institute_management_system\/?$/, '');
    return `${host}${trimmed}`;
  }

  if (trimmed.startsWith('/uploads/')) {
    return `${baseUrl}${trimmed}`;
  }
  if (trimmed.startsWith('uploads/')) {
    return `${baseUrl}/${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return `${baseUrl}${trimmed}`;
  }
  return `${baseUrl}/uploads/activity/${trimmed}`;
};

const isPdfFile = (filePath) => {
  if (!filePath) return false;
  const cleaned = String(filePath).toLowerCase().split('?')[0];
  return cleaned.endsWith('.pdf');
};

const TLPApprovalPage = () => {
  const [pendingTLPs, setPendingTLPs] = useState([]);
  const [allTLPs, setAllTLPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedTLP, setSelectedTLP] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [currentTLPForReject, setCurrentTLPForReject] = useState(null);

  const fetchPendingTLPs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/tlp/pending');
      setPendingTLPs(Array.isArray(res.data) ? res.data : (res.data.tlps || res.data || []));
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch pending TLPs');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTLPs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/tlp/all');
      setAllTLPs(Array.isArray(res.data) ? res.data : (res.data.tlps || res.data || []));
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch TLPs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTLPs();
    fetchAllTLPs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    if (filterStatus === 'pending') fetchPendingTLPs();
    else fetchAllTLPs();
  }, [filterStatus]);

  const handleApprove = async (id) => {
    try {
      await api.post(`/admin/tlp/${id}/approve`);
      toast.success('TLP Approved');
      setIsViewModalOpen(false);
      if (filterStatus === 'pending') fetchPendingTLPs();
      else fetchAllTLPs();
    } catch (err) {
      console.error(err);
      toast.error('Approve failed');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return toast.error('Please provide a rejection reason');
    try {
      await api.post(`/admin/tlp/${currentTLPForReject.id}/reject`, { rejection_reason: rejectReason });
      toast.success('TLP Rejected');
      setIsRejectModalOpen(false);
      setRejectReason('');
      setIsViewModalOpen(false);
      if (filterStatus === 'pending') fetchPendingTLPs();
      else fetchAllTLPs();
    } catch (err) {
      console.error(err);
      toast.error('Reject failed');
    }
  };

  const handleView = (tlp) => {
    setSelectedTLP(tlp);
    setIsViewModalOpen(true);
  };

  const getStatusColor = (status) => {
    if (status === 'Pending') return 'bg-yellow-100 text-yellow-800';
    if (status === 'Approved') return 'bg-green-100 text-green-800';
    if (status === 'Rejected') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const tlps = filterStatus === 'pending' ? pendingTLPs : allTLPs;

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">TLP Approval Management</h1>
          <p className="text-gray-600">Review and approve/reject staff TLP submissions</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex gap-3">
          <button onClick={() => setFilterStatus('pending')} className={`px-4 py-2 rounded-lg font-semibold cursor-pointer ${filterStatus === 'pending' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Pending ({pendingTLPs.length})
          </button>
          <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-lg font-semibold cursor-pointer ${filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            All ({allTLPs.length})
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {tlps.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">{filterStatus === 'pending' ? 'No pending TLPs' : 'No TLPs found'}</p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Course Code & Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Activity Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 min-w-[280px]">Description</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 whitespace-nowrap">Proof / File</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tlps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((tlp) => {
                      const fileUrl = getTlpFileUrl(tlp.image_file);
                      const isPdf = isPdfFile(tlp.image_file);

                      return (
                        <tr key={tlp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-700 font-medium whitespace-nowrap">{tlp.course_code_and_name || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tlp.activity_name || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 break-words">{tlp.description || '—'}</td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            {fileUrl ? (
                              <div className="flex items-center justify-center">
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                                  title="Open file in new tab"
                                >
                                  {isPdf ? <FileText size={14} className="text-indigo-600" /> : <ExternalLink size={14} className="text-indigo-600" />}
                                  <span>{isPdf ? 'View PDF' : 'View Image'}</span>
                                </a>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(tlp.status)}`}>
                              {tlp.status || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleView(tlp)} className="p-2 hover:bg-indigo-100 rounded-lg cursor-pointer" title="View Details">
                                <Eye size={18} className="text-indigo-600" />
                              </button>
                              {fileUrl && (
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-green-100 rounded-lg cursor-pointer" title="Open File in New Tab">
                                  <ExternalLink size={18} className="text-indigo-600" />
                                </a>
                              )}
                              {tlp.status === 'Pending' && (
                                <>
                                  <button onClick={() => handleApprove(tlp.id)} className="p-2 hover:bg-green-100 rounded-lg cursor-pointer" title="Approve">
                                    <CheckCircle size={18} className="text-green-600" />
                                  </button>
                                  <button onClick={() => { setCurrentTLPForReject(tlp); setIsRejectModalOpen(true); setIsViewModalOpen(false); }} className="p-2 hover:bg-red-100 rounded-lg cursor-pointer" title="Reject">
                                    <XCircle size={18} className="text-red-600" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalItems={tlps.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>

        {/* View Modal */}
        {isViewModalOpen && selectedTLP && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start sm:items-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-indigo-600 px-8 py-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">TLP Activity Details</h2>
                <button onClick={() => setIsViewModalOpen(false)} className="text-white hover:bg-white hover:text-indigo-600 rounded-lg p-2 text-xl font-bold cursor-pointer">✕</button>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <div className="block text-sm font-semibold text-gray-700 mb-2">Course Code & Name</div>
                    <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg font-medium">{selectedTLP.course_code_and_name || 'N/A'}</p>
                  </div>

                  <div>
                    <div className="block text-sm font-semibold text-gray-700 mb-2">Activity Name</div>
                    <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg font-medium">{selectedTLP.activity_name || 'N/A'}</p>
                  </div>

                  <div>
                    <div className="block text-sm font-semibold text-gray-700 mb-2">Status</div>
                    <p className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${getStatusColor(selectedTLP.status)}`}>
                      {selectedTLP.status || 'Pending'}
                    </p>
                  </div>

                  {selectedTLP.description && (
                    <div className="md:col-span-2">
                      <div className="block text-sm font-semibold text-gray-700 mb-2">Description</div>
                      <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg break-words whitespace-pre-wrap">{selectedTLP.description}</p>
                    </div>
                  )}

                  {(() => {
                    const fileUrl = getTlpFileUrl(selectedTLP.image_file);
                    if (!fileUrl) return null;
                    const isPdf = isPdfFile(selectedTLP.image_file);

                    return (
                      <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-700">Uploaded Activity Proof</span>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-2xs"
                          >
                            <ExternalLink size={14} />
                            <span>Open File in New Tab</span>
                          </a>
                        </div>
                        {!isPdf ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-center cursor-pointer group"
                            title="Click to view image in new tab"
                          >
                            <img
                              src={fileUrl}
                              alt="TLP Proof"
                              className="max-h-72 w-auto mx-auto object-contain rounded-lg shadow-sm border border-slate-200 group-hover:opacity-90 transition-opacity"
                            />
                            <p className="text-xs text-slate-500 mt-2 font-medium">Click thumbnail to open full size image in new tab ↗</p>
                          </a>
                        ) : (
                          <div className="p-6 text-center border-2 border-dashed border-indigo-200 rounded-lg bg-white">
                            <FileText size={44} className="mx-auto text-indigo-600 mb-2" />
                            <p className="text-sm font-semibold text-slate-800">PDF Document Attached</p>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              <ExternalLink size={14} />
                              <span>View PDF Document</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {selectedTLP.rejection_reason && (
                    <div className="md:col-span-2">
                      <div className="block text-sm font-semibold text-gray-700 mb-2">Rejection Reason</div>
                      <p className="text-gray-800 bg-red-50 px-4 py-2 rounded-lg border border-red-200 break-words whitespace-pre-wrap">{selectedTLP.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {selectedTLP.status === 'Pending' ? (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      onClick={() => { setIsViewModalOpen(false); setCurrentTLPForReject(selectedTLP); setIsRejectModalOpen(true); }}
                      className="px-6 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg text-sm border border-red-200 cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedTLP.id)}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-indigo-600 text-white rounded font-semibold text-sm cursor-pointer">
                      Close
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {isRejectModalOpen && currentTLPForReject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start sm:items-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Reject TLP</h2>
                <button onClick={() => { setIsRejectModalOpen(false); setRejectReason(''); setCurrentTLPForReject(null); }} className="text-white hover:bg-white hover:text-red-600 rounded-lg p-2">✕</button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleRejectSubmit(); }} className="p-8">
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="rejection-reason">Reason for Rejection *</label>
                  <textarea id="rejection-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" rows="4" placeholder="Enter reason for rejecting this TLP" />
                </div>

                <div className="flex justify-end gap-4">
                  <button type="button" onClick={() => { setIsRejectModalOpen(false); setRejectReason(''); setCurrentTLPForReject(null); }} className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
                  <button type="submit" className="px-6 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg">Reject</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TLPApprovalPage;api

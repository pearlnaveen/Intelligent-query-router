// src/pages/admin/NptelCreditTransferApproval.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/authService';
import { Search, Clock, CheckCircle, XCircle, User, BookOpen, Calendar , RefreshCw } from 'lucide-react';

const NptelCreditTransferApproval = () => {
  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/nptel-credit-transfers');
      const data = res.data.data || [];
      setRequests(data);
      setFiltered(data);
    } catch (err) {
      toast.error('Failed to load NPTEL credit transfer records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (transferId, action, defaultCreditType = 'OEC') => {
    let creditType = defaultCreditType;
    let remarks = '';
    if (action === 'accepted') {
      const choice = window.prompt("Enter elective type for this course (OEC or PEC):", defaultCreditType || 'OEC');
      if (!choice) return;
      creditType = choice.toUpperCase().trim();
      if (!['OEC', 'PEC'].includes(creditType)) {
        toast.error('Invalid elective type. Must be OEC or PEC.');
        return;
      }
    } else if (action === 'rejected') {
      remarks = window.prompt("Optional reason for rejecting this credit transfer:") || "";
    }

    try {
      await api.post('/admin/nptel-credit-transfer-action', {
        transferId,
        action,
        creditType: action === 'accepted' ? creditType : undefined,
        remarks
      });
      toast.success(`Credit transfer ${action} successfully`);
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || `Failed to ${action} credit transfer`);
    }
  };

  useEffect(() => {
    let list = requests;

    if (search) {
      list = list.filter(r =>
        r.regno?.toLowerCase().includes(search.toLowerCase()) ||
        r.studentName?.toLowerCase().includes(search.toLowerCase()) ||
        r.courseCode?.toLowerCase().includes(search.toLowerCase()) ||
        r.courseTitle?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      list = list.filter(r => r.studentStatus === filterStatus);
    }

    setFiltered(list);
  }, [search, filterStatus, requests]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-100 text-green-800 border-2 border-green-400 font-bold">
            <CheckCircle className="w-5 h-5" />
            ACCEPTED BY STUDENT
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-red-100 text-red-800 border-2 border-red-400 font-bold">
            <XCircle className="w-5 h-5" />
            REJECTED BY STUDENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-yellow-100 text-yellow-800 border-2 border-yellow-400 font-bold">
            <Clock className="w-5 h-5" />
            PENDING STUDENT DECISION
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">Loading NPTEL credit transfer records...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-indigo-800 mb-3">NPTEL Credit Transfer Report</h1>
        <p className="text-xl text-gray-600">
          View student decisions on NPTEL credit transfer. Students decide to accept or reject credits after grades are imported.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Records</p>
              <p className="text-3xl font-bold text-gray-800">{requests.length}</p>
            </div>
            <BookOpen className="w-10 h-10 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Accepted</p>
              <p className="text-3xl font-bold text-green-600">
                {requests.filter(r => r.studentStatus === 'accepted').length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Rejected</p>
              <p className="text-3xl font-bold text-red-600">
                {requests.filter(r => r.studentStatus === 'rejected').length}
              </p>
            </div>
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">
                {requests.filter(r => !r.studentStatus || r.studentStatus === 'pending').length}
              </p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Reg No, Name, Course Code or Title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-6 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Pending</option>
          </select>

          <button
            onClick={fetchRequests}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-xl">
            {search || filterStatus !== 'all' 
              ? 'No records match your filters' 
              : 'No NPTEL credit transfer records yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filtered.map(request => (
              <div key={request.transferId} className="p-8 hover:bg-gray-50 transition">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex items-start gap-6">
                      <User className="w-12 h-12 text-indigo-600 mt-1" />
                      <div className="flex-1">
                        <p className="text-2xl font-bold text-gray-800">
                          {request.studentName} <span className="text-lg font-normal text-gray-600">({request.regno})</span>
                        </p>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-600">
                              <span className="font-medium">Course:</span> {request.courseTitle}
                            </p>
                            <p className="text-gray-600 mt-1">
                              <span className="font-medium">Code:</span>{' '}
                              <span className="font-mono bg-gray-100 px-3 py-1 rounded">{request.courseCode}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              <span className="font-medium">Elective Type:</span>{' '}
                              {(request.creditType || request.type) ? (
                                <span className={`px-4 py-1 rounded-full text-sm font-bold ${
                                  (request.creditType || request.type) === 'OEC' 
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                                    : 'bg-purple-100 text-purple-800 border border-purple-200'
                                }`}>
                                  {request.creditType || request.type}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm italic">Not chosen yet (Chosen upon transfer)</span>
                              )}
                            </p>
                            <p className="text-gray-600 mt-1">
                              <span className="font-medium">Credits:</span> {request.credits} |{' '}
                              <span className="font-medium">Grade:</span>{' '}
                              <span className="text-2xl font-bold text-green-600">{request.grade || '-'}</span>
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-gray-500 mt-4 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Requested on: {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : 'N/A'}
                        </p>

                        {request.studentRemarks && (
                          <p className="text-sm text-gray-700 mt-3 italic">
                            Student remark: "{request.studentRemarks}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center lg:items-end gap-3">
                    {getStatusBadge(request.studentStatus || 'pending')}

                    {(!request.studentStatus || request.studentStatus === 'pending') && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleAction(request.transferId, 'accepted', request.creditType || request.type || 'OEC')}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm transition cursor-pointer"
                        >
                          Approve Transfer
                        </button>
                        <button
                          onClick={() => handleAction(request.transferId, 'rejected')}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {request.studentStatus === 'accepted' && (
                      <p className="mt-2 text-green-700 font-bold text-base">
                        ✓ Credit transferred to student's {request.creditType || request.type || 'elective'} count
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NptelCreditTransferApproval;


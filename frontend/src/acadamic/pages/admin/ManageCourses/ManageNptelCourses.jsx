import React, { useState, useEffect } from 'react';
import { Plus, Upload, Download, BookOpen, Globe } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/authService';
import * as XLSX from 'xlsx';

const API_BASE = 'https://erp.nec.edu.in/institute_management_system/admin';

const NptelCourseCard = ({ course, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{course.courseTitle}</h3>
          <p className="text-sm text-gray-600 mt-1 font-mono font-medium">{course.courseCode}</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
          <Globe size={12} />
          Global Course
        </span>
      </div>
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>Credits: <strong className="text-gray-900 text-base">{course.credits}</strong></span>
        <div className="flex gap-3">
          <button
            onClick={() => onEdit(course)}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(course.nptelCourseId)}
            className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
        <span>Available to all students</span>
        <span className="italic text-gray-400">OEC/PEC chosen at credit transfer</span>
      </div>
    </div>
  );
};

const NptelFormModal = ({ isOpen, onClose, course = null, onSuccess }) => {
  const [form, setForm] = useState({
    courseTitle: course?.courseTitle || '',
    courseCode: course?.courseCode || '',
    credits: course?.credits || 3,
  });

  useEffect(() => {
    if (course) {
      setForm({
        courseTitle: course.courseTitle || '',
        courseCode: course.courseCode || '',
        credits: course.credits || 3,
      });
    } else {
      setForm({
        courseTitle: '',
        courseCode: '',
        credits: 3,
      });
    }
  }, [course, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.courseTitle || !form.courseCode || !form.credits) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (course) {
        await api.put(`${API_BASE}/nptel-courses/${course.nptelCourseId}`, form);
        toast.success('NPTEL course updated successfully');
      } else {
        await api.post(`${API_BASE}/nptel-courses`, form);
        toast.success('NPTEL course added successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save course');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{course ? 'Edit' : 'Add'} Global NPTEL Course</h2>
        <p className="text-sm text-gray-500 mb-6">
          NPTEL courses are available globally. Students choose OEC/PEC designation and semester when transferring credit.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
            <input
              type="text"
              placeholder="e.g., Introduction to Machine Learning"
              value={form.courseTitle}
              onChange={(e) => setForm({ ...form, courseTitle: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Code *</label>
            <input
              type="text"
              placeholder="e.g., noc24-cs10"
              value={form.courseCode}
              onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credits *</label>
            <input
              type="number"
              min="1"
              max="10"
              value={form.credits}
              onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value, 10) || 3 })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Standard NPTEL courses are typically 2 or 3 credits.</p>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">
              Cancel
            </button>
            <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
              {course ? 'Update' : 'Add'} Course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ImportNptelModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);

  const handleImport = () => {
    if (!file) {
      toast.error('Please select an Excel file');
      return;
    }
    onImport(file);
    onClose();
  };

  const downloadTemplate = () => {
    const headers = [['Course Name', 'Course Code', 'Credits']];
    const sampleData = [
      ['Introduction to Machine Learning', 'noc24-cs01', 3],
      ['Cloud Computing Fundamentals', 'noc24-cs02', 3],
      ['Robotics and Automation', 'noc24-me01', 3]
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NPTEL Courses');
    XLSX.writeFile(wb, 'nptel_courses_template.xlsx');
    toast.success('Template downloaded');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold mb-2">Import NPTEL Courses</h2>
        <p className="text-sm text-gray-500 mb-6">
          Upload an Excel sheet of NPTEL courses to add them to the global catalogue.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Excel File (.xlsx, .xls) *</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full p-2 border border-gray-200 rounded-lg text-sm"
          />
          {file && <p className="mt-2 text-sm text-green-600 font-medium">Selected: {file.name}</p>}
        </div>
        <div className="mb-6">
          <button
            type="button"
            onClick={downloadTemplate}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2"
          >
            <Download size={16} />
            Download Sample Template (.xlsx)
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700 font-medium">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};

const ManageNptelCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const nptelRes = await api.get(`${API_BASE}/nptel-courses`);
      const nptelData = nptelRes.data.data || [];
      nptelData.sort((a, b) => b.nptelCourseId - a.nptelCourseId);
      setCourses(nptelData);
    } catch (err) {
      toast.error('Failed to load NPTEL courses');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (file) => {
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!rows || rows.length < 2) {
          toast.error('File is empty or contains no data rows.');
          return;
        }

        const coursesToImport = rows.slice(1).map(row => ({
          courseTitle: row[0]?.toString().trim(),
          courseCode: row[1]?.toString().trim(),
          credits: parseInt(row[2], 10) || 3,
        })).filter(c => c.courseTitle && c.courseCode && c.credits > 0);

        if (coursesToImport.length === 0) {
          toast.error('No valid courses found. Check template formatting.');
          return;
        }

        const res = await api.post(`${API_BASE}/nptel-courses/bulk`, { courses: coursesToImport });
        toast.success(res.data.message || `Imported ${coursesToImport.length} NPTEL courses`);
        fetchData();
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this NPTEL course?')) return;
    try {
      await api.delete(`${API_BASE}/nptel-courses/${id}`);
      toast.success('Course deleted');
      fetchData();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-600">Loading NPTEL catalogue...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Global NPTEL Catalogue</h1>
            <p className="text-gray-600 mt-1">
              Add and manage universal NPTEL courses. Students can enroll in any semester, with OEC/PEC designated at credit transfer.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setEditingCourse(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold shadow-sm transition"
            >
              <Plus size={20} />
              Add NPTEL Course
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold shadow-sm transition"
            >
              <Upload size={20} />
              Import Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <NptelCourseCard
              key={course.nptelCourseId}
              course={course}
              onEdit={(c) => {
                setEditingCourse(c);
                setShowForm(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <BookOpen size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900">No NPTEL courses yet</h3>
            <p className="text-gray-500 mt-2">Add your first NPTEL course to build the global catalogue</p>
          </div>
        )}
      </div>

      {showForm && (
        <NptelFormModal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingCourse(null);
          }}
          course={editingCourse}
          onSuccess={fetchData}
        />
      )}

      {showImport && (
        <ImportNptelModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
};

export default ManageNptelCourses;

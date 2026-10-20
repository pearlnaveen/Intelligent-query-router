import API from '../../api';

// --- Staff Result Upload Services ---
export const getStaffCourseDetails = async (courseId) => {
  const res = await API.get(`/staff/results/courses/${courseId}`);
  return res.data.data;
};

export const createExamType = async (courseId, payload) => {
  const res = await API.post(`/staff/results/courses/${courseId}/exam-types`, payload);
  return res.data;
};

export const deleteExamType = async (examTypeId) => {
  const res = await API.delete(`/staff/results/exam-types/${examTypeId}`);
  return res.data;
};

export const getStudentsForExamType = async (examTypeId) => {
  const res = await API.get(`/staff/results/exam-types/${examTypeId}/students`);
  return res.data.data;
};

export const saveBulkMarks = async (examTypeId, marks) => {
  const res = await API.post(`/staff/results/exam-types/${examTypeId}/marks/bulk`, { marks });
  return res.data;
};

// --- Admin Result Analysis Services ---
export const getAdminResultFilters = async () => {
  const res = await API.get('/admin/results/filters');
  return res.data.data;
};

export const getAdminResultAnalysis = async (params) => {
  const res = await API.get('/admin/results/analysis', { params });
  return res.data.data;
};

export const getAdminResultExportUrl = (params) => {
  const baseURL = API.defaults.baseURL || 'http://localhost:5000/institute_management_system';
  const query = new URLSearchParams(params).toString();
  return `${baseURL}/admin/results/export?${query}`;
};

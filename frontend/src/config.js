const config = {
  // backendUrl: 'https://erp.nec.edu.in/institute_management_system', // Change this to match your backend URL
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'https://erp.nec.edu.in/institute_management_system',
};

export default config;

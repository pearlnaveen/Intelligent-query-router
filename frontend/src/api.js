import axios from "axios";

const DEBUG_API = import.meta.env.VITE_DEBUG_API === "true";

export const getCleanPath = (pathname) => {
  const base = import.meta.env.BASE_URL || '/';
  if (base !== '/' && pathname.startsWith(base.replace(/\/$/, ''))) {
    return pathname.slice(base.replace(/\/$/, '').length) || '/';
  }
  return pathname;
};

export const getRedirectUrl = (subpath) => {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanSubpath = subpath.startsWith('/') ? subpath.slice(1) : subpath;
  return `${cleanBase}${cleanSubpath}`;
};

const API = axios.create({
  //baseURL: "http://localhost:5173/institute_management_system", // Ensure this matches your backend port (3306)
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:5001/institute_management_system",
  withCredentials: true,
});

// Request Logger
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (DEBUG_API) {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data || "");
  }
  return config;
});

let refreshPromise = null;
const isAuthPath = (url = "") =>
  url.includes("/auth/login") ||
  url.includes("/auth/google-login") ||
  url.includes("/auth/me") ||
  url.includes("/auth/refresh") ||
  url.includes("/auth/logout") ||
  url.includes("/auth/forgot-password") ||
  url.includes("/auth/reset-password");

API.interceptors.response.use(
  (response) => {
    if (DEBUG_API) {
      console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    }
    return response;
  },
  async (error) => {
    if (DEBUG_API) {
      console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.message, error.response?.data);
    }
    const originalRequest = error.config || {};
    const status = error.response?.status;

    if (status !== 401 || originalRequest._retry || isAuthPath(originalRequest.url || "")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const pathname = window.location.pathname;
    const cleanPath = getCleanPath(pathname);

    const isPlacement = cleanPath.startsWith('/placement');
    const isRecords = cleanPath.startsWith('/records');
    const isAcadamic = cleanPath.startsWith('/admin') || cleanPath.startsWith('/staff') || cleanPath.startsWith('/student');

    // Public paths where automatic refresh/redirect is NOT desired
    const isPublicPath =
      cleanPath === "/" ||
      cleanPath === "/placement" ||
      cleanPath === "/login" ||
      cleanPath === "/register" ||
      cleanPath.startsWith("/records/login") ||
      cleanPath.startsWith("/placement/login") ||
      cleanPath.startsWith("/records/forgot-password") ||
      cleanPath.startsWith("/records/reset-password") ||
      (!isPlacement && !isRecords && !isAcadamic);

    if (isPublicPath) {
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = API.post("/auth/refresh", {}).finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
      return API(originalRequest);
    } catch (refreshError) {
      if (!isPublicPath) {
        // Redirect to the appropriate login page based on current system
        if (isPlacement) {
          window.location.href = getRedirectUrl("/placement/login");
        } else if (isRecords) {
          window.location.href = getRedirectUrl("/records/login");
        } else if (isAcadamic) {
          window.location.href = getRedirectUrl("/records/login");
        }
      }
      return Promise.reject(refreshError);
    }
  }
);

export default API;

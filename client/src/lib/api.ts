import axios from 'axios';
import { toast } from 'sonner';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url || '';
    const status: number | undefined = error.response?.status;

    // Auto-logout on 401 from protected endpoints (auth routes handle their own 401s).
    if (status === 401 && !url.includes('/auth/')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
      window.location.href = '/sign-in';
    }

    // Global 429 handler for non-auth routes — auth pages show this inline themselves.
    if (status === 429 && !url.includes('/auth/')) {
      const lang = localStorage.getItem('ui_language') || 'en';
      const msg = lang === 'he' ? 'יותר מדי בקשות. נסה שוב מאוחר יותר.' : 'Too many requests. Please try again later.';
      toast.error(msg);
    }

    return Promise.reject(error);
  }
);

export default api;

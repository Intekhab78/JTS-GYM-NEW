import axios from 'axios';
import { getToken, clearAuth } from '../utils/auth.js';
import { getLocationSlug } from '../utils/location.js';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Default to the online backend URL
let apiBase = 'https://gymapi.jtsonline.shop/api';

if (isLocalhost) {
  try {
    const xhr = new XMLHttpRequest();
    // Synchronously check if the local backend is running on port 5000
    xhr.open('GET', 'http://localhost:5000/api/settings/global', false);
    xhr.send();
    if (xhr.status === 200 || xhr.status === 304) {
      apiBase = 'http://localhost:5000/api';
      console.log('Local backend is running. Using: http://localhost:5000/api');
    }
  } catch (e) {
    console.log('Local backend is offline. Switched to online backend: https://gymapi.jtsonline.shop/api');
  }
}

export const API_BASE_URL = apiBase;
export const BASE_URL = API_BASE_URL.replace(/\/api$/, '');

export const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
};

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const locationSlug = getLocationSlug();
  if (locationSlug && locationSlug !== 'all') {
    config.headers['x-location'] = locationSlug;
  }

  const selectedBranchId = localStorage.getItem('selectedBranch');
  if (selectedBranchId && selectedBranchId !== 'all') {
    config.headers['x-location-id'] = selectedBranchId;
  }

  const systemMode = localStorage.getItem('systemMode') || 'live';
  config.headers['x-system-mode'] = systemMode;

  const selectedBrandId = localStorage.getItem('selectedBrandId');
  if (selectedBrandId) {
    config.headers['x-brand-selection'] = selectedBrandId;
  }

  return config;
});

// Automatic Session Reset on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only clear session if it's not a login/register attempt
    const isAuthPath = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthPath) {
      console.warn('Session expired or invalid token - Clearing session');
      clearAuth();
    }
    return Promise.reject(error);
  }
);

export default api;

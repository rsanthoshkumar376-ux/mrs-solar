import axios from 'axios';

// Auto-detect origin so API calls automatically match current host & port (laptop, mobile, or cloud)
const API_BASE_URL = `${window.location.origin}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mrs_solar_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch auth errors and auto-retry cold starts / network glitches
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (response && (response.status === 401 || response.status === 403)) {
      // Clear storage and trigger logout event if unauthorized or forbidden
      localStorage.removeItem('mrs_solar_token');
      localStorage.removeItem('mrs_solar_user');
      window.dispatchEvent(new Event('auth-expired'));
      return Promise.reject(error);
    }

    // Auto-retry network errors or 502/503/504 gateway timeouts (up to 3 retries)
    if (config && (!response || (response.status >= 500 && response.status <= 504))) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 3) {
        config.__retryCount += 1;
        const delay = config.__retryCount * 1500;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };

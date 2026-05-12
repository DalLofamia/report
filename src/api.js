// Determine API base URL intelligently
function getAPIBaseUrl() {
  // 1. Use explicitly set environment variable
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '');
  }

  // 2. In production on Netlify, fall back to the Render backend used by this project
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (/\.netlify\.app$/i.test(hostname)) {
      return 'https://project-tracker-api.onrender.com';
    }
  }

  // 3. In production build, use same host as frontend if API_BASE_URL not set
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;

    if (/\.netlify\.app$/i.test(hostname) && !process.env.REACT_APP_API_BASE_URL) {
      console.warn('Netlify detected. Set REACT_APP_API_BASE_URL to your backend URL; Netlify only serves the frontend build.');
    }
    
    // Try same origin first
    if (port) {
      return `${protocol}//${hostname}:5000`;
    }
    return `${protocol}//${hostname}`;
  }

  // 4. Default to localhost for development
  return 'http://localhost:5000';
}

const API_BASE_URL = getAPIBaseUrl();
const ASSET_BASE_URL = (process.env.REACT_APP_ASSET_BASE_URL || API_BASE_URL).replace(/\/$/, '');

export const apiUrl = (path) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`;
  }

  return `${API_BASE_URL}${path}`;
};

export const assetUrl = (path) => {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!path.startsWith('/')) {
    return `${ASSET_BASE_URL}/${path}`;
  }

  return `${ASSET_BASE_URL}${path}`;
};

// Log API URL in development for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}

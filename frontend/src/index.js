import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Global Fetch Interceptor to dynamically prepend the API base URL
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  let API_BASE = process.env.REACT_APP_API_URL || '';
  if (API_BASE && API_BASE.startsWith('http://') && !API_BASE.includes('localhost') && !API_BASE.includes('127.0.0.1')) {
    API_BASE = API_BASE.replace('http://', 'https://');
  }
  if (typeof url === 'string' && url.startsWith('/api/')) {
    url = `${API_BASE}${url}`;
  }
  return originalFetch(url, options);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

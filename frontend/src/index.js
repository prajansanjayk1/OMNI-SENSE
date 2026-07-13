import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Global Fetch Interceptor to dynamically prepend the API base URL
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  const API_BASE = process.env.REACT_APP_API_URL || '';
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

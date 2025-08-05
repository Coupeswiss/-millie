import axios from 'axios';

const api = axios.create({
  // If VITE_API_URL is set use it, otherwise fall back to same-origin
  baseURL: import.meta.env.VITE_API_URL || '',
});

export default api; 
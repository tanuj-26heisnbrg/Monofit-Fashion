import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' });
api.interceptors.request.use((c) => { const t = localStorage.getItem('mf_token'); if (t) c.headers.Authorization = 'Bearer ' + t; return c; });
export const errMsg = (e) => e.response?.data?.message || 'Something went wrong. Please try again';
export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
export default api;

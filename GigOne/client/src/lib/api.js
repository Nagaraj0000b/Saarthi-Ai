/**
 * @fileoverview Centralized API Client configuration.
 * Configures an Axios instance with base parameters and request interceptors 
 * to handle automated JWT injection for authenticated requests.
 * 
 * @module client/lib/api
 * @requires axios
 */

import axios from 'axios';

/**
 * Shared Axios Instance
 * Default configuration for internal API communication.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', 
});

/**
 * Auth Interceptor
 * Injects the Bearer token from LocalStorage into every outgoing request header.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;

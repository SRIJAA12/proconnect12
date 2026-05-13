// API Configuration
// Backend runs at: http://localhost:5000/api
// All API calls are now handled through the API service

// Note: Firebase has been replaced with MongoDB + Flask backend
// See: src/services/api.ts for all API endpoints

export const API_BASE_URL = 'http://localhost:5000/api';

// For backwards compatibility, export empty objects
// Components should use the api service instead
export const auth = {};
export const db = {};

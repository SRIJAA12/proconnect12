// API Service - All backend API calls go through here
import axios from 'axios';

// Backend API base URL
// In production (nginx), /proconnectBackend/* proxies to backend
// In dev, Vite proxies /proconnectBackend/api to the backend
const API_URL = '/proconnectBackend/api';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken,
          });
          localStorage.setItem('token', data.token);
          // Retry original request with new token
          error.config.headers.Authorization = `Bearer ${data.token}`;
          return apiClient(error.config);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// AUTHENTICATION APIs
// ============================================================

export const authAPI = {
  // Faculty Signup
  facultySignup: async (email: string, password: string, employeeId: string) => {
    const response = await apiClient.post('/auth/signup', {
      email: email.toLowerCase().trim(),  // Normalize to lowercase
      password,
      employee_id: employeeId,  // Backend expects snake_case
      name: email.split('@')[0],  // Generate name from email
    });
    return response.data;
  },

  // Faculty Login
  facultyLogin: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', {
      email: email.toLowerCase().trim(),  // Normalize to lowercase
      password,
    });
    // Store tokens in localStorage
    localStorage.setItem('token', response.data.token);
    if (response.data.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response.data;
  },

  // Verify Token
  verifyToken: async () => {
    const response = await apiClient.post('/auth/verify-token', {});
    return response.data;
  },

  // Refresh Token
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await apiClient.post('/auth/refresh-token', {
      refreshToken,
    });
    localStorage.setItem('token', response.data.token);
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  },

  // Request password reset OTP
  requestPasswordReset: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', {
      email: email.toLowerCase().trim(),  // Normalize to lowercase
    });
    return response.data;
  },

  // Verify OTP for password reset
  verifyOTP: async (email: string, otp: string) => {
    const response = await apiClient.post('/auth/verify-otp', {
      email: email.toLowerCase().trim(),  // Normalize to lowercase
      otp,
    });
    return response.data;
  },

  // Reset password with reset token (obtained after OTP verification)
  resetPassword: async (token: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },
};

// ============================================================
// STUDENT APIs
// ============================================================

export const studentAPI = {
  // Register new student account
  register: async (rollNumber: string, email: string, password: string) => {
    const response = await apiClient.post('/auth/student/register', {
      rollNumber,
      email: email.toLowerCase().trim(),  // Normalize to lowercase
      password,
    });
    return response.data;
  },

  // Submit student form
  submitForm: async (formData: any) => {
    const response = await apiClient.post('/students/submit', formData);
    return response.data;
  },

  // Request student password reset OTP
  requestPasswordReset: async (email: string, rollNumber: string) => {
    const response = await apiClient.post('/auth/student/forgot-password', {
      email: email.toLowerCase().trim(),  // Normalize to lowercase
      rollNumber,
    });
    return response.data;
  },

  // Verify student password reset OTP
  verifyPasswordResetOTP: async (email: string, rollNumber: string, otp: string) => {
    const response = await apiClient.post('/auth/student/verify-otp', {
      email: email.toLowerCase().trim(),  // Normalize to lowercase
      rollNumber,
      otp,
    });
    return response.data;
  },

  // Get student's own submission by roll number and email
  getSelf: async (rollNumber: string, email: string) => {
    const params: any = {
      email: email.toLowerCase().trim(),  // Normalize to lowercase
    };
    
    // Only add roll_number if it's provided (not empty)
    if (rollNumber && rollNumber.trim()) {
      params.roll_number = rollNumber;
    }
    
    const response = await apiClient.get('/students/self', {
      params,
    });
    return response.data;
  },

  // Alternative method to find student by email using /students endpoint
  findByEmail: async (email: string) => {
    const response = await apiClient.get('/students', {
      params: {
        email: email.toLowerCase().trim(),  // Normalize to lowercase
      },
    });
    return response.data;
  },

  // Proper student authentication endpoint
  authenticate: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/student/login', {
      email: email.toLowerCase().trim(),  // Normalize to lowercase
      password,
    });
    return response.data;
  },

  // Get all students (faculty only)
  getAll: async () => {
    const response = await apiClient.get('/students');
    return response.data;
  },

  // Get single student
  getById: async (id: string) => {
    const response = await apiClient.get(`/students/${id}`);
    return response.data;
  },

  // Update student
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/students/${id}`, data);
    return response.data;
  },

  // Delete student
  delete: async (id: string) => {
    const response = await apiClient.delete(`/students/${id}`);
    return response.data;
  },
};

// ============================================================
// FACULTY APIs
// ============================================================

export const facultyAPI = {
  // Get profile
  getProfile: async () => {
    const response = await apiClient.get('/faculty/profile');
    return response.data;
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.post('/faculty/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  // Get statistics
  getStats: async () => {
    const response = await apiClient.get('/faculty/stats');
    return response.data;
  },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

export const getStoredToken = (): string | null => {
  return localStorage.getItem('token');
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};

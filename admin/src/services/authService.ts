import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: boolean;
  code: number;
  message: string;
  data: {
    token: string;
    user: {
      _id: string;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
    };
  };
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', credentials);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  },

  getToken: (): string | null => {
    return localStorage.getItem('admin_token');
  },

  getUser: () => {
    const userStr = localStorage.getItem('admin_user');
    return userStr ? JSON.parse(userStr) : null;
  },
};


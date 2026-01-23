import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: number;
  company_id: number | null;
  name: string;
  email: string;
  role: string;
  permissions: string[] | null;
  status: string;
  company?: {
    id: number;
    name: string;
    status: string;
    subscription_status?: string;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('auth_token');
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data.user;
  },
};

export interface User {
  id: number;
  company_id?: number | null;
  name: string;
  email: string;
  role: 'super_admin' | 'company_admin' | 'manager' | 'staff' | 'readonly';
  permissions?: string[] | null;
  status: 'active' | 'inactive' | 'suspended';
  company?: {
    id: number;
    name: string;
    status: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

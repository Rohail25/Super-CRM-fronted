export interface Project {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  integration_type: 'api' | 'iframe' | 'hybrid';
  api_base_url?: string | null;
  api_auth_type?: string | null;
  admin_panel_url?: string | null;
  iframe_width?: string | null;
  iframe_height?: string | null;
  iframe_sandbox?: string | null;
  sso_enabled?: boolean;
  sso_method?: string | null;
  sso_redirect_url?: string | null;
  sso_callback_url?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

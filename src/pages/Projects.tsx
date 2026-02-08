import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ProjectCard from '../components/projects/ProjectCard';
import CredentialsModal from '../components/projects/CredentialsModal';
import Topbar from '../components/layout/Topbar';
import { useAuthStore } from '../stores/authStore';
import type { Project } from '../types/project.types';

interface Credential {
  id: number;
  email: string;
  password: string;
  project?: {
    id: number;
    name: string;
    slug: string;
  };
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [selectedProjectForCredentials, setSelectedProjectForCredentials] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    integration_type: 'api' as 'api' | 'iframe' | 'hybrid',
    api_base_url: '',
    api_auth_type: 'bearer',
    api_key: '',
    api_secret: '',
    admin_panel_url: '',
    sso_enabled: true,
    sso_method: 'jwt',
    sso_redirect_url: '',
    sso_callback_url: '',
    is_active: true,
  });
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<Project[]>('/projects');
      
      const projectsData = Array.isArray(response.data) 
        ? response.data 
        : (Array.isArray((response.data as any)?.data) ? (response.data as any).data : []);
      
      setProjects(projectsData);
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      setError(err.response?.data?.message || 'Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessProject = async (projectId: number) => {
    try {
      const project = projects.find(p => p.id === projectId);
      
      if (!project) {
        console.error('Project not found');
        return;
      }
      
      // Special handling for doctor project (mydoctor)
      if (project.slug === 'mydoctor') {
        navigate(`/projects/${projectId}/doctor`);
        return;
      }
      
      // Special handling for TG Calabria project
      if (project.slug === 'tg-calabria') {
        navigate(`/projects/${projectId}/tg-calabria`);
        return;
      }
      
      if (project.integration_type === 'iframe') {
        navigate(`/projects/${projectId}/iframe`);
      } else {
        const response = await api.post(`/projects/${projectId}/sso/redirect`);
        if (response.data?.redirect_url) {
          window.location.href = response.data.redirect_url;
        } else {
          console.error('No redirect URL received');
        }
      }
    } catch (error: any) {
      console.error('Failed to generate SSO URL:', error);
      alert(error.response?.data?.message || 'Failed to access project. Please try again.');
    }
  };

  const handleShowCredentials = async (projectId: number) => {
    try {
      const project = projects.find(p => p.id === projectId);
      
      if (!project) {
        console.error('Project not found');
        return;
      }

      const response = await api.get<Credential[]>(
        `/project-manages/project/${projectId}/credentials`
      );

      const credentialsData = Array.isArray(response.data)
        ? response.data
        : (response.data as any)?.data || [];

      setCredentials(credentialsData);
      setSelectedProjectForCredentials(project);
      setShowCredentialsModal(true);
    } catch (error: any) {
      console.error('Failed to fetch credentials:', error);
      alert(error.response?.data?.message || 'Failed to load credentials. Please try again.');
    }
  };

  const handleOpenExternalLogin = () => {
    if (selectedProjectForCredentials?.slug === 'mydoctor') {
      window.open('https://mydoctoradmin.mydoctorplus.it/login', '_blank');
    } else if (selectedProjectForCredentials?.slug === 'tg-calabria') {
      window.open('https://tgcalabriareport.com/login', '_blank');
    }
  };

  const handleCreateProject = async () => {
    try {
      if (!formData.name || !formData.slug) {
        alert('Name and slug are required');
        return;
      }

      await api.post('/projects', formData);
      setShowModal(false);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      console.error('Failed to create project:', error);
      alert(error.response?.data?.message || 'Failed to create project');
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;

    try {
      await api.put(`/projects/${editingProject.id}`, formData);
      setShowModal(false);
      setEditingProject(null);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      console.error('Failed to update project:', error);
      alert(error.response?.data?.message || 'Failed to update project');
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/projects/${projectId}`);
      fetchProjects();
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      alert(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      integration_type: 'api',
      api_base_url: '',
      api_auth_type: 'bearer',
      api_key: '',
      api_secret: '',
      admin_panel_url: '',
      sso_enabled: true,
      sso_method: 'jwt',
      sso_redirect_url: '',
      sso_callback_url: '',
      is_active: true,
    });
    setEditingProject(null);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      slug: project.slug,
      description: project.description || '',
      integration_type: project.integration_type,
      api_base_url: project.api_base_url || '',
      api_auth_type: (project as any).api_auth_type || 'bearer',
      api_key: '', // Don't show existing keys
      api_secret: '', // Don't show existing secrets
      admin_panel_url: project.admin_panel_url || '',
      sso_enabled: project.sso_enabled ?? true,
      sso_method: (project as any).sso_method || 'jwt',
      sso_redirect_url: project.sso_redirect_url || '',
      sso_callback_url: project.sso_callback_url || '',
      is_active: project.is_active,
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aqua-5"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Topbar
          title="Projects"
          subtitle="Manage and access integrated projects"
        />
        <div className="bg-white border border-bad/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-lg font-semibold text-ink mb-1">Error Loading Projects</h3>
              <p className="text-sm text-muted">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchProjects}
            className="px-4 py-2 bg-aqua-5 text-white rounded-lg hover:bg-aqua-4 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar
        title="Projects"
        subtitle={isSuperAdmin ? "Manage and configure integrated projects" : "Access your integrated projects"}
        actions={
          <>
            <button
              onClick={fetchProjects}
              className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
            >
              🔄 Refresh
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-4 py-2 text-sm border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
              >
                ➕ New Project
              </button>
            )}
          </>
        }
      />

      {projects.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-ink mb-2">No Projects Available</h3>
          <p className="text-muted mb-4">
            {isSuperAdmin
              ? 'Create your first project to get started.'
              : 'You don\'t have access to any projects yet. Contact your administrator.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="relative">
              <ProjectCard
                project={project}
                onAccess={handleAccessProject}
                isSuperAdmin={isSuperAdmin}
                onShowCredentials={isSuperAdmin ? handleShowCredentials : undefined}
              />
              {isSuperAdmin && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => openEditModal(project)}
                    className="px-2 py-1 text-xs bg-aqua-5 text-white rounded-lg hover:bg-aqua-4 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="px-2 py-1 text-xs bg-bad text-white rounded-lg hover:bg-bad/80 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-ink">
                {editingProject ? 'Edit Project' : 'New Project'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-muted hover:text-ink text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Slug *</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Integration Type *</label>
                  <select
                    value={formData.integration_type}
                    onChange={(e) => setFormData({ ...formData, integration_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  >
                    <option value="api">API</option>
                    <option value="iframe">Iframe</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Status</label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {(formData.integration_type === 'api' || formData.integration_type === 'hybrid') && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-2">API Base URL</label>
                    <input
                      type="url"
                      value={formData.api_base_url}
                      onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
                      placeholder="https://api.example.com"
                      className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">API Auth Type</label>
                      <select
                        value={formData.api_auth_type}
                        onChange={(e) => setFormData({ ...formData, api_auth_type: e.target.value })}
                        className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                      >
                        <option value="bearer">Bearer Token</option>
                        <option value="basic">Basic Auth</option>
                        <option value="oauth2">OAuth2</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">API Key {editingProject && '(leave blank to keep existing)'}</label>
                      <input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-2">API Secret {editingProject && '(leave blank to keep existing)'}</label>
                    <input
                      type="password"
                      value={formData.api_secret}
                      onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                    />
                  </div>
                </>
              )}

              {(formData.integration_type === 'iframe' || formData.integration_type === 'hybrid') && (
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Admin Panel URL</label>
                  <input
                    type="url"
                    value={formData.admin_panel_url}
                    onChange={(e) => setFormData({ ...formData, admin_panel_url: e.target.value })}
                    placeholder="https://admin.example.com"
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">SSO Redirect URL</label>
                  <input
                    type="url"
                    value={formData.sso_redirect_url}
                    onChange={(e) => setFormData({ ...formData, sso_redirect_url: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">SSO Callback URL</label>
                  <input
                    type="url"
                    value={formData.sso_callback_url}
                    onChange={(e) => setFormData({ ...formData, sso_callback_url: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sso_enabled"
                  checked={formData.sso_enabled}
                  onChange={(e) => setFormData({ ...formData, sso_enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="sso_enabled" className="text-sm text-ink">SSO Enabled</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
              >
                Cancel
              </button>
              <button
                onClick={editingProject ? handleUpdateProject : handleCreateProject}
                className="px-4 py-2 text-sm bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold"
              >
                {editingProject ? 'Update' : 'Create'} Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={showCredentialsModal}
        onClose={() => {
          setShowCredentialsModal(false);
          setCredentials([]);
          setSelectedProjectForCredentials(null);
        }}
        credentials={credentials}
        projectName={selectedProjectForCredentials?.name || 'Project'}
        externalUrl={
          selectedProjectForCredentials?.slug === 'mydoctor' || 
          selectedProjectForCredentials?.slug === 'tg-calabria'
            ? 'https://mydoctoradmin.mydoctorplus.it/login'
            : undefined
        }
        onOpenExternal={
          (selectedProjectForCredentials?.slug === 'mydoctor' || 
           selectedProjectForCredentials?.slug === 'tg-calabria')
            ? handleOpenExternalLogin
            : undefined
        }
      />
    </div>
  );
}

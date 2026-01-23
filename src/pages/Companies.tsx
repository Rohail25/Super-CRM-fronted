import { useEffect, useState } from 'react';
import api from '../services/api';
import Topbar from '../components/layout/Topbar';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface Company {
  id: number;
  name: string;
  vat: string | null;
  address?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  users?: User[];
  project_accesses?: ProjectAccess[];
  signup_request?: {
    id: number;
    status: string;
    requested_projects: Project[];
    requested_at: string;
    reviewed_at?: string;
  };
}

interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  integration_type: string;
  is_active: boolean;
}

interface ProjectAccess {
  id: number;
  company_id: number;
  project_id: number;
  status: string;
  project: Project;
}

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [showProjectAccessModal, setShowProjectAccessModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    vat: '',
    address: '',
    status: 'active',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchCompanies();
    fetchAllProjects();
  }, [searchTerm, statusFilter, currentPage]);

  const fetchAllProjects = async () => {
    try {
      const response = await api.get<Project[]>('/projects');
      setAllProjects(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params: any = {
        per_page: pagination.per_page,
        page: currentPage,
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await api.get('/companies', { params });
      
      // Handle paginated response
      if (response.data.data) {
        setCompanies(response.data.data);
        setPagination({
          current_page: response.data.current_page || 1,
          last_page: response.data.last_page || 1,
          per_page: response.data.per_page || 15,
          total: response.data.total || 0,
        });
        setCurrentPage(response.data.current_page || 1);
      } else {
        // Handle non-paginated response
        const data = Array.isArray(response.data) ? response.data : [];
        setCompanies(data);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    try {
      const payload: any = {
        name: formData.name,
        status: formData.status,
      };

      if (formData.vat) {
        payload.vat = formData.vat;
      }
      if (formData.address) {
        payload.address = formData.address;
      }

      await api.post('/companies', payload);
      setShowCreateModal(false);
      resetForm();
      fetchCompanies();
    } catch (error: any) {
      console.error('Failed to create company:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create company. Please try again.';
      alert(errorMessage);
    }
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany) return;

    try {
      const payload: any = {};

      if (formData.name !== editingCompany.name) {
        payload.name = formData.name;
      }
      if (formData.vat !== (editingCompany.vat || '')) {
        payload.vat = formData.vat || null;
      }
      if (formData.address !== (editingCompany.address || '')) {
        payload.address = formData.address || null;
      }
      if (formData.status !== editingCompany.status) {
        payload.status = formData.status;
      }

      await api.put(`/companies/${editingCompany.id}`, payload);
      setEditingCompany(null);
      resetForm();
      fetchCompanies();
    } catch (error: any) {
      console.error('Failed to update company:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update company. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDeleteCompany = async (companyId: number) => {
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/companies/${companyId}`);
      fetchCompanies();
    } catch (error: any) {
      console.error('Failed to delete company:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete company. Please try again.';
      alert(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      vat: '',
      address: '',
      status: 'active',
    });
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      vat: company.vat || '',
      address: company.address || '',
      status: company.status,
    });
  };

  const openViewModal = async (company: Company) => {
    try {
      // Fetch full company details
      const response = await api.get(`/companies/${company.id}`);
      const companyData = response.data;
      
      // Debug: Log the response to see what we're getting
      console.log('Company data from API:', companyData);
      console.log('Signup request data:', companyData.signup_request);
      
      // Fetch project accesses
      try {
        const projectsResponse = await api.get(`/companies/${company.id}/projects`);
        companyData.project_accesses = projectsResponse.data;
      } catch (error) {
        console.error('Failed to fetch project accesses:', error);
        companyData.project_accesses = [];
      }
      
      setViewingCompany(companyData);
      setShowViewModal(true);
    } catch (error) {
      console.error('Failed to fetch company details:', error);
      // Fallback to basic company data
      setViewingCompany(company);
      setShowViewModal(true);
    }
  };

  const handleGrantProjectAccess = async () => {
    if (!viewingCompany || !selectedProjectId) return;

    try {
      const response = await api.post(`/companies/${viewingCompany.id}/projects/grant`, {
        project_id: selectedProjectId,
        status: 'active',
      });
      
      console.log('Grant project access response:', response.data);
      
      // Check for registration result
      if (response.data.registration_result) {
        const regResult = response.data.registration_result;
        console.log('Registration result:', regResult);
        
        // Get project name from response
        const projectName = response.data.project?.name || 'external project';
        
        if (regResult.results) {
          const { success, failed, total } = regResult.results;
          const successCount = Array.isArray(success) ? success.length : 0;
          const failedCount = Array.isArray(failed) ? failed.length : 0;
          
          if (successCount > 0) {
            alert(`Successfully registered ${successCount} out of ${total} users to ${projectName}.`);
          }
          if (failedCount > 0) {
            console.warn('Some users failed to register:', failed);
            
            // Show detailed error messages
            const errorMessages = failed.map((f: any) => {
              let msg = `${f.name} (${f.email}): ${f.error}`;
              if (f.error_details) {
                const details = Object.entries(f.error_details)
                  .map(([key, value]: [string, any]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                  .join('; ');
                msg += ` - ${details}`;
              }
              return msg;
            }).join('\n');
            
            alert(`Warning: ${failedCount} users failed to register to ${projectName}:\n\n${errorMessages}`);
          }
        }
      }
      
      setShowProjectAccessModal(false);
      setSelectedProjectId(null);
      openViewModal(viewingCompany); // Refresh company data
    } catch (error: any) {
      console.error('Failed to grant project access:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.message || 'Failed to grant project access');
    }
  };

  const handleRevokeProjectAccess = async (projectId: number) => {
    if (!viewingCompany) return;
    if (!confirm('Are you sure you want to revoke access to this project?')) return;

    try {
      await api.delete(`/companies/${viewingCompany.id}/projects/${projectId}`);
      openViewModal(viewingCompany); // Refresh company data
    } catch (error: any) {
      console.error('Failed to revoke project access:', error);
      alert(error.response?.data?.message || 'Failed to revoke project access');
    }
  };

  const handleUpdateProjectAccessStatus = async (projectId: number, status: string) => {
    if (!viewingCompany) return;

    try {
      await api.put(`/companies/${viewingCompany.id}/projects/${projectId}`, { status });
      openViewModal(viewingCompany); // Refresh company data
    } catch (error: any) {
      console.error('Failed to update project access:', error);
      alert(error.response?.data?.message || 'Failed to update project access');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-ok/20 text-ok border-ok/30',
      pending: 'bg-warn/20 text-warn border-warn/30',
      suspended: 'bg-bad/20 text-bad border-bad/30',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aqua-5"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar
        title="Companies"
        subtitle="Manage companies and their settings"
        actions={
          <>
            <button className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium">
              Export
            </button>
            <button 
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="px-4 py-2 text-sm border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
            >
              ➕ New Company
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="bg-white border border-line rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
        {companies.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-aqua-1">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">VAT</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id} className="border-t border-line/50 hover:bg-aqua-1/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{company.name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{company.vat || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusBadge(company.status)}`}>
                          {company.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openViewModal(company)}
                            className="text-sm text-aqua-5 hover:text-aqua-4 font-medium transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => openEditModal(company)}
                            className="text-sm text-ink hover:text-aqua-5 font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCompany(company.id)}
                            className="text-sm text-bad hover:text-bad/80 font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination.last_page > 1 && (
              <div className="px-4 py-3 border-t border-line flex items-center justify-between">
                <div className="text-sm text-muted">
                  Showing {((currentPage - 1) * pagination.per_page) + 1} to {Math.min(currentPage * pagination.per_page, pagination.total)} of {pagination.total} companies
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCurrentPage(currentPage - 1);
                    }}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-line rounded-lg hover:bg-aqua-1/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage(currentPage + 1);
                    }}
                    disabled={currentPage >= pagination.last_page}
                    className="px-3 py-1.5 text-sm border border-line rounded-lg hover:bg-aqua-1/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted">
            <p>No companies found.</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-sm text-aqua-5 hover:text-aqua-4"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCompany) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-ink mb-4">
              {editingCompany ? 'Edit Company' : 'New Company'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Company Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">VAT Number</label>
                <input
                  type="text"
                  value={formData.vat}
                  onChange={(e) => setFormData({ ...formData, vat: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  placeholder="Enter VAT number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  placeholder="Enter company address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCompany(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
              >
                Cancel
              </button>
              <button
                onClick={editingCompany ? handleUpdateCompany : handleCreateCompany}
                className="flex-1 px-4 py-2 bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold"
              >
                {editingCompany ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-ink mb-4">Company Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Company Name</label>
                <p className="text-ink font-semibold">{viewingCompany.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-1">VAT Number</label>
                <p className="text-ink">{viewingCompany.vat || '-'}</p>
              </div>

              {viewingCompany.address && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Address</label>
                  <p className="text-ink">{viewingCompany.address}</p>
                </div>
              )}

              {viewingCompany.users && viewingCompany.users.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Company Admin Email</label>
                  {(() => {
                    const adminUser = viewingCompany.users?.find((u) => u.role === 'company_admin');
                    const displayUser = adminUser || viewingCompany.users?.[0];
                    return displayUser ? (
                      <p className="text-ink">{displayUser.email}</p>
                    ) : (
                      <p className="text-ink">-</p>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted mb-1">Status</label>
                <span className={`inline-block text-xs px-2 py-1 rounded-full border font-medium ${getStatusBadge(viewingCompany.status)}`}>
                  {viewingCompany.status}
                </span>
              </div>

              {viewingCompany.created_at && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Created At</label>
                  <p className="text-ink text-sm">{new Date(viewingCompany.created_at).toLocaleString()}</p>
                </div>
              )}

              {/* Requested Projects Section */}
              {viewingCompany.signup_request && (
                <div className="border-t border-line pt-4 mt-4">
                  <label className="block text-sm font-semibold text-ink mb-3">Requested Projects</label>
                  {viewingCompany.signup_request.requested_projects && viewingCompany.signup_request.requested_projects.length > 0 ? (
                    <>
                      <div className="space-y-2 mb-4">
                        {viewingCompany.signup_request.requested_projects.map((project: Project) => (
                          <div key={project.id} className="flex items-center justify-between p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-ink">{project.name}</div>
                              {project.description && (
                                <div className="text-xs text-muted mt-1">{project.description}</div>
                              )}
                              <div className="text-xs text-cyan-600 mt-1">
                                Type: {project.integration_type}
                              </div>
                            </div>
                            <span className="text-xs px-2 py-1 bg-warn/20 text-warn border border-warn/30 rounded-full font-medium">
                              Requested
                            </span>
                          </div>
                        ))}
                      </div>
                      {viewingCompany.signup_request.requested_at && (
                        <p className="text-xs text-muted">
                          Requested on {new Date(viewingCompany.signup_request.requested_at).toLocaleString()}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted">No projects were requested during registration.</p>
                  )}
                </div>
              )}

              {/* Project Access Section */}
              <div className="border-t border-line pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold text-ink">Project Access</label>
                  <button
                    onClick={() => setShowProjectAccessModal(true)}
                    className="px-3 py-1 text-xs bg-aqua-5 text-white rounded-lg hover:bg-aqua-4 transition-colors"
                  >
                    ➕ Grant Access
                  </button>
                </div>
                
                {viewingCompany.project_accesses && viewingCompany.project_accesses.length > 0 ? (
                  <div className="space-y-2">
                    {viewingCompany.project_accesses.map((access) => (
                      <div key={access.id} className="flex items-center justify-between p-2 bg-aqua-1/20 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-ink">{access.project.name}</div>
                          <div className="text-xs text-muted">{access.project.integration_type}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={access.status}
                            onChange={(e) => handleUpdateProjectAccessStatus(access.project_id, e.target.value)}
                            className="text-xs px-2 py-1 border border-line rounded-lg focus:outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="revoked">Revoked</option>
                          </select>
                          <button
                            onClick={() => handleRevokeProjectAccess(access.project_id)}
                            className="px-2 py-1 text-xs bg-bad text-white rounded-lg hover:bg-bad/80 transition-colors"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No project access granted yet.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingCompany(null);
                }}
                className="flex-1 px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(viewingCompany);
                }}
                className="flex-1 px-4 py-2 bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant Project Access Modal */}
      {showProjectAccessModal && viewingCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-ink mb-4">Grant Project Access</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Select Project</label>
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                >
                  <option value="">-- Select a project --</option>
                  {allProjects
                    .filter(project => 
                      !viewingCompany.project_accesses?.some(access => access.project_id === project.id)
                    )
                    .map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.integration_type})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowProjectAccessModal(false);
                  setSelectedProjectId(null);
                }}
                className="flex-1 px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantProjectAccess}
                disabled={!selectedProjectId}
                className="flex-1 px-4 py-2 bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Grant Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

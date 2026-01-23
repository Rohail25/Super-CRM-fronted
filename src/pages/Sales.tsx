import { useEffect, useState } from 'react';
import api from '../services/api';
import Topbar from '../components/layout/Topbar';

interface Customer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  company_name?: string | null;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Project {
  id: number;
  name: string;
}

interface Opportunity {
  id: number;
  name: string;
  description: string | null;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost' | 'on_hold';
  value: number | null;
  currency: string;
  probability: number | null;
  weighted_value: number | null;
  expected_close_date: string | null;
  closed_at: string | null;
  source: string | null;
  campaign: string | null;
  customer: Customer | null;
  project: Project | null;
  assignee: User | null;
  creator: User | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  data: Opportunity[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default function Sales() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    stage: 'all',
    search: '',
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stage: 'prospecting' as 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost' | 'on_hold',
    customer_id: '',
    project_id: '',
    value: '',
    currency: 'EUR',
    probability: '',
    expected_close_date: '',
    source: '',
    campaign: '',
  });

  useEffect(() => {
    fetchOpportunities();
  }, [filters, pagination.current_page]);

  useEffect(() => {
    if (showCreateModal) {
      fetchCustomers();
      fetchProjects();
    }
  }, [showCreateModal]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      };

      if (filters.stage !== 'all') {
        params.stage = filters.stage;
      }

      if (filters.search) {
        params.search = filters.search;
      }

      const response = await api.get<PaginatedResponse>('/opportunities', { params });
      setOpportunities(response.data.data || []);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        per_page: response.data.per_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers', { params: { per_page: 100 } });
      const data = response.data.data || response.data || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
    }
  };

  const handleCreateOpportunity = async () => {
    try {
      const payload: any = {
        name: formData.name,
        stage: formData.stage,
      };

      if (formData.description) payload.description = formData.description;
      if (formData.customer_id) payload.customer_id = parseInt(formData.customer_id);
      if (formData.project_id) payload.project_id = parseInt(formData.project_id);
      if (formData.value) payload.value = parseFloat(formData.value);
      if (formData.currency) payload.currency = formData.currency;
      if (formData.probability) payload.probability = parseInt(formData.probability);
      if (formData.expected_close_date) payload.expected_close_date = formData.expected_close_date;
      if (formData.source) payload.source = formData.source;
      if (formData.campaign) payload.campaign = formData.campaign;

      await api.post('/opportunities', payload);
      setShowCreateModal(false);
      resetForm();
      fetchOpportunities();
    } catch (error: any) {
      console.error('Failed to create opportunity:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create opportunity. Please try again.';
      alert(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      stage: 'prospecting',
      customer_id: '',
      project_id: '',
      value: '',
      currency: 'EUR',
      probability: '',
      expected_close_date: '',
      source: '',
      campaign: '',
    });
  };

  const getStageBadge = (stage: string) => {
    const styles: Record<string, string> = {
      prospecting: 'bg-blue-100 text-blue-700 border-blue-300',
      qualification: 'bg-purple-100 text-purple-700 border-purple-300',
      proposal: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      negotiation: 'bg-orange-100 text-orange-700 border-orange-300',
      closed_won: 'bg-green-100 text-green-700 border-green-300',
      closed_lost: 'bg-red-100 text-red-700 border-red-300',
      on_hold: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return styles[stage] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const formatStage = (stage: string) => {
    return stage
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatCurrency = (value: number | null, currency: string = 'EUR') => {
    if (!value) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCustomerName = (customer: Customer | null) => {
    if (!customer) return '-';
    if (customer.company_name) return customer.company_name;
    const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    return name || customer.email || '-';
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, current_page: page }));
  };

  if (loading && opportunities.length === 0) {
    return (
      <div className="space-y-6">
        <Topbar
          title="Sales Pipeline"
          subtitle="Manage opportunities, deals, and sales stages"
          actions={
            <>
              <button className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium">
                Export
              </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
            >
              ➕ New Opportunity
            </button>
            </>
          }
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aqua-5"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar
        title="Sales Pipeline"
        subtitle="Manage opportunities, deals, and sales stages"
        actions={
          <>
            <button className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium">
              Export
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
            >
              ➕ New Opportunity
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="bg-white border border-line rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">Search</label>
            <input
              type="text"
              placeholder="Search opportunities..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">Stage</label>
            <select
              value={filters.stage}
              onChange={(e) => handleFilterChange('stage', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
            >
              <option value="all">All Stages</option>
              <option value="prospecting">Prospecting</option>
              <option value="qualification">Qualification</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchOpportunities}
              className="w-full px-4 py-2 text-sm border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aqua-5"></div>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted text-lg mb-2">No opportunities found</p>
            <p className="text-muted text-sm">Create your first opportunity to get started</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-aqua-1/30 border-b border-line">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">Opportunity</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">Stage</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted uppercase">Value</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted uppercase">Probability</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">Expected Close</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">Assigned To</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opportunity) => (
                    <tr
                      key={opportunity.id}
                      className="border-b border-line/50 hover:bg-aqua-1/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-ink">{opportunity.name}</div>
                        {opportunity.description && (
                          <div className="text-xs text-muted mt-1 line-clamp-1">{opportunity.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink">{getCustomerName(opportunity.customer)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStageBadge(
                            opportunity.stage
                          )}`}
                        >
                          {formatStage(opportunity.stage)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink text-right font-semibold">
                        {formatCurrency(opportunity.value, opportunity.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink text-right">
                        {opportunity.probability !== null ? `${opportunity.probability}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{formatDate(opportunity.expected_close_date)}</td>
                      <td className="px-4 py-3 text-sm text-muted">{opportunity.source || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {opportunity.assignee?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-sm text-aqua-5 hover:text-aqua-4 font-medium">View</button>
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
                  Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                  {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}{' '}
                  opportunities
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className="px-3 py-1 text-sm border border-line rounded-lg hover:bg-aqua-1/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                    className="px-3 py-1 text-sm border border-line rounded-lg hover:bg-aqua-1/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Opportunity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-ink mb-4">Create New Opportunity</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Opportunity Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  required
                  placeholder="e.g., New Client Deal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  placeholder="Describe the opportunity..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Stage *</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                    required
                  >
                    <option value="prospecting">Prospecting</option>
                    <option value="qualification">Qualification</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Customer</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  >
                    <option value="">Select Customer (Optional)</option>
                    {customers.map((customer) => {
                      const name = customer.company_name || 
                        `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
                        customer.email;
                      return (
                        <option key={customer.id} value={customer.id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Project</label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  >
                    <option value="">Select Project (Optional)</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Value (€)</label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Probability (%)</label>
                  <input
                    type="number"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    placeholder="0-100"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Source</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g., website, referral, cold_call"
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Campaign</label>
                  <input
                    type="text"
                    value={formData.campaign}
                    onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                    placeholder="Campaign name"
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOpportunity}
                className="flex-1 px-4 py-2 bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold"
              >
                Create Opportunity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

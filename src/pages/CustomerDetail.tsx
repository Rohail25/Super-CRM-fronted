import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Topbar from '../components/layout/Topbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface Customer {
  id: number;
  email: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  vat: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  opportunities?: Opportunity[];
  tasks?: Task[];
  notes?: Note[];
  documents?: Document[];
}

interface Opportunity {
  id: number;
  name: string;
  description: string | null;
  stage: string;
  value: number | null;
  currency: string;
  probability: number | null;
  expected_close_date: string | null;
  source: string | null;
  assignee: User | null;
  created_at: string;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assignee: User | null;
  creator: User | null;
  created_at: string;
}

interface Note {
  id: number;
  title: string | null;
  content: string;
  type: string;
  is_pinned: boolean;
  is_important: boolean;
  user: User | null;
  created_at: string;
}

interface Document {
  id: number;
  name: string;
  original_name: string;
  category: string | null;
  size: number;
  mime_type: string | null;
  created_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface ActivityLog {
  id: number;
  action: string;
  description: string;
  user: User | null;
  created_at: string;
}

interface CustomerStats {
  opportunities_count: number;
  open_opportunities_count: number;
  total_opportunities_value: number;
  tasks_count: number;
  pending_tasks_count: number;
  completed_tasks_count: number;
  notes_count: number;
  documents_count: number;
  activity_logs_count: number;
}

type Tab = 'overview' | 'opportunities' | 'tasks' | 'notes' | 'documents' | 'activity';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    vat: '',
    address: '',
    notes: '',
  });
  const [opportunityFormData, setOpportunityFormData] = useState({
    name: '',
    description: '',
    stage: 'prospecting' as 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost' | 'on_hold',
    assigned_to: '',
    value: '',
    currency: 'EUR',
    probability: '',
    expected_close_date: '',
    source: '',
    campaign: '',
  });

  useEffect(() => {
    if (id) {
      fetchCustomerDetail();
    }
  }, [id]);

  useEffect(() => {
    if (showOpportunityModal) {
      fetchUsers();
    }
  }, [showOpportunityModal]);

  const fetchCustomerDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/customers/${id}`);
      const data = response.data;
      
      setCustomer(data.customer || data);
      setStats(data.stats || null);
      setActivityLogs(data.activity_logs || []);
      
      if (data.customer) {
        setFormData({
          email: data.customer.email,
          phone: data.customer.phone,
          first_name: data.customer.first_name || '',
          last_name: data.customer.last_name || '',
          vat: data.customer.vat || '',
          address: data.customer.address || '',
          notes: data.customer.notes || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error);
      alert('Failed to load customer details');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users', { params: { per_page: 100, status: 'active' } });
      const data = response.data.data || response.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!customer) return;

    try {
      await api.put(`/customers/${customer.id}`, formData);
      setShowEditModal(false);
      fetchCustomerDetail();
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      alert(error.response?.data?.message || 'Failed to update customer');
    }
  };

  const handleCreateOpportunity = async () => {
    if (!customer) return;

    try {
      const payload: any = {
        name: opportunityFormData.name,
        stage: opportunityFormData.stage,
        customer_id: customer.id, // Pre-fill with current customer
      };

      if (opportunityFormData.description) payload.description = opportunityFormData.description;
      if (opportunityFormData.assigned_to) payload.assigned_to = parseInt(opportunityFormData.assigned_to);
      if (opportunityFormData.value) payload.value = parseFloat(opportunityFormData.value);
      if (opportunityFormData.currency) payload.currency = opportunityFormData.currency;
      if (opportunityFormData.probability) payload.probability = parseInt(opportunityFormData.probability);
      if (opportunityFormData.expected_close_date) payload.expected_close_date = opportunityFormData.expected_close_date;
      if (opportunityFormData.source) payload.source = opportunityFormData.source;
      if (opportunityFormData.campaign) payload.campaign = opportunityFormData.campaign;

      await api.post('/opportunities', payload);
      setShowOpportunityModal(false);
      resetOpportunityForm();
      fetchCustomerDetail(); // Refresh customer data to show new opportunity
    } catch (error: any) {
      console.error('Failed to create opportunity:', error);
      alert(error.response?.data?.message || 'Failed to create opportunity. Please try again.');
    }
  };

  const resetOpportunityForm = () => {
    setOpportunityFormData({
      name: '',
      description: '',
      stage: 'prospecting',
      assigned_to: '',
      value: '',
      currency: 'EUR',
      probability: '',
      expected_close_date: '',
      source: '',
      campaign: '',
    });
  };

  const getCustomerName = (customer: Customer): string => {
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.email;
  };

  const formatCurrency = (value: number | null, currency: string = 'EUR') => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  const getStageBadge = (stage: string) => {
    const styles: Record<string, string> = {
      prospecting: 'bg-blue-100 text-blue-800 border-blue-200',
      qualification: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      proposal: 'bg-purple-100 text-purple-800 border-purple-200',
      negotiation: 'bg-orange-100 text-orange-800 border-orange-200',
      closed_won: 'bg-green-100 text-green-800 border-green-200',
      closed_lost: 'bg-red-100 text-red-800 border-red-200',
      on_hold: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return styles[stage] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800 border-gray-200',
      medium: 'bg-blue-100 text-blue-800 border-blue-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Customer not found</p>
        <button
          onClick={() => navigate('/customers')}
          className="mt-4 px-4 py-2 bg-aqua-5 text-white rounded-xl"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar
        title={getCustomerName(customer)}
        subtitle="Customer Details"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => navigate('/customers')}
            >
              ← Back
            </Button>
            <Button
              onClick={() => setShowEditModal(true)}
            >
              Edit Customer
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-line rounded-xl p-4">
            <div className="text-sm text-muted">Opportunities</div>
            <div className="text-2xl font-bold text-ink mt-1">{stats.opportunities_count}</div>
            <div className="text-xs text-muted mt-1">{stats.open_opportunities_count} open</div>
          </div>
          <div className="bg-white border border-line rounded-xl p-4">
            <div className="text-sm text-muted">Tasks</div>
            <div className="text-2xl font-bold text-ink mt-1">{stats.tasks_count}</div>
            <div className="text-xs text-muted mt-1">{stats.pending_tasks_count} pending</div>
          </div>
          <div className="bg-white border border-line rounded-xl p-4">
            <div className="text-sm text-muted">Notes</div>
            <div className="text-2xl font-bold text-ink mt-1">{stats.notes_count}</div>
          </div>
          <div className="bg-white border border-line rounded-xl p-4">
            <div className="text-sm text-muted">Documents</div>
            <div className="text-2xl font-bold text-ink mt-1">{stats.documents_count}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-line rounded-xl">
        <div className="border-b border-line">
          <nav className="flex -mb-px">
            {(['overview', 'opportunities', 'tasks', 'notes', 'documents', 'activity'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-aqua-5 text-aqua-5'
                    : 'border-transparent text-muted hover:text-ink hover:border-line'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-ink mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-muted">Email</div>
                      <div className="text-ink">{customer.email}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">Phone</div>
                      <div className="text-ink">{customer.phone}</div>
                    </div>
                    {customer.vat && (
                      <div>
                        <div className="text-sm text-muted">VAT Number</div>
                        <div className="text-ink">{customer.vat}</div>
                      </div>
                    )}
                    {customer.address && (
                      <div>
                        <div className="text-sm text-muted">Address</div>
                        <div className="text-ink">{customer.address}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink mb-4">Additional Information</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-muted">Created</div>
                      <div className="text-ink">{formatDateTime(customer.created_at)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">Last Updated</div>
                      <div className="text-ink">{formatDateTime(customer.updated_at)}</div>
                    </div>
                    {customer.notes && (
                      <div>
                        <div className="text-sm text-muted">Notes</div>
                        <div className="text-ink whitespace-pre-wrap">{customer.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Opportunities Tab */}
          {activeTab === 'opportunities' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-ink">Opportunities</h3>
                <Button onClick={() => setShowOpportunityModal(true)}>
                  + New Opportunity
                </Button>
              </div>
              {customer.opportunities && customer.opportunities.length > 0 ? (
                <div className="space-y-3">
                  {customer.opportunities.map((opp) => (
                    <div key={opp.id} className="border border-line rounded-lg p-4 hover:bg-aqua-1/10 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-ink">{opp.name}</div>
                          {opp.description && (
                            <div className="text-sm text-muted mt-1">{opp.description}</div>
                          )}
                          <div className="flex gap-4 mt-3 text-sm text-muted">
                            <span>Value: {formatCurrency(opp.value, opp.currency)}</span>
                            {opp.probability !== null && <span>Probability: {opp.probability}%</span>}
                            {opp.expected_close_date && <span>Close: {formatDate(opp.expected_close_date)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStageBadge(opp.stage)}`}>
                            {opp.stage.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted">
                  No opportunities found. Create one to get started!
                </div>
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-ink">Tasks</h3>
                <Button onClick={() => navigate(`/tasks?taskable_type=Customer&taskable_id=${customer.id}`)}>
                  + New Task
                </Button>
              </div>
              {customer.tasks && customer.tasks.length > 0 ? (
                <div className="space-y-3">
                  {customer.tasks.map((task) => (
                    <div key={task.id} className="border border-line rounded-lg p-4 hover:bg-aqua-1/10 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-ink">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-muted mt-1">{task.description}</div>
                          )}
                          <div className="flex gap-4 mt-3 text-sm text-muted">
                            {task.due_date && <span>Due: {formatDate(task.due_date)}</span>}
                            {task.assignee && <span>Assigned to: {task.assignee.name}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted">
                  No tasks found. Create one to get started!
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-ink">Notes</h3>
                <Button onClick={() => navigate(`/notes?noteable_type=Customer&noteable_id=${customer.id}`)}>
                  + New Note
                </Button>
              </div>
              {customer.notes && customer.notes.length > 0 ? (
                <div className="space-y-3">
                  {customer.notes.map((note) => (
                    <div key={note.id} className="border border-line rounded-lg p-4 hover:bg-aqua-1/10 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-ink">{note.title || 'Untitled Note'}</div>
                        <div className="flex items-center gap-2">
                          {note.is_pinned && <span className="text-xs">📌</span>}
                          {note.is_important && <span className="text-xs">⭐</span>}
                          <span className="text-xs text-muted">{formatDateTime(note.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-sm text-ink whitespace-pre-wrap">{note.content}</div>
                      {note.user && (
                        <div className="text-xs text-muted mt-2">By {note.user.name}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted">
                  No notes found. Create one to get started!
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-ink">Documents</h3>
                <Button onClick={() => navigate(`/documents?documentable_type=Customer&documentable_id=${customer.id}`)}>
                  + Upload Document
                </Button>
              </div>
              {customer.documents && customer.documents.length > 0 ? (
                <div className="space-y-3">
                  {customer.documents.map((doc) => (
                    <div key={doc.id} className="border border-line rounded-lg p-4 hover:bg-aqua-1/10 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-semibold text-ink">{doc.name}</div>
                          <div className="text-sm text-muted mt-1">
                            {doc.original_name} • {formatFileSize(doc.size)}
                            {doc.category && ` • ${doc.category}`}
                          </div>
                          <div className="text-xs text-muted mt-1">{formatDateTime(doc.created_at)}</div>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => window.open(`/api/documents/${doc.id}/download`, '_blank')}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted">
                  No documents found. Upload one to get started!
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ink">Activity Log</h3>
              {activityLogs.length > 0 ? (
                <div className="space-y-3">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="border border-line rounded-lg p-4 hover:bg-aqua-1/10 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-ink">{log.action}</div>
                          <div className="text-sm text-muted mt-1">{log.description}</div>
                        </div>
                        <div className="text-xs text-muted">
                          {formatDateTime(log.created_at)}
                          {log.user && ` • ${log.user.name}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted">
                  No activity logs found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Opportunity Modal */}
      {showOpportunityModal && (
        <Modal
          isOpen={showOpportunityModal}
          onClose={() => {
            setShowOpportunityModal(false);
            resetOpportunityForm();
          }}
          title="Create New Opportunity"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Opportunity Name *</label>
              <input
                type="text"
                value={opportunityFormData.name}
                onChange={(e) => setOpportunityFormData({ ...opportunityFormData, name: e.target.value })}
                className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                required
                placeholder="e.g., New Client Deal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Description</label>
              <textarea
                value={opportunityFormData.description}
                onChange={(e) => setOpportunityFormData({ ...opportunityFormData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none resize-none"
                placeholder="Describe the opportunity..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Stage *</label>
              <select
                value={opportunityFormData.stage}
                onChange={(e) => setOpportunityFormData({ ...opportunityFormData, stage: e.target.value as any })}
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

            {users.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Assigned To</label>
                <select
                  value={opportunityFormData.assigned_to}
                  onChange={(e) => setOpportunityFormData({ ...opportunityFormData, assigned_to: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                >
                  <option value="">Select User (Optional)</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Expected Close Date</label>
                <input
                  type="date"
                  value={opportunityFormData.expected_close_date}
                  onChange={(e) => setOpportunityFormData({ ...opportunityFormData, expected_close_date: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Value</label>
                <input
                  type="number"
                  value={opportunityFormData.value}
                  onChange={(e) => setOpportunityFormData({ ...opportunityFormData, value: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Currency</label>
                <select
                  value={opportunityFormData.currency}
                  onChange={(e) => setOpportunityFormData({ ...opportunityFormData, currency: e.target.value })}
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
                  value={opportunityFormData.probability}
                  onChange={(e) => setOpportunityFormData({ ...opportunityFormData, probability: e.target.value })}
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
                  value={opportunityFormData.source}
                  onChange={(e) => setOpportunityFormData({ ...opportunityFormData, source: e.target.value })}
                  placeholder="e.g., website, referral, cold_call"
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Campaign</label>
                <input
                  type="text"
                  value={opportunityFormData.campaign}
                  onChange={(e) => setOpportunityFormData({ ...opportunityFormData, campaign: e.target.value })}
                  placeholder="Campaign name"
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowOpportunityModal(false);
                  resetOpportunityForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateOpportunity}
                className="flex-1"
              >
                Create Opportunity
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Customer"
        >
          <div className="space-y-4">
            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Phone *"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <Input
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
            <Input
              label="VAT Number"
              value={formData.vat}
              onChange={(e) => setFormData({ ...formData, vat: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none resize-none"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowEditModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateCustomer}
                className="flex-1"
              >
                Update
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


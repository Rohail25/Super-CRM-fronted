import { useEffect, useState } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../services/api';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  value?: number;
  created_at: string;
  assigned_to?: string;
}

interface FollowUp {
  id: number;
  customer_id: number;
  opportunity_id?: number;
  title: string;
  notes?: string;
  type: 'call' | 'email' | 'meeting' | 'message' | 'other';
  status: 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_at: string;
  completed_at?: string;
  outcome?: string;
  created_by?: { id: number; name: string };
  assignee?: { id: number; name: string };
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    source: 'all',
    search: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    status: 'cold',
    value: '',
    assigned_to: '',
  });
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [followUps, setFollowUps] = useState<Record<number, FollowUp[]>>({});
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [followUpFormData, setFollowUpFormData] = useState({
    title: '',
    notes: '',
    type: 'call' as FollowUp['type'],
    priority: 'medium' as FollowUp['priority'],
    scheduled_at: '',
    outcome: '',
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    fetchLeads();
  }, [filters.status, filters.source]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (filters.status !== 'all') {
        params.status = filters.status;
      }
      
      if (filters.source !== 'all') {
        params.source = filters.source;
      }
      
      if (filters.search) {
        params.search = filters.search;
      }

      const response = await api.get('/leads', { params });
      setLeads(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async () => {
    try {
      // Validate required fields
      if (!formData.name || !formData.email || !formData.phone) {
        alert('Please fill in all required fields (Name, Email, Phone)');
        return;
      }

      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: formData.status,
      };

      if (formData.source) {
        payload.source = formData.source;
      }

      if (formData.value) {
        payload.value = parseFloat(formData.value);
      }

      const response = await api.post('/leads', payload);
      console.log('Lead created successfully:', response.data);
      
      setShowCreateModal(false);
      resetForm();
      await fetchLeads(); // Refresh the list
      
      // Show success message
      alert('Lead created successfully!');
    } catch (error: any) {
      console.error('Failed to create lead:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to create lead. Please try again.';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleUpdateLead = async () => {
    if (!editingLead) return;

    try {
      const payload: any = {};

      if (formData.name !== editingLead.name) {
        payload.name = formData.name;
      }
      if (formData.email !== editingLead.email) {
        payload.email = formData.email;
      }
      if (formData.phone !== editingLead.phone) {
        payload.phone = formData.phone;
      }
      if (formData.status !== editingLead.status) {
        payload.status = formData.status;
      }
      if (formData.source !== editingLead.source) {
        payload.source = formData.source;
      }
      if (formData.value !== String(editingLead.value || '')) {
        payload.value = formData.value ? parseFloat(formData.value) : null;
      }

      await api.put(`/leads/${editingLead.id}`, payload);
      setEditingLead(null);
      resetForm();
      fetchLeads();
    } catch (error) {
      console.error('Failed to update lead:', error);
      alert('Failed to update lead. Please try again.');
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    try {
      await api.delete(`/leads/${leadId}`);
      fetchLeads();
    } catch (error) {
      console.error('Failed to delete lead:', error);
      alert('Failed to delete lead. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      source: '',
      status: 'cold',
      value: '',
      assigned_to: '',
    });
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      value: lead.value ? String(lead.value) : '',
      assigned_to: lead.assigned_to || '',
    });
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      source: 'all',
      search: '',
    });
  };

  const fetchFollowUps = async (leadId: number) => {
    try {
      const response = await api.get(`/customers/${leadId}/follow-ups`);
      setFollowUps(prev => ({ ...prev, [leadId]: response.data }));
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
    }
  };

  const handleCreateFollowUp = async () => {
    if (!selectedLeadId) return;

    try {
      if (!followUpFormData.title || !followUpFormData.scheduled_at) {
        alert('Please fill in title and scheduled date');
        return;
      }

      const payload = {
        title: followUpFormData.title,
        notes: followUpFormData.notes || null,
        type: followUpFormData.type,
        priority: followUpFormData.priority,
        scheduled_at: followUpFormData.scheduled_at,
      };

      await api.post(`/customers/${selectedLeadId}/follow-ups`, payload);
      setShowFollowUpModal(false);
      resetFollowUpForm();
      await fetchFollowUps(selectedLeadId);
      alert('Follow-up scheduled successfully!');
    } catch (error: any) {
      console.error('Failed to create follow-up:', error);
      alert(error.response?.data?.message || 'Failed to create follow-up');
    }
  };

  const handleCompleteFollowUp = async (followUpId: number, leadId: number) => {
    try {
      const outcome = prompt('Enter outcome/notes:');
      if (outcome === null) return; // User cancelled

      await api.post(`/follow-ups/${followUpId}/complete`, { outcome });
      await fetchFollowUps(leadId);
      alert('Follow-up marked as completed!');
    } catch (error: any) {
      console.error('Failed to complete follow-up:', error);
      alert(error.response?.data?.message || 'Failed to complete follow-up');
    }
  };

  const handleDeleteFollowUp = async (followUpId: number, leadId: number) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;

    try {
      await api.delete(`/follow-ups/${followUpId}`);
      await fetchFollowUps(leadId);
    } catch (error: any) {
      console.error('Failed to delete follow-up:', error);
      alert(error.response?.data?.message || 'Failed to delete follow-up');
    }
  };

  const handleStartCall = async (followUp: FollowUp | null, leadId: number) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) {
        alert('Lead not found');
        return;
      }

      if (!lead.phone) {
        alert('No phone number available for this lead');
        return;
      }

      // Create a call record with status "in_progress"
      const callPayload: any = {
        customer_id: leadId, // Lead ID is the customer ID
        contact_name: lead.name,
        contact_phone: lead.phone,
        source: lead.source || 'Direct',
        priority: followUp?.priority || 'medium',
        status: 'in_progress',
        scheduled_at: followUp?.scheduled_at || new Date().toISOString(),
      };

      // Add opportunity_id if available from follow-up
      if (followUp?.opportunity_id) {
        callPayload.opportunity_id = followUp.opportunity_id;
      }

      // Add notes if from follow-up
      if (followUp) {
        callPayload.notes = `Call started from follow-up: ${followUp.title}${followUp.notes ? '\n' + followUp.notes : ''}`;
      } else {
        callPayload.notes = `Call started directly from Leads page`;
      }

      const response = await api.post('/calls', callPayload);
      
      alert(`Call started! Call ID: ${response.data.id}\n\nYou can complete the call from the Calls page.`);
      
      // Optionally navigate to Calls page or refresh follow-ups if called from follow-up modal
      if (followUp && selectedLeadId) {
        await fetchFollowUps(selectedLeadId);
      }
      
    } catch (error: any) {
      console.error('Failed to start call:', error);
      alert(error.response?.data?.message || 'Failed to start call. Please try again.');
    }
  };

  const resetFollowUpForm = () => {
    setFollowUpFormData({
      title: '',
      notes: '',
      type: 'call',
      priority: 'medium',
      scheduled_at: '',
      outcome: '',
    });
    setEditingFollowUp(null);
    setSelectedLeadId(null);
  };

  const openFollowUpModal = (leadId: number) => {
    setSelectedLeadId(leadId);
    setShowFollowUpModal(true);
    fetchFollowUps(leadId);
  };

  const getFollowUpTypeIcon = (type: FollowUp['type']) => {
    const icons = {
      call: '📞',
      email: '📧',
      meeting: '🤝',
      message: '💬',
      other: '📝',
    };
    return icons[type] || '📝';
  };

  const getPriorityColor = (priority: FollowUp['priority']) => {
    const colors = {
      low: 'text-muted',
      medium: 'text-ink',
      high: 'text-warn',
      urgent: 'text-bad',
    };
    return colors[priority] || 'text-ink';
  };

  // Get unique sources from leads for filter dropdown
  const uniqueSources = Array.from(new Set(leads.map(lead => lead.source).filter(Boolean))).sort();

  const getStatusBadge = (status: string) => {
    const styles = {
      hot: 'bg-bad/15 text-bad border-bad/30',
      warm: 'bg-warn/15 text-warn border-warn/30',
      cold: 'bg-muted/15 text-muted border-muted/30',
      converted: 'bg-ok/15 text-ok border-ok/30',
    };
    return styles[status as keyof typeof styles] || styles.cold;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aqua-5"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar
        title="Leads Management"
        subtitle="Manage and track all your leads from different sources"
        actions={
          <>
            <button className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium">
              Export
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
            >
              ➕ New Lead
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="bg-white border border-line rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search leads..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none text-sm"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none text-sm"
          >
            <option value="all">All Status</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
            <option value="converted">Converted</option>
          </select>
          <select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            className="px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none text-sm"
          >
            <option value="all">All Sources</option>
            {uniqueSources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <button 
            onClick={clearFilters}
            className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-aqua-1/30 border-b border-line">
              <tr>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">Lead</th>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">Contact</th>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">Source</th>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">Status</th>
                <th className="text-right text-xs font-bold text-muted uppercase py-3 px-4">Value</th>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">Assigned To</th>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">Created</th>
                <th className="text-right text-xs font-bold text-muted uppercase py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-line/50 hover:bg-aqua-1/10 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-ink">{lead.name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-ink">{lead.email}</div>
                    <div className="text-xs text-muted">{lead.phone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-ink">{lead.source}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusBadge(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {lead.value ? <span className="font-semibold text-ink">€ {lead.value.toLocaleString()}</span> : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted">{lead.assigned_to || 'Unassigned'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted">{new Date(lead.created_at).toLocaleDateString()}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {lead.phone && (
                        <button 
                          onClick={() => handleStartCall(null, lead.id)}
                          className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-blue-600" 
                          title="Start Call Now"
                        >
                          📞
                        </button>
                      )}
                      <button 
                        onClick={() => openFollowUpModal(lead.id)}
                        className="p-1.5 hover:bg-aqua-1 rounded-lg transition-colors" 
                        title="Follow-ups"
                      >
                        📅
                      </button>
                      <button 
                        onClick={() => openEditModal(lead)}
                        className="p-1.5 hover:bg-aqua-1 rounded-lg transition-colors" 
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1.5 hover:bg-aqua-1 rounded-lg transition-colors text-red-500" 
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leads.length === 0 && !loading && (
          <div className="p-8 text-center text-muted">
            No leads found. Create your first lead to get started!
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingLead) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-ink mb-4">
              {editingLead ? 'Edit Lead' : 'Create New Lead'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Source</label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="e.g., OptyShop, Aziende TG Calabria"
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                >
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                  <option value="converted">Converted</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Value (€)</label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingLead(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
              >
                Cancel
              </button>
              <button
                onClick={editingLead ? handleUpdateLead : handleCreateLead}
                className="flex-1 px-4 py-2 bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold"
              >
                {editingLead ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-ups Modal */}
      {showFollowUpModal && selectedLeadId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-ink">Follow-ups</h2>
              <button
                onClick={() => {
                  setShowFollowUpModal(false);
                  resetFollowUpForm();
                }}
                className="text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            {/* Follow-ups List */}
            <div className="mb-6 space-y-3 max-h-64 overflow-y-auto">
              {followUps[selectedLeadId]?.length > 0 ? (
                followUps[selectedLeadId].map((followUp) => (
                  <div
                    key={followUp.id}
                    className={`p-4 border rounded-xl ${
                      followUp.status === 'completed' ? 'bg-green-50 border-green-200' :
                      followUp.status === 'overdue' ? 'bg-red-50 border-red-200' :
                      'bg-white border-line'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getFollowUpTypeIcon(followUp.type)}</span>
                          <span className="font-semibold text-ink">{followUp.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(followUp.priority)} bg-opacity-10`}>
                            {followUp.priority}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            followUp.status === 'completed' ? 'bg-green-100 text-green-800' :
                            followUp.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {followUp.status}
                          </span>
                        </div>
                        {followUp.notes && (
                          <p className="text-sm text-muted mb-2">{followUp.notes}</p>
                        )}
                        <div className="text-xs text-muted">
                          Scheduled: {new Date(followUp.scheduled_at).toLocaleString()}
                          {followUp.completed_at && (
                            <> • Completed: {new Date(followUp.completed_at).toLocaleString()}</>
                          )}
                        </div>
                        {followUp.outcome && (
                          <div className="mt-2 text-sm text-ink bg-gray-50 p-2 rounded">
                            <strong>Outcome:</strong> {followUp.outcome}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {followUp.type === 'call' && followUp.status === 'scheduled' && (
                          <button
                            onClick={() => handleStartCall(followUp, selectedLeadId)}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1"
                            title="Start Call"
                          >
                            📞 Start Call
                          </button>
                        )}
                        {followUp.status !== 'completed' && (
                          <button
                            onClick={() => handleCompleteFollowUp(followUp.id, selectedLeadId)}
                            className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600"
                          >
                            ✓ Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteFollowUp(followUp.id, selectedLeadId)}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted py-8">No follow-ups scheduled</div>
              )}
            </div>

            {/* Create Follow-up Form */}
            <div className="border-t border-line pt-4">
              <h3 className="font-semibold text-ink mb-4">Schedule New Follow-up</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Title *</label>
                  <input
                    type="text"
                    value={followUpFormData.title}
                    onChange={(e) => setFollowUpFormData({ ...followUpFormData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                    placeholder="e.g., Call to discuss pricing"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Type *</label>
                    <select
                      value={followUpFormData.type}
                      onChange={(e) => setFollowUpFormData({ ...followUpFormData, type: e.target.value as FollowUp['type'] })}
                      className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                    >
                      <option value="call">📞 Call</option>
                      <option value="email">📧 Email</option>
                      <option value="meeting">🤝 Meeting</option>
                      <option value="message">💬 Message</option>
                      <option value="other">📝 Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Priority</label>
                    <select
                      value={followUpFormData.priority}
                      onChange={(e) => setFollowUpFormData({ ...followUpFormData, priority: e.target.value as FollowUp['priority'] })}
                      className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={followUpFormData.scheduled_at}
                    onChange={(e) => setFollowUpFormData({ ...followUpFormData, scheduled_at: e.target.value })}
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Notes</label>
                  <textarea
                    value={followUpFormData.notes}
                    onChange={(e) => setFollowUpFormData({ ...followUpFormData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                    rows={3}
                    placeholder="Additional notes about this follow-up..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowFollowUpModal(false);
                      resetFollowUpForm();
                    }}
                    className="flex-1 px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleCreateFollowUp}
                    className="flex-1 px-4 py-2 bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold"
                  >
                    Schedule Follow-up
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

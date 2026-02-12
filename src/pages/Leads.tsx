import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import Modal from '../components/ui/Modal';

interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status: string;
  category?: string;
  file_name?: string;
  file_format?: string;
  file_headers?: string[];
  file_records?: any[][];
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'super_admin';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    source: 'all',
    category: 'all',
    search: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  
  // New state for file upload form
  const [uploadFormData, setUploadFormData] = useState({
    file: null as File | null,
    format: 'csv',
    category: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [whatsAppSending, setWhatsAppSending] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [followUps, setFollowUps] = useState<Record<number, FollowUp[]>>({});
  const [_editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [followUpFormData, setFollowUpFormData] = useState({
    title: '',
    notes: '',
    type: 'call' as FollowUp['type'],
    priority: 'medium' as FollowUp['priority'],
    scheduled_at: '',
    outcome: '',
  });
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    fetchLeads();
  }, [filters.status, filters.source, filters.category]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  const handleExport = async () => {
    try {
      // Build query params from current filters
      const params = new URLSearchParams();
      
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.source !== 'all') {
        params.append('source', filters.source);
      }
      if (filters.category !== 'all') {
        params.append('category', filters.category);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      const queryString = params.toString();
      const url = `/leads/export${queryString ? '?' + queryString : ''}`;

      const response = await api.get(url, {
        responseType: 'blob',
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url_blob = window.URL.createObjectURL(blob);
      link.href = url_blob;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `leads_export_${timestamp}.csv`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url_blob);
    } catch (error: any) {
      console.error('Failed to export leads:', error);
      alert(error.response?.data?.message || 'Failed to export leads. Please try again.');
    }
  };

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

      if (filters.category !== 'all') {
        params.category = filters.category;
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

  const handleFileUpload = async () => {
    try {
      if (!uploadFormData.file) {
        alert(t('leads.selectFile') + ' ' + t('common.required', 'required'));
        return;
      }
      if (!uploadFormData.category) {
        alert(t('leads.selectCategory'));
        return;
      }

      const formData = new FormData();
      formData.append('file', uploadFormData.file);
      formData.append('format', uploadFormData.format);
      formData.append('category', uploadFormData.category);

      const response = await api.post('/leads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Lead file uploaded successfully:', response.data);
      
      setShowCreateModal(false);
      resetUploadForm();
      await fetchLeads(); // Refresh the list
      
      alert(t('leads.uploadSuccess'));
    } catch (error: any) {
      console.error('Failed to upload lead file:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to upload lead file. Please try again.';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!confirm(t('leads.deleteConfirm'))) {
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

  const resetUploadForm = () => {
    setUploadFormData({
      file: null,
      format: 'csv',
      category: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      source: 'all',
      category: 'all',
      search: '',
    });
  };

  const fetchFollowUps = async (leadId: number) => {
    try {
      const response = await api.get(`/leads/${leadId}/follow-ups`);
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

      await api.post(`/leads/${selectedLeadId}/follow-ups`, payload);
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

  const openWhatsAppModal = (leadId: number) => {
    setSelectedLeadId(leadId);
    setWhatsAppMessage('');
    setShowWhatsAppModal(true);
  };

  const handleSendWhatsApp = async () => {
    if (!selectedLeadId || !whatsAppMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead || !lead.phone) {
      alert('Lead not found or missing phone number');
      return;
    }

    try {
      setWhatsAppSending(true);
      await api.post('/communications/whatsapp/send', {
        to: lead.phone,
        message: whatsAppMessage,
      });
      
      alert('WhatsApp message sent successfully!');
      setShowWhatsAppModal(false);
      setWhatsAppMessage('');
    } catch (error: any) {
      console.error('Failed to send WhatsApp message:', error);
      alert(error.response?.data?.message || 'Failed to send WhatsApp message. Please check Twilio configuration.');
    } finally {
      setWhatsAppSending(false);
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
        title={t('leads.title')}
        subtitle={t('leads.title')}
        actions={
          <>
            <button 
              onClick={handleExport}
              className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
            >
              {t('common.export', 'Export')}
            </button>
            {isSuperAdmin && (
            <button 
              onClick={() => navigate('/emails')}
              className="px-4 py-2 text-sm border border-purple-5/35 bg-gradient-to-r from-purple-3/45 to-purple-5/14 rounded-xl hover:shadow-lg hover:shadow-purple-5/10 transition-all text-ink font-semibold"
            >
              📧 Email Bulk
            </button>
            )}
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
            >
              ➕ {t('leads.uploadFile')}
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="bg-white border border-line rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder={t('common.search') + '...'}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none text-sm"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none text-sm"
          >
            <option value="all">{t('common.all')} {t('common.status')}</option>
            <option value="hot">{t('leads.hot')}</option>
            <option value="warm">{t('leads.warm')}</option>
            <option value="cold">{t('leads.cold')}</option>
            <option value="converted">{t('leads.converted')}</option>
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none text-sm"
          >
            <option value="all">{t('common.all')} {t('common.category')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          <button 
            onClick={clearFilters}
            className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
          >
            {t('common.clearFilters', 'Clear Filters')}
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-aqua-1/30 border-b border-line">
              <tr>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">{t('leads.fileName')}</th>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">{t('leads.fileFormatLabel')}</th>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">{t('common.category')}</th>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">{t('leads.fileRecords')}</th>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">{t('common.status')}</th>
                <th className="text-left text-xs font-bold text-muted uppercase py-3 px-4">{t('leads.createdAt')}</th>
                <th className="text-right text-xs font-bold text-muted uppercase py-3 px-4">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-line/50 hover:bg-aqua-1/10 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-ink">{lead.file_name || lead.name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 bg-aqua-1/30 text-ink rounded font-medium">
                      {lead.file_format?.toUpperCase() || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-ink">{lead.category || '-'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-ink font-medium">
                      {lead.file_records?.length || 0} rows
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusBadge(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted">{new Date(lead.created_at).toLocaleDateString()}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {lead.phone && (
                        <>
                          <button 
                            onClick={() => handleStartCall(null, lead.id)}
                            className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-blue-600" 
                            title="Start Call Now"
                          >
                            📞
                          </button>
                          <button 
                            onClick={() => openWhatsAppModal(lead.id)}
                            className="p-1.5 hover:bg-green-100 rounded-lg transition-colors text-green-600" 
                            title="Send WhatsApp"
                          >
                            💬
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => {
                          setViewingLead(lead);
                          setShowViewModal(true);
                        }}
                        className="p-1.5 hover:bg-aqua-1 rounded-lg transition-colors" 
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button 
                        onClick={() => openFollowUpModal(lead.id)}
                        className="p-1.5 hover:bg-aqua-1 rounded-lg transition-colors" 
                        title="Follow-ups"
                      >
                        📅
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
            {t('leads.noLeadsFound')}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {(showCreateModal) && (
        <Modal
          isOpen={true}
          title={t('leads.fileUpload')}
          onClose={() => {
            setShowCreateModal(false);
            resetUploadForm();
          }}
        >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">{t('leads.fileFormat')} *</label>
                <select
                  value={uploadFormData.format}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, format: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                >
                  <option value="csv">{t('leads.csv')}</option>
                  <option value="excel">{t('leads.excel')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">{t('common.category')} *</label>
                <select
                  value={uploadFormData.category}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                >
                  <option value="">{t('leads.selectCategory')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">{t('leads.selectFile')} *</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        setUploadFormData({ ...uploadFormData, file: e.target.files[0] });
                    }
                  }}
                  className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                />
                <p className="text-xs text-muted mt-1">
                    {t('leads.fileUploadHint', 'First row must be headers. Supported formats: CSV, Excel (.xlsx, .xls)')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetUploadForm();
                }}
                className="flex-1 px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleFileUpload}
                disabled={!uploadFormData.file || !uploadFormData.category}
                className="flex-1 px-4 py-2 bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('leads.upload')}
              </button>
            </div>
        </Modal>
      )}

      {/* View Lead Details Modal */}
      {showViewModal && viewingLead && (
        <Modal
          isOpen={true}
          title={`Lead Details: ${viewingLead.file_name || viewingLead.name}`}
          onClose={() => {
            setShowViewModal(false);
            setViewingLead(null);
          }}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Category</label>
                <p className="text-sm text-ink">{viewingLead.category || '-'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Status</label>
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusBadge(viewingLead.status)}`}>
                  {viewingLead.status}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">File Format</label>
                <p className="text-sm text-ink">{viewingLead.file_format?.toUpperCase() || '-'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Records Count</label>
                <p className="text-sm text-ink">{viewingLead.file_records?.length || 0} rows</p>
              </div>
            </div>

            {viewingLead.file_headers && viewingLead.file_headers.length > 0 && (
              <div>
                <h3 className="font-semibold text-ink mb-2">Headers</h3>
                <div className="bg-aqua-1/30 p-3 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {viewingLead.file_headers.map((header, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-white border border-line rounded text-ink">
                        {header}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {viewingLead.file_records && viewingLead.file_records.length > 0 && (
              <div>
                <h3 className="font-semibold text-ink mb-2">Records ({viewingLead.file_records.length} rows)</h3>
                <div className="overflow-x-auto border border-line rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-aqua-1/30 border-b border-line">
                      <tr>
                        {viewingLead.file_headers?.map((header, idx) => (
                          <th key={idx} className="text-left text-xs font-bold text-muted uppercase py-2 px-3">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viewingLead.file_records.slice(0, 100).map((record, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-line/50 hover:bg-aqua-1/10">
                          {record.map((cell, cellIdx) => (
                            <td key={cellIdx} className="py-2 px-3 text-ink">
                              {cell || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {viewingLead.file_records.length > 100 && (
                    <div className="p-3 text-center text-xs text-muted bg-aqua-1/10">
                      Showing first 100 of {viewingLead.file_records.length} records
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && selectedLeadId && (
        <Modal
          isOpen={true}
          title="Send WhatsApp Message"
          onClose={() => {
            setShowWhatsAppModal(false);
            setWhatsAppMessage('');
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Message</label>
              <textarea
                value={whatsAppMessage}
                onChange={(e) => setWhatsAppMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-line rounded-xl focus:border-aqua-5 focus:ring-2 focus:ring-aqua-5/20 outline-none"
                placeholder="Type your message here..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWhatsAppModal(false);
                  setWhatsAppMessage('');
                }}
                className="flex-1 px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSendWhatsApp}
                disabled={whatsAppSending || !whatsAppMessage.trim()}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {whatsAppSending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Follow-ups Modal */}
      {showFollowUpModal && selectedLeadId && (
        <Modal
          isOpen={true}
          title="Follow-ups"
          onClose={() => {
            setShowFollowUpModal(false);
            resetFollowUpForm();
          }}
        >
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
        </Modal>
      )}
    </div>
  );
}

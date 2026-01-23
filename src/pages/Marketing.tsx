import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Topbar from '../components/layout/Topbar';
import { useAuthStore } from '../stores/authStore';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Project {
  id: number;
  name: string;
}

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  image_path: string | null;
  target_link: string | null;
  type: 'BANNER_TOP' | 'BANNER_SIDE' | 'INLINE' | 'FOOTER' | 'SLIDER' | 'TICKER' | 'POPUP' | 'STICKY';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  spent: number;
  currency: string;
  payment_status: 'unpaid' | 'pending' | 'paid' | 'failed' | null;
  target_audience: string[] | null;
  target_criteria: string[] | null;
  settings: any;
  content_data: any;
  track_clicks: boolean;
  track_opens: boolean;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  open_rate: number | null;
  click_rate: number | null;
  conversion_rate: number | null;
  roi: number | null;
  creator: User | null;
  project: Project | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  data: Campaign[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  total_budget: number;
  total_spent: number;
  avg_open_rate: number | null;
  avg_click_rate: number | null;
  avg_conversion_rate: number | null;
}

interface Project {
  id: number;
  name: string;
}

export default function Marketing() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'super_admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null as File | null,
    imagePreview: null as string | null,
    type: 'BANNER_TOP' as 'BANNER_TOP' | 'BANNER_SIDE' | 'INLINE' | 'FOOTER' | 'SLIDER' | 'TICKER' | 'POPUP' | 'STICKY',
    project_id: null as number | null,
    start_date: '',
    end_date: '',
    budget: '',
    currency: 'EUR',
    target_link: '',
    target_audience: [] as string[],
    target_criteria: [] as string[],
    track_clicks: true,
    track_opens: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: '',
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  useEffect(() => {
    fetchCampaigns();
    fetchStats();
    fetchProjects();
  }, [filters, pagination.current_page]);

  // Handle payment success callback
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const campaignId = searchParams.get('campaign_id');

    if (sessionId && campaignId) {
      handlePaymentSuccess(sessionId, parseInt(campaignId));
      // Remove params from URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handlePaymentSuccess = async (sessionId: string, campaignId: number) => {
    try {
      const response = await api.post('/campaigns/payment/success', {
        session_id: sessionId,
        campaign_id: campaignId,
      });

      if (response.data.message) {
        setPaymentSuccess(response.data.message);
        // Refresh campaigns to show updated payment status
        fetchCampaigns();
        // Clear success message after 5 seconds
        setTimeout(() => setPaymentSuccess(null), 5000);
      }
    } catch (error: any) {
      console.error('Failed to process payment success:', error);
      alert(error.response?.data?.message || 'Failed to process payment. Please contact support.');
    }
  };

  useEffect(() => {
    if (showModal && editingCampaign) {
      // Populate form with existing campaign data
      setFormData({
        name: editingCampaign.name || '',
        description: editingCampaign.description || '',
        image: null,
        imagePreview: editingCampaign.image_path ? `${api.defaults.baseURL?.replace('/api', '') || ''}/storage/${editingCampaign.image_path}` : null,
        type: editingCampaign.type || 'BANNER_TOP',
        project_id: editingCampaign.project?.id || null,
        start_date: editingCampaign.start_date ? new Date(editingCampaign.start_date).toISOString().slice(0, 16) : '',
        end_date: editingCampaign.end_date ? new Date(editingCampaign.end_date).toISOString().slice(0, 16) : '',
        budget: editingCampaign.budget?.toString() || '',
        currency: editingCampaign.currency || 'EUR',
        target_link: editingCampaign.target_link || (editingCampaign.settings as any)?.target_link || (editingCampaign.content_data as any)?.target_link || '',
        target_audience: Array.isArray(editingCampaign.target_audience) ? editingCampaign.target_audience : [],
        target_criteria: Array.isArray(editingCampaign.target_criteria) ? editingCampaign.target_criteria : [],
        track_clicks: editingCampaign.track_clicks ?? true,
        track_opens: editingCampaign.track_opens ?? true,
      });
    } else if (showModal && !editingCampaign) {
      // Reset form for new campaign
      setFormData({
        name: '',
        description: '',
        image: null,
        imagePreview: null,
        type: 'BANNER_TOP',
        project_id: null,
        start_date: '',
        end_date: '',
        budget: '',
        currency: 'EUR',
        target_link: '',
        target_audience: [],
        target_criteria: [],
        track_clicks: true,
        track_opens: true,
      });
    }
  }, [showModal, editingCampaign]);

  const fetchProjects = async () => {
    try {
      const response = await api.get<Project[]>('/projects');
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
    }
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      };

      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      if (filters.type !== 'all') {
        params.type = filters.type;
      }

      if (filters.search) {
        params.search = filters.search;
      }

      const response = await api.get<PaginatedResponse>('/campaigns', { params });
      setCampaigns(response.data.data || []);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        per_page: response.data.per_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get<CampaignStats>('/campaigns/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch campaign stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.description) formDataToSend.append('description', formData.description);
      if (formData.image) formDataToSend.append('image', formData.image);
      formDataToSend.append('type', formData.type);
      if (formData.project_id) formDataToSend.append('project_id', formData.project_id.toString());
      if (formData.start_date) formDataToSend.append('start_date', formData.start_date);
      if (formData.end_date) formDataToSend.append('end_date', formData.end_date);
      if (formData.budget) formDataToSend.append('budget', formData.budget);
      formDataToSend.append('currency', formData.currency);
      // Always send target_link, even if empty
      formDataToSend.append('target_link', formData.target_link || '');
      formDataToSend.append('track_clicks', formData.track_clicks.toString());
      formDataToSend.append('track_opens', formData.track_opens.toString());
      
      // Always send target_audience and target_criteria, even if empty
      formDataToSend.append('target_audience', JSON.stringify(formData.target_audience || []));
      formDataToSend.append('target_criteria', JSON.stringify(formData.target_criteria || []));

      if (editingCampaign) {
        // Update existing campaign
        await api.put(`/campaigns/${editingCampaign.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Create new campaign (status will be set to 'draft' by backend)
        await api.post('/campaigns', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setShowModal(false);
      setEditingCampaign(null);
      fetchCampaigns();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to save campaign:', error);
      setFormError(error.response?.data?.message || 'Failed to save campaign. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (campaignId: number, newStatus: string) => {
    if (!confirm(`Are you sure you want to change the status to ${newStatus}?`)) {
      return;
    }

    try {
      await api.put(`/campaigns/${campaignId}`, { status: newStatus });
      fetchCampaigns();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to update campaign status:', error);
      alert(error.response?.data?.message || 'Failed to update campaign status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    try {
      await api.delete(`/campaigns/${id}`);
      fetchCampaigns();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  const handleActivate = async (campaign: Campaign) => {
    if (!confirm('Are you sure you want to activate this campaign? This will create an ad in the external system.')) {
      return;
    }

    try {
      const response = await api.post(`/campaigns/${campaign.id}/activate`);
      alert(response.data.message || 'Campaign activated successfully');
      fetchCampaigns();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to activate campaign:', error);
      alert(error.response?.data?.message || 'Failed to activate campaign');
    }
  };

  const handlePayment = async (campaign: Campaign) => {
    if (!campaign.budget || campaign.budget <= 0) {
      alert('Campaign must have a valid budget to proceed with payment');
      return;
    }

    if (campaign.payment_status === 'paid') {
      alert('This campaign has already been paid');
      return;
    }

    try {
      console.log('Creating payment checkout for campaign:', campaign.id, 'Budget:', campaign.budget);
      const response = await api.post(`/campaigns/${campaign.id}/payment/checkout`);
      console.log('Payment checkout response:', response.data);
      
      const { checkout_url, session_id } = response.data;

      // Validate checkout URL
      if (!checkout_url) {
        console.error('No checkout URL received from server');
        alert('Failed to create payment session. Please try again.');
        return;
      }

      // Verify URL is valid
      if (!checkout_url.startsWith('https://checkout.stripe.com')) {
        console.error('Invalid checkout URL format:', checkout_url);
        alert('Invalid payment URL. Please contact support.');
        return;
      }

      console.log('Redirecting to Stripe checkout:', checkout_url);
      // Redirect to Stripe Checkout using the checkout URL
      window.location.href = checkout_url;
    } catch (error: any) {
      console.error('Failed to create payment checkout:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to initiate payment. Please try again.';
      alert(errorMessage);
    }
  };

  const getPaymentStatusBadge = (status: string | null) => {
    const styles = {
      paid: 'bg-ok/15 text-ok border-ok/30',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      unpaid: 'bg-gray-100 text-gray-800 border-gray-300',
      failed: 'bg-bad/15 text-bad border-bad/30',
    };
    return styles[status as keyof typeof styles] || styles.unpaid;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-muted/15 text-muted border-muted/30',
      scheduled: 'bg-aqua-1/30 text-aqua-5 border-aqua-5/30',
      active: 'bg-ok/15 text-ok border-ok/30',
      paused: 'bg-warn/15 text-warn border-warn/30',
      completed: 'bg-ok/15 text-ok border-ok/30',
      cancelled: 'bg-bad/15 text-bad border-bad/30',
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  const getTypeBadge = (type: string) => {
    const typeNames = {
      BANNER_TOP: 'Banner Top',
      BANNER_SIDE: 'Banner Side',
      INLINE: 'Inline',
      FOOTER: 'Footer',
      SLIDER: 'Slider',
      TICKER: 'Ticker',
      POPUP: 'Popup',
      STICKY: 'Sticky',
    };
    return typeNames[type as keyof typeof typeNames] || type;
  };

  const formatCurrency = (amount: number | null, currency: string = 'EUR') => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    return `${Number(value).toFixed(1)}%`;
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aqua-5"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar
        title="Marketing"
        subtitle="Campaigns, email marketing, and analytics"
        actions={
          <>
            <button
              onClick={fetchStats}
              className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
            >
              Analytics
            </button>
            <button
              onClick={() => {
                setEditingCampaign(null);
                setShowModal(true);
              }}
              className="px-4 py-2 text-sm border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
            >
              ➕ New Campaign
            </button>
          </>
        }
      />

      {/* Payment Success Message */}
      {paymentSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-green-800 font-medium">{paymentSuccess}</p>
            <button
              onClick={() => setPaymentSuccess(null)}
              className="text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Total Campaigns</h3>
            <div className="text-3xl font-extrabold text-ink">{stats.total_campaigns}</div>
            <div className="text-sm text-muted mt-1">{stats.active_campaigns} active</div>
          </div>

          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Total Sent</h3>
            <div className="text-3xl font-extrabold text-ink">{stats.total_sent.toLocaleString()}</div>
            <div className="text-sm text-muted mt-1">{formatPercentage(stats.avg_open_rate)} avg open rate</div>
          </div>

          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Total Clicks</h3>
            <div className="text-3xl font-extrabold text-ink">{stats.total_clicked.toLocaleString()}</div>
            <div className="text-sm text-muted mt-1">{formatPercentage(stats.avg_click_rate)} avg click rate</div>
          </div>

          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Total Budget</h3>
            <div className="text-3xl font-extrabold text-ink">{formatCurrency(stats.total_budget)}</div>
            <div className="text-sm text-muted mt-1">{formatCurrency(stats.total_spent)} spent</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-line rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search campaigns..."
              className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
            >
              <option value="all">All Types</option>
              <option value="BANNER_TOP">Banner Top</option>
              <option value="BANNER_SIDE">Banner Side</option>
              <option value="INLINE">Inline</option>
              <option value="FOOTER">Footer</option>
              <option value="SLIDER">Slider</option>
              <option value="TICKER">Ticker</option>
              <option value="POPUP">Popup</option>
              <option value="STICKY">Sticky</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ status: 'all', type: 'all', search: '' });
                setPagination({ ...pagination, current_page: 1 });
              }}
              className="w-full px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-aqua-1/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Performance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No campaigns found. Create your first campaign to get started.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t border-line hover:bg-aqua-1/10 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-ink">{campaign.name}</div>
                        {campaign.description && (
                          <div className="text-xs text-muted mt-1 line-clamp-1">{campaign.description}</div>
                        )}
                        {campaign.project && (
                          <div className="text-xs text-muted mt-1">Project: {campaign.project.name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-aqua-1/30 text-aqua-5 border border-aqua-5/30">
                        {getTypeBadge(campaign.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs border ${getStatusBadge(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-ink">
                        {formatCurrency(campaign.budget, campaign.currency)}
                      </div>
                      {campaign.spent > 0 && (
                        <div className="text-xs text-muted">Spent: {formatCurrency(campaign.spent, campaign.currency)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs space-y-1">
                        {campaign.payment_status && (
                          <span className={`px-2 py-1 rounded-full border ${getPaymentStatusBadge(campaign.payment_status)}`}>
                            {campaign.payment_status}
                          </span>
                        )}
                       
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs space-y-1">
                        <div>Sent: {campaign.sent_count.toLocaleString()}</div>
                        <div>Opens: {formatPercentage(campaign.open_rate)}</div>
                        <div>Clicks: {formatPercentage(campaign.click_rate)}</div>
                        {campaign.converted_count > 0 && (
                          <div>Conversions: {campaign.converted_count} ({formatPercentage(campaign.conversion_rate)})</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {isSuperAdmin && (
                            <select
                              value={campaign.status}
                              onChange={(e) => handleStatusChange(campaign.id, e.target.value)}
                              className="text-xs border border-line rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                            >
                              <option value="draft">Draft</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="active">Active</option>
                              <option value="paused">Paused</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          )}
                          {(isSuperAdmin || campaign.creator?.id === user?.id) && (
                            <button
                              onClick={() => {
                                setEditingCampaign(campaign);
                                setShowModal(true);
                              }}
                              className="text-xs text-aqua-5 hover:text-aqua-4 font-medium"
                            >
                              Edit
                            </button>
                          )}
                          {(isSuperAdmin || campaign.creator?.id === user?.id) && (
                            <button
                              onClick={() => handleDelete(campaign.id)}
                              className="text-xs text-bad hover:text-bad/80 font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        {campaign.budget && campaign.budget > 0 && campaign.payment_status !== 'paid' && (
                          <button
                            onClick={() => handlePayment(campaign)}
                            className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                          >
                            Pay
                          </button>
                        )}
                        {isSuperAdmin && campaign.payment_status === 'paid' && (
                          <button
                            onClick={() => handleActivate(campaign)}
                            disabled={!campaign.target_link}
                            className={`text-xs px-2 py-1 rounded font-medium ${
                              campaign.target_link
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            title={!campaign.target_link ? 'Please add a target link to activate this campaign' : 'Activate campaign'}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="px-4 py-3 border-t border-line flex items-center justify-between">
            <div className="text-sm text-muted">
              Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
              {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} campaigns
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, current_page: pagination.current_page - 1 })}
                disabled={pagination.current_page === 1}
                className="px-3 py-1 text-sm border border-line rounded-lg hover:bg-aqua-1/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, current_page: pagination.current_page + 1 })}
                disabled={pagination.current_page === pagination.last_page}
                className="px-3 py-1 text-sm border border-line rounded-lg hover:bg-aqua-1/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-ink">
                {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCampaign(null);
                  setFormError('');
                }}
                className="text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            {!editingCampaign && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> New campaigns will be created with "Draft" status and require admin approval.
                </p>
              </div>
            )}

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Campaign Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-ink mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    required
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  >
                    <option value="BANNER_TOP">Banner Top</option>
                    <option value="BANNER_SIDE">Banner Side</option>
                    <option value="INLINE">Inline</option>
                    <option value="FOOTER">Footer</option>
                    <option value="SLIDER">Slider</option>
                    <option value="TICKER">Ticker</option>
                    <option value="POPUP">Popup</option>
                    <option value="STICKY">Sticky</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Image <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, image: file, imagePreview: URL.createObjectURL(file) });
                      }
                    }}
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                  {formData.imagePreview && (
                    <div className="mt-2">
                      <img src={formData.imagePreview} alt="Preview" className="max-w-xs max-h-48 rounded-lg border border-line" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Project</label>
                  <select
                    value={formData.project_id || ''}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  >
                    <option value="">No Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Start Date</label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">End Date</label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Budget</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                    />
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Target Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.target_link}
                    onChange={(e) => setFormData({ ...formData, target_link: e.target.value })}
                    placeholder="https://example.com"
                    required
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                  <p className="text-xs text-muted mt-1">The URL where users will be redirected when clicking the ad</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-ink mb-2">Target Audience</label>
                  <div className="space-y-2">
                    {['All Users', 'New Customers', 'Existing Customers', 'VIP Customers', 'Inactive Customers'].map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.target_audience.includes(option)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, target_audience: [...formData.target_audience, option] });
                            } else {
                              setFormData({ ...formData, target_audience: formData.target_audience.filter(a => a !== option) });
                            }
                          }}
                          className="w-4 h-4 text-aqua-5 border-line rounded focus:ring-aqua-5/20"
                        />
                        <span className="text-sm text-ink">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-ink mb-2">Target Criteria</label>
                  <div className="space-y-2">
                    {['Age 18-25', 'Age 26-35', 'Age 36-45', 'Age 46+', 'Location: Italy', 'Location: Europe', 'Location: Global'].map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.target_criteria.includes(option)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, target_criteria: [...formData.target_criteria, option] });
                            } else {
                              setFormData({ ...formData, target_criteria: formData.target_criteria.filter(c => c !== option) });
                            }
                          }}
                          className="w-4 h-4 text-aqua-5 border-line rounded focus:ring-aqua-5/20"
                        />
                        <span className="text-sm text-ink">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.track_clicks}
                      onChange={(e) => setFormData({ ...formData, track_clicks: e.target.checked })}
                      className="w-4 h-4 text-aqua-5 border-line rounded focus:ring-aqua-5/20"
                    />
                    <span className="text-sm text-ink">Track Clicks</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.track_opens}
                      onChange={(e) => setFormData({ ...formData, track_opens: e.target.checked })}
                      className="w-4 h-4 text-aqua-5 border-line rounded focus:ring-aqua-5/20"
                    />
                    <span className="text-sm text-ink">Track Opens</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCampaign(null);
                    setFormError('');
                  }}
                  className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-sm bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

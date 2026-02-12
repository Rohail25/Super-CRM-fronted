import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Topbar from '../components/layout/Topbar';
import { useAuthStore } from '../stores/authStore';
import MediaLibrary from '../components/media/MediaLibrary';

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
  status: 'pending' | 'active' | 'paused' | 'expired' | 'rejected';
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
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [_projects, setProjects] = useState<Project[]>([]);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    displayName: '',
    description: '',
    imageUrl: '',
    image: null as File | null,
    type: 'BANNER_TOP' as 'BANNER_TOP' | 'BANNER_SIDE' | 'INLINE' | 'FOOTER' | 'SLIDER' | 'TICKER' | 'POPUP' | 'STICKY',
    project_id: null as number | null,
    startDate: '',
    endDate: '',
    price: '',
    position: '',
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
      const imageUrl = editingCampaign.image_path 
        ? (editingCampaign.image_path.startsWith('http') 
            ? editingCampaign.image_path 
            : `${api.defaults.baseURL?.replace('/api', '') || ''}/storage/${editingCampaign.image_path}`)
        : '';
      
      setFormData({
        title: editingCampaign.name || '',
        displayName: (editingCampaign.settings as any)?.displayName || '',
        description: editingCampaign.description || '',
        imageUrl: imageUrl,
        image: null,
        type: editingCampaign.type || 'BANNER_TOP',
        project_id: editingCampaign.project?.id || null,
        startDate: editingCampaign.start_date ? new Date(editingCampaign.start_date).toISOString().slice(0, 16) : '',
        endDate: editingCampaign.end_date ? new Date(editingCampaign.end_date).toISOString().slice(0, 16) : '',
        price: editingCampaign.budget?.toString() || '',
        position: (editingCampaign.settings as any)?.position || '',
        target_link: editingCampaign.target_link || (editingCampaign.settings as any)?.target_link || (editingCampaign.content_data as any)?.target_link || '',
        target_audience: Array.isArray(editingCampaign.target_audience) ? editingCampaign.target_audience : [],
        target_criteria: Array.isArray(editingCampaign.target_criteria) ? editingCampaign.target_criteria : [],
        track_clicks: editingCampaign.track_clicks ?? true,
        track_opens: editingCampaign.track_opens ?? true,
      });
    } else if (showModal && !editingCampaign) {
      // Reset form for new campaign
      setFormData({
        title: '',
        displayName: '',
        description: '',
        imageUrl: '',
        image: null,
        type: 'BANNER_TOP',
        project_id: null,
        startDate: '',
        endDate: '',
        price: '',
        position: '',
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
      // Convert datetime-local to ISO format
      const startDateISO = formData.startDate 
        ? new Date(formData.startDate).toISOString() 
        : '';
      const endDateISO = formData.endDate 
        ? new Date(formData.endDate).toISOString() 
        : '';

      // Prepare payload according to the new structure
      const payload: any = {
        title: formData.title,
        type: formData.type,
        startDate: startDateISO,
        endDate: endDateISO,
      };

      // Optional fields
      if (formData.imageUrl) payload.imageUrl = formData.imageUrl;
      if (formData.displayName) payload.displayName = formData.displayName;
      if (formData.target_link) payload.targetLink = formData.target_link;
      if (formData.price) payload.price = parseInt(formData.price);
      if (formData.position) payload.position = formData.position;
      if (formData.description) payload.description = formData.description;

      // If image file is uploaded, use FormData, otherwise use JSON
      if (formData.image) {
        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title);
        if (formData.displayName) formDataToSend.append('displayName', formData.displayName);
        if (formData.description) formDataToSend.append('description', formData.description);
        formDataToSend.append('image', formData.image);
        formDataToSend.append('imageUrl', formData.imageUrl || '');
        formDataToSend.append('type', formData.type);
        formDataToSend.append('startDate', startDateISO);
        formDataToSend.append('endDate', endDateISO);
        if (formData.price) formDataToSend.append('price', formData.price);
        if (formData.position) formDataToSend.append('position', formData.position);
        if (formData.target_link) formDataToSend.append('targetLink', formData.target_link);
        formDataToSend.append('track_clicks', formData.track_clicks.toString());
        formDataToSend.append('track_opens', formData.track_opens.toString());
        formDataToSend.append('target_audience', JSON.stringify(formData.target_audience || []));
        formDataToSend.append('target_criteria', JSON.stringify(formData.target_criteria || []));

        if (editingCampaign) {
          await api.put(`/campaigns/${editingCampaign.id}`, formDataToSend, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await api.post('/campaigns', formDataToSend, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      } else {
        // Send as JSON when no file upload
        if (editingCampaign) {
          await api.put(`/campaigns/${editingCampaign.id}`, payload);
        } else {
          await api.post('/campaigns', payload);
        }
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
      // Get the full campaign data to send complete payload
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Prepare payload with all campaign data
      const payload: any = {
        status: newStatus,
        name: campaign.name,
        type: campaign.type,
      };

      if (campaign.description) payload.description = campaign.description;
      if (campaign.target_link) payload.target_link = campaign.target_link;
      if (campaign.start_date) payload.start_date = campaign.start_date;
      if (campaign.end_date) payload.end_date = campaign.end_date;
      if (campaign.budget) payload.budget = campaign.budget;
      if (campaign.currency) payload.currency = campaign.currency;
      
      // Include settings if they exist
      if (campaign.settings) {
        payload.settings = campaign.settings;
      }

      await api.put(`/campaigns/${campaignId}`, payload);
      fetchCampaigns();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to update campaign status:', error);
      alert(error.response?.data?.message || 'Failed to update campaign status');
    }
  };

  const handleResume = async (campaign: Campaign) => {
    if (!confirm('Are you sure you want to resume this campaign?')) {
      return;
    }

    try {
      // Get the full campaign data to send complete payload (same as handleStatusChange)
      const payload: any = {
        status: 'active',
        name: campaign.name,
        type: campaign.type,
      };

      if (campaign.description) payload.description = campaign.description;
      if (campaign.target_link) payload.target_link = campaign.target_link;
      if (campaign.start_date) payload.start_date = campaign.start_date;
      if (campaign.end_date) payload.end_date = campaign.end_date;
      if (campaign.budget) payload.budget = campaign.budget;
      if (campaign.currency) payload.currency = campaign.currency;
      
      // Include settings if they exist
      if (campaign.settings) {
        payload.settings = campaign.settings;
      }

      await api.put(`/campaigns/${campaign.id}`, payload);
      fetchCampaigns();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to resume campaign:', error);
      alert(error.response?.data?.message || 'Failed to resume campaign');
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
    const isAlreadyActive = campaign.status === 'active';
    const confirmMessage = isAlreadyActive
      ? 'Are you sure you want to re-activate this campaign? This will register/update the ad in the tg-calabria site.'
      : 'Are you sure you want to activate this campaign? This will create an ad in the tg-calabria site.';
    
    if (!confirm(confirmMessage)) {
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
      
      const { checkout_url } = response.data;

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
      pending: 'bg-aqua-1/30 text-aqua-5 border-aqua-5/30',
      active: 'bg-ok/15 text-ok border-ok/30',
      paused: 'bg-warn/15 text-warn border-warn/30',
      expired: 'bg-muted/15 text-muted border-muted/30',
      rejected: 'bg-bad/15 text-bad border-bad/30',
    };
    return styles[status as keyof typeof styles] || styles.pending;
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
            {/* <button
              onClick={fetchStats}
              className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
            >
              Analytics
            </button> */}
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
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="expired">Expired</option>
              <option value="rejected">Rejected</option>
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
                              <option value="pending">Pending</option>
                              <option value="active">Active</option>
                              <option value="paused">Paused</option>
                              <option value="expired">Expired</option>
                              <option value="rejected">Rejected</option>
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
                          <>
                            {campaign.status === 'pending' && (
                              <button
                                onClick={() => handleActivate(campaign)}
                                className="text-xs px-2 py-1 rounded font-medium bg-blue-500 text-white hover:bg-blue-600"
                                title="Activate campaign and create ad in tg-calabria"
                              >
                                Activate
                              </button>
                            )}
                            {campaign.status === 'active' && (
                              <button
                                onClick={() => handleActivate(campaign)}
                                disabled={!campaign.target_link}
                                className={`text-xs px-2 py-1 rounded font-medium ${
                                  campaign.target_link
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                                title={!campaign.target_link ? 'Please add a target link to activate this campaign' : 'Re-activate campaign in tg-calabria site'}
                              >
                                Re-Activate
                              </button>
                            )}
                            {campaign.status === 'paused' && (
                              <button
                                onClick={() => handleResume(campaign)}
                                disabled={!campaign.target_link}
                                className={`text-xs px-2 py-1 rounded font-medium ${
                                  campaign.target_link
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                                title={!campaign.target_link ? 'Please add a target link to resume this campaign' : 'Resume campaign'}
                              >
                                Resume
                              </button>
                            )}
                            {campaign.status === 'rejected' && (
                              <button
                                disabled={true}
                                className="text-xs px-2 py-1 rounded font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
                                title="Campaign is rejected"
                              >
                                Rejected
                              </button>
                            )}
                            {campaign.status === 'expired' && (
                              <button
                                disabled={true}
                                className="text-xs px-2 py-1 rounded font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
                                title="Campaign is expired"
                              >
                                Expired
                              </button>
                            )}
                          </>
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
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Advertisement title"
                    required
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="E.g.: Christmas Promotion Ticker"
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                  <p className="text-xs text-muted mt-1">
                    Useful for easily identifying ticker ads in the list
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Type * (Ad Type)
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
                  <p className="text-xs text-muted mt-1">
                    Ad type defines the size and behavior (e.g., Banner Top: 728x90px, Slider: 1920x600px, Slider Top: for homepage hero section)
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Image/Video URL <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      required
                      className="flex-1 px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMediaLibrary(true)}
                      className="px-4 py-2 border border-line rounded-xl text-sm hover:bg-gray-50 transition-colors"
                    >
                      Media Library
                    </button>
                  </div>
                  {formData.imageUrl && (
                    <div className="mt-2">
                      {formData.imageUrl.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? (
                        <video
                          src={formData.imageUrl}
                          className="max-w-xs max-h-48 rounded-lg border border-line object-cover"
                          controls
                          muted
                          playsInline
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <img 
                          src={formData.imageUrl} 
                          alt="Preview" 
                          className="max-w-xs max-h-48 rounded-lg border border-line object-cover" 
                          loading="lazy"
                          onError={(e) => {
                            // Hide broken images
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                          onLoad={(e) => {
                            // Show image when loaded successfully
                            (e.target as HTMLImageElement).style.display = 'block';
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Project</label>
                  <select
                    value={formData.project_id || ''}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  >
                    <option value="">No Project</option>
                    {_projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div> */}

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Target Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.target_link}
                    onChange={(e) => setFormData({ ...formData, target_link: e.target.value })}
                    placeholder="https://example.com (optional)"
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                  <p className="text-xs text-muted mt-1">
                    Optional: If not specified, the ad will not be clickable
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Price (€) (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">€</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0"
                      className="flex-1 px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                    />
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Optional: whole euros only (e.g. 400). If not set, price is calculated from type and duration.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Position (Optional)
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  >
                    <option value="">None (Auto)</option>
                    <option value="HEADER">Header</option>
                    <option value="HEADER_LEADERBOARD">Sidebar</option>
                    <option value="SIDEBAR">Sidebar Rectangle</option>
                    <option value="SIDEBAR_RECT">Inline Article (inside news article)</option>
                    <option value="INLINE_ARTICLE">Mid Page (homepage, one slot)</option>
                    <option value="MID_PAGE">Between Sections 1 (homepage)</option>
                    <option value="BETWEEN_SECTIONS_1">Between Sections 2 (homepage)</option>
                    <option value="BETWEEN_SECTIONS_2">Between Sections 3 (homepage)</option>
                    <option value="BETWEEN_SECTIONS_3">Footer</option>
                    <option value="FOOTER">Mobile</option>
                    <option value="MOBILE">Mobile</option>
                  </select>
                  <p className="text-xs text-muted mt-1">
                    Optional: Specify a position to book a specific slot. If not specified, ad will be auto-assigned based on type.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-5/20"
                  />
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

      {/* Media Library Modal */}
      <MediaLibrary
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={(url) => {
          setFormData({ ...formData, imageUrl: url });
        }}
      />
    </div>
  );
}

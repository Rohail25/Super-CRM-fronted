import { useEffect, useState, useRef } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../services/api';

interface CallStats {
  calls_to_do: number;
  callbacks: number;
  calls_done: number;
  conversion_rate: string;
}

interface CallToday {
  id: number;
  time: string;
  who: string;
  source: string;
  sourceKey: string;
  prio: string;
  status: string;
  phone?: string;
}

interface Operator {
  id: number;
  name: string;
  calls: number;
  sales: number;
  avg: string;
}

interface Customer {
  id: number;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
}

interface Opportunity {
  id: number;
  name: string;
  stage: string;
}

interface Call {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  source?: string;
  priority: string;
  status: string;
  outcome?: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  notes?: string;
  next_action?: string;
  callback_at?: string;
  converted_to_opportunity: boolean;
  value?: number;
  customer?: Customer;
  opportunity?: Opportunity;
  user?: {
    id: number;
    name: string;
  };
}

interface PaginatedCalls {
  data: Call[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default function Calls() {
  const [stats, setStats] = useState<CallStats | null>(null);
  const [callsToday, setCallsToday] = useState<CallToday[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [allCalls, setAllCalls] = useState<PaginatedCalls | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [initiatingCallId, setInitiatingCallId] = useState<number | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallToday | null>(null);
  const [showStartCallingModal, setShowStartCallingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCall, setEditingCall] = useState<Call | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{success_count: number; error_count: number; errors: string[]} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  });
  const [callFormData, setCallFormData] = useState({
    contact_name: '',
    contact_phone: '',
    source: '',
    priority: 'medium',
    status: 'scheduled',
    scheduled_at: '',
    notes: '',
    next_action: '',
    callback_at: '',
    customer_id: '',
    opportunity_id: '',
  });
  const [callFormDataComplete, setCallFormDataComplete] = useState({
    outcome: 'successful',
    notes: '',
    next_action: '',
    callback_at: '',
    converted_to_opportunity: false,
    value: '',
    duration_seconds: '',
  });

  useEffect(() => {
    fetchData();
    fetchAllCalls();
  }, []);

  useEffect(() => {
    if ((showStartCallingModal && !importMode) || showEditModal) {
      fetchCustomers();
      fetchOpportunities();
    }
  }, [showStartCallingModal, importMode, showEditModal]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters.status, filters.priority, filters.search]);

  useEffect(() => {
    fetchAllCalls();
  }, [currentPage, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, todayRes, operatorsRes] = await Promise.all([
        api.get('/calls/stats'),
        api.get('/calls/today'),
        api.get('/calls/operators'),
      ]);

      setStats(statsRes.data);
      setCallsToday(todayRes.data || []);
      setOperators(operatorsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch call center data:', error);
      setStats(null);
      setCallsToday([]);
      setOperators([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers', { params: { per_page: 1000 } });
      setCustomers(response.data.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const response = await api.get('/opportunities', { params: { per_page: 1000 } });
      setOpportunities(response.data.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    }
  };

  const fetchAllCalls = async () => {
    try {
      setLoadingCalls(true);
      const params: any = {
        page: currentPage,
        per_page: 15,
        sort_by: 'created_at',
        sort_order: 'desc',
      };
      
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;

      const response = await api.get('/calls', { params });
      setAllCalls(response.data);
    } catch (error) {
      console.error('Failed to fetch calls:', error);
      setAllCalls(null);
    } finally {
      setLoadingCalls(false);
    }
  };

  const handleEdit = (call: Call) => {
    setEditingCall(call);
    setCallFormData({
      contact_name: call.contact_name || '',
      contact_phone: call.contact_phone || '',
      source: call.source || '',
      priority: call.priority || 'medium',
      status: call.status || 'scheduled',
      scheduled_at: call.scheduled_at ? new Date(call.scheduled_at).toISOString().slice(0, 16) : '',
      notes: call.notes || '',
      next_action: call.next_action || '',
      callback_at: call.callback_at ? new Date(call.callback_at).toISOString().slice(0, 16) : '',
      customer_id: call.customer?.id?.toString() || '',
      opportunity_id: call.opportunity?.id?.toString() || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateCall = async () => {
    if (!editingCall) return;

    try {
      const payload: any = {
        contact_name: callFormData.contact_name || undefined,
        contact_phone: callFormData.contact_phone || undefined,
        source: callFormData.source || undefined,
        priority: callFormData.priority,
        status: callFormData.status,
        scheduled_at: callFormData.scheduled_at || undefined,
        notes: callFormData.notes || undefined,
        next_action: callFormData.next_action || undefined,
        callback_at: callFormData.callback_at || undefined,
        customer_id: callFormData.customer_id || undefined,
        opportunity_id: callFormData.opportunity_id || undefined,
      };

      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      await api.put(`/calls/${editingCall.id}`, payload);
      alert('Call updated successfully!');
      setShowEditModal(false);
      setEditingCall(null);
      fetchAllCalls();
      fetchData();
    } catch (error: any) {
      console.error('Failed to update call:', error);
      alert(error.response?.data?.message || 'Failed to update call. Please try again.');
    }
  };

  const handleDelete = async (callId: number) => {
    if (!confirm('Are you sure you want to delete this call? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/calls/${callId}`);
      alert('Call deleted successfully!');
      fetchAllCalls();
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete call:', error);
      alert(error.response?.data?.message || 'Failed to delete call. Please try again.');
    }
  };

  const handleExportTemplate = async () => {
    try {
      const response = await api.get('/calls/export-template', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `calls_import_template_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Failed to export template:', error);
      alert(error.response?.data?.message || 'Failed to export template. Please try again.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
        alert('Please select a CSV file.');
        return;
      }
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a file to import.');
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append('file', importFile);

      // Don't set Content-Type header - axios will set it automatically with boundary for FormData
      const response = await api.post('/calls/import', formData);

      setImportResult(response.data);
      
      if (response.data.error_count === 0) {
        alert(`Successfully imported ${response.data.success_count} call(s)!`);
        setShowStartCallingModal(false);
        setImportFile(null);
        setImportMode(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        fetchData();
      } else {
        alert(`Imported ${response.data.success_count} call(s) with ${response.data.error_count} error(s). Check the error list below.`);
      }
    } catch (error: any) {
      console.error('Failed to import calls:', error);
      const errorMsg = error.response?.data?.message || 'Failed to import calls. Please check the file format and try again.';
      alert(errorMsg);
      if (error.response?.data?.expected_headers) {
        alert(`Expected headers: ${error.response.data.expected_headers.join(', ')}\nFound headers: ${error.response.data.found_headers?.join(', ') || 'none'}`);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleSubmitCall = async () => {
    try {
      const payload: any = {
        contact_name: callFormData.contact_name || undefined,
        contact_phone: callFormData.contact_phone || undefined,
        source: callFormData.source || undefined,
        priority: callFormData.priority,
        status: callFormData.status,
        scheduled_at: callFormData.scheduled_at || undefined,
        notes: callFormData.notes || undefined,
        next_action: callFormData.next_action || undefined,
        callback_at: callFormData.callback_at || undefined,
        customer_id: callFormData.customer_id || undefined,
        opportunity_id: callFormData.opportunity_id || undefined,
      };

      // Remove undefined values
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      await api.post('/calls', payload);
      alert('Call created successfully!');
      setShowStartCallingModal(false);
      setCallFormData({
        contact_name: '',
        contact_phone: '',
        source: '',
        priority: 'medium',
        status: 'scheduled',
        scheduled_at: '',
        notes: '',
        next_action: '',
        callback_at: '',
        customer_id: '',
        opportunity_id: '',
      });
      fetchData();
    } catch (error: any) {
      console.error('Failed to create call:', error);
      alert(error.response?.data?.message || 'Failed to create call. Please try again.');
    }
  };

  const handleCallClick = (call: CallToday) => {
    setSelectedCall(call);
    setShowCallModal(true);
    // Reset form
    setCallFormDataComplete({
      outcome: 'successful',
      notes: '',
      next_action: '',
      callback_at: '',
      converted_to_opportunity: false,
      value: '',
      duration_seconds: '',
    });
  };

  const handleCompleteCall = async () => {
    if (!selectedCall) return;

    try {
      const payload: any = {
        outcome: callFormDataComplete.outcome,
      };

      if (callFormDataComplete.notes) {
        payload.notes = callFormDataComplete.notes;
      }
      if (callFormDataComplete.next_action) {
        payload.next_action = callFormDataComplete.next_action;
      }
      if (callFormDataComplete.callback_at) {
        payload.callback_at = callFormDataComplete.callback_at;
      }
      if (callFormDataComplete.converted_to_opportunity) {
        payload.converted_to_opportunity = true;
        if (callFormDataComplete.value) {
          payload.value = parseFloat(callFormDataComplete.value);
        }
      }
      if (callFormDataComplete.duration_seconds) {
        payload.duration_seconds = parseInt(callFormDataComplete.duration_seconds);
      }

      await api.post(`/calls/${selectedCall.id}/complete`, payload);
      setShowCallModal(false);
      setSelectedCall(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to complete call:', error);
      alert('Failed to complete call. Please try again.');
    }
  };

  const getPriorityColor = (prio: string) => {
    const p = prio.toLowerCase();
    if (p.includes('alta') || p.includes('urgent')) return 'bg-bad';
    if (p.includes('media') || p.includes('medium')) return 'bg-warn';
    return 'bg-ok';
  };

  const getPriorityDot = (prio: string) => {
    const color = getPriorityColor(prio);
    return <span className={`w-1.5 h-1.5 rounded-full ${color}`}></span>;
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
        title="Call Center"
        subtitle="Manage calls, callbacks, and operator performance"
        actions={
          <>
            <button
              onClick={fetchData}
              className="px-4 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                setShowStartCallingModal(true);
                setImportMode(false);
                setImportFile(null);
                setImportResult(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="px-4 py-2 text-sm border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
            >
              📞 Start Calling
            </button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Calls to Do</h3>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-extrabold text-ink">{stats?.calls_to_do ?? 0}</div>
            <div className="text-sm font-semibold mb-1 text-muted">today</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Callbacks</h3>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-extrabold text-ink">{stats?.callbacks ?? 0}</div>
            <div className="text-sm font-semibold mb-1 text-muted">within 24h</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Calls Done</h3>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-extrabold text-ink">{stats?.calls_done ?? 0}</div>
            <div className="text-sm font-semibold mb-1 text-muted">today</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Conversion</h3>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-extrabold text-ink">{stats?.conversion_rate ?? '0%'}</div>
            <div className="text-sm font-semibold mb-1 text-muted">sales/calls</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Calls Table */}
        <div className="lg:col-span-2 bg-white border border-line rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-ink mb-4">Today's Calls</h3>
          {callsToday.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Contact</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Source</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Priority</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {callsToday.map((call) => (
                    <tr key={call.id} className="border-b border-line hover:bg-aqua-1/10 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-ink">{call.time}</span>
                      </td>
                      <td className="py-3 px-4 text-ink">{call.who}</td>
                      <td className="py-3 px-4 text-muted">{call.source}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-aqua-1/20 text-xs font-medium">
                          {getPriorityDot(call.prio)}
                          {call.prio}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {call.phone && (
                            <button
                              type="button"
                              disabled={initiatingCallId === call.id}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Call Now button clicked for call:', call.id, 'Phone:', call.phone, 'Status:', call.status);
                                
                                if (initiatingCallId === call.id) {
                                  console.log('Call already being initiated for this call');
                                  return;
                                }

                                setInitiatingCallId(call.id);
                                
                                try {
                                  console.log('Initiating call for:', call.id, call.phone);
                                  const response = await api.post(`/calls/${call.id}/initiate`, {
                                    phone_number: call.phone,
                                  });
                                  console.log('Call initiated successfully:', response.data);
                                  alert('Call initiated! The phone will ring shortly.');
                                  setTimeout(() => {
                                    fetchData(); // Refresh to update status
                                  }, 1000);
                                } catch (error: any) {
                                  console.error('Failed to initiate call:', error);
                                  const errorMsg = error.response?.data?.message || error.message || 'Failed to initiate call. Please check Twilio configuration.';
                                  alert(errorMsg);
                                } finally {
                                  setInitiatingCallId(null);
                                }
                              }}
                              className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                                initiatingCallId === call.id
                                  ? 'bg-gray-400 text-white cursor-not-allowed'
                                  : 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                              }`}
                              title={initiatingCallId === call.id ? 'Initiating call...' : `Start Phone Call to ${call.phone}`}
                            >
                              {initiatingCallId === call.id ? '⏳ Calling...' : '📞 Call Now'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCallClick(call);
                            }}
                            className="px-3 py-1.5 text-xs border border-line rounded-lg hover:bg-aqua-1/30 transition-colors text-ink font-medium"
                          >
                            {call.status === 'completed' ? 'VIEW' : 'COMPLETE'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <p>No calls scheduled for today.</p>
            </div>
          )}
        </div>

        {/* Operator Performance */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-ink mb-4">Operator Performance</h3>
          {operators.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Operator</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted">Calls</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted">Sales</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op) => (
                    <tr key={op.id} className="border-b border-line hover:bg-aqua-1/10 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-ink">{op.name}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-ink">{op.calls}</td>
                      <td className="py-3 px-4 text-center text-ink">{op.sales}</td>
                      <td className="py-3 px-4 text-center text-muted">{op.avg} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <p>No operator data available.</p>
            </div>
          )}
        </div>
      </div>

      {/* All Calls Table */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-ink">All Calls</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search calls..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5 text-sm"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5 text-sm"
            >
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="no_answer">No Answer</option>
              <option value="busy">Busy</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5 text-sm"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {loadingCalls ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aqua-5"></div>
          </div>
        ) : allCalls && allCalls.data && allCalls.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Contact</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Source</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Priority</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Scheduled</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">User</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allCalls.data.map((call) => (
                    <tr key={call.id} className="border-b border-line hover:bg-aqua-1/10 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-ink">
                          {call.contact_name || call.customer?.first_name || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-ink">{call.contact_phone || call.customer?.phone || '-'}</td>
                      <td className="py-3 px-4 text-muted">{call.source || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          call.priority === 'urgent' || call.priority === 'high' 
                            ? 'bg-red-100 text-red-800' 
                            : call.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {getPriorityDot(call.priority === 'urgent' || call.priority === 'high' ? 'Alta' : call.priority === 'medium' ? 'Media' : 'Bassa')}
                          {call.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                          call.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : call.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : call.status === 'cancelled'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {call.scheduled_at ? new Date(call.scheduled_at).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-muted">{call.user?.name || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(call)}
                            className="px-3 py-1.5 text-xs border border-line rounded-lg hover:bg-aqua-1/30 transition-colors text-ink font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(call.id)}
                            className="px-3 py-1.5 text-xs border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-red-600 font-medium"
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
            {allCalls.last_page > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                <div className="text-sm text-muted">
                  Showing {((allCalls.current_page - 1) * allCalls.per_page) + 1} to {Math.min(allCalls.current_page * allCalls.per_page, allCalls.total)} of {allCalls.total} calls
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={allCalls.current_page === 1}
                    className="px-3 py-1.5 text-sm border border-line rounded-lg hover:bg-aqua-1/30 transition-colors text-ink font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-ink">
                    Page {allCalls.current_page} of {allCalls.last_page}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(allCalls.last_page, p + 1))}
                    disabled={allCalls.current_page === allCalls.last_page}
                    className="px-3 py-1.5 text-sm border border-line rounded-lg hover:bg-aqua-1/30 transition-colors text-ink font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted">
            <p>No calls found.</p>
          </div>
        )}
      </div>

      {/* Edit Call Modal */}
      {showEditModal && editingCall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-ink">Edit Call</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCall(null);
                }}
                className="text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={callFormData.contact_name}
                    onChange={(e) => setCallFormData({ ...callFormData, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={callFormData.contact_phone}
                    onChange={(e) => setCallFormData({ ...callFormData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Source</label>
                  <input
                    type="text"
                    value={callFormData.source}
                    onChange={(e) => setCallFormData({ ...callFormData, source: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                    placeholder="Website, Referral, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Priority *</label>
                  <select
                    value={callFormData.priority}
                    onChange={(e) => setCallFormData({ ...callFormData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Status *</label>
                  <select
                    value={callFormData.status}
                    onChange={(e) => setCallFormData({ ...callFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                    required
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="no_answer">No Answer</option>
                    <option value="busy">Busy</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Scheduled At</label>
                  <input
                    type="datetime-local"
                    value={callFormData.scheduled_at}
                    onChange={(e) => setCallFormData({ ...callFormData, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Customer (Optional)</label>
                  <select
                    value={callFormData.customer_id}
                    onChange={(e) => setCallFormData({ ...callFormData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => {
                      const name = customer.company_name || 
                        `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
                        customer.email || 
                        'Unknown';
                      return (
                        <option key={customer.id} value={customer.id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Opportunity (Optional)</label>
                  <select
                    value={callFormData.opportunity_id}
                    onChange={(e) => setCallFormData({ ...callFormData, opportunity_id: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  >
                    <option value="">Select Opportunity</option>
                    {opportunities.map((opp) => (
                      <option key={opp.id} value={opp.id}>
                        {opp.name} ({opp.stage})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Notes</label>
                <textarea
                  value={callFormData.notes}
                  onChange={(e) => setCallFormData({ ...callFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  placeholder="Add call notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Next Action</label>
                <input
                  type="text"
                  value={callFormData.next_action}
                  onChange={(e) => setCallFormData({ ...callFormData, next_action: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  placeholder="What to do next..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Callback At</label>
                <input
                  type="datetime-local"
                  value={callFormData.callback_at}
                  onChange={(e) => setCallFormData({ ...callFormData, callback_at: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCall(null);
                }}
                className="flex-1 px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCall}
                className="flex-1 px-4 py-2 bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold"
              >
                Update Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Calling Modal */}
      {showStartCallingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-ink">Start Calling</h2>
              <button
                onClick={() => {
                  setShowStartCallingModal(false);
                  setImportMode(false);
                  setImportFile(null);
                  setImportResult(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => {
                  setImportMode(false);
                  setImportFile(null);
                  setImportResult(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  !importMode
                    ? 'bg-aqua-5 text-white'
                    : 'bg-aqua-1/30 text-ink border border-line'
                }`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => {
                  setImportMode(true);
                  setImportFile(null);
                  setImportResult(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  importMode
                    ? 'bg-aqua-5 text-white'
                    : 'bg-aqua-1/30 text-ink border border-line'
                }`}
              >
                Import from CSV
              </button>
            </div>

            {!importMode ? (
              /* Manual Form */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={callFormData.contact_name}
                      onChange={(e) => setCallFormData({ ...callFormData, contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      Contact Phone *
                    </label>
                    <input
                      type="tel"
                      value={callFormData.contact_phone}
                      onChange={(e) => setCallFormData({ ...callFormData, contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Source</label>
                    <input
                      type="text"
                      value={callFormData.source}
                      onChange={(e) => setCallFormData({ ...callFormData, source: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                      placeholder="Website, Referral, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Priority *</label>
                    <select
                      value={callFormData.priority}
                      onChange={(e) => setCallFormData({ ...callFormData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Status *</label>
                    <select
                      value={callFormData.status}
                      onChange={(e) => setCallFormData({ ...callFormData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                      required
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="no_answer">No Answer</option>
                      <option value="busy">Busy</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Scheduled At</label>
                    <input
                      type="datetime-local"
                      value={callFormData.scheduled_at}
                      onChange={(e) => setCallFormData({ ...callFormData, scheduled_at: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Customer (Optional)</label>
                    <select
                      value={callFormData.customer_id}
                      onChange={(e) => setCallFormData({ ...callFormData, customer_id: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                    >
                      <option value="">Select Customer</option>
                      {customers.map((customer) => {
                        const name = customer.company_name || 
                          `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
                          customer.email || 
                          'Unknown';
                        return (
                          <option key={customer.id} value={customer.id}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Opportunity (Optional)</label>
                    <select
                      value={callFormData.opportunity_id}
                      onChange={(e) => setCallFormData({ ...callFormData, opportunity_id: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                    >
                      <option value="">Select Opportunity</option>
                      {opportunities.map((opp) => (
                        <option key={opp.id} value={opp.id}>
                          {opp.name} ({opp.stage})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Notes</label>
                  <textarea
                    value={callFormData.notes}
                    onChange={(e) => setCallFormData({ ...callFormData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                    placeholder="Add call notes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Next Action</label>
                  <input
                    type="text"
                    value={callFormData.next_action}
                    onChange={(e) => setCallFormData({ ...callFormData, next_action: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                    placeholder="What to do next..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Callback At</label>
                  <input
                    type="datetime-local"
                    value={callFormData.callback_at}
                    onChange={(e) => setCallFormData({ ...callFormData, callback_at: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowStartCallingModal(false);
                      setImportMode(false);
                      setImportFile(null);
                      setImportResult(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitCall}
                    disabled={!callFormData.contact_name && !callFormData.contact_phone}
                    className="flex-1 px-4 py-2 bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Call
                  </button>
                </div>
              </div>
            ) : (
              /* Import Mode */
              <div className="space-y-4">
                <div className="bg-aqua-1/20 border border-aqua-5/30 rounded-lg p-4">
                  <h3 className="font-semibold text-ink mb-2">Import Instructions</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
                    <li>Click "Export Template" to download the CSV template</li>
                    <li>Fill in the template with your call data</li>
                    <li>Click "Choose File" and select your filled CSV file</li>
                    <li>Click "Import" to upload and validate your data</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleExportTemplate}
                    className="px-4 py-2 border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
                  >
                    📥 Export Template
                  </button>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="csv-file-input"
                    />
                    <label
                      htmlFor="csv-file-input"
                      className="block w-full px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium text-center cursor-pointer"
                    >
                      {importFile ? importFile.name : 'Choose File'}
                    </label>
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={!importFile || importing}
                    className="px-4 py-2 bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? 'Importing...' : '📤 Import'}
                  </button>
                </div>

                {importResult && (
                  <div className={`border rounded-lg p-4 ${
                    importResult.error_count === 0 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <h4 className="font-semibold text-ink mb-2">
                      Import Results: {importResult.success_count} successful, {importResult.error_count} errors
                    </h4>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto">
                        <ul className="list-disc list-inside text-sm text-muted space-y-1">
                          {importResult.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call Completion Modal */}
      {showCallModal && selectedCall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-ink mb-4">Complete Call</h2>
            <p className="text-muted mb-6">
              Call with <strong>{selectedCall.who}</strong> ({selectedCall.phone || 'No phone'})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Outcome</label>
                <select
                  value={callFormDataComplete.outcome}
                  onChange={(e) => setCallFormDataComplete({ ...callFormDataComplete, outcome: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                >
                  <option value="successful">Successful</option>
                  <option value="no_answer">No Answer</option>
                  <option value="busy">Busy</option>
                  <option value="voicemail">Voicemail</option>
                  <option value="callback_requested">Callback Requested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Notes</label>
                <textarea
                  value={callFormDataComplete.notes}
                  onChange={(e) => setCallFormDataComplete({ ...callFormDataComplete, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  placeholder="Add call notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Next Action</label>
                <input
                  type="text"
                  value={callFormDataComplete.next_action}
                  onChange={(e) => setCallFormDataComplete({ ...callFormDataComplete, next_action: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  placeholder="What to do next..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Callback Date/Time</label>
                <input
                  type="datetime-local"
                  value={callFormDataComplete.callback_at}
                  onChange={(e) => setCallFormDataComplete({ ...callFormDataComplete, callback_at: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Duration (seconds)</label>
                <input
                  type="number"
                  value={callFormDataComplete.duration_seconds}
                  onChange={(e) => setCallFormDataComplete({ ...callFormDataComplete, duration_seconds: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                  placeholder="Call duration in seconds"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="converted"
                  checked={callFormDataComplete.converted_to_opportunity}
                  onChange={(e) => setCallFormDataComplete({ ...callFormDataComplete, converted_to_opportunity: e.target.checked })}
                  className="w-4 h-4 text-aqua-5 border-line rounded focus:ring-aqua-5"
                />
                <label htmlFor="converted" className="text-sm font-medium text-ink">
                  Converted to Opportunity
                </label>
              </div>

              {callFormDataComplete.converted_to_opportunity && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Value (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={callFormDataComplete.value}
                    onChange={(e) => setCallFormDataComplete({ ...callFormDataComplete, value: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-5"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCallModal(false);
                  setSelectedCall(null);
                }}
                className="flex-1 px-4 py-2 border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteCall}
                className="flex-1 px-4 py-2 bg-aqua-5 text-white rounded-xl hover:bg-aqua-4 transition-colors font-semibold"
              >
                Complete Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

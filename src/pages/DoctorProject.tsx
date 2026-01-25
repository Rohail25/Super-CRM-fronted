import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

interface DoctorData {
  doctor: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    profileImage?: string;
    role: string;
  };
  patients: Array<{
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    profileImage?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      country?: string;
      zip?: string;
    };
    createdAt: string;
  }>;
  appointments: Array<{
    _id: string;
    patientId: { _id: string; fullName: string; email: string; phone: string } | null;
    appointmentDate: string;
    appointmentTime: string;
    status: string;
    paymentStatus: string;
    appointmentNumber: string;
  }>;
  orders: Array<{
    _id: string;
    orderNumber: string;
    patientId?: { fullName: string } | null;
    total: number;
    status: string;
    paymentStatus: string;
    items: Array<{ productId: { name: string } }>;
  }>;
  stats: {
    totalPatients: number;
    totalAppointments: number;
    appointmentsByStatus: Record<string, number>;
    totalOrders: number;
    totalRevenue: number;
  };
}

export default function DoctorProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorData, setDoctorData] = useState<DoctorData | null>(null);
  const [activeTab, setActiveTab] = useState<'patients'|'appointments'|'orders'|'stats'>('patients');
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchDoctorData();
    } else {
      setLoading(false);
    }
  }, [projectId]);

  const fetchDoctorData = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Call backend login endpoint which handles credential fetch + login + test-data fetch
      const response = await api.post(`/projects/${projectId}/sso/redirect`);
      
      if (response.data?.success && response.data?.data) {
        setDoctorData(response.data.data);
      } else if (response.data?.data) {
        setDoctorData(response.data.data);
      } else {
        setError('Failed to load doctor data');
      }
    } catch (err: any) {
      console.error('Failed to login & fetch doctor data:', err);
      setError(err.response?.data?.message || 'Failed to access doctor project');
    } finally {
      setLoading(false);
    }
  };

  const handleTryNow = () => {
    window.open('https://mydoctorweb.mydoctorplus.it/login', '_blank');
    setShowLoginModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="border-b border-line px-6 py-4 flex items-center">
          <button
            onClick={() => navigate('/projects')}
            className="px-3 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
          >
            ← Back to Projects
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aqua-5 mx-auto mb-4"></div>
            <p className="text-muted">Loading doctor data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !doctorData) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="border-b border-line px-6 py-4 flex items-center">
          <button
            onClick={() => navigate('/projects')}
            className="px-3 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
          >
            ← Back to Projects
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 border border-bad/30 max-w-md text-center">
            <h3 className="text-lg font-semibold text-ink mb-2">⚠️ Error</h3>
            <p className="text-muted text-sm mb-4">{error || 'Unable to load doctor data'}</p>
            <button
              onClick={fetchDoctorData}
              className="px-4 py-2 bg-aqua-5 text-white rounded-lg hover:bg-aqua-4 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-line px-6 py-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="px-3 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
          >
            ← Back to Projects
          </button>
          <h1 className="text-xl font-bold text-ink">Doctor Project</h1>
        </div>
        <button
          onClick={handleTryNow}
          className="px-4 py-2 text-sm border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
        >
          Want to Try
        </button>
      </div>

      {/* Doctor Summary Card */}
      <div className="px-6 py-6">
        <div className="bg-white rounded-xl border border-line p-6 flex items-center gap-6">
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border-2 border-aqua-5/30">
            {doctorData.doctor?.profileImage ? (
              <img
                src={doctorData.doctor.profileImage}
                alt="Doctor"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">👨‍⚕️</div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-ink mb-1">{doctorData.doctor?.fullName}</h2>
            <p className="text-sm text-muted mb-2">{doctorData.doctor?.email} • {doctorData.doctor?.phone}</p>
            <div className="inline-block px-3 py-1 bg-aqua-5/10 text-aqua-5 rounded-full text-xs font-semibold">
              {doctorData.doctor?.role || 'DOCTOR'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="px-4">
              <div className="text-2xl font-bold text-ink">{doctorData.stats?.totalPatients || 0}</div>
              <div className="text-xs text-muted">Patients</div>
            </div>
            <div className="px-4">
              <div className="text-2xl font-bold text-ink">{doctorData.stats?.totalAppointments || 0}</div>
              <div className="text-xs text-muted">Appointments</div>
            </div>
            <div className="px-4">
              <div className="text-2xl font-bold text-ink">${(doctorData.stats?.totalRevenue || 0).toFixed(2)}</div>
              <div className="text-xs text-muted">Revenue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-6 mb-4">
        <div className="bg-white rounded-xl border border-line p-1 flex gap-1 inline-flex">
          {[
            { id: 'patients', label: '👥 Patients', count: doctorData.patients?.length || 0 },
            { id: 'appointments', label: '📅 Appointments', count: doctorData.appointments?.length || 0 },
            { id: 'orders', label: '📦 Orders', count: doctorData.orders?.length || 0 },
            { id: 'stats', label: '📊 Stats', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-aqua-5 text-white shadow-md'
                  : 'text-muted hover:text-ink hover:bg-gray-50'
              }`}
            >
              {tab.label} {tab.count !== null && <span className="ml-1 text-xs opacity-75">({tab.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        <div className="space-y-4">
          {/* Patients Tab */}
          {activeTab === 'patients' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctorData.patients && doctorData.patients.length > 0 ? (
                doctorData.patients.map((patient) => (
                  <div key={patient._id} className="bg-white rounded-xl border border-line p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {patient.profileImage ? (
                          <img src={patient.profileImage} alt={patient.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-ink truncate">{patient.fullName}</h4>
                        <p className="text-xs text-muted truncate">{patient.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted">📞</span>
                        <span className="text-ink">{patient.phone}</span>
                      </div>
                      {patient.address?.city && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted">📍</span>
                          <span className="text-ink text-xs">
                            {patient.address.city}
                            {patient.address.country && `, ${patient.address.country}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>📅</span>
                        <span>{new Date(patient.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-muted">No patients found</div>
              )}
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="space-y-3">
              {doctorData.appointments && doctorData.appointments.length > 0 ? (
                doctorData.appointments.map((appointment) => (
                  <div key={appointment._id} className="bg-white rounded-xl border border-line p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="font-semibold text-ink mb-1">
                        {appointment.patientId?.fullName || 'Unknown Patient'}
                      </div>
                      <div className="text-sm text-muted mb-2">
                        {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.appointmentTime}
                      </div>
                      <div className="text-xs text-muted">{appointment.appointmentNumber}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          appointment.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-700'
                            : appointment.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-700'
                            : appointment.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : appointment.status === 'NO_SHOW'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {appointment.status}
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          appointment.paymentStatus === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {appointment.paymentStatus}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted">No appointments found</div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {doctorData.orders && doctorData.orders.length > 0 ? (
                doctorData.orders.map((order) => (
                  <div key={order._id} className="bg-white rounded-xl border border-line p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold text-ink">{order.orderNumber}</div>
                        <div className="text-sm text-muted">Patient: {order.patientId?.fullName || 'N/A'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-aqua-5">${order.total?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-muted">{order.items?.length || 0} items</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'DELIVERED'
                            ? 'bg-green-100 text-green-700'
                            : order.status === 'SHIPPED'
                            ? 'bg-blue-100 text-blue-700'
                            : order.status === 'PROCESSING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : order.status === 'PENDING'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {order.status}
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {order.paymentStatus}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted">No orders found</div>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-line p-6">
                <div className="text-3xl font-bold text-aqua-5 mb-2">{doctorData.stats?.totalPatients || 0}</div>
                <div className="text-sm text-muted">Total Patients</div>
              </div>
              <div className="bg-white rounded-xl border border-line p-6">
                <div className="text-3xl font-bold text-aqua-5 mb-2">{doctorData.stats?.totalAppointments || 0}</div>
                <div className="text-sm text-muted">Total Appointments</div>
              </div>
              <div className="bg-white rounded-xl border border-line p-6">
                <div className="text-3xl font-bold text-aqua-5 mb-2">${(doctorData.stats?.totalRevenue || 0).toFixed(2)}</div>
                <div className="text-sm text-muted">Total Revenue</div>
              </div>
              <div className="bg-white rounded-xl border border-line p-6">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {doctorData.stats?.appointmentsByStatus?.['CONFIRMED'] || 0}
                </div>
                <div className="text-sm text-muted">Confirmed Appointments</div>
              </div>
              <div className="bg-white rounded-xl border border-line p-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {doctorData.stats?.appointmentsByStatus?.['COMPLETED'] || 0}
                </div>
                <div className="text-sm text-muted">Completed Appointments</div>
              </div>
              <div className="bg-white rounded-xl border border-line p-6">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {doctorData.stats?.appointmentsByStatus?.['CANCELLED'] || 0}
                </div>
                <div className="text-sm text-muted">Cancelled Appointments</div>
              </div>
              <div className="bg-white rounded-xl border border-line p-6">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {doctorData.stats?.appointmentsByStatus?.['NO_SHOW'] || 0}
                </div>
                <div className="text-sm text-muted">No-Show Appointments</div>
              </div>
              <div className="bg-white rounded-xl border border-line p-6">
                <div className="text-3xl font-bold text-aqua-5 mb-2">{doctorData.stats?.totalOrders || 0}</div>
                <div className="text-sm text-muted">Total Orders</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-ink">Login Credentials</h3>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-2xl text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-muted mb-6">
              Use these credentials to sign in on the opened page:
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted block mb-2">Email</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={doctorData.doctor?.email || ''}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-line rounded-lg font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(doctorData.doctor?.email || '')}
                    className="px-3 py-2 border border-line rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                    title="Copy email"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-2">Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value="Use your original password or reset it"
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-line rounded-lg font-mono text-sm text-xs"
                  />
                </div>
                <p className="text-xs text-muted mt-2">Your original password was set during registration. If forgotten, use the password reset feature on the login page.</p>
              </div>
            </div>

            <button
              onClick={() => setShowLoginModal(false)}
              className="w-full mt-6 px-4 py-2 bg-aqua-5 text-white rounded-lg hover:bg-aqua-4 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

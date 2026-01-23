import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Topbar from '../components/layout/Topbar';
import { useAuthStore } from '../stores/authStore';

interface ProjectUser {
  id: number;
  user_id: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  external_user_id: string | null;
  external_username: string | null;
  status: string;
}

interface DoctorData {
  doctor: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    address?: any;
    emergencyContact?: any;
    role?: string;
    status?: string;
    profileImage?: string;
    gender?: string;
    bloodGroup?: string;
    dob?: string;
    isDoctorDocumentsVerified?: boolean;
    subscriptionPlan?: string;
    subscriptionExpiresAt?: string;
    doctorProfile?: string;
    balance?: number;
    createdAt?: string;
    updatedAt?: string;
  };
  project_users?: ProjectUser[];
  patients: Array<{
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    profileImage?: string;
    address?: any;
    createdAt?: string;
  }>;
  appointments: Array<{
    _id: string;
    doctorId: string;
    patientId: {
      _id: string;
      fullName: string;
      email: string;
      phone: string;
    } | null;
    appointmentDate: string;
    appointmentTime: string;
    appointmentDuration: number;
    appointmentEndTime?: string;
    bookingType: string;
    status: string;
    paymentStatus: string;
    paymentMethod?: string;
    appointmentNumber: string;
    patientNotes?: string;
    videoCallLink?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  orders: Array<{
    _id: string;
    patientId: {
      _id: string;
      fullName: string;
      email: string;
      phone: string;
    } | null;
    pharmacyId?: {
      _id: string;
      name: string;
      logo: string;
    };
    items: Array<{
      productId: {
        _id: string;
        name: string;
        price: number;
        discountPrice: number;
        images: string[];
      };
      quantity: number;
      price: number;
      discountPrice: number;
      total: number;
    }>;
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    status: string;
    paymentStatus: string;
    paymentMethod?: string;
    orderNumber: string;
    createdAt: string;
    updatedAt: string;
  }>;
  stats: {
    totalPatients: number;
    newPatientsThisMonth: number;
    totalAppointments: number;
    appointmentsByStatus: {
      PENDING: number;
      CONFIRMED: number;
      COMPLETED: number;
      CANCELLED: number;
      NO_SHOW: number;
      REJECTED: number;
    };
    appointmentsByPaymentStatus: {
      UNPAID: number;
      PAID: number;
      REFUNDED: number;
    };
    appointmentsThisMonth: number;
    upcomingAppointments: number;
    totalOrders: number;
    ordersByStatus: {
      PENDING: number;
      CONFIRMED: number;
      PROCESSING: number;
      SHIPPED: number;
      DELIVERED: number;
      CANCELLED: number;
      REFUNDED: number;
    };
    ordersByPaymentStatus: {
      PENDING: number;
      PAID: number;
      PARTIAL: number;
      REFUNDED: number;
    };
    totalRevenue: number;
    revenueThisMonth: number;
    ordersThisMonth: number;
  };
}

export default function DoctorProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DoctorData | null>(null);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [activeTab, setActiveTab] = useState<'patients' | 'appointments' | 'orders'>('patients');
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [userCredentials, setUserCredentials] = useState<{ email: string; password: string } | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (projectId) {
      fetchDoctorData();
    }
  }, [projectId]);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post(`/projects/${projectId}/sso/redirect`);
      
      if (response.data.success && response.data.project_slug === 'mydoctor') {
        setData(response.data.data);
        // Set project users from response
        if (response.data.project_users) {
          setProjectUsers(response.data.project_users);
        }
        
        // Fetch user's plain password for credentials display (non-blocking)
        if (user?.id) {
          // Fetch in background, don't block the UI
          api.get(`/users/${user.id}/plain-password`)
            .then((passwordResponse) => {
              if (passwordResponse.data.plain_password) {
                setUserCredentials({
                  email: user.email,
                  password: passwordResponse.data.plain_password,
                });
              }
            })
            .catch((err: any) => {
              console.warn('Could not fetch plain password initially:', err);
              // Don't set credentials here - will be fetched on demand when button is clicked
            });
        }
      } else {
        setError('Failed to load doctor project data');
      }
    } catch (err: any) {
      console.error('Failed to fetch doctor data:', err);
      setError(err.response?.data?.message || 'Failed to load doctor project data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return timeString ? `${formattedDate} at ${timeString}` : formattedDate;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Topbar title="Doctor Project" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aqua-5 mx-auto mb-4"></div>
            <p className="text-muted">Loading doctor project data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Topbar title="Doctor Project" />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-aqua-5 text-white rounded-lg hover:bg-aqua-4"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const handleWantToManage = async () => {
    // If credentials not loaded yet, try to fetch them
    if (!userCredentials && user?.id) {
      try {
        const passwordResponse = await api.get(`/users/${user.id}/plain-password`);
        if (passwordResponse.data.plain_password) {
          setUserCredentials({
            email: user.email,
            password: passwordResponse.data.plain_password,
          });
          setShowCredentialsModal(true);
        } else {
          alert('Password not available. Please contact administrator to set your password.');
        }
      } catch (err: any) {
        console.error('Failed to fetch credentials:', err);
        if (err.response?.status === 404) {
          alert('Password not found. Please contact administrator to set your password for external platform access.');
        } else if (err.response?.status === 403) {
          alert('You do not have permission to access credentials. Please contact administrator.');
        } else {
          alert('Unable to retrieve credentials. Please contact administrator.');
        }
      }
    } else if (userCredentials) {
      setShowCredentialsModal(true);
    } else {
      // Fallback: show email at least
      if (user?.email) {
        setUserCredentials({
          email: user.email,
          password: 'Password not available. Please contact administrator.',
        });
        setShowCredentialsModal(true);
      } else {
        alert('Credentials not available. Please contact administrator.');
      }
    }
  };

  const handleRedirectToManage = () => {
    if (userCredentials) {
      window.open('https://mydoctorweb.mydoctorplus.it/login', '_blank');
      setShowCredentialsModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar title="Doctor Project" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Doctor Project Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleWantToManage}
              className="px-6 py-2 bg-aqua-5 text-white rounded-lg hover:bg-aqua-4 transition-colors font-medium"
            >
              Want to manage
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back to Projects
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Patients</h3>
            <p className="text-3xl font-bold text-aqua-5">{data.stats.totalPatients}</p>
            <p className="text-xs text-gray-500 mt-1">{data.stats.newPatientsThisMonth} new this month</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Appointments</h3>
            <p className="text-3xl font-bold text-blue-600">{data.stats.totalAppointments}</p>
            <p className="text-xs text-gray-500 mt-1">{data.stats.appointmentsThisMonth} this month</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Orders</h3>
            <p className="text-3xl font-bold text-green-600">{data.stats.totalOrders}</p>
            <p className="text-xs text-gray-500 mt-1">{data.stats.ordersThisMonth} this month</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(data.stats.totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(data.stats.revenueThisMonth)} this month</p>
          </div>
        </div>

        {/* Project Users */}
        {projectUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Assigned Users ({projectUsers.length})</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">External User ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projectUsers.map((pu) => (
                    <tr key={pu.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{pu.user?.name || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{pu.user?.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{pu.user?.role || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{pu.external_user_id || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          pu.status === 'active' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {pu.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabs for Patients, Appointments, Orders */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('patients')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'patients'
                    ? 'border-aqua-5 text-aqua-5'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Patients ({data.patients.length})
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'appointments'
                    ? 'border-aqua-5 text-aqua-5'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Appointments ({data.appointments.length})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'orders'
                    ? 'border-aqua-5 text-aqua-5'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Orders ({data.orders.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Patients Tab */}
            {activeTab === 'patients' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Patients</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.patients.length > 0 ? (
                        data.patients.map((patient) => (
                          <tr key={patient._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {patient.profileImage && (
                                  <img
                                    src={patient.profileImage}
                                    alt={patient.fullName}
                                    className="w-10 h-10 rounded-full object-cover mr-3"
                                  />
                                )}
                                <span className="font-medium text-gray-900">{patient.fullName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{patient.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{patient.phone}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                              {patient.createdAt ? formatDate(patient.createdAt) : '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                            No patients found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Appointments</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appointment #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.appointments.length > 0 ? (
                        data.appointments.map((appointment) => (
                          <tr key={appointment._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                              {appointment.appointmentNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {appointment.patientId ? (
                                <div>
                                  <div className="font-medium text-gray-900">{appointment.patientId.fullName}</div>
                                  <div className="text-sm text-gray-500">{appointment.patientId.email}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">No patient</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                              {formatDateTime(appointment.appointmentDate, appointment.appointmentTime)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                                appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {appointment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                appointment.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {appointment.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                            No appointments found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Orders</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.orders.length > 0 ? (
                        data.orders.map((order) => (
                          <tr key={order._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                              {order.orderNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {order.patientId ? (
                                <div>
                                  <div className="font-medium text-gray-900">{order.patientId.fullName}</div>
                                  <div className="text-sm text-gray-500">{order.patientId.email}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">No patient</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                              {formatCurrency(order.total)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {order.paymentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                              {formatDate(order.createdAt)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            No orders found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Doctor Info */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Doctor Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              {data.doctor.profileImage && (
                <img
                  src={data.doctor.profileImage}
                  alt={data.doctor.fullName}
                  className="w-32 h-32 rounded-full object-cover mb-4"
                />
              )}
              <h3 className="text-xl font-semibold text-gray-900">{data.doctor.fullName}</h3>
              <p className="text-gray-600">{data.doctor.email}</p>
              <p className="text-gray-600">{data.doctor.phone}</p>
              {data.doctor.balance !== undefined && (
                <p className="text-gray-600 mt-2">Balance: {formatCurrency(data.doctor.balance)}</p>
              )}
            </div>
            <div className="space-y-2">
              {data.doctor.role && (
                <p><span className="font-medium">Role:</span> {data.doctor.role}</p>
              )}
              {data.doctor.status && (
                <p><span className="font-medium">Status:</span> {data.doctor.status}</p>
              )}
              {data.doctor.gender && (
                <p><span className="font-medium">Gender:</span> {data.doctor.gender}</p>
              )}
              {data.doctor.subscriptionExpiresAt && (
                <p><span className="font-medium">Subscription Expires:</span> {formatDate(data.doctor.subscriptionExpiresAt)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Credentials Modal */}
        {showCredentialsModal && userCredentials && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-ink mb-4">Login Credentials</h2>
              <div className="space-y-4 mb-6">
                <p className="text-gray-600">
                  Use these credentials to login to MyDoctor+ platform:
                </p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
                    <div className="flex items-center justify-between bg-white rounded border border-gray-300 px-3 py-2">
                      <span className="text-gray-900">{userCredentials.email}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(userCredentials.email);
                          alert('Email copied to clipboard!');
                        }}
                        className="text-aqua-5 hover:text-aqua-4 text-sm font-medium"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password:</label>
                    <div className="flex items-center justify-between bg-white rounded border border-gray-300 px-3 py-2">
                      <span className="text-gray-900 font-mono">{userCredentials.password}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(userCredentials.password);
                          alert('Password copied to clipboard!');
                        }}
                        className="text-aqua-5 hover:text-aqua-4 text-sm font-medium"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRedirectToManage}
                  className="flex-1 px-4 py-2 bg-aqua-5 text-white rounded-lg hover:bg-aqua-4 transition-colors font-medium"
                >
                  Open MyDoctor+ Platform
                </button>
                <button
                  onClick={() => setShowCredentialsModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function TGCalabriaTry() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'super_admin';

  const [plainPassword, setPlainPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setError('User not available');
      return;
    }

    if (isSuperAdmin) {
      navigate('/projects', { replace: true });
      return;
    }

    const fetchPlainPassword = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/users/${user.id}/plain-password`);
        setPlainPassword(response.data?.plain_password || null);
      } catch (err: any) {
        setPlainPassword(null);
        setError(err.response?.data?.message || 'Failed to load credentials');
      } finally {
        setLoading(false);
      }
    };

    fetchPlainPassword();
  }, [user, isSuperAdmin, navigate]);

  const backToProject = projectId ? `/projects/${projectId}/tg-calabria` : '/projects';

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="border-b border-line px-6 py-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(backToProject)}
            className="px-3 py-2 text-sm border border-line rounded-xl hover:bg-aqua-1/30 transition-colors text-ink font-medium"
          >
            ← Back to TG Calabria
          </button>
          <h1 className="text-xl font-bold text-ink">TG Calabria Admin Login</h1>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="bg-white rounded-xl border border-line p-4">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-ink">Your Credentials</h2>
              <p className="text-sm text-muted">Use these to sign in on the admin login page.</p>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <div>
                <span className="text-muted">Email:</span>{' '}
                <span className="font-semibold text-ink">{user?.email || '-'}</span>
              </div>
              <div>
                <span className="text-muted">Password:</span>{' '}
                <span className="font-semibold text-ink">
                  {loading ? 'Loading...' : plainPassword || 'Not available'}
                </span>
              </div>
              {!loading && error && <div className="text-sm text-bad">{error}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6">
        <div className="bg-white rounded-xl border border-line p-6 h-full flex flex-col items-center justify-center text-center">
          <div className="text-3xl mb-3">🌐</div>
          <h3 className="text-lg font-semibold text-ink mb-2">Open TG Calabria Admin Login</h3>
          <p className="text-sm text-muted mb-4 max-w-xl">
            The TG Calabria site blocks embedding in an iframe. Use the button below to open the login page in a new tab.
          </p>
          <button
            onClick={() => window.open('https://tgcalabriareport.com/admin-login', '_blank', 'noopener,noreferrer')}
            className="px-4 py-2 text-sm border border-aqua-5/35 bg-gradient-to-r from-aqua-3/45 to-aqua-5/14 rounded-xl hover:shadow-lg hover:shadow-aqua-5/10 transition-all text-ink font-semibold"
          >
            Open Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}

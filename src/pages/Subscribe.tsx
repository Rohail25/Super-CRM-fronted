import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Topbar from '../components/layout/Topbar';
import Button from '../components/ui/Button';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  interval: string;
  features: string[] | null;
  formatted_price?: string;
}

interface Subscription {
  id: number;
  status: string;
  current_period_end: string;
  plan: SubscriptionPlan;
}

export default function Subscribe() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    // Check for success message in URL
    const success = searchParams.get('success');
    const message = searchParams.get('message');
    
    if (success === 'true' && message) {
      setSuccessMessage(decodeURIComponent(message));
      // Remove success params from URL
      setSearchParams({}, { replace: true });
      // Refresh subscription data
      fetchData();
      checkAuth();
    } else {
      fetchData();
    }
    
    // Periodically check subscription status in case webhook processed it
    const interval = setInterval(async () => {
      try {
        await checkAuth();
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.company?.subscription_status === 'active') {
          // Refresh subscription data
          fetchData();
        }
      } catch (error) {
        console.error('Failed to check subscription status:', error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [checkAuth, navigate, searchParams, setSearchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, subscriptionRes] = await Promise.all([
        api.get('/subscription-plans'),
        api.get('/subscription').catch(() => null), // May not have subscription yet
      ]);

      if (plansRes.data && plansRes.data.length > 0) {
        setPlan(plansRes.data[0]);
      }

      if (subscriptionRes?.data?.subscription) {
        setSubscription(subscriptionRes.data.subscription);
      }
    } catch (err: any) {
      console.error('Failed to fetch subscription data:', err);
      setError(err.response?.data?.message || 'Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!plan || !user?.company) {
      setError('Missing plan or company information');
      return;
    }

    try {
      setCheckoutLoading(true);
      setError('');
      
      // Step 1: Get checkout session URL from backend
      const response = await api.post('/subscription/checkout', {
        plan_id: plan.id,
      });
      
      if (!response.data.checkout_url) {
        throw new Error('Failed to create checkout session');
      }

      // Step 2: Redirect directly to Stripe Checkout URL
      window.location.href = response.data.checkout_url;
      
      // Note: setCheckoutLoading stays true because we're redirecting
    } catch (err: any) {
      console.error('Failed to create checkout session:', err);
      setError(err.message || 'Failed to start checkout process');
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aqua-5"></div>
      </div>
    );
  }

  // If already has active subscription, show subscription details
  if (subscription && subscription.status === 'active') {
    return (
      <div className="space-y-6">
        <Topbar
          title="Subscription"
          subtitle="Your current subscription details"
        />
        
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-ink">Active Subscription</h3>
              <p className="text-sm text-muted">You have an active subscription</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Active
            </span>
          </div>

          {subscription.plan && (
            <div className="border-t border-line pt-4 mt-4">
              <h4 className="font-semibold text-ink mb-2">{subscription.plan.name}</h4>
              <p className="text-sm text-muted mb-4">{subscription.plan.description}</p>
              
              <div className="text-2xl font-bold text-ink mb-4">
                €{(subscription.plan.amount / 100).toFixed(2)} / {subscription.plan.interval}
              </div>

              {subscription.current_period_end && (
                <p className="text-sm text-muted">
                  Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          <div className="mt-6">
            <Button onClick={() => navigate('/dashboard')} variant="primary">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <Topbar title="Subscription" subtitle="Subscribe to activate your account" />
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <p className="text-muted">No subscription plan available. Please contact support.</p>
        </div>
      </div>
    );
  }

  const hasActiveSubscription = user?.company?.subscription_status === 'active';
  const needsSubscription = user?.company && 
                           !hasActiveSubscription &&
                           (user.company.status === 'approved' || 
                            user.company.subscription_status === 'approved' ||
                            (user.company.status === 'active' && user.company.subscription_status !== 'active'));

  return (
    <div className="space-y-6">
      {needsSubscription && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-900 mb-2">Account Approval Complete!</h3>
              <p className="text-yellow-800 mb-4">
                Your company <strong>{user?.company?.name}</strong> has been approved by our team. 
                To activate your account and start using LEO24 CRM, please complete your subscription below.
              </p>
            </div>
          </div>
        </div>
      )}

      <Topbar
        title="Subscribe"
        subtitle={needsSubscription ? "Complete your subscription to activate your account" : "Manage your subscription"}
        actions={
          <button
            onClick={async () => {
              try {
                await checkAuth();
                await fetchData();
              } catch (error) {
                console.error('Failed to refresh:', error);
              }
            }}
            className="px-4 py-2 text-sm border border-line rounded-lg hover:bg-aqua-1/30 transition-colors text-ink font-medium"
          >
            🔄 Refresh Status
          </button>
        }
      />

      {successMessage && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-900 mb-2">Subscription Activated Successfully!</h3>
              <p className="text-green-800 mb-4">{successMessage}</p>
              <p className="text-sm text-green-700">
                Your subscription has been saved to the database and your account is now active. You can now access all features of the platform.
              </p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-ink mb-2">{plan.name}</h2>
          {plan.description && (
            <p className="text-muted">{plan.description}</p>
          )}
        </div>

        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-ink mb-2">
            €{(plan.amount / 100).toFixed(2)}
          </div>
          <div className="text-muted">per {plan.interval}</div>
        </div>

        {plan.features && plan.features.length > 0 && (
          <div className="border-t border-line pt-6 mb-6">
            <h3 className="font-semibold text-ink mb-4">Features included:</h3>
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-ink">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-line pt-6">
          <Button
            onClick={handleSubscribe}
            isLoading={checkoutLoading}
            variant="primary"
            className="w-full"
          >
            Subscribe Now
          </Button>
          <p className="text-xs text-muted text-center mt-4">
            You will be redirected to Stripe to complete your payment securely
          </p>
        </div>
      </div>
    </div>
  );
}


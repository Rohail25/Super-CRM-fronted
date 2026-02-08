import { useEffect, useState, useRef } from 'react';
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
  is_active: boolean;
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
  
  // Changed from single plan to array of plans
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const checkAuth = useAuthStore((state) => state.checkAuth);
  
  // Use a ref to track if we've already processed the success message to prevent loops
  const successProcessed = useRef(false);

  useEffect(() => {
    const processParams = async () => {
    // Check for success message in URL
    const success = searchParams.get('success');
    const message = searchParams.get('message');
    
      if (success === 'true' && message && !successProcessed.current) {
        successProcessed.current = true;
      setSuccessMessage(decodeURIComponent(message));
        
        // Remove success params from URL without triggering a refresh/loop
        // We use replace: true to update the history stack
      setSearchParams({}, { replace: true });
        
      // Refresh subscription data
        await fetchData();
        await checkAuth();
      } else if (!successProcessed.current) {
        // Only fetch if we haven't just processed a success message (which already fetches)
      fetchData();
    }
    };

    processParams();
    
    // Periodically check subscription status in case webhook processed it
    const interval = setInterval(async () => {
      try {
        // Only check if we are not currently loading/checking out
        if (!checkoutLoading) {
        await checkAuth();
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.company?.subscription_status === 'active') {
          // Refresh subscription data
          fetchData();
           }
        }
      } catch (error) {
        console.error('Failed to check subscription status:', error);
      }
    }, 5000); // Increased interval to 5 seconds to reduce load

    return () => clearInterval(interval);
  }, [checkAuth, navigate, searchParams, setSearchParams, checkoutLoading]);

  const fetchData = async () => {
    try {
      // Don't set loading to true if we already have plans (background refresh)
      if (plans.length === 0) {
      setLoading(true);
      }
      
      const [plansRes, subscriptionRes] = await Promise.all([
        api.get('/subscription-plans'),
        api.get('/subscription').catch(() => null), // May not have subscription yet
      ]);

      if (plansRes.data && Array.isArray(plansRes.data)) {
        setPlans(plansRes.data);
        // Default to first plan if none selected
        if (!selectedPlan && plansRes.data.length > 0) {
          setSelectedPlan(plansRes.data[0]);
        }
      } else if (plansRes.data && plansRes.data.length > 0) {
        // Fallback if data is not an array but has length (legacy)
        setPlans([plansRes.data[0]]);
        if (!selectedPlan) setSelectedPlan(plansRes.data[0]);
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

  const handleSubscribe = async (planToSubscribe: SubscriptionPlan) => {
    if (!planToSubscribe || !user?.company) {
      setError('Missing plan or company information');
      return;
    }

    try {
      setCheckoutLoading(true);
      setError('');
      
      // Step 1: Get checkout session URL from backend
      const response = await api.post('/subscription/checkout', {
        plan_id: planToSubscribe.id,
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

  if (loading && plans.length === 0) {
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
        
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm max-w-2xl mx-auto">
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
            <Button onClick={() => navigate('/dashboard')} variant="primary" className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="space-y-6">
        <Topbar title="Subscription" subtitle="Subscribe to activate your account" />
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <p className="text-muted">No subscription plans available. Please contact support.</p>
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
                To activate your account and start using LEO24 CRM, please select a plan below.
              </p>
            </div>
          </div>
        </div>
      )}

      <Topbar
        title="Subscribe"
        subtitle={needsSubscription ? "Choose a plan to activate your account" : "Manage your subscription"}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((currentPlan) => (
          <div 
            key={currentPlan.id}
            className={`bg-white border rounded-2xl p-6 shadow-sm flex flex-col transition-all duration-200 hover:shadow-md ${
              selectedPlan?.id === currentPlan.id 
                ? 'border-aqua-5 ring-2 ring-aqua-5/20' 
                : 'border-line hover:border-aqua-3'
            }`}
            onClick={() => setSelectedPlan(currentPlan)}
          >
        <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-ink mb-2">{currentPlan.name}</h2>
              {currentPlan.description && (
                <p className="text-muted text-sm">{currentPlan.description}</p>
          )}
        </div>

        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-ink mb-2">
                €{(currentPlan.amount / 100).toFixed(2)}
          </div>
              <div className="text-muted">per {currentPlan.interval}</div>
        </div>

            {currentPlan.features && currentPlan.features.length > 0 && (
              <div className="border-t border-line pt-6 mb-6 flex-grow">
                <h3 className="font-semibold text-ink mb-4 text-sm uppercase tracking-wider">Features included:</h3>
                <ul className="space-y-3">
                  {currentPlan.features.map((feature, index) => (
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
                      <span className="text-ink text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

            <div className="border-t border-line pt-6 mt-auto">
          <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubscribe(currentPlan);
                }}
                isLoading={checkoutLoading && selectedPlan?.id === currentPlan.id}
            variant="primary"
            className="w-full"
                disabled={checkoutLoading}
          >
                {checkoutLoading && selectedPlan?.id === currentPlan.id ? 'Processing...' : 'Subscribe Now'}
          </Button>
            </div>
        </div>
        ))}
      </div>
      
      <p className="text-xs text-muted text-center mt-8">
        Secure payment processed by Stripe. You can cancel at any time.
      </p>
    </div>
  );
}

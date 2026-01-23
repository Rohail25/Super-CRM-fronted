import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifySession();
    } else {
      setError('Missing session ID');
      setLoading(false);
    }
  }, [sessionId]);

  const checkAuth = useAuthStore((state) => state.checkAuth);
  const setUser = useAuthStore((state) => state.setUser);

  const verifySession = async () => {
    try {
      if (!sessionId) {
        setError('Missing session ID');
        setLoading(false);
        return;
      }
      
      // Call backend API to verify and activate subscription
      // This endpoint will save the subscription to database
      console.log('📞 Verifying and activating subscription (payment successful)...');
      const response = await api.get('/subscription/success', {
        params: {
          session_id: sessionId,
        },
      });
      
      console.log('✅ Subscription activated:', response.data);
      
      if (response.data.message && response.data.subscription) {
        // Subscription was successfully saved to database
        // Refresh auth data to get updated subscription status
        await checkAuth();
        
        // Immediately redirect back to subscription page with success message
        const successMessage = response.data.message || 'Subscription activated successfully';
        navigate('/subscribe?success=true&message=' + encodeURIComponent(successMessage), { replace: true });
        return; // Exit early to prevent further execution
      } else {
        // Fallback: try activate endpoint if success endpoint didn't work
        const companyId = searchParams.get('company_id');
        const planId = searchParams.get('plan_id');
        const paymentIntentId = searchParams.get('payment_intent');
        
        if (companyId && planId) {
          console.log('📞 Trying activate endpoint as fallback...');
          const activateResponse = await api.post('/subscription/activate', {
            session_id: sessionId,
            company_id: parseInt(companyId),
            plan_id: parseInt(planId),
            payment_intent_id: paymentIntentId || null,
          });
          
          console.log('✅ Subscription activated via fallback:', activateResponse.data);
          await checkAuth();
          // Immediately redirect back to subscription page with success message
          const successMessage = activateResponse.data.message || 'Subscription activated successfully';
          navigate('/subscribe?success=true&message=' + encodeURIComponent(successMessage), { replace: true });
          return; // Exit early
        } else {
          setError('Subscription activated but missing redirect information');
          setLoading(false);
        }
      }
      
    } catch (err: any) {
      console.error('❌ Failed to activate subscription:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to activate subscription';
      setError(errorMessage + '. Please refresh the page or contact support.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-aqua-2 to-aqua-1">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-line w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aqua-5 mx-auto mb-4"></div>
          <p className="text-muted mb-2">Processing your payment...</p>
          <p className="text-sm text-muted">Saving subscription to database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-aqua-2 to-aqua-1">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-line w-full max-w-md text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Verification Failed</h1>
          <p className="text-muted mb-6">{error}</p>
          <Button onClick={() => navigate('/subscribe')} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // This should not be reached if redirect worked, but show a fallback just in case
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-aqua-2 to-aqua-1">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-line w-full max-w-md text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">Payment Successful!</h1>
        <p className="text-muted mb-4">
          Your payment has been processed successfully and your subscription has been saved to the database.
        </p>
        <p className="text-sm text-muted mb-6">
          Redirecting you back to the subscription page...
        </p>
        <Button 
          onClick={() => {
            navigate('/subscribe?success=true&message=' + encodeURIComponent('Subscription activated successfully'), { replace: true });
          }} 
          variant="primary"
        >
          Continue to Subscription Page
        </Button>
      </div>
    </div>
  );
}


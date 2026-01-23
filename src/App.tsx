import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from './stores/authStore';

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <RouterProvider router={router} />;
}

export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import SharedContent from '@/pages/SharedContent';
import AuthCallback from '@/pages/AuthCallback';
import NotFound from '@/pages/NotFound';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster />
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/board/:boardId"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/shared/:type/:token" element={<SharedContent />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

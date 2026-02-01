import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import { ThemeContextProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Layout/Sidebar';
import Login from './pages/Login';
import POS from './pages/POS';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Analytics from './pages/Analytics';
import MenuManagement from './pages/MenuManagement';
import Settings from './pages/Settings';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'admin' | 'cashier' }> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/pos" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 0,
          px: { xs: 2, sm: 3, md: 4 },
          pb: { xs: 2, sm: 3 },
          overflowY: 'auto',
          overflowX: 'hidden',
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#121212' : '#FAFAFA',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute requiredRole="admin"><Analytics /></ProtectedRoute>} />
          <Route path="/menu" element={<ProtectedRoute><MenuManagement /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute requiredRole="admin"><Settings /></ProtectedRoute>} />
          <Route path="/login" element={<Navigate to="/pos" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeContextProvider>
      <AuthProvider>
        <CssBaseline />
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeContextProvider>
  );
}

export default App;


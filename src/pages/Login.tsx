import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  UserIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/pos');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        navigate('/pos');
      } else {
        setError('Invalid username or password');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) => 
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
            : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
        px: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(255, 215, 0, 0.05)'
              : 'rgba(255, 215, 0, 0.1)',
          filter: 'blur(40px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -50,
          left: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(255, 215, 0, 0.05)'
              : 'rgba(255, 215, 0, 0.1)',
          filter: 'blur(40px)',
        }}
      />

      <Card
        sx={{
          maxWidth: 450,
          width: '100%',
          position: 'relative',
          zIndex: 1,
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 8px 32px rgba(0, 0, 0, 0.12)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* Header Section */}
        <Box
          sx={{
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)'
                : 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            p: 4,
            textAlign: 'center',
            color: (theme) => theme.palette.mode === 'dark' ? '#FFD700' : '#000',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <Box
              component="img"
              src="/logo kings bakery.jpg"
              alt="The King's Bakery Logo"
              sx={{
                maxWidth: 120,
                maxHeight: 120,
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: 2,
                mb: 1,
              }}
            />
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              mb: 0.5,
              letterSpacing: '-0.02em',
            }}
          >
            THE KING'S BAKERY
          </Typography>
          <Typography
            variant="body2"
            sx={{
              opacity: 0.9,
              fontWeight: 500,
              fontSize: '0.9rem',
            }}
          >
            Point of Sale System
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Username"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              autoFocus
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <UserIcon style={{ width: 20, height: 20, opacity: 0.6 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockClosedIcon style={{ width: 20, height: 20, opacity: 0.6 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '1rem',
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                    : 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                color: '#000',
                '&:hover': {
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)'
                      : 'linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 4px 12px rgba(255, 215, 0, 0.3)'
                      : '0 4px 12px rgba(255, 215, 0, 0.4)',
                },
                '&:disabled': {
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 215, 0, 0.3)'
                      : 'rgba(255, 215, 0, 0.5)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#000' }} />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Login;

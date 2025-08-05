import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Tab,
  Tabs,
  TextField,
  Typography,
  Paper,
  Fade,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import api from '../api';

interface Props {
  onLogin: (token: string, name?: string, isAdmin?: boolean) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.post('/api/login', { email, password });
        const token = res.data.token;
        const namePart = email.split('@')[0] || 'Friend';
        const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
        const adminFlag = email.toLowerCase() === 'admin@qom.com';
        onLogin(token, adminFlag ? 'Admin' : capitalizedName, adminFlag);
      } else {
        await api.post('/api/register', { email, password });
        setMode('login');
        setError('Registered successfully! You can now log in.');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0A1628 0%, #1E3A5F 100%)',
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background elements */}
      <Box sx={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(78, 205, 196, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        top: '-200px',
        right: '-200px',
        animation: 'pulse 4s ease-in-out infinite',
        '@keyframes pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      }} />
      <Box sx={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(247, 178, 103, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        bottom: '-150px',
        left: '-150px',
        animation: 'pulse 4s ease-in-out infinite 2s',
      }} />

      <Container maxWidth="sm">
        <Fade in timeout={1000}>
          <Paper sx={{ 
            p: 5, 
            textAlign: 'center',
            background: 'rgba(30, 58, 95, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(78, 205, 196, 0.3)',
          }}>
            <AutoAwesomeIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            
            <Typography variant="h3" gutterBottom sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #4ECDC4, #7FE7E0)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Queen of Millions
            </Typography>
            
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              Crypto Classroom
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontStyle: 'italic' }}>
              You're Not Late. You're Right on Time—And You're Not Alone.
            </Typography>

            <Tabs
              value={mode}
              onChange={(_e, v) => setMode(v)}
              centered
              sx={{ 
                mb: 3,
                '& .MuiTab-root': {
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              <Tab label="Login" value="login" />
              <Tab label="Register" value="register" />
            </Tabs>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
            >
              {error && (
                <Typography color="error" align="center">
                  {error}
                </Typography>
              )}
              
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(78, 205, 196, 0.05)',
                    '&:hover': {
                      backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    },
                  },
                }}
              />
              
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(78, 205, 196, 0.05)',
                    '&:hover': {
                      backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    },
                  },
                }}
              />
              
              <Button 
                type="submit" 
                variant="contained" 
                size="large"
                disabled={loading}
                endIcon={<RocketLaunchIcon />}
                sx={{
                  mt: 2,
                  py: 1.5,
                  background: 'linear-gradient(45deg, #4ECDC4, #7FE7E0)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #2BA09A, #4ECDC4)',
                  },
                }}
              >
                {mode === 'login' ? 'Enter Crypto Lab' : 'Join the Community'}
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
              Join the Queen of Millions Community & Build Your Crypto Confidence
            </Typography>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
} 
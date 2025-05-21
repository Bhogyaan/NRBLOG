import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Link,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSetRecoilState } from 'recoil';
import authScreenAtom from '../atoms/authAtom';
import useShowToast from '../hooks/useShowToast';
import userAtom from '../atoms/userAtom';
import { useNavigate } from 'react-router-dom';

export default function SignupCard() {
  const [showPassword, setShowPassword] = useState(false);
  const setAuthScreen = useSetRecoilState(authScreenAtom);
  const showToast = useShowToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [inputs, setInputs] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSignup = async () => {
    if (inputs.password !== inputs.confirmPassword) {
      showToast('Error', 'Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/users/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inputs.name,
          username: inputs.username,
          email: inputs.email,
          password: inputs.password,
        }),
      });
      const data = await res.json();

      if (data.error) {
        showToast('Error', data.error, 'error');
        return;
      }

      // Clear any existing authentication state
      localStorage.removeItem('user-NRBLOG');
      console.log('Signup successful, redirecting to login'); // Debug log
      showToast('Success', 'Signed up successfully. Please log in.', 'success');
      // Delay navigation to ensure toast visibility and state update
      setTimeout(() => {
        setAuthScreen('login');
        navigate('/auth', { replace: true }); // Use replace to avoid back navigation
      }, 500);
    } catch (error) {
      showToast('Error', error.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormControl fullWidth required>
            <TextField
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={inputs.name}
              onChange={(e) => setInputs({ ...inputs, name: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: '#a78bfa' },
                  '&.Mui-focused fieldset': { borderColor: '#a78bfa' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#a78bfa' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />
          </FormControl>
          <FormControl fullWidth required>
            <TextField
              label="Username"
              type="text"
              placeholder="johndoe"
              value={inputs.username}
              onChange={(e) => setInputs({ ...inputs, username: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: '#a78bfa' },
                  '&.Mui-focused fieldset': { borderColor: '#a78bfa' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#a78bfa' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />
          </FormControl>
        </Stack>
        <FormControl fullWidth required>
          <TextField
            label="Email Address"
            type="email"
            placeholder="example@email.com"
            value={inputs.email}
            onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                '&:hover fieldset': { borderColor: '#a78bfa' },
                '&.Mui-focused fieldset': { borderColor: '#a78bfa' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#a78bfa' },
              '& .MuiInputBase-input': { color: '#fff' },
            }}
          />
        </FormControl>
        <FormControl fullWidth required>
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter password"
            value={inputs.password}
            onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                '&:hover fieldset': { borderColor: '#a78bfa' },
                '&.Mui-focused fieldset': { borderColor: '#a78bfa' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#a78bfa' },
              '& .MuiInputBase-input': { color: '#fff' },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </FormControl>
        <FormControl fullWidth required>
          <TextField
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            value={inputs.confirmPassword}
            onChange={(e) => setInputs({ ...inputs, confirmPassword: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                '&:hover fieldset': { borderColor: '#a78bfa' },
                '&.Mui-focused fieldset': { borderColor: '#a78bfa' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#a78bfa' },
              '& .MuiInputBase-input': { color: '#fff' },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </FormControl>
        <Button
          variant="contained"
          size="large"
          onClick={handleSignup}
          disabled={loading}
          fullWidth
          sx={{
            py: 1.5,
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 'bold',
            fontSize: '1rem',
            bgcolor: '#a78bfa',
            '&:hover': {
              bgcolor: '#8b5cf6',
              transform: 'scale(1.05)',
              transition: 'all 0.3s ease',
            },
          }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Sign Up'}
        </Button>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" textAlign="center">
          Already a user?{' '}
          <Link
            href="#"
            color="#a78bfa"
            onClick={() => setAuthScreen('login')}
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Login
          </Link>
        </Typography>
      </Stack>
    </motion.div>
  );
}
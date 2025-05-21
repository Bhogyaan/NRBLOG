import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  Stack,
  Link,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSetRecoilState } from 'recoil';
import authScreenAtom from '../atoms/authAtom';
import useShowToast from '../hooks/useShowToast';
import userAtom from '../atoms/userAtom';
import { useNavigate } from 'react-router-dom';

export default function LoginCard({ isAdmin = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const setAuthScreen = useSetRecoilState(authScreenAtom);
  const setUser = useSetRecoilState(userAtom);
  const [loading, setLoading] = useState(false);
  const showToast = useShowToast();
  const navigate = useNavigate();

  const [inputs, setInputs] = useState({
    username: isAdmin ? 'adminblog' : '',
    password: isAdmin ? 'Admin123' : '',
  });

  const handleLogin = async () => {
    setLoading(true);
    try {
      const endpoint = isAdmin ? '/api/users/admin/login' : '/api/users/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });

      const data = await res.json();
      if (data.error) {
        showToast('Error', data.error, 'error');
        return;
      }

      localStorage.setItem('user-NRBLOG', JSON.stringify(data));
      setUser(data);
      showToast('Success', `Logged in as ${isAdmin ? 'admin' : 'user'} successfully`, 'success');
      navigate(isAdmin ? '/admin-dashboard' : '/dashboard');
    } catch (error) {
      showToast('Error', error.message, 'error');
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
        <FormControl fullWidth required>
          <TextField
            label="Username"
            type="text"
            value={inputs.username}
            onChange={(e) => !isAdmin && setInputs((prev) => ({ ...prev, username: e.target.value }))}
            disabled={isAdmin}
            placeholder="testuser1"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 12, // Increased for premium feel
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
            value={inputs.password}
            onChange={(e) => !isAdmin && setInputs((prev) => ({ ...prev, password: e.target.value }))}
            disabled={isAdmin}
            placeholder="Enter your password"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 12, // Increased for premium feel
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
          onClick={handleLogin}
          disabled={loading}
          fullWidth
          sx={{
            py: 1.5,
            borderRadius: 12, // Increased for premium feel
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
          {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Log In'}
        </Button>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" textAlign="center">
          Not a user?{' '}
          <Link
            href="#"
            color="#a78bfa"
            onClick={() => setAuthScreen('signup')}
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Sign Up
          </Link>
        </Typography>
      </Stack>
    </motion.div>
  );
}
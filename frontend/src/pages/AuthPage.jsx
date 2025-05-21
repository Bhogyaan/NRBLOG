import React from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { motion } from 'framer-motion';
import { Box, Button, Typography, useMediaQuery, useTheme } from '@mui/material';
import LoginCard from '../components/LoginCard';
import SignupCard from '../components/SignupCard';
import authScreenAtom from '../atoms/authAtom';

const AuthPage = () => {
  const authScreenState = useRecoilValue(authScreenAtom);
  const setAuthScreen = useSetRecoilState(authScreenAtom);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const AuthLinks = () => (
    <Box display="flex" justifyContent="center" gap={2} mb={4}>
      <Button
        variant={authScreenState === 'login' ? 'contained' : 'outlined'}
        onClick={() => setAuthScreen('login')}
        sx={{
          flex: 1,
          py: 1.5,
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 'bold',
          fontSize: '1rem',
          color: authScreenState === 'login' ? '#fff' : '#a78bfa',
          bgcolor: authScreenState === 'login' ? '#a78bfa' : 'transparent',
          borderColor: '#a78bfa',
          '&:hover': {
            bgcolor: authScreenState === 'login' ? '#8b5cf6' : 'rgba(167, 139, 250, 0.1)',
            transform: 'scale(1.05)',
            transition: 'all 0.3s ease',
          },
        }}
      >
        Log In
      </Button>
      <Button
        variant={authScreenState === 'signup' ? 'contained' : 'outlined'}
        onClick={() => setAuthScreen('signup')}
        sx={{
          flex: 1,
          py: 1.5,
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 'bold',
          fontSize: '1rem',
          color: authScreenState === 'signup' ? '#fff' : '#a78bfa',
          bgcolor: authScreenState === 'signup' ? '#a78bfa' : 'transparent',
          borderColor: '#a78bfa',
          '&:hover': {
            bgcolor: authScreenState === 'signup' ? '#8b5cf6' : 'rgba(167, 139, 250, 0.1)',
            transform: 'scale(1.05)',
            transition: 'all 0.3s ease',
          },
        }}
      >
        Sign Up
      </Button>
    </Box>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '1rem' : '2rem',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          maxWidth: '1200px',
          width: '100%',
          minHeight: isMobile ? 'auto' : '600px',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Left Section - Branding */}
        <Box
          sx={{
            flex: isMobile ? 'none' : 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: isMobile ? 3 : 5,
            // bgcolor: 'rgba(0, 0, 0, 0.1)',
            color: '#fff',
            textAlign: 'center',
            order: isMobile ? 1 : 'unset',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Typography
              variant={isMobile ? 'h4' : 'h2'}
              fontWeight="bold"
              sx={{ color: '#a78bfa', mb: 3 }}
            >
              NR Blog
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
              Where Ideas Ignite Curiosity
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', maxWidth: '80%' }}>
              Dive into knowledge, surf the trends, and join a community of curious minds.
            </Typography>
          </motion.div>
        </Box>

        {/* Right Section - Auth Card */}
        <Box
          sx={{
            flex: isMobile ? 'none' : 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: isMobile ? 3 : 5,
            // bgcolor: 'rgba(255, 255, 255, 0.05)',
            order: isMobile ? 2 : 'unset',
          }}
        >
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: isMobile ? '100%' : '400px',
                p: 4,
                borderRadius: 12,
                // background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              }}
            >
              <Typography
                variant="h5"
                fontWeight="bold"
                color="#a78bfa"
                textAlign="center"
                mb={3}
              >
                {authScreenState === 'login' ? 'Welcome Back' : 'Join NR Blog'}
              </Typography>
              <AuthLinks />
              {authScreenState === 'login' && <LoginCard />}
              {authScreenState === 'signup' && <SignupCard />}
            </Box>
          </motion.div>
        </Box>
      </Box>
    </motion.div>
  );
};

export default AuthPage;
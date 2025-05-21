import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import userAtom from '../atoms/userAtom';
import { AiFillHome } from 'react-icons/ai';
import { RxAvatar } from 'react-icons/rx';
import { Link as RouterLink } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import useLogout from '../hooks/useLogout';
import authScreenAtom from '../atoms/authAtom';
import { BsFillChatQuoteFill } from 'react-icons/bs';
import { MdOutlineSettings, MdOutlineDashboard } from 'react-icons/md';
import { motion } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const Header = () => {
  const user = useRecoilValue(userAtom);
  const logout = useLogout();
  const setAuthScreen = useSetRecoilState(authScreenAtom);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        p={2}
        bgcolor={isMobile ? 'blue' : 'transparent'}
        flexDirection={isMobile ? 'column' : 'row'}
        sx={{
          background: isMobile
            ? 'linear-gradient(to bottom, blue, purple)'
            : 'none',
        }}
      >
        {user ? (
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton component={RouterLink} to="/">
              <AiFillHome size={24} />
            </IconButton>
            <IconButton component={RouterLink} to="/dashboard">
              <MdOutlineDashboard size={24} />
            </IconButton>
          </Box>
        ) : (
          <Box display="flex" gap={2} justifyContent="center" mt={isMobile ? 2 : 0}>
            <Button
              variant="text"
              color="primary"
              onClick={() => setAuthScreen('login')}
              component={RouterLink}
              to="/auth"
              sx={{ fontWeight: 'bold' }}
            >
              Login
            </Button>
            <Button
              variant="text"
              color="primary"
              onClick={() => setAuthScreen('signup')}
              component={RouterLink}
              to="/auth"
              sx={{ fontWeight: 'bold' }}
            >
              Sign Up
            </Button>
          </Box>
        )}

        {user && (
          <Box display="flex" alignItems="center" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontWeight="bold">{user.username}</Typography>
              {user.isAdmin && (
                <Avatar
                  src="/verified.png"
                  sx={{ width: 16, height: 16 }}
                />
              )}
            </Box>
            <IconButton component={RouterLink} to={`/${user.username}`}>
              <RxAvatar size={24} />
            </IconButton>
            <IconButton component={RouterLink} to="/chat">
              <BsFillChatQuoteFill size={20} />
            </IconButton>
            <IconButton component={RouterLink} to="/settings">
              <MdOutlineSettings size={20} />
            </IconButton>
            <IconButton size="small" onClick={logout}>
              <FiLogOut size={20} />
            </IconButton>
          </Box>
        )}
      </Box>
    </motion.div>
  );
};

export default Header;

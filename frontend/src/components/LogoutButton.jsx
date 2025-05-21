import React from 'react';
import { Button, IconButton } from '@mui/material';
import { useSetRecoilState } from 'recoil';
import userAtom from '../atoms/userAtom';
import useShowToast from '../hooks/useShowToast';
import { FiLogOut } from 'react-icons/fi';
import { motion } from 'framer-motion';

const LogoutButton = () => {
  const setUser = useSetRecoilState(userAtom);
  const showToast = useShowToast();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/users/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();

      if (data.error) {
        showToast('Error', data.error, 'error');
        return;
      }

      localStorage.removeItem('user-NRBLOG');
      setUser(null);
      showToast('Success', 'Logged out successfully', 'success');
    } catch (error) {
      showToast('Error', error.message, 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ position: 'fixed', top: '30px', right: '30px' }}
    >
      <IconButton onClick={handleLogout} size="small">
        <FiLogOut size={20} />
      </IconButton>
    </motion.div>
  );
};

export default LogoutButton;

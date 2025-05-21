import React from 'react';
import { Avatar, Box, Button, Typography, Menu, MenuItem, IconButton, Stack } from '@mui/material';
import { BsInstagram } from 'react-icons/bs';
import { CgMoreO } from 'react-icons/cg';
import { useRecoilValue } from 'recoil';
import userAtom from '../atoms/userAtom';
import { Link as RouterLink } from 'react-router-dom';
import useFollowUnfollow from '../hooks/useFollowUnfollow';
import useShowToast from '../hooks/useShowToast';
import { motion } from 'framer-motion';

const UserHeader = ({ user }) => {
  const currentUser = useRecoilValue(userAtom);
  const { handleFollowUnfollow, following, updating } = useFollowUnfollow(user);
  const showToast = useShowToast();

  const copyURL = () => {
    const currentURL = window.location.href;
    navigator.clipboard.writeText(currentURL).then(() => {
      showToast('Success', 'Profile link copied.', 'success');
    });
  };

  const handleBanUnban = async (action) => {
    try {
      const res = await fetch(`/api/users/${action}/${user._id}`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.error) {
        showToast('Error', data.error, 'error');
        return;
      }
      showToast('Success', `User ${action}ned successfully`, 'success');
    } catch (error) {
      showToast('Error', error.message, 'error');
    }
  };

  const handlePromoteToAdmin = async () => {
    try {
      const res = await fetch(`/api/users/promote/${user._id}`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.error) {
        showToast('Error', data.error, 'error');
        return;
      }
      showToast('Success', 'User promoted to admin successfully', 'success');
    } catch (error) {
      showToast('Error', error.message, 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'start', width: '100%' }}
    >
      <Stack direction="row" justifyContent="space-between" width="100%">
        <Box>
          <Stack direction="row" alignItems="center" gap={2}>
            <Typography variant="h5" fontWeight="bold">
              {user.name}
            </Typography>
            {user.isAdmin && <img src="/verified.png" alt="Verified" style={{ width: 16, height: 16 }} />}
          </Stack>
          <Stack direction="row" gap={2} alignItems="center">
            <Typography variant="body2">{user.username}</Typography>
            <Typography variant="caption" bgcolor="gray" color="white" p={1} borderRadius="16px">
              NRBLOG.net
            </Typography>
          </Stack>
        </Box>
        <Box>
          {user.profilePic ? (
            <Avatar alt={user.name} src={user.profilePic} sx={{ width: 56, height: 56 }} />
          ) : (
            <Avatar alt={user.name} src="https://bit.ly/broken-link" sx={{ width: 56, height: 56 }} />
          )}
        </Box>
      </Stack>

      <Typography>{user.bio}</Typography>

      {currentUser?._id === user._id && (
        <Button component={RouterLink} to="/update" variant="contained" size="small">
          Update Profile
        </Button>
      )}
      {currentUser?._id !== user._id && (
        <Stack direction="row" gap={2}>
          <Button variant="contained" size="small" onClick={handleFollowUnfollow} disabled={updating}>
            {following ? 'Unfollow' : 'Follow'}
          </Button>
          {currentUser?.isAdmin && (
            <Button variant="contained" size="small" onClick={() => handleBanUnban(user.isBanned ? 'unban' : 'ban')}>
              {user.isBanned ? 'Unban' : 'Ban'}
            </Button>
          )}
          {currentUser?.username === 'adminblog' && !user.isAdmin && (
            <Button variant="contained" size="small" onClick={handlePromoteToAdmin}>
              Promote to Admin
            </Button>
          )}
        </Stack>
      )}
      <Stack direction="row" justifyContent="space-between" width="100%">
        <Stack direction="row" gap={2} alignItems="center">
          <Typography color="gray">{user.followers.length} followers</Typography>
          <Box width="1px" height="1px" bgcolor="gray" borderRadius="50%"></Box>
          <Typography color="gray">instagram.com</Typography>
        </Stack>
        <Stack direction="row">
          <IconButton>
            <BsInstagram size={24} />
          </IconButton>
          <Menu>
            <IconButton>
              <CgMoreO size={24} />
            </IconButton>
            <Menu
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={copyURL}>Copy link</MenuItem>
            </Menu>
          </Menu>
        </Stack>
      </Stack>

      <Stack direction="row" width="100%">
        <Stack flex={1} borderBottom="1.5px solid white" justifyContent="center" pb="3" sx={{ cursor: 'pointer' }}>
          <Typography fontWeight="bold">NRBLOG</Typography>
        </Stack>
        <Stack flex={1} borderBottom="1px solid gray" justifyContent="center" color="gray" pb="3" sx={{ cursor: 'pointer' }}>
          <Typography fontWeight="bold">Replies</Typography>
        </Stack>
      </Stack>
    </motion.div>
  );
};

export default UserHeader;

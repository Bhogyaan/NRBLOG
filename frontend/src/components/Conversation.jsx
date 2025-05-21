import React from 'react';
import { Avatar, Box, Stack, Typography, Badge } from '@mui/material';
import { useRecoilState, useRecoilValue } from 'recoil';
import userAtom from '../atoms/userAtom';
import { BsCheck2All, BsFillImageFill } from 'react-icons/bs';
import { selectedConversationAtom } from '../atoms/messagesAtom';
import { motion } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from '@mui/material/styles';

const Conversation = ({ conversation, isOnline, isLoading }) => {
  const user = conversation.participants[0];
  const currentUser = useRecoilValue(userAtom);
  const lastMessage = conversation.lastMessage;
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const theme = useTheme();

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" p={1} gap={2}>
        <Skeleton circle width={40} height={40} />
        <Stack direction="column" gap={1}>
          <Skeleton width={100} />
          <Skeleton width={150} />
        </Stack>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box
        display="flex"
        alignItems="center"
        p={1}
        gap={2}
        sx={{
          cursor: 'pointer',
          borderRadius: '8px',
          bgcolor:
            selectedConversation?._id === conversation._id
              ? theme.palette.mode === 'light'
                ? 'gray.300'
                : 'gray.700'
              : 'transparent',
          '&:hover': {
            bgcolor: theme.palette.mode === 'light' ? 'gray.300' : 'gray.700',
            color: 'white',
          },
        }}
        onClick={() =>
          setSelectedConversation({
            _id: conversation._id,
            userId: user._id,
            userProfilePic: user.profilePic,
            username: user.username,
            mock: conversation.mock,
          })
        }
      >
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          variant="dot"
          sx={{
            bgcolor: isOnline ? 'green' : 'transparent',
          }}
        >
          <Avatar alt={user.username} src={user.profilePic} />
        </Badge>

        <Stack direction="column" gap={1}>
          <Typography fontWeight="bold" display="flex" alignItems="center">
            {user.username}
            <img src="/verified.png" alt="Verified" style={{ width: 16, height: 16, marginLeft: 4 }} />
          </Typography>
          <Typography variant="caption" display="flex" alignItems="center" gap={1}>
            {currentUser._id === lastMessage.sender && (
              <Box sx={{ color: lastMessage.seen ? 'blue' : '' }}>
                <BsCheck2All size={16} />
              </Box>
            )}
            {lastMessage.text.length > 18
              ? lastMessage.text.substring(0, 18) + '...'
              : lastMessage.text || <BsFillImageFill size={16} />}
          </Typography>
        </Stack>
      </Box>
    </motion.div>
  );
};

export default Conversation;

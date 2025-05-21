import React, { useState } from 'react';
import { Avatar, Box, Typography, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { BsThreeDots } from 'react-icons/bs';
import Actions from './Actions';
import { motion } from 'framer-motion';


const UserPost = ({ postImg, postTitle, likes, replies }) => {
  const [liked, setLiked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ marginBottom: '16px', padding: '20px 0' }}
    >
      <Link to="/markzuckerberg/post/1" style={{ textDecoration: 'none', color: 'inherit' }}>
        <Stack direction="row" gap={3} alignItems="flex-start">
          <Stack direction="column" alignItems="center">
            <Avatar alt="Mark Zuckerberg" src="/zuck-avatar.png" sx={{ width: 40, height: 40 }} />
            <Box sx={{ width: '1px', height: '100%', bgcolor: 'gray.300', my: 2 }}></Box>
            <Box position="relative" width="100%">
              <Avatar
                alt="John Doe"
                src="https://bit.ly/dan-abramov"
                sx={{ width: 24, height: 24, position: 'absolute', top: '0px', left: '15px', padding: '2px' }}
              />
              <Avatar
                alt="John Doe"
                src="https://bit.ly/sage-adebayo"
                sx={{ width: 24, height: 24, position: 'absolute', bottom: '0px', right: '-5px', padding: '2px' }}
              />
              <Avatar
                alt="John Doe"
                src="https://bit.ly/prosper-baba"
                sx={{ width: 24, height: 24, position: 'absolute', bottom: '0px', left: '4px', padding: '2px' }}
              />
            </Box>
          </Stack>

          <Stack direction="column" gap={2} flex={1}>
            <Stack direction="row" justifyContent="space-between" width="100%">
              <Stack direction="row" alignItems="center">
                <Typography variant="body2" fontWeight="bold">
                  markzuckerberg
                </Typography>
                <img src="/verified.png" alt="Verified" style={{ width: 16, height: 16, marginLeft: 4 }} />
              </Stack>
              <Stack direction="row" gap={2} alignItems="center">
                <Typography variant="caption" color="gray">
                  1d
                </Typography>
                <BsThreeDots />
              </Stack>
            </Stack>

            <Typography variant="body2">{postTitle}</Typography>

            {postImg && (
              <Box borderRadius={6} overflow="hidden" border="1px solid" borderColor="gray.300">
                <img src={postImg} alt="Post" style={{ width: '100%' }} />
              </Box>
            )}

            <Stack direction="row" gap={3} my={1}>
              <Actions liked={liked} setLiked={setLiked} />
            </Stack>

            <Stack direction="row" gap={2} alignItems="center">
              <Typography variant="caption" color="gray">
                {replies} replies
              </Typography>
              <Box sx={{ width: '4px', height: '4px', borderRadius: '50%', bgcolor: 'gray.300' }}></Box>
              <Typography variant="caption" color="gray">
                {likes} likes
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Link>
    </motion.div>
  );
};

export default UserPost;

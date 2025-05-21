import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import SuggestedUser from './SuggestedUser';
import useShowToast from '../hooks/useShowToast';
import { motion } from 'framer-motion';

const SuggestedUsers = () => {
  const [loading, setLoading] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const showToast = useShowToast();

  useEffect(() => {
    const getSuggestedUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/users/suggested');
        const data = await res.json();
        if (data.error) {
          showToast('Error', data.error, 'error');
          return;
        }
        // Filter out invalid users (missing _id)
        const validUsers = Array.isArray(data) ? data.filter((user) => user && user._id) : [];
        setSuggestedUsers(validUsers);
      } catch (error) {
        showToast('Error', error.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    getSuggestedUsers();
  }, [showToast]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Typography
        variant="h5"
        mb={2}
        fontWeight="bold"
        color="text.primary"
        sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
      >
        Suggested Users
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: { xs: 1.5, sm: 2 },
          overflowX: 'auto',
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
          py: 2,
          px: { xs: 1, sm: 2 },
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        {!loading && suggestedUsers.length > 0 ? (
          suggestedUsers.map((user) => (
            <Box
              key={user._id}
              sx={{
                flex: '0 0 auto',
                width: { xs: '140px', sm: '160px' },
              }}
            >
              <SuggestedUser user={user} />
            </Box>
          ))
        ) : !loading && suggestedUsers.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ width: '100%', py: 2 }}>
            No suggested users available.
          </Typography>
        ) : (
          [0, 1, 2, 3, 4].map((_, idx) => (
            <Box
              key={idx}
              sx={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: { xs: '12px', sm: '16px' },
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                width: { xs: '140px', sm: '160px' },
                height: '180px',
              }}
            >
              <Skeleton circle={true} width={64} height={64} baseColor="#333" highlightColor="#444" />
              <Box sx={{ mt: 1, width: '80%', textAlign: 'center' }}>
                <Skeleton height={10} width="60%" baseColor="#333" highlightColor="#444" />
                <Skeleton height={8} width="70%" baseColor="#333" highlightColor="#444" sx={{ mt: 1 }} />
              </Box>
              <Skeleton height={24} width={80} baseColor="#333" highlightColor="#444" sx={{ mt: 2 }} />
            </Box>
          ))
        )}
      </Box>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} color="primary" />
        </Box>
      )}
    </motion.div>
  );
};

export default SuggestedUsers;


// Loading skeletons for suggested users, if u want to copy and paste as shown in the tutorial

// <Flex key={idx} gap={2} alignItems={"center"} p={"1"} borderRadius={"md"}>
// 							{/* avatar skeleton */}
// 							<Box>
// 								<SkeletonCircle size={"10"} />
// 							</Box>
// 							{/* username and fullname skeleton */}
// 							<Flex w={"full"} flexDirection={"column"} gap={2}>
// 								<Skeleton h={"8px"} w={"80px"} />
// 								<Skeleton h={"8px"} w={"90px"} />
// 							</Flex>
// 							{/* follow button skeleton */}
// 							<Flex>
// 								<Skeleton h={"20px"} w={"60px"} />
// 							</Flex>
// 						</Flex>

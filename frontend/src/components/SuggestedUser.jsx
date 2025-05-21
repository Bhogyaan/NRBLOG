import React from 'react';
import { Avatar, Box, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import useFollowUnfollow from '../hooks/useFollowUnfollow';
import { motion } from 'framer-motion';

const SuggestedUser = ({ user }) => {
  // Safeguard: Don’t render if user is missing critical data
  if (!user || !user._id) {
    return null; // Skip rendering if user is invalid
  }

  const { handleFollowUnfollow, following, updating } = useFollowUnfollow(user);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          padding: { xs: '12px', sm: '16px' },
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: { xs: '140px', sm: '160px' },
          maxWidth: '100%',
          mx: 'auto',
        }}
      >
        {/* Profile Image */}
        <Box
          component={Link}
          to={`/${user.username}`}
          sx={{
            textDecoration: 'none',
          }}
        >
          <Avatar
            src={user.profilePic || ''} // Fallback to empty string if undefined
            sx={{
              width: { xs: 56, sm: 64 },
              height: { xs: 56, sm: 64 },
              border: '2px solid #fff',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          />
        </Box>

        {/* Username */}
        <Box
          component={Link}
          to={`/${user.username}`}
          sx={{
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="body2"
            fontWeight="bold"
            color="text.primary"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.username || 'Unknown'} {/* Fallback */}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.name || 'No Name'} {/* Fallback */}
          </Typography>
        </Box>

        {/* Follow/Unfollow Button */}
        <Button
          variant="contained"
          size="small"
          onClick={handleFollowUnfollow}
          disabled={updating}
          sx={{
            bgcolor: following ? 'background.paper' : 'primary.main',
            color: following ? 'text.primary' : 'white',
            borderRadius: '20px',
            minWidth: '80px',
            padding: { xs: '4px 8px', sm: '6px 12px' },
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            textTransform: 'none',
            '&:hover': {
              bgcolor: following ? 'grey.800' : 'primary.dark',
              opacity: 0.9,
            },
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          {following ? 'Unfollow' : 'Follow'}
        </Button>
      </Box>
    </motion.div>
  );
};

export default SuggestedUser;


//  SuggestedUser component, if u want to copy and paste as shown in the tutorial

{
	/* <Flex gap={2} justifyContent={"space-between"} alignItems={"center"}>
			<Flex gap={2} as={Link} to={`${user.username}`}>
				<Avatar src={user.profilePic} />
				<Box>
					<Text fontSize={"sm"} fontWeight={"bold"}>
						{user.username}
					</Text>
					<Text color={"gray.light"} fontSize={"sm"}>
						{user.name}
					</Text>
				</Box>
			</Flex>
			<Button
				size={"sm"}
				color={following ? "black" : "white"}
				bg={following ? "white" : "blue.400"}
				onClick={handleFollow}
				isLoading={updating}
				_hover={{
					color: following ? "black" : "white",
					opacity: ".8",
				}}
			>
				{following ? "Unfollow" : "Follow"}
			</Button>
		</Flex> */
}

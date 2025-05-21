import React, { useState, useEffect } from 'react';
import { Box, IconButton, Modal, Typography, Menu, MenuItem, Avatar } from '@mui/material';
import { Close as CloseIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { motion, useAnimation } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import useShowToast from '../hooks/useShowToast';

const Story = ({ story, style = 'whatsapp' }) => {
  const [isViewed, setIsViewed] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const progressControls = useAnimation();
  const showToast = useShowToast();
  const [progress, setProgress] = useState(0);
  const [userProfile, setUserProfile] = useState({
    username: story.username || 'Unknown',
    profilePic: story.profilePic || '',
  });

  useEffect(() => {
    // Fetch user profile if not fully populated
    if (!story.username || !story.profilePic) {
      const fetchUserProfile = async () => {
        try {
          const response = await fetch(`/api/users/${story.postedBy._id}`); // Extract _id from postedBy
          if (response.ok) {
            const userData = await response.json();
            setUserProfile({
              username: userData.username,
              profilePic: userData.profilePic,
            });
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
        }
      };
      fetchUserProfile();
    }
  }, [story.postedBy, story.username, story.profilePic]);

  const handleView = () => {
    setIsViewed(true);
    setOpen(true);
    if (style === 'whatsapp') {
      // Reset progress
      setProgress(0);
      progressControls.start({
        width: '100%',
        transition: {
          duration: story.mediaType === 'image' ? 5 : Math.min(story.duration, 30),
          ease: 'linear',
          onUpdate: (latest) => {
            setProgress(Math.round(latest * 100));
          }
        },
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setMenuAnchor(null);
    progressControls.stop();
    setProgress(0);
  };

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/stories/${story._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        showToast("Success", "Story deleted successfully", "success");
        handleClose();
      } else {
        const errorData = await response.json();
        showToast("Error", errorData.error || "Failed to delete story", "error");
      }
    } catch (error) {
      showToast("Error", `Failed to delete story: ${error.message}`, "error");
    }
    handleMenuClose();
  };

  useEffect(() => {
    let timer;
    if (open && (story.mediaType === 'video' || story.mediaType === 'audio')) {
      timer = setTimeout(() => {
        handleClose();
      }, Math.min(story.duration, 30) * 1000);
    }
    return () => clearTimeout(timer);
  }, [open, story.mediaType, story.duration]);

  const previewStyles = {
    whatsapp: {
      width: '70px',
      height: '70px',
      borderRadius: '50%',
      border: isViewed ? '2px solid gray' : '3px solid #25D366',
      cursor: 'pointer',
      overflow: 'hidden',
      position: 'relative',
    },
  };

  const modalContentStyles = {
    whatsapp: {
      bgcolor: '#111b21',
      color: '#fff',
      maxWidth: '400px',
      width: '100%',
      height: '80vh',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    },
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={previewStyles[style]}
        onClick={handleView}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            overflow: 'hidden',
          }}
        >
          {story.mediaType === 'image' && (
            <img
              src={story.media}
              alt="Story"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          {story.mediaType === 'video' && (
            <video
              src={story.media}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              muted
              autoPlay
              loop
            />
          )}
          {story.mediaType === 'audio' && (
            <Box
              sx={{
                bgcolor: 'gray.200',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography color="text.primary">Audio</Typography>
            </Box>
          )}
        </Box>
      </motion.div>

      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            ...modalContentStyles[style],
          }}
        >
          {/* WhatsApp-style header with progress bar */}
          {style === 'whatsapp' && (
            <Box sx={{
              position: 'relative',
              width: '100%',
              padding: '8px 16px',
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 1
            }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    src={userProfile.profilePic}
                    alt={userProfile.username}
                    sx={{ width: 32, height: 32, mr: 1 }}
                  />
                  <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>
                    {userProfile.username}
                  </Typography>
                </Box>
                <Typography sx={{ color: '#fff', fontSize: '0.7rem' }}>
                  {formatDistanceToNow(new Date(story.createdAt))} ago
                </Typography>
              </Box>

              {/* Progress bar container */}
              <Box sx={{
                width: '100%',
                height: '2px',
                bgcolor: 'rgba(255, 255, 255, 0.3)',
                mt: 1,
                position: 'relative'
              }}>
                <motion.div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${progress}%`,
                    background: '#25D366',
                  }}
                  animate={progressControls}
                />
              </Box>
            </Box>
          )}

          {/* Media content */}
          <Box sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {story.mediaType === 'image' && (
              <img
                src={story.media}
                alt="Story"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#000'
                }}
              />
            )}
            {story.mediaType === 'video' && (
              <video
                src={story.media}
                controls={false}
                autoPlay
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#000'
                }}
              />
            )}
            {story.mediaType === 'audio' && (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#000',
                }}
              >
                <Typography sx={{ mb: 2, color: '#fff' }}>
                  Audio Story
                </Typography>
                <audio
                  controls
                  src={story.media}
                  style={{ width: '80%' }}
                  autoPlay
                />
              </Box>
            )}

            {/* Close button */}
            <IconButton
              onClick={handleClose}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: '#fff',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                }
              }}
            >
              <CloseIcon />
            </IconButton>

            {/* More options menu */}
            <IconButton
              onClick={handleMenuOpen}
              sx={{
                position: 'absolute',
                top: 8,
                right: 48,
                color: '#fff',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                }
              }}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  bgcolor: '#2a3942',
                  color: '#fff',
                },
              }}
            >
              <MenuItem onClick={handleDelete} sx={{ color: 'red' }}>
                Delete Story
              </MenuItem>
            </Menu>
          </Box>

          {/* Caption/text description (WhatsApp style) */}
          {story.caption && (
            <Box sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              p: 2,
              maxHeight: '30%',
              overflowY: 'auto',
            }}>
              <Typography sx={{
                color: '#fff',
                fontSize: '0.9rem',
                lineHeight: 1.4,
                whiteSpace: 'pre-line'
              }}>
                {story.caption}
              </Typography>
            </Box>
          )}
        </Box>
      </Modal>
    </>
  );
};

export default Story;

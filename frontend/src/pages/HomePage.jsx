import { useState, useEffect, useCallback } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import {
  Avatar,
  Box,
  IconButton,
  Typography,
  Skeleton,
  useMediaQuery,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Button,
} from "@mui/material";
import {
  Add as AddIcon,
  MoreVert,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import postsAtom from "../atoms/postsAtom";
import userAtom from "../atoms/userAtom";
import { conversationsAtom, selectedConversationAtom } from "../atoms/messagesAtom";
import Post from "../components/Post";
import SuggestedUsers from "../components/SuggestedUsers";
import BottomNav from "../components/BottomNav";
import MessageContainer from "../components/MessageContainer";
import useShowToast from "../hooks/useShowToast";
import { useSocket } from "../context/SocketContext";
import CreatePost from "../components/CreatePost";

const HomePage = () => {
  const [postsState, setPostsState] = useRecoilState(postsAtom);
  const user = useRecoilValue(userAtom);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const isSmallScreen = useMediaQuery("(max-width:500px)");
  const isMediumScreen = useMediaQuery("(min-width:501px) and (max-width:900px)");
  const isLargeScreen = useMediaQuery("(min-width:901px)");
  const navigate = useNavigate();
  const showToast = useShowToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const { socket, onlineUsers } = useSocket();

  const fetchPosts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setFetchError(null);
      const endpoint = user?.isAdmin ? "/api/posts/all" : "/api/posts/feed";
      const token = localStorage.getItem("token");
      const res = await fetch(endpoint, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) {
        setFetchError(data.error);
        showToast("Error", data.error, "error");
        return;
      }
      if (!Array.isArray(data)) {
        setFetchError("Invalid data format");
        return;
      }
      setPostsState((prev) => ({ ...prev, posts: data }));
    } catch (error) {
      setFetchError(error.message);
      showToast("Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, showToast, setPostsState]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleBanUnbanPost = async (postId, isBanned) => {
    if (!user?.isAdmin) {
      showToast("Error", "Admin access required", "error");
      return;
    }
    try {
      const endpoint = isBanned ? `/api/posts/unban/${postId}` : `/api/posts/ban/${postId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      showToast("Success", isBanned ? "Post unbanned" : "Post banned", "success");
      setPostsState((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => (p._id === postId ? { ...p, isBanned: !isBanned } : p)),
      }));
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  useEffect(() => {
    if (!socket) {
      console.warn("Socket is not initialized in HomePage");
      return;
    }

    socket.on("newPost", (post) => {
      if (user?.isAdmin || user?.following?.includes(post.postedBy._id)) {
        setPostsState((prev) => ({
          ...prev,
          posts: [post, ...(prev.posts || [])],
        }));
      }
    });

    socket.on("postDeleted", ({ postId }) => {
      setPostsState((prev) => ({
        ...prev,
        posts: (prev.posts || []).filter((p) => p._id !== postId),
      }));
    });

    socket.on("messagesSeen", ({ conversationId }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, lastMessage: { ...conv.lastMessage, seen: true } } : conv
        )
      );
    });

    socket.on("newMessage", (message) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === message.conversationId
            ? { ...conv, lastMessage: { text: message.text, sender: message.sender } }
            : conv
        )
      );
    });

    return () => {
      socket.off("newPost");
      socket.off("postDeleted");
      socket.off("messagesSeen");
      socket.off("newMessage");
    };
  }, [socket, setPostsState, setConversations, user]);

  useEffect(() => {
    const getConversations = async () => {
      setLoadingConversations(true);
      try {
        const res = await fetch("/api/messages/conversations", {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          return;
        }
        setConversations(data);
      } catch (error) {
        showToast("Error", error.message, "error");
      } finally {
        setLoadingConversations(false);
      }
    };
    getConversations();
  }, [setConversations, showToast]);

  const ChatFeature = () => {
    const [followingDetails, setFollowingDetails] = useState({});
    const [error, setError] = useState(null);
    const { socket, onlineUsers } = useSocket();
    const theme = useTheme();

    useEffect(() => {
      const fetchFollowingDetails = async () => {
        if (!user?.following?.length) {
          setFollowingDetails({});
          setError(null);
          return;
        }
        try {
          const res = await fetch("/api/users/multiple", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            credentials: "include",
            body: JSON.stringify({ ids: user.following }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          const detailsMap = data.reduce((acc, following) => ({
            ...acc,
            [following._id]: { _id: following._id, username: following.username, profilePic: following.profilePic },
          }), {});
          setFollowingDetails(detailsMap);
          setError(null);
        } catch (error) {
          console.error("Error fetching following details:", error);
          setError("Failed to load following details.");
          setFollowingDetails({});
        }
      };
      fetchFollowingDetails();
    }, [user?.following]);

    useEffect(() => {
      if (!socket || !user?._id) return;

      const handleUserFollowed = ({ followedId, follower }) => {
        if (follower._id === user._id) {
          fetchFollowingDetails();
        }
      };

      const handleUserUnfollowed = ({ unfollowedId, followerId }) => {
        if (followerId === user._id) {
          setFollowingDetails((prev) => {
            const newDetails = { ...prev };
            delete newDetails[unfollowedId];
            return newDetails;
          });
        }
      };

      socket.on("userFollowed", handleUserFollowed);
      socket.on("userUnfollowed", handleUserUnfollowed);

      return () => {
        socket.off("userFollowed", handleUserFollowed);
        socket.off("userUnfollowed", handleUserUnfollowed);
      };
    }, [socket, user?._id]);

    const allFollowing = Object.values(followingDetails);

    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 1,
            bgcolor: "primary.main",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Following (Online)
          </Typography>
        </Box>
        <Box sx={{ flex: 1, overflowY: "auto", p: 1, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
          {error ? (
            <Typography variant="body2" color="error" sx={{ p: 2, textAlign: "center" }}>
              {error}
            </Typography>
          ) : allFollowing.length > 0 ? (
            allFollowing.map((following) => {
              const isOnline = onlineUsers.includes(following._id);
              const badgeColor = isOnline ? "#90EE90" : "#808080";

              return (
                <motion.div
                  key={following._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ListItem
                    sx={{
                      "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
                      py: 1,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      const newConversation = {
                        _id: `temp_${following._id}`,
                        participants: [user._id, following._id],
                        lastMessage: { text: "", sender: "" },
                      };
                      setConversations((prev) => [newConversation, ...prev]);
                      setSelectedConversation(newConversation);
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        variant="dot"
                        sx={{
                          "& .MuiBadge-badge": {
                            backgroundColor: badgeColor,
                            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                          },
                        }}
                      >
                        <Avatar src={following.profilePic} sx={{ width: 32, height: 32 }} />
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.primary">
                          {following.username}
                        </Typography>
                      }
                    />
                  </ListItem>
                </motion.div>
              );
            })
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              No following users available
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const renderPostsWithSuggestedUsers = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {[1, 2, 3].map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Box sx={{ p: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ ml: 1 }}>
                    <Skeleton variant="text" width={100} />
                    <Skeleton variant="text" width={80} />
                  </Box>
                </Box>
                <Skeleton variant="rectangular" height={200} />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
              </Box>
            </motion.div>
          ))}
        </Box>
      );
    }

    if (fetchError) {
      return (
        <Box sx={{ textAlign: "center", my: 2 }}>
          <Typography color="error">Failed to load posts: {fetchError}</Typography>
          <Button onClick={fetchPosts} variant="outlined" sx={{ mt: 1 }}>
            Retry
          </Button>
        </Box>
      );
    }

    if (!postsState.posts?.length) {
      return (
        <Typography variant="h6" textAlign="center" sx={{ my: 2 }}>
          No posts available.
        </Typography>
      );
    }

    const content = [];
    postsState.posts.forEach((post, index) => {
      content.push(
        <motion.div
          key={post._id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Post
            post={post}
            postedBy={post.postedBy}
            isAdminView={user?.isAdmin}
            onBanUnbanPost={handleBanUnbanPost}
          />
        </motion.div>
      );

      if (index === 1) {
        content.push(
          <motion.div
            key="suggested-users"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ marginTop: index === 0 ? "16px" : "0" }}
          >
            <Box sx={{ py: 2 }}>
              <SuggestedUsers />
            </Box>
          </motion.div>
        );
      }
    });

    return <Box sx={{ display: "flex", flexDirection: "column", pt: 3 }}>{content}</Box>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Box sx={{ pb: isSmallScreen ? 8 : 0 }}>
        {isLargeScreen && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              height: "100vh",
              overflowY: "hidden",
            }}
          >
            <Box
              sx={{
                flex: "1 1 80%",
                overflowY: "auto",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              {renderPostsWithSuggestedUsers()}
            </Box>
            <Box
              sx={{
                flex: "0 0 20%",
                minWidth: "200px",
                overflowY: "hidden",
              }}
            >
              {selectedConversation._id ? (
                <MessageContainer isMobile={false} />
              ) : (
                <ChatFeature />
              )}
            </Box>
          </Box>
        )}

        {isMediumScreen && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              height: "100vh",
              overflowY: "hidden",
            }}
          >
            <Box
              sx={{
                flex: "1 1 80%",
                overflowY: "auto",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              {renderPostsWithSuggestedUsers()}
            </Box>
            <Box
              sx={{
                flex: "0 0 20%",
                minWidth: "150px",
                overflowY: "hidden",
              }}
            >
              {selectedConversation._id ? (
                <MessageContainer isMobile={false} />
              ) : (
                <ChatFeature />
              )}
            </Box>
          </Box>
        )}

        {isSmallScreen && (
          <Box
            sx={{
              width: "100%",
              height: "calc(100vh - 56px)",
              overflowY: "auto",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {selectedConversation._id ? (
              <MessageContainer isMobile={true} />
            ) : (
              renderPostsWithSuggestedUsers()
            )}
          </Box>
        )}

        {(isMediumScreen || isLargeScreen) && (
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            style={{ position: "fixed", bottom: 16, right: 16 }}
          >
            <IconButton
              color="primary"
              aria-label="Create Post"
              onClick={() => setModalOpen(true)}
              sx={{
                width: 56,
                height: 56,
                boxShadow: 3,
                bgcolor: "#8515fe",
                color: "white",
                "&:hover": { bgcolor: "#6d12cc" },
              }}
            >
              <AddIcon />
            </IconButton>
          </motion.div>
        )}

        <CreatePost
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onPostCreated={() => {
            fetchPosts();
          }}
          isDrawer={isSmallScreen}
        />
      </Box>
      {isSmallScreen && <BottomNav user={user} />}
    </motion.div>
  );
};

export default HomePage;

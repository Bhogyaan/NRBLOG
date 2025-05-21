import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { motion } from "framer-motion";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Tabs,
  Tab,
  useMediaQuery,
  TextField,
  Grid,
} from "@mui/material";
import {
  Dashboard,
  People,
  Block,
  Edit,
  ExitToApp,
  Search,
  Verified as VerifiedIcon,
} from "@mui/icons-material";
import { ConfigProvider, App, message } from "antd";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import { useSocket } from "../context/SocketContext";
import useShowToast from "../hooks/useShowToast";
import Post from "../components/Post";
import AdminDashboard from "./AdminDashboard";

const AdminProfilePage = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingPosts, setFetchingPosts] = useState(true);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [postsState, setPostsState] = useRecoilState(postsAtom);
  const currentUser = useRecoilValue(userAtom);
  const setCurrentUser = useSetRecoilState(userAtom);
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const isMediumScreen = useMediaQuery("(max-width:960px)");
  const [tabValue, setTabValue] = useState(0);
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const showToast = useShowToast();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!socket) {
      console.warn("Socket is not initialized in AdminProfilePage");
      return;
    }

    socket.on("newPost", (post) => {
      setPostsState((prev) => ({
        ...prev,
        posts: [post, ...prev.posts],
      }));
      showToast("New Post", "A new post has been created", "info");
    });

    socket.on("postDeleted", ({ postId }) => {
      setPostsState((prev) => ({
        ...prev,
        posts: prev.posts.filter((p) => p._id !== postId),
      }));
      showToast("Post Deleted", "A post has been deleted", "info");
    });

    socket.on("userStatusUpdate", ({ userId, isBanned }) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isBanned } : u))
      );
    });

    return () => {
      socket.off("newPost");
      socket.off("postDeleted");
      socket.off("userStatusUpdate");
    };
  }, [socket, setPostsState, showToast]);

  useEffect(() => {
    const getUser = async () => {
      try {
        let userData;
        if (currentUser && currentUser.username === username) {
          userData = currentUser;
        } else {
          const userRes = await fetch(`/api/users/profile/${username}`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          userData = await userRes.json();
          if (!userRes.ok) throw new Error(userData.error || "User profile not found");
        }
        setUser(userData);
      } catch (error) {
        message.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    const getAllPosts = async () => {
      try {
        const res = await fetch("/api/posts/all", {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setPostsState((prev) => ({ ...prev, posts: data }));
      } catch (error) {
        message.error(error.message);
      } finally {
        setFetchingPosts(false);
      }
    };

    const getAllUsers = async () => {
      try {
        const res = await fetch("/api/users/all", {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setUsers(data);
      } catch (error) {
        message.error(error.message);
      } finally {
        setFetchingUsers(false);
      }
    };

    if (currentUser?.isAdmin) {
      getUser();
      getAllPosts();
      getAllUsers();
    }
  }, [username, currentUser, setPostsState]);

  const handleLogout = () => {
    localStorage.removeItem("user-NRBLOG");
    localStorage.removeItem("token");
    setCurrentUser(null);
    navigate("/auth");
    message.success("Logged out successfully");
  };

  const handleEditProfile = () => {
    navigate("/edit-profile");
  };

  const handleBanUnbanPost = async (postId, isBanned) => {
    try {
      const endpoint = isBanned ? `/api/posts/unban/${postId}` : `/api/posts/ban/${postId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPostsState((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => (p._id === postId ? { ...p, isBanned: !isBanned } : p)),
      }));
      socket?.emit("postStatusUpdate", { postId, isBanned: !isBanned });
      showToast("Success", data.message, "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleBanUnbanUser = async (userId, isBanned) => {
    try {
      const endpoint = isBanned ? `/api/users/unban/${userId}` : `/api/users/ban/${userId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isBanned: !isBanned } : u))
      );
      socket?.emit("userStatusUpdate", { userId, isBanned: !isBanned });
      showToast("Success", data.message, "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  if (!currentUser?.isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6" color="text.primary">
          Admin access required
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography variant="h6" color="text.primary">User not found</Typography>
      </Box>
    );
  }

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#8515fe",
          borderRadius: 8,
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
      }}
    >
      <App>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Box sx={{ minHeight: "100vh", px: { xs: 2, sm: 3, md: 4 }, py: 3, bgcolor: "#1a1a1a" }}>
            {/* Profile Card */}
            <Card
              sx={{
                mb: 3,
                p: { xs: 2, sm: 3 },
                maxWidth: 800,
                mx: "auto",
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                border: "2px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
                transition: "transform 0.3s",
                "&:hover": { transform: "scale(1.02)" },
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4} sx={{ textAlign: "center" }}>
                  <Avatar
                    src={user.profilePic}
                    alt={user.username}
                    sx={{
                      width: { xs: 80, sm: 120 },
                      height: { xs: 80, sm: 120 },
                      border: "3px solid rgba(255, 255, 255, 0.3)",
                      mx: "auto",
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 500, color: "text.primary", mr: 1 }}>
                      {user.username}
                    </Typography>
                    <VerifiedIcon color="primary" fontSize="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {user.bio || "Admin User"}
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {[
                      { label: "Posts", value: postsState.posts.length },
                      { label: "Users", value: users.length },
                      { label: "Likes", value: postsState.posts.reduce((total, post) => total + post.likes.length, 0) },
                      { label: "Comments", value: postsState.posts.reduce((total, post) => total + post.comments.length, 0) },
                    ].map((stat) => (
                      <Grid item xs={6} sm={3} key={stat.label}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stat.label}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleEditProfile}
                      startIcon={<Edit />}
                      sx={{
                        borderRadius: 20,
                        px: 3,
                        bgcolor: "primary.main",
                        "&:hover": { bgcolor: "#6b12cb", transform: "scale(1.05)" },
                        transition: "transform 0.2s",
                      }}
                    >
                      Edit Profile
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleLogout}
                      startIcon={<ExitToApp />}
                      sx={{
                        borderRadius: 20,
                        px: 3,
                        borderColor: "text.secondary",
                        color: "text.secondary",
                        "&:hover": { borderColor: "text.primary", color: "text.primary", transform: "scale(1.05)" },
                        transition: "transform 0.2s",
                      }}
                    >
                      Logout
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Card>

            {/* Tabs */}
            <Box
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 1000,
                bgcolor: "background.paper",
                borderRadius: 2,
                mb: 3,
                border: "2px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
              }}
            >
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                variant={isSmallScreen ? "scrollable" : "standard"}
                scrollButtons={isSmallScreen}
                centered={!isSmallScreen}
                sx={{
                  "& .MuiTab-root": {
                    fontWeight: 500,
                    px: { xs: 2, sm: 3 },
                    py: 1.5,
                    color: "text.secondary",
                    "&.Mui-selected": { color: "primary.main" },
                  },
                  "& .MuiTabs-indicator": { backgroundColor: "primary.main" },
                }}
              >
                <Tab icon={<Dashboard />} label="Dashboard" />
                <Tab icon={<People />} label="All Users" />
                <Tab icon={<Block />} label="Banned Posts" />
                <Tab icon={<Block />} label="Banned Users" />
                <Tab icon={<People />} label="Followers" />
                <Tab icon={<People />} label="Following" />
              </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ maxWidth: 1400, mx: "auto" }}>
              {tabValue === 0 && (
                <AdminDashboard
                  users={users}
                  posts={postsState.posts}
                  isSmallScreen={isSmallScreen}
                  isMediumScreen={isMediumScreen}
                />
              )}

              {tabValue === 1 && (
                <Box sx={{ py: 2 }}>
                  <TextField
                    placeholder="Search users by username"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ color: "text.secondary", mr: 1 }} />,
                    }}
                    sx={{
                      mb: 3,
                      width: "100%",
                      maxWidth: 500,
                      bgcolor: "background.paper",
                      borderRadius: 2,
                      "& .MuiInputBase-input": { py: 1.5, color: "text.primary" },
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                        "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.4)" },
                        "&.Mui-focused fieldset": { borderColor: "primary.main" },
                      },
                    }}
                  />
                  {fetchingUsers ? (
                    <CircularProgress sx={{ color: "primary.main" }} />
                  ) : filteredUsers.length === 0 ? (
                    <Typography color="text.primary">No users found</Typography>
                  ) : (
                    <Grid container spacing={2}>
                      {filteredUsers.map((user) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={user._id}>
                          <Card
                            sx={{
                              transition: "transform 0.3s",
                              "&:hover": { transform: "scale(1.02)" },
                              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                              border: "2px solid rgba(255, 255, 255, 0.3)",
                              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
                            }}
                          >
                            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                <Avatar
                                  src={user.profilePic}
                                  alt={user.username}
                                  sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, mr: 2 }}
                                />
                                <Box>
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 500, color: "text.primary", cursor: "pointer" }}
                                    onClick={() => navigate(`/${user.username}`)}
                                  >
                                    {user.username}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ID: {user._id.slice(0, 8)}...
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Typography
                                  variant="body2"
                                  sx={{ color: user.isBanned ? "#f44336" : "#4caf50" }}
                                >
                                  Status: {user.isBanned ? "Banned" : "Active"}
                                </Typography>
                                <Button
                                  variant="contained"
                                  color={user.isBanned ? "success" : "error"}
                                  onClick={() => handleBanUnbanUser(user._id, user.isBanned)}
                                  disabled={user.isAdmin}
                                  size="small"
                                  startIcon={<Block />}
                                  sx={{
                                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                                    px: 2,
                                    "&:hover": { transform: "scale(1.05)" },
                                    transition: "transform 0.2s",
                                  }}
                                >
                                  {user.isBanned ? "Unban" : "Ban"}
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}

              {tabValue === 2 && (
                <Box sx={{ py: 2 }}>
                  {fetchingPosts ? (
                    <CircularProgress sx={{ color: "primary.main" }} />
                  ) : postsState.posts.filter((p) => p.isBanned).length === 0 ? (
                    <Card sx={{ p: 3, textAlign: "center", background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))", border: "2px solid rgba(255, 255, 255, 0.3)" }}>
                      <Typography variant="body1" color="text.primary">No banned posts</Typography>
                    </Card>
                  ) : (
                    <Grid container spacing={2}>
                      {postsState.posts
                        .filter((p) => p.isBanned)
                        .map((post) => (
                          <Grid item xs={12} sm={6} md={4} key={post._id}>
                            <Card sx={{ position: "relative", background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))", border: "2px solid rgba(255, 255, 255, 0.3)" }}>
                              <Typography
                                sx={{
                                  position: "absolute",
                                  top: 8,
                                  left: 8,
                                  color: "#f44336",
                                  fontWeight: 600,
                                  bgcolor: "rgba(255,255,255,0.1)",
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 2,
                                }}
                              >
                                Banned
                              </Typography>
                              <CardContent>
                                <Post post={post} postedBy={post.postedBy} isAdminView={true} />
                                <Button
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleBanUnbanPost(post._id, true)}
                                  startIcon={<Block />}
                                  sx={{ mt: 1, width: "100%", "&:hover": { transform: "scale(1.05)" }, transition: "transform 0.2s" }}
                                >
                                  Unban Post
                                </Button>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  )}
                </Box>
              )}

              {tabValue === 3 && (
                <Box sx={{ py: 2 }}>
                  {fetchingUsers ? (
                    <CircularProgress sx={{ color: "primary.main" }} />
                  ) : users.filter((u) => u.isBanned).length === 0 ? (
                    <Card sx={{ p: 3, textAlign: "center", background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))", border: "2px solid rgba(255, 255, 255, 0.3)" }}>
                      <Typography variant="body1" color="text.primary">No banned users</Typography>
                    </Card>
                  ) : (
                    <Grid container spacing={2}>
                      {users
                        .filter((u) => u.isBanned)
                        .map((user) => (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={user._id}>
                            <Card sx={{ background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))", border: "2px solid rgba(255, 255, 255, 0.3)" }}>
                              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                  <Avatar
                                    src={user.profilePic}
                                    alt={user.username}
                                    sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, mr: 2 }}
                                  />
                                  <Box>
                                    <Typography
                                      variant="body1"
                                      sx={{ fontWeight: 500, color: "text.primary", cursor: "pointer" }}
                                      onClick={() => navigate(`/${user.username}`)}
                                    >
                                      {user.username}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      ID: {user._id.slice(0, 8)}...
                                    </Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                  <Typography variant="body2" sx={{ color: "#f44336" }}>
                                    Status: Banned
                                  </Typography>
                                  <Button
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleBanUnbanUser(user._id, true)}
                                    disabled={user.isAdmin}
                                    size="small"
                                    startIcon={<Block />}
                                    sx={{
                                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                                      px: 2,
                                      "&:hover": { transform: "scale(1.05)" },
                                      transition: "transform 0.2s",
                                    }}
                                  >
                                    Unban
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  )}
                </Box>
              )}

              {tabValue === 4 && (
                <Box sx={{ py: 2 }}>
                  {user.followers?.length === 0 ? (
                    <Card sx={{ p: 3, textAlign: "center", background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))", border: "2px solid rgba(255, 255, 255, 0.3)" }}>
                      <Typography variant="body1" color="text.primary">No followers yet</Typography>
                    </Card>
                  ) : (
                    <Grid container spacing={2}>
                      {user.followers.map((followerId) => (
                        <Grid item xs={12} sm={6} md={4} key={followerId}>
                          <FollowerCard followerId={followerId} currentUser={currentUser} navigate={navigate} />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}

              {tabValue === 5 && (
                <Box sx={{ py: 2 }}>
                  {user.following?.length === 0 ? (
                    <Card sx={{ p: 3, textAlign: "center", background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))", border: "2px solid rgba(255, 255, 255, 0.3)" }}>
                      <Typography variant="body1" color="text.primary">Not following anyone yet</Typography>
                    </Card>
                  ) : (
                    <Grid container spacing={2}>
                      {user.following.map((followingId) => (
                        <Grid item xs={12} sm={6} md={4} key={followingId}>
                          <FollowingCard followingId={followingId} currentUser={currentUser} navigate={navigate} />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </motion.div>
      </App>
    </ConfigProvider>
  );
};

const FollowerCard = ({ followerId, currentUser, navigate }) => {
  const [follower, setFollower] = useState(null);

  useEffect(() => {
    const fetchFollower = async () => {
      try {
        const res = await fetch(`/api/users/profile/${followerId}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) setFollower(data);
      } catch (error) {
        console.error("Error fetching follower:", error);
      }
    };
    fetchFollower();
  }, [followerId]);

  if (!follower) return null;

  return (
    <Card
      sx={{
        transition: "transform 0.3s",
        "&:hover": { transform: "scale(1.02)" },
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
      }}
    >
      {follower.isBanned && (
        <Typography
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            color: "#f44336",
            fontWeight: 600,
            bgcolor: "rgba(255,255,255,0.1)",
            px: 1,
            py: 0.5,
            borderRadius: 2,
            fontSize: "0.75rem",
          }}
        >
          Banned
        </Typography>
      )}
      <CardContent sx={{ display: "flex", alignItems: "center", p: { xs: 1.5, sm: 2 } }}>
        <Avatar src={follower.profilePic} sx={{ width: 40, height: 40, mr: 2 }} />
        <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: "text.primary", cursor: "pointer", mr: 1 }}
            onClick={() => navigate(`/${follower.username}`)}
          >
            {follower.username}
          </Typography>
          {follower.isVerified && (
            <VerifiedIcon color="primary" fontSize="small" />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const FollowingCard = ({ followingId, currentUser, navigate }) => {
  const [followingUser, setFollowingUser] = useState(null);

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const res = await fetch(`/api/users/profile/${followingId}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) setFollowingUser(data);
      } catch (error) {
        console.error("Error fetching following user:", error);
      }
    };
    fetchFollowing();
  }, [followingId]);

  if (!followingUser) return null;

  return (
    <Card
      sx={{
        transition: "transform 0.3s",
        "&:hover": { transform: "scale(1.02)" },
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
      }}
    >
      {followingUser.isBanned && (
        <Typography
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            color: "#f44336",
            fontWeight: 600,
            bgcolor: "rgba(255,255,255,0.1)",
            px: 1,
            py: 0.5,
            borderRadius: 2,
            fontSize: "0.75rem",
          }}
        >
          Banned
        </Typography>
      )}
      <CardContent sx={{ display: "flex", alignItems: "center", p: { xs: 1.5, sm: 2 } }}>
        <Avatar src={followingUser.profilePic} sx={{ width: 40, height: 40, mr: 2 }} />
        <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: "text.primary", cursor: "pointer", mr: 1 }}
            onClick={() => navigate(`/${followingUser.username}`)}
          >
            {followingUser.username}
          </Typography>
          {followingUser.isVerified && (
            <VerifiedIcon color="primary" fontSize="small" />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AdminProfilePage;
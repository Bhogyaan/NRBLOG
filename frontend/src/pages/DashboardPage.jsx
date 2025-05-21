import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { motion } from "framer-motion";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { message } from "antd";
import userAtom from "../atoms/userAtom";
import AnalyticsChart from "../components/AnalyticsChart";
import useShowToast from "../hooks/useShowToast";

const DashboardPage = () => {
  const user = useRecoilValue(userAtom);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const showToast = useShowToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const endpoint = user.isAdmin ? "/api/users/admin/realtime-dashboard" : "/api/users/dashboard";
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) {
          message.error(data.error);
          return;
        }
        setStats(data);
      } catch (error) {
        message.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    if (user.isAdmin) {
      const interval = setInterval(fetchStats, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleBanPost = async (postId) => {
    try {
      const res = await fetch(`/api/posts/ban/${postId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) return showToast("Error", data.error, "error");
      setStats((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => (p._id === postId ? { ...p, isBanned: !p.isBanned } : p)),
      }));
      showToast("Success", data.message, "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleBanUser = async (userId) => {
    try {
      const res = await fetch(`/api/users/ban/${userId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) return showToast("Error", data.error, "error");
      setStats((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u._id === userId ? { ...u, isBanned: !u.isBanned } : u)),
      }));
      showToast("Success", data.message, "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const downloadData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stats));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "dashboard_data.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><Typography>Loading...</Typography></Box>;
  if (!stats) return null;

  const userPieData = [
    { name: "Likes", value: stats.totalLikes || 0 },
    { name: "Comments", value: stats.totalComments || 0 },
    { name: "Posts", value: stats.totalPosts || 0 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Box sx={{ p: 3, maxWidth: "1200px", mx: "auto" }}>
        <Typography variant="h4" gutterBottom color="#e0e0e0">
          {user.isAdmin ? "Admin Real-Time Dashboard" : "Your Dashboard"}
        </Typography>
        {user.isAdmin && (
          <Typography variant="caption" color="gray" mb={2}>
            Last Updated: {stats.timestamp}
          </Typography>
        )}

        <Grid container spacing={2}>
          {user.isAdmin ? (
            <>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: "#3d3d3d", color: "#e0e0e0" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Platform Statistics</Typography>
                    <Typography>Total Users: {stats.totalUsers}</Typography>
                    <Typography>Banned Users: {stats.bannedUsers}</Typography>
                    <Typography>Total Posts: {stats.totalPosts}</Typography>
                    <Typography>Banned Posts: {stats.bannedPosts}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={8}>
                <Card sx={{ bgcolor: "#3d3d3d", color: "#e0e0e0" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Posts</Typography>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Text</TableCell>
                          <TableCell>Posted By</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats.posts?.map((post) => (
                          <TableRow key={post._id}>
                            <TableCell>{post._id}</TableCell>
                            <TableCell>{post.text}</TableCell>
                            <TableCell>{post.postedBy.username}</TableCell>
                            <TableCell>{post.isBanned ? "Banned" : "Active"}</TableCell>
                            <TableCell>
                              <Button onClick={() => handleBanPost(post._id)}>
                                {post.isBanned ? "Unban" : "Ban"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: "#3d3d3d", color: "#e0e0e0" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Users</Typography>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Username</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats.users?.map((u) => (
                          <TableRow key={u._id}>
                            <TableCell>{u._id}</TableCell>
                            <TableCell>{u.username}</TableCell>
                            <TableCell>{u.isBanned ? "Banned" : "Active"}</TableCell>
                            <TableCell>
                              <Button onClick={() => handleBanUser(u._id)}>
                                {u.isBanned ? "Unban" : "Ban"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            </>
          ) : (
            <>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: "#3d3d3d", color: "#e0e0e0" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Your Statistics</Typography>
                    <Typography>Total Posts: {stats.totalPosts}</Typography>
                    <Typography>Total Likes: {stats.totalLikes}</Typography>
                    <Typography>Total Comments: {stats.totalComments}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: "#3d3d3d", color: "#e0e0e0" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Engagement Distribution</Typography>
                    <AnalyticsChart type="pie" data={userPieData} isLoading={loading} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: "#3d3d3d", color: "#e0e0e0" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Activity Breakdown</Typography>
                    <AnalyticsChart type="bar" data={userPieData} isLoading={loading} />
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
        </Grid>
        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" color="primary" onClick={downloadData}>Download Data</Button>
        </Box>
      </Box>
    </motion.div>
  );
};

export default DashboardPage;
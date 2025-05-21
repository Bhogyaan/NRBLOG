import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import {
  Box,
  Typography,
  useMediaQuery,
  CircularProgress,
  Grid,
  Card,
} from "@mui/material";
import { motion } from "framer-motion";
import useShowToast from "../hooks/useShowToast";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
} from "recharts";
import { Dashboard, TrendingUp, BarChart as BarChartIcon } from "@mui/icons-material";

const COLORS = ["#8515fe", "#8b5cf6", "#f44336"];

const AdminDashboard = () => {
  const currentUser = useRecoilValue(userAtom);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const showToast = useShowToast();
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const isMediumScreen = useMediaQuery("(max-width:960px)");

  const mockAnalytics = {
    totalLikes: 150,
    totalPosts: 100,
    totalComments: 50,
    activityData: [
      { month: "Jan", likes: 30, posts: 20, comments: 10 },
      { month: "Feb", likes: 40, posts: 25, comments: 15 },
      { month: "Mar", likes: 50, posts: 30, comments: 20 },
    ],
    userActivity: [
      { posts: 10, likes: 50 },
      { posts: 20, likes: 100 },
      { posts: 30, likes: 150 },
    ],
  };

  const fetchAnalyticsWithRetry = async (retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch("/api/stats/admin", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          credentials: "include",
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        if (attempt === retries) {
          showToast("Error", "Failed to load analytics. Using fallback data.", "error");
          return mockAnalytics;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  useEffect(() => {
    if (!currentUser?.isAdmin) return;

    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      const data = await fetchAnalyticsWithRetry();
      setAnalytics(data);
      setLoadingAnalytics(false);
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [currentUser, showToast]);

  if (!currentUser?.isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: "center", bgcolor: "background.paper", borderRadius: 2 }}>
        <Typography variant="h6" color="text.primary">
          Admin access required
        </Typography>
      </Box>
    );
  }

  const pieData = analytics
    ? [
        { name: "Likes", value: analytics.totalLikes || 0 },
        { name: "Posts", value: analytics.totalPosts || 0 },
        { name: "Comments", value: analytics.totalComments || 0 },
      ]
    : [];
  const barData = analytics?.activityData || [];
  const lineData = analytics?.activityData || [];
  const scatterData = analytics
    ? (analytics.userActivity || []).map((user, index) => ({
        userId: index,
        posts: user.posts || Math.floor(Math.random() * 50),
        likes: user.likes || Math.floor(Math.random() * 200),
      }))
    : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Box sx={{ py: 3, bgcolor: "#1a1a1a" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 3 }}>
          <Dashboard sx={{ color: "primary.main", mr: 1 }} />
          <Typography
            variant="h4"
            sx={{
              color: "text.primary",
              fontWeight: 500,
              textAlign: "center",
              fontSize: { xs: "1.5rem", sm: "2rem" },
            }}
          >
            Admin Dashboard
          </Typography>
        </Box>
        <Box sx={{ maxWidth: 1400, mx: "auto" }}>
          {loadingAnalytics ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: "primary.main" }} />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Pie Chart */}
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    p: { xs: 2, sm: 3 },
                    height: { xs: 300, sm: 350 },
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
                    transition: "transform 0.3s",
                    "&:hover": { transform: "scale(1.02)" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <BarChartIcon sx={{ color: "secondary.main", mr: 1 }} />
                    <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 500 }}>
                      Platform Engagement
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isSmallScreen ? 60 : 80}
                        label
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "background.paper",
                          borderRadius: 8,
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "text.primary",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Grid>

              {/* Bar Chart */}
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    p: { xs: 2, sm: 3 },
                    height: { xs: 300, sm: 350 },
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
                    transition: "transform 0.3s",
                    "&:hover": { transform: "scale(1.02)" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <BarChartIcon sx={{ color: "secondary.main", mr: 1 }} />
                    <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 500 }}>
                      Activity Breakdown
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                      <XAxis dataKey="month" stroke="text.secondary" />
                      <YAxis stroke="text.secondary" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "background.paper",
                          borderRadius: 8,
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "text.primary",
                        }}
                      />
                      <Bar dataKey="likes" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="posts" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="comments" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Grid>

              {/* Line Chart */}
              <Grid item xs={12}>
                <Card
                  sx={{
                    p: { xs: 2, sm: 3 },
                    height: { xs: 300, sm: 350 },
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
                    transition: "transform 0.3s",
                    "&:hover": { transform: "scale(1.02)" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <TrendingUp sx={{ color: "secondary.main", mr: 1 }} />
                    <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 500 }}>
                      Activity Trend
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height="80%">
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                      <XAxis dataKey="month" stroke="text.secondary" />
                      <YAxis stroke="text.secondary" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "background.paper",
                          borderRadius: 8,
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "text.primary",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="likes"
                        stroke={COLORS[0]}
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="posts"
                        stroke={COLORS[1]}
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="comments"
                        stroke={COLORS[2]}
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </Grid>

              {/* Scatter Plot */}
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    p: { xs: 2, sm: 3 },
                    height: { xs: 300, sm: 350 },
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
                    transition: "transform 0.3s",
                    "&:hover": { transform: "scale(1.02)" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <TrendingUp sx={{ color: "secondary.main", mr: 1 }} />
                    <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 500 }}>
                      User Engagement
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height="80%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                      <XAxis
                        dataKey="posts"
                        name="Posts"
                        stroke="text.secondary"
                        type="number"
                      />
                      <YAxis
                        dataKey="likes"
                        name="Likes"
                        stroke="text.secondary"
                        type="number"
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        contentStyle={{
                          backgroundColor: "background.paper",
                          borderRadius: 8,
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "text.primary",
                        }}
                      />
                      <Scatter
                        name="Users"
                        data={scatterData}
                        fill={COLORS[0]}
                        shape="circle"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

export default AdminDashboard;

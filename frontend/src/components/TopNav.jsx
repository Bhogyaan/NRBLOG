import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoilState, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import { selectedConversationAtom } from "../atoms/messagesAtom";
import { message } from "antd";
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Typography,
  Avatar,
  Tooltip,
  useMediaQuery,
  InputBase,
  alpha,
  styled,
} from "@mui/material";
import {
  HomeOutlined as HomeIcon,
  ForumOutlined as ChatIcon,
  AccountCircleOutlined as PersonIcon,
  SettingsOutlined as SettingsIcon,
  LogoutOutlined as LogoutIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { Flex as AntdFlex } from "antd";
import { motion } from "framer-motion";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: "20px",
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(3),
    width: "auto",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "20ch",
    },
  },
}));

const TopNav = ({ user, sx }) => {
  const navigate = useNavigate();
  const [, setUser] = useRecoilState(userAtom);
  const [, setPosts] = useRecoilState(postsAtom);
  const setSelectedConversation = useSetRecoilState(selectedConversationAtom);
  const [searchQuery, setSearchQuery] = useState("");
  const [animateText, setAnimateText] = useState(false);
  const isMediumScreen = useMediaQuery("(min-width:500px) and (max-width:1024px)");
  const isSmallScreen = useMediaQuery("(max-width:500px)");

  const handleLogout = () => {
    try {
      localStorage.clear();
      setUser(null);
      setPosts({ posts: [], stories: [] });
      setSelectedConversation({
        _id: "",
        userId: "",
        username: "",
        userProfilePic: "",
        isOnline: false,
        mock: false,
      });
      message.success("Logged out successfully");
      navigate("/auth");
    } catch (error) {
      message.error("Logout failed. Please try again.");
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery}`);
      setSearchQuery("");
    } else {
      message.error("Please enter a username to search");
    }
  };

  const handleChatClick = () => {
    setSelectedConversation({
      _id: "",
      userId: "",
      username: "",
      userProfilePic: "",
      isOnline: false,
      mock: false,
    });
    navigate("/chat");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimateText((prev) => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppBar
      position="fixed"
      sx={{
        bgcolor: "black",
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        top: 0,
        zIndex: 1200,
        borderBottomLeftRadius: isMediumScreen ? "20px" : "0",
        borderBottomRightRadius: isMediumScreen ? "20px" : "0",
        ...sx,
      }}
    >
      <Toolbar
        sx={{
          maxWidth: { xs: "100%", md: "900px", lg: "1200px" },
          mx: "auto",
          width: "100%",
          px: { xs: 2, md: 4 },
          py: isMediumScreen ? 1 : 0,
          flexWrap: isMediumScreen ? "wrap" : "nowrap",
        }}
      >
        <AntdFlex align="center" gap={isMediumScreen ? 2 : 4}>
          <Box
            component={motion.div}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            sx={{
              bgcolor: "white",
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "black",
              fontWeight: "bold",
              fontSize: "1.2rem",
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            }}
          >
            NR
          </Box>
          <Typography
            component={motion.p}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: animateText ? 1 : 0, x: animateText ? 0 : -20 }}
            transition={{ duration: 0.5 }}
            variant={isSmallScreen ? "body1" : "h6"}
            sx={{ color: "white", fontWeight: "bold" }}
          >
            NR BLOG
          </Typography>
        </AntdFlex>

        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <form onSubmit={handleSearch}>
            <StyledInputBase
              placeholder="Search by username…"
              inputProps={{ "aria-label": "search by username" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </Search>

        <Box sx={{ flexGrow: 1 }} />

        <AntdFlex gap={isMediumScreen ? 2 : 4} align="center">
          <Tooltip title="Home">
            <IconButton
              component={motion.button}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/")}
              sx={{
                color: "white",
                p: isMediumScreen ? 1 : 1.5,
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "#8515fe",
                },
              }}
              aria-label="Home"
            >
              <HomeIcon fontSize={isMediumScreen ? "small" : "medium"} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Chat">
            <IconButton
              component={motion.button}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleChatClick}
              sx={{
                color: "white",
                p: isMediumScreen ? 1 : 1.5,
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "#8515fe",
                },
              }}
              aria-label="Chat"
            >
              <ChatIcon fontSize={isMediumScreen ? "small" : "medium"} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Profile">
            <IconButton
              component={motion.button}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(`/${user?.username}`)}
              sx={{
                p: 0,
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                },
              }}
              aria-label="Profile"
            >
              <Avatar
                src={user?.profilePic}
                alt={user?.username}
                sx={{ width: isMediumScreen ? 28 : 32, height: isMediumScreen ? 28 : 32 }}
              />
            </IconButton>
          </Tooltip>
          {!isMediumScreen && (
            <Tooltip title="Settings">
              <IconButton
                component={motion.button}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate("/settings")}
                sx={{
                  color: "white",
                  p: isMediumScreen ? 1 : 1.5,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    color: "#8515fe",
                  },
                }}
                aria-label="Settings"
              >
                <SettingsIcon fontSize={isMediumScreen ? "small" : "medium"} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Logout">
            <IconButton
              component={motion.button}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              sx={{
                color: "white",
                p: isMediumScreen ? 1 : 1.5,
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "#8515fe",
                },
              }}
              aria-label="Logout"
            >
              <LogoutIcon fontSize={isMediumScreen ? "small" : "medium"} />
            </IconButton>
          </Tooltip>
        </AntdFlex>
      </Toolbar>
    </AppBar>
  );
};

export default TopNav;
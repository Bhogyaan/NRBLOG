import React, { useState, lazy, Suspense, useTransition } from "react";
import {
  Box,
  Container,
  Modal,
  useMediaQuery,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useRecoilValue } from "recoil";
import userAtom from "./atoms/userAtom";
import { SocketContextProvider } from "./context/SocketContext";
import { Skeleton } from "antd";
import TopNav from "./components/TopNav";
import BottomNavigation from "./components/BottomNav";
import ErrorBoundary from "./components/ErrorBoundary";

// react-toastify
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";

// Lazy-loaded pages
const UserPage = lazy(() => import("./pages/UserPage"));
const PostPage = lazy(() => import("./pages/PostPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const UpdateProfilePage = lazy(() => import("./pages/UpdateProfilePage"));
const CreatePost = lazy(() => import("./components/CreatePost"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const EditProfile = lazy(() => import("./components/EditProfile"));
const EditPostPage = lazy(() => import("./pages/EditPostPage"));
const AdminProfilePage = lazy(() => import("./pages/AdminProfilePage"));

// Dark theme matching AuthPage.jsx
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#8515fe" },
    secondary: { main: "#8b5cf6" },
    background: { default: "#1a1a1a", paper: "rgba(255, 255, 255, 0.05)" },
    text: { primary: "#ffffff", secondary: "rgba(255, 255, 255, 0.7)" },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        },
      },
    },
    MuiButton: {
      styleOverrides: { root: { textTransform: "none" } },
    },
  },
});

// Custom toast configuration
const toastConfig = {
  position: "top-center",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "dark",
};

// Custom toast icons
const toastIcons = {
  success: <FaCheckCircle />,
  info: <FaInfoCircle />,
  warning: <FaExclamationTriangle />,
  error: <FaTimesCircle />,
};

// Custom toast function
const showToast = (type, message) => {
  toast[type](message, {
    ...toastConfig,
    icon: toastIcons[type],
  });
};

function App() {
  const user = useRecoilValue(userAtom);
  const { pathname } = useLocation();
  const isSmallScreen = useMediaQuery("(max-width:501px)");
  const isMediumScreenOrLarger = useMediaQuery("(min-width:501px)");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    startTransition(() => {
      setIsOpen(true);
    });
  };

  const handleClose = () => {
    startTransition(() => {
      setIsOpen(false);
    });
  };

  const bottomPadding = isSmallScreen ? "70px" : "0";
  const topNavHeight = 64;
  const topPadding = isMediumScreenOrLarger ? `${topNavHeight}px` : "0";

  const LoadingSkeleton = () => (
    <Box sx={{ p: 4 }}>
      <Skeleton active paragraph={{ rows: 5 }} />
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <SocketContextProvider>
        <ErrorBoundary>
          <Box
            position="relative"
            width="100%"
            minHeight="100vh"
            paddingBottom={bottomPadding}
            bgcolor="background.default"
            color="text.primary"
          >
            <ToastContainer
              position="top-center"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
              style={{
                fontFamily: theme.typography.fontFamily,
              }}
            />
            {isMediumScreenOrLarger && pathname !== "/auth" && user && (
              <TopNav
                user={user}
                sx={{ position: "fixed", top: 0, zIndex: 1200, width: "100%" }}
              />
            )}
            <Container
              maxWidth={pathname === "/" ? { xs: "xs", md: "md" } : { xs: "xs", md: "sm" }}
              sx={{
                px: { xs: 2, md: 4 },
                py: 4,
                pt: topPadding,
              }}
            >
              <Suspense fallback={<LoadingSkeleton />}>
                <Routes>
                  <Route
                    path="/"
                    element={user ? <HomePage /> : <Navigate to="/auth" replace />}
                  />
                  <Route
                    path="/auth"
                    element={!user ? <AuthPage /> : <Navigate to="/" replace />}
                  />
                  <Route
                    path="/update"
                    element={
                      user ? <UpdateProfilePage /> : <Navigate to="/auth" replace />
                    }
                  />
                  <Route
                    path="/create-post"
                    element={
                      user ? (
                        <Suspense fallback={<LoadingSkeleton />}>
                          <Modal
                            open={true}
                            onClose={() => navigate("/")}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Box
                              sx={{
                                bgcolor: "background.paper",
                                boxShadow: 24,
                                p: 4,
                                borderRadius: "16px",
                                width: { xs: "90%", md: "600px" },
                                maxHeight: "80vh",
                                overflowY: "auto",
                              }}
                            >
                              <CreatePost
                                isOpen={true}
                                onClose={() => navigate("/")}
                                onPostCreated={() => navigate("/")}
                              />
                            </Box>
                          </Modal>
                        </Suspense>
                      ) : (
                        <Navigate to="/auth" replace />
                      )
                    }
                  />
                  <Route path="/edit-post/:id" element={<EditPostPage />} />
                  <Route
                    path="/:username"
                    element={user ? <UserPage /> : <Navigate to="/auth" replace />}
                  />
                  <Route
                    path="/admin/:username"
                    element={
                      user?.isAdmin ? (
                        <AdminProfilePage />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    }
                  />
                  <Route
                    path="/edit-profile"
                    element={
                      user ? <EditProfile /> : <Navigate to="/auth" replace />
                    }
                  />
                  <Route path="/:username/post/:pid" element={<PostPage />} />
                  <Route
                    path="/chat"
                    element={user ? <ChatPage /> : <Navigate to="/auth" replace />}
                  />
                  <Route
                    path="/settings"
                    element={
                      user ? <SettingsPage /> : <Navigate to="/auth" replace />
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      user ? <DashboardPage /> : <Navigate to="/auth" replace />
                    }
                  />
                  <Route
                    path="/search"
                    element={user ? <SearchPage /> : <Navigate to="/auth" replace />}
                  />
                  <Route
                    path="*"
                    element={
                      <Box sx={{ textAlign: "center", py: 4 }}>
                        404 - Page Not Found
                      </Box>
                    }
                  />
                </Routes>
              </Suspense>
            </Container>

            <Suspense fallback={<LoadingSkeleton />}>
              <Modal
                open={isOpen}
                onClose={handleClose}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "16px",
                    width: { xs: "90%", md: "600px" },
                    maxHeight: "80vh",
                    overflowY: "auto",
                  }}
                >
                  <CreatePost
                    isOpen={isOpen}
                    onClose={handleClose}
                    onPostCreated={handleClose}
                  />
                </Box>
              </Modal>
            </Suspense>

            {isSmallScreen && pathname !== "/auth" && user && (
              <BottomNavigation onOpenCreatePost={handleOpen} />
            )}
          </Box>
        </ErrorBoundary>
      </SocketContextProvider>
    </ThemeProvider>
  );
}


export default App;
export { showToast };

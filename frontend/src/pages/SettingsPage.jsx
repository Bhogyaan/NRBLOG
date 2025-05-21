import { useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import { message } from "antd";
import useLogout from "../hooks/useLogout";

export const SettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const logout = useLogout();

  const freezeAccount = async () => {
    if (!window.confirm("Are you sure you want to freeze your account?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/users/freeze", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (data.error) {
        message.error(data.error);
        return;
      }
      if (data.success) {
        await logout();
        message.success("Your account has been frozen");
      }
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Freeze Your Account
          </Typography>
          <Typography variant="body1" gutterBottom>
            You can unfreeze your account anytime by logging in.
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Freezing your account will make your profile and posts temporarily
            inaccessible to others.
          </Typography>
          <Box mt={2}>
            <Button
              variant="contained"
              color="error"
              onClick={freezeAccount}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Freeze Account
            </Button>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};
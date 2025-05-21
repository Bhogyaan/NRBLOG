import { useState, useRef } from "react";
import { useRecoilState } from "recoil";
import { motion } from "framer-motion";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Typography,
} from "@mui/material";
import { CameraAlt as CameraAltIcon } from "@mui/icons-material";
import { message } from "antd";
import userAtom from "../atoms/userAtom";

export default function UpdateProfilePage() {
  const [user, setUser] = useRecoilState(userAtom);
  const [inputs, setInputs] = useState({
    name: user.name || "",
    username: user.username || "",
    email: user.email || "",
    bio: user.bio || "",
    password: "",
  });
  const fileRef = useRef(null);
  const [updating, setUpdating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (updating) return;
    setUpdating(true);

    const data = new FormData();
    data.append("name", inputs.name);
    data.append("email", inputs.email);
    data.append("username", inputs.username);
    data.append("bio", inputs.bio);
    if (inputs.password) data.append("password", inputs.password);
    if (fileRef.current?.files[0]) data.append("profilePic", fileRef.current.files[0]);

    try {
      const res = await fetch("/api/users/update", {
        method: "PUT",
        body: data,
        credentials: "include",
      });
      const updatedUser = await res.json();
      if (updatedUser.error) throw new Error(updatedUser.error);

      setUser(updatedUser);
      message.success("Profile updated successfully");
      localStorage.setItem("user-NRBLOG", JSON.stringify(updatedUser));
    } catch (error) {
      message.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: 4,
            borderRadius: 2,
            boxShadow: 3,
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="h4" gutterBottom textAlign="center">
            User Profile Edit
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={previewUrl || user.profilePic}
                sx={{ width: 80, height: 80 }}
              />
              <Button
                variant="outlined"
                fullWidth
                onClick={() => fileRef.current.click()}
                startIcon={<CameraAltIcon />}
              >
                Change Avatar
              </Button>
              <Input
                type="file"
                inputRef={fileRef}
                onChange={handleImageChange}
                sx={{ display: "none" }}
              />
            </Stack>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <FormLabel>Full name</FormLabel>
            <Input
              placeholder="John Doe"
              value={inputs.name}
              onChange={(e) => setInputs({ ...inputs, name: e.target.value })}
            />
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <FormLabel>Username</FormLabel>
            <Input
              placeholder="johndoe"
              value={inputs.username}
              onChange={(e) => setInputs({ ...inputs, username: e.target.value })}
            />
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <FormLabel>Email address</FormLabel>
            <Input
              placeholder="your-email@example.com"
              value={inputs.email}
              onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
              type="email"
            />
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <FormLabel>Bio</FormLabel>
            <Input
              placeholder="Your bio."
              value={inputs.bio}
              onChange={(e) => setInputs({ ...inputs, bio: e.target.value })}
              multiline
              rows={3}
            />
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <FormLabel>Password</FormLabel>
            <Input
              placeholder="password"
              value={inputs.password}
              onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
              type="password"
            />
          </FormControl>

          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              type="submit"
              disabled={updating}
            >
              {updating ? <CircularProgress size={24} /> : "Submit"}
            </Button>
          </Stack>
        </Box>
      </Container>
    </motion.div>
  );
}
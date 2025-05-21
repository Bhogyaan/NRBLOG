import { useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Input,
  CircularProgress,
} from "@mui/material";
import { message } from "antd";
import userAtom from "../atoms/userAtom";

const EditProfile = () => {
  const user = useRecoilValue(userAtom);
  const setUser = useSetRecoilState(userAtom);
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    username: user.username || "",
    bio: user.bio || "",
  });
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("email", formData.email);
    data.append("username", formData.username);
    data.append("bio", formData.bio);
    if (profilePicFile) {
      data.append("profilePic", profilePicFile);
    }

    try {
      const res = await fetch("/api/users/update", {
        method: "PUT",
        body: data,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const updatedUser = await res.json();
      if (updatedUser.error) throw new Error(updatedUser.error);

      setUser(updatedUser);
      message.success("Profile updated successfully");
      navigate(`/${updatedUser.username}`);
    } catch (error) {
      message.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 500, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Edit Profile
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={loading}
        />
        <TextField
          label="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={loading}
        />
        <TextField
          label="Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={loading}
        />
        <TextField
          label="Bio"
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          fullWidth
          margin="normal"
          multiline
          rows={3}
          disabled={loading}
        />
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        />
        <Box sx={{ mt: 2 }}>
          {previewUrl && (
            <>
              <Typography variant="body2">Preview:</Typography>
              <img
                src={previewUrl}
                alt="Preview"
                style={{ maxWidth: "150px", marginTop: "8px" }}
              />
            </>
          )}
          {user.profilePic && !previewUrl && (
            <>
              <Typography variant="body2">Current Profile Picture:</Typography>
              <img
                src={user.profilePic}
                alt="Profile"
                style={{ maxWidth: "150px", marginTop: "8px" }}
              />
            </>
          )}
        </Box>
        <Button
          type="submit"
          variant="contained"
          sx={{ mt: 2, bgcolor: "#0095F6", "&:hover": { bgcolor: "#007BFF" } }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Save"}
        </Button>
      </form>
    </Box>
  );
};

export default EditProfile;
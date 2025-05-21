import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { message } from "antd";
import { useSearchParams } from "react-router-dom";
import Post from "../components/Post";

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  // Trigger search from query parameter on mount
  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);
      handleSearch(query);
    }
  }, [searchParams]);

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) {
      message.error("Please enter a username to search");
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/user/${query}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to fetch posts");
      }
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(error.message || "An unexpected error occurred");
      setSearchResults([]);
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
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          Search Posts by User
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 4,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <TextField
            fullWidth
            label="Search by username"
            placeholder="Enter username to search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            aria-label="Search posts by username"
          />
          <Button
            variant="contained"
            onClick={() => handleSearch()}
            disabled={loading}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {loading ? <CircularProgress size={24} /> : "Search"}
          </Button>
        </Box>

        {!loading && searchResults.length === 0 && searchQuery && (
          <Typography textAlign="center" my={4}>
            No posts found for "{searchQuery}"
          </Typography>
        )}

        {!loading && searchResults.length > 0 && (
          <Grid container spacing={3}>
            {searchResults.map((post) => (
              <Grid item xs={12} key={post._id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Post post={post} postedBy={post.postedBy} />
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </motion.div>
  );
};

export default SearchPage;
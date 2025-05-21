import React, { Component } from "react";
import { Typography, Button } from "@mui/material";

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught in ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: "center" }}>
          <Typography variant="h6" color="error">
            Something went wrong.
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {this.state.error?.message || "An unexpected error occurred."}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.reload()}
            style={{ marginTop: 16 }}
          >
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
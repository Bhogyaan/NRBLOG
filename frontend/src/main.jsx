import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { BrowserRouter } from "react-router-dom";
import { RecoilRoot } from "recoil";
import { SocketContextProvider } from "./context/SocketContext.jsx";

// MUI
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// AntD
import { ConfigProvider } from "antd";

// react-toastify
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";

// Custom MUI theme
const muiTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#9b59b6",
    },
    background: {
      default: "#1e272e",
      paper: "#263238",
    },
    text: {
      primary: "#ffffff",
    },
  },
  typography: {
    fontFamily: "Roboto, sans-serif",
  },
});

// Ant Design theme config
const antThemeConfig = {
  token: {
    colorPrimary: "#9b59b6",
    colorBgBase: "#1e272e",
    colorTextBase: "#ffffff",
  },
};

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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RecoilRoot>
      <BrowserRouter>
        <ConfigProvider theme={antThemeConfig}>
          <ThemeProvider theme={muiTheme}>
            <CssBaseline />
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
                fontFamily: muiTheme.typography.fontFamily,
              }}
            />
            <SocketContextProvider>
              <App />
            </SocketContextProvider>
          </ThemeProvider>
        </ConfigProvider>
      </BrowserRouter>
    </RecoilRoot>
  </React.StrictMode>
);

// Example usage of showToast function
export { showToast };

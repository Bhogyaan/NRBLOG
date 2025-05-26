import React, { createContext, useContext, useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import io from "socket.io-client";
import userAtom from "../atoms/userAtom";
import { motion } from "framer-motion";
import useShowToast from "../hooks/useShowToast";

export const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketContextProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const user = useRecoilValue(userAtom);
  const showToast = useShowToast();
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

  useEffect(() => {
    if (!serverUrl) {
      showToast("Error", "Server URL not configured", "error");
      setConnectionStatus("disconnected");
      return;
    }

    if (!user?._id || user._id === "undefined") {
      showToast("Warning", "No valid user ID, real-time updates disabled", "warning");
      setConnectionStatus("disconnected");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showToast("Warning", "No auth token, real-time updates disabled", "warning");
      setConnectionStatus("disconnected");
      return;
    }

    const socketInstance = io(serverUrl, {
      query: { userId: user._id, token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.3,
      timeout: 10000,
    });

    setSocket(socketInstance);
    setConnectionStatus("connecting");

    socketInstance.on("connect", () => {
      setConnectionStatus("connected");
      setReconnectAttempts(0);
    });

    socketInstance.on("getOnlineUsers", (users) => {
      setOnlineUsers(users || []);
    });

    socketInstance.on("connect_error", (error) => {
      showToast("Error", `Socket connection failed: ${error.message}`, "error");
      setConnectionStatus("error");
    });

    socketInstance.on("reconnect", (attempt) => {
      showToast("Success", `Reconnected to server after ${attempt} attempts`, "success");
      setConnectionStatus("connected");
      setReconnectAttempts(0);
    });

    socketInstance.on("reconnect_attempt", (attempt) => {
      setConnectionStatus("reconnecting");
      setReconnectAttempts(attempt);
    });

    socketInstance.on("reconnect_failed", () => {
      showToast("Error", "Failed to reconnect to server", "error");
      setConnectionStatus("failed");
    });

    socketInstance.on("disconnect", (reason) => {
      showToast("Warning", `Socket disconnected: ${reason}`, "warning");
      setConnectionStatus("disconnected");
    });

    socketInstance.on("error", (error) => {
      showToast("Error", `Socket error: ${error.message}`, "error");
      setConnectionStatus("error");
    });

    return () => {
      socketInstance.off("connect");
      socketInstance.off("getOnlineUsers");
      socketInstance.off("connect_error");
      socketInstance.off("reconnect");
      socketInstance.off("reconnect_attempt");
      socketInstance.off("reconnect_failed");
      socketInstance.off("disconnect");
      socketInstance.off("error");
      socketInstance.disconnect();
    };
  }, [user?._id, serverUrl, showToast]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, connectionStatus, reconnectAttempts }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.div>
    </SocketContext.Provider>
  );
};

export default SocketContextProvider;

// import React, { createContext, useContext, useEffect, useState } from 'react';
// import { useRecoilValue } from 'recoil';
// import io from 'socket.io-client';
// import userAtom from '../atoms/userAtom';
// import { motion } from 'framer-motion';

// const SocketContext = createContext();

// export const useSocket = () => {
//   return useContext(SocketContext);
// };

// export const SocketContextProvider = ({ children }) => {
//   const [socket, setSocket] = useState(null);
//   const [onlineUsers, setOnlineUsers] = useState([]);
//   const user = useRecoilValue(userAtom);

//   useEffect(() => {
//     const socketInstance = io('/', {
//       query: {
//         userId: user?._id,
//       },
//     });

//     setSocket(socketInstance);

//     socketInstance.on('getOnlineUsers', (users) => {
//       setOnlineUsers(users);
//     });

//     return () => {
//       socketInstance.close();
//     };
//   }, [user?._id]);

//   return (
//     <SocketContext.Provider value={{ socket, onlineUsers }}>
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         transition={{ duration: 0.5 }}
//       >
//         {children}
//       </motion.div>
//     </SocketContext.Provider>
//   );
// };

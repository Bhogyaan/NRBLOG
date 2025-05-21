import React, { createContext, useContext, useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import io from "socket.io-client";
import userAtom from "../atoms/userAtom";
import { motion } from "framer-motion";

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
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

  useEffect(() => {
    if (!user?._id || user._id === "undefined") {
      console.warn("No valid user ID, skipping socket connection");
      setConnectionStatus("disconnected");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No auth token, skipping socket connection");
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
      withCredentials: true,
      timeout: 10000,
    });

    setSocket(socketInstance);
    setConnectionStatus("connecting");

    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
      setConnectionStatus("connected");
      setReconnectAttempts(0);
    });

    socketInstance.on("getOnlineUsers", (users) => {
      setOnlineUsers(users || []);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setConnectionStatus("error");
    });

    socketInstance.on("reconnect", (attempt) => {
      console.log(`Reconnected to server after ${attempt} attempts`);
      setConnectionStatus("connected");
      setReconnectAttempts(0);
    });

    socketInstance.on("reconnect_attempt", (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
      setConnectionStatus("reconnecting");
      setReconnectAttempts(attempt);
    });

    socketInstance.on("reconnect_failed", () => {
      console.error("Failed to reconnect to socket server");
      setConnectionStatus("failed");
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
      setConnectionStatus("disconnected");
    });

    socketInstance.on("error", (error) => {
      console.error("Socket server error:", error.message);
      setConnectionStatus("error");
    });

    const pingInterval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit("ping");
      }
    }, 30000);

    socketInstance.on("pong", () => {
      console.log("Received pong from server");
    });

    return () => {
      clearInterval(pingInterval);
      socketInstance.off("connect");
      socketInstance.off("getOnlineUsers");
      socketInstance.off("connect_error");
      socketInstance.off("reconnect");
      socketInstance.off("reconnect_attempt");
      socketInstance.off("reconnect_failed");
      socketInstance.off("disconnect");
      socketInstance.off("pong");
      socketInstance.off("error");
      socketInstance.disconnect();
      setSocket(null);
      setConnectionStatus("disconnected");
    };
  }, [user?._id, serverUrl]);

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

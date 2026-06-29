import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getUser } from '../utils/auth.js';
import { BASE_URL  } from '../api/api.js';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const backendUrl = BASE_URL;

    const newSocket = io(backendUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);

      // Auto-join if logged in as staff
      const user = getUser();
      if (user && ['admin', 'superadmin', 'trainer', 'cashier'].includes(user.role)) {
        newSocket.emit('join_admin');
      }
    });

    newSocket.on('new_booking', (data) => {
      const user = getUser();
      if (user && (user.role === 'admin' || user.role === 'superadmin')) {
        toast.success(
          (t) => (
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm">New Booking Received! 🚀</span>
              <span className="text-xs opacity-70">Location: {data.locationName}</span>
              <span className="text-xs opacity-70">Customer: {data.customerName}</span>
              <span className="text-xs font-mono bg-slate-100 p-1 rounded mt-1">#{data.bookingNumber}</span>
            </div>
          ),
          {
            duration: 6000,
            position: 'top-right',
            style: {
              borderRadius: '12px',
              background: '#fff',
              color: '#333',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }
          }
        );
      }
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const joinAdminRoom = () => {
    if (socket) {
      socket.emit('join_admin');
    }
  };

  return (
    <SocketContext.Provider value={{ socket, joinAdminRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

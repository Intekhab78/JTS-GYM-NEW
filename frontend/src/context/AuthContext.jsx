import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api.js';
import { getToken, getUser, setAuth, clearAuth } from '../utils/auth.js';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(getUser());
    const [loading, setLoading] = useState(true);

    // Synchronize user profile on initial mount
    const refreshUser = async () => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const res = await api.get('/auth/me');
            setAuth(res.data);
            setUser(getUser()); // Hydrate from the updated localStorage
        } catch (err) {
            console.error('Auth synchronization failed:', err.message);
            // If token is invalid, clear local session
            if (err.response?.status === 401) {
                clearAuth();
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const login = (payload) => {
        setAuth(payload);
        setUser(getUser());
    };

    const logout = () => {
        clearAuth();
        setUser(null);
    };

    const updateUser = (payload) => {
        setAuth(payload);
        setUser(getUser());
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout, updateUser, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

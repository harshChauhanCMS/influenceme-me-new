"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
// import jwtDecode from "jwt-decode";
import {IUser} from "../../../shared/types/user";

interface AuthContextType {
    user: IUser | null;
    token: string | null;
    loading: boolean;
    userHandler: (updatedUser: Partial<IUser>) => void;
    login: (newToken: string, newUser: IUser) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

interface AuthProviderProps {
    children: ReactNode;
}

// interface JwtPayload {
//     exp: number;
//     [key: string]: unknown;
// }

// ------------------- Context -------------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export AuthContext for direct useContext access when needed
export { AuthContext };

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    const [user, setUser] = useState<IUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedUser = localStorage.getItem("user");
            const storedToken = localStorage.getItem("token");

            if (storedUser) setUser(JSON.parse(storedUser));
            if (storedToken) setToken(storedToken);
        }
        setLoading(false);
    }, []);

    // Persist user + token
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (user) localStorage.setItem("user", JSON.stringify(user));
        else localStorage.removeItem("user");
    }, [user]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (token) localStorage.setItem("token", token);
        else localStorage.removeItem("token");
    }, [token]);

    // User updater
    const userHandler = (updatedUser: Partial<IUser>) => {
        setUser((prev) => (prev ? {...prev, ...updatedUser} : prev));
    };

    // Login
    const login = (newToken: string, newUser: IUser) => {
        if (newToken && newUser) {
            setToken(newToken);
            setUser(newUser);
        } else {
            console.error("Invalid login data");
        }
    };

    // Logout
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.clear();
        window.location.href = "/login";
    };

    // Refresh user data from API
    const refreshUser = async () => {
        try {
            if (!token) {
                console.warn('No token available, cannot refresh user');
                return;
            }
            
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5005';
            console.log('Refreshing user from:', `${apiUrl}/api/user/profile`);
            
            const response = await fetch(`${apiUrl}/api/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Refresh user response:', data);
                if ((data.success || data.status) && data.data) {
                    setUser(data.data);
                    localStorage.setItem('user', JSON.stringify(data.data));
                    console.log('User refreshed successfully:', data.data);
                }
            } else {
                console.error('Failed to refresh user, status:', response.status);
            }
        } catch (error) {
            console.error('Failed to refresh user data:', error);
        }
    };

    // Token expiration watcher
    // useEffect(() => {
    //     if (!token) return;
    //
    //     try {
    //         const decoded = jwtDecode<JwtPayload>(token);
    //         const expMs = decoded.exp * 1000;
    //         const currentTime = Date.now();
    //         const timeUntilExp = expMs - currentTime;
    //
    //         if (timeUntilExp <= 0) {
    //             logout();
    //             return;
    //         }
    //
    //         const timeoutId = setTimeout(() => {
    //             logout();
    //         }, Math.min(timeUntilExp, 2147483647)); // max safe timeout
    //
    //         return () => clearTimeout(timeoutId);
    //     } catch (error) {
    //         console.error("Token decode error:", error);
    //     }
    // }, [token]);

    if (loading) {
        return null; // or a spinner
    }

    return (
        <AuthContext.Provider value={{user, token, loading, userHandler, login, logout, refreshUser}}>
            {children}
        </AuthContext.Provider>
    );
};

// ------------------- Hook -------------------
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return context;
};

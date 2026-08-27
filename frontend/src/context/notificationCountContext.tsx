"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import notificationService from "@/services/notificationService";
import { useAuth } from "./authContext";

interface NotificationCountContextValue {
  unreadCount: number;
  refetch: () => Promise<void>;
}

const NotificationCountContext = createContext<NotificationCountContextValue | null>(null);

export function NotificationCountProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, [token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <NotificationCountContext.Provider value={{ unreadCount, refetch }}>
      {children}
    </NotificationCountContext.Provider>
  );
}

export function useNotificationCount() {
  const ctx = useContext(NotificationCountContext);
  return ctx ?? { unreadCount: 0, refetch: async () => {} };
}

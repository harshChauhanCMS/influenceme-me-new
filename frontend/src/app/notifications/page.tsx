"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { MarkEmailRead as MarkIcon, DoneAll as DoneAllIcon, DeleteSweep as DeleteAllIcon } from "@mui/icons-material";
import notificationService, {
  INotification,
} from "@/services/notificationService";
import { useNotificationCount } from "@/context/notificationCountContext";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const { refetch: refetchCount } = useNotificationCount();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notificationService.getMyNotifications({
        page: 1,
        limit: 50,
      });
      if (res && res.status && res.data) {
        setNotifications(Array.isArray(res.data) ? res.data : []);
      } else {
        setError(res?.message ?? "Failed to load notifications");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      const res = await notificationService.markAsRead(id);
      if (res && res.status) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
        );
        await refetchCount();
      }
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  const markAllRead = async () => {
    try {
      setMarkingAll(true);
      const res = await notificationService.markAllAsRead();
      if (res && res.status) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        await refetchCount();
      }
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteAll = async () => {
    try {
      setDeletingAll(true);
      setDeleteAllConfirmOpen(false);
      const res = await notificationService.deleteAll();
      if (res && res.status) {
        setNotifications([]);
        await refetchCount();
      } else {
        setError(res?.message ?? "Failed to delete notifications");
      }
    } catch (err: any) {
      console.error("Failed to delete all", err);
      setError(err?.message ?? "Failed to delete notifications");
    } finally {
      setDeletingAll(false);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <Box sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        mb={2}
      >
        <Typography variant="h4" fontWeight={700}>
          Notifications
        </Typography>
        <Box display="flex" gap={1}>
          {hasUnread && (
            <Button
              onClick={markAllRead}
              variant="outlined"
              startIcon={<DoneAllIcon />}
              disabled={markingAll}
            >
              Mark all as read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              onClick={() => setDeleteAllConfirmOpen(true)}
              variant="outlined"
              color="error"
              startIcon={<DeleteAllIcon />}
              disabled={deletingAll}
            >
              Delete all
            </Button>
          )}
          <Button onClick={load} variant="outlined" disabled={deletingAll}>
            Refresh
          </Button>
        </Box>
      </Box>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <List disablePadding>
          {notifications.map((n) => (
            <ListItem
              key={n._id}
              divider
              sx={{
                bgcolor: n.isRead ? undefined : "action.hover",
              }}
              secondaryAction={
                !n.isRead ? (
                  <IconButton
                    edge="end"
                    onClick={() => markRead(n._id)}
                    title="Mark as read"
                    color="primary"
                  >
                    <MarkIcon />
                  </IconButton>
                ) : null
              }
            >
              <ListItemText
                primary={
                  <Typography
                    component="span"
                    fontWeight={n.isRead ? 400 : 700}
                    color="text.primary"
                  >
                    {n.title}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {n.message}
                    </Typography>
                    <Typography component="span" variant="caption" display="block" color="text.secondary">
                      {new Date(n.createdAt).toLocaleString()}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
        {notifications.length === 0 && !loading && (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="text.secondary">No notifications yet.</Typography>
          </Box>
        )}
      </Paper>
      <Dialog open={deleteAllConfirmOpen} onClose={() => setDeleteAllConfirmOpen(false)}>
        <DialogTitle>Delete all notifications?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently remove all your notifications. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllConfirmOpen(false)}>Cancel</Button>
          <Button onClick={deleteAll} color="error" variant="contained" disabled={deletingAll}>
            {deletingAll ? "Deleting…" : "Delete all"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

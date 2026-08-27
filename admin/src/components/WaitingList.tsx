import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Avatar,
  IconButton,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { adminService } from "../services/adminService";
import type { User } from "../services/adminService";
import UserDetailDialog from "./UserDetailDialog";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`waiting-list-tabpanel-${index}`}
      aria-labelledby={`waiting-list-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const WaitingList: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionUser, setActionUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const roles = ["all", "influencer", "brand", "vendor"];
  const roleLabels: { [key: string]: string } = {
    all: "All Users",
    influencer: "Influencers",
    brand: "Brands",
    vendor: "Vendors",
  };

  useEffect(() => {
    loadWaitingList();
  }, [tabValue, page]);

  const loadWaitingList = async () => {
    try {
      setLoading(true);
      setError(null);
      const role = roles[tabValue] === "all" ? undefined : roles[tabValue];
      const response = await adminService.getWaitingList({
        role,
        page,
        limit: 10,
      });
      console.log("Waiting list response:", response);
      if (response.status && response.data) {
        setUsers(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotal(response.pagination?.total || 0);
      } else {
        setError(response.message || "Failed to load waiting list");
        setUsers([]);
      }
    } catch (err: any) {
      console.error("Failed to load waiting list:", err);
      setError(err.message || "Failed to load waiting list");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(1);
  };

  const handleViewDetails = async (user: User) => {
    try {
      const userDetail = await adminService.getUserById(user._id);
      setSelectedUser(userDetail.data);
      setDetailDialogOpen(true);
    } catch (err: any) {
      setError(err.message || "Failed to load user details");
    }
  };

  const handleApprove = (user: User) => {
    setActionUser(user);
    setActionType("approve");
    setReason("");
    setActionDialogOpen(true);
  };

  const handleReject = (user: User) => {
    setActionUser(user);
    setActionType("reject");
    setReason("");
    setActionDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!actionUser || !actionType) return;

    try {
      setError(null);
      setSuccess(null);
      await adminService.updateWaitingListStatus(
        actionUser._id,
        actionType,
        reason || undefined,
      );
      setSuccess(
        `User ${actionType === "approve" ? "approved" : "rejected"} successfully`,
      );
      setActionDialogOpen(false);
      setActionUser(null);
      setActionType(null);
      setReason("");
      loadWaitingList();
    } catch (err: any) {
      setError(err.message || `Failed to ${actionType} user`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "influencer":
        return "primary";
      case "brand":
        return "success";
      case "vendor":
        return "warning";
      default:
        return "default";
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight="bold">
          Waiting List
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Total: {total} users
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Paper>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="waiting list tabs"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          {roles.map((role) => (
            <Tab key={role} label={roleLabels[role]} />
          ))}
        </Tabs>

        {roles.map((role) => (
          <TabPanel key={role} value={tabValue} index={roles.indexOf(role)}>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Box textAlign="center" p={4}>
                <Typography variant="h6" color="error">
                  {error}
                </Typography>
              </Box>
            ) : users.length === 0 ? (
              <Box textAlign="center" p={4}>
                <Typography variant="h6" color="text.secondary">
                  No users on waiting list
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  All {roleLabels[role].toLowerCase()} have been reviewed.
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Registered</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user._id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar
                                src={user.profilePictureUrl}
                                alt={user.name}
                                sx={{ width: 40, height: 40 }}
                              >
                                {user.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight="medium">
                                  {user.name}
                                </Typography>
                                {user.email && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {user.email}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.role}
                              color={getRoleColor(user.role) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {user.email || user.phone || "N/A"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(user.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box
                              display="flex"
                              gap={1}
                              justifyContent="flex-end"
                            >
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(user)}
                                color="primary"
                              >
                                <VisibilityIcon />
                              </IconButton>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleApprove(user)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => handleReject(user)}
                              >
                                Reject
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {totalPages > 1 && (
                  <Box display="flex" justifyContent="center" gap={2} mt={3}>
                    <Button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Typography variant="body2" sx={{ alignSelf: "center" }}>
                      Page {page} of {totalPages}
                    </Typography>
                    <Button
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </Box>
                )}
              </>
            )}
          </TabPanel>
        ))}
      </Paper>

      {/* User Detail Dialog */}
      {selectedUser && (
        <UserDetailDialog
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setSelectedUser(null);
          }}
          userId={selectedUser._id}
        />
      )}

      {/* Approve/Reject Dialog */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionType === "approve" ? "Approve User" : "Reject User"}
        </DialogTitle>
        <DialogContent>
          {actionUser && (
            <Box mb={2}>
              <Typography variant="body1" fontWeight="medium">
                {actionUser.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {actionUser.role} • {actionUser.email || actionUser.phone}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label={
              actionType === "approve"
                ? "Approval Notes (Optional)"
                : "Rejection Reason (Optional)"
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              actionType === "approve"
                ? "Add any notes about this approval..."
                : "Please provide a reason for rejection..."
            }
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={actionType === "approve" ? "success" : "error"}
          >
            Confirm {actionType === "approve" ? "Approval" : "Rejection"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WaitingList;

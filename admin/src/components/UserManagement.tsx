import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  Select,
  FormControl,
  InputLabel,
  Button,
  Divider,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { adminService, type User } from "../services/adminService";
import UserDetailDialog from "./UserDetailDialog";

const UserManagement: React.FC = () => {
  const location = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(
    (location.state as any)?.roleFilter || "all",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, search, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
        excludeRole: "admin", // Exclude admins from user management
      };
      if (search) params.search = search;
      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter !== "all") params.isActive = statusFilter;

      const response = await adminService.getUsers(params);
      if (response.status && response.data) {
        // Filter out admins on client side as well (in case API doesn't support excludeRole)
        const filteredUsers = response.data.filter(
          (user) => user.role !== "admin",
        );
        setUsers(filteredUsers);
        setTotal(response.pagination?.total || filteredUsers.length);
      } else {
        setError(response.message || "Failed to load users");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleViewUser = (user: User) => {
    setViewingUser(user);
    setDetailDialogOpen(true);
    handleMenuClose();
  };

  const handleStatusChange = async (isActive: boolean) => {
    if (!selectedUser) return;

    try {
      await adminService.updateUserStatus(selectedUser._id, {
        isActive,
        reason: isActive
          ? "Account activated by admin"
          : "Account deactivated by admin",
      });
      setSuccessMessage(
        `User ${isActive ? "activated" : "deactivated"} successfully`,
      );
      handleMenuClose();
      fetchUsers();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update user status",
      );
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "influencer":
        return "primary";
      case "brand":
        return "warning";
      case "vendor":
        return "secondary";
      default:
        return "default";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "influencer":
        return "Influencer";
      case "brand":
        return "Brand";
      case "vendor":
        return "Vendor";
      default:
        return role;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
        User Management
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            placeholder="Search users by name or email..."
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
              ),
            }}
            sx={{ flexGrow: 1, minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>User Type</InputLabel>
            <Select
              value={roleFilter}
              label="User Type"
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="influencer">Influencers</MenuItem>
              <MenuItem value="brand">Brands</MenuItem>
              <MenuItem value="vendor">Vendors</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={fetchUsers}
            sx={{ minWidth: 100 }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccessMessage("")}
        >
          {successMessage}
        </Alert>
      )}

      <TableContainer component={Paper}>
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
          >
            <CircularProgress />
          </Box>
        ) : users.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">No users found</Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell>
                    <strong>Name</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Email</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Phone</strong>
                  </TableCell>
                  <TableCell>
                    <strong>User Type</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Created</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Actions</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell>{user.name || "N/A"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "N/A"}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        color={getRoleColor(user.role) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? "Active" : "Inactive"}
                        color={user.isActive ? "success" : "default"}
                        size="small"
                        icon={
                          user.isActive ? <CheckCircleIcon /> : <BlockIcon />
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, user)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedUser && handleViewUser(selectedUser)}>
          <VisibilityIcon sx={{ mr: 1, fontSize: 20 }} />
          View Details
        </MenuItem>
        <Divider />
        {selectedUser?.isActive ? (
          <MenuItem
            onClick={() => handleStatusChange(false)}
            sx={{ color: "error.main" }}
          >
            <BlockIcon sx={{ mr: 1, fontSize: 20 }} />
            Deactivate User
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => handleStatusChange(true)}
            sx={{ color: "success.main" }}
          >
            <CheckCircleIcon sx={{ mr: 1, fontSize: 20 }} />
            Activate User
          </MenuItem>
        )}
      </Menu>

      {viewingUser && (
        <UserDetailDialog
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setViewingUser(null);
          }}
          userId={viewingUser._id}
          onUserUpdated={fetchUsers}
        />
      )}
    </Box>
  );
};

export default UserManagement;

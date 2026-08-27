import React, { useEffect, useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  Button,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { adminService, type User } from '../services/adminService';

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, [page, rowsPerPage, search, statusFilter]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.isActive = statusFilter;

      const response = await adminService.getAdmins(params);
      if (response.status && response.data) {
        setAdmins(response.data);
        setTotal(response.pagination?.total || response.data.length);
      } else {
        setError(response.message || 'Failed to load admins');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, admin: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedAdmin(admin);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAdmin(null);
  };

  const handleStatusChange = async (isActive: boolean) => {
    if (!selectedAdmin) return;

    try {
      await adminService.updateUserStatus(selectedAdmin._id, {
        isActive,
        reason: isActive ? 'Admin account activated' : 'Admin account deactivated',
      });
      setSuccessMessage(`Admin ${isActive ? 'activated' : 'deactivated'} successfully`);
      handleMenuClose();
      fetchAdmins();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update admin status');
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <AdminIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Typography variant="h4" fontWeight="bold">
          Admin Management
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search admins by name or email..."
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ flexGrow: 1, minWidth: 250 }}
          />
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
          <Button variant="outlined" onClick={fetchAdmins} sx={{ minWidth: 100 }}>
            Refresh
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <TableContainer component={Paper}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : admins.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">No admins found</Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Phone</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin._id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <AdminIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                        {admin.name || 'N/A'}
                      </Box>
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={admin.isActive ? 'Active' : 'Inactive'}
                        color={admin.isActive ? 'success' : 'default'}
                        size="small"
                        icon={admin.isActive ? <CheckCircleIcon /> : <BlockIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, admin)}
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
        {selectedAdmin?.isActive ? (
          <MenuItem
            onClick={() => handleStatusChange(false)}
            sx={{ color: 'error.main' }}
          >
            <BlockIcon sx={{ mr: 1, fontSize: 20 }} />
            Deactivate Admin
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => handleStatusChange(true)}
            sx={{ color: 'success.main' }}
          >
            <CheckCircleIcon sx={{ mr: 1, fontSize: 20 }} />
            Activate Admin
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default AdminManagement;


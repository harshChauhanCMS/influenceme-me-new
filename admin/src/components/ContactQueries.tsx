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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextareaAutosize,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  Search as SearchIcon,
  ContactSupport as ContactIcon,
} from '@mui/icons-material';
import api from '../services/api';

interface ContactQuery {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  phoneCode?: string;
  message: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  userRole?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  adminResponse?: string;
  respondedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const ContactQueries: React.FC = () => {
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedQuery, setSelectedQuery] = useState<ContactQuery | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState<string>('resolved');

  useEffect(() => {
    fetchQueries();
  }, [page, rowsPerPage, statusFilter]);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, number | string> = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await api.get('/api/contact/queries', { params });

      if (response.data.status) {
        setQueries(response.data.data.queries);
        setTotal(response.data.data.pagination.total);
      } else {
        setError(response.data.message || 'Failed to fetch contact queries');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch contact queries');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, query: ContactQuery) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuery(query);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedQuery(null);
  };

  const handleView = () => {
    if (selectedQuery) {
      setViewDialogOpen(true);
      handleMenuClose();
    }
  };

  const handleRespond = () => {
    if (selectedQuery) {
      setResponseText(selectedQuery.adminResponse || '');
      setNewStatus(selectedQuery.status);
      setRespondDialogOpen(true);
      handleMenuClose();
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedQuery) return;

    try {
      const response = await api.patch(
        `/api/contact/queries/${selectedQuery._id}/status`,
        { status },
      );

      if (response.data.status) {
        setSuccessMessage('Status updated successfully');
        fetchQueries();
        handleMenuClose();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Failed to update status');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedQuery || !responseText.trim()) {
      setError('Response text is required');
      return;
    }

    try {
      const response = await api.post(
        `/api/contact/queries/${selectedQuery._id}/respond`,
        {
          adminResponse: responseText,
          status: newStatus,
        },
      );

      if (response.data.status) {
        setSuccessMessage('Response sent successfully');
        setRespondDialogOpen(false);
        setResponseText('');
        fetchQueries();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Failed to send response');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send response');
    }
  };

  const handleDelete = async () => {
    if (!selectedQuery) return;

    if (!window.confirm('Are you sure you want to delete this contact query?')) {
      handleMenuClose();
      return;
    }

    try {
      const response = await api.delete(
        `/api/contact/queries/${selectedQuery._id}`,
      );

      if (response.data.status) {
        setSuccessMessage('Contact query deleted successfully');
        fetchQueries();
        handleMenuClose();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Failed to delete contact query');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete contact query');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredQueries = queries.filter((query) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      query.firstName.toLowerCase().includes(searchLower) ||
      query.lastName.toLowerCase().includes(searchLower) ||
      query.email.toLowerCase().includes(searchLower) ||
      query.message.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ContactIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Contact Queries
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            placeholder="Search queries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
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
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredQueries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary" sx={{ py: 3 }}>
                          No contact queries found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQueries.map((query) => (
                      <TableRow key={query._id} hover>
                        <TableCell>
                          {query.firstName} {query.lastName}
                        </TableCell>
                        <TableCell>{query.email}</TableCell>
                        <TableCell>
                          {query.phoneCode && query.phone
                            ? `${query.phoneCode} ${query.phone}`
                            : query.phone || '-'}
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 300,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {query.message}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {query.userId ? (
                            <Chip
                              label={query.userId.name || query.userId.email}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ) : (
                            <Chip label="Guest" size="small" color="default" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={query.status.replace('_', ' ').toUpperCase()}
                            size="small"
                            color={getStatusColor(query.status) as any}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(query.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, query)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </Paper>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Contact Query Details</DialogTitle>
        <DialogContent>
          {selectedQuery && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Name
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedQuery.firstName} {selectedQuery.lastName}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedQuery.email}
              </Typography>

              {selectedQuery.phone && (
                <>
                  <Typography variant="subtitle2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedQuery.phoneCode} {selectedQuery.phone}
                  </Typography>
                </>
              )}

              {selectedQuery.userId && (
                <>
                  <Typography variant="subtitle2" color="text.secondary">
                    User
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedQuery.userId.name} ({selectedQuery.userId.email}) - {selectedQuery.userId.role}
                  </Typography>
                </>
              )}

              <Typography variant="subtitle2" color="text.secondary">
                Message
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {selectedQuery.message}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={selectedQuery.status.replace('_', ' ').toUpperCase()}
                size="small"
                color={getStatusColor(selectedQuery.status) as any}
                sx={{ mb: 2 }}
              />

              {selectedQuery.adminResponse && (
                <>
                  <Typography variant="subtitle2" color="text.secondary">
                    Admin Response
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                    {selectedQuery.adminResponse}
                  </Typography>
                </>
              )}

              {selectedQuery.respondedBy && (
                <>
                  <Typography variant="subtitle2" color="text.secondary">
                    Responded By
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedQuery.respondedBy.name} on{' '}
                    {new Date(selectedQuery.respondedAt || '').toLocaleString()}
                  </Typography>
                </>
              )}

              <Typography variant="subtitle2" color="text.secondary">
                Submitted
              </Typography>
              <Typography variant="body1">
                {new Date(selectedQuery.createdAt).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Respond Dialog */}
      <Dialog open={respondDialogOpen} onClose={() => setRespondDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Respond to Contact Query</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={newStatus}
                label="Status"
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Response
            </Typography>
            <TextareaAutosize
              minRows={6}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Enter your response..."
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontFamily: 'inherit',
                fontSize: '14px',
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRespondDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitResponse} variant="contained" disabled={!responseText.trim()}>
            Send Response
          </Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleView}>
          <VisibilityIcon sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        <MenuItem onClick={handleRespond}>
          <ReplyIcon sx={{ mr: 1 }} fontSize="small" />
          Respond
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleStatusChange('pending');
          }}
        >
          Mark as Pending
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleStatusChange('in_progress');
          }}
        >
          Mark as In Progress
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleStatusChange('resolved');
          }}
        >
          Mark as Resolved
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleStatusChange('closed');
          }}
        >
          Mark as Closed
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ContactQueries;


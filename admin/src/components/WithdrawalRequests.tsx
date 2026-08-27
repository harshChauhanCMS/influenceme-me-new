import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../services/api';

interface WithdrawalRequest {
  _id: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bankAccount?: {
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
  upiId?: string;
  requestedAt: string;
  processedAt?: string;
  reason?: string;
}

const WithdrawalRequests: React.FC = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);

  useEffect(() => {
    fetchWithdrawalRequests();
  }, []);

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/payments/withdrawals');
      if (response.data.status && response.data.data) {
        setRequests(response.data.data);
      } else {
        // Dummy withdrawal requests
        setRequests(getDummyRequests());
      }
    } catch (err: any) {
      console.error('Error fetching withdrawal requests:', err);
      setRequests(getDummyRequests());
      setError('');
    } finally {
      setLoading(false);
    }
  };

  const getDummyRequests = (): WithdrawalRequest[] => {
    return [
      {
        _id: '1',
        userId: 'user1',
        userName: 'Influencer One',
        amount: 15000,
        status: 'pending',
        bankAccount: {
          accountNumber: '****1234',
          ifsc: 'HDFC0001234',
          bankName: 'HDFC Bank',
        },
        requestedAt: new Date().toISOString(),
      },
      {
        _id: '2',
        userId: 'user2',
        userName: 'Vendor Two',
        amount: 25000,
        status: 'pending',
        upiId: 'vendor2@paytm',
        requestedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        _id: '3',
        userId: 'user3',
        userName: 'Influencer Three',
        amount: 8000,
        status: 'approved',
        bankAccount: {
          accountNumber: '****5678',
          ifsc: 'ICIC0005678',
          bankName: 'ICICI Bank',
        },
        requestedAt: new Date(Date.now() - 172800000).toISOString(),
        processedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, request: WithdrawalRequest) => {
    setAnchorEl(event.currentTarget);
    setSelectedRequest(request);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRequest(null);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await api.put(`/api/admin/payments/withdrawals/${selectedRequest._id}/approve`);
      fetchWithdrawalRequests();
      handleMenuClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve withdrawal');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await api.put(`/api/admin/payments/withdrawals/${selectedRequest._id}/reject`, {
        reason: 'Rejected by admin',
      });
      fetchWithdrawalRequests();
      handleMenuClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject withdrawal');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
        Withdrawal Requests
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchWithdrawalRequests}
          disabled={loading}
        >
          Refresh
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : requests.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">No withdrawal requests found</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>User</strong></TableCell>
                <TableCell><strong>Amount</strong></TableCell>
                <TableCell><strong>Payment Method</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Requested At</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request._id} hover>
                  <TableCell>{request.userName}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      ₹{request.amount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {request.bankAccount ? (
                      <Box>
                        <Typography variant="body2">
                          {request.bankAccount.bankName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {request.bankAccount.accountNumber} | {request.bankAccount.ifsc}
                        </Typography>
                      </Box>
                    ) : request.upiId ? (
                      <Typography variant="body2">UPI: {request.upiId}</Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={request.status}
                      color={getStatusColor(request.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(request.requestedAt).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {request.status === 'pending' && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, request)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleApprove} sx={{ color: 'success.main' }}>
          <CheckCircleIcon sx={{ mr: 1, fontSize: 20 }} />
          Approve
        </MenuItem>
        <MenuItem onClick={handleReject} sx={{ color: 'error.main' }}>
          <CancelIcon sx={{ mr: 1, fontSize: 20 }} />
          Reject
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default WithdrawalRequests;


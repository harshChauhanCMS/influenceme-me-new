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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../services/api';

interface PayoutMilestoneRequest {
  _id: string;
  paymentId: string;
  dealId: string;
  payeeId: string;
  payeeType: 'influencer' | 'vendor';
  milestoneNumber: 1 | 2 | 3;
  percentage: 30 | 40;
  amount: number;
  currency: string;
  status: 'locked' | 'pending' | 'requested' | 'paid' | 'rejected';
  workNote?: string;
  requestedAt?: string;
}

const PayoutMilestones: React.FC = () => {
  const [requests, setRequests] = useState<PayoutMilestoneRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRequest, setSelectedRequest] = useState<PayoutMilestoneRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/payouts/milestones');
      setRequests(response.data?.data?.milestones || []);
    } catch (err: any) {
      console.error('Error fetching payout milestone requests:', err);
      setError(err.response?.data?.message || 'Failed to load payout milestone requests');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, request: PayoutMilestoneRequest) => {
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
      setActionLoading(true);
      await api.put(`/api/admin/payouts/milestones/${selectedRequest._id}/approve`);
      handleMenuClose();
      fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve milestone');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectDialog = () => {
    setRejectDialogOpen(true);
    setAnchorEl(null);
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;
    try {
      setActionLoading(true);
      await api.put(`/api/admin/payouts/milestones/${selectedRequest._id}/reject`, {
        adminNote: rejectReason,
      });
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject milestone');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
        Payout Milestones
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Influencers/vendors are paid out in 3 fixed milestones (30% / 30% / 40%) as work is
        delivered. Approving a request here only marks it paid in the system — transfer the funds
        to the payee's bank account manually before approving.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchRequests}
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
            <Typography color="text.secondary">No pending milestone release requests</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Payee</strong></TableCell>
                <TableCell><strong>Payment</strong></TableCell>
                <TableCell><strong>Milestone</strong></TableCell>
                <TableCell><strong>Amount</strong></TableCell>
                <TableCell><strong>Work Note</strong></TableCell>
                <TableCell><strong>Requested At</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request._id} hover>
                  <TableCell>
                    <Typography variant="body2">{request.payeeId}</Typography>
                    <Chip label={request.payeeType} size="small" sx={{ mt: 0.5 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {request.paymentId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {request.milestoneNumber} of 3 ({request.percentage}%)
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {request.currency} {request.amount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 240 }}>
                      {request.workNote || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {request.requestedAt ? new Date(request.requestedAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, request)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleApprove} disabled={actionLoading} sx={{ color: 'success.main' }}>
          <CheckCircleIcon sx={{ mr: 1, fontSize: 20 }} />
          Approve (mark paid)
        </MenuItem>
        <MenuItem onClick={openRejectDialog} disabled={actionLoading} sx={{ color: 'error.main' }}>
          <CancelIcon sx={{ mr: 1, fontSize: 20 }} />
          Reject
        </MenuItem>
      </Menu>

      <Dialog open={rejectDialogOpen} onClose={() => !actionLoading && setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Milestone Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Explain why this request is being rejected — the payee will see this note and can
            re-request once addressed.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Please share proof of the completed deliverable first"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleReject}
            disabled={actionLoading || !rejectReason.trim()}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayoutMilestones;

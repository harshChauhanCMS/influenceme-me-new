import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { videoPurposeService, type VideoPurpose } from '../services/videoPurposeService';

const VideoPurposes: React.FC = () => {
  const [purposes, setPurposes] = useState<VideoPurpose[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPurpose, setEditingPurpose] = useState<VideoPurpose | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPurposes();
  }, []);

  const fetchPurposes = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await videoPurposeService.getPurposes();
      setPurposes(data);
    } catch (err: any) {
      console.error('Error fetching video purposes:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load video purposes');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingPurpose(null);
    setFormData({
      name: '',
      description: '',
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (purpose: VideoPurpose) => {
    setEditingPurpose(purpose);
    setFormData({
      name: purpose.name,
      description: purpose.description || '',
      isActive: purpose.isActive,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (purposeId: string) => {
    if (window.confirm('Are you sure you want to delete this video purpose? Videos using this purpose will need to be updated first.')) {
      try {
        await videoPurposeService.deletePurpose(purposeId);
        setSuccess('Video purpose deleted successfully');
        fetchPurposes();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to delete video purpose');
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (editingPurpose) {
        await videoPurposeService.updatePurpose(editingPurpose._id, formData);
        setSuccess('Video purpose updated successfully');
      } else {
        await videoPurposeService.createPurpose(formData);
        setSuccess('Video purpose created successfully');
      }

      setDialogOpen(false);
      fetchPurposes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save video purpose');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (purpose: VideoPurpose) => {
    try {
      await videoPurposeService.updatePurpose(purpose._id, {
        name: purpose.name,
        description: purpose.description,
        isActive: !purpose.isActive,
      });
      setSuccess(`Video purpose ${!purpose.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchPurposes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update video purpose status');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Video Purposes
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Purpose
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

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
        ) : purposes.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">No video purposes found</Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purposes
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((purpose) => (
                    <TableRow key={purpose._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {purpose.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                          {purpose.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={purpose.isActive ? 'Active' : 'Inactive'}
                          color={purpose.isActive ? 'success' : 'default'}
                          size="small"
                          onClick={() => handleToggleActive(purpose)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(purpose.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(purpose)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(purpose._id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </>
        )}
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPurpose ? 'Edit Video Purpose' : 'Add New Video Purpose'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Website Services, User Guide, Show Case"
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description for this video purpose"
            />
            <Box>
              <Chip
                label={formData.isActive ? 'Active' : 'Inactive'}
                color={formData.isActive ? 'success' : 'default'}
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                sx={{ cursor: 'pointer' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !formData.name.trim()}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoPurposes;


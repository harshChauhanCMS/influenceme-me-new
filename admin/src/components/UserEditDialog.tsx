import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Tabs,
  Tab,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { adminService, type UserDetail } from '../services/adminService';

interface UserEditDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onUserUpdated?: () => void;
}

const UserEditDialog: React.FC<UserEditDialogProps> = ({
  open,
  onClose,
  userId,
  onUserUpdated,
}) => {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Form state
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails();
    }
  }, [open, userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminService.getUserById(userId);
      if (response.status && response.data) {
        setUser(response.data);
        setFormData(response.data);
      } else {
        setError(response.message || 'Failed to load user details');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  const handleArrayAdd = (field: string, value: string) => {
    if (!value.trim()) return;
    setFormData((prev: any) => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()],
    }));
  };

  const handleArrayRemove = (field: string, index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: prev[field].filter((_: any, i: number) => i !== index),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await adminService.updateUser(userId, formData);
      if (response.status) {
        setSuccess('User updated successfully');
        if (onUserUpdated) {
          onUserUpdated();
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(response.message || 'Failed to update user');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!user) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogContent>
          <Alert severity="error">User not found</Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold">
            Edit User: {user.name}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
          <Tab label="Basic Info" />
          <Tab label="Contact & Address" />
          {user.role === 'influencer' && <Tab label="Influencer Info" />}
          {user.role === 'brand' && <Tab label="Business Info" />}
          {user.role === 'vendor' && <Tab label="Vendor Info" />}
          <Tab label="Social Media" />
          <Tab label="Account Settings" />
        </Tabs>

        {/* Basic Info Tab */}
        {tabValue === 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
              },
              gap: 2,
            }}
          >
            <Box>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Phone Code"
                  value={formData.phoneCode || ''}
                  onChange={(e) => handleInputChange('phoneCode', e.target.value)}
                  placeholder="+91"
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.country || ''}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <TextField
                  fullWidth
                  label="Profile Picture URL"
                  value={formData.profilePictureUrl || ''}
                  onChange={(e) => handleInputChange('profilePictureUrl', e.target.value)}
                />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="subtitle2" gutterBottom>
                  Spoken Languages
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  {(formData.spokenLanguages || []).map((lang: string, idx: number) => (
                    <Chip
                      key={idx}
                      label={lang}
                      onDelete={() => handleArrayRemove('spokenLanguages', idx)}
                    />
                  ))}
                </Box>
                <Box display="flex" gap={1}>
                  <TextField
                    size="small"
                    placeholder="Add language"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleArrayAdd('spokenLanguages', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </Box>
            </Box>
          </Box>
        )}

        {/* Contact & Address Tab */}
        {tabValue === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Address Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                },
                gap: 2,
              }}
            >
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={formData.addresses?.streetAddress || ''}
                  onChange={(e) => handleNestedChange('addresses', 'streetAddress', e.target.value)}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.addresses?.city || ''}
                  onChange={(e) => handleNestedChange('addresses', 'city', e.target.value)}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="State"
                  value={formData.addresses?.state || ''}
                  onChange={(e) => handleNestedChange('addresses', 'state', e.target.value)}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.addresses?.country || ''}
                  onChange={(e) => handleNestedChange('addresses', 'country', e.target.value)}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="PIN Code"
                  value={formData.addresses?.pinCode || ''}
                  onChange={(e) => handleNestedChange('addresses', 'pinCode', e.target.value)}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Latitude"
                  value={formData.addresses?.latitude || ''}
                  onChange={(e) => handleNestedChange('addresses', 'latitude', e.target.value)}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Longitude"
                  value={formData.addresses?.longitude || ''}
                  onChange={(e) => handleNestedChange('addresses', 'longitude', e.target.value)}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* Influencer Info Tab */}
        {tabValue === 2 && user.role === 'influencer' && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
              },
              gap: 2,
            }}
          >
            <Box>
                <TextField
                  fullWidth
                  label="Influencer Since"
                  value={formData.influencerInfo?.influencerSince || ''}
                  onChange={(e) => handleNestedChange('influencerInfo', 'influencerSince', e.target.value)}
                />
            </Box>
            <Box>
                <FormControl fullWidth>
                  <InputLabel>Influencer Type</InputLabel>
                  <Select
                    value={formData.influencerInfo?.influencerType || ''}
                    label="Influencer Type"
                    onChange={(e) => handleNestedChange('influencerInfo', 'influencerType', e.target.value)}
                  >
                    <MenuItem value="micro">Micro</MenuItem>
                    <MenuItem value="macro">Macro</MenuItem>
                    <MenuItem value="mega">Mega</MenuItem>
                    <MenuItem value="nano">Nano</MenuItem>
                  </Select>
                </FormControl>
            </Box>
            <Box>
                <FormControl fullWidth>
                  <InputLabel>Work Type</InputLabel>
                  <Select
                    value={formData.influencerInfo?.workType || ''}
                    label="Work Type"
                    onChange={(e) => handleNestedChange('influencerInfo', 'workType', e.target.value)}
                  >
                    <MenuItem value="full-time">Full Time</MenuItem>
                    <MenuItem value="part-time">Part Time</MenuItem>
                    <MenuItem value="freelance">Freelance</MenuItem>
                  </Select>
                </FormControl>
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Marital Status"
                  value={formData.influencerInfo?.maritalStatus || ''}
                  onChange={(e) => handleNestedChange('influencerInfo', 'maritalStatus', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  type="number"
                  label="Children"
                  value={formData.influencerInfo?.children || ''}
                  onChange={(e) => handleNestedChange('influencerInfo', 'children', parseInt(e.target.value) || 0)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  type="number"
                  label="Pets"
                  value={formData.influencerInfo?.pets || ''}
                  onChange={(e) => handleNestedChange('influencerInfo', 'pets', parseInt(e.target.value) || 0)}
                />
            </Box>
            <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.influencerInfo?.showOnTop || false}
                      onChange={(e) => handleNestedChange('influencerInfo', 'showOnTop', e.target.checked)}
                    />
                  }
                  label="Show on Top"
                />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="subtitle2" gutterBottom>
                  Genres
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  {(formData.influencerInfo?.genre || []).map((genre: string, idx: number) => (
                    <Chip
                      key={idx}
                      label={genre}
                      onDelete={() => {
                        const newGenres = [...(formData.influencerInfo?.genre || [])];
                        newGenres.splice(idx, 1);
                        handleNestedChange('influencerInfo', 'genre', newGenres);
                      }}
                    />
                  ))}
                </Box>
                <Box display="flex" gap={1}>
                  <TextField
                    size="small"
                    placeholder="Add genre"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = (e.target as HTMLInputElement).value;
                        if (value.trim()) {
                          handleNestedChange('influencerInfo', 'genre', [
                            ...(formData.influencerInfo?.genre || []),
                            value.trim(),
                          ]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </Box>
            </Box>
          </Box>
        )}

        {/* Business Info Tab (Brand) */}
        {tabValue === 2 && user.role === 'brand' && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
              },
              gap: 2,
            }}
          >
            <Box>
                <TextField
                  fullWidth
                  label="Business Name"
                  value={formData.businessInfo?.businessName || ''}
                  onChange={(e) => handleNestedChange('businessInfo', 'businessName', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Business Email"
                  type="email"
                  value={formData.businessInfo?.businessEmail || ''}
                  onChange={(e) => handleNestedChange('businessInfo', 'businessEmail', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Website URL"
                  value={formData.businessInfo?.websiteUrl || ''}
                  onChange={(e) => handleNestedChange('businessInfo', 'websiteUrl', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Business Type"
                  value={formData.businessInfo?.businessType || ''}
                  onChange={(e) => handleNestedChange('businessInfo', 'businessType', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Industry"
                  value={formData.businessInfo?.industry || ''}
                  onChange={(e) => handleNestedChange('businessInfo', 'industry', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Business Size"
                  value={formData.businessInfo?.businessSize || ''}
                  onChange={(e) => handleNestedChange('businessInfo', 'businessSize', e.target.value)}
                />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Business Description"
                  value={formData.businessInfo?.businessDescription || ''}
                  onChange={(e) => handleNestedChange('businessInfo', 'businessDescription', e.target.value)}
                />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.businessInfo?.description || ''}
                  onChange={(e) => handleNestedChange('businessInfo', 'description', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Logo URL"
                  value={formData.businessInfo?.logoUrl || ''}
                  onChange={(e) => handleNestedChange('businessInfo', 'logoUrl', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Banner URL"
                  value={formData.businessInfo?.bannerUrl || ''}
                  onChange={(e) => handleNestedChange('businessInfo', 'bannerUrl', e.target.value)}
                />
            </Box>
          </Box>
        )}

        {/* Vendor Info Tab */}
        {tabValue === 2 && user.role === 'vendor' && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
              },
              gap: 2,
            }}
          >
            <Box>
                <TextField
                  fullWidth
                  label="Vendor Since"
                  value={formData.vendorInfo?.vendorSince || ''}
                  onChange={(e) => handleNestedChange('vendorInfo', 'vendorSince', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Vendor Type"
                  value={formData.vendorInfo?.vendorType || ''}
                  onChange={(e) => handleNestedChange('vendorInfo', 'vendorType', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Business Name"
                  value={formData.vendorInfo?.businessName || ''}
                  onChange={(e) => handleNestedChange('vendorInfo', 'businessName', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Registration Number"
                  value={formData.vendorInfo?.businessRegistrationNumber || ''}
                  onChange={(e) => handleNestedChange('vendorInfo', 'businessRegistrationNumber', e.target.value)}
                />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={formData.vendorInfo?.description || ''}
                  onChange={(e) => handleNestedChange('vendorInfo', 'description', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  type="number"
                  label="Experience (Years)"
                  value={formData.vendorInfo?.experience || ''}
                  onChange={(e) => handleNestedChange('vendorInfo', 'experience', parseInt(e.target.value) || 0)}
                />
            </Box>
            <Box>
                <FormControl fullWidth>
                  <InputLabel>Availability</InputLabel>
                  <Select
                    value={formData.vendorInfo?.availability || ''}
                    label="Availability"
                    onChange={(e) => handleNestedChange('vendorInfo', 'availability', e.target.value)}
                  >
                    <MenuItem value="full-time">Full Time</MenuItem>
                    <MenuItem value="part-time">Part Time</MenuItem>
                    <MenuItem value="on-demand">On Demand</MenuItem>
                  </Select>
                </FormControl>
            </Box>
            <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.vendorInfo?.isVerified || false}
                      onChange={(e) => handleNestedChange('vendorInfo', 'isVerified', e.target.checked)}
                    />
                  }
                  label="Verified"
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  type="number"
                  label="Rating"
                  value={formData.vendorInfo?.rating || ''}
                  onChange={(e) => handleNestedChange('vendorInfo', 'rating', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Reviews"
                  value={formData.vendorInfo?.totalReviews || ''}
                  onChange={(e) => handleNestedChange('vendorInfo', 'totalReviews', parseInt(e.target.value) || 0)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  type="number"
                  label="Completed Projects"
                  value={formData.vendorInfo?.completedProjects || ''}
                  onChange={(e) => handleNestedChange('vendorInfo', 'completedProjects', parseInt(e.target.value) || 0)}
                />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="subtitle2" gutterBottom>
                  Services Offered
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  {(formData.vendorInfo?.servicesOffered || []).map((service: string, idx: number) => (
                    <Chip
                      key={idx}
                      label={service}
                      onDelete={() => {
                        const newServices = [...(formData.vendorInfo?.servicesOffered || [])];
                        newServices.splice(idx, 1);
                        handleNestedChange('vendorInfo', 'servicesOffered', newServices);
                      }}
                    />
                  ))}
                </Box>
                <TextField
                  size="small"
                  placeholder="Add service"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = (e.target as HTMLInputElement).value;
                      if (value.trim()) {
                        handleNestedChange('vendorInfo', 'servicesOffered', [
                          ...(formData.vendorInfo?.servicesOffered || []),
                          value.trim(),
                        ]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="subtitle2" gutterBottom>
                  Service Areas
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  {(formData.vendorInfo?.serviceAreas || []).map((area: string, idx: number) => (
                    <Chip
                      key={idx}
                      label={area}
                      onDelete={() => {
                        const newAreas = [...(formData.vendorInfo?.serviceAreas || [])];
                        newAreas.splice(idx, 1);
                        handleNestedChange('vendorInfo', 'serviceAreas', newAreas);
                      }}
                    />
                  ))}
                </Box>
                <TextField
                  size="small"
                  placeholder="Add service area"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = (e.target as HTMLInputElement).value;
                      if (value.trim()) {
                        handleNestedChange('vendorInfo', 'serviceAreas', [
                          ...(formData.vendorInfo?.serviceAreas || []),
                          value.trim(),
                        ]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
            </Box>
          </Box>
        )}

        {/* Admin Info Tab (placeholder) */}
        {tabValue === 2 && user.role === 'admin' && (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Admin users have basic profile information only.
            </Typography>
          </Box>
        )}

        {/* Social Media Tab */}
        {tabValue === 3 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
              },
              gap: 2,
            }}
          >
            <Box>
                <TextField
                  fullWidth
                  label="Instagram"
                  value={formData.instagram || ''}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Facebook"
                  value={formData.facebook || ''}
                  onChange={(e) => handleInputChange('facebook', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Twitter"
                  value={formData.twitter || ''}
                  onChange={(e) => handleInputChange('twitter', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="LinkedIn"
                  value={formData.linkedin || ''}
                  onChange={(e) => handleInputChange('linkedin', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="YouTube"
                  value={formData.youtube || ''}
                  onChange={(e) => handleInputChange('youtube', e.target.value)}
                />
            </Box>
            <Box>
                <TextField
                  fullWidth
                  label="Website"
                  value={formData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                />
            </Box>
          </Box>
        )}

        {/* Account Settings Tab */}
        {tabValue === 4 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
              },
              gap: 2,
            }}
          >
            <Box>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={formData.role || ''}
                    label="Role"
                    onChange={(e) => handleInputChange('role', e.target.value)}
                  >
                    <MenuItem value="influencer">Influencer</MenuItem>
                    <MenuItem value="brand">Brand</MenuItem>
                    <MenuItem value="vendor">Vendor</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
            </Box>
            <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive || false}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    />
                  }
                  label="Active Status"
                />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <TextField
                  fullWidth
                  type="password"
                  label="New Password (Leave empty to keep current)"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleInputChange('password', e.target.value);
                    }
                  }}
                  helperText="Only enter if you want to change the password"
                />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserEditDialog;


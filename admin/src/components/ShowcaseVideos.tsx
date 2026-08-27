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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { showcaseVideoService, type ShowcaseVideo as ShowcaseVideoType } from '../services/showcaseVideoService';
import { videoPurposeService, type VideoPurpose } from '../services/videoPurposeService';

const ShowcaseVideos: React.FC = () => {
  const [videos, setVideos] = useState<ShowcaseVideoType[]>([]);
  const [videoPurposes, setVideoPurposes] = useState<VideoPurpose[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<ShowcaseVideoType | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    videoPurpose: '',
    order: 1,
    isActive: true,
    thumbnailUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVideos();
    fetchVideoPurposes();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await showcaseVideoService.getVideos();
      setVideos(data);
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoPurposes = async () => {
    try {
      const data = await videoPurposeService.getPurposes();
      setVideoPurposes(data);
    } catch (err: any) {
      console.error('Error fetching video purposes:', err);
    }
  };

  const handleAdd = () => {
    setEditingVideo(null);
    setFormData({
      title: '',
      description: '',
      youtubeUrl: '',
      videoPurpose: '',
      order: videos.length + 1,
      isActive: true,
      thumbnailUrl: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (video: ShowcaseVideoType) => {
    setEditingVideo(video);
    let purposeId = '';
    
    if (video.videoPurpose) {
      if (typeof video.videoPurpose === 'string') {
        purposeId = video.videoPurpose;
      } else if (typeof video.videoPurpose === 'object' && video.videoPurpose !== null) {
        purposeId = (video.videoPurpose as VideoPurpose)._id;
      }
    }
    
    setFormData({
      title: video.title,
      description: video.description,
      youtubeUrl: video.youtubeUrl,
      videoPurpose: purposeId,
      order: video.order,
      isActive: video.isActive,
      thumbnailUrl: video.thumbnailUrl || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (videoId: string) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await showcaseVideoService.deleteVideo(videoId);
        setSuccess('Video deleted successfully');
        fetchVideos();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to delete video');
      }
    }
  };

  const handleSave = async () => {
    if (!formData.title) {
      setError('Title is required');
      return;
    }

    if (!formData.youtubeUrl) {
      setError('YouTube URL is required');
      return;
    }

    if (!formData.videoPurpose) {
      setError('Video Purpose is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const videoData: any = {
        title: formData.title,
        description: formData.description,
        youtubeUrl: formData.youtubeUrl,
        videoPurpose: formData.videoPurpose,
        order: formData.order,
        isActive: formData.isActive,
      };

      if (formData.thumbnailUrl) {
        videoData.thumbnailUrl = formData.thumbnailUrl;
      }

      if (editingVideo) {
        await showcaseVideoService.updateVideo(editingVideo._id, videoData);
        setSuccess('Video updated successfully');
      } else {
        await showcaseVideoService.createVideo(videoData);
        setSuccess('Video added successfully');
      }

      setDialogOpen(false);
      fetchVideos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save video');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (video: ShowcaseVideoType) => {
    try {
      let purposeId = '';
      
      if (video.videoPurpose) {
        if (typeof video.videoPurpose === 'string') {
          purposeId = video.videoPurpose;
        } else if (typeof video.videoPurpose === 'object' && video.videoPurpose !== null) {
          purposeId = (video.videoPurpose as VideoPurpose)._id;
        }
      }

      await showcaseVideoService.updateVideo(video._id, {
        title: video.title,
        description: video.description,
        youtubeUrl: video.youtubeUrl,
        videoPurpose: purposeId,
        order: video.order,
        isActive: !video.isActive,
      });
      setSuccess(`Video ${!video.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchVideos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update video status');
    }
  };

  const getPurposeName = (video: ShowcaseVideoType): string => {
    if (!video.videoPurpose) {
      return 'No Purpose';
    }
    
    if (typeof video.videoPurpose === 'string') {
      const purpose = videoPurposes.find(p => p._id === video.videoPurpose);
      return purpose?.name || 'Unknown';
    }
    
    // If it's an object, check if it has a name property
    if (typeof video.videoPurpose === 'object' && video.videoPurpose !== null) {
      return (video.videoPurpose as VideoPurpose).name || 'Unknown';
    }
    
    return 'Unknown';
  };

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const getYouTubeThumbnail = (url: string): string => {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      // Use hqdefault as default (more reliable than maxresdefault)
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    return '';
  };

  const handleYoutubeUrlChange = (url: string) => {
    setFormData({ ...formData, youtubeUrl: url });
    // Auto-generate thumbnail if not manually set
    if (!formData.thumbnailUrl || formData.thumbnailUrl === editingVideo?.thumbnailUrl) {
      const thumbnail = getYouTubeThumbnail(url);
      if (thumbnail) {
        setFormData(prev => ({ ...prev, thumbnailUrl: thumbnail }));
      }
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Multipurpose Videos
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Video
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
        ) : videos.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">No videos found</Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Order</strong></TableCell>
                  <TableCell><strong>Title</strong></TableCell>
                  <TableCell><strong>Purpose</strong></TableCell>
                  <TableCell><strong>YouTube URL</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Updated</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {videos
                  .sort((a, b) => a.order - b.order)
                  .map((video) => (
                    <TableRow key={video._id} hover>
                      <TableCell>{video.order}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {video.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getPurposeName(video)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={video.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ fontSize: '0.875rem' }}
                        >
                          View on YouTube
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={video.isActive ? 'Active' : 'Inactive'}
                          color={video.isActive ? 'success' : 'default'}
                          size="small"
                          onClick={() => handleToggleActive(video)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(video.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => window.open(video.youtubeUrl, '_blank')}
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(video)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(video._id)}
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
          {editingVideo ? 'Edit Video' : 'Add New Video'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              fullWidth
              label="YouTube URL"
              value={formData.youtubeUrl}
              onChange={(e) => handleYoutubeUrlChange(e.target.value)}
              required
              placeholder="https://www.youtube.com/watch?v=..."
              helperText="Enter a valid YouTube video URL"
            />
            <FormControl fullWidth required>
              <InputLabel>Video Purpose</InputLabel>
              <Select
                value={formData.videoPurpose}
                label="Video Purpose"
                onChange={(e) => setFormData({ ...formData, videoPurpose: e.target.value })}
              >
                {videoPurposes
                  .filter(p => p.isActive)
                  .map((purpose) => (
                    <MenuItem key={purpose._id} value={purpose._id}>
                      {purpose.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Thumbnail URL (Optional)"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              helperText="Leave empty to auto-generate from YouTube"
            />
            {formData.thumbnailUrl && (
              <Box>
                <img
                  src={formData.thumbnailUrl}
                  alt="Thumbnail preview"
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e0e0e0' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const videoId = extractYouTubeId(formData.youtubeUrl);
                    // Try fallback thumbnail formats
                    if (videoId) {
                      if (target.src.includes('maxresdefault')) {
                        // Try hqdefault if maxresdefault fails
                        target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                      } else if (target.src.includes('hqdefault')) {
                        // Try mqdefault if hqdefault fails
                        target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                      } else {
                        // Show placeholder
                        target.src = `https://placehold.co/400x280/2563EB/ffffff?text=Thumbnail+Not+Available`;
                        target.style.display = 'block';
                      }
                    } else {
                      target.src = `https://placehold.co/400x280/2563EB/ffffff?text=Thumbnail+Not+Available`;
                      target.style.display = 'block';
                    }
                  }}
                />
              </Box>
            )}
            <TextField
              fullWidth
              type="number"
              label="Display Order"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
              inputProps={{ min: 1 }}
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
            disabled={saving || !formData.title || !formData.youtubeUrl || !formData.videoPurpose}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShowcaseVideos;

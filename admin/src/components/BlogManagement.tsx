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
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
} from '@mui/material';
import RichTextEditor from './RichTextEditor';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Article as ArticleIcon,
  TrendingUp as TrendingUpIcon,
  EditNote as EditNoteIcon,
  RemoveRedEye as RemoveRedEyeIcon,
} from '@mui/icons-material';
import { blogService, type Blog } from '../services/blogService';
import api from '../services/api';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';

const BlogManagement: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: '' as 'published' | 'draft' | '',
    category: '',
    search: '',
  });

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    author: '',
    category: '',
    tags: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    ogImage: '',
    isPublished: false,
  });

  useEffect(() => {
    fetchBlogs();
    fetchStats();
  }, [filters]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = {
        page: 1,
        limit: 50,
      };
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      
      const data = await blogService.getBlogs(params);
      setBlogs(data.blogs);
    } catch (err: any) {
      console.error('Error fetching blogs:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await blogService.getStats();
      setStats(data.stats);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleAdd = () => {
    setEditingBlog(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      featuredImage: '',
      author: '',
      category: '',
      tags: '',
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      ogImage: '',
      isPublished: false,
    });
    setDialogOpen(true);
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      featuredImage: blog.featuredImage || '',
      author: blog.author,
      category: blog.category,
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : blog.tags || '',
      metaTitle: blog.metaTitle || '',
      metaDescription: blog.metaDescription || '',
      metaKeywords: Array.isArray(blog.metaKeywords) ? blog.metaKeywords.join(', ') : blog.metaKeywords || '',
      ogImage: blog.ogImage || '',
      isPublished: blog.isPublished,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (blogId: string) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      try {
        await blogService.deleteBlog(blogId);
        setSuccess('Blog deleted successfully');
        fetchBlogs();
        fetchStats();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to delete blog');
      }
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.excerpt || !formData.content || !formData.author || !formData.category) {
      setError('Title, excerpt, content, author, and category are required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const blogData: any = {
        title: formData.title.trim(),
        excerpt: formData.excerpt.trim(),
        content: formData.content,
        author: formData.author.trim(),
        category: formData.category.trim(),
        isPublished: formData.isPublished,
      };

      if (formData.slug) blogData.slug = formData.slug.trim();
      if (formData.featuredImage) blogData.featuredImage = formData.featuredImage.trim();
      if (formData.tags) blogData.tags = formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      if (formData.metaTitle) blogData.metaTitle = formData.metaTitle.trim();
      if (formData.metaDescription) blogData.metaDescription = formData.metaDescription.trim();
      if (formData.metaKeywords) blogData.metaKeywords = formData.metaKeywords.split(',').map((k: string) => k.trim()).filter(Boolean);
      if (formData.ogImage) blogData.ogImage = formData.ogImage.trim();

      if (editingBlog) {
        await blogService.updateBlog(editingBlog._id, blogData);
        setSuccess('Blog updated successfully');
      } else {
        await blogService.createBlog(blogData);
        setSuccess('Blog created successfully');
      }

      setDialogOpen(false);
      fetchBlogs();
      fetchStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save blog');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (blog: Blog) => {
    try {
      await blogService.updateBlog(blog._id, { isPublished: !blog.isPublished });
      setSuccess(`Blog ${!blog.isPublished ? 'published' : 'unpublished'} successfully`);
      fetchBlogs();
      fetchStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update blog status');
    }
  };

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData({ ...formData, title });
    if (!editingBlog && !formData.slug) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Blog Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Blog Post
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

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ flex: '1 1 250px', minWidth: '200px' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Blogs
                  </Typography>
                  <Typography variant="h4">{stats.total}</Typography>
                </Box>
                <ArticleIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 250px', minWidth: '200px' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Published
                  </Typography>
                  <Typography variant="h4">{stats.published}</Typography>
                </Box>
                <RemoveRedEyeIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 250px', minWidth: '200px' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Drafts
                  </Typography>
                  <Typography variant="h4">{stats.drafts}</Typography>
                </Box>
                <EditNoteIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 250px', minWidth: '200px' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Views
                  </Typography>
                  <Typography variant="h4">{stats.totalViews || 0}</Typography>
                </Box>
                <TrendingUpIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField
            size="small"
            label="Search"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Category"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            sx={{ minWidth: 150 }}
          />
        </Box>
      </Paper>

      {/* Blogs Table */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : blogs.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">No blogs found</Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Title</strong></TableCell>
                  <TableCell><strong>Author</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Views</strong></TableCell>
                  <TableCell><strong>Published</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {blogs.map((blog) => (
                  <TableRow key={blog._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {blog.title}
                      </Typography>
                    </TableCell>
                    <TableCell>{blog.author}</TableCell>
                    <TableCell>
                      <Chip label={blog.category} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={blog.isPublished ? 'Published' : 'Draft'}
                        color={blog.isPublished ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleTogglePublish(blog)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>{blog.views}</TableCell>
                    <TableCell>
                      {blog.publishedAt
                        ? new Date(blog.publishedAt).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => window.open(`https://influence-me.in/blog/${blog.slug || blog._id}`, '_blank')}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(blog)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(blog._id)}
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingBlog ? 'Edit Blog Post' : 'Add New Blog Post'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Slug (Auto-generated)"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              helperText="URL-friendly version of the title"
            />
            <TextField
              fullWidth
              label="Excerpt"
              multiline
              rows={3}
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              required
              helperText="Short description (max 300 characters)"
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                Content <span style={{ color: 'red' }}>*</span>
              </Typography>
              <RichTextEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                placeholder="Write your blog content here..."
              />
            </Box>
            
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                Featured Image
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label="Featured Image URL"
                  value={formData.featuredImage}
                  onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                  helperText="Upload image or enter URL"
                />
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="featured-image-upload"
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setSaving(true);
                      const formData = new FormData();
                      formData.append('file', file);
                      const response = await api.post('/api/admin/blogs/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      if (response.data.status && response.data.data) {
                        setFormData(prev => ({ ...prev, featuredImage: response.data.data.url }));
                      }
                    } catch (err: any) {
                      setError(err.response?.data?.message || 'Failed to upload image');
                    } finally {
                      setSaving(false);
                      e.target.value = '';
                    }
                  }}
                />
                <label htmlFor="featured-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    disabled={saving}
                  >
                    Upload
                  </Button>
                </label>
              </Box>
              {formData.featuredImage && (
                <Box sx={{ mt: 1 }}>
                  <img
                    src={formData.featuredImage}
                    alt="Featured preview"
                    style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </Box>
              )}
            </Box>
            <TextField
              fullWidth
              label="Author"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Tags (comma-separated)"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              helperText="e.g., marketing, social media, influencer"
            />
            
            <Typography variant="h6" sx={{ mt: 2 }}>SEO Settings</Typography>
            
            <TextField
              fullWidth
              label="Meta Title"
              value={formData.metaTitle}
              onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
              helperText="SEO title (max 60 characters)"
            />
            <TextField
              fullWidth
              label="Meta Description"
              multiline
              rows={2}
              value={formData.metaDescription}
              onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
              helperText="SEO description (max 160 characters)"
            />
            <TextField
              fullWidth
              label="Meta Keywords (comma-separated)"
              value={formData.metaKeywords}
              onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
              helperText="SEO keywords"
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                OG Image (Open Graph)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label="OG Image URL"
                  value={formData.ogImage}
                  onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                  helperText="Open Graph image for social sharing"
                />
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="og-image-upload"
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setSaving(true);
                      const formData = new FormData();
                      formData.append('file', file);
                      const response = await api.post('/api/admin/blogs/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      if (response.data.status && response.data.data) {
                        setFormData(prev => ({ ...prev, ogImage: response.data.data.url }));
                      }
                    } catch (err: any) {
                      setError(err.response?.data?.message || 'Failed to upload image');
                    } finally {
                      setSaving(false);
                      e.target.value = '';
                    }
                  }}
                />
                <label htmlFor="og-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    disabled={saving}
                  >
                    Upload
                  </Button>
                </label>
              </Box>
              {formData.ogImage && (
                <Box sx={{ mt: 1 }}>
                  <img
                    src={formData.ogImage}
                    alt="OG image preview"
                    style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </Box>
              )}
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  color="primary"
                />
              }
              label="Publish immediately"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !formData.title || !formData.excerpt || !formData.content || !formData.author || !formData.category}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BlogManagement;


import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Article as ArticleIcon,
  Policy as PolicyIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { adminService } from '../services/adminService';
import type { ApiResponse } from '../services/adminService';

interface CMSPage {
  _id?: string;
  pageType: 'privacy_policy' | 'terms_conditions' | 'about_us';
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  version: number;
  isActive: boolean;
  lastUpdatedBy?: {
    name: string;
    email: string;
  };
  updatedAt?: string;
}

const CMSPages: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  
  const [privacyPolicy, setPrivacyPolicy] = useState<CMSPage | null>(null);
  const [termsConditions, setTermsConditions] = useState<CMSPage | null>(null);
  const [aboutUs, setAboutUs] = useState<CMSPage | null>(null);

  const pageTypes = ['privacy_policy', 'terms_conditions', 'about_us'];
  const pageLabels = ['Privacy Policy', 'Terms & Conditions', 'About Us'];
  const pageIcons = [<PolicyIcon />, <ArticleIcon />, <InfoIcon />];

  useEffect(() => {
    fetchAllPages();
  }, []);

  const fetchAllPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = (await adminService.getCMSPages()) as ApiResponse<CMSPage[]>;
      if (response.status && response.data) {
        const pages = response.data as CMSPage[];
        pages.forEach((page) => {
          if (page.pageType === 'privacy_policy') {
            setPrivacyPolicy(page);
          } else if (page.pageType === 'terms_conditions') {
            setTermsConditions(page);
          } else if (page.pageType === 'about_us') {
            setAboutUs(page);
          }
        });
      } else {
        setError(response.message || 'Failed to fetch CMS pages');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPage = (): CMSPage | null => {
    switch (currentTab) {
      case 0:
        return privacyPolicy;
      case 1:
        return termsConditions;
      case 2:
        return aboutUs;
      default:
        return null;
    }
  };

  const setCurrentPage = (page: CMSPage | null) => {
    switch (currentTab) {
      case 0:
        setPrivacyPolicy(page);
        break;
      case 1:
        setTermsConditions(page);
        break;
      case 2:
        setAboutUs(page);
        break;
    }
  };

  const handleSave = async () => {
    const currentPage = getCurrentPage();
    if (!currentPage) {
      setError('No page data to save');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = (await adminService.updateCMSPage(
        currentPage.pageType,
        {
          title: currentPage.title,
          content: currentPage.content,
          metaTitle: currentPage.metaTitle || '',
          metaDescription: currentPage.metaDescription || '',
          isActive: currentPage.isActive,
        }
      )) as ApiResponse<CMSPage>;

      if (response.status && response.data) {
        setCurrentPage(response.data as CMSPage);
        setSuccess(`${pageLabels[currentTab]} updated successfully!`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || 'Failed to update page');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof CMSPage, value: any) => {
    const currentPage = getCurrentPage();
    if (!currentPage) return;

    const updatedPage = { ...currentPage, [field]: value };
    setCurrentPage(updatedPage);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const currentPage = getCurrentPage();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        CMS Pages Management
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Manage Privacy Policy, Terms & Conditions, and About Us pages. Changes will be reflected on both web and mobile apps.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Tabs
            value={currentTab}
            onChange={(_e, newValue) => setCurrentTab(newValue)}
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            {pageTypes.map((type, index) => (
              <Tab
                key={type}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {pageIcons[index]}
                    {pageLabels[index]}
                  </Box>
                }
              />
            ))}
          </Tabs>

          {currentPage ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6">{currentPage.title}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip
                      label={currentPage.isActive ? 'Active' : 'Inactive'}
                      color={currentPage.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    <Chip
                      label={`Version ${currentPage.version}`}
                      size="small"
                    />
                    {currentPage.lastUpdatedBy && (
                      <Chip
                        label={`Updated by ${currentPage.lastUpdatedBy.name}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentPage.isActive}
                      onChange={(e) => handleFieldChange('isActive', e.target.checked)}
                    />
                  }
                  label="Active"
                />
              </Box>

              <TextField
                fullWidth
                label="Page Title"
                value={currentPage.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Meta Title (SEO)"
                value={currentPage.metaTitle || ''}
                onChange={(e) => handleFieldChange('metaTitle', e.target.value)}
                margin="normal"
                helperText="Used for SEO and browser tab title"
              />

              <TextField
                fullWidth
                label="Meta Description (SEO)"
                value={currentPage.metaDescription || ''}
                onChange={(e) => handleFieldChange('metaDescription', e.target.value)}
                margin="normal"
                multiline
                rows={2}
                helperText="Used for SEO search results"
              />

              <TextField
                fullWidth
                label="Content (HTML)"
                value={currentPage.content || ''}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                margin="normal"
                multiline
                rows={20}
                required
                helperText="Enter HTML content. This will be displayed on both web and mobile apps."
                sx={{ mt: 2 }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Alert severity="info">
              No content found for {pageLabels[currentTab]}. You can create it by filling the form below.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CMSPages;


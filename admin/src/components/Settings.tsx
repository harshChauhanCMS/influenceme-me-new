import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import type { ApiResponse } from '../services/adminService';
import {
  Box,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Save as SaveIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Infusee',
    siteUrl: 'https://influence-me.in',
    adminEmail: 'contact-us@influence-me.in',
    supportEmail: 'support@influence-me.in',
    maintenanceMode: false,
    registrationEnabled: true,
    emailVerificationRequired: true,
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: 8,
    sessionTimeout: 30, // minutes
    twoFactorAuth: false,
    ipWhitelist: '',
    maxLoginAttempts: 5,
    lockoutDuration: 15, // minutes
  });

  // Email Settings
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: true,
    fromEmail: 'noreply@influence-me.in',
    fromName: 'Infusee',
    emailNotifications: true,
  });

  // Payment Settings
  const [paymentSettings, setPaymentSettings] = useState({
    platformFeePercentage: 5,
    razorpayKeyId: '',
    razorpayKeySecret: '',
    paymentMethods: ['razorpay', 'bank_transfer'],
    currency: 'INR',
    minWithdrawalAmount: 1000,
  });

  // Tax Settings
  const [taxSettings, setTaxSettings] = useState({
    gst: 18,
    cgst: 9,
    sgst: 9,
    igst: 18,
    isInterState: false,
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailCampaignUpdates: true,
    emailOfferNotifications: true,
    emailDealNotifications: true,
    emailPaymentNotifications: true,
    emailSystemAlerts: true,
    pushNotifications: true,
    smsNotifications: false,
  });

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = (await adminService.getSettings()) as ApiResponse<Record<string, any>>;
        if (response.status && response.data) {
          const settings = response.data as Record<string, any>;
          setGeneralSettings({
            siteName: settings.siteName || generalSettings.siteName,
            siteUrl: settings.siteUrl || generalSettings.siteUrl,
            adminEmail: settings.adminEmail || generalSettings.adminEmail,
            supportEmail: settings.supportEmail || generalSettings.supportEmail,
            maintenanceMode: settings.maintenanceMode || false,
            registrationEnabled: settings.registrationEnabled !== undefined ? settings.registrationEnabled : true,
            emailVerificationRequired: settings.emailVerificationRequired !== undefined ? settings.emailVerificationRequired : true,
          });
          setSecuritySettings({
            passwordMinLength: settings.passwordMinLength || securitySettings.passwordMinLength,
            sessionTimeout: settings.sessionTimeout || securitySettings.sessionTimeout,
            twoFactorAuth: settings.twoFactorAuth || false,
            ipWhitelist: settings.ipWhitelist || '',
            maxLoginAttempts: settings.maxLoginAttempts || securitySettings.maxLoginAttempts,
            lockoutDuration: settings.lockoutDuration || securitySettings.lockoutDuration,
          });
          if (settings.emailSettings) {
            setEmailSettings(settings.emailSettings);
          }
          if (settings.paymentSettings) {
            setPaymentSettings(settings.paymentSettings);
          }
          if (settings.taxSettings) {
            setTaxSettings(settings.taxSettings);
          }
          if (settings.notificationSettings) {
            setNotificationSettings(settings.notificationSettings);
          }
        }
      } catch (error: any) {
        console.error('Failed to load settings:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load settings',
          severity: 'error',
        });
      }
    };
    loadSettings();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSave = async (section: string) => {
    try {
      let updateData: any = {};
      
      switch (section.toLowerCase()) {
        case 'general':
          updateData = { ...generalSettings };
          break;
        case 'security':
          updateData = { ...securitySettings };
          break;
        case 'email':
          updateData = { emailSettings };
          break;
        case 'payment':
          updateData = { paymentSettings };
          break;
        case 'tax':
          updateData = { taxSettings };
          break;
        case 'notifications':
          updateData = { notificationSettings };
          break;
        default:
          updateData = {
            ...generalSettings,
            ...securitySettings,
            emailSettings,
            paymentSettings,
            taxSettings,
            notificationSettings,
          };
      }

      const response = (await adminService.updateSettings(updateData)) as ApiResponse<unknown>;
      
      if (response && response.status) {
        setSnackbar({
          open: true,
          message: `${section} settings saved successfully`,
          severity: 'success',
        });
      } else {
        throw new Error(response.message || 'Failed to save settings');
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to save settings',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage system configuration and preferences
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="settings tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<SettingsIcon />} iconPosition="start" label="General" />
          <Tab icon={<SecurityIcon />} iconPosition="start" label="Security" />
          <Tab icon={<EmailIcon />} iconPosition="start" label="Email" />
          <Tab icon={<PaymentIcon />} iconPosition="start" label="Payments" />
          <Tab icon={<ReceiptIcon />} iconPosition="start" label="Tax" />
          <Tab icon={<NotificationsIcon />} iconPosition="start" label="Notifications" />
        </Tabs>

        {/* General Settings */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            General Settings
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Site Name"
              value={generalSettings.siteName}
              onChange={(e) =>
                setGeneralSettings({ ...generalSettings, siteName: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Site URL"
              value={generalSettings.siteUrl}
              onChange={(e) =>
                setGeneralSettings({ ...generalSettings, siteUrl: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Admin Email"
              type="email"
              value={generalSettings.adminEmail}
              onChange={(e) =>
                setGeneralSettings({ ...generalSettings, adminEmail: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Support Email"
              type="email"
              value={generalSettings.supportEmail}
              onChange={(e) =>
                setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })
              }
            />
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={generalSettings.maintenanceMode}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      maintenanceMode: e.target.checked,
                    })
                  }
                />
              }
              label="Maintenance Mode"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -2, mb: 2 }}>
              When enabled, only admins can access the platform
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={generalSettings.registrationEnabled}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      registrationEnabled: e.target.checked,
                    })
                  }
                />
              }
              label="Enable User Registration"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={generalSettings.emailVerificationRequired}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      emailVerificationRequired: e.target.checked,
                    })
                  }
                />
              }
              label="Require Email Verification"
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => handleSave('general')}
              sx={{ mt: 2, alignSelf: 'flex-start' }}
            >
              Save General Settings
            </Button>
          </Box>
        </TabPanel>

        {/* Security Settings */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Security Settings
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              type="number"
              label="Password Minimum Length"
              value={securitySettings.passwordMinLength}
              onChange={(e) =>
                setSecuritySettings({
                  ...securitySettings,
                  passwordMinLength: parseInt(e.target.value) || 8,
                })
              }
              inputProps={{ min: 6, max: 32 }}
            />
            <TextField
              fullWidth
              type="number"
              label="Session Timeout (minutes)"
              value={securitySettings.sessionTimeout}
              onChange={(e) =>
                setSecuritySettings({
                  ...securitySettings,
                  sessionTimeout: parseInt(e.target.value) || 30,
                })
              }
            />
            <TextField
              fullWidth
              type="number"
              label="Max Login Attempts"
              value={securitySettings.maxLoginAttempts}
              onChange={(e) =>
                setSecuritySettings({
                  ...securitySettings,
                  maxLoginAttempts: parseInt(e.target.value) || 5,
                })
              }
            />
            <TextField
              fullWidth
              type="number"
              label="Lockout Duration (minutes)"
              value={securitySettings.lockoutDuration}
              onChange={(e) =>
                setSecuritySettings({
                  ...securitySettings,
                  lockoutDuration: parseInt(e.target.value) || 15,
                })
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={securitySettings.twoFactorAuth}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      twoFactorAuth: e.target.checked,
                    })
                  }
                />
              }
              label="Enable Two-Factor Authentication"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="IP Whitelist (one per line)"
              value={securitySettings.ipWhitelist}
              onChange={(e) =>
                setSecuritySettings({
                  ...securitySettings,
                  ipWhitelist: e.target.value,
                })
              }
              placeholder="192.168.1.1&#10;10.0.0.1"
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => handleSave('security')}
              sx={{ mt: 2, alignSelf: 'flex-start' }}
            >
              Save Security Settings
            </Button>
          </Box>
        </TabPanel>

        {/* Email Settings */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Email Configuration
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="SMTP Host"
              value={emailSettings.smtpHost}
              onChange={(e) =>
                setEmailSettings({ ...emailSettings, smtpHost: e.target.value })
              }
            />
            <TextField
              fullWidth
              type="number"
              label="SMTP Port"
              value={emailSettings.smtpPort}
              onChange={(e) =>
                setEmailSettings({
                  ...emailSettings,
                  smtpPort: parseInt(e.target.value) || 587,
                })
              }
            />
            <TextField
              fullWidth
              label="SMTP Username"
              value={emailSettings.smtpUser}
              onChange={(e) =>
                setEmailSettings({ ...emailSettings, smtpUser: e.target.value })
              }
            />
            <TextField
              fullWidth
              type="password"
              label="SMTP Password"
              value={emailSettings.smtpPassword}
              onChange={(e) =>
                setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="From Email"
              type="email"
              value={emailSettings.fromEmail}
              onChange={(e) =>
                setEmailSettings({ ...emailSettings, fromEmail: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="From Name"
              value={emailSettings.fromName}
              onChange={(e) =>
                setEmailSettings({ ...emailSettings, fromName: e.target.value })
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={emailSettings.smtpSecure}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      smtpSecure: e.target.checked,
                    })
                  }
                />
              }
              label="Use Secure Connection (TLS/SSL)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={emailSettings.emailNotifications}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      emailNotifications: e.target.checked,
                    })
                  }
                />
              }
              label="Enable Email Notifications"
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => handleSave('email')}
              sx={{ mt: 2, alignSelf: 'flex-start' }}
            >
              Save Email Settings
            </Button>
          </Box>
        </TabPanel>

        {/* Payment Settings */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Payment Gateway Settings
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              type="number"
              label="Platform Fee Percentage"
              value={paymentSettings.platformFeePercentage}
              onChange={(e) =>
                setPaymentSettings({
                  ...paymentSettings,
                  platformFeePercentage: parseFloat(e.target.value) || 10,
                })
              }
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              helperText="Percentage of transaction amount charged as platform fee"
            />
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={paymentSettings.currency}
                label="Currency"
                onChange={(e) =>
                  setPaymentSettings({
                    ...paymentSettings,
                    currency: e.target.value,
                  })
                }
              >
                <MenuItem value="INR">INR (Indian Rupee)</MenuItem>
                <MenuItem value="USD">USD (US Dollar)</MenuItem>
                <MenuItem value="EUR">EUR (Euro)</MenuItem>
                <MenuItem value="GBP">GBP (British Pound)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Minimum Withdrawal Amount"
              value={paymentSettings.minWithdrawalAmount}
              onChange={(e) =>
                setPaymentSettings({
                  ...paymentSettings,
                  minWithdrawalAmount: parseFloat(e.target.value) || 1000,
                })
              }
            />
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Razorpay Configuration
            </Typography>
            <TextField
              fullWidth
              label="Razorpay Key ID"
              value={paymentSettings.razorpayKeyId}
              onChange={(e) =>
                setPaymentSettings({
                  ...paymentSettings,
                  razorpayKeyId: e.target.value,
                })
              }
            />
            <TextField
              fullWidth
              type="password"
              label="Razorpay Key Secret"
              value={paymentSettings.razorpayKeySecret}
              onChange={(e) =>
                setPaymentSettings({
                  ...paymentSettings,
                  razorpayKeySecret: e.target.value,
                })
              }
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => handleSave('payment')}
              sx={{ mt: 2, alignSelf: 'flex-start' }}
            >
              Save Payment Settings
            </Button>
          </Box>
        </TabPanel>

        {/* Tax Settings */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            Tax Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure GST, CGST, SGST, and IGST percentages for payment calculations
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={taxSettings.isInterState}
                  onChange={(e) =>
                    setTaxSettings({
                      ...taxSettings,
                      isInterState: e.target.checked,
                    })
                  }
                />
              }
              label="Inter-State Transactions"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -2, mb: 2 }}>
              When enabled, IGST will be applied. When disabled, CGST + SGST will be applied for intra-state transactions.
            </Typography>
            
            {taxSettings.isInterState ? (
              <>
                <TextField
                  fullWidth
                  type="number"
                  label="IGST Percentage"
                  value={taxSettings.igst}
                  onChange={(e) =>
                    setTaxSettings({
                      ...taxSettings,
                      igst: parseFloat(e.target.value) || 18,
                    })
                  }
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  helperText="Integrated GST percentage for inter-state transactions"
                />
                <Alert severity="info" sx={{ mt: 1 }}>
                  For inter-state transactions, IGST of {taxSettings.igst}% will be applied.
                </Alert>
              </>
            ) : (
              <>
                <TextField
                  fullWidth
                  type="number"
                  label="GST Percentage (Total)"
                  value={taxSettings.gst}
                  onChange={(e) => {
                    const gstValue = parseFloat(e.target.value) || 18;
                    setTaxSettings({
                      ...taxSettings,
                      gst: gstValue,
                      cgst: gstValue / 2,
                      sgst: gstValue / 2,
                    });
                  }}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  helperText="Total GST percentage (will be split equally into CGST and SGST)"
                />
                <TextField
                  fullWidth
                  type="number"
                  label="CGST Percentage"
                  value={taxSettings.cgst}
                  onChange={(e) =>
                    setTaxSettings({
                      ...taxSettings,
                      cgst: parseFloat(e.target.value) || 9,
                      gst: (parseFloat(e.target.value) || 9) * 2,
                    })
                  }
                  inputProps={{ min: 0, max: 50, step: 0.1 }}
                  helperText="Central GST percentage for intra-state transactions"
                />
                <TextField
                  fullWidth
                  type="number"
                  label="SGST Percentage"
                  value={taxSettings.sgst}
                  onChange={(e) =>
                    setTaxSettings({
                      ...taxSettings,
                      sgst: parseFloat(e.target.value) || 9,
                      gst: (parseFloat(e.target.value) || 9) * 2,
                    })
                  }
                  inputProps={{ min: 0, max: 50, step: 0.1 }}
                  helperText="State GST percentage for intra-state transactions"
                />
                <Alert severity="info" sx={{ mt: 1 }}>
                  For intra-state transactions, CGST of {taxSettings.cgst}% and SGST of {taxSettings.sgst}% will be applied (Total: {taxSettings.cgst + taxSettings.sgst}%).
                </Alert>
              </>
            )}
            
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => handleSave('tax')}
              sx={{ mt: 2, alignSelf: 'flex-start' }}
            >
              Save Tax Settings
            </Button>
          </Box>
        </TabPanel>

        {/* Notification Settings */}
        <TabPanel value={tabValue} index={5}>
          <Typography variant="h6" gutterBottom>
            Notification Preferences
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.emailCampaignUpdates}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      emailCampaignUpdates: e.target.checked,
                    })
                  }
                />
              }
              label="Email Campaign Updates"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.emailOfferNotifications}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      emailOfferNotifications: e.target.checked,
                    })
                  }
                />
              }
              label="Email Offer Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.emailDealNotifications}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      emailDealNotifications: e.target.checked,
                    })
                  }
                />
              }
              label="Email Deal Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.emailPaymentNotifications}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      emailPaymentNotifications: e.target.checked,
                    })
                  }
                />
              }
              label="Email Payment Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.emailSystemAlerts}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      emailSystemAlerts: e.target.checked,
                    })
                  }
                />
              }
              label="Email System Alerts"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.pushNotifications}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      pushNotifications: e.target.checked,
                    })
                  }
                />
              }
              label="Push Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.smsNotifications}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      smsNotifications: e.target.checked,
                    })
                  }
                />
              }
              label="SMS Notifications"
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => handleSave('notifications')}
              sx={{ mt: 2, alignSelf: 'flex-start' }}
            >
              Save Notification Settings
            </Button>
          </Box>
        </TabPanel>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;


// app/settings/page.tsx
'use client';

import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Paper,
} from '@mui/material';
import {
    Settings as SettingsIcon,
} from '@mui/icons-material';

export default function SettingsPage() {
    return (
        <Box sx={{ backgroundColor: '#f9fafb', minHeight: '100vh', p: 3 }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
                        Settings
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage your account settings and preferences
                    </Typography>
                </Box>

                {/* Coming Soon Card */}
                <Paper sx={{ borderRadius: 3, textAlign: 'center', py: 8 }}>
                    <CardContent>
                        <SettingsIcon sx={{ fontSize: 100, color: 'primary.main', mb: 3 }} />
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
                            Coming Soon
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
                            The settings page is currently under development.
                            You&apos;ll soon be able to manage your account preferences, notifications, and more.
                        </Typography>
                        <Box sx={{ 
                            display: 'grid', 
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
                            gap: 2, 
                            mt: 4,
                            maxWidth: 800,
                            mx: 'auto'
                        }}>
                            {[
                                { title: 'Profile Settings', description: 'Update your personal and business information' },
                                { title: 'Notifications', description: 'Manage email and push notification preferences' },
                                { title: 'Security', description: 'Change password and manage security settings' },
                            ].map((feature, index) => (
                                <Card key={index} sx={{ borderRadius: 2, bgcolor: 'primary.light', color: 'white' }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                            {feature.title}
                                        </Typography>
                                        <Typography variant="body2">
                                            {feature.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    </CardContent>
                </Paper>
            </Box>
    );
}


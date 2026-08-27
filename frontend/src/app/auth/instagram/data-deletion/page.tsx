'use client';

import { Box, Container, Typography, Button, Card, CardContent, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import Link from 'next/link';

/**
 * Instagram Data Deletion Instructions Page
 * 
 * Required by Meta for Instagram Business API compliance.
 * This page explains how users can request deletion of their Instagram data.
 * 
 * For Meta Configuration:
 * Data Deletion Request URL: https://influence-me.in/auth/instagram/data-deletion
 */
export default function InstagramDataDeletionPage() {
    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <DeleteIcon sx={{ fontSize: 64, color: '#8CC342', mb: 2 }} />
                <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                    Instagram Data Deletion
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Learn how to delete your Instagram data from Infusee
                </Typography>
            </Box>

            {/* Important Notice */}
            <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 4 }}>
                This page provides instructions for deleting Instagram data that Infusee has 
                collected through the Instagram Business API.
            </Alert>

            {/* What Data We Collect */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#8CC342' }}>
                        What Instagram Data We Collect
                    </Typography>
                    <Typography variant="body2" paragraph color="text.secondary">
                        When you connect your Instagram Business account to Infusee, we collect:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                        <Typography component="li" variant="body2" color="text.secondary">
                            Profile information (username, bio, profile picture)
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary">
                            Follower and following counts
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary">
                            Instagram posts and media
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary">
                            Engagement metrics (likes, comments, reach, impressions)
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary">
                            Instagram Insights data
                        </Typography>
                    </Box>
                </CardContent>
            </Card>

            {/* How to Delete Data */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#8CC342' }}>
                        How to Delete Your Instagram Data
                    </Typography>
                    
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                        Method 1: Disconnect Instagram (Recommended)
                    </Typography>
                    <Box component="ol" sx={{ pl: 2 }}>
                        <Typography component="li" variant="body2" color="text.secondary" paragraph>
                            Log in to your Infusee account (mobile app or web)
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary" paragraph>
                            Go to <strong>Settings</strong> → <strong>Social Media Connections</strong>
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary" paragraph>
                            Find Instagram and click <strong>"Disconnect"</strong>
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary" paragraph>
                            Confirm the disconnection
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary" paragraph>
                            Your Instagram data will be automatically deleted within <strong>48 hours</strong>
                        </Typography>
                    </Box>

                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
                        Method 2: Request Data Deletion via Email
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Send an email to our privacy team:
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            <strong>Email:</strong> privacy@influence-me.in
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Subject:</strong> Instagram Data Deletion Request
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Include:</strong> Your registered email address and Instagram username
                        </Typography>
                    </Alert>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        We will process your request within <strong>30 days</strong> as required by GDPR.
                    </Typography>

                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
                        Method 3: Revoke Access via Instagram
                    </Typography>
                    <Box component="ol" sx={{ pl: 2 }}>
                        <Typography component="li" variant="body2" color="text.secondary" paragraph>
                            Open Instagram app or website
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary" paragraph>
                            Go to <strong>Settings</strong> → <strong>Security</strong> → <strong>Apps and Websites</strong>
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary" paragraph>
                            Find <strong>Infusee</strong> in the list
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary" paragraph>
                            Click <strong>"Remove"</strong>
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary" paragraph>
                            We will be notified and delete your data within <strong>48 hours</strong>
                        </Typography>
                    </Box>
                </CardContent>
            </Card>

            {/* What Happens After Deletion */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#8CC342' }}>
                        What Happens After Deletion
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Once you delete your Instagram data:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                        <Typography component="li" variant="body2" color="text.secondary">
                            All your Instagram profile information is removed from our servers
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary">
                            All cached Instagram posts and media are deleted
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary">
                            All Instagram analytics and insights data are permanently erased
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary">
                            Your access token is revoked and deleted
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary">
                            You can reconnect your Instagram account anytime in the future
                        </Typography>
                    </Box>
                </CardContent>
            </Card>

            {/* Contact Information */}
            <Card sx={{ mb: 3, borderRadius: 2, bgcolor: '#f5f5f5' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Need Help?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        If you have questions about Instagram data deletion or privacy:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        📧 Email: <strong>privacy@influence-me.in</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        📧 Support: <strong>support@influence-me.in</strong>
                    </Typography>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
                <Button
                    variant="outlined"
                    component={Link}
                    href="/policy"
                    sx={{ 
                        textTransform: 'none',
                        borderColor: '#8CC342',
                        color: '#8CC342',
                        '&:hover': {
                            borderColor: '#699e31',
                            bgcolor: '#e6f3d8',
                        }
                    }}
                >
                    Privacy Policy
                </Button>
                <Button
                    variant="contained"
                    component={Link}
                    href="/settings"
                    sx={{ 
                        textTransform: 'none',
                        bgcolor: '#8CC342',
                        '&:hover': {
                            bgcolor: '#699e31',
                        }
                    }}
                >
                    Go to Settings
                </Button>
            </Box>

            {/* Footer Note */}
            <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ display: 'block', textAlign: 'center', mt: 4 }}
            >
                This page complies with Meta's Instagram Platform Terms and GDPR requirements.
                <br />
                Last updated: October 2025
            </Typography>
        </Container>
    );
}



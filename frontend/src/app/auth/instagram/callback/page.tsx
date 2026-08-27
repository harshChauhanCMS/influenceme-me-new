'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

/**
 * Instagram OAuth Callback Page
 * 
 * This page handles the redirect from Instagram OAuth flow.
 * It receives the authorization code and processes it.
 * 
 * For Meta Instagram Business Login Configuration:
 * OAuth Redirect URI: https://influence-me.in/auth/instagram/callback
 */
function InstagramCallbackContent() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Processing Instagram login...');

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('Instagram OAuth callback:', { code, state, error, errorDescription });

        // Handle OAuth error
        if (error) {
            setStatus('error');
            setMessage(errorDescription || 'Instagram login was cancelled or failed');
            
            // Redirect back to app after 3 seconds
            setTimeout(() => {
                // For mobile app, use deep link
                if (isMobileDevice()) {
                    window.location.href = `influenceme://auth/instagram/error?error=${error}`;
                } else {
                    // For web, redirect to login page
                    window.location.href = '/login?error=instagram_login_failed';
                }
            }, 3000);
            return;
        }

        // Handle successful OAuth
        if (code && state) {
            setStatus('success');
            setMessage('Instagram connected successfully! Redirecting...');

            // For mobile app, deep link back with authorization code
            if (isMobileDevice()) {
                // Mobile deep link with code and state
                const deepLink = `influenceme://auth/instagram/success?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
                console.log('Redirecting to mobile app:', deepLink);
                window.location.href = deepLink;
            } else {
                // For web, you might want to handle it differently
                // For now, just show success message
                setTimeout(() => {
                    window.location.href = '/dashboard?instagram_connected=true';
                }, 2000);
            }
        } else {
            // No code or error - unexpected state
            setStatus('error');
            setMessage('Invalid callback parameters');
            
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
        }
    }, [searchParams]);

    // Detect if user is on mobile device
    const isMobileDevice = (): boolean => {
        if (typeof window === 'undefined') return false;
        
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                bgcolor: '#f5f5f5',
                p: 3,
            }}
        >
            <Box
                sx={{
                    maxWidth: 400,
                    width: '100%',
                    bgcolor: 'white',
                    borderRadius: 3,
                    p: 4,
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
            >
                {status === 'processing' && (
                    <>
                        <CircularProgress 
                            sx={{ 
                                color: '#8CC342',
                                mb: 3,
                            }} 
                            size={60}
                        />
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            Connecting to Instagram
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Please wait while we process your login...
                        </Typography>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircleIcon 
                            sx={{ 
                                fontSize: 60, 
                                color: '#8CC342',
                                mb: 2,
                            }} 
                        />
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#8CC342' }}>
                            Success!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {message}
                        </Typography>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <ErrorIcon 
                            sx={{ 
                                fontSize: 60, 
                                color: 'error.main',
                                mb: 2,
                            }} 
                        />
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
                            Connection Failed
                        </Typography>
                        <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                            {message}
                        </Alert>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Redirecting you back...
                        </Typography>
                    </>
                )}
            </Box>

            {/* Meta compliance note */}
            <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ mt: 3, textAlign: 'center' }}
            >
                By connecting your Instagram account, you agree to our{' '}
                <a href="/terms" style={{ color: '#8CC342', textDecoration: 'none' }}>
                    Terms of Service
                </a>
                {' '}and{' '}
                <a href="/policy" style={{ color: '#8CC342', textDecoration: 'none' }}>
                    Privacy Policy
                </a>
            </Typography>
        </Box>
    );
}

// Wrap component in Suspense for Next.js 15 compatibility
export default function InstagramCallbackPage() {
    return (
        <Suspense fallback={
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    bgcolor: '#f5f5f5',
                }}
            >
                <CircularProgress sx={{ color: '#8CC342' }} size={60} />
                <Typography variant="h6" sx={{ mt: 3, fontWeight: 600 }}>
                    Loading...
                </Typography>
            </Box>
        }>
            <InstagramCallbackContent />
        </Suspense>
    );
}


// components/layout/DashboardLayout.tsx
'use client';

import React, { FC, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    Box,
    CssBaseline,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    TextField,
    Avatar,
    Badge,
    Tooltip,
    Alert,
    Button,
    LinearProgress,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import { 
    Menu as MenuIcon,
    Chat as ChatIcon,
    Notifications as NotificationsIcon,
    Info as InfoIcon,
    ArrowForward as ArrowForwardIcon,
    Person as PersonIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';
import { NavigationDrawer } from '../NavigationDrawer';
import { useAuth } from '@/context/authContext';
import { useNotificationCount } from '@/context/notificationCountContext';
import { checkBrandProfileCompletion } from '@/utils/profileCompletion';
import { getImageUrl } from '@/utils/fileUtils';
import { chatService } from '@/services/chatService';

interface DashboardLayoutProps {
    children: ReactNode;
}

const drawerWidth = 240;

// Page title mapping
    const pageTitles: Record<string, string> = {
        '/dashboard': 'Dashboard',
        '/campaign': 'Campaigns',
        '/explore': 'Explore',
        '/calendar': 'Calendar',
        '/requirements': 'Requirements',
        '/vendors': 'Vendors & Services',
        '/influencer-offers': 'Collabs',
        '/vendor-offers': 'Offers (Vendors)',
        '/payments': 'Payments',
        '/profile': 'My Profile',
        '/settings': 'Settings',
        '/chat': 'Messages',
        '/notifications': 'Notifications',
        '/deals': 'Deal',
    };

export const DashboardLayout: FC<DashboardLayoutProps> = ({ children }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const { unreadCount: notificationUnreadCount } = useNotificationCount();
    const [chatUnreadCount, setChatUnreadCount] = useState(0);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [loading, user, router]);

    useEffect(() => {
        if (!user) {
            setChatUnreadCount(0);
            return;
        }
        let cancelled = false;
        chatService.getChatRooms(1, 100)
            .then(({ data: rooms }) => {
                if (cancelled) return;
                const total = rooms.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
                setChatUnreadCount(total);
            })
            .catch(() => {
                if (!cancelled) setChatUnreadCount(0);
            });
        return () => { cancelled = true; };
    }, [user, pathname]);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleProfileClick = () => {
        handleMenuClose();
        router.push('/profile');
    };

    const handleSettingsClick = () => {
        handleMenuClose();
        router.push('/settings');
    };

    const handleLogout = () => {
        handleMenuClose();
        logout();
    };

    const pageTitle = pageTitles[pathname] || (pathname?.startsWith('/deals') ? 'Deal' : 'Dashboard');
    const profileStatus = user?.role === 'brand' ? checkBrandProfileCompletion(user) : null;
    const showBanner = 
        user?.role === 'brand' && 
        !profileStatus?.isComplete && 
        !bannerDismissed &&
        pathname !== '/profile';

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <LinearProgress sx={{ width: '100%', position: 'fixed', top: 0 }} />
            </Box>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <CssBaseline />

            {/* App Bar */}
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
                    backgroundColor: 'white',
                    color: 'text.primary',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Toolbar sx={{ py: 1 }}>
                    {/* Mobile Menu Button */}
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ 
                            mr: 2, 
                            display: { md: 'none' },
                            '&:hover': {
                                bgcolor: 'rgba(140, 195, 66, 0.1)',
                            }
                        }}
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* Page Title */}
                    <Typography 
                        variant="h6" 
                        noWrap 
                        component="div" 
                        sx={{ 
                            flexGrow: 1,
                            fontWeight: 700,
                            color: '#2C3E50',
                            fontSize: '1.25rem',
                        }}
                    >
                        {pageTitle}
                    </Typography>

                    {/* Search, Chat, Notifications and Avatar */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Search..."
                            variant="outlined"
                            sx={{
                                display: { xs: 'none', sm: 'block' },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: '#F5F5F5',
                                    '& fieldset': {
                                        borderColor: 'transparent',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#8CC342',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#8CC342',
                                    },
                                },
                            }}
                        />

                            {/* Chat Button */}
                            <Tooltip title="Messages">
                                <IconButton
                                    onClick={() => router.push('/chat')}
                                    sx={{
                                        color: 'text.secondary',
                                        '&:hover': {
                                            bgcolor: 'rgba(140, 195, 66, 0.1)',
                                            color: '#8CC342',
                                        },
                                    }}
                                >
                                    <Badge badgeContent={chatUnreadCount} color="error" invisible={chatUnreadCount === 0}>
                                        <ChatIcon />
                                    </Badge>
                                </IconButton>
                            </Tooltip>

                        {/* Notifications Button */}
                        <Tooltip title="Notifications">
                            <IconButton
                                onClick={() => router.push('/notifications')}
                                sx={{
                                    color: 'text.secondary',
                                    '&:hover': {
                                        bgcolor: 'rgba(140, 195, 66, 0.1)',
                                        color: '#8CC342',
                                    },
                                }}
                            >
                                <Badge badgeContent={notificationUnreadCount} color="error" invisible={notificationUnreadCount === 0}>
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>

                        {/* User Avatar */}
                        <Tooltip title="Account">
                            <IconButton
                                onClick={handleMenuOpen}
                                sx={{ p: 0 }}
                            >
                                <Avatar
                                    src={getImageUrl(user?.profilePictureUrl)}
                                    sx={{
                                        bgcolor: '#8CC342',
                                        width: 40,
                                        height: 40,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(140, 195, 66, 0.3)',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            boxShadow: '0 4px 12px rgba(140, 195, 66, 0.4)',
                                            transform: 'scale(1.05)',
                                        }
                                    }}
                                    suppressHydrationWarning
                                >
                                    {user?.name?.charAt(0).toUpperCase() || ''}
                                </Avatar>
                            </IconButton>
                        </Tooltip>

                        {/* User Menu */}
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                            onClick={handleMenuClose}
                            PaperProps={{
                                elevation: 3,
                                sx: {
                                    mt: 1.5,
                                    minWidth: 220,
                                    borderRadius: 2,
                                    overflow: 'visible',
                                    '&:before': {
                                        content: '""',
                                        display: 'block',
                                        position: 'absolute',
                                        top: 0,
                                        right: 14,
                                        width: 10,
                                        height: 10,
                                        bgcolor: 'background.paper',
                                        transform: 'translateY(-50%) rotate(45deg)',
                                        zIndex: 0,
                                    },
                                },
                            }}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        >
                            {/* User Info */}
                            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {user?.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                    {user?.email}
                                </Typography>
                                <Box sx={{ mt: 0.5 }}>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            bgcolor: '#e6f3d8',
                                            color: '#699e31',
                                            px: 1,
                                            py: 0.5,
                                            borderRadius: 1,
                                            textTransform: 'capitalize',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {user?.role}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Menu Items */}
                            <MenuItem onClick={handleProfileClick} sx={{ py: 1.5 }}>
                                <ListItemIcon>
                                    <PersonIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>My Profile</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleSettingsClick} sx={{ py: 1.5 }}>
                                <ListItemIcon>
                                    <SettingsIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Settings</ListItemText>
                            </MenuItem>
                            <Divider />
                            <MenuItem
                                onClick={handleLogout}
                                sx={{
                                    py: 1.5,
                                    color: 'error.main',
                                    '&:hover': {
                                        bgcolor: 'error.lighter',
                                    },
                                }}
                            >
                                <ListItemIcon>
                                    <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
                                </ListItemIcon>
                                <ListItemText>Logout</ListItemText>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Navigation Drawer */}
            <NavigationDrawer
                mobileOpen={mobileOpen}
                onDrawerToggle={handleDrawerToggle}
                drawerWidth={drawerWidth}
            />

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    mt: '64px',
                    minHeight: 'calc(100vh - 64px)',
                }}
            >
                {/* Profile Completion Banner */}
                {showBanner && profileStatus && (
                    <Alert
                        severity="warning"
                        icon={<InfoIcon />}
                        onClose={() => setBannerDismissed(true)}
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() => router.push('/profile')}
                                endIcon={<ArrowForwardIcon />}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                }}
                            >
                                Complete Profile
                            </Button>
                        }
                        sx={{
                            m: 0,
                            borderRadius: 0,
                            borderBottom: '1px solid',
                            borderColor: 'warning.light',
                            '& .MuiAlert-message': {
                                flex: 1,
                            },
                        }}
                    >
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Complete your profile to unlock all features ({profileStatus.completionPercentage}% complete)
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={profileStatus.completionPercentage}
                                sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(0,0,0,0.1)',
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: '#8CC342',
                                    },
                                    mb: 0.5,
                                }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                Missing: {profileStatus.missingFieldsLabels.slice(0, 3).join(', ')}
                                {profileStatus.missingFieldsLabels.length > 3 &&
                                    ` +${profileStatus.missingFieldsLabels.length - 3} more`}
                            </Typography>
                        </Box>
                    </Alert>
                )}
                
                {/* Page Content */}
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
};
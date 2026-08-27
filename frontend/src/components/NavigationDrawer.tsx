// components/layout/NavigationDrawer.tsx
'use client';

import React, { FC } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    Box,
    Drawer,
    Toolbar,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    useMediaQuery,
    useTheme,
    Divider,
    Avatar,
    alpha,
} from '@mui/material';
import {
    Close as CloseIcon,
    Dashboard as DashboardIcon,
    Campaign as CampaignIcon,
    Group as GroupIcon,
    Handshake as HandshakeIcon,
    LocalOffer as OfferIcon,
    StoreMallDirectory as VendorIcon,
    Settings as SettingsIcon,
    BusinessCenter as ServicesIcon,
    Person as PersonIcon,
    Assignment as AssignmentIcon,
    Explore as ExploreIcon,
    CalendarToday as CalendarIcon,
    Notifications as NotificationsIcon,
    AttachMoney as PaymentsIcon,
} from '@mui/icons-material';

interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType;
}

interface NavigationDrawerProps {
    mobileOpen: boolean;
    onDrawerToggle: () => void;
    drawerWidth?: number;
}

const mainNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
    { name: 'Campaigns', href: '/campaign', icon: CampaignIcon },
    { name: 'Explore', href: '/explore', icon: ExploreIcon },
    { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
    { name: 'Requirements', href: '/requirements', icon: AssignmentIcon },
    { name: 'Vendors & Services', href: '/vendors', icon: ServicesIcon },
    { name: 'Notifications', href: '/notifications', icon: NotificationsIcon },
    { name: 'Collabs', href: '/influencer-offers', icon: OfferIcon },
    { name: 'Offers (Vendors)', href: '/vendor-offers', icon: VendorIcon },
    { name: 'Payments', href: '/payments', icon: PaymentsIcon },
];

const bottomNavItems: NavItem[] = [
    { name: 'Profile', href: '/profile', icon: PersonIcon },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export const NavigationDrawer: FC<NavigationDrawerProps> = ({
                                                                mobileOpen,
                                                                onDrawerToggle,
                                                                drawerWidth = 240,
                                                            }) => {
    const pathname = usePathname();
    const router = useRouter();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    const handleNavigation = (href: string) => {
        router.push(href);
        if (!isDesktop) {
            onDrawerToggle();
        }
    };

    const drawer = (
        <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: '#FAFAFA',
        }}>
            {/* Logo/Brand Section */}
            <Box sx={{ 
                p: 2.5, 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar 
                        sx={{ 
                            width: 40, 
                            height: 40, 
                            bgcolor: '#8CC342',
                            fontWeight: 'bold',
                            fontSize: '1.2rem',
                        }}
                    >
                        IM
                    </Avatar>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #8CC342 0%, #7CB342 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px',
                        }}
                    >
                        InfluenceMe
                    </Typography>
                </Box>
                {!isDesktop && (
                    <IconButton
                        onClick={onDrawerToggle}
                        size="small"
                        sx={{ 
                            color: 'text.secondary',
                            '&:hover': { bgcolor: alpha('#8CC342', 0.1) }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                )}
            </Box>

            {/* Navigation Section */}
            <Box sx={{ flex: 1, overflowY: 'auto', py: 2, display: 'flex', flexDirection: 'column' }}>
                {/* Main Menu */}
                <Box sx={{ flex: 1 }}>
                    <Typography 
                        variant="caption" 
                        sx={{ 
                            px: 3, 
                            mb: 1, 
                            display: 'block',
                            color: 'text.secondary',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            fontSize: '0.7rem',
                        }}
                    >
                        Main Menu
                    </Typography>
                    <List sx={{ px: 1.5 }}>
                        {mainNavItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <ListItem key={item.name} disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        selected={isActive}
                                        onClick={() => handleNavigation(item.href)}
                                        sx={{
                                            borderRadius: 2,
                                            py: 1.2,
                                            px: 2,
                                            transition: 'all 0.2s ease',
                                            '&.Mui-selected': {
                                                backgroundColor: '#8CC342',
                                                color: 'white',
                                                boxShadow: '0 2px 8px rgba(140, 195, 66, 0.3)',
                                                '& .MuiListItemIcon-root': {
                                                    color: 'white',
                                                },
                                                '& .MuiListItemText-primary': {
                                                    fontWeight: 600,
                                                },
                                                '&:hover': {
                                                    backgroundColor: '#7CB342',
                                                    transform: 'translateX(4px)',
                                                },
                                            },
                                            '&:not(.Mui-selected)': {
                                                '&:hover': {
                                                    backgroundColor: alpha('#8CC342', 0.1),
                                                    transform: 'translateX(4px)',
                                                    '& .MuiListItemIcon-root': {
                                                        color: '#8CC342',
                                                    },
                                                },
                                            },
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: 40,
                                                color: isActive ? 'white' : 'text.secondary',
                                            }}
                                        >
                                            <Icon />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={item.name}
                                            primaryTypographyProps={{
                                                fontSize: '0.95rem',
                                                fontWeight: isActive ? 600 : 500,
                                            }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                </Box>

                {/* Bottom Menu (Settings) */}
                <Box sx={{ px: 1.5, pb: 1 }}>
                    <Divider sx={{ mb: 1 }} />
                    <List sx={{ p: 0 }}>
                        {bottomNavItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <ListItem key={item.name} disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        selected={isActive}
                                        onClick={() => handleNavigation(item.href)}
                                        sx={{
                                            borderRadius: 2,
                                            py: 1.2,
                                            px: 2,
                                            transition: 'all 0.2s ease',
                                            '&.Mui-selected': {
                                                backgroundColor: '#8CC342',
                                                color: 'white',
                                                boxShadow: '0 2px 8px rgba(140, 195, 66, 0.3)',
                                                '& .MuiListItemIcon-root': {
                                                    color: 'white',
                                                },
                                                '& .MuiListItemText-primary': {
                                                    fontWeight: 600,
                                                },
                                                '&:hover': {
                                                    backgroundColor: '#7CB342',
                                                    transform: 'translateX(4px)',
                                                },
                                            },
                                            '&:not(.Mui-selected)': {
                                                '&:hover': {
                                                    backgroundColor: alpha('#8CC342', 0.1),
                                                    transform: 'translateX(4px)',
                                                    '& .MuiListItemIcon-root': {
                                                        color: '#8CC342',
                                                    },
                                                },
                                            },
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: 40,
                                                color: isActive ? 'white' : 'text.secondary',
                                            }}
                                        >
                                            <Icon />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={item.name}
                                            primaryTypographyProps={{
                                                fontSize: '0.95rem',
                                                fontWeight: isActive ? 600 : 500,
                                            }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                </Box>
            </Box>

            {/* Footer Section */}
            <Box sx={{ 
                p: 2, 
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'white',
            }}>
                <Typography 
                    variant="caption" 
                    sx={{ 
                        display: 'block', 
                        textAlign: 'center',
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                    }}
                >
                    © 2024 InfluenceMe
                </Typography>
                <Typography 
                    variant="caption" 
                    sx={{ 
                        display: 'block', 
                        textAlign: 'center',
                        color: '#8CC342',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        mt: 0.5,
                    }}
                >
                    v1.0.0
                </Typography>
            </Box>
        </Box>
    );

    return (
        <Box
            component="nav"
            sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
            aria-label="navigation menu"
        >
            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        bgcolor: '#FAFAFA',
                        backgroundImage: 'none',
                    },
                }}
            >
                {drawer}
            </Drawer>

            {/* Desktop Permanent Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        bgcolor: '#FAFAFA',
                        backgroundImage: 'none',
                    },
                }}
                open
            >
                {drawer}
            </Drawer>
        </Box>
    );
};
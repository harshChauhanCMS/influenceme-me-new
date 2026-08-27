'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Box,
    Avatar,
    Chip,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    Tabs,
    Tab,
    Link as MuiLink,
    ImageList,
    ImageListItem,
    Paper,
    Typography,
    Button,
} from '@mui/material';
import {
    Close as CloseIcon,
    Instagram as InstagramIcon,
    YouTube as YouTubeIcon,
    Facebook as FacebookIcon,
    Twitter as TwitterIcon,
    LinkedIn as LinkedInIcon,
    Language as WebsiteIcon,
    LocationOn as LocationIcon,
    Message as MessageIcon,
} from '@mui/icons-material';
import { IUser, ISocialMedia } from '../../../../shared/types/user';
import userService from '@/services/userService';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import { getFollowerCount } from '@/utils/socialUtils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { chatService } from '@/services/chatService';

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
            id={`influencer-dialog-tabpanel-${index}`}
            aria-labelledby={`influencer-dialog-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
        </div>
    );
}

interface InfluencerProfileDialogProps {
    open: boolean;
    influencer: IUser | null;
    onClose: () => void;
    onContact?: (influencer: IUser) => void;
}

export const InfluencerProfileDialog: React.FC<InfluencerProfileDialogProps> = ({
    open,
    influencer: initialInfluencer,
    onClose,
    onContact,
}) => {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [influencer, setInfluencer] = useState<IUser | null>(initialInfluencer);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [messageLoading, setMessageLoading] = useState(false);

    useEffect(() => {
        if (open && initialInfluencer?._id) {
            // Reset local UI state whenever dialog opens for a (possibly) new influencer
            setTabValue(0);
            if (initialInfluencer.influencerInfo) {
                // If we already have full data, use it
                setInfluencer(initialInfluencer);
            } else {
                // Otherwise fetch full profile
                loadInfluencerProfile();
            }
        }
    }, [open, initialInfluencer?._id]);

    const loadInfluencerProfile = async () => {
        if (!initialInfluencer?._id) return;
        try {
            setLoading(true);
            setError(null);
            const data = await userService.getInfluencerById(initialInfluencer._id);
            setInfluencer(data);
        } catch (err: unknown) {
            console.error('Error loading influencer profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to load influencer profile');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleMessage = async () => {
        if (!influencer || !currentUser) return;

        try {
            setMessageLoading(true);
            
            // Determine chat type based on current user role
            let chatType: 'influencer-brand' | 'brand-vendor' | 'vendor-influencer' = 'influencer-brand';
            if (currentUser.role === 'brand' && influencer.role === 'influencer') {
                chatType = 'influencer-brand';
            } else if (currentUser.role === 'brand' && influencer.role === 'vendor') {
                chatType = 'brand-vendor';
            } else if (currentUser.role === 'vendor' && influencer.role === 'influencer') {
                chatType = 'vendor-influencer';
            }

            // Create or get chat room
            const room = await chatService.createOrGetChatRoom({
                participantId: influencer._id,
                chatType: chatType,
            });

            // Navigate to chat page with room pre-selected
            router.push(`/chat?roomId=${room._id}`);
            onClose();
        } catch (error: unknown) {
            const err = error as { response?: { status: number }; message?: string };
            if (err.response?.status === 409) {
                // Duplicate room: fetch rooms and open existing conversation
                try {
                    const { data: rooms } = await chatService.getChatRooms(1, 50);
                    const existingRoom = rooms.find(
                        (r) => String(r.participantInfo._id) === String(influencer._id)
                    );
                    if (existingRoom) {
                        router.push(`/chat?roomId=${existingRoom._id}`);
                        onClose();
                        return;
                    }
                } catch (_) {
                    // fall through to redirect without roomId
                }
                router.push('/chat');
                onClose();
                return;
            }
            console.error('Failed to create chat room:', error);
            alert(error instanceof Error ? error.message : 'Failed to start conversation');
        } finally {
            setMessageLoading(false);
        }
    };

    const getInstagramData = (): ISocialMedia | null => {
        if (!influencer?.influencerInfo?.socialMedia) return null;
        return influencer.influencerInfo.socialMedia.find(sm => sm.platform === 'instagram') || null;
    };

    const getFacebookData = (): ISocialMedia | null => {
        if (!influencer?.influencerInfo?.socialMedia) return null;
        return influencer.influencerInfo.socialMedia.find(sm => sm.platform === 'facebook') || null;
    };

    const getYouTubeData = (): ISocialMedia | null => {
        if (!influencer?.influencerInfo?.socialMedia) return null;
        return influencer.influencerInfo.socialMedia.find(sm => sm.platform === 'youtube') || null;
    };

    const getInstagramFollowersCount = (): number => {
        const sm = getInstagramData();
        let count = getFollowerCount(sm?.followers);

        const info = influencer?.influencerInfo;

        // Prefer counts from instagramData.linkedAccounts / instagramLinkedAccounts if present
        const linkedFromData = info?.instagramData?.linkedAccounts ?? [];
        let linkedMax = 0;
        linkedFromData.forEach((acc) => {
            const followers = (acc as any).followers;
            if (typeof followers === 'number' && followers > linkedMax) {
                linkedMax = followers;
            }
        });

        const linkedFromInfo = info?.instagramLinkedAccounts ?? [];
        linkedFromInfo.forEach((acc) => {
            const followers = (acc as any).followers;
            if (typeof followers === 'number' && followers > linkedMax) {
                linkedMax = followers;
            }
        });

        return Math.max(count, linkedMax);
    };

    const getFacebookFollowersCount = (): number => {
        const sm = getFacebookData();
        let count = getFollowerCount(sm?.followers);

        const pages = influencer?.influencerInfo?.facebookData?.pages ?? [];
        let maxFromPages = 0;
        pages.forEach((p: any) => {
            const v = p.followersCount ?? p.fanCount ?? 0;
            if (typeof v === 'number' && v > maxFromPages) {
                maxFromPages = v;
            }
        });

        return Math.max(count, maxFromPages);
    };

    const getInstagramProfileUrl = (): string | undefined => {
        const sm = getInstagramData();
        if (!sm) return undefined;
        if (sm.url) return sm.url;
        if (sm.username) return `https://www.instagram.com/${sm.username}`;
        return undefined;
    };

    const getYoutubeChannelUrl = (): string | undefined => {
        const sm = getYouTubeData();
        if (!sm) return undefined;
        let url = sm.url || '';
        if (!url && sm.username) {
            url = `https://www.youtube.com/${sm.username}`;
        }
        if (!url) return undefined;

        // Normalize double-@ issue (e.g. https://youtube.com/@@handle)
        url = url.replace('https://youtube.com/@@', 'https://www.youtube.com/@');
        url = url.replace('https://www.youtube.com/@@', 'https://www.youtube.com/@');
        return url;
    };

    const formatNumber = (num?: number): string => {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const handleClose = () => {
        setTabValue(0);
        setError(null);
        onClose();
    };

    if (!initialInfluencer) return null;

    const instagramData = influencer ? getInstagramData() : null;
    const facebookData = influencer ? getFacebookData() : null;
    const youtubeData = influencer ? getYouTubeData() : null;
    const instagramProfileUrl = getInstagramProfileUrl();
    const youtubeChannelUrl = getYoutubeChannelUrl();
    const influencerInfo = influencer?.influencerInfo;
    const hasShowcase = (influencer?.showcase?.length ?? 0) > 0;
    const safeTabValue = hasShowcase ? tabValue : 0;

    // @ts-ignore
    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    maxHeight: '90vh',
                    borderRadius: 3,
                },
            }}
        >
            <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                    Influencer Profile
                </Typography>
                <Box display="flex" gap={1} alignItems="center">
                    {currentUser && currentUser.role !== 'influencer' && influencer && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<MessageIcon />}
                            onClick={handleMessage}
                            disabled={messageLoading}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 'bold',
                                px: 3,
                            }}
                        >
                            {messageLoading ? 'Loading...' : 'Message'}
                        </Button>
                    )}
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ overflowY: 'auto', px: 3 }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : influencer ? (
                    <>
                        {/* Profile Header */}
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 4, 
                                borderRadius: 3, 
                                mb: 3,
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Profile Picture and Basic Info */}
                                <div>
                                    <Box display="flex" flexDirection="column" alignItems="center">
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                mb: 2,
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    inset: -4,
                                                    borderRadius: '50%',
                                                    padding: 2,
                                                    background: 'linear-gradient(45deg, #6366f1, #a855f7)',
                                                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                                    WebkitMaskComposite: 'xor',
                                                    maskComposite: 'exclude',
                                                },
                                            }}
                                        >
                                            <Avatar
                                                src={getProxiedImageUrl(influencer.profilePictureUrl)}
                                                sx={{ 
                                                    width: 140, 
                                                    height: 140,
                                                    border: '4px solid white',
                                                    boxShadow: 3,
                                                }}
                                            >
                                                {influencer.name?.charAt(0).toUpperCase()}
                                            </Avatar>
                                        </Box>
                                        <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                                            {influencer.name}
                                        </Typography>
                                        {influencerInfo?.influencerType && (
                                            <Chip
                                                label={influencerInfo.influencerType}
                                                color="primary"
                                                sx={{ 
                                                    mb: 1,
                                                    fontWeight: 'bold',
                                                    fontSize: '0.875rem',
                                                    height: 32,
                                                }}
                                            />
                                        )}
                                        {influencerInfo?.genre && influencerInfo.genre.length > 0 && (
                                            <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center" mt={1.5}>
                                                {influencerInfo.genre.map((g, idx) => (
                                                    <Chip 
                                                        key={idx} 
                                                        label={g} 
                                                        size="small" 
                                                        variant="outlined"
                                                        sx={{
                                                            borderColor: 'primary.main',
                                                            color: 'primary.main',
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                </div>

                                {/* Stats and Info */}
                                <div className="md:col-span-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {/* Instagram Stats */}
                                        {instagramData && (
                                            <Card 
                                                variant="outlined"
                                                sx={{
                                                    background: 'linear-gradient(135deg, rgba(228, 64, 95, 0.1) 0%, rgba(252, 175, 69, 0.1) 50%, rgba(131, 58, 180, 0.1) 100%)',
                                                    borderColor: 'rgba(228, 64, 95, 0.3)',
                                                    borderRadius: 2,
                                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: 4,
                                                    },
                                                }}
                                            >
                                                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                                    <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                                                        <Box
                                                            sx={{
                                                                p: 1,
                                                                borderRadius: 1.5,
                                                                background: 'linear-gradient(45deg, #E4405F, #FCAF45, #833AB4)',
                                                            }}
                                                        >
                                                            <InstagramIcon sx={{ color: 'white', fontSize: 20 }} />
                                                        </Box>
                                                        <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
                                                            Instagram
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                                                        {formatNumber(getInstagramFollowersCount())}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Followers
                                                    </Typography>
                                                    {instagramData.engagement?.averagePerPost != null && (
                                                        <Typography variant="caption" display="block" mt={1} color="text.secondary">
                                                            Avg Engagement: {instagramData.engagement.averagePerPost}%
                                                        </Typography>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Facebook Stats */}
                                        {facebookData && (
                                            <Card 
                                                variant="outlined"
                                                sx={{
                                                    background: 'linear-gradient(135deg, rgba(59, 89, 152, 0.08) 0%, rgba(24, 119, 242, 0.08) 100%)',
                                                    borderColor: 'rgba(24, 119, 242, 0.3)',
                                                    borderRadius: 2,
                                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: 4,
                                                    },
                                                }}
                                            >
                                                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                                    <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                                                        <Box
                                                            sx={{
                                                                p: 1,
                                                                borderRadius: 1.5,
                                                                bgcolor: '#1877F2',
                                                            }}
                                                        >
                                                            <FacebookIcon sx={{ color: 'white', fontSize: 20 }} />
                                                        </Box>
                                                        <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
                                                            Facebook
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                                                        {formatNumber(getFacebookFollowersCount())}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Followers
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* YouTube Stats */}
                                        {youtubeData && (
                                            <Card 
                                                variant="outlined"
                                                sx={{
                                                    background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.1) 0%, rgba(255, 69, 0, 0.1) 100%)',
                                                    borderColor: 'rgba(255, 0, 0, 0.3)',
                                                    borderRadius: 2,
                                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: 4,
                                                    },
                                                }}
                                            >
                                                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                                    <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                                                        <Box
                                                            sx={{
                                                                p: 1,
                                                                borderRadius: 1.5,
                                                                bgcolor: 'error.main',
                                                            }}
                                                        >
                                                            <YouTubeIcon sx={{ color: 'white', fontSize: 20 }} />
                                                        </Box>
                                                        <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
                                                            YouTube
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                                                        {formatNumber(youtubeData.metrics?.subscribers)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Subscribers
                                                    </Typography>
                                                    {youtubeData.metrics?.averageViews && (
                                                        <Typography variant="caption" display="block" mt={1} color="text.secondary">
                                                            Avg Views: {formatNumber(youtubeData.metrics.averageViews)}
                                                        </Typography>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>

                                    {/* Social Media Links */}
                                    <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                                        {instagramProfileUrl && (
                                            <MuiLink href={instagramProfileUrl} target="_blank" rel="noopener">
                                                <Chip
                                                    icon={<InstagramIcon />}
                                                    label={instagramData?.username || 'Instagram'}
                                                    clickable
                                                    size="small"
                                                />
                                            </MuiLink>
                                        )}
                                        {youtubeChannelUrl && (
                                            <MuiLink href={youtubeChannelUrl} target="_blank" rel="noopener">
                                                <Chip
                                                    icon={<YouTubeIcon />}
                                                    label={youtubeData?.username || 'YouTube'}
                                                    clickable
                                                    size="small"
                                                />
                                            </MuiLink>
                                        )}
                                        {influencer.facebook && (
                                            <MuiLink href={influencer.facebook} target="_blank" rel="noopener">
                                                <Chip icon={<FacebookIcon />} label="Facebook" clickable size="small" />
                                            </MuiLink>
                                        )}
                                        {influencer.twitter && (
                                            <MuiLink href={influencer.twitter} target="_blank" rel="noopener">
                                                <Chip icon={<TwitterIcon />} label="Twitter" clickable size="small" />
                                            </MuiLink>
                                        )}
                                        {influencer.linkedin && (
                                            <MuiLink href={influencer.linkedin} target="_blank" rel="noopener">
                                                <Chip icon={<LinkedInIcon />} label="LinkedIn" clickable size="small" />
                                            </MuiLink>
                                        )}
                                        {influencer.website && (
                                            <MuiLink href={influencer.website} target="_blank" rel="noopener">
                                                <Chip icon={<WebsiteIcon />} label="Website" clickable size="small" />
                                            </MuiLink>
                                        )}
                                    </Box>

                                    {/* Message Button */}
                                    {currentUser && currentUser.role !== 'influencer' && influencer && (
                                        <Box mt={3} display="flex" justifyContent="center">
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="large"
                                                startIcon={<MessageIcon />}
                                                onClick={handleMessage}
                                                disabled={messageLoading}
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    fontWeight: 'bold',
                                                    px: 4,
                                                    py: 1.5,
                                                    fontSize: '1rem',
                                                    boxShadow: 3,
                                                    '&:hover': {
                                                        boxShadow: 6,
                                                        transform: 'translateY(-2px)',
                                                    },
                                                    transition: 'all 0.3s ease',
                                                }}
                                            >
                                                {messageLoading ? 'Starting Conversation...' : 'Send Message'}
                                            </Button>
                                        </Box>
                                    )}
                                </div>
                            </div>
                        </Paper>

                        {/* Tabs */}
                        <Box>
                            <Tabs value={safeTabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                                <Tab label="Overview" />
                                {hasShowcase && (
                                    <Tab label={`Showcase (${(influencer.showcase !== undefined ? influencer.showcase.length : '')})`} />
                                )}
                            </Tabs>

                            {/* Overview Tab */}
                            <TabPanel value={safeTabValue} index={0}>
                                <Box mt={3}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* About Section */}
                                        {influencerInfo?.influencerDescription && (
                                            <div className="col-span-full">
                                                <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                                                    <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
                                                        About
                                                    </Typography>
                                                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                                        {influencerInfo.influencerDescription}
                                                    </Typography>
                                                </Paper>
                                            </div>
                                        )}

                                        {/* Professional Details */}
                                        <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                                            <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
                                                Professional Details
                                            </Typography>
                                            <Box display="flex" flexDirection="column" gap={2} mt={2}>
                                                {influencerInfo?.influencerType && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                                            Influencer Type
                                                        </Typography>
                                                        <Chip label={influencerInfo.influencerType} color="primary" size="small" />
                                                    </Box>
                                                )}
                                                {influencerInfo?.workType && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                                            Work Type
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {influencerInfo.workType}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {influencerInfo?.influencerSince && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                                            Influencer Since
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {influencerInfo.influencerSince}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {influencerInfo?.genre && influencerInfo.genre.length > 0 && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                                            Genres
                                                        </Typography>
                                                        <Box display="flex" gap={1} flexWrap="wrap">
                                                            {influencerInfo.genre.map((g, idx) => (
                                                                <Chip key={idx} label={g} size="small" variant="outlined" />
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Paper>

                                        {/* Personal Information */}
                                        <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                                            <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
                                                Personal Information
                                            </Typography>
                                            <Box display="flex" flexDirection="column" gap={2} mt={2}>
                                                {influencer.dateOfBirth && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                                            Date of Birth
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {new Date(influencer.dateOfBirth).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {influencerInfo?.maritalStatus && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                                            Marital Status
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {influencerInfo.maritalStatus}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {influencerInfo?.children !== undefined && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                                            Children
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {influencerInfo.children}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {influencerInfo?.pets !== undefined && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                                            Pets
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {influencerInfo.pets}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Paper>

                                        {/* Location */}
                                        {influencer.addresses && (
                                            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                                    <LocationIcon color="primary" />
                                                    <Typography variant="h6" fontWeight="bold" color="primary">
                                                        Location
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body1" color="text.secondary" fontWeight="medium">
                                                    {[
                                                        influencer.addresses.city,
                                                        influencer.addresses.state,
                                                        influencer.addresses.country,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                </Typography>
                                            </Paper>
                                        )}

                                        {/* Languages */}
                                        {influencer.spokenLanguages && influencer.spokenLanguages.length > 0 && (
                                            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                                    <WebsiteIcon color="primary" />
                                                    <Typography variant="h6" fontWeight="bold" color="primary">
                                                        Languages
                                                    </Typography>
                                                </Box>
                                                <Box display="flex" gap={1} flexWrap="wrap">
                                                    {influencer.spokenLanguages.map((lang, idx) => (
                                                        <Chip key={idx} label={lang} size="medium" color="primary" variant="outlined" />
                                                    ))}
                                                </Box>
                                            </Paper>
                                        )}

                                        {/* Social Media Stats */}
                                        {(instagramData || youtubeData) && (
                                            <div className="col-span-full">
                                                <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                                                    <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
                                                        Social Media Statistics
                                                    </Typography>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                                                        {instagramData && (
                                                            <Card variant="outlined" sx={{ bgcolor: 'white', borderRadius: 2 }}>
                                                                <CardContent sx={{ p: 2.5 }}>
                                                                    <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                                                                        <Box
                                                                            sx={{
                                                                                p: 1,
                                                                                borderRadius: 2,
                                                                                background: 'linear-gradient(45deg, #E4405F, #FCAF45, #833AB4)',
                                                                            }}
                                                                        >
                                                                            <InstagramIcon sx={{ color: 'white', fontSize: 24 }} />
                                                                        </Box>
                                                                        <Typography variant="subtitle1" fontWeight="bold">
                                                                            Instagram
                                                                        </Typography>
                                                                    </Box>
                                                                    <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                                                                        {formatNumber(getInstagramFollowersCount())}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Followers
                                                                    </Typography>
                                                                    {instagramData.engagement?.averagePerPost && (
                                                                        <Box mt={1}>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Avg Engagement: {formatNumber(instagramData.engagement.averagePerPost)}
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                    </CardContent>
                                                            </Card>
                                                        )}
                                                        {facebookData && (
                                                            <Card variant="outlined" sx={{ bgcolor: 'white', borderRadius: 2 }}>
                                                                <CardContent sx={{ p: 2.5 }}>
                                                                    <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                                                                        <Box
                                                                            sx={{
                                                                                p: 1,
                                                                                borderRadius: 2,
                                                                                bgcolor: '#1877F2',
                                                                            }}
                                                                        >
                                                                            <FacebookIcon sx={{ color: 'white', fontSize: 24 }} />
                                                                        </Box>
                                                                        <Typography variant="subtitle1" fontWeight="bold">
                                                                            Facebook
                                                                        </Typography>
                                                                    </Box>
                                                                    <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                                                                        {formatNumber(getFacebookFollowersCount())}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Followers
                                                                    </Typography>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                        {youtubeData && (
                                                            <Card variant="outlined" sx={{ bgcolor: 'white', borderRadius: 2 }}>
                                                                <CardContent sx={{ p: 2.5 }}>
                                                                    <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                                                                        <Box
                                                                            sx={{
                                                                                p: 1,
                                                                                borderRadius: 2,
                                                                                bgcolor: 'error.main',
                                                                            }}
                                                                        >
                                                                            <YouTubeIcon sx={{ color: 'white', fontSize: 24 }} />
                                                                        </Box>
                                                                        <Typography variant="subtitle1" fontWeight="bold">
                                                                            YouTube
                                                                        </Typography>
                                                                    </Box>
                                                                    <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                                                                        {formatNumber(youtubeData.metrics?.subscribers)}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Subscribers
                                                                    </Typography>
                                                                    {youtubeData.metrics?.averageViews && (
                                                                        <Box mt={1}>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Avg Views: {formatNumber(youtubeData.metrics.averageViews)}
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </div>
                                                </Paper>
                                            </div>
                                        )}
                                    </div>
                                </Box>
                            </TabPanel>

                            {/* Showcase Tab */}
                            {hasShowcase && (
                                <TabPanel value={safeTabValue} index={1}>
                                    <Box mt={2}>
                                        <ImageList cols={3} gap={12} sx={{ mb: 0 }}>
                                            {influencer.showcase.map((media, idx) => (
                                                <ImageListItem 
                                                    key={idx}
                                                    sx={{
                                                        borderRadius: 2,
                                                        overflow: 'hidden',
                                                        boxShadow: 2,
                                                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                                        '&:hover': {
                                                            transform: 'translateY(-4px)',
                                                            boxShadow: 6,
                                                        },
                                                    }}
                                                >
                                                    {media.mediaType === 'video' ? (
                                                        <Box
                                                            component="video"
                                                            src={getProxiedImageUrl(media.url)}
                                                            controls
                                                            sx={{
                                                                width: '100%',
                                                                height: 'auto',
                                                                display: 'block',
                                                            }}
                                                            poster={media.thumbnailUrl ? getProxiedImageUrl(media.thumbnailUrl) : undefined}
                                                        />
                                                    ) : (
                                                        <Box
                                                            component="img"
                                                            src={getProxiedImageUrl(media.url)}
                                                            alt={media.caption || 'Showcase media'}
                                                            sx={{
                                                                width: '100%',
                                                                height: 'auto',
                                                                display: 'block',
                                                                objectFit: 'cover',
                                                            }}
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                            }}
                                                        />
                                                    )}
                                                    {media.caption && (
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                bottom: 0,
                                                                left: 0,
                                                                right: 0,
                                                                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                                                                p: 1.5,
                                                            }}
                                                        >
                                                            <Typography 
                                                                variant="caption" 
                                                                sx={{ 
                                                                    color: 'white',
                                                                    display: 'block',
                                                                    fontWeight: 'medium',
                                                                }}
                                                            >
                                                                {media.caption}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </ImageListItem>
                                            ))}
                                        </ImageList>
                                    </Box>
                                </TabPanel>
                            )}
                        </Box>
                    </>
                ) : (
                    <Alert severity="info">Loading influencer profile...</Alert>
                )}
            </DialogContent>
        </Dialog>
    );
};
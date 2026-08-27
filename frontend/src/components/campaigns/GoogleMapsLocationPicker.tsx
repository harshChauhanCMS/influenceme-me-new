// components/campaigns/GoogleMapsLocationPicker.tsx
'use client';

import React, { FC, useState, useEffect } from 'react';
import {
    Box,
    TextField,
    InputAdornment,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Paper,
    CircularProgress,
    Typography,
    Chip,
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    Clear as ClearIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import mapService from '@/services/mapService';
import { Place } from '../../../../shared/types/map';

interface GoogleMapsLocationPickerProps {
    onLocationSelect: (location: { 
        address: string; 
        latitude: number; 
        longitude: number;
        city?: string;
        state?: string;
        country?: string;
        pinCode?: string;
    }) => void;
    placeholder?: string;
    label?: string;
    cities?: boolean;  // If true, filter only cities
    country?: string;  // Country code (default: 'IN')
}

/**
 * Google Maps Location Picker Component
 * Uses backend Google Places API integration for address search
 */
export const GoogleMapsLocationPicker: FC<GoogleMapsLocationPickerProps> = ({
    onLocationSelect,
    placeholder = 'Search for a location...',
    label = 'Location',
    cities = false,
    country = 'IN',
}) => {
    const [searchText, setSearchText] = useState('');
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [error, setError] = useState('');

    // Debounce search
    useEffect(() => {
        if (searchText.trim().length < 3) {
            setPlaces([]);
            setShowResults(false);
            return;
        }

        const timer = setTimeout(() => {
            handleSearch();
        }, 500); // Wait 500ms after user stops typing

        return () => clearTimeout(timer);
    }, [searchText]);

    const handleSearch = async () => {
        if (!searchText.trim()) {
            return;
        }

        try {
            setLoading(true);
            setError('');
            const results = await mapService.searchPlaces({
                searchText: searchText.trim(),
                cities,
                country,
            });
            setPlaces(results);
            setShowResults(true);
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search locations. Please try again.');
            setPlaces([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlace = (place: Place) => {
        onLocationSelect({
            address: place.formattedAddress || place.title,
            latitude: place.latitude,
            longitude: place.longitude,
            city: place.city,
            state: place.state,
            country: place.country,
            pinCode: place.pinCode,
        });
        
        // Clear search after selection
        setSearchText('');
        setPlaces([]);
        setShowResults(false);
    };

    const handleClear = () => {
        setSearchText('');
        setPlaces([]);
        setShowResults(false);
        setError('');
    };

    return (
        <Box sx={{ position: 'relative', width: '100%', zIndex: 50 }}>
            <TextField
                fullWidth
                size="small"
                label={label || undefined}
                placeholder={placeholder}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                error={!!error}
                helperText={error || (label ? 'Start typing to search for locations' : undefined)}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        height: '40px', // Match h-10
                        fontSize: '0.875rem', // Match text-sm
                        backgroundColor: 'white',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#D1D5DB', // gray-300
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#9CA3AF', // gray-400
                    },
                    '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#6366F1', // indigo-500
                        borderWidth: '2px',
                    },
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            {loading ? (
                                <CircularProgress size={16} />
                            ) : (
                                <SearchIcon sx={{ fontSize: '16px', color: '#9CA3AF' }} />
                            )}
                        </InputAdornment>
                    ),
                    endAdornment: searchText && (
                        <InputAdornment position="end">
                            <IconButton onClick={handleClear} edge="end" size="small" sx={{ padding: '4px' }}>
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />

            {/* Search Results Dropdown */}
            {showResults && places.length > 0 && (
                <Paper
                    elevation={8}
                    sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        mt: 0.5,
                        maxHeight: 300,
                        overflowY: 'auto',
                        zIndex: 9999,
                        borderRadius: 1,
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <List sx={{ p: 0 }}>
                        {places.map((place, index) => (
                            <ListItem key={index} disablePadding>
                                <ListItemButton
                                    onClick={() => handleSelectPlace(place)}
                                    sx={{
                                        py: 1.5,
                                        '&:hover': {
                                            bgcolor: 'primary.light',
                                        },
                                    }}
                                >
                                    <ListItemIcon>
                                        <LocationIcon color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={place.title}
                                        primaryTypographyProps={{
                                            variant: 'body2',
                                            sx: { fontWeight: 500 },
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}

            {/* No Results Message */}
            {showResults && places.length === 0 && !loading && searchText.length >= 3 && (
                <Paper
                    elevation={8}
                    sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        mt: 0.5,
                        p: 2,
                        zIndex: 9999,
                        borderRadius: 1,
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <Typography variant="body2" color="text.secondary" align="center">
                        No locations found for &quot;{searchText}&quot;
                    </Typography>
                </Paper>
            )}

            {/* Hint */}
            {!searchText && !label && (
                <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                        Type at least 3 characters to search
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

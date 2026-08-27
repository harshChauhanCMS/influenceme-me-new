'use client';

import React from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    CircularProgress,
    Box,
} from '@mui/material';
import { ICampaign } from '../../../../shared/types/campaign';

interface CampaignSelectorProps {
    campaigns: ICampaign[];
    selectedCampaignId: string;
    onCampaignChange: (campaignId: string) => void;
    loading?: boolean;
}

export const CampaignSelector: React.FC<CampaignSelectorProps> = ({
    campaigns,
    selectedCampaignId,
    onCampaignChange,
    loading = false,
}) => {
    const handleChange = (event: SelectChangeEvent<string>) => {
        const newValue = event.target.value;
        console.log('Campaign selection changed:', newValue);
        onCampaignChange(newValue);
    };

    // Ensure selectedCampaignId is a string
    const stringSelectedId = selectedCampaignId || '';

    // Convert all campaign IDs to strings for consistency
    const campaignOptions = campaigns
        .filter((campaign: any) => campaign._id || campaign.id) // Filter out campaigns without IDs (check both)
        .map((campaign: any, index) => {
            // Backend may send id instead of _id
            const campaignIdRaw = campaign._id || campaign.id;
            const campaignId = typeof campaignIdRaw === 'string' 
                ? campaignIdRaw 
                : String(campaignIdRaw);
            return {
                id: campaignId || `temp-${index}`, // Fallback ID if somehow undefined
                name: campaign.name || `Campaign ${campaignId ? campaignId.slice(-6) : index}`,
            };
        })
        .filter((option) => option.id && option.id !== 'undefined'); // Remove any undefined IDs

    return (
        <Box sx={{ mb: 3 }}>
            <FormControl fullWidth variant="outlined">
                <InputLabel id="campaign-select-label">Select Campaign</InputLabel>
                <Select
                    labelId="campaign-select-label"
                    id="campaign-select"
                    value={stringSelectedId}
                    onChange={handleChange}
                    label="Select Campaign"
                    disabled={loading || campaigns.length === 0}
                    displayEmpty={false}
                    renderValue={(value) => {
                        if (!value) return '';
                        const selected = campaignOptions.find(opt => opt.id === value);
                        return selected ? selected.name : '';
                    }}
                >
                    {campaigns.length === 0 ? (
                        <MenuItem value="" disabled>
                            {loading ? 'Loading campaigns...' : 'No campaigns available'}
                        </MenuItem>
                    ) : (
                        campaignOptions.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                                {option.name}
                            </MenuItem>
                        ))
                    )}
                </Select>
            </FormControl>
        </Box>
    );
};


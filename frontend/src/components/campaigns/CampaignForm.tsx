// components/campaigns/CampaignForm.tsx
'use client';

import React, { FC, useState, ChangeEvent } from 'react';
import {
    Box,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Typography,
    Chip,
    Stack,
    SelectChangeEvent,
} from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import { ICampaign, IDeliverable, ILocation } from '../../../../shared/types/campaign';
import { CampaignType, CompensationType, CampaignStatus, DeliverableType } from '../../../../shared/enums/enums';

interface CampaignFormProps {
    campaign?: ICampaign | null;
    onSave: (data: Partial<ICampaign>, imageFile?: File) => void;
    onCancel: () => void;
}

export const CampaignForm: FC<CampaignFormProps> = ({ campaign, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<ICampaign>>({
        name: campaign?.name || '',
        type: campaign?.type || CampaignType.STANDARD,
        compensationType: campaign?.compensationType || CompensationType.PAID,
        status: campaign?.status || CampaignStatus.DRAFT,
        budget: campaign?.budget || undefined,
        startDate: campaign?.startDate ? new Date(campaign.startDate) : new Date(),
        endDate: campaign?.endDate ? new Date(campaign.endDate) : new Date(),
        description: campaign?.description || '',
        barterDetails: campaign?.barterDetails || '',
        targetEngagement: campaign?.targetEngagement || undefined,
        minBid: campaign?.minBid || undefined,
        deliverables: campaign?.deliverables || [],
        locations: campaign?.locations || [],
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [deliverable, setDeliverable] = useState<IDeliverable>({
        type: DeliverableType.POST,
        quantity: 1,
    });
    const [location, setLocation] = useState('');

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        // Parse number inputs properly to avoid precision issues
        let parsedValue: string | number | undefined = value;
        if (type === 'number') {
            if (value === '') {
                parsedValue = undefined;
            } else {
                // Use parseInt for integer fields (budget, minBid)
                // Use parseFloat for decimal fields (targetEngagement)
                if (name === 'targetEngagement') {
                    parsedValue = parseFloat(value);
                } else if (name === 'budget' || name === 'minBid') {
                    parsedValue = parseInt(value, 10);
                } else {
                    parsedValue = parseFloat(value);
                }
                
                // Handle invalid numbers
                if (isNaN(parsedValue)) {
                    parsedValue = undefined;
                }
            }
        }
        
        setFormData({ ...formData, [name]: parsedValue });
    };

    const handleSelectChange = (e: SelectChangeEvent) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const addDeliverable = () => {
        if (deliverable.quantity > 0) {
            setFormData({
                ...formData,
                deliverables: [...(formData.deliverables || []), deliverable],
            });
            setDeliverable({ type: DeliverableType.POST, quantity: 1 });
        }
    };

    const removeDeliverable = (index: number) => {
        setFormData({
            ...formData,
            deliverables: formData.deliverables?.filter((_, i) => i !== index),
        });
    };

    const addLocation = () => {
        if (location.trim()) {
            setFormData({
                ...formData,
                locations: [...(formData.locations || []), { address: location }],
            });
            setLocation('');
        }
    };

    const removeLocation = (index: number) => {
        setFormData({
            ...formData,
            locations: formData.locations?.filter((_, i) => i !== index),
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData, imageFile || undefined);
    };

    const formatDateForInput = (date: Date | undefined) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Campaign Name */}
                <TextField
                    fullWidth
                    required
                    label="Campaign Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                />

                {/* Campaign Type, Compensation Type & Status */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
                    <FormControl fullWidth required>
                        <InputLabel>Campaign Type</InputLabel>
                        <Select
                            name="type"
                            value={formData.type}
                            onChange={handleSelectChange}
                            label="Campaign Type"
                        >
                            <MenuItem value={CampaignType.STANDARD}>Standard</MenuItem>
                            <MenuItem value={CampaignType.AUCTION}>Auction</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth required>
                        <InputLabel>Compensation Type</InputLabel>
                        <Select
                            name="compensationType"
                            value={formData.compensationType}
                            onChange={handleSelectChange}
                            label="Compensation Type"
                        >
                            <MenuItem value={CompensationType.PAID}>Paid</MenuItem>
                            <MenuItem value={CompensationType.BARTER}>Barter</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth required>
                        <InputLabel>Status</InputLabel>
                        <Select
                            name="status"
                            value={formData.status}
                            onChange={handleSelectChange}
                            label="Status"
                        >
                            <MenuItem value={CampaignStatus.DRAFT}>Draft</MenuItem>
                            <MenuItem value={CampaignStatus.ACTIVE}>Active</MenuItem>
                            <MenuItem value={CampaignStatus.UPCOMING}>Upcoming</MenuItem>
                            <MenuItem value={CampaignStatus.PAUSED}>Paused</MenuItem>
                            <MenuItem value={CampaignStatus.COMPLETED}>Completed</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Budget (if Paid) */}
                    {formData.compensationType === CompensationType.PAID && (
                        <TextField
                            fullWidth
                            type="number"
                            label="Budget (₹)"
                            name="budget"
                            value={formData.budget || ''}
                            onChange={handleChange}
                        />
                    )}

                    {/* Minimum Bid (if Auction & Paid) */}
                    {formData.type === CampaignType.AUCTION && formData.compensationType === CompensationType.PAID && (
                        <TextField
                            fullWidth
                            type="number"
                            label="Minimum Bid (₹)"
                            name="minBid"
                            value={formData.minBid || ''}
                            onChange={handleChange}
                        />
                    )}

                    {/* Target Engagement (if Standard) */}
                    {formData.type === CampaignType.STANDARD && (
                        <TextField
                            fullWidth
                            required
                            type="number"
                            label="Target Engagement Rate (%)"
                            name="targetEngagement"
                            value={formData.targetEngagement || ''}
                            onChange={handleChange}
                            inputProps={{ 
                                min: 0, 
                                max: 100,
                                step: 0.1 
                            }}
                            placeholder="e.g., 5 for 5%"
                            helperText="Expected engagement rate as a percentage"
                        />
                    )}
                </Box>

                {/* Dates */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
                    <TextField
                        fullWidth
                        required
                        type="date"
                        label="Start Date"
                        name="startDate"
                        value={formatDateForInput(formData.startDate)}
                        onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                        InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                        fullWidth
                        required
                        type="date"
                        label="End Date"
                        name="endDate"
                        value={formatDateForInput(formData.endDate)}
                        onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
                        InputLabelProps={{ shrink: true }}
                    />
                </Box>

                {/* Description */}
                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                />

                {/* Barter Details (if Barter) */}
                {formData.compensationType === CompensationType.BARTER && (
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Barter Details"
                        name="barterDetails"
                        value={formData.barterDetails}
                        onChange={handleChange}
                    />
                )}

                {/* Image Upload */}
                <Box>
                    <Button variant="outlined" component="label" fullWidth>
                        Upload Campaign Image
                        <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                    </Button>
                    {imageFile && (
                        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                            Selected: {imageFile.name}
                        </Typography>
                    )}
                </Box>

                {/* Deliverables */}
                <Box>
                    <Typography variant="subtitle1" gutterBottom>
                        Deliverables
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                        <FormControl sx={{ minWidth: 150 }}>
                            <Select
                                value={deliverable.type}
                                onChange={(e) =>
                                    setDeliverable({ ...deliverable, type: e.target.value as DeliverableType })
                                }
                                size="small"
                            >
                                <MenuItem value={DeliverableType.POST}>Post</MenuItem>
                                <MenuItem value={DeliverableType.STORY}>Story</MenuItem>
                                <MenuItem value={DeliverableType.REEL}>Reel</MenuItem>
                                <MenuItem value={DeliverableType.VIDEO}>Video</MenuItem>
                                <MenuItem value={DeliverableType.MENTION}>Mention</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            type="number"
                            size="small"
                            value={deliverable.quantity}
                            onChange={(e) =>
                                setDeliverable({ ...deliverable, quantity: parseInt(e.target.value) || 1 })
                            }
                            sx={{ width: 100 }}
                            inputProps={{ min: 1 }}
                        />
                        <Button variant="outlined" onClick={addDeliverable}>
                            Add
                        </Button>
                    </Stack>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {formData.deliverables?.map((d, i) => (
                            <Chip
                                key={i}
                                label={`${d.quantity}x ${d.type}`}
                                onDelete={() => removeDeliverable(i)}
                            />
                        ))}
                    </Box>
                </Box>

                {/* Locations */}
                <Box>
                    <Typography variant="subtitle1" gutterBottom>
                        Locations
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Enter location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addLocation();
                                }
                            }}
                        />
                        <Button variant="outlined" onClick={addLocation}>
                            Add
                        </Button>
                    </Stack>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {formData.locations?.map((loc, i) => (
                            <Chip
                                key={i}
                                icon={<LocationIcon />}
                                label={loc.address}
                                onDelete={() => removeLocation(i)}
                            />
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* Form Actions */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button onClick={onCancel} variant="outlined">
                    Cancel
                </Button>
                <Button type="submit" variant="contained">
                    {campaign ? 'Update Campaign' : 'Create Campaign'}
                </Button>
            </Box>
        </Box>
    );
};

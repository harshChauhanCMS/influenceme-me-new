// components/campaigns/MultiStepCampaignForm.tsx
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
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Card,
    CardContent,
    IconButton,
    Tooltip,
    Divider,
    FormControlLabel,
    Switch,
    InputAdornment,
    CircularProgress,
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    CloudUpload as UploadIcon,
    CalendarToday as CalendarIcon,
    AttachMoney as MoneyIcon,
    Description as DescriptionIcon,
    Assignment as AssignmentIcon,
    Map as MapIcon,
} from '@mui/icons-material';
import { ICampaign, IDeliverable, ILocation } from '../../../../shared/types/campaign';
import { CampaignType, CompensationType, CampaignStatus, DeliverableType } from '../../../../shared/enums/enums';
import { GoogleMapsLocationPicker } from './GoogleMapsLocationPicker';
import { apiClient } from '@/config/api';

interface MultiStepCampaignFormProps {
    campaign?: ICampaign | null;
    onSave: (data: Partial<ICampaign>, imageFile?: File) => void;
    onCancel: () => void;
}

interface FormData extends Partial<ICampaign> {
    deliverables: IDeliverable[];
    locations: ILocation[];
}

const steps = [
    'Basic Information',
    'Campaign Details',
    'Deliverables & Locations',
    'Review & Submit'
];

export const MultiStepCampaignForm: FC<MultiStepCampaignFormProps> = ({ campaign, onSave, onCancel }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
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
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [deliverable, setDeliverable] = useState<IDeliverable>({
        type: DeliverableType.POST,
        quantity: 1,
        description: '',
    });
    const [location, setLocation] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

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
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleSelectChange = (e: SelectChangeEvent) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setUploadingImage(true);
        if (errors.image) setErrors((prev) => ({ ...prev, image: '' }));
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            const uploadRes = await apiClient.post<{ status: boolean; data: { url: string } }>(
                '/api/file/upload',
                uploadFormData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            if (uploadRes.data?.data?.url) {
                setUploadedImageUrl(uploadRes.data.data.url);
                setFormData((prev) => ({ ...prev, image: uploadRes.data!.data!.url }));
            }
        } catch (err) {
            setErrors((prev) => ({ ...prev, image: err instanceof Error ? err.message : 'Failed to upload image' }));
            setImageFile(null);
            setUploadedImageUrl(null);
        } finally {
            setUploadingImage(false);
        }
        e.target.value = '';
    };

    const addDeliverable = () => {
        if (deliverable.quantity > 0) {
            setFormData({
                ...formData,
                deliverables: [...formData.deliverables, deliverable],
            });
            setDeliverable({ type: DeliverableType.POST, quantity: 1, description: '' });
        }
    };

    const removeDeliverable = (index: number) => {
        setFormData({
            ...formData,
            deliverables: formData.deliverables.filter((_, i) => i !== index),
        });
    };

    const addLocation = () => {
        if (location.trim()) {
            setFormData({
                ...formData,
                locations: [...formData.locations, { address: location }],
            });
            setLocation('');
        }
    };

    const removeLocation = (index: number) => {
        setFormData({
            ...formData,
            locations: formData.locations.filter((_, i) => i !== index),
        });
    };

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        switch (step) {
            case 0: // Basic Information
                if (!formData.name?.trim()) newErrors.name = 'Campaign name is required';
                if (!formData.startDate) newErrors.startDate = 'Start date is required';
                if (!formData.endDate) newErrors.endDate = 'End date is required';
                if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) {
                    newErrors.endDate = 'End date must be after start date';
                }
                break;
            case 1: // Campaign Details
                if (!formData.description?.trim()) newErrors.description = 'Description is required';
                if (formData.compensationType === CompensationType.PAID && !formData.budget) {
                    newErrors.budget = 'Budget is required for paid campaigns';
                }
                if (formData.compensationType === CompensationType.BARTER && !formData.barterDetails?.trim()) {
                    newErrors.barterDetails = 'Barter details are required';
                }
                if (formData.type === CampaignType.STANDARD && !formData.targetEngagement) {
                    newErrors.targetEngagement = 'Target engagement rate is required for standard campaigns';
                }
                if (formData.type === CampaignType.STANDARD && formData.targetEngagement && (formData.targetEngagement < 0 || formData.targetEngagement > 100)) {
                    newErrors.targetEngagement = 'Target engagement rate must be between 0 and 100%';
                }
                if (formData.type === CampaignType.AUCTION && formData.compensationType === CompensationType.PAID && !formData.minBid) {
                    newErrors.minBid = 'Minimum bid is required for auction campaigns';
                }
                break;
            case 2: // Deliverables & Locations
                if (formData.deliverables.length === 0) {
                    newErrors.deliverables = 'At least one deliverable is required';
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(activeStep)) {
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleSubmit = () => {
        if (validateStep(activeStep)) {
            // Pass image URL in formData (already set when uploaded on select); don't pass file
            onSave(formData, uploadedImageUrl ? undefined : imageFile || undefined);
        }
    };

    const formatDateForInput = (date: Date | undefined) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
                            Basic Campaign Information
                        </Typography>
                        
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                required
                                label="Campaign Name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                error={!!errors.name}
                                helperText={errors.name}
                                placeholder="Enter a compelling campaign name"
                                InputProps={{
                                    startAdornment: <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
                                }}
                            />

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <FormControl fullWidth required>
                                    <InputLabel>Campaign Type</InputLabel>
                                    <Select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleSelectChange}
                                        label="Campaign Type"
                                    >
                                        <MenuItem value={CampaignType.STANDARD}>Standard Campaign</MenuItem>
                                        <MenuItem value={CampaignType.AUCTION}>Auction Campaign</MenuItem>
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
                                        <MenuItem value={CompensationType.BARTER}>Barter/Exchange</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    fullWidth
                                    required
                                    type="date"
                                    label="Start Date"
                                    name="startDate"
                                    value={formatDateForInput(formData.startDate)}
                                    onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                                    InputLabelProps={{ shrink: true }}
                                    error={!!errors.startDate}
                                    helperText={errors.startDate}
                                    InputProps={{
                                        startAdornment: <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />
                                    }}
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
                                    error={!!errors.endDate}
                                    helperText={errors.endDate}
                                    InputProps={{
                                        startAdornment: <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />
                                    }}
                                />
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    component="label"
                                    disabled={uploadingImage}
                                    startIcon={uploadingImage ? <CircularProgress size={18} color="inherit" /> : <UploadIcon />}
                                    sx={{ minWidth: 200 }}
                                >
                                    {uploadingImage ? 'Uploading...' : 'Upload Campaign Image'}
                                    <input type="file" hidden accept="image/*" onChange={handleImageChange} disabled={uploadingImage} />
                                </Button>
                                {imageFile && (
                                    <Typography variant="body2" color="success.main">
                                        {uploadingImage ? 'Uploading...' : 'Selected: ' + imageFile.name}
                                    </Typography>
                                )}
                                {errors.image && (
                                    <Typography variant="body2" color="error">
                                        {errors.image}
                                    </Typography>
                                )}
                            </Box>
                        </Stack>
                    </Box>
                );

            case 1:
                return (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
                            Campaign Details & Budget
                        </Typography>
                        
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                required
                                multiline
                                rows={4}
                                label="Campaign Description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                error={!!errors.description}
                                helperText={errors.description}
                                placeholder="Describe your campaign goals, target audience, and key messaging..."
                                InputProps={{
                                    startAdornment: <DescriptionIcon sx={{ mr: 1, color: 'primary.main', alignSelf: 'flex-start', mt: 1 }} />
                                }}
                            />

                            {formData.compensationType === CompensationType.PAID && (
                                <>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Budget (₹)"
                                        name="budget"
                                        value={formData.budget || ''}
                                        onChange={handleChange}
                                        error={!!errors.budget}
                                        helperText={errors.budget || 'Total budget allocated for this campaign'}
                                        placeholder="Enter your campaign budget"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <MoneyIcon sx={{ color: 'primary.main' }} />
                                                </InputAdornment>
                                            )
                                        }}
                                    />

                                    {formData.type === CampaignType.AUCTION && (
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Minimum Bid (₹)"
                                            name="minBid"
                                            value={formData.minBid || ''}
                                            onChange={handleChange}
                                            error={!!errors.minBid}
                                            helperText={errors.minBid || 'Minimum bid amount for auction campaigns'}
                                            placeholder="Enter minimum bid amount"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <MoneyIcon sx={{ color: 'primary.main' }} />
                                                    </InputAdornment>
                                                )
                                            }}
                                        />
                                    )}
                                </>
                            )}

                            {formData.compensationType === CompensationType.BARTER && (
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Barter Details"
                                    name="barterDetails"
                                    value={formData.barterDetails}
                                    onChange={handleChange}
                                    error={!!errors.barterDetails}
                                    helperText={errors.barterDetails}
                                    placeholder="Describe what you're offering in exchange for promotion..."
                                />
                            )}

                            {formData.type === CampaignType.STANDARD && (
                                <TextField
                                    fullWidth
                                    type="number"
                                    required
                                    label="Target Engagement Rate"
                                    name="targetEngagement"
                                    value={formData.targetEngagement || ''}
                                    onChange={handleChange}
                                    error={!!errors.targetEngagement}
                                    helperText={errors.targetEngagement || 'Expected engagement rate as a percentage (e.g., 5 for 5%)'}
                                    placeholder="Enter target engagement percentage"
                                    inputProps={{ 
                                        min: 0, 
                                        max: 100,
                                        step: 0.1 
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                👥
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                %
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            )}

                            <FormControl fullWidth>
                                <InputLabel>Campaign Status</InputLabel>
                                <Select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleSelectChange}
                                    label="Campaign Status"
                                >
                                    <MenuItem value={CampaignStatus.DRAFT}>Draft</MenuItem>
                                    <MenuItem value={CampaignStatus.ACTIVE}>Active</MenuItem>
                                    <MenuItem value={CampaignStatus.UPCOMING}>Upcoming</MenuItem>
                                    <MenuItem value={CampaignStatus.PAUSED}>Paused</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                    </Box>
                );

            case 2:
                return (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
                            Deliverables & Target Locations
                        </Typography>
                        
                        <Stack spacing={4}>
                            {/* Deliverables Section */}
                            <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
                                <CardContent>
                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                                        Content Deliverables
                                    </Typography>
                                    
                                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                        <FormControl sx={{ minWidth: 150 }}>
                                            <InputLabel>Type</InputLabel>
                                            <Select
                                                value={deliverable.type}
                                                onChange={(e) =>
                                                    setDeliverable({ ...deliverable, type: e.target.value as DeliverableType })
                                                }
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
                                            label="Quantity"
                                            value={deliverable.quantity}
                                            onChange={(e) =>
                                                setDeliverable({ ...deliverable, quantity: parseInt(e.target.value) || 1 })
                                            }
                                            sx={{ width: 120 }}
                                            inputProps={{ min: 1 }}
                                        />
                                        <TextField
                                            label="Description (Optional)"
                                            value={deliverable.description}
                                            onChange={(e) =>
                                                setDeliverable({ ...deliverable, description: e.target.value })
                                            }
                                            sx={{ flexGrow: 1 }}
                                        />
                                        <Button 
                                            variant="contained" 
                                            onClick={addDeliverable}
                                            startIcon={<AddIcon />}
                                        >
                                            Add
                                        </Button>
                                    </Stack>
                                    
                                    {errors.deliverables && (
                                        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                                            {errors.deliverables}
                                        </Typography>
                                    )}
                                    
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {formData.deliverables.map((d, i) => (
                                            <Chip
                                                key={i}
                                                label={`${d.quantity}x ${d.type}${d.description ? ` - ${d.description}` : ''}`}
                                                onDelete={() => removeDeliverable(i)}
                                                color="primary"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>

                            {/* Locations Section */}
                            <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
                                <CardContent>
                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                                        Target Locations
                                    </Typography>
                                    
                                    <Box sx={{ mb: 2 }}>
                                        <GoogleMapsLocationPicker
                                            onLocationSelect={(locationData) => {
                                                setFormData({
                                                    ...formData,
                                                    locations: [...formData.locations, locationData],
                                                });
                                            }}
                                            placeholder="Search for cities, states, or countries..."
                                            label="Add Location"
                                        />
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {formData.locations.map((loc, i) => (
                                            <Chip
                                                key={i}
                                                icon={<LocationIcon />}
                                                label={loc.address}
                                                onDelete={() => removeLocation(i)}
                                                color="secondary"
                                                variant="outlined"
                                                sx={{ mb: 1 }}
                                            />
                                        ))}
                                    </Box>
                                    
                                    {formData.locations.length === 0 && (
                                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                            No locations added yet. Use the search above to add target locations.
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Stack>
                    </Box>
                );

            case 3:
                return (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
                            Review Your Campaign
                        </Typography>
                        
                        <Stack spacing={3}>
                            <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
                                <CardContent>
                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Campaign Summary
                                    </Typography>
                                    <Stack spacing={1}>
                                        <Typography><strong>Name:</strong> {formData.name}</Typography>
                                        <Typography><strong>Type:</strong> {formData.type}</Typography>
                                        <Typography><strong>Compensation:</strong> {formData.compensationType}</Typography>
                                        <Typography><strong>Status:</strong> {formData.status}</Typography>
                                        <Typography><strong>Duration:</strong> {formatDateForInput(formData.startDate)} to {formatDateForInput(formData.endDate)}</Typography>
                                        {formData.budget && <Typography><strong>Budget:</strong> ₹{formData.budget?.toLocaleString('en-IN')}</Typography>}
                                        {formData.minBid && <Typography><strong>Minimum Bid:</strong> ₹{formData.minBid?.toLocaleString('en-IN')}</Typography>}
                                        {formData.targetEngagement && <Typography><strong>Target Engagement Rate:</strong> {formData.targetEngagement}%</Typography>}
                                        {formData.barterDetails && <Typography><strong>Barter Details:</strong> {formData.barterDetails}</Typography>}
                                    </Stack>
                                </CardContent>
                            </Card>

                            <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
                                <CardContent>
                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Description
                                    </Typography>
                                    <Typography variant="body2">{formData.description}</Typography>
                                </CardContent>
                            </Card>

                            <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
                                <CardContent>
                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Deliverables ({formData.deliverables.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {formData.deliverables.map((d, i) => (
                                            <Chip key={i} label={`${d.quantity}x ${d.type}`} />
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>

                            {formData.locations.length > 0 && (
                                <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                            Target Locations ({formData.locations.length})
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {formData.locations.map((loc, i) => (
                                                <Chip key={i} icon={<LocationIcon />} label={loc.address} />
                                            ))}
                                        </Box>
                                    </CardContent>
                                </Card>
                            )}
                        </Stack>
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Box>
            <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 3 }}>
                {steps.map((label, index) => (
                    <Step key={label}>
                        <StepLabel
                            sx={{
                                '& .MuiStepLabel-label': {
                                    fontWeight: activeStep === index ? 'bold' : 'normal',
                                    color: activeStep === index ? 'primary.main' : 'text.secondary',
                                },
                            }}
                        >
                            {label}
                        </StepLabel>
                        <StepContent>
                            {renderStepContent(index)}
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                                <Button
                                    disabled={activeStep === 0}
                                    onClick={handleBack}
                                    variant="outlined"
                                >
                                    Back
                                </Button>
                                {activeStep === steps.length - 1 ? (
                                    <Button
                                        onClick={handleSubmit}
                                        variant="contained"
                                        sx={{ px: 4 }}
                                    >
                                        {campaign ? 'Update Campaign' : 'Create Campaign'}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleNext}
                                        variant="contained"
                                    >
                                        Next
                                    </Button>
                                )}
                            </Box>
                        </StepContent>
                    </Step>
                ))}
            </Stepper>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2 }}>
                <Button onClick={onCancel} variant="outlined">
                    Cancel
                </Button>
                <Typography variant="body2" color="text.secondary">
                    Step {activeStep + 1} of {steps.length}
                </Typography>
            </Box>
        </Box>
    );
};

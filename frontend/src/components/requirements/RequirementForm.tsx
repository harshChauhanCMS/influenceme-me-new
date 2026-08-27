'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
    CircularProgress,
    Chip,
    InputAdornment,
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    AttachMoney as MoneyIcon,
    CalendarToday as CalendarIcon,
    LocationOn as LocationIcon,
} from '@mui/icons-material';
import { IVendorRequirement, ServiceCategory } from '../../../../shared/types/vendorRequirement';
import { GoogleMapsLocationPicker } from '../campaigns/GoogleMapsLocationPicker';

interface RequirementFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<IVendorRequirement>) => Promise<void>;
    initialData?: IVendorRequirement | null;
}

const steps = ['Basic Info', 'Budget & Timeline', 'Location & Details'];

const serviceCategories: { value: ServiceCategory; label: string }[] = [
    { value: 'photography', label: 'Photography' },
    { value: 'videography', label: 'Videography' },
    { value: 'event-planning', label: 'Event Planning' },
    { value: 'makeup-artist', label: 'Makeup Artist' },
    { value: 'hair-stylist', label: 'Hair Stylist' },
    { value: 'catering', label: 'Catering' },
    { value: 'decoration', label: 'Decoration' },
    { value: 'sound-system', label: 'Sound System' },
    { value: 'lighting', label: 'Lighting' },
    { value: 'content-creation', label: 'Content Creation' },
    { value: 'graphic-design', label: 'Graphic Design' },
    { value: 'social-media-management', label: 'Social Media Management' },
    { value: 'other', label: 'Other' },
];

const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export default function RequirementForm({ open, onClose, onSubmit, initialData }: RequirementFormProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [locationPickerOpen, setLocationPickerOpen] = useState(false);

    const [formData, setFormData] = useState<Partial<IVendorRequirement>>({
        title: '',
        description: '',
        category: 'photography',
        budgetCurrency: 'INR',
        priority: 'medium',
        requirements: [],
        tags: [],
    });

    const [requirementInput, setRequirementInput] = useState('');
    const [tagInput, setTagInput] = useState('');

    // Load initial data when dialog opens or initialData changes
    React.useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    title: initialData.title || '',
                    description: initialData.description || '',
                    category: initialData.category || 'photography',
                    budget: initialData.budget,
                    budgetCurrency: initialData.budgetCurrency || 'INR',
                    location: initialData.location || '',
                    city: initialData.city || '',
                    state: initialData.state || '',
                    country: initialData.country || '',
                    latitude: initialData.latitude || '',
                    longitude: initialData.longitude || '',
                    deadline: initialData.deadline,
                    startDate: initialData.startDate,
                    endDate: initialData.endDate,
                    priority: initialData.priority || 'medium',
                    requirements: initialData.requirements || [],
                    tags: initialData.tags || [],
                });
            } else {
                setFormData({
                    title: '',
                    description: '',
                    category: 'photography',
                    budgetCurrency: 'INR',
                    priority: 'medium',
                    requirements: [],
                    tags: [],
                });
            }
            setActiveStep(0);
        }
    }, [open, initialData]);

    const handleNext = () => {
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const handleChange = (field: keyof IVendorRequirement, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleLocationSelect = (location: {
        address: string;
        latitude: number;
        longitude: number;
        city?: string;
        state?: string;
        country?: string;
        pinCode?: string;
    }) => {
        setFormData((prev) => ({
            ...prev,
            location: location.address,
            city: location.city || '',
            state: location.state || '',
            country: location.country || '',
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString(),
        }));
        setLocationPickerOpen(false);
    };

    const handleAddRequirement = () => {
        if (requirementInput.trim()) {
            setFormData((prev) => ({
                ...prev,
                requirements: [...(prev.requirements || []), requirementInput.trim()],
            }));
            setRequirementInput('');
        }
    };

    const handleRemoveRequirement = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            requirements: prev.requirements?.filter((_, i) => i !== index),
        }));
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
            setFormData((prev) => ({
                ...prev,
                tags: [...(prev.tags || []), tagInput.trim()],
            }));
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData((prev) => ({
            ...prev,
            tags: prev.tags?.filter((t) => t !== tag),
        }));
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            console.log('=== SUBMITTING REQUIREMENT ===');
            console.log('Form Data:', JSON.stringify(formData, null, 2));
            await onSubmit(formData);
            handleClose();
        } catch (error) {
            console.error('Error submitting requirement:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setActiveStep(0);
        setFormData({
            title: '',
            description: '',
            category: 'photography',
            budgetCurrency: 'INR',
            priority: 'medium',
            requirements: [],
            tags: [],
        });
        setRequirementInput('');
        setTagInput('');
        onClose();
    };

    const isStepValid = () => {
        if (activeStep === 0) {
            return formData.title && formData.description && formData.category;
        }
        if (activeStep === 1) {
            return true; // Budget and timeline are optional
        }
        return true;
    };

    return (
        <>
            <Dialog 
                open={open} 
                onClose={!loading ? handleClose : undefined} 
                maxWidth="md" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                    }
                }}
            >
                <DialogTitle sx={{ bgcolor: '#8CC342', color: 'white', py: 3, px: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AssignmentIcon sx={{ fontSize: 32 }} />
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {initialData ? 'Edit Requirement' : 'Post New Requirement'}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {initialData ? 'Update your requirement details' : 'Fill in the details to post your requirement'}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ pt: 4, px: 4, pb: 2 }}>
                    <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 1 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {/* Step 1: Basic Info */}
                    {activeStep === 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <TextField
                                fullWidth
                                label="Requirement Title"
                                placeholder="e.g., Professional Event Photography Needed"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                required
                            />

                            <TextField
                                fullWidth
                                select
                                label="Service Category"
                                value={formData.category}
                                onChange={(e) => handleChange('category', e.target.value as ServiceCategory)}
                                required
                            >
                                {serviceCategories.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                fullWidth
                                multiline
                                rows={5}
                                label="Description"
                                placeholder="Provide detailed information about your requirement..."
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                required
                            />

                            <TextField
                                fullWidth
                                select
                                label="Priority"
                                value={formData.priority}
                                onChange={(e) => handleChange('priority', e.target.value)}
                            >
                                {priorityOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>
                    )}

                    {/* Step 2: Budget & Timeline */}
                    {activeStep === 1 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Budget (Optional)"
                                    placeholder="Enter your budget"
                                    value={formData.budget || ''}
                                    onChange={(e) => handleChange('budget', parseFloat(e.target.value) || undefined)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <MoneyIcon sx={{ color: '#8CC342' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <TextField
                                    select
                                    label="Currency"
                                    value={formData.budgetCurrency}
                                    onChange={(e) => handleChange('budgetCurrency', e.target.value)}
                                    sx={{ width: 120 }}
                                >
                                    <MenuItem value="INR">INR</MenuItem>
                                    <MenuItem value="USD">USD</MenuItem>
                                    <MenuItem value="EUR">EUR</MenuItem>
                                    <MenuItem value="GBP">GBP</MenuItem>
                                </TextField>
                            </Box>

                            <TextField
                                fullWidth
                                type="date"
                                label="Deadline (Optional)"
                                value={
                                    formData.deadline
                                        ? new Date(formData.deadline).toISOString().split('T')[0]
                                        : ''
                                }
                                onChange={(e) =>
                                    handleChange('deadline', e.target.value ? new Date(e.target.value) : undefined)
                                }
                                InputLabelProps={{ shrink: true }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <CalendarIcon sx={{ color: '#8CC342' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Start Date (Optional)"
                                    value={
                                        formData.startDate
                                            ? new Date(formData.startDate).toISOString().split('T')[0]
                                            : ''
                                    }
                                    onChange={(e) =>
                                        handleChange('startDate', e.target.value ? new Date(e.target.value) : undefined)
                                    }
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="End Date (Optional)"
                                    value={
                                        formData.endDate
                                            ? new Date(formData.endDate).toISOString().split('T')[0]
                                            : ''
                                    }
                                    onChange={(e) =>
                                        handleChange('endDate', e.target.value ? new Date(e.target.value) : undefined)
                                    }
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Box>
                        </Box>
                    )}

                    {/* Step 3: Location & Details */}
                    {activeStep === 2 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                    Location (Optional)
                                </Typography>
                                <Box
                                    onClick={() => setLocationPickerOpen(true)}
                                    sx={{
                                        p: 2,
                                        border: '2px dashed',
                                        borderColor: formData.location ? '#8CC342' : '#e0e0e0',
                                        borderRadius: 2,
                                        bgcolor: formData.location ? '#f1f8e9' : '#fafafa',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s',
                                        '&:hover': {
                                            borderColor: '#8CC342',
                                            bgcolor: '#f1f8e9',
                                        },
                                    }}
                                >
                                    {formData.location ? (
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <LocationIcon sx={{ color: '#8CC342', fontSize: 20 }} />
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {formData.location}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {[formData.city, formData.state, formData.country].filter(Boolean).join(', ')}
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Box sx={{ textAlign: 'center', py: 2 }}>
                                            <LocationIcon sx={{ fontSize: 40, color: '#bdbdbd', mb: 1 }} />
                                            <Typography variant="body2" color="text.secondary">
                                                Click to select location from map
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                    Specific Requirements (Optional)
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Add a specific requirement"
                                        value={requirementInput}
                                        onChange={(e) => setRequirementInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddRequirement()}
                                    />
                                    <Button
                                        variant="outlined"
                                        onClick={handleAddRequirement}
                                        sx={{ borderColor: '#8CC342', color: '#8CC342' }}
                                    >
                                        Add
                                    </Button>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {formData.requirements?.map((req, index) => (
                                        <Chip
                                            key={index}
                                            label={req}
                                            onDelete={() => handleRemoveRequirement(index)}
                                            sx={{ bgcolor: '#e6f3d8' }}
                                        />
                                    ))}
                                </Box>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                    Tags (Optional)
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Add a tag"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                    />
                                    <Button
                                        variant="outlined"
                                        onClick={handleAddTag}
                                        sx={{ borderColor: '#8CC342', color: '#8CC342' }}
                                    >
                                        Add
                                    </Button>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {formData.tags?.map((tag) => (
                                        <Chip
                                            key={tag}
                                            label={tag}
                                            onDelete={() => handleRemoveTag(tag)}
                                            color="primary"
                                        />
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 3, px: 4, borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa', gap: 1.5 }}>
                    <Button 
                        onClick={handleClose} 
                        disabled={loading}
                        variant="outlined"
                        sx={{ 
                            textTransform: 'none',
                            borderColor: '#e0e0e0',
                            color: 'text.secondary',
                            px: 3,
                            '&:hover': {
                                borderColor: '#bdbdbd',
                                bgcolor: '#f5f5f5'
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    {activeStep > 0 && (
                        <Button 
                            onClick={handleBack} 
                            disabled={loading}
                            variant="outlined"
                            sx={{ 
                                textTransform: 'none',
                                borderColor: '#8CC342',
                                color: '#8CC342',
                                px: 3,
                                '&:hover': {
                                    borderColor: '#699e31',
                                    bgcolor: '#f1f8e9'
                                }
                            }}
                        >
                            Back
                        </Button>
                    )}
                    {activeStep < steps.length - 1 ? (
                        <Button
                            variant="contained"
                            onClick={handleNext}
                            disabled={!isStepValid() || loading}
                            sx={{ 
                                bgcolor: '#8CC342', 
                                '&:hover': { bgcolor: '#699e31' },
                                textTransform: 'none',
                                px: 4,
                                py: 1
                            }}
                        >
                            Next
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={!isStepValid() || loading}
                            sx={{ 
                                bgcolor: '#8CC342', 
                                '&:hover': { bgcolor: '#699e31' },
                                textTransform: 'none',
                                px: 4,
                                py: 1
                            }}
                        >
                            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : initialData ? 'Update Requirement' : 'Post Requirement'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Location Picker Dialog */}
            <Dialog
                open={locationPickerOpen}
                onClose={() => setLocationPickerOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, minHeight: '500px' } }}
            >
                <DialogTitle
                    sx={{
                        bgcolor: '#8CC342',
                        color: 'white',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 2.5,
                    }}
                >
                    <LocationIcon sx={{ fontSize: 28 }} />
                    Select Location
                </DialogTitle>
                <DialogContent sx={{ p: 4, minHeight: '400px' }}>
                    <GoogleMapsLocationPicker
                        onLocationSelect={handleLocationSelect}
                        label="Search for location"
                        placeholder="Enter location..."
                        country="IN"
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
                    <Button
                        onClick={() => setLocationPickerOpen(false)}
                        variant="outlined"
                        sx={{ borderColor: '#8CC342', color: '#8CC342' }}
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}


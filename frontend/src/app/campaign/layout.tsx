// app/campaign/layout.tsx
'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function CampaignLayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout>{children}</DashboardLayout>;
}


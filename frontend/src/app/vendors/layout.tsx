import { DashboardLayout } from '@/components/layout/DashboardLayout';
import React from 'react';

export default function VendorsLayout({
                                          children,
                                      }: {
    children: React.ReactNode;
}) {
    return <DashboardLayout>{children}</DashboardLayout>;
}


// app/settings/layout.tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReactNode } from 'react';

export default function SettingsLayout({ children }: { children: ReactNode }) {
    return <DashboardLayout>{children}</DashboardLayout>;
}


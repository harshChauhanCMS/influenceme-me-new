import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReactNode } from 'react';

export default function DealsLayout({ children }: { children: ReactNode }) {
    return <DashboardLayout>{children}</DashboardLayout>;
}

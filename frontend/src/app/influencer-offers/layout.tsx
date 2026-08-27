// app/offers/influencers/layout.tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReactNode } from 'react';

export default function OffersInfluencersLayout({ children }: { children: ReactNode }) {
    return <DashboardLayout>{children}</DashboardLayout>;
}


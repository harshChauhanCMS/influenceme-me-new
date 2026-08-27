import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function VendorOffersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout>{children}</DashboardLayout>;
}


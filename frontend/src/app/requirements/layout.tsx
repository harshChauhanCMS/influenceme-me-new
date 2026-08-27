import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function RequirementsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout>{children}</DashboardLayout>;
}


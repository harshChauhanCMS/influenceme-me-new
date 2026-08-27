'use client';

import { usePathname } from 'next/navigation';
import { FC, ReactNode } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface LayoutClientWrapperProps {
    children: ReactNode;
}

// Define routes where Header and Footer should NOT be shown
// Note: /calendarhome should show header and footer, so it's NOT in this list
const restrictedRoutes = ['/dashboard', '/campaign', '/payments', '/influencer-offers', '/offers/vendors', '/settings', '/chat', '/vendors', '/profile', '/requirements', '/vendor-offers', '/explore', '/calendar', '/notifications', '/deals'];

const LayoutClientWrapper: FC<LayoutClientWrapperProps> = ({ children }) => {
    const pathname = usePathname();

    // Check if the current path (or any sub-path, e.g., /dashboard/settings)
    // matches a restricted route. We check for exact match OR path starts with route + '/'
    // This prevents /calendarhome from matching /calendar
    const hideNav = restrictedRoutes.some(route => {
        // Exact match
        if (pathname === route) return true;
        // Sub-path match (e.g., /dashboard/settings matches /dashboard)
        if (pathname.startsWith(route + '/')) return true;
        return false;
    });

    return (
        <>
            {/* Conditionally render the Header */}
            {!hideNav && <Header />}

            {/* The main content area. This ensures the content fills the space
                regardless of whether the header/footer are present. */}
            <main className="flex-grow">{children}</main>

            {/* Conditionally render the Footer */}
            {!hideNav && <Footer />}
        </>
    );
};

export default LayoutClientWrapper;

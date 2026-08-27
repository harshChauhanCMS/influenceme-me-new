import type { Metadata } from "next";
import ThemeProvider from "../components/ThemeProvider";
// Header and Footer imports are now handled within LayoutClientWrapper
import LayoutClientWrapper from "./layout_wrapper";
import "./globals.css";
import { AuthProvider } from "@/context/authContext";
import { SocketProvider } from "@/context/socketContext";
import { NotificationCountProvider } from "@/context/notificationCountContext";

export const metadata: Metadata = {
    title: "InfluenceMe New - Influencer Marketing Platform",
    description: "Modern influencer marketing platform built with MERN stack and TypeScript",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        {/* The body class ensures the flex container spans the full viewport height */}
        <body className="antialiased flex flex-col min-h-screen">
        <ThemeProvider>
            <AuthProvider>
                <SocketProvider>
                    <NotificationCountProvider>
                        {/* Use the client wrapper to apply conditional Header/Footer rendering */}
                        <LayoutClientWrapper>
                            {children}
                        </LayoutClientWrapper>
                    </NotificationCountProvider>
                </SocketProvider>
            </AuthProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}

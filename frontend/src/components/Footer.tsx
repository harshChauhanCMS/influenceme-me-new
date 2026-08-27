import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Twitter, Linkedin, LucideIcon } from 'lucide-react';

// --- Type Definitions for better type safety ---

// Defines the shape of a navigation link object
interface NavLink {
    path: string;
    label: string;
}

// Defines the shape of a social media link object
interface SocialMediaLink {
    icon: LucideIcon; // Type for lucide-react icons
    label: string;
    url: string; // Added URL for actual navigation
}

// --- Component Definition ---

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    // Navigation configuration with types
    const navLinks: NavLink[] = [
        { path: '/home', label: 'Home' },
        { path: '/about', label: 'About Us' },
        { path: '/services', label: 'Services' },
        { path: '/terms', label: 'Terms & Conditions' },
        { path: '/policy', label: 'Privacy Polices' },
        { path: '/blog', label: 'Blog' },
        { path: '/faq', label: 'FAQ' },
    ];

    // Social media configuration with types and URLs
    const socialMedia: SocialMediaLink[] = [
        { icon: Facebook, label: 'Facebook', url: 'https://facebook.com' },
        { icon: Instagram, label: 'Instagram', url: 'https://instagram.com' },
        { icon: Twitter, label: 'Twitter', url: 'https://twitter.com' },
        { icon: Linkedin, label: 'LinkedIn', url: 'https://linkedin.com' },
    ];

    return (
        <footer className="bg-[#8CC342] text-white">
            <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col items-center">

                    {/* Logo - Using Next.js Image component for optimization */}
                    <div className="mb-4">
                        <Link href="/" aria-label="Home">
                            <Image
                                src="/logonew.png"
                                alt="InfluenceMe Logo"
                                width={150}
                                height={120}
                                style={{ objectFit: 'contain' }}
                                priority
                            />
                        </Link>
                    </div>

                    {/* Navigation - Using Next.js Link component */}
                    <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-8 text-xl">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                href={link.path}
                                className="hover:underline transition duration-150"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Social Icons */}
                    <div className="flex justify-center space-x-6 mb-3">
                        {socialMedia.map((social) => {
                            const Icon = social.icon;
                            return (
                                <a
                                    key={social.label}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.label}
                                    className="hover:opacity-80 transition-opacity"
                                >
                                    <Icon className="h-6 w-6" />
                                </a>
                            );
                        })}
                    </div>
                </div>

                {/* Divider and Copyright */}
                <div className="border-t border-white/40 pt-8 mt-8 text-center text-sm">
                    <p>&copy; {currentYear} INFUSEE - Redefining The Art Of Influencing</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

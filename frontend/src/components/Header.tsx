"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItemType {
    label: string;
    href: string;
}

const NAV_ITEMS: NavItemType[] = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "Contact Us", href: "/contact-us" },
    { label: "Calendar", href: "/calendarhome" },
    { label: "Blog", href: "/blog" },
];

const TRANSITION_CLASSES = "transition-all duration-500 ease-in-out";

const Header: React.FC = () => {
    const [mounted, setMounted] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => setMounted(true), []);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Manage body overflow
    useEffect(() => {
        document.body.style.overflow = isMenuOpen ? "hidden" : "auto";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isMenuOpen]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isMenuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                closeMenu();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMenuOpen]);

    // Close menu on route change
    useEffect(() => {
        closeMenu();
    }, [pathname]);

    const toggleMenu = useCallback(() => {
        if (isMenuOpen) {
            closeMenu();
        } else {
            setIsClosing(false);
            setIsMenuOpen(true);
        }
    }, [isMenuOpen]);

    const closeMenu = useCallback(() => {
        if (isMenuOpen) {
            setIsClosing(true);
            setTimeout(() => {
                setIsMenuOpen(false);
                setIsClosing(false);
            }, 400);
        }
    }, [isMenuOpen]);

    const handleNavigation = useCallback(
        (path: string) => {
            closeMenu();
            router.push(path);
        },
        [closeMenu, router]
    );

    // if (!mounted) {
    //     // Instead of returning null *before* hooks,
    //     // return the placeholder JSX *after* hooks are defined.
    //     return (
    //         <header className="opacity-0">
    //             {/* Optionally, an empty shell or loader */}
    //         </header>
    //     );
    // }

    const headerClasses = `
    w-full fixed top-0 left-0 z-50 transition-all duration-1000 ease-out
    ${isScrolled
        ? "bg-white/98 backdrop-blur-xl shadow-2xl border-b border-gray-200/60"
        : "bg-white/90 backdrop-blur-lg"
    }
  `;

    const NavItem: React.FC<{ item: NavItemType; isMobile?: boolean }> = ({ item, isMobile = false }) => {
        const isActive = pathname === item.href;
        const mobileClasses = `
      flex items-center px-4 py-4 rounded-xl text-xl font-medium
      ${isActive
            ? "text-purple-700 bg-purple-100/80 border-l-4 border-purple-500 shadow-sm"
            : "text-gray-700 hover:text-purple-700 hover:bg-gray-50/80 hover:shadow-sm"
        }
    `;

        const desktopClasses = `
      relative px-5 py-2.5 text-base font-bold rounded-xl group
      ${isActive
            ? "text-purple-700 bg-purple-100/80 shadow-sm"
            : "text-gray-700 hover:text-purple-700 hover:bg-gray-50/80 hover:shadow-sm"
        }
    `;

        return (
            <button
                onClick={() => handleNavigation(item.href)}
                className={isMobile ? mobileClasses : desktopClasses}
                aria-current={isActive ? "page" : undefined}
            >
                <span className="relative z-10">{item.label}</span>
                {!isMobile && (
                    <>
                        <div className={`absolute inset-0 rounded-xl ${isActive ? "bg-purple-100/60 shadow-sm" : "bg-transparent group-hover:bg-gray-50/60"}`} />
                        {isActive && (
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-purple-600 rounded-full animate-pulse" />
                        )}
                    </>
                )}
            </button>
        );
    };

    const CTAButton: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
        <button
            onClick={() => handleNavigation("/login")}
            className={`
        relative inline-flex items-center justify-center overflow-hidden font-semibold 
        text-purple-600 border-2 border-purple-500 rounded-full shadow-lg group
        hover:scale-105 hover:shadow-xl ${TRANSITION_CLASSES}
        ${isMobile ? "w-full px-6 py-3 text-lg" : "px-7 py-2.5 text-base"}
      `}
        >
      <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white
        duration-700 ease-out -translate-x-full bg-gradient-to-r from-purple-500 to-purple-600
        group-hover:translate-x-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </span>
            <span className="absolute flex items-center justify-center w-full h-full text-purple-600
        transition-all duration-700 ease-out transform group-hover:translate-x-full"
            >
        {isMobile ? "Sign In" : "Brand Sign In"}
      </span>
            <span className="relative invisible">{isMobile ? "Sign In" : "Brand Sign In"}</span>
        </button>
    );

    return (
        <header className={headerClasses}>
            <div className="flex items-center justify-between max-w-7xl mx-auto py-3 sm:py-3.5 px-4 sm:px-6">
                {/* Logo */}
                <Link href="/" aria-label="Home page">
                    <img src="/logonew.png" alt="Infusee Logo" className="h-14 sm:h-16 md:h-18 w-auto max-w-[240px] sm:max-w-[280px] px-1 object-contain transition-all" loading="lazy" />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-2" aria-label="Main navigation">
                    {NAV_ITEMS.map((item, index) => (
                        <NavItem key={`desktop-${index}`} item={item} />
                    ))}
                </nav>

                {/* Desktop CTA */}
                <div className="hidden lg:block">
                    <CTAButton />
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={toggleMenu}
                    className="lg:hidden relative w-10 h-10 flex flex-col items-center justify-center group z-50"
                    aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={isMenuOpen}
                    aria-controls="mobile-menu"
                >
          <span className={`absolute block w-6 h-0.5 bg-gray-700 rounded-full ${TRANSITION_CLASSES} ${
              isMenuOpen ? "rotate-45 translate-y-0" : "-translate-y-1.5"
          }`} />
                    <span className={`absolute block w-6 h-0.5 bg-gray-700 rounded-full ${TRANSITION_CLASSES} ${
                        isMenuOpen ? "opacity-0" : "opacity-100"
                    }`} />
                    <span className={`absolute block w-6 h-0.5 bg-gray-700 rounded-full ${TRANSITION_CLASSES} ${
                        isMenuOpen ? "-rotate-45 translate-y-0" : "translate-y-1.5"
                    }`} />
                </button>

                {/* Mobile Dropdown Menu */}
                {(isMenuOpen || isClosing) && (
                    <>
                        <div
                            className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-500 ${
                                isClosing ? "opacity-0 pointer-events-none" : "opacity-100"
                            }`}
                            onClick={closeMenu}
                            aria-hidden="true"
                        />
                        <div
                            ref={menuRef}
                            id="mobile-menu"
                            className={`fixed left-0 right-0 top-[100%] w-full rounded-b-2xl bg-white/98 shadow-2xl border-b border-gray-100 z-50 overflow-hidden transition-all duration-500 ${
                                isClosing ? "opacity-0 -translate-y-8 pointer-events-none" : "opacity-100 translate-y-0"
                            }`}
                        >
                            <nav className="flex flex-col py-6 px-6" aria-label="Mobile navigation">
                                {NAV_ITEMS.map((item, index) => (
                                    <NavItem key={`mobile-${index}`} item={item} isMobile />
                                ))}
                            </nav>
                            <div className="px-6 pb-6">
                                <CTAButton isMobile />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </header>
    );
};

export default React.memo(Header);

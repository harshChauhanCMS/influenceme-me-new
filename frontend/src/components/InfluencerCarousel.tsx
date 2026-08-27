'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Slider from 'react-slick';
import { IUser } from '../../../shared/types/user';
import userService from '@/services/userService';
import CircularCategoryIcons from './CircularCategoryIcons';
import { useRouter } from 'next/navigation';

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

interface InfluencerCarouselProps {}

interface CustomArrowProps {
    direction: 'prev' | 'next';
    onClick?: () => void;
}

const FILTER_OPTIONS = [
  "All",
  "Fashion",
  "Travel",
  "Food",
  "Beauty",
  "Fitness",
  "Tech",
  "Education",
  "Parenting",
  "Finance",
  "Gaming",
];

const SECONDARY_FILTER_OPTIONS = [
  "Instagram Followers",
  "Marital status",
  "Number of Kids",
  "Pets",
];

// Custom Arrow Components with responsive sizing
const CustomArrow: React.FC<CustomArrowProps> = ({ direction, onClick }) => {
    const isPrev = direction === 'prev';
    return (
        <button
            onClick={onClick}
            className={`absolute top-1/2 z-10 -translate-y-1/2 transform transition-opacity duration-300 hover:opacity-100 focus:outline-none ${
                isPrev ? "left-2 md:-left-10 lg:-left-12" : "right-2 md:-right-10 lg:-right-12"
            }`}
            aria-label={isPrev ? "Previous" : "Next"}
        >
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white/80 backdrop-blur-lg shadow-xl hover:shadow-2xl transition-all">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 md:h-5 md:w-5 text-indigo-600 ${isPrev ? "" : "rotate-180"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                    />
                </svg>
            </div>
        </button>
    );
};

// Optimized Influencer Card Component
const InfluencerCard = React.memo<{ influencer: IUser }>(({ influencer }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";
    const imageUrl = influencer.profilePictureUrl
        ? `${API_BASE_URL}${influencer.profilePictureUrl}`
        : `https://placehold.co/600x750/E2E8F0/4A5567?text=No+Image`;

    const totalFollowers = useMemo(() => {
        const followers = influencer.influencerInfo?.socialMedia?.reduce((sum, account) => sum + (account.followers || 0), 0) || 0;
        if (followers > 1000000) return `${(followers / 1000000).toFixed(1)}M`;
        if (followers > 1000) return `${(followers / 1000).toFixed(1)}K`;
        return followers.toString();
    }, [influencer.influencerInfo]);

    const category = influencer.influencerInfo?.influencerType || "Creator";

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateY = (x - centerX) / 20;
            const rotateX = (centerY - y) / 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
        };

        const handleMouseLeave = () => {
            card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
        };

        card.addEventListener("mousemove", handleMouseMove);
        card.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            card.removeEventListener("mousemove", handleMouseMove);
            card.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    return (
        <div className="mx-1 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 p-1 shadow-lg transition-all duration-300 hover:shadow-xl">
            <div
                ref={cardRef}
                className="h-full bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-300"
                style={{ transformStyle: "preserve-3d" }}
            >
                <div className="relative pb-[125%]">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100">
                        <img
                            src={imageUrl}
                            alt={influencer.name}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                            onError={(e) => {
                                const target = e.currentTarget;
                                target.onerror = null;
                                target.src = `https://placehold.co/600x750/E2E8F0/4A5567?text=Not+Found`;
                            }}
                        />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 sm:p-4">
                        <div className="flex items-end justify-between">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">{influencer.name}</h3>
                                <p className="mt-0.5 text-xs sm:text-sm text-gray-200">
                                    {totalFollowers} followers
                                </p>
                            </div>
                            <span className="rounded-full bg-indigo-600/90 px-2 py-1 text-[10px] sm:text-xs font-medium text-white backdrop-blur-sm">
                                {category}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
InfluencerCard.displayName = 'InfluencerCard';

// Main Carousel Component with responsive enhancements
const InfluencerCarousel: React.FC<InfluencerCarouselProps> = () => {
    const router = useRouter();
    const [topInfluencers, setTopInfluencers] = useState<IUser[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState("All");
    const [activeSecondaryFilter, setActiveSecondaryFilter] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch influencers from API
    useEffect(() => {
        const fetchInfluencers = async () => {
            try {
                const data = await userService.getTopInfluencers();
                setTopInfluencers(data);
            } catch (err) {
                setError('Failed to load influencers.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchInfluencers();
    }, []);

    const handleNavigateToSignin = () => {
        router.push('/signin');
    };

    const filteredInfluencers = useMemo(() => {
        // For now, return all influencers. You can add filtering logic here based on activeFilter
        return topInfluencers;
    }, [topInfluencers, activeFilter, activeSecondaryFilter]);

    const carouselSettings = {
        dots: true,
        infinite: filteredInfluencers.length > 3,
        speed: 500,
        slidesToShow: 4,
        slidesToScroll: 1,
        prevArrow: <CustomArrow direction="prev" />,
        nextArrow: <CustomArrow direction="next" />,
        autoplay: true,
        autoplaySpeed: 2000,
        cssEase: "linear",
        className: "hide-scrollbar",
        responsive: [
            { 
                breakpoint: 1280, 
                settings: { 
                    slidesToShow: 3, 
                    arrows: true 
                } 
            },
            { 
                breakpoint: 1024, 
                settings: { 
                    slidesToShow: 2, 
                    arrows: true 
                } 
            },
            {
                breakpoint: 768,
                settings: { 
                    slidesToShow: 1, 
                    arrows: false, 
                    dots: true,
                    centerMode: true,
                    centerPadding: '40px'
                },
            },
            {
                breakpoint: 480,
                settings: { 
                    slidesToShow: 1, 
                    arrows: false, 
                    dots: true,
                    centerMode: true,
                    centerPadding: '20px'
                },
            }
        ],
    };

    // Secondary filter icon components
    const getSecondaryIcon = (category: string) => {
        const iconClass = "w-3 h-3 md:w-4 md:h-4";
        switch (category) {
            case "Instagram Followers":
                return (
                    <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                );
            case "Marital status":
                return (
                    <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd"/>
                    </svg>
                );
            case "Number of Kids":
                return (
                    <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                );
            case "Pets":
                return (
                    <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <section className="relative py-12 md:py-20 overflow-hidden">
                <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8 relative">
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        <p className="mt-4 text-gray-600">Loading Top Influencers...</p>
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="relative py-12 md:py-20 overflow-hidden">
                <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8 relative">
                    <div className="text-center py-20 text-red-500">{error}</div>
                </div>
            </section>
        );
    }

    return (
        <section className="relative py-12 md:py-20 overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50"></div>
                <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full bg-purple-200/20 blur-[100px] animate-float"></div>
                <div
                    className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-indigo-200/20 blur-[100px] animate-float"
                    style={{ animationDelay: "2s" }}
                ></div>
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8 relative">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl md:text-3xl font-bold mb-3">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                            Industry Specific Influencers
                        </span>
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
                        Discover top creators across various niches tailored to your brand
                    </p>
                </div>

                {/* Circular Category Icons Section */}
                <div className="hidden sm:block">
                    <CircularCategoryIcons />
                </div>

                {/* Filter controls with responsive layout */}
                <div className="mb-8 mt-6 flex flex-col sm:flex-row flex-wrap justify-center gap-3 items-center min-h-[40px] relative mx-auto max-w-4xl">
                    <div className="hidden sm:flex flex-wrap gap-2 items-center justify-center w-full sm:w-auto">
                        <button
                            onClick={handleNavigateToSignin}
                            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1.5 font-bold shadow-md hover:from-green-600 hover:to-emerald-600 transition-all duration-200 text-sm min-w-fit h-9"
                        >
                            Try Us
                        </button>
                        {SECONDARY_FILTER_OPTIONS.map((filter) => (
                            <button
                                key={filter}
                                onClick={handleNavigateToSignin}
                                className={`
                                    flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium min-w-fit h-10
                                    transition-all duration-200 shadow-md
                                    ${activeSecondaryFilter === filter
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                                        : "bg-white text-gray-800 hover:bg-gray-100 border border-gray-200"}
                                `}
                            >
                                {getSecondaryIcon(filter)}
                                <span>{filter}</span>
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="block sm:hidden flex items-center gap-2 rounded-full bg-indigo-600 text-white px-6 py-2.5 text-base font-medium shadow-lg hover:bg-indigo-700 transition-all duration-200 mt-3"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        More Filters
                    </button>
                </div>

                {/* Carousel with responsive settings */}
                {filteredInfluencers.length > 0 ? (
                    <div className="relative pb-12 px-1 sm:px-2">
                        <Slider {...carouselSettings}>
                            {filteredInfluencers.map((influencer) => (
                                <div key={influencer._id} className="px-1.5 sm:px-2 py-1">
                                    <InfluencerCard influencer={influencer} />
                                </div>
                            ))}
                        </Slider>
                    </div>
                ) : (
                    <p className="text-center text-gray-600 py-12">No influencers found at the moment.</p>
                )}
            </div>

            {/* Filter Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-md mx-4 relative animate-slide-up border border-white/30">
                        <button
                            className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-xl font-bold focus:outline-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                            onClick={() => setIsModalOpen(false)}
                            aria-label="Close"
                        >
                            &times;
                        </button>
                        <h2 className="text-xl md:text-2xl font-bold mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                            Explore All Filters
                        </h2>
                        <div className="mb-5">
                            <h3 className="text-sm font-semibold mb-3 text-gray-700 pl-1">
                                Categories
                            </h3>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {FILTER_OPTIONS
                                    .filter((f) => f !== "All")
                                    .map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={handleNavigateToSignin}
                                            className={`
                                                rounded-full px-3 py-1.5 text-sm font-medium
                                                transition-all duration-200 shadow-sm
                                                ${activeFilter === filter
                                                    ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md"
                                                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"}
                                            `}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold mb-3 text-gray-700 pl-1">
                                Other Filters
                            </h3>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {SECONDARY_FILTER_OPTIONS.map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={handleNavigateToSignin}
                                        className={`
                                            flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium
                                            transition-all duration-200 shadow-sm
                                            ${activeSecondaryFilter === filter
                                                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                                                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"}
                                        `}
                                    >
                                        {getSecondaryIcon(filter)}
                                        <span>{filter}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </section>
    );
};

export default InfluencerCarousel;

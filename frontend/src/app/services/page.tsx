import React, {FC, JSX} from 'react';
// The main component remains a Server Component for SSR performance.
// We import the client-side carousel now.
import HowWeWorksClient from '@/components/HowWeWorksClient';

// Removed: dynamic, Settings, slick CSS, VideoItem, videos, ClientOnlySlider, and HowWeWorksSection

// --- Interfaces ---

/** Defines the structure for a single feature card. */
interface CardItem {
    title: string;
    description: string;
    // Icon is a React component/element
    icon: JSX.Element;
    color: string;
    gradient: string;
}

// --- Static Data ---

const cards: CardItem[] = [
    {
        title: 'Direct Collaboration Tools',
        description: 'Smart matching and integrated tools for seamless brand-creator partnerships.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="#8CC342" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
        color: 'bg-green-100',
        gradient: 'from-green-50'
    },
    {
        title: 'Campaign Management',
        description: 'Track campaigns with real-time updates and organized workflows.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
        color: 'bg-amber-100',
        gradient: 'from-amber-50'
    },
    {
        title: 'Seamless Communication',
        description: 'In-platform chat and notifications for clear, timely collaboration.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
        ),
        color: 'bg-emerald-100',
        gradient: 'from-emerald-50'
    },
    {
        title: 'Secure Payments & Contracts',
        description: 'Built-in contracts and secure payments for peace of mind.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        ),
        color: 'bg-red-100',
        gradient: 'from-red-50'
    },
    {
        title: 'Analytics & Insights',
        description: 'Showcase and measure campaign performance with precision.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="#7C3AED" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        color: 'bg-violet-100',
        gradient: 'from-violet-50'
    },
    {
        title: 'Global Discovery Network',
        description: 'Connect globally with advanced filters for perfect matches.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="#0891B2" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        color: 'bg-cyan-100',
        gradient: 'from-cyan-50'
    },
];


// --- Sub-Components (Internal to the file) ---

/** Section containing the feature cards (HCards) - Remains a Server Component */
const HCardsSection: FC = () => {
    // Logic to ensure at least two cards are displayed for layout integrity
    const filteredCards = cards;
    let displayCards: CardItem[] = filteredCards;

    if (filteredCards.length === 1) {
        const extraCard = cards.find((c: CardItem) => c.title !== filteredCards[0].title);
        if (extraCard) {
            displayCards = [filteredCards[0], extraCard];
        }
    }

    return (
        <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        All the Tools You Need
                    </h2>
                    <p className="mt-4 text-xl text-gray-500">
                        A comprehensive platform built for growth and collaboration.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {displayCards.map((card: CardItem) => (
                        <div
                            key={card.title}
                            className="bg-white rounded-2xl p-6 transition-all duration-500 border border-gray-100 group overflow-hidden relative shadow-lg hover:shadow-2xl hover:-translate-y-2 transform hover:border-indigo-200 cursor-pointer"
                        >
                            {/* Animated gradient background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`}></div>

                            <div className="flex items-start">
                                <div className={`flex-shrink-0 mr-5 ${card.color} p-4 rounded-xl shadow-lg`}>
                                    {card.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-gray-900 mb-2">{card.title}</h3>
                                    <p className="text-gray-600 leading-relaxed text-sm">{card.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// --- Main Exported Component: Services (Server Component) ---

const Services: FC = () => {
    return (
        // Added pt-20 to push the content down below the fixed header component
        <div className="min-h-screen pt-20">
            {/* Renders the client-only carousel, which loads only on the client */}
            <HowWeWorksClient />
            {/* Renders the static cards, fully rendered on the server */}
            <HCardsSection />
        </div>
    );
};

export default Services;
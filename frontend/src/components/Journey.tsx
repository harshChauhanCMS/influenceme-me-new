"use client";

import React, { useState } from "react";
import {
    User,
    Building2,
    Wrench,
    MessageCircle,
    Star,
    ArrowRight,
    RotateCcw,
    LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Define type for Card
interface Card {
    title: string;
    icon: LucideIcon;
    image: string;
    description: string;
    gradient: string;
    bgGradient: string;
}

const cards: Card[] = [
    {
        title: "I am an influencer/Creator",
        icon: User,
        image: '/videos/influ.webm',
        description:
            "Join a platform designed to put creators first. Get discovered by top brands, receive clear campaign briefs, enjoy timely payments, and grow your reach — all without agencies or intermediaries. Your creativity, your terms.",
        gradient: "from-indigo-500 to-blue-500",
        bgGradient: "from-indigo-700 to-blue-700",
    },
    {
        title: "I am a Brand",
        icon: Building2,
        image: '/videos/brand.webm',
        description:
            "Discover and collaborate directly with fresh, verified content creators across India. Launch campaigns effortlessly, manage deliverables with clarity, and access real-time performance insights — no agency fees, no middlemen, just results.",
        gradient: "from-teal-500 to-cyan-500",
        bgGradient: "from-teal-700 to-cyan-700",
    },
    {
        title: "I am a vendor",
        icon: Wrench,
        image: '/videos/vendor.webm',
        description:
            "Join our ecosystem as a trusted service provider — from photographers and editors to stylists and event managers. Collaborate with influencers and brands on exciting campaigns and grow your business with visibility across India.",
        gradient: "from-amber-500 to-orange-500",
        bgGradient: "from-amber-700 to-orange-700",
    },
    {
        title: "Influencer feedback",
        icon: MessageCircle,
        image: '/videos/influfeed.webm',
        description:
            "Your voice matters. Share your campaign experiences, rate brand interactions, and help us improve platform quality and transparency for all creators.",
        gradient: "from-violet-500 to-purple-500",
        bgGradient: "from-violet-700 to-purple-700",
    },
    {
        title: "Brand feedback",
        icon: Star,
        image: '/videos/brandfeed.webm',
        description:
            "Tell us how your campaign went. Share insights on influencer performance, content quality, and overall experience to help us maintain high standards across the platform.",
        gradient: "from-emerald-500 to-green-500",
        bgGradient: "from-emerald-700 to-green-700",
    },
];

// Sample reviews data
const sampleReviews = [
    {
        name: 'Aria Bennett',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        review: 'Great platform! I connected with amazing brands and the process was super smooth. Highly recommend to fellow creators.'
    },
    {
        name: 'Marcus Chen',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        review: 'The campaign briefs are clear and payments are always on time. Love the transparency and support.'
    },
    {
        name: 'Sophie Laurent',
        avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
        review: 'I appreciate the feedback system and the opportunity to work with top brands. The platform is easy to use.'
    },
    {
        name: 'Jamal Williams',
        avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
        review: 'No middlemen, just real connections. My experience has been fantastic so far!'
    },
    {
        name: 'Elena Petrova',
        avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
        review: 'The best influencer platform in India. I love the real-time insights and the supportive community.'
    }
];

const brandReviews = [
    {
        name: 'Acme Corp',
        avatar: 'https://randomuser.me/api/portraits/men/12.jpg',
        review: 'We found the perfect creators for our campaign. The process was seamless and the results exceeded expectations!'
    },
    {
        name: 'Glow Beauty',
        avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
        review: 'Loved the transparency and the quality of content delivered by the influencers. Highly recommended platform.'
    },
    {
        name: 'TravelX',
        avatar: 'https://randomuser.me/api/portraits/men/23.jpg',
        review: 'The platform made it easy to manage deliverables and track performance. We will definitely use it again.'
    },
    {
        name: 'EduPrime',
        avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
        review: 'Great support and a wide range of creators. Our campaign was a big success!'
    }
];

// iOS App Modal Component
interface IOSAppModalProps {
    open: boolean;
    onClose: () => void;
}

const IOSAppModal: React.FC<IOSAppModalProps> = ({ open, onClose }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-xs w-full relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ×
                </button>
                <div className="mb-4 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-3">
                        <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M17.564 13.06c-.02-2.14 1.75-3.16 1.83-3.21-1-1.46-2.56-1.66-3.11-1.68-1.32-.13-2.58.77-3.25.77-.67 0-1.7-.75-2.8-.73-1.44.02-2.77.84-3.51 2.13-1.5 2.6-.38 6.45 1.07 8.56.71 1.03 1.56 2.18 2.68 2.14 1.08-.04 1.49-.69 2.8-.69 1.31 0 1.68.69 2.81.67 1.16-.02 1.89-1.05 2.59-2.08.82-1.19 1.16-2.34 1.18-2.4-.03-.01-2.26-.87-2.28-3.45zM15.36 5.98c.59-.72.99-1.72.88-2.73-.85.03-1.88.57-2.5 1.29-.55.64-1.03 1.67-.85 2.65.9.07 1.83-.46 2.47-1.21z" fill="#fff"/></svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Download our iOS App</h2>
                    <p className="text-gray-600 text-center text-sm mb-4">Get the best experience on your iPhone. Download our app from the App Store now!</p>
                    <a
                        href="#"
                        className="inline-block bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold px-5 py-2 rounded-lg shadow hover:from-blue-600 hover:to-indigo-600 transition"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Download iOS App
                    </a>
                </div>
            </div>
        </div>
    );
};

// Influencer Feedback Carousel Modal
interface InfluencerFeedbackCarouselModalProps {
    open: boolean;
    onClose: () => void;
}

const InfluencerFeedbackCarouselModal: React.FC<InfluencerFeedbackCarouselModalProps> = ({ open, onClose }) => {
    const [current, setCurrent] = useState(0);
    if (!open) return null;
    const prev = () => setCurrent(c => (c === 0 ? sampleReviews.length - 1 : c - 1));
    const next = () => setCurrent(c => (c === sampleReviews.length - 1 ? 0 : c + 1));
    const review = sampleReviews[current];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ×
                </button>
                <h2 className="text-lg font-bold text-gray-900 mb-6">Influencer Reviews</h2>
                <div className="flex flex-row items-center w-full gap-8">
                    <div className="flex-1">
                        <p className="text-gray-700 text-lg mb-4 font-medium leading-relaxed">"{review.review}"</p>
                        <span className="block text-base font-semibold text-indigo-600">- {review.name}</span>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-center justify-center">
                        <img src={review.avatar} alt={review.name} className="w-24 h-24 rounded-xl object-cover border-4 border-indigo-100 shadow" />
                    </div>
                </div>
                <div className="flex justify-between items-center w-full mt-8">
                    <button onClick={prev} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-xl">&#8592;</button>
                    <span className="text-xs text-gray-400">{current + 1} / {sampleReviews.length}</span>
                    <button onClick={next} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-xl">&#8594;</button>
                </div>
            </div>
        </div>
    );
};

// Brand Feedback Carousel Modal
interface BrandFeedbackCarouselModalProps {
    open: boolean;
    onClose: () => void;
}

const BrandFeedbackCarouselModal: React.FC<BrandFeedbackCarouselModalProps> = ({ open, onClose }) => {
    const [current, setCurrent] = useState(0);
    if (!open) return null;
    const prev = () => setCurrent(c => (c === 0 ? brandReviews.length - 1 : c - 1));
    const next = () => setCurrent(c => (c === brandReviews.length - 1 ? 0 : c + 1));
    const review = brandReviews[current];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ×
                </button>
                <h2 className="text-lg font-bold text-gray-900 mb-6">Brand Reviews</h2>
                <div className="flex flex-row items-center w-full gap-8">
                    <div className="flex-1">
                        <p className="text-gray-700 text-lg mb-4 font-medium leading-relaxed">"{review.review}"</p>
                        <span className="block text-base font-semibold text-green-700">- {review.name}</span>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-center justify-center">
                        <img src={review.avatar} alt={review.name} className="w-24 h-24 rounded-xl object-cover border-4 border-green-100 shadow" />
                    </div>
                </div>
                <div className="flex justify-between items-center w-full mt-8">
                    <button onClick={prev} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-xl">&#8592;</button>
                    <span className="text-xs text-gray-400">{current + 1} / {brandReviews.length}</span>
                    <button onClick={next} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-xl">&#8594;</button>
                </div>
            </div>
        </div>
    );
};

// FlipCard props
interface FlipCardProps {
    card: Card;
    index: number;
    onGetStarted: () => void;
}

const FlipCard: React.FC<FlipCardProps> = ({ card, index, onGetStarted }) => {
    const [flipped, setFlipped] = useState(false);
    const IconComponent = card.icon;

    return (
        <div
            key={index}
            className="group w-80 h-[380px] perspective-1000 cursor-pointer"
            // Mobile ke liye click
            onClick={() => setFlipped(!flipped)}
            // Desktop ke liye hover
            onMouseEnter={() => setFlipped(true)}
            onMouseLeave={() => setFlipped(false)}
        >
            <div
                className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                    flipped ? "rotate-y-180" : ""
                }`}
            >
                {/* Card Front */}
                <div className="absolute w-full h-full backface-hidden bg-white rounded-xl shadow-lg p-6 flex flex-col overflow-hidden border border-gray-100">
                    <div
                        className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${card.gradient}`}
                    ></div>

                    <div className="flex-shrink-0 h-52 mb-5 flex items-center justify-center">
                        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-md">
                            <video
                                src={card.image}
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                    </div>

                    <div className="text-center flex-grow flex items-center justify-center">
                        <h3 className="text-xl font-bold text-gray-800 leading-tight">
                            {card.title}
                        </h3>
                    </div>

                    <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                        <RotateCcw className="w-4 h-4 text-gray-500 group-hover:text-indigo-600" />
                    </div>
                </div>

                {/* Card Back */}
                <div
                    className={`absolute w-full h-full backface-hidden bg-gradient-to-br ${card.bgGradient} rounded-xl shadow-xl p-6 flex flex-col justify-center items-center overflow-hidden rotate-y-180`}
                >
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                                <IconComponent className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">
                                {card.title}
                            </h3>
                        </div>

                        <p className="text-white/90 text-sm leading-relaxed mb-6">
                            {card.description}
                        </p>

                        <div
                            className="px-4 py-2.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 flex items-center justify-center space-x-2 transition-all hover:bg-white/30 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                onGetStarted();
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onGetStarted();
                                }
                            }}
                        >
                            <span className="text-white text-sm font-medium">Get Started</span>
                            <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Flip animation helpers */}
            <style jsx global>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .transform-style-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>
        </div>
    );
};

const Journey: React.FC = () => {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showBrandFeedbackModal, setShowBrandFeedbackModal] = useState(false);

    // Handler functions for different card types
    const handleGetStartedInfluencer = () => {
        setShowModal(true);
        setShowFeedbackModal(false);
        setShowBrandFeedbackModal(false);
    };

    const handleGetStartedBrand = () => {
        setShowModal(false);
        setShowFeedbackModal(false);
        setShowBrandFeedbackModal(false);
        router.push('/login');
    };

    const handleGetStartedVendor = () => {
        setShowModal(true);
        setShowFeedbackModal(false);
        setShowBrandFeedbackModal(false);
    };

    const handleGetStartedInfluencerFeedback = () => {
        setShowModal(false);
        setShowFeedbackModal(true);
        setShowBrandFeedbackModal(false);
    };

    const handleGetStartedBrandFeedback = () => {
        setShowModal(false);
        setShowFeedbackModal(false);
        setShowBrandFeedbackModal(true);
    };

    const handleCloseModal = () => setShowModal(false);
    const handleCloseFeedbackModal = () => setShowFeedbackModal(false);
    const handleCloseBrandFeedbackModal = () => setShowBrandFeedbackModal(false);

    // Map each card to its handler
    const getHandler = (title: string) => {
        if (title === 'I am an influencer/Creator') return handleGetStartedInfluencer;
        if (title === 'I am a Brand') return handleGetStartedBrand;
        if (title === 'I am a vendor') return handleGetStartedVendor;
        if (title === 'Influencer feedback') return handleGetStartedInfluencerFeedback;
        if (title === 'Brand feedback') return handleGetStartedBrandFeedback;
        return () => {};
    };

    return (
        <div className="w-full flex flex-col items-center bg-gradient-to-b from-gray-50 to-white py-20 px-4 sm:px-6 relative">
            <div className="max-w-7xl w-full relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-2xl md:text-4xl font-bold mb-4 text-gray-900">
                        Empower Your Creative Journey
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Join India&#39;s fastest-growing influencer marketing platform
                    </p>
                </div>

                <div className="relative w-full min-h-[650px] bg-gradient-to-br from-[#F0F7FF] to-[#F8FBFF] rounded-3xl px-6 sm:px-8 py-14 flex flex-col items-center overflow-hidden shadow-xl">
                    {/* Background circles */}
                    <div className="absolute left-[-120px] bottom-[-80px] w-[350px] h-[350px] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-60"></div>
                    <div className="absolute right-[-80px] top-[-80px] w-[270px] h-[270px] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-60"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border-2 border-indigo-100 rounded-3xl opacity-30"></div>

                    {/* Cards */}
                    <div className="relative z-10 w-full flex flex-col items-center">
                        <div className="flex flex-wrap justify-center gap-8 mb-10">
                            {cards.slice(0, 3).map((card, index) => (
                                <FlipCard card={card} key={card.title} index={index} onGetStarted={getHandler(card.title)} />
                            ))}
                        </div>
                        <div className="flex flex-wrap justify-center gap-8">
                            {cards.slice(3).map((card, index) => (
                                <FlipCard card={card} key={card.title} index={index} onGetStarted={getHandler(card.title)} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <IOSAppModal open={showModal} onClose={handleCloseModal} />
            <InfluencerFeedbackCarouselModal open={showFeedbackModal} onClose={handleCloseFeedbackModal} />
            <BrandFeedbackCarouselModal open={showBrandFeedbackModal} onClose={handleCloseBrandFeedbackModal} />
        </div>
    );
};

export default Journey;
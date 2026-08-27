'use client';

import { useState, useEffect, useRef } from 'react';

// ---------- TYPES ----------
type CarouselDirection = 'up' | 'down';

interface VerticalCarouselProps {
    images: string[];
    direction?: CarouselDirection;
    duration?: number;
    className?: string;
}

// ---------- CONSTANTS ----------
const CAROUSEL_DIRECTIONS = {
    UP: 'up' as CarouselDirection,
    DOWN: 'down' as CarouselDirection,
};

const IMAGE_COLLECTIONS = {
    TOP: [
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&q=60&w=200',
        'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&q=60&w=200',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&q=60&w=200',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&q=60&w=200',
    ],
    BOTTOM: [
        'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&q=60&w=200',
        'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&q=60&w=200',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&q=60&w=200',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&q=60&w=200',
    ],
};

const BRAND_COLORS = {
    PRIMARY: '#452C80',
    SECONDARY: '#000000',
    ACCENT: '#8CC342',
};

// ---------- COMPONENT: VerticalCarousel ----------
function VerticalCarousel({
                              images,
                              direction = CAROUSEL_DIRECTIONS.DOWN,
                              duration = 24000,
                              className = '',
                          }: VerticalCarouselProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);
    const startTimeRef = useRef<number | undefined>(undefined);

    const itemCount = images.length;
    const ITEM_HEIGHT = 260;
    const GAP = 20;
    const oneSetHeight = itemCount * ITEM_HEIGHT + (itemCount - 1) * GAP;

    const duplicatedImages = [...images, ...images];

    useEffect(() => {
        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const elapsed = timestamp - startTimeRef.current;
            const progress = elapsed % duration;

            const translateY =
                direction === CAROUSEL_DIRECTIONS.DOWN
                    ? -(progress / duration) * oneSetHeight
                    : -oneSetHeight + (progress / duration) * oneSetHeight;

            if (containerRef.current) {
                containerRef.current.style.transform = `translate3d(0, ${translateY}px, 0)`;
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [direction, duration, oneSetHeight]);

    return (
        <div
            className={`overflow-hidden relative mt-15 rounded-xl ${className}`}
            style={{
                height: 540,
                width: 200,
                willChange: 'transform',
                perspective: '1000px',
                transform: 'translateZ(0)',
            }}
        >
            <div
                ref={containerRef}
                className="flex flex-col absolute w-full"
                style={{
                    gap: GAP,
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                }}
            >
                {duplicatedImages.map((img, index) => (
                    <div
                        key={`${img}-${index}`}
                        className="rounded-xl overflow-hidden flex-shrink-0"
                        style={{ height: ITEM_HEIGHT, transform: 'translateZ(0)' }}
                    >
                        <img
                            src={img}
                            alt={`Carousel image ${index + 1}`}
                            width={200}
                            height={260}
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------- COMPONENT: AboutUs ----------
export default function AboutUs() {
    const [isVisible, setIsVisible] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return; // SSR-safe
        const preloadImages = [...IMAGE_COLLECTIONS.TOP, ...IMAGE_COLLECTIONS.BOTTOM];
        preloadImages.forEach((src) => {
            const img = new window.Image(0, 0);
            img.src = src;
        });
        // Trigger animation after a small delay
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const marketingContent = [
        {
            id: 'heading',
            type: 'heading' as const,
            content: (
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                    <span className="text-brand-purple">Welcome to Infusee</span>
                    <span className="text-black font-normal block mt-2">
            — where influencers, brands, and vendors unite
          </span>
                </h2>
            ),
        },
        {
            id: 'para1',
            content:
                "We're a vibrant, forward-thinking team of experienced entrepreneurs with a bold vision: to create a seamless platform that empowers influencers and businesses—hospitality, lifestyle, health & wellness, beauty, fashion and more—to easily find and build powerful partnerships.",
        },
        {
            id: 'para2',
            content:
                'At Infusee, we believe in the power of purposeful collaboration. Our platform bridges the gap between influencers and brands, simplifying the process of discovering the right partners for impactful campaigns.',
        },
    ];

    return (
        <section className="max-w-7xl mx-auto flex justify-center items-center bg-white py-20 px-4 sm:px-6 lg:px-8 font-[Josefin_Sans]">
            <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-14">
                {/* Carousel Gallery */}
                <div className="flex gap-7">
                    <VerticalCarousel images={IMAGE_COLLECTIONS.TOP} direction="down" />
                    <VerticalCarousel images={IMAGE_COLLECTIONS.BOTTOM} direction="up" className="mt-14" />
                </div>

                {/* Text Content */}
                <div className="flex-1 max-w-3xl">
                    <div
                        ref={contentRef}
                        className="bg-gradient-to-r from-purple-50 to-white p-8 rounded-2xl shadow-sm transition-all duration-700"
                        style={{
                            transform: isVisible ? 'none' : 'translateY(20px)',
                            opacity: isVisible ? 1 : 0,
                        }}
                    >
                        {marketingContent.map((item) => (
                            <div key={item.id} className="mb-6 last:mb-0">
                                {item.type === 'heading' ? (
                                    item.content
                                ) : (
                                    <p className="text-lg text-gray-700 leading-relaxed">{item.content}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
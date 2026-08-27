"use client";

import React, { useState, useRef, useEffect } from "react";
import Image, { StaticImageData } from "next/image";

import Img1 from "../assets/influencers/campain.webp";
import Img2 from "../assets/influencers/clear.webp";
import Img3 from "../assets/influencers/fresh.webp";
import Img4 from "../assets/influencers/report.webp";
import Img5 from "../assets/influencers/tax.webp";
import Img6 from "../assets/influencers/goals.webp";
import Img7 from "../assets/influencers/pay.webp";
import Img8 from "../assets/influencers/travel.webp";
import Img9 from "../assets/influencers/fair.webp";
import Img10 from "../assets/influencers/brand.webp";

// Types
interface Feature {
    image: StaticImageData;
    title: string;
    description: string;
}

interface SectionData {
    title: string;
    features: Feature[];
    gradient: string;
}

const FEATURE_DATA: Record<string, SectionData> = {
    brand: {
        title: "For Brands",
        features: [
            {
                image: Img1,
                title: "Creator Access",
                description:
                    "Whether you're an agency or brand, our platform connects you with verified influencers—saving time, reducing miscommunication, and ensuring clear deliverables.",
            },
            {
                image: Img2,
                title: "Clear Scope",
                description:
                    "Clearly defined scope—posts, formats, deadlines, and platform needs.",
            },
            {
                image: Img3,
                title: "Fresh Content",
                description:
                    "We do not recycle campaign ideas or briefs from a common pool. We champion creative flexibility to deliver authentic, original content that brings fresh perspective.",
            },
            {
                image: Img4,
                title: "Campaign Tracker",
                description:
                    "Track campaign performance in real time with a centralized dashboard—every step, from submissions to approvals, is logged for full visibility.",
            },
            {
                image: Img5,
                title: "Tax Invoices",
                description:
                    "Ensure financial clarity with GST-compliant invoices—simplifying accounting and enabling easy input tax credit claims.",
            },
        ],
        gradient: "from-purple-600 to-indigo-500",
    },
    influencer: {
        title: "For Influencers",
        features: [
            {
                image: Img6,
                title: "Clear Goals",
                description:
                    "No more guesswork—Influence-Me provides clear, detailed briefs with content formats, schedules, platform guidelines, and brand expectations.",
            },
            {
                image: Img7,
                title: "On-Time Pay",
                description:
                    "Creators get paid on time—automated tracking ensures fast, hassle-free payments after campaign approval.",
            },
            {
                image: Img8,
                title: "Travel Planner",
                description:
                    "Sync travel plans with campaigns via the built-in calendar—creators mark availability, brands schedule smarter.",
            },
            {
                image: Img9,
                title: "Fair Pay",
                description:
                    "Campaign offers are fairly priced—based on market rates, audience, and content quality—ensuring creators aren’t underpaid or exploited.",
            },
            {
                image: Img10,
                title: "Brand Access",
                description:
                    "Get early access to campaigns and launch new products with top brands on Influence-Me.",
            },
        ],
        gradient: "from-indigo-500 to-purple-600",
    },
};

// Feature Card
interface FeatureCardProps {
    feature: Feature;
    gradient: string;
    index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, gradient, index }) => {
    const [isHovered, setIsHovered] = useState(false);
    const cardRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!cardRef.current) return;

        const handleMouseMove = (e: MouseEvent) => {
            const card = cardRef.current;
            if (!card) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateY = (x - centerX) / 20;
            const rotateX = (centerY - y) / 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
        };

        const handleMouseLeave = () => {
            if (cardRef.current) {
                cardRef.current.style.transform =
                    "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
            }
        };

        if (isHovered) {
            cardRef.current.addEventListener("mousemove", handleMouseMove);
            cardRef.current.addEventListener("mouseleave", handleMouseLeave);
        }

        return () => {
            if (cardRef.current) {
                cardRef.current.removeEventListener("mousemove", handleMouseMove);
                cardRef.current.removeEventListener("mouseleave", handleMouseLeave);
            }
        };
    }, [isHovered]);

    return (
        <div
            className="group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                ref={cardRef}
                className="h-full flex flex-col items-center bg-white/90 backdrop-blur-sm rounded-2xl p-2 shadow-[0_8px_32px_rgba(91,60,196,0.08)] hover:shadow-[0_20px_40px_rgba(91,60,196,0.15)] transition-all duration-300 border border-white/70"
                style={{
                    transformStyle: "preserve-3d",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
            >
                <div
                    className={`mb-4 rounded-xl bg-gradient-to-br ${gradient} shadow-lg flex justify-center overflow-hidden`}
                >
                    <Image
                        src={feature.image}
                        alt={feature.title}
                        className="w-20 h-20 object-contain rounded-xl transition-transform duration-500 group-hover:scale-110"
                        loading={index === 0 ? "eager" : "lazy"}
                    />
                </div>
                <h3 className="text-lg font-bold text-gray-800 text-center h-[2.5rem] flex items-center justify-center">
                    {feature.title}
                </h3>

                {/* Tooltip */}
                <div
                    className={`absolute left-1/2 -translate-x-1/2 -top-8 z-20 w-72 max-w-xs bg-white/90 text-black text-[14px] rounded-lg px-4 py-3 shadow-xl backdrop-blur-lg transition-all duration-300 ${
                        isHovered
                            ? "opacity-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 translate-y-2 pointer-events-none"
                    }`}
                >
                    {feature.description}
                    <div className="absolute left-1/2 -bottom-1.5 w-4 h-4 bg-white/90 transform -translate-x-1/2 rotate-45 backdrop-blur-lg" />
                </div>
            </div>

            {/* Glow */}
            <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 -z-10 blur-xl transition-all duration-500 ${
                    isHovered ? "opacity-40" : ""
                }`}
            />
        </div>
    );
};

// Section
interface FeatureSectionProps {
    title: string;
    features: Feature[];
    gradient: string;
}

const FeatureSection: React.FC<FeatureSectionProps> = ({
                                                           title,
                                                           features,
                                                           gradient,
                                                       }) => (
    <div className="mb-20 last:mb-0">
        <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">
                {title}
            </h2>
            <div className="mt-2 h-1 w-24 mx-auto bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" />
        </div>
        <div className="grid grid-cols-1 text-black sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {features.map((feature, index) => (
                <FeatureCard
                    key={feature.title}
                    feature={feature}
                    gradient={gradient}
                    index={index}
                />
            ))}
        </div>
    </div>
);

// Background Animation
const BackgroundAnimation: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        let animationFrameId: number;

        const setCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        setCanvasSize();
        window.addEventListener("resize", setCanvasSize);

        // Particles
        const particles: {
            x: number;
            y: number;
            radius: number;
            speedX: number;
            speedY: number;
            color: string;
        }[] = [];

        const particleCount = 100;
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                color: `rgba(${Math.floor(Math.random() * 100 + 155)}, ${
                    Math.floor(Math.random() * 100 + 100)
                }, ${Math.floor(Math.random() * 255)}, ${Math.random() * 0.4 + 0.1})`,
            });
        }

        const drawBlob = (
            ctx: CanvasRenderingContext2D,
            x: number,
            y: number,
            width: number,
            height: number,
            color: string,
            timeOffset: number
        ) => {
            ctx.beginPath();
            const points = 8;
            for (let i = 0; i < points; i++) {
                const angle = (i / points) * Math.PI * 2 + timeOffset;
                const radius = (width / 2) * (0.8 + 0.2 * Math.sin(angle * 4));
                const pointX = x + Math.cos(angle) * radius;
                const pointY = y + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(pointX, pointY);
                else ctx.lineTo(pointX, pointY);
            }
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.filter = "blur(80px)";
            ctx.fill();
            ctx.filter = "none";
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Background gradient
            const gradient = ctx.createRadialGradient(
                canvas.width / 2,
                canvas.height / 2,
                0,
                canvas.width / 2,
                canvas.height / 2,
                Math.max(canvas.width, canvas.height) / 1.5
            );
            gradient.addColorStop(0, "rgba(240, 244, 255, 0.8)");
            gradient.addColorStop(1, "rgba(253, 247, 254, 0.8)");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Particles
            particles.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
                p.x += p.speedX;
                p.y += p.speedY;
                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
            });

            // Blobs
            const time = Date.now() * 0.001;
            drawBlob(ctx, canvas.width * 0.2 + Math.cos(time * 0.3) * 50, canvas.height * 0.3 + Math.sin(time * 0.4) * 50, 120, 120, "#a78bfa30", time * 0.2);
            drawBlob(ctx, canvas.width * 0.8 + Math.sin(time * 0.2) * 70, canvas.height * 0.7 + Math.cos(time * 0.3) * 60, 100, 100, "#f9a8d430", time * 0.3);
            drawBlob(ctx, canvas.width * 0.6 + Math.sin(time * 0.25) * 40, canvas.height * 0.4 + Math.cos(time * 0.35) * 30, 80, 80, "#93c5fd30", time * 0.4);

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener("resize", setCanvasSize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full -z-10"
        />
    );
};

// Main Component
const WhyInflu: React.FC = () => {
    return (
        <div className="relative w-full flex flex-col items-center justify-center py-15 overflow-hidden min-h-screen">
            <BackgroundAnimation />
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4">
                {Object.keys(FEATURE_DATA).map((key) => (
                    <FeatureSection
                        key={key}
                        title={FEATURE_DATA[key].title}
                        features={FEATURE_DATA[key].features}
                        gradient={FEATURE_DATA[key].gradient}
                    />
                ))}
            </div>
        </div>
    );
};

export default WhyInflu;

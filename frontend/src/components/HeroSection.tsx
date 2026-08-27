"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FiArrowRight, FiInstagram, FiYoutube } from "react-icons/fi";
import { SiTiktok } from "react-icons/si";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const HeroSection = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [activePlatform, setActivePlatform] = useState("instagram");
  const [isMounted, setIsMounted] = useState(false);
  const [backgroundElements, setBackgroundElements] = useState<Array<{
    key: string;
    size: string;
    position: { top: string; left: string };
    color: string;
    animation: { x: number[]; y: number[]; scale: number[] };
    transition: { duration: number; repeat: number; repeatType: "reverse"; ease: string };
  }>>([]);
  const router = useRouter();

  const SOCIAL_PLATFORMS = ["instagram", "youtube"];
  const ANIMATION_DURATION = 2000;
  const BACKGROUND_ELEMENTS_COUNT = 15;

  // Platform data configuration
  const platformConfig = {
    instagram: {
      icon: <FiInstagram className="w-8 h-8 text-pink-600" />,
      color: "from-pink-100 to-pink-200",
    },
    youtube: {
      icon: <FiYoutube className="w-8 h-8 text-red-600" />,
      color: "from-red-100 to-red-200",
    },
  };

  // Set mounted state and generate background elements only on client
  useEffect(() => {
    setIsMounted(true);
    
    // Generate background elements with random values only on client
    const elements = [...Array(BACKGROUND_ELEMENTS_COUNT)].map((_, index) => {
      const randomSize = `${Math.random() * 200 + 50}px`;
      const randomPosition = {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
      };

      const colors = ["#ffb7c5", "#a0e7e5", "#b4f8c8"];
      const randomColor = colors[index % colors.length];

      return {
        key: `bg-element-${index}`,
        size: randomSize,
        position: randomPosition,
        color: randomColor,
        animation: {
          x: [0, Math.random() * 100 - 50],
          y: [0, Math.random() * 100 - 50],
          scale: [1, 1.5, 1],
        },
        transition: {
          duration: Math.random() * 10 + 10,
          repeat: Infinity,
          repeatType: "reverse" as const,
          ease: "easeInOut",
        },
      };
    });
    
    setBackgroundElements(elements);
  }, []);

  // Platform rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePlatform((prev) => {
        const currentIndex = SOCIAL_PLATFORMS.indexOf(prev);
        return SOCIAL_PLATFORMS[(currentIndex + 1) % SOCIAL_PLATFORMS.length];
      });
    }, ANIMATION_DURATION);

    return () => clearInterval(interval);
  }, []);

  const handlePlatformSelect = useCallback((platform: string) => {
    setActivePlatform(platform);
  }, []);

  return (
    <div
      className="relative py-25 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at top, #f0f4ff 0%, #fdf7fe 100%)",
      }}
    >
      {/* Background elements - only render on client to avoid hydration mismatch */}
      {isMounted && (
        <div className="absolute inset-0 overflow-hidden">
          {backgroundElements.map((el) => (
            <motion.div
              key={el.key}
              className="absolute rounded-full opacity-5"
              style={{
                background: `radial-gradient(circle, ${el.color}, transparent)`,
                width: el.size,
                height: el.size,
                ...el.position,
              }}
              animate={el.animation}
              transition={el.transition}
            />
          ))}
        </div>
      )}

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-gray-300/[0.05] bg-[length:20px_20px]" />

      {/* Main content container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 flex flex-col lg:flex-row items-center">
        {/* Text content */}
        <div className="lg:w-1/2 text-center lg:text-left z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span className="block text-gray-900">Amplify Your</span>
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mt-2">
                Digital Presence
              </span>
            </motion.h1>

            <motion.p
              className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Connect, create, and conquer the digital world. The ultimate
              platform for influencers and brands to collaborate and create
              magic.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <motion.button
                className="relative flex items-center justify-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-bold text-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                onClick={() => router.push("/signin")}
              >
                <span className="relative z-10">Get Started Now</span>
                <FiArrowRight className="ml-2 relative z-10" />
                {isHovered && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
              </motion.button>

              <Link
                href="#journey"
                scroll={true}
                className="px-8 py-4 bg-white border-2 border-gray-200 rounded-full text-gray-800 font-bold text-lg hover:bg-gray-50 transition-all shadow-sm"
              >
                Learn More
              </Link>
            </motion.div>
          </motion.div>
        </div>
        {/* Right-side image with icon placeholders */}
        <div className="lg:w-1/2 flex justify-center items-center relative mt-10 lg:mt-0">
          <div className="relative">
            {/* Influencer image */}
            <img
              src="/hero_img.webp"
              alt="Influencer Decorative"
              className="w-[480px] h-[480px] object-cover rounded-br-[200px] rounded-3xl"
              aria-hidden="true"
            />
            {/* Icon placeholders */}
            {/* Hashtag icon */}
            <motion.img
              src="/icons/hashtag.png"
              alt="Hashtag Icon"
              className="absolute -top-10 -left-8 w-[100px] h-[100px]"
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
            {/* Music note icon */}
            <motion.img
              src="/icons/music.png"
              alt="Music Note Icon"
              className="absolute -top-10 right-0 w-[100px] h-[100px]"
              animate={{ y: [0, 10, 0] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.2,
              }}
            />
            {/* Heart icon */}
            <motion.img
              src="/icons/heart.png"
              alt="Heart Icon"
              className="absolute bottom-6 right-2 w-[100px] h-[100px]"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.4,
              }}
            />
            {/* Camera icon */}
            <motion.img
              src="/icons/camera.png"
              alt="Camera Icon"
              className="absolute top-[100px] -right-10 w-20 h-20"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.6,
              }}
            />
            {/* Chat bubble icon */}
            <motion.img
              src="/icons/chat.png"
              alt="Chat Bubble Icon"
              className="absolute -bottom-10 -left-10 w-[100px] h-[100px]"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.8,
              }}
            />
            {/* Blue circle */}
            <motion.img
              src="/icons/circle.png"
              alt="Blue Circle Icon"
              className="absolute -bottom-8 right-[240px] w-20 h-20"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                duration: 2.3,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 1,
              }}
            />
            {/* Yellow dot */}
            <motion.img
              src="/icons/next.png"
              alt="Yellow Dot Icon"
              className="absolute top-[184px] -left-12 w-[100px] h-[100px]"
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 2.1,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 1.2,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

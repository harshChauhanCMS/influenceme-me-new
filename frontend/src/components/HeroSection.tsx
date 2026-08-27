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
      className="relative py-24 md:py-32 lg:py-40 overflow-hidden bg-cover bg-center bg-no-repeat min-h-[550px] md:min-h-[650px] lg:min-h-[720px] flex items-center"
      style={{
        backgroundImage: "url('/homebanner.png')",
      }}
    >

      {/* Floating Animated Icons in Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.img
          src="/icons/hashtag.png"
          alt="Hashtag Icon"
          className="absolute top-12 left-10 w-16 h-16 md:w-20 md:h-20 opacity-80"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.img
          src="/icons/music.png"
          alt="Music Icon"
          className="absolute top-16 right-16 w-16 h-16 md:w-20 md:h-20 opacity-80"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatType: "reverse", delay: 0.2 }}
        />
        <motion.img
          src="/icons/heart.png"
          alt="Heart Icon"
          className="absolute bottom-16 right-24 w-16 h-16 md:w-20 md:h-20 opacity-80"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatType: "reverse", delay: 0.4 }}
        />
        <motion.img
          src="/icons/camera.png"
          alt="Camera Icon"
          className="absolute top-1/2 right-10 w-16 h-16 md:w-20 md:h-20 opacity-80"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", delay: 0.6 }}
        />
        <motion.img
          src="/icons/chat.png"
          alt="Chat Icon"
          className="absolute bottom-10 left-16 w-16 h-16 md:w-20 md:h-20 opacity-80"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", delay: 0.8 }}
        />
      </div>

      {/* Main content container (Text upon background image) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl text-center lg:text-left">
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
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 mt-2">
                Digital Presence
              </span>
            </motion.h1>

            <motion.p
              className="text-lg sm:text-xl text-gray-800 max-w-xl mx-auto lg:mx-0 mb-10 font-medium leading-relaxed"
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
                className="px-8 py-4 bg-white/90 backdrop-blur-sm border-2 border-gray-300 rounded-full text-gray-800 font-bold text-lg hover:bg-white transition-all shadow-md text-center"
              >
                Learn More
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

"use client";

import React, { useEffect } from 'react';
import Lenis from '@studio-freight/lenis';

const SmoothScroller = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
        const lenis = new Lenis();

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);
    }, []);

    return <>{children}</>;
};

export default SmoothScroller;

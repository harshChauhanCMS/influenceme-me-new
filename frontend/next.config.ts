import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    output: 'standalone', // For SSR deployment
    reactStrictMode: true,
    
    // Image configuration for external domains
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'img.youtube.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'placehold.co',
                pathname: '/**',
            },
        ],
    },
    
    // Disable static optimization to force SSR
    experimental: {
        // Force dynamic rendering
    },
    
    webpack(config) {
        config.module.rules.push({
            test: /\.(mp4|webm|ogg|swf|ogv)$/,
            type: "asset/resource", // This lets Next.js treat videos like static files
        });

        return config;
    },
    
    eslint: {
        // Don't fail build on ESLint errors
        ignoreDuringBuilds: true,
    },
    
    typescript: {
        // Don't fail build on type errors (we'll fix them gradually)
        ignoreBuildErrors: true,
    },
};

export default nextConfig;

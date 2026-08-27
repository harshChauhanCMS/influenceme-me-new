'use client'; // CRITICAL: Marks this as a Client Component

import React, { FC, useEffect, useState } from 'react';
// Now we can directly import react-slick and its CSS
import Slider, { Settings } from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { getVideosByPurpose, getYouTubeEmbedUrl, extractYouTubeId, getYouTubeThumbnail, Video } from '@/services/videoService';

// --- Interfaces ---

/** Defines the structure for a single video item in the carousel. */
interface VideoItem {
    id: string;
    title: string;
    thumbnail: string;
    youtubeUrl: string;
    embedUrl: string;
}

/** Section containing the video carousel (How It Works) - Now a dedicated Client Component */
const HowWeWorksClient: FC = () => {
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

    // Fetch videos with "Website Services" purpose
    useEffect(() => {
        const fetchVideos = async () => {
            try {
                setLoading(true);
                const videosData = await getVideosByPurpose('Website Services');
                
                // Transform videos to VideoItem format
                const transformedVideos: VideoItem[] = videosData.map((video: Video) => {
                    const videoId = extractYouTubeId(video.youtubeUrl);
                    // Use provided thumbnail or generate from YouTube
                    let thumbnailUrl = video.thumbnailUrl;
                    if (!thumbnailUrl && videoId) {
                        // Use hqdefault as default (more reliable than maxresdefault)
                        thumbnailUrl = getYouTubeThumbnail(video.youtubeUrl, false);
                    } else if (!thumbnailUrl) {
                        // Fallback placeholder if no video ID
                        thumbnailUrl = `https://placehold.co/400x280/2563EB/ffffff?text=Video+Placeholder`;
                    }
                    
                    return {
                        id: video._id,
                        title: video.title,
                        thumbnail: thumbnailUrl,
                        youtubeUrl: video.youtubeUrl,
                        embedUrl: getYouTubeEmbedUrl(video.youtubeUrl),
                    };
                });
                
                setVideos(transformedVideos);
                setError(null);
            } catch (err: any) {
                console.error('Failed to fetch videos:', err);
                setError(err.message || 'Failed to load videos');
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    // Use Settings type for react-slick configuration
    const settings: Settings = {
        dots: true,
        infinite: videos.length > 3,
        speed: 500,
        slidesToShow: Math.min(3, videos.length),
        slidesToScroll: 1,
        arrows: false,
        autoplay: true,
        autoplaySpeed: 4000,
        centerMode: false,
        variableWidth: false,
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: Math.min(2, videos.length),
                },
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: Math.min(2, videos.length),
                },
            },
            {
                breakpoint: 640,
                settings: {
                    slidesToShow: 1,
                    centerMode: true,
                    centerPadding: '20px',
                },
            },
        ],
        // Explicitly type the dot rendering function argument
        appendDots: (dots: React.ReactNode[]) => (
            <div className="mt-6">
                <ul className="flex justify-center gap-3">{dots}</ul>
            </div>
        ),
        // Explicitly type the custom paging function argument
        customPaging: (i: number) => (
            <button key={i} className="w-3 h-3 rounded-full bg-gray-300 focus:outline-none transition-colors duration-200 slick-dot" />
        ),
    };

    const handleVideoClick = (video: VideoItem) => {
        setSelectedVideo(video);
    };

    const closeModal = () => {
        setSelectedVideo(null);
    };

    if (loading) {
        return (
            <section className="py-14 bg-white border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 mb-2">How Our Platform Works</h2>
                    <p className="text-gray-600 text-sm md:text-base">Watch these animated videos to see our services in action</p>
                </div>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-900"></div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="py-14 bg-white border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 mb-2">How Our Platform Works</h2>
                    <p className="text-gray-600 text-sm md:text-base">Watch these animated videos to see our services in action</p>
                </div>
                <div className="text-center py-12">
                    <p className="text-gray-600">{error}</p>
                </div>
            </section>
        );
    }

    // If no videos, don't show the section at all (or show a minimal version)
    if (videos.length === 0) {
        return null; // Hide the section if no videos
    }

    return (
        <>
            <section className="py-14 bg-white border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 mb-2">How Our Platform Works</h2>
                    <p className="text-gray-600 text-sm md:text-base">Watch these animated videos to see our services in action</p>
                </div>
                <div className="max-w-5xl mx-auto px-4">
                    {/* Use the standard Slider component */}
                    <Slider {...settings}>
                        {videos.map((video: VideoItem) => (
                            <div key={video.id} className="px-2">
                                <div 
                                    className="rounded-xl overflow-hidden shadow-lg bg-white relative group cursor-pointer"
                                    style={{ height: '280px' }}
                                    onClick={() => handleVideoClick(video)}
                                >
                                    <div className="relative w-full h-full">
                                        <img
                                            src={video.thumbnail}
                                            alt={video.title}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            loading="lazy"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                const videoId = extractYouTubeId(video.youtubeUrl);
                                                // Try fallback thumbnail formats in order
                                                if (videoId) {
                                                    if (target.src.includes('maxresdefault')) {
                                                        // Try hqdefault if maxresdefault fails
                                                        target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                                    } else if (target.src.includes('hqdefault')) {
                                                        // Try mqdefault if hqdefault fails
                                                        target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                                                    } else if (target.src.includes('mqdefault')) {
                                                        // Try sddefault if mqdefault fails
                                                        target.src = `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
                                                    } else {
                                                        // Final fallback to placeholder
                                                        target.src = `https://placehold.co/400x280/2563EB/ffffff?text=Video+Placeholder`;
                                                    }
                                                } else {
                                                    // No video ID, use placeholder
                                                    target.src = `https://placehold.co/400x280/2563EB/ffffff?text=Video+Placeholder`;
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors duration-200"
                                        aria-label={`Play ${video.title}`}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="white"
                                            viewBox="0 0 48 48"
                                            className="w-16 h-16 opacity-90 drop-shadow-lg"
                                        >
                                            <circle cx="24" cy="24" r="24" fill="white" fillOpacity="0.7" />
                                            <polygon points="20,16 34,24 20,32" fill="#4F46E5" />
                                        </svg>
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                        <h3 className="text-white font-semibold text-sm line-clamp-2">{video.title}</h3>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Slider>
                </div>
            </section>

            {/* Video Modal */}
            {selectedVideo && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={closeModal}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                            aria-label="Close video"
                        >
                            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="aspect-video w-full">
                            <iframe
                                src={selectedVideo.embedUrl}
                                title={selectedVideo.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full rounded-t-2xl"
                            />
                        </div>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedVideo.title}</h3>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default HowWeWorksClient;

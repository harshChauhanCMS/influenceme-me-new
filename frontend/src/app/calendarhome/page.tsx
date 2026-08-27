"use client";

import React, { useState, useMemo, FC } from 'react';


// --- Types ---

interface CalendarEvent {
    color: string;
    textColor: string;
    text: string;
}

interface LoadedImagesType {
    [key: string]: boolean;
}

interface CalendarDayHeaderProps {
    day: string;
}

interface CalendarCellProps {
    index: number;
    eventDays: number[];
    calendarEvents: { [key: number]: CalendarEvent };
    influencerAvatars: string[];
    influencerCities: string[];
    loadedImages: LoadedImagesType;
    setLoadedImages: React.Dispatch<React.SetStateAction<LoadedImagesType>>;
}

// --- Static Image URLs (Using standard Image URLs for simplicity in this format) ---
// Note: In a real Next.js app, you'd typically import local files, but for the canvas environment, URLs are used.
const img1 = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&q=75&w=200';
const img2 = 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&q=75&w=200';
const img3 = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&q=75&w=200';
const img4 = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&q=75&w=200';
const img5 = 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&q=75&w=200';
const img6 = 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&q=75&w=200';
const img7 = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&q=75&w=200';
const img8 = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&q=75&w=200';


// --- Sub-Components ---

const ChevronLeftIcon: FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const ChevronRightIcon: FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);

const CalendarHeader: FC = () => (
    <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
        <div className="text-gray-900 font-bold">September 2025</div>
        <div className="flex gap-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                <ChevronLeftIcon />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                <ChevronRightIcon />
            </button>
        </div>
    </div>
);

const CalendarDayHeader: FC<CalendarDayHeaderProps> = ({ day }) => (
    <div className="text-center text-gray-500 text-xs font-medium py-2 uppercase">
        {day}
    </div>
);

const CalendarCell: FC<CalendarCellProps> = ({ index, eventDays, calendarEvents, influencerAvatars, influencerCities, loadedImages, setLoadedImages }) => {
    const isPast = index > 27;
    const dayNum = index < 28 ? index + 1 : index - 27;
    const eventIndex = eventDays.indexOf(index);

    const avatarSrc = eventIndex !== -1 ? influencerAvatars[eventIndex] : undefined;
    const city = eventIndex !== -1 ? influencerCities[eventIndex] : undefined;
    const event = calendarEvents[index];

    return (
        <div className={`h-16 border border-gray-100 flex flex-col p-1 ${isPast ? 'text-gray-300' : 'text-gray-700'}`}>
            <div className="text-xs self-end pr-1">{dayNum}</div>

            {avatarSrc && city && (
                <div className="flex-1 flex flex-col items-center justify-center mt-1">
                    <div className="w-10 h-10 rounded-full border-2 border-white shadow overflow-hidden">
                        {/* Reverted to <img> due to Next.js host configuration requirement */}
                        <img
                            src={avatarSrc}
                            alt={`Influencer from ${city}`}
                            width={40}
                            height={40}
                            className={`w-full h-full object-cover transition-opacity duration-500 ${loadedImages[avatarSrc] ? 'opacity-100' : 'opacity-0'}`}
                            loading="lazy"
                            onLoad={() => setLoadedImages(prev => ({ ...prev, [avatarSrc]: true }))}
                        />
                    </div>
                    <span className="text-xs text-[#8CC342] font-semibold text-center w-full truncate">
                        {city}
                    </span>
                </div>
            )}

            {event && (
                <div className={`flex-1 ${event.color} rounded mt-1 flex items-center px-1`}>
                    <div className={`w-2 h-2 ${event.textColor.replace('text', 'bg')} rounded-full mr-1`}></div>
                    <div className={`text-[10px] ${event.textColor} font-medium truncate`}>
                        {event.text}
                    </div>
                </div>
            )}
        </div>
    );
};

const FloatingStats: FC = () => (
    <div className="absolute -bottom-6 -left-6 bg-gradient-to-r from-[#8CC342] to-[#6da52d] rounded-xl p-4 shadow-lg w-48 z-10">
        <div className="text-white text-center">
            <div className="text-2xl font-bold">+37%</div>
            <div className="text-xs opacity-90">Engagement Rate</div>
        </div>
    </div>
);

const WaveDivider: FC = () => (
    <div className="absolute bottom-0 left-0 w-full overflow-hidden pointer-events-none">
        <svg
            className="relative block w-full h-16 md:h-24"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            <path
                className="fill-current text-gray-50"
                d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            />
            <path
                className="fill-current text-gray-100"
                d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
            />
        </svg>
    </div>
);


// --- Main Exported Component ---

const CalendarPage: FC = () => {
    // Constants
    const profileImages = useMemo(() => [img1, img2, img3], []);
    const influencerAvatars = useMemo(() => [img1, img2, img3, img4, img5, img6, img7, img8], []);
    const influencerCities = useMemo(() => [
        'New York', 'Los Angeles', 'London', 'Paris', 'Tokyo', 'Sydney', 'Berlin', 'Dubai', 'Toronto'
    ], []);

    // State for image loading
    const [loadedImages, setLoadedImages] = useState<LoadedImagesType>({});

    // Calendar configuration
    const eventDays = useMemo(() => [2, 5, 8, 11, 14, 17, 20, 23, 26], []);
    const calendarEvents = useMemo(() => ({
        15: { color: 'bg-[#8CC342]/10', textColor: 'text-[#8CC342]', text: 'Instagram Post' },
        18: { color: 'bg-indigo-100', textColor: 'text-indigo-600', text: 'Instagram Live' },
        22: { color: 'bg-amber-100', textColor: 'text-amber-700', text: 'Instagram Video' }
    }), []);

    // No need for a global preload useEffect; <img> handles loading, and we track `onLoad` on the components themselves.

    return (
        // Added pt-20 to ensure content is pushed below the fixed header
        <div className="relative bg-white overflow-hidden pt-20">
            {/* Decorative elements */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-20 left-10 w-64 h-64 bg-[#8CC342] rounded-full mix-blend-multiply"></div>
                <div className="absolute bottom-10 right-20 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply"></div>
            </div>

            {/* Main content */}
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Text content */}
                    <div className="order-2 lg:order-1">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                            <span className="block">Streamline Your</span>
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#8CC342] to-[#6da52d]">
                                Influencer Calendar
                            </span>
                        </h1>
                        <p className="mt-6 text-xl text-gray-600 max-w-2xl">
                            Plan, schedule, and analyze influencer campaigns in one platform.
                            Maximize engagement while saving hours weekly.
                        </p>
                        <div className="mt-10">
                            <button className="px-8 py-4 bg-[#8CC342] hover:bg-[#7ab133] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]">
                                Sign in
                            </button>
                        </div>
                        <div className="mt-8 flex items-center">
                            <div className="flex -space-x-3">
                                {profileImages.map((src, idx) => (
                                    <div
                                        key={`profile-${idx}`}
                                        className="w-10 h-10 rounded-full bg-white border-2 border-white overflow-hidden shadow-sm"
                                    >
                                        {/* Reverted to <img> due to Next.js host configuration requirement */}
                                        <img
                                            src={src}
                                            alt={`Creator profile ${idx + 1}`}
                                            width={40}
                                            height={40}
                                            className={`w-full h-full object-cover transition-opacity duration-500 ${loadedImages[src] ? 'opacity-100' : 'opacity-0'}`}
                                            loading={idx < 2 ? 'eager' : 'lazy'}
                                            onLoad={() => setLoadedImages(prev => ({ ...prev, [src]: true }))}
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="ml-4 text-gray-600 font-medium">
                                Trusted by <span className="text-gray-900 font-bold">12,000+</span> creators
                            </p>
                        </div>
                    </div>

                    {/* Calendar graphic */}
                    <div className="relative order-1 lg:order-2">
                        <div className="relative rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
                            <div className="p-6">
                                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                    <CalendarHeader />
                                    <div className="grid grid-cols-7 gap-1 p-4">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                            <CalendarDayHeader key={`day-${i}`} day={day} />
                                        ))}
                                        {Array.from({ length: 35 }).map((_, i) => (
                                            <CalendarCell
                                                key={`cell-${i}`}
                                                index={i}
                                                eventDays={eventDays}
                                                calendarEvents={calendarEvents}
                                                influencerAvatars={influencerAvatars}
                                                influencerCities={influencerCities}
                                                loadedImages={loadedImages}
                                                setLoadedImages={setLoadedImages}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <FloatingStats />
                    </div>
                </div>
            </div>

            <WaveDivider />
        </div>
    );
};

export default CalendarPage;

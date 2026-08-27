"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import {
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiMapPin,
  FiUsers,
  FiCalendar,
  FiStar,
  FiGlobe,
  FiMessageSquare,
  FiHeart,
  FiArrowLeft,
  FiSearch,
  FiPhone,
  FiMail,
  FiShare2,
  FiBookmark,
} from "react-icons/fi";
import campaignService from "@/services/campaignService";
import tourService from "@/services/tourService";
import { chatService } from "@/services/chatService";
import { useAuth } from "@/context/authContext";
import { GoogleMapsLocationPicker } from "@/components/campaigns/GoogleMapsLocationPicker";
import { ICampaign } from "../../../../shared/types/campaign";
import { ITour } from "../../../../shared/types/tour";

const CalendarPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<ICampaign | null>(
    null,
  );
  const [selectedTour, setSelectedTour] = useState<ITour | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "campaigns" | "tours">(
    "calendar",
  );
  const [popupDate, setPopupDate] = useState<Date | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [campaigns, setCampaigns] = useState<ICampaign[]>([]);
  const [tours, setTours] = useState<ITour[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredCampaigns, setFilteredCampaigns] = useState<ICampaign[]>([]);
  const [filteredTours, setFilteredTours] = useState<ITour[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Location filter state
  const [selectedLocation, setSelectedLocation] = useState<{
    address?: string;
    city?: string;
    country?: string;
  } | null>(null);
  const [locationFilterText, setLocationFilterText] = useState("");

  const handleContactInfluencer = async () => {
    const influencerRef = selectedTour?.influencerId as any;
    const currentUserId = user
      ? String((user as any).id ?? (user as any)._id ?? "")
      : "";
    if (!influencerRef || !currentUserId) {
      setContactError("You must be logged in to contact the influencer.");
      return;
    }
    const influencerId =
      typeof influencerRef === "string"
        ? influencerRef
        : String(influencerRef._id ?? influencerRef.id ?? influencerRef);
    if (currentUserId === influencerId) {
      setContactError("You cannot message yourself.");
      return;
    }
    setContactError(null);
    setContactLoading(true);
    try {
      let roomId: string | null = null;
      try {
        const room = await chatService.createOrGetChatRoom({
          participantId: influencerId,
          chatType: "influencer-brand",
        });
        roomId = room?._id ?? (room as any)?.id ?? null;
      } catch (err: any) {
        if (err.response?.status === 409) {
          // Use roomId from 409 response if backend sends it
          const fromBody =
            err.response?.data?.data?.roomId ?? err.response?.data?.roomId;
          if (fromBody) {
            roomId = String(fromBody);
          } else {
            // Else find room from list by matching participant
            const { data: rooms } = await chatService.getChatRooms(1, 100);
            const pid = (r: any) =>
              String(r?.participantInfo?._id ?? r?.participantInfo?.id ?? "");
            const existing = rooms.find((r) => pid(r) === String(influencerId));
            if (existing) roomId = existing._id;
          }
        }
        if (!roomId) throw err;
      }
      if (!roomId) {
        setContactError("Could not open chat. Please try again.");
        return;
      }
      setSelectedTour(null);
      setViewMode("calendar");

      router.push(`/chat?roomId=${roomId}`);
    } catch (err: any) {
      // const message =
      //   err.response?.data?.message || err.message || "Failed to start chat.";
      // setContactError(message);
      if (err.response?.status === 409) {
        router.push(`/chat`);
      }
      console.error("Contact influencer chat error:", err);
    } finally {
      setContactLoading(false);
    }
  };

  // Fetch campaigns and tours
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Build tour filters based on selected location
        const tourFilters: {
          limit?: number;
          city?: string;
          country?: string;
          location?: string;
        } = { limit: 100 };

        if (selectedLocation) {
          if (selectedLocation.city) {
            tourFilters.city = selectedLocation.city;
          }
          if (selectedLocation.country) {
            tourFilters.country = selectedLocation.country;
          }
          if (selectedLocation.address && !selectedLocation.city) {
            tourFilters.location = selectedLocation.address;
          }
        }

        const [campaignsData, toursData] = await Promise.all([
          campaignService.getUserCampaigns(),
          tourService.getAllTours(tourFilters),
        ]);
        setCampaigns(campaignsData || []);
        setFilteredCampaigns(campaignsData || []);
        setTours(toursData.tours || []);
        setFilteredTours(toursData.tours || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setCampaigns([]);
        setFilteredCampaigns([]);
        setTours([]);
        setFilteredTours([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLocation]);

  // Filter campaigns and tours based on search query
  useEffect(() => {
    if (searchQuery) {
      const campaignResults = campaigns.filter(
        (campaign) =>
          campaign.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campaign.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          campaign.locations?.some((loc) =>
            loc.address?.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      );
      setFilteredCampaigns(campaignResults);

      const tourResults = tours.filter(
        (tour) =>
          tour.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tour.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tour.location.address
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          tour.location.city?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredTours(tourResults);
    } else {
      setFilteredCampaigns(campaigns);
      setFilteredTours(tours);
    }
  }, [searchQuery, campaigns, tours]);

  // Calendar functions
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Fill in days from previous/next month to complete the grid
  const firstDayOfWeek = monthStart.getDay();
  const lastDayOfWeek = monthEnd.getDay();
  const daysBefore = Array.from({ length: firstDayOfWeek }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - (firstDayOfWeek - i));
    return date;
  });
  const daysAfter = Array.from({ length: 6 - lastDayOfWeek }, (_, i) => {
    const date = new Date(monthEnd);
    date.setDate(date.getDate() + i + 1);
    return date;
  });
  const allDays = [...daysBefore, ...daysInMonth, ...daysAfter];

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDateClick = (date: Date) => {
    const campaignEvents = getCampaignsForDate(date);
    const tourEvents = getToursForDate(date);
    const allEvents = [...campaignEvents, ...tourEvents];

    if (allEvents.length > 1) {
      setPopupDate(date);
    } else if (campaignEvents.length === 1) {
      setSelectedDate(date);
      setSelectedCampaign(campaignEvents[0]);
      setSelectedTour(null);
      setViewMode("campaigns");
    } else if (tourEvents.length === 1) {
      setSelectedDate(date);
      setSelectedTour(tourEvents[0]);
      setSelectedCampaign(null);
      setViewMode("tours");
    } else {
      setSelectedDate(date);
      setSelectedCampaign(null);
      setSelectedTour(null);
    }
  };

  const closePopup = () => setPopupDate(null);
  const getCampaignsForDate = (date: Date) => {
    return campaigns.filter((campaign) => {
      if (!campaign.startDate) return false;
      const campaignDate = new Date(campaign.startDate);
      return isSameDay(campaignDate, date);
    });
  };

  const getToursForDate = (date: Date) => {
    return filteredTours.filter((tour) => {
      if (!tour.startDate) return false;
      const tourStart = new Date(tour.startDate);
      const tourEnd = new Date(tour.endDate);
      return date >= tourStart && date <= tourEnd;
    });
  };

  // Calculate stats (using filtered tours)
  const activeLocations = new Set([
    ...campaigns
      .filter((c) => c.status === "active")
      .flatMap((c) => c.locations?.map((l) => l.address) || []),
    ...filteredTours.filter((t) => t.isActive).map((t) => t.location.address),
  ]).size;

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const activeTours = filteredTours.filter((t) => t.isActive).length;
  const upcomingEvents =
    campaigns.filter((c) => {
      if (!c.startDate) return false;
      return new Date(c.startDate) > new Date();
    }).length +
    filteredTours.filter((t) => {
      if (!t.startDate) return false;
      return new Date(t.startDate) > new Date();
    }).length;

  const featuredCampaigns = campaigns.filter(
    (c) => c.status === "active" && c.budget && c.budget > 50000,
  ).length;

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Campaign Calendar
        </h1>
        <p className="text-sm text-gray-600">
          Track campaign schedules and events
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center">
          {/* Search Input */}
          <div className="relative flex-1 xl:flex-none xl:w-64">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <input
              type="text"
              placeholder="Search campaigns..."
              className="w-full pl-9 pr-3 py-2 h-10 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Location Filter */}
          <div className="relative flex-1 xl:flex-none xl:w-64 z-50">
            <GoogleMapsLocationPicker
              onLocationSelect={(location) => {
                setSelectedLocation({
                  address: location.address,
                  city: location.city,
                  country: location.country,
                });
                setLocationFilterText(location.address);
              }}
              placeholder="Filter tours by location..."
              label=""
            />
            {selectedLocation && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-gray-600">
                  Filtering: {selectedLocation.city || selectedLocation.address}
                </span>
                <button
                  onClick={() => {
                    setSelectedLocation(null);
                    setLocationFilterText("");
                  }}
                  className="text-xs text-red-600 hover:text-red-700 underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* View Mode Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => {
                setViewMode("calendar");
                setSelectedCampaign(null);
                setSelectedTour(null);
              }}
              className={`px-4 py-2 h-10 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                viewMode === "calendar"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <FiCalendar className="w-4 h-4" />
                Calendar
              </span>
            </button>
            <button
              onClick={() => {
                setViewMode("campaigns");
                setSelectedCampaign(null);
                setSelectedTour(null);
              }}
              className={`px-4 py-2 h-10 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                viewMode === "campaigns"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <FiUsers className="w-4 h-4" />
                Campaigns
              </span>
            </button>
            <button
              onClick={() => {
                setViewMode("tours");
                setSelectedCampaign(null);
                setSelectedTour(null);
              }}
              className={`px-4 py-2 h-10 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                viewMode === "tours"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <FiMapPin className="w-4 h-4" />
                Tours
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-center">
          <div className="bg-indigo-100 p-2.5 rounded-lg mr-3">
            <FiMapPin className="text-indigo-600 text-lg" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">
              {activeLocations}
            </div>
            <div className="text-gray-600 text-xs">Active Locations</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-center">
          <div className="bg-emerald-100 p-2.5 rounded-lg mr-3">
            <FiUsers className="text-emerald-600 text-lg" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">
              {activeCampaigns}
            </div>
            <div className="text-gray-600 text-xs">Active Campaigns</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-center">
          <div className="bg-purple-100 p-2.5 rounded-lg mr-3">
            <FiMapPin className="text-purple-600 text-lg" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{activeTours}</div>
            <div className="text-gray-600 text-xs">Influencer Tours</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-center">
          <div className="bg-amber-100 p-2.5 rounded-lg mr-3">
            <FiCalendar className="text-amber-600 text-lg" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">
              {upcomingEvents}
            </div>
            <div className="text-gray-600 text-xs">Upcoming Events</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-center">
          <div className="bg-purple-100 p-2.5 rounded-lg mr-3">
            <FiStar className="text-purple-600 text-lg" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">
              {featuredCampaigns}
            </div>
            <div className="text-gray-600 text-xs">Featured Campaigns</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <div className="text-gray-500">Loading campaigns...</div>
          </div>
        ) : (
          <>
            {/* Calendar View */}
            {viewMode === "calendar" && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Calendar Controls */}
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 border border-gray-200 shadow-sm"
                    >
                      <FiChevronLeft className="h-5 w-5" />
                    </button>

                    <h2 className="text-xl font-bold text-gray-800">
                      {format(currentDate, "MMMM yyyy")}
                    </h2>

                    <button
                      onClick={handleNextMonth}
                      className="p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 border border-gray-200 shadow-sm"
                    >
                      <FiChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700 text-sm">
                    <FiCalendar className="inline mr-2" />
                    {format(new Date(), "EEEE, MMMM d, yyyy")}
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="p-4">
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center font-medium text-gray-500 py-3 text-xs uppercase tracking-wide"
                        >
                          {day}
                        </div>
                      ),
                    )}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {allDays.map((day, index) => {
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isSelected =
                        selectedDate && isSameDay(day, selectedDate);
                      const isCurrentDay = isToday(day);
                      const campaignEvents = getCampaignsForDate(day);
                      const tourEvents = getToursForDate(day);
                      const allEvents = [...campaignEvents, ...tourEvents];

                      return (
                        <div
                          key={index}
                          onClick={() => handleDateClick(day)}
                          className={`min-h-[120px] p-2 rounded-xl cursor-pointer transition-all flex flex-col border ${
                            isCurrentMonth
                              ? isSelected
                                ? "border-indigo-500 bg-indigo-50 shadow-inner"
                                : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                              : "border-gray-50 bg-gray-50 text-gray-400"
                          } ${isCurrentDay && !isSelected ? "bg-blue-50 border-blue-200" : ""}`}
                        >
                          <div className="flex justify-between items-start">
                            <span
                              className={`inline-flex items-center justify-center rounded-full w-7 h-7 text-sm ${
                                isSelected
                                  ? "bg-indigo-600 text-white"
                                  : isCurrentDay
                                    ? "bg-blue-500 text-white"
                                    : "text-gray-700"
                              }`}
                            >
                              {format(day, "d")}
                            </span>
                            {allEvents.length > 0 && (
                              <span className="text-xs bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                                {allEvents.length}
                              </span>
                            )}
                          </div>

                          {/* Event indicators */}
                          <div className="space-y-1.5 mt-2 flex-grow overflow-hidden">
                            {/* Campaign events */}
                            {campaignEvents.slice(0, 2).map((event, idx) => (
                              <div
                                key={`campaign-${idx}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCampaign(event);
                                  setSelectedTour(null);
                                  setViewMode("campaigns");
                                }}
                                className={`text-xs px-2 py-1.5 rounded-lg transition-colors flex items-center shadow-xs cursor-pointer ${
                                  event.budget && event.budget > 50000
                                    ? "bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 text-amber-800"
                                    : "bg-indigo-50 border border-indigo-100 text-indigo-800"
                                }`}
                              >
                                <FiCalendar className="flex-shrink-0 mr-1 text-xs" />
                                <span className="truncate">
                                  {event.name || "Untitled Campaign"}
                                </span>
                              </div>
                            ))}
                            {/* Tour events */}
                            {tourEvents
                              .slice(0, 2 - campaignEvents.length)
                              .map((tour, idx) => (
                                <div
                                  key={`tour-${idx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTour(tour);
                                    setSelectedCampaign(null);
                                    setViewMode("tours");
                                  }}
                                  className="text-xs px-2 py-1.5 rounded-lg transition-colors flex items-center shadow-xs cursor-pointer bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 text-purple-800"
                                >
                                  <FiMapPin className="flex-shrink-0 mr-1 text-xs" />
                                  <span className="truncate">
                                    {tour.title || "Tour"}
                                  </span>
                                </div>
                              ))}
                            {allEvents.length > 2 && (
                              <div className="text-xs text-gray-500 px-2">
                                +{allEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Campaign Detail View */}
            {viewMode === "campaigns" && selectedCampaign && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="relative">
                  {selectedCampaign.image ? (
                    <div
                      className="h-48 bg-cover bg-center rounded-t-2xl"
                      style={{
                        backgroundImage: `url(${selectedCampaign.image})`,
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-t-2xl"></div>
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl"></div>
                  )}

                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => {
                        setViewMode("calendar");
                        setSelectedCampaign(null);
                      }}
                      className="bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 shadow-lg"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-4">
                    <h2 className="text-2xl font-bold text-white">
                      {selectedCampaign.name}
                    </h2>
                    <div className="flex items-center text-white/90 mt-1">
                      <FiGlobe className="mr-2" />
                      <span>
                        {selectedCampaign.locations &&
                        selectedCampaign.locations.length > 0
                          ? selectedCampaign.locations[0].address
                          : "No location"}
                      </span>
                      <span className="mx-3">•</span>
                      <FiCalendar className="mr-2" />
                      <span>
                        {selectedCampaign.startDate
                          ? format(
                              new Date(selectedCampaign.startDate),
                              "MMM d, yyyy",
                            )
                          : "No date"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Campaign Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-gray-500 text-sm">Status:</span>
                          <span
                            className={`ml-2 px-2.5 py-1 rounded-full text-xs font-medium ${
                              selectedCampaign.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : selectedCampaign.status === "completed"
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {selectedCampaign.status || "Unknown"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Type:</span>
                          <span className="ml-2 text-gray-800">
                            {selectedCampaign.type || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Budget:</span>
                          <span className="ml-2 text-gray-800">
                            ₹
                            {selectedCampaign.budget?.toLocaleString() || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">
                            Start Date:
                          </span>
                          <span className="ml-2 text-gray-800">
                            {selectedCampaign.startDate
                              ? format(
                                  new Date(selectedCampaign.startDate),
                                  "MMM d, yyyy",
                                )
                              : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">
                            End Date:
                          </span>
                          <span className="ml-2 text-gray-800">
                            {selectedCampaign.endDate
                              ? format(
                                  new Date(selectedCampaign.endDate),
                                  "MMM d, yyyy",
                                )
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Locations
                      </h3>
                      {selectedCampaign.locations &&
                      selectedCampaign.locations.length > 0 ? (
                        <div className="space-y-2">
                          {selectedCampaign.locations.map((location, idx) => (
                            <div
                              key={idx}
                              className="flex items-center p-3 border border-gray-200 rounded-lg"
                            >
                              <FiMapPin className="text-indigo-600 mr-2" />
                              <span className="text-gray-800">
                                {location.address}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No locations specified</p>
                      )}
                    </div>
                  </div>

                  {selectedCampaign.description && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Description
                      </h3>
                      <p className="text-gray-700">
                        {selectedCampaign.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tour Detail View */}
            {viewMode === "tours" && selectedTour && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="relative">
                  <div className="h-48 bg-gradient-to-r from-purple-500 to-pink-600 rounded-t-2xl"></div>

                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => {
                        setViewMode("calendar");
                        setSelectedTour(null);
                      }}
                      className="bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 shadow-lg"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-4">
                    <h2 className="text-2xl font-bold text-white">
                      {selectedTour.title}
                    </h2>
                    <div className="flex items-center text-white/90 mt-1">
                      <FiMapPin className="mr-2" />
                      <span>{selectedTour.location.address}</span>
                      {selectedTour.location.city && (
                        <>
                          <span className="mx-3">•</span>
                          <span>{selectedTour.location.city}</span>
                        </>
                      )}
                      <span className="mx-3">•</span>
                      <FiCalendar className="mr-2" />
                      <span>
                        {format(new Date(selectedTour.startDate), "MMM d")} -{" "}
                        {format(new Date(selectedTour.endDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Tour Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-gray-500 text-sm">
                            Influencer:
                          </span>
                          <span className="ml-2 text-gray-800">
                            {(selectedTour.influencerId as any)?.name ||
                              "Unknown"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">
                            Location:
                          </span>
                          <span className="ml-2 text-gray-800">
                            {selectedTour.location.address}
                          </span>
                        </div>
                        {selectedTour.location.city && (
                          <div>
                            <span className="text-gray-500 text-sm">City:</span>
                            <span className="ml-2 text-gray-800">
                              {selectedTour.location.city}
                            </span>
                          </div>
                        )}
                        {selectedTour.location.country && (
                          <div>
                            <span className="text-gray-500 text-sm">
                              Country:
                            </span>
                            <span className="ml-2 text-gray-800">
                              {selectedTour.location.country}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500 text-sm">
                            Start Date:
                          </span>
                          <span className="ml-2 text-gray-800">
                            {format(
                              new Date(selectedTour.startDate),
                              "MMM d, yyyy",
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">
                            End Date:
                          </span>
                          <span className="ml-2 text-gray-800">
                            {format(
                              new Date(selectedTour.endDate),
                              "MMM d, yyyy",
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Influencer Info
                      </h3>
                      {(selectedTour.influencerId as any) && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            {(selectedTour.influencerId as any)
                              .profilePictureUrl && (
                              <img
                                src={
                                  (selectedTour.influencerId as any)
                                    .profilePictureUrl
                                }
                                alt={(selectedTour.influencerId as any).name}
                                className="w-16 h-16 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <div className="font-semibold text-gray-900">
                                {(selectedTour.influencerId as any).name}
                              </div>
                              {(selectedTour.influencerId as any).email && (
                                <div className="text-sm text-gray-600">
                                  {(selectedTour.influencerId as any).email}
                                </div>
                              )}
                            </div>
                          </div>
                          {contactError && (
                            <p className="text-sm text-red-600 mb-2">
                              {contactError}
                            </p>
                          )}
                          <button
                            onClick={handleContactInfluencer}
                            disabled={contactLoading}
                            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center disabled:opacity-70"
                          >
                            {contactLoading ? (
                              "Opening chat..."
                            ) : (
                              <>
                                <FiMessageSquare className="mr-2" /> Contact
                                Influencer
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedTour.description && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Description
                      </h3>
                      <p className="text-gray-700">
                        {selectedTour.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tours List View */}
            {viewMode === "tours" && !selectedTour && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800">
                    Influencer Tours
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    See where influencers are traveling
                  </p>
                </div>

                {filteredTours.length > 0 ? (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTours.map((tour) => (
                      <div
                        key={tour._id}
                        className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
                        onClick={() => {
                          setSelectedTour(tour);
                        }}
                      >
                        <div className="h-32 bg-gradient-to-r from-purple-500 to-pink-600"></div>
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-gray-900 line-clamp-1">
                              {tour.title}
                            </h3>
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                              Tour
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-gray-600">
                              <FiMapPin className="mr-2" />
                              {tour.location.address}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <FiCalendar className="mr-2" />
                              {format(new Date(tour.startDate), "MMM d")} -{" "}
                              {format(new Date(tour.endDate), "MMM d, yyyy")}
                            </div>
                            {(tour.influencerId as any)?.name && (
                              <div className="flex items-center text-gray-600">
                                <FiUsers className="mr-2" />
                                {(tour.influencerId as any).name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <FiMapPin className="text-gray-400 text-2xl" />
                    </div>
                    <h4 className="text-gray-700 font-medium">
                      No tours found
                    </h4>
                    <p className="text-gray-500 mt-1">
                      {searchQuery
                        ? "Try a different search term"
                        : "No influencer tours scheduled yet"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Campaigns List View */}
            {viewMode === "campaigns" && !selectedCampaign && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800">
                    All Campaigns
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Your campaign list
                  </p>
                </div>

                {filteredCampaigns.length > 0 ? (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredCampaigns.map((campaign) => (
                      <div
                        key={campaign._id}
                        className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                        }}
                      >
                        {campaign.image && (
                          <div
                            className="h-32 bg-cover bg-center"
                            style={{
                              backgroundImage: `url(${campaign.image})`,
                            }}
                          ></div>
                        )}
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-gray-900 line-clamp-1">
                              {campaign.name}
                            </h3>
                            <span
                              className={`ml-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                campaign.status === "active"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : campaign.status === "completed"
                                    ? "bg-gray-100 text-gray-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {campaign.status || "Unknown"}
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-gray-600">
                              <FiCalendar className="mr-2" />
                              {campaign.startDate
                                ? format(
                                    new Date(campaign.startDate),
                                    "MMM d, yyyy",
                                  )
                                : "No date"}
                            </div>
                            {campaign.budget && (
                              <div className="text-gray-900 font-medium">
                                Budget: ₹{campaign.budget.toLocaleString()}
                              </div>
                            )}
                            {campaign.locations &&
                              campaign.locations.length > 0 && (
                                <div className="flex items-center text-gray-600">
                                  <FiMapPin className="mr-2" />
                                  {campaign.locations[0].address}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <FiCalendar className="text-gray-400 text-2xl" />
                    </div>
                    <h4 className="text-gray-700 font-medium">
                      No campaigns found
                    </h4>
                    <p className="text-gray-500 mt-1">
                      {searchQuery
                        ? "Try a different search term"
                        : "Create your first campaign to get started"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;

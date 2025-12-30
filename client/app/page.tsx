"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Feed } from "@/components/Feed";
import { DetailsColumn } from "@/components/DetailsColumn";
import { BottomNav } from "@/components/BottomNav";
// import { CreatorStudioModal } from "@/components/CreatorStudioModal";
import { CreatorDashboardModal } from "@/components/CreatorDashboardModal";
import { MarketModal } from "@/components/MarketModal";
import { CommentsModal } from "@/components/CommentsModal";
import { PagePlaceholder } from "@/components/pages/PagePlaceholder";
import { ExplorePage } from "@/components/pages/ExplorePage";
import { LivePage } from "@/components/pages/LivePage";
import { AlphaFeedPage } from "@/components/pages/AlphaFeedPage";
import { ProfilePage } from "@/components/pages/ProfilePage";
import { MOCK_VIDEOS } from "@/constants";
import { Video } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { getFeedVideos } from "@/lib/feed-service";

function App() {
  const {
    currentPage,
    setCurrentPage,
    isCreatorDashboardOpen,
    closeCreatorDashboard,
    isMarketModalOpen,
    closeMarketModal,
    selectedMarketVideo,
    isCommentsModalOpen,
    closeCommentsModal,
    selectedCommentsVideo,
    followedUsers,
    selectedProfileUsername,
  } = useAppContext();

  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [useRealVideos, setUseRealVideos] = useState(true);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    try {
      if (useRealVideos) {
        // Fetch real videos from database
        const result = await getFeedVideos(page, 10);

        if (result.videos.length === 0 && page === 0) {
          // No videos in database, fall back to mock data
          console.log('No videos in database, using mock data');
          setUseRealVideos(false);
          const mockVideos = MOCK_VIDEOS.map((v: any) => ({
            ...v,
            id: v.id + page * MOCK_VIDEOS.length + Math.random(),
          }));
          setVideos(mockVideos);
          setHasMore(true);
        } else {
          setVideos((prev) => [...prev, ...result.videos]);
          setHasMore(result.hasMore);
        }
      } else {
        // Use mock data fallback
        const newVideos = MOCK_VIDEOS.map((v: any) => ({
          ...v,
          id: v.id + page * MOCK_VIDEOS.length + Math.random(),
        }));
        setVideos((prev) => [...prev, ...newVideos]);
        setHasMore(page < 3);
      }

      setPage((prev) => prev + 1);
    } catch (error) {
      console.error('Error loading videos:', error);
      // Fall back to mock data on error
      if (useRealVideos && page === 0) {
        setUseRealVideos(false);
        const mockVideos = MOCK_VIDEOS.map((v: any) => ({
          ...v,
          id: v.id + page * MOCK_VIDEOS.length + Math.random(),
        }));
        setVideos(mockVideos);
        setHasMore(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, useRealVideos]);

  useEffect(() => {
    // Initial load
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileVideoClick = (video: Video) => {
    // 1. Add video to top of feed if not present
    setVideos(prev => {
      // Remove if already exists to unnecessary dups, then add to top
      const filtered = prev.filter(v => v.id !== video.id);
      return [video, ...filtered];
    });

    // 2. Set active video context
    // We need to wait for state update? No, context is separate.
    // The Feed component will see the new video list and activeVideoId will be updated by effect in Feed if needed
    // But Feed uses its own observer logic.
    // Let's just switch pages.
    setCurrentPage('For You');
  };

  const renderPage = () => {
    switch (currentPage) {
      case "For You":
        return (
          <Feed
            videos={videos}
            loadMore={loadMore}
            isLoading={isLoading}
            hasMore={hasMore}
          />
        );
      // case "Alpha Feed":
      //   // Filter videos for followed users for this feed
      //   const followedVideos = videos.filter((v) =>
      //     followedUsers.has(v.user.username)
      //   );
      //   return (
      //     <AlphaFeedPage
      //       videos={followedVideos}
      //       loadMore={loadMore}
      //       isLoading={isLoading}
      //       hasMore={hasMore && followedUsers.size > 0}
      //     />
      //   );
      case "Explore":
        return <ExplorePage />;
      case "LIVE":
        return <LivePage />;
      case "Profile":
        return <ProfilePage
          username={selectedProfileUsername || undefined}
          onVideoClick={handleProfileVideoClick}
        />;
      default:
        return <PagePlaceholder title={currentPage} />;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white font-sans overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        
        {/* Main Content Area - Full height, no padding on mobile for immersive video */}
        <main className="flex-1 flex flex-col relative overflow-hidden w-full md:w-auto pb-[60px] md:pb-0">
          {renderPage()}
        </main>

        {/* Details column is only shown for feed pages on large screens */}
        {(currentPage === "For You" || currentPage === "Alpha Feed") && (
          <DetailsColumn />
        )}
      </div>
      
      {/* Navigation Layer */}
      <BottomNav />
      {/* <CreatorStudioModal
        isOpen={isCreatorStudioOpen}
        onClose={closeCreatorStudio}
      /> */}
      <CreatorDashboardModal
        isOpen={isCreatorDashboardOpen}
        onClose={closeCreatorDashboard}
      />
      <MarketModal
        isOpen={isMarketModalOpen}
        onClose={closeMarketModal}
        video={selectedMarketVideo}
      />
      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={closeCommentsModal}
        videoId={selectedCommentsVideo?.videoId || ''}
        videoTitle={selectedCommentsVideo?.description || 'Video'}
      />
    </div>
  );
}

export default App;

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { Video } from '../types';
import { LoadingIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface FeedProps {
  videos: Video[];
  loadMore: () => void;
  isLoading: boolean;
  hasMore:boolean;
}

export const Feed: React.FC<FeedProps> = ({ videos, loadMore, isLoading, hasMore }) => {
  const { setActiveVideo } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const videoRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);

  const lastVideoElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, loadMore]);

  useEffect(() => {
    if (!activeVideoId && videos.length > 0) {
      setActiveVideoId(videos[0].id);
    }
  }, [videos, activeVideoId]);
  
  useEffect(() => {
    const options = {
      root: containerRef.current,
      rootMargin: '0px',
      threshold: 0.8,
    };

    const callback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const videoId = Number((entry.target as HTMLElement).dataset.videoId);
          const videoData = videos.find(v => v.id === videoId);
          setActiveVideoId(videoId);
          if(videoData) {
            setActiveVideo(videoData);
          }
        }
      });
    };

    const playPauseObserver = new IntersectionObserver(callback, options);
    const currentRefs = videoRefs.current;
    
    currentRefs.forEach(el => playPauseObserver.observe(el));

    return () => {
      currentRefs.forEach(el => playPauseObserver.unobserve(el));
    };
  }, [videos, setActiveVideo]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full md:max-w-sm md:aspect-[9/16] md:max-h-[85vh] rounded-none md:rounded-2xl overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
    >
      {videos.map((video, index) => {
        const isLastElement = videos.length === index + 1;
        return (
          <div 
            ref={node => {
              if (node) videoRefs.current.set(video.id, node);
              if (isLastElement) lastVideoElementRef(node);
            }}
            key={`${video.id}-${index}`}
            data-video-id={video.id}
            className="video-container snap-start w-full h-full flex-shrink-0"
          >
            <VideoPlayer 
                video={video} 
                isActive={video.id === activeVideoId}
            />
          </div>
        )
      })}
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center absolute bottom-0 bg-black/50">
            <LoadingIcon className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      )}
      {!hasMore && videos.length > 0 && (
         <div className="snap-start w-full h-full flex items-center justify-center text-zinc-100 bg-zinc-900 flex-shrink-0">
            <p>You've seen it all!</p>
        </div>
      )}
    </div>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { Video } from '../types';
import { HeartIcon, CommentIcon, ShareIcon, MusicNoteIcon, PlayIcon, VolumeUpIcon, VolumeOffIcon, ChartBarIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { incrementVideoLikes, incrementVideoViews } from '@/lib/feed-service';
import { getCommentCount } from '@/lib/comment-service';

const formatCount = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
};

const textShadowStyle = { textShadow: '0px 2px 4px rgba(0, 0, 0, 0.8)' };

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isActive }) => {
  const { isMuted, setIsMuted, openMarketModal, openCommentsModal } = useAppContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasViewedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(true);
  const [likes, setLikes] = useState(video.likes);
  const [hasLiked, setHasLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(video.comments || 0);

  // Reset view tracking when video changes
  useEffect(() => {
    hasViewedRef.current = false;
    setLikes(video.likes);
    setHasLiked(false);
  }, [video.id]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isActive) {
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          if (error.name !== 'AbortError') {
            console.error("Autoplay failed:", error);
          }
        });
      }

      // Increment views if not already viewed in this session
      if (!hasViewedRef.current && video.videoId) {
        incrementVideoViews(video.videoId);
        hasViewedRef.current = true;
      }
    } else {
      videoElement.pause();
      videoElement.currentTime = 0;
    }
  }, [isActive, video.videoId]);

  // Load real comment count from database
  useEffect(() => {
    if (video.videoId) {
      getCommentCount(video.videoId).then(count => {
        setCommentCount(count);
      });
    }
  }, [video.videoId]);


  const handleTogglePlay = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (videoElement.paused) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the click from bubbling up to handleTogglePlay
    setIsMuted(!isMuted);
  };

  const handleMarketClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openMarketModal(video);
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Prevent double-liking
    if (hasLiked) return;

    // Optimistic update
    setLikes(likes + 1);
    setHasLiked(true);

    // Call API to increment likes in database
    try {
      if (video.videoId) {
        await incrementVideoLikes(video.videoId);
        console.log(`Liked video: ${video.id}`);
      }
    } catch (error) {
      // Revert on error
      setLikes(likes);
      setHasLiked(false);
      console.error('Failed to like video:', error);
    }
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open real comments modal
    openCommentsModal(video);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // In a real app, this would open a share sheet
    console.log(`Shared video: ${video.id}`);
  };

  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden cursor-pointer" onClick={handleTogglePlay}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src={video.videoUrl}
        loop
        playsInline
        onPlay={() => setIsPaused(false)}
        onPause={() => setIsPaused(true)}
        muted={isMuted}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none"></div>

      <button
        onClick={handleToggleMute}
        className="absolute top-4 right-4 bg-black/30 backdrop-blur-md p-2 rounded-full z-10 hover:bg-white/20 transition-colors"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeOffIcon className="w-6 h-6 text-white" /> : <VolumeUpIcon className="w-6 h-6 text-white" />}
      </button>

      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none transition-opacity duration-300">
          <PlayIcon className="w-20 h-20 text-white/80" />
        </div>
      )}

      {/* User Info & Description - Hidden on larger screens as it's in the DetailsColumn */}
      <div className="absolute bottom-16 md:bottom-4 left-0 p-4 text-white w-full lg:hidden pointer-events-none pr-20" style={textShadowStyle}>
        <div className="flex items-center mb-2">
          <img src={video.user.avatarUrl} className="w-10 h-10 rounded-full border-2 border-white" alt={video.user.username} />
          <p className="font-bold ml-3 text-lg">@{video.user.username}</p>
        </div>
        <p className="text-sm mb-2">{video.description}</p>
        <div className="flex items-center">
          <MusicNoteIcon className="w-5 h-5" />
          <p className="text-sm ml-2">{video.songTitle}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-28 md:bottom-20 right-2 flex flex-col items-center space-y-5 text-white pointer-events-auto">
        <div className="flex flex-col items-center cursor-pointer group" onClick={handleLikeClick}>
          <button className={`backdrop-blur-md p-3 rounded-full transition-all duration-200 group-hover:scale-110 ${hasLiked
            ? 'bg-rose-500'
            : 'bg-black/30 group-hover:bg-rose-500'
            }`}>
            <HeartIcon className={`w-8 h-8 ${hasLiked ? 'fill-white' : ''}`} />
          </button>
          <span className="text-sm font-semibold mt-1" style={textShadowStyle}>{formatCount(likes)}</span>
        </div>
        <div className="flex flex-col items-center cursor-pointer group" onClick={handleCommentClick}>
          <button className="bg-black/30 backdrop-blur-md p-3 rounded-full group-hover:bg-emerald-500 transition-all duration-200 group-hover:scale-110">
            <CommentIcon className="w-8 h-8" />
          </button>
          <span className="text-sm font-semibold mt-1" style={textShadowStyle}>{formatCount(commentCount)}</span>
        </div>
        {video.isTradeable && (
          <div className="flex flex-col items-center cursor-pointer group" onClick={handleMarketClick}>
            <button className="bg-black/30 backdrop-blur-md p-3 rounded-full group-hover:bg-indigo-500 transition-all duration-200 group-hover:scale-110">
              <ChartBarIcon className="w-8 h-8" />
            </button>
            <span className="text-sm font-semibold mt-1" style={textShadowStyle}>Market</span>
          </div>
        )}
        <div className="flex flex-col items-center cursor-pointer group" onClick={handleShareClick}>
          <button className="bg-black/30 backdrop-blur-md p-3 rounded-full group-hover:bg-sky-500 transition-all duration-200 group-hover:scale-110">
            <ShareIcon className="w-8 h-8" />
          </button>
          <span className="text-sm font-semibold mt-1" style={textShadowStyle}>{formatCount(video.shares)}</span>
        </div>
        <div className="animate-spin-slow mt-4">
          <img src={video.user.avatarUrl} className="w-12 h-12 rounded-full border-2 border-gray-800" alt="song cover" />
        </div>
      </div>
    </div>
  );
};

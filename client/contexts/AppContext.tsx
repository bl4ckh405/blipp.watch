"use client"
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Page, User, Video } from '@/types';
import * as api from '@/services/apiService';

interface AppContextType {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;

  // Ape system (follow)
  followedUsers: Set<string>;
  followingList: User[];
  handleFollowToggle: (username: string) => Promise<void>;

  // Modals
  isCreatorDashboardOpen: boolean;
  openCreatorDashboard: () => void;
  closeCreatorDashboard: () => void;

  isMarketModalOpen: boolean;
  selectedMarketVideo: Video | null;
  openMarketModal: (video: Video) => void;
  closeMarketModal: () => void;

  isCommentsModalOpen: boolean;
  selectedCommentsVideo: Video | null;
  openCommentsModal: (video: Video) => void;
  closeCommentsModal: () => void;

  // Active video for details column
  activeVideo: Video | null;
  setActiveVideo: (video: Video | null) => void;

  // Auth state
  currentUser: { id: string; username: string; wallet: string } | null;
  setCurrentUser: (user: { id: string; username: string; wallet: string } | null) => void;
  isAuthenticated: boolean;

  // Profile navigation
  selectedProfileUsername: string | null;
  setSelectedProfileUsername: (username: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<Page>('For You');
  const [isMuted, setIsMuted] = useState(true);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  // Ape system state (follow)
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [followingList, setFollowingList] = useState<User[]>([]);

  // Modal states
  const [isCreatorDashboardOpen, setIsCreatorDashboardOpen] = useState(false);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [selectedMarketVideo, setSelectedMarketVideo] = useState<Video | null>(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [selectedCommentsVideo, setSelectedCommentsVideo] = useState<Video | null>(null);

  // Auth state with localStorage persistence
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; wallet: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('blipp_user');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  // Profile navigation
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);

  // Persist user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('blipp_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('blipp_user');
    }
  }, [currentUser]);

  useEffect(() => {
    api.getFollowing().then(users => {
      setFollowingList(users);
      setFollowedUsers(new Set(users.map(u => u.username)));
    });
  }, []);

  const handleFollowToggle = useCallback(async (username: string) => {
    const isCurrentlyFollowing = followedUsers.has(username);
    const originalFollowedSet = new Set(followedUsers);

    const newFollowedSet = new Set(originalFollowedSet);
    if (isCurrentlyFollowing) {
      newFollowedSet.delete(username);
    } else {
      newFollowedSet.add(username);
    }
    setFollowedUsers(newFollowedSet);

    try {
      if (isCurrentlyFollowing) {
        await api.unfollowUser(username);
      } else {
        await api.followUser(username);
      }
      const updatedList = await api.getFollowing();
      setFollowingList(updatedList);
      setFollowedUsers(new Set(updatedList.map(u => u.username)));
    } catch (error) {
      console.error("Failed to update follow status:", error);
      setFollowedUsers(originalFollowedSet);
    }
  }, [followedUsers]);

  const openCreatorDashboard = () => setIsCreatorDashboardOpen(true);
  const closeCreatorDashboard = () => setIsCreatorDashboardOpen(false);

  const openMarketModal = (video: Video) => {
    setSelectedMarketVideo(video);
    setIsMarketModalOpen(true);
  };
  const closeMarketModal = () => setIsMarketModalOpen(false);

  const openCommentsModal = (video: Video) => {
    setSelectedCommentsVideo(video);
    setIsCommentsModalOpen(true);
  };
  const closeCommentsModal = () => setIsCommentsModalOpen(false);

  const value: AppContextType = {
    currentPage,
    setCurrentPage,
    isMuted,
    setIsMuted,
    followedUsers,
    followingList,
    handleFollowToggle,
    isCreatorDashboardOpen,
    openCreatorDashboard,
    closeCreatorDashboard,
    isMarketModalOpen,
    selectedMarketVideo,
    openMarketModal,
    closeMarketModal,
    isCommentsModalOpen,
    selectedCommentsVideo,
    openCommentsModal,
    closeCommentsModal,
    activeVideo,
    setActiveVideo,
    currentUser,
    setCurrentUser,
    isAuthenticated: !!currentUser,
    selectedProfileUsername,
    setSelectedProfileUsername,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};


import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { generateVideoIdea } from '../services/geminiService';
import { VideoIdea } from '../types';
import { SparklesIcon, CloseIcon, LoadingIcon, HeartIcon, EyeIcon, ChartBarIcon, VideoCameraIcon } from './Icons';
import { VideoThumbnail } from './VideoThumbnail';
import { VideoUploadModal } from './VideoUploadModal';
import { useWallet } from './WalletProvider';
import { getUserByWallet } from '@/lib/supabase-auth';
import { getVideosByCreator, VideoData, updateVideoMarket } from '@/lib/video-service';
import { initializeMarket, getMarketAddress, CONTRACT_ADDRESS, MODULE_NAME } from '@/lib/aptos-contract';

interface CreatorDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; value: string; label: string; }> = ({ icon, value, label }) => (
  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
    <div className="flex items-center space-x-3">
      <div className="p-2 bg-zinc-700 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    </div>
  </div>
);


const AIIdeaGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateIdeas = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setIdeas([]);
    try {
      const generatedIdeas = await generateVideoIdea(prompt);
      setIdeas(generatedIdeas);
    } catch (e) {
      setError('Failed to generate ideas. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mt-6">
      <div className="flex items-center space-x-2 mb-3">
        <SparklesIcon className="w-6 h-6 text-emerald-400" />
        <h3 className="text-lg font-bold">AI Idea Generator</h3>
      </div>
      <p className="text-sm text-zinc-400 mb-4">
        Describe a topic and get back engaging video ideas.
      </p>
      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'a funny video about cats'"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={isLoading}
        />
        <button
          onClick={handleGenerateIdeas}
          disabled={isLoading || !prompt.trim()}
          className="flex items-center justify-center bg-emerald-500 text-black font-bold px-4 py-2 rounded-lg text-sm hover:bg-emerald-600 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
        >
          {isLoading ? <LoadingIcon className="w-5 h-5 animate-spin" /> : 'Generate'}
        </button>
      </div>
      <div className="space-y-3 h-40 overflow-y-auto pr-2 text-sm">
        {error && <p className="text-red-500 text-center">{error}</p>}
        {ideas.map((idea, index) => (
          <div key={index} className="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
            <h4 className="font-bold text-emerald-400">{idea.title}</h4>
            <p className="text-zinc-300 mt-1 text-xs">{idea.description}</p>
          </div>
        ))}
        {!isLoading && ideas.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs">
            <p>Your generated ideas will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};


export const CreatorDashboardModal: React.FC<CreatorDashboardModalProps> = ({ isOpen, onClose }) => {
  const { account, connected, signAndSubmitTransaction, session, walletAddress } = useWallet();
  const [isVideoUploadModalOpen, setIsVideoUploadModalOpen] = useState(false);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [creatingMarket, setCreatingMarket] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && session && connected && account) {
      loadUserData();
    }
  }, [isOpen, session, connected, account]);

  const loadUserData = async () => {
    if (!session || !connected || !walletAddress) return;

    setLoading(true);
    try {
      const user = await getUserByWallet(walletAddress);
      if (user) {
        setUserId(user.id);
        const userVideos = await getVideosByCreator(user.id);
        setVideos(userVideos);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMarket = async (video: VideoData) => {
    if (!account || !connected) return;

    setCreatingMarket(video.id);
    try {
      const videoId = video.id;

      // Initialize market on blockchain
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::initialize_market`,
          functionArguments: [videoId],
        },
      });

      if (response?.hash) {
        // Wait a bit for the transaction to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Get the market address
        const marketAddr = await getMarketAddress(videoId);

        if (marketAddr) {
          // Update video in database with market address
          await updateVideoMarket(videoId, marketAddr);

          // Reload videos
          await loadUserData();
        }
      }
    } catch (error: any) {
      console.error('Error creating market:', error);
      alert(error.message || 'Failed to create market');
    } finally {
      setCreatingMarket(null);
    }
  };

  const analytics = useMemo(() => {
    return videos.reduce((acc, video) => {
      acc.totalVideos += 1;
      acc.totalViews += video.views || 0;
      acc.totalLikes += video.likes || 0;
      if (video.is_tradeable) {
        acc.tradeableVideos += 1;
      }
      return acc;
    }, { totalVideos: 0, totalViews: 0, totalLikes: 0, tradeableVideos: 0 });
  }, [videos]);

  const formatStat = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] p-6 relative flex flex-col animate-scale-in">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white z-10">
            <CloseIcon className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-3 mb-6 shrink-0">
            <h2 className="text-3xl font-bold">Creator Dashboard</h2>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
            {/* Left Column: Analytics & Tools */}
            <div className="lg:col-span-1 flex flex-col space-y-6 overflow-y-auto scrollbar-hide">
              <div>
                <h3 className="text-xl font-bold mb-4">Analytics Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard icon={<VideoCameraIcon className="w-6 h-6 text-zinc-300" />} value={analytics.totalVideos.toString()} label="Total Videos" />
                  <StatCard icon={<EyeIcon className="w-6 h-6 text-zinc-300" />} value={formatStat(analytics.totalViews)} label="Total Views" />
                  <StatCard icon={<HeartIcon className="w-6 h-6 text-zinc-300" />} value={formatStat(analytics.totalLikes)} label="Total Likes" />
                  <StatCard icon={<ChartBarIcon className="w-6 h-6 text-zinc-300" />} value={analytics.tradeableVideos.toString()} label="Tradeable" />
                </div>
              </div>

              <button
                onClick={() => setIsVideoUploadModalOpen(true)}
                className="w-full bg-emerald-500 text-black font-bold text-lg py-3 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Upload Video
              </button>

              <AIIdeaGenerator />
            </div>

            {/* Right Column: Content */}
            <div className="lg:col-span-2 flex flex-col overflow-hidden">
              <h3 className="text-xl font-bold mb-4 shrink-0">My Content ({videos.length})</h3>
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <LoadingIcon className="w-8 h-8 animate-spin text-emerald-400" />
                  </div>
                ) : videos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                    <VideoCameraIcon className="w-16 h-16 mb-4" />
                    <p>No videos yet. Upload your first video!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {videos.map(video => (
                      <div key={video.id} className="group bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
                        {video.thumbnail_url ? (
                          <div className="aspect-video bg-zinc-900 overflow-hidden relative">
                            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                            {video.market_address && (
                              <div className="absolute top-2 right-2 bg-emerald-500/90 text-black text-xs font-bold px-2 py-1 rounded">
                                MARKET LIVE
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="aspect-video bg-linear-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative">
                            <VideoCameraIcon className="w-12 h-12 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                            {video.market_address && (
                              <div className="absolute top-2 right-2 bg-emerald-500/90 text-black text-xs font-bold px-2 py-1 rounded">
                                MARKET LIVE
                              </div>
                            )}
                          </div>
                        )}
                        <div className="p-3">
                          <h4 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">{video.title}</h4>
                          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                            <div className="flex items-center gap-1">
                              <EyeIcon className="w-3 h-3" />
                              <span>{video.views}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <HeartIcon className="w-3 h-3" />
                              <span>{video.likes}</span>
                            </div>
                          </div>
                          {!video.market_address && video.is_tradeable && (
                            <button
                              onClick={() => handleCreateMarket(video)}
                              disabled={creatingMarket === video.id}
                              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-600 text-white text-xs font-bold rounded transition-colors"
                            >
                              {creatingMarket === video.id ? (
                                <>
                                  <LoadingIcon className="w-3 h-3 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <ChartBarIcon className="w-3 h-3" />
                                  Create Market
                                </>
                              )}
                            </button>
                          )}
                          {video.market_address && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-xs font-bold">
                              <ChartBarIcon className="w-3 h-3" />
                              <span>TRADEABLE</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <VideoUploadModal isOpen={isVideoUploadModalOpen} onClose={() => setIsVideoUploadModalOpen(false)} />
    </>
  );
};
import React from 'react';
import { Video } from '../types';
import { PlayIconSolid } from './Icons';

interface VideoThumbnailProps {
    video: Video;
}

const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views;
};

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({ video }) => {
    return (
        <div className="group relative aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden cursor-pointer w-full">
            <img
                src={video.thumbnailUrl || ''}
                alt={video.description}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-70"></div>
            
            {video.views && (
                 <div className="absolute bottom-2 left-2 flex items-center space-x-1 text-white font-bold text-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    <PlayIconSolid className="w-4 h-4" />
                    <span>{formatViews(video.views)}</span>
                </div>
            )}
        </div>
    );
};
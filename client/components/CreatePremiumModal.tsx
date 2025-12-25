import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { CloseIcon, LoadingIcon } from './Icons';

interface CreatePremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreatePremiumModal: React.FC<CreatePremiumModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { connected, account } = useWallet();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [previewUrl, setPreviewUrl] = useState('https://images.unsplash.com/photo-1639762681485-074b7f938ba0');
    const [videoUrl, setVideoUrl] = useState('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploadMode, setUploadMode] = useState<'url' | 'file'>('file');
    const [price, setPrice] = useState('1'); // Default 1 APT
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!connected || !account) {
            alert('Please connect wallet');
            return;
        }

        const walletAddress = account.address.toString();
        setIsLoading(true);

        try {
            let finalVideoUrl = videoUrl;

            // Handle File Upload
            if (uploadMode === 'file' && videoFile) {
                const fileExt = videoFile.name.split('.').pop();
                const fileName = `premium/${walletAddress}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('videos')
                    .upload(fileName, videoFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('videos')
                    .getPublicUrl(fileName);

                finalVideoUrl = publicUrl;
            } else if (uploadMode === 'file' && !videoFile) {
                throw new Error("Please select a video file");
            }

            const { error } = await supabase
                .from('premium_content')
                .insert({
                    creator_id: walletAddress,
                    title,
                    description,
                    preview_url: previewUrl,
                    video_url: finalVideoUrl,
                    price_amount: parseFloat(price) * 100000000, // Convert to Octas
                });

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creating content:', error);
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-[95%] max-w-lg overflow-hidden flex flex-col max-h-[90dvh] shadow-2xl">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white">Create Premium Workshop</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full">
                        <CloseIcon className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Title</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. Mastering Move"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                            placeholder="What will users learn?"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Price (APT)</label>
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Preview Image URL</label>
                            <input
                                type="url"
                                required
                                value={previewUrl}
                                onChange={e => setPreviewUrl(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Video Content</label>
                        <div className="flex bg-zinc-800 rounded-lg p-1 mb-3 w-fit">
                            <button
                                type="button"
                                onClick={() => setUploadMode('file')}
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${uploadMode === 'file' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                Upload File
                            </button>
                            <button
                                type="button"
                                onClick={() => setUploadMode('url')}
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${uploadMode === 'url' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                Use URL
                            </button>
                        </div>

                        {uploadMode === 'file' ? (
                            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors group">
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={e => setVideoFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="video-upload"
                                />
                                <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                                    <div className="bg-zinc-800 p-3 rounded-full mb-3 group-hover:bg-emerald-500/10 transition-colors">
                                        <svg className="w-6 h-6 text-zinc-400 group-hover:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <span className="text-zinc-300 font-medium">
                                        {videoFile ? videoFile.name : "Click to upload video"}
                                    </span>
                                    <span className="text-xs text-zinc-500 mt-1">MP4, WebM (Max 50MB)</span>
                                </label>
                            </div>
                        ) : (
                            <input
                                type="url"
                                required={uploadMode === 'url'}
                                value={videoUrl}
                                onChange={e => setVideoUrl(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="https://..."
                            />
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || (uploadMode === 'file' && !videoFile)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                        {isLoading && <LoadingIcon className="w-5 h-5 animate-spin" />}
                        {isLoading ? 'Creating...' : 'Create & Publish'}
                    </button>

                </form>
            </div>
        </div>
    );
};

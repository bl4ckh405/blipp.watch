'use client';

import React, { useState } from 'react';
import { CloseIcon, VideoCameraIcon, CheckIcon } from './Icons';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { supabase } from '@/lib/supabase';
import { createVideo, updateVideoMarket } from '@/lib/video-service';
import { initializeMarket, CONTRACT_ADDRESS, MODULE_NAME } from '@/lib/aptos-contract';
import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const walletAddress = account?.address?.toString() || null;
  const [isTradeable, setIsTradeable] = useState(true); // Default to true for trading
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid video file (MP4, MOV, or AVI)');
      return;
    }

    // Validate file size (500MB max)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 500MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (!connected || !walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!selectedFile) {
      setError('Please select a video file');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title for your video');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(10);

    try {
      // 1. Upload video to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${walletAddress}/${Date.now()}.${fileExt}`;

      setUploadProgress(20);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      setUploadProgress(50);

      // 2. Get public URL for the video
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      // 3. Create video record in database
      const videoData = await createVideo(
        walletAddress,
        publicUrl,
        title.trim(),
        description.trim(),
        isTradeable
      );

      if (!videoData) throw new Error('Failed to create video record');

      console.log('Video created:', {
        id: videoData.id,
        idType: typeof videoData.id,
        creator_id: videoData.creator_id,
        is_tradeable: videoData.is_tradeable
      });

      setUploadProgress(70);

      // 4. If tradeable, create market on blockchain
      if (isTradeable) {
        try {
          console.log('=== MARKET CREATION DEBUG ===');
          console.log('Video ID:', videoData.id);
          console.log('Video ID type:', typeof videoData.id);
          if (!account) {
            throw new Error('Wallet account not available');
          }

          setUploadProgress(80);

          console.log('Submitting transaction...');
          const response = await signAndSubmitTransaction({
            sender: account.address,
            data: {
              function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::initialize_market`,
              functionArguments: [videoData.id],
            },
          });
          console.log('Transaction response:', response);

          setUploadProgress(90);

          if (response) {
            console.log('Market created! Transaction hash:', response.hash);
            const marketReference = `txn:${response.hash}`;
            console.log('Updating video with market reference:', marketReference);
            await updateVideoMarket(videoData.id, marketReference);
          }

          setUploadProgress(100);
        } catch (marketError: any) {
          console.error('Market creation error:', marketError);
          // Don't fail the upload if market creation fails
          setError('Video uploaded, but market creation failed. Check console.');
        }
      } else {
        setUploadProgress(100);
      }

      // Success!
      setTimeout(() => {
        onSuccess?.();
        onClose();
        resetForm();
      }, 500);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload video.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setIsTradeable(true);
    setError(null);
    setUploadProgress(0);
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-[60] p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-[95%] max-w-xl relative transform transition-all duration-300 scale-95 animate-scale-in flex flex-col max-h-[90dvh]">
        {/* Fixed Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white disabled:opacity-50 z-10 p-2 bg-zinc-900/50 rounded-full"
          disabled={uploading}
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
          <div className="flex items-center space-x-3 mb-6">
            <VideoCameraIcon className="w-8 h-8 text-emerald-400 shrink-0" />
            <h2 className="text-2xl md:text-3xl font-bold">Upload Video</h2>
          </div>

          <p className="text-zinc-400 mb-6 text-sm md:text-base">
            Share your content and make it tradeable on the blockchain!
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {!connected && (
            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg text-yellow-400 text-sm">
              Please connect your wallet to upload videos
            </div>
          )}

          <div className="space-y-4">
            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My awesome video"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploading || !connected}
                maxLength={100}
              />
            </div>

            {/* Video File Upload */}
            <div>
              <label htmlFor="video-file" className="block text-sm font-medium text-zinc-300 mb-1">
                Video File <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="dropzone-file"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors ${uploading || !connected
                    ? 'border-zinc-700 bg-zinc-800/50 cursor-not-allowed'
                    : selectedFile
                      ? 'border-emerald-500 bg-emerald-500/10 cursor-pointer hover:bg-emerald-500/20'
                      : 'border-zinc-700 bg-zinc-800/50 cursor-pointer hover:border-emerald-500 hover:bg-zinc-800'
                    }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    {selectedFile ? (
                      <>
                        <CheckIcon className="w-10 h-10 text-emerald-400 mb-2" />
                        <p className="text-sm text-emerald-400 font-semibold truncate max-w-[200px]">{selectedFile.name}</p>
                        <p className="text-xs text-zinc-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </>
                    ) : (
                      <>
                        <p className="mb-2 text-sm text-zinc-400">
                          <span className="font-semibold">Click / Drag</span> to upload
                        </p>
                        <p className="text-xs text-zinc-500">MP4, MOV, AVI (Max 500MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    id="dropzone-file"
                    type="file"
                    className="hidden"
                    accept="video/mp4,video/quicktime,video/x-msvideo"
                    onChange={handleFileChange}
                    disabled={uploading || !connected}
                  />
                </label>
              </div>
            </div>

            {/* Tradeable Checkbox */}
            <div className="flex items-start space-x-3 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
              <input
                type="checkbox"
                id="tradeable"
                checked={isTradeable}
                onChange={(e) => setIsTradeable(e.target.checked)}
                className="w-4 h-4 mt-1 text-emerald-500 bg-zinc-700 border-zinc-600 rounded focus:ring-emerald-500 focus:ring-2 disabled:opacity-50 shrink-0"
                disabled={uploading || !connected}
              />
              <label htmlFor="tradeable" className="flex-1">
                <div className="font-semibold text-white">Make tradeable 📈</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Enable bonding curve trading for this content.
                </div>
              </label>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., 'My amazing new video! #viral #fyp'"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                disabled={uploading || !connected}
                maxLength={500}
              />
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Uploading...</span>
                  <span className="text-emerald-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-700 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8">
            <button
              onClick={handleClose}
              className="w-full md:w-auto bg-zinc-700 text-white font-bold px-6 py-3 rounded-lg hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !connected || !selectedFile || !title.trim()}
              className="w-full md:w-auto bg-emerald-500 text-black font-bold px-6 py-3 rounded-lg hover:bg-emerald-600 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              {uploading ? 'Uploading...' : 'Upload & Create Market'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { CloseIcon, SendIcon, LoadingIcon } from './Icons';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { getVideoComments, addComment, Comment } from '@/lib/comment-service';

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, onClose, videoId, videoTitle }) => {
  const { account, connected } = useWallet();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && videoId) {
      loadComments();
    }
  }, [isOpen, videoId]);

  const loadComments = async () => {
    setIsLoading(true);
    const fetchedComments = await getVideoComments(videoId);
    setComments(fetchedComments);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !account) {
      alert('Please connect your wallet to comment');
      return;
    }

    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const comment = await addComment(videoId, account.address.toString(), newComment.trim());

    if (comment) {
      setComments([comment, ...comments]); // Add to top
      setNewComment('');
    }

    setIsSubmitting(false);
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div>
            <h2 className="text-xl font-bold text-white">Comments</h2>
            <p className="text-sm text-zinc-400">{videoTitle}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingIcon className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-500">No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-indigo-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {comment.user_id.slice(2, 4).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline space-x-2">
                    <span className="font-semibold text-white text-sm">
                      {formatWallet(comment.user_id)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-zinc-200 text-sm mt-1">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-700">
          {!connected ? (
            <div className="text-center py-3">
              <p className="text-zinc-400 text-sm">Connect your wallet to comment</p>
            </div>
          ) : (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:border-emerald-500 focus:outline-none"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <LoadingIcon className="w-6 h-6 animate-spin" />
                ) : (
                  <SendIcon className="w-6 h-6" />
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

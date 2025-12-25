import React, { useState, useEffect, useRef } from 'react';
import { useX402, X402Content } from '../../hooks/useX402';
import { LoadingIcon, LockIcon, PlayIcon, CommentIcon, SendIcon, CheckIcon } from '../Icons';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { supabase } from '../../lib/supabase';
import { CreatePremiumModal } from '../CreatePremiumModal';

interface PremiumContent {
    id: string;
    title: string;
    description: string;
    preview_url: string;
    video_url: string;
    price_amount: number;
    creator_id: string;
}

interface RoomMessage {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
}

export const ExplorePage: React.FC = () => {
    const { unlockContent, isLoading: isUnlocking, error: x402Error } = useX402();
    const { connected, account } = useWallet();

    // Data State
    const [items, setItems] = useState<PremiumContent[]>([]);
    const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
    const [loadingData, setLoadingData] = useState(true);

    // UI State
    const [activeRoom, setActiveRoom] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Chat State
    const [chatMessages, setChatMessages] = useState<RoomMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // 1. Fetch Content
    const fetchContent = async () => {
        setLoadingData(true);
        try {
            const { data: contentData } = await supabase
                .from('premium_content')
                .select('*')
                .order('created_at', { ascending: false });

            if (contentData) setItems(contentData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => { fetchContent(); }, []);

    // 2. Fetch Unlocked Access when wallet connects
    useEffect(() => {
        const fetchUnlocked = async () => {
            if (connected && account) {
                const userAddr = account.address.toString();
                // console.log("Fetching for:", userAddr);
                const { data: unlockedData, error } = await supabase
                    .from('unlocked_access')
                    .select('content_id')
                    .eq('user_id', userAddr);

                if (error) console.error("Fetch unlocks error:", error);

                if (unlockedData) {
                    setUnlockedIds(new Set(unlockedData.map((u: any) => u.content_id)));
                }
            } else {
                setUnlockedIds(new Set());
            }
        };
        fetchUnlocked();
    }, [connected, account]);

    // 3. Chat Subscription
    useEffect(() => {
        if (!activeRoom) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('room_messages')
                .select('*')
                .eq('room_id', activeRoom)
                .order('created_at', { ascending: true });

            if (data) setChatMessages(data);
        }
        fetchMessages();

        const channel = supabase
            .channel(`room_${activeRoom}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${activeRoom}` },
                (payload: any) => {
                    setChatMessages(prev => [...prev, payload.new as RoomMessage]);
                })
            .subscribe();

        return () => { supabase.removeChannel(channel); }

    }, [activeRoom]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleUnlock = async (item: PremiumContent) => {
        if (!connected || !account) {
            alert("Please connect your wallet first!");
            return;
        }

        try {
            const result = await unlockContent(`http://localhost:4402/api/premium/${item.id}?price=${item.price_amount}&recipient=${item.creator_id}`);

            if (result) {
                const { error } = await supabase.from('unlocked_access').insert({
                    user_id: account.address.toString(),
                    content_id: item.id,
                    tx_hash: '0x_demo_hash'
                });

                if (error) console.error("Unlock record error:", error);

                setUnlockedIds(prev => new Set(prev).add(item.id));
                setActiveRoom(item.id);
            }
        } catch (e) {
            console.error("Payment flow failed", e);
            alert("Unlock process failed. Please check console.");
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !activeRoom || !account) return;

        const { error } = await supabase.from('room_messages').insert({
            room_id: activeRoom,
            user_id: account.address.toString(),
            content: chatInput.trim()
        });

        if (!error) setChatInput('');
    };

    // --- RENDER ---

    if (activeRoom) {
        const item = items.find(i => i.id === activeRoom);

        return (
            <div className="w-full h-full flex flex-col bg-zinc-950 text-white">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-emerald-400">🟢 {item?.title} [LIVE ROOM]</h2>
                        <p className="text-zinc-500 text-sm">Room ID: {activeRoom.slice(0, 8)}...</p>
                    </div>
                    <button
                        onClick={() => setActiveRoom(null)}
                        className="text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded"
                    >
                        Exit Room
                    </button>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    <div className="flex-1 bg-black flex items-center justify-center p-4 overflow-y-auto">
                        <div className="w-full max-w-4xl aspect-video bg-zinc-900 rounded-lg overflow-hidden relative group shadow-2xl shadow-emerald-900/20">
                            <video
                                src={item?.video_url}
                                controls
                                autoPlay
                                className="w-full h-full"
                            />
                        </div>
                    </div>

                    <div className="w-full lg:w-96 border-l border-zinc-800 flex flex-col bg-zinc-900/50">
                        <div className="p-4 border-b border-zinc-800 font-bold flex items-center gap-2">
                            <CommentIcon className="w-5 h-5" />
                            <span>Premium Chat</span>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            <div className="bg-zinc-800 p-3 rounded-lg rounded-tl-none inline-block max-w-[90%]">
                                <p className="text-xs text-zinc-400 mb-1">System</p>
                                <p>Welcome to the premium room for {item?.title}! 👋</p>
                            </div>

                            {chatMessages.map(msg => (
                                <div key={msg.id} className="bg-zinc-800/80 p-3 rounded-lg rounded-tl-none inline-block max-w-[90%] break-words">
                                    <p className="text-xs text-zinc-400 mb-1">
                                        {msg.user_id.slice(0, 6)}...{msg.user_id.slice(-4)}
                                    </p>
                                    <p>{msg.content}</p>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800 relative">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full bg-zinc-800 border-none rounded-full px-4 py-3 pr-12 focus:ring-2 focus:ring-emerald-500"
                            />
                            <button type="submit" className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-emerald-400">
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-y-auto scrollbar-hide bg-zinc-900 p-4 md:p-8">
            <CreatePremiumModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchContent}
            />

            <div className="max-w-6xl mx-auto">
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                            Premium Workshops
                        </h1>
                        <p className="text-zinc-400 mt-2">Exclusive pay-to-watch content powered by Movement x402.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 py-2 rounded-xl transition-all hover:scale-105"
                    >
                        + Create Workshop
                    </button>
                </div>

                {x402Error && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/50 p-4 rounded-lg text-red-400">
                        Error: {x402Error}
                    </div>
                )}

                {loadingData && (
                    <div className="flex justify-center py-20">
                        <LoadingIcon className="w-10 h-10 animate-spin text-emerald-500" />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map(item => {
                        const isUnlocked = unlockedIds.has(item.id) || (connected && account && item.creator_id === account.address.toString());

                        return (
                            <div key={item.id} className="bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-700 hover:border-zinc-600 transition-all group shadow-lg">
                                <div className="aspect-video relative overflow-hidden bg-zinc-900">
                                    <img src={item.preview_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100" alt={item.title} />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        {isUnlocked ? (
                                            <div className="bg-emerald-500 rounded-full p-4 animate-pulse shadow-lg shadow-emerald-500/50">
                                                <PlayIcon className="w-8 h-8 text-black" />
                                            </div>
                                        ) : (
                                            <div className="bg-zinc-900/80 backdrop-blur-sm rounded-full p-4 border border-white/10">
                                                <LockIcon className="w-8 h-8 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold border border-emerald-500/30 text-emerald-400 shadow-lg">
                                        {(item.price_amount / 100000000).toFixed(2)} APT
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="text-xl font-bold mb-2 truncate">{item.title}</h3>
                                    <p className="text-zinc-400 text-sm mb-6 line-clamp-2 h-10">{item.description}</p>

                                    <button
                                        onClick={() => isUnlocked ? setActiveRoom(item.id) : handleUnlock(item)}
                                        disabled={isUnlocking && !isUnlocked}
                                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isUnlocked
                                                ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                                                : isUnlocking
                                                    ? 'bg-zinc-600 text-zinc-400 cursor-wait'
                                                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:opacity-90 hover:scale-[1.02] shadow-emerald-500/20'
                                            }`}
                                    >
                                        {isUnlocked ? (
                                            <>
                                                Enter Room
                                            </>
                                        ) : isUnlocking ? (
                                            <>
                                                <LoadingIcon className="w-5 h-5 animate-spin" />
                                                Confirming...
                                            </>
                                        ) : (
                                            <>
                                                Unlock Access
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
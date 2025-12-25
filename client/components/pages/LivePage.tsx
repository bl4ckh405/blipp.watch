// FORCE REFRESH - Fixed WebRTC Connection (Dummy Track)
import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { supabase } from '../../lib/supabase';
import { ViewersIcon, StarIcon, CloseIcon, SendIcon, GiftIcon, DiamondIcon, SparklesIcon, LoadingIcon } from '../Icons';
import Script from 'next/script';

interface LiveStream {
  id: string;
  creator: string;
  title: string;
  status: string;
  peer_id?: string;
  viewers: number;
}

interface ChatMessage {
  id: string;
  user_wallet: string;
  content: string;
  msg_type: 'chat' | 'gift';
  gift_amount?: number;
  created_at: string;
}

const generateThumbnail = async (videoBlob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      // Seek to 1s or beginning
      video.currentTime = 0.5;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Thumbnail extraction failed'));
        URL.revokeObjectURL(video.src);
      }, 'image/jpeg', 0.8);
    };
    
    video.onerror = (e) => reject(e);
  });
};

export const LivePage: React.FC = () => {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [viewMode, setViewMode] = useState<'lobby' | 'room'>('lobby');
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [activeStream, setActiveStream] = useState<LiveStream | null>(null);

  const [loading, setLoading] = useState(false);

  // Post-Stream Modal State
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [replayPrice, setReplayPrice] = useState(2); // Default 2 APT
  const [recordedBlobs, setRecordedBlobs] = useState<{ video: Blob, thumbnail: Blob } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Host Form
  const [streamTitle, setStreamTitle] = useState('');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Video State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerRef = useRef<any>(null);
  const [peerReady, setPeerReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Initializing...");

  // Recording State
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const isHost = activeStream?.creator === account?.address.toString();

  // --- LOBBY: Fetch Streams ---
  const fetchStreams = async () => {
    const { data } = await supabase
      .from('livestreams')
      .select('*')
      .eq('status', 'live')
      .order('created_at', { ascending: false });
    if (data) setStreams(data);
  };

  useEffect(() => {
    if (viewMode === 'lobby') {
      fetchStreams();
      const interval = setInterval(fetchStreams, 5000);
      return () => clearInterval(interval);
    }
  }, [viewMode]);

  // --- HOST: Go Live ---
  const goLive = async () => {
    if (!connected || !account || !streamTitle) {
      alert("Please connect wallet and enter a stream title.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('livestreams')
      .insert({
        creator: account.address.toString(),
        title: streamTitle,
        status: 'live'
      })
      .select()
      .single();

    if (error) {
      console.error("Go Live DB Error:", error);
      alert(`Failed to create stream. Error: ${error.message}\n\nPlease run the updated SQL schema.`);
      setLoading(false);
      return;
    }

    if (data) {
      setActiveStream(data);
      setViewMode('room');
    }
    setLoading(false);
  };

  // --- STREAMING LOGIC ---
  useEffect(() => {
    if (viewMode !== 'room' || !activeStream || !peerReady) return;

    const Peer = (window as any).Peer;
    if (!Peer) return;

    let myPeer: any;
    let pollInterval: any;

    const cleanup = () => {
      console.log("Cleaning up stream/peer...");
      if (pollInterval) clearInterval(pollInterval);
      if (myPeer) myPeer.destroy();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      if (remoteStream) setRemoteStream(null);
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const initHost = async () => {
      setConnectionStatus("Accessing Camera...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
        }
        startRecording(stream);

        setConnectionStatus("Registering P2P Network...");
        myPeer = new Peer();
        peerRef.current = myPeer;

        myPeer.on('open', (id: string) => {
          console.log('Host Peer ID:', id);
          setConnectionStatus("Live! Waiting for viewers...");
          supabase.from('livestreams').update({ peer_id: id }).eq('id', activeStream.id).then(res => {
            if (res.error) {
              console.error("Failed to update peer_id", res.error);
              setConnectionStatus("Database Error: Run SQL Script!");
              alert("Database Error: peer_id column missing. Run Schema Script.");
            }
          });
        });

        myPeer.on('call', (call: any) => {
          console.log("Viewer answering call...");
          call.answer(stream);
        });

        myPeer.on('error', (e: any) => setConnectionStatus("P2P Error: " + e.type));

      } catch (err: any) {
        console.error("Failed to get local stream", err);
        setConnectionStatus("Camera Error: " + err.message);
        alert("Camera access denied: " + err.message);
      }
    };

    const initViewer = () => {
      setConnectionStatus("Looking for Host Signal...");

      // Poll for Peer ID
      const checkPeerId = async () => {
        // First check activeStream object in case it was hydrated
        // Then poll DB
        console.log("Polling for Host ID...");
        const { data } = await supabase.from('livestreams').select('peer_id').eq('id', activeStream.id).single();

        if (data?.peer_id) {
          clearInterval(pollInterval); // Stop polling
          connectToHost(data.peer_id);
        }
      };

      pollInterval = setInterval(checkPeerId, 2000);
      checkPeerId(); // Initial check

      const connectToHost = (hostId: string) => {
        setConnectionStatus(`Host Found (${hostId.slice(0, 4)}...). Connecting...`);

        myPeer = new Peer();
        peerRef.current = myPeer;

        myPeer.on('open', () => {
          console.log("Viewer Peer Open. Calling Host:", hostId);

          // CREATE DUMMY TRACK to ensure negotiation works
          // Use Canvas for silent video track
          let dummyStream: MediaStream;
          try {
            const canvas = document.createElement('canvas'); // 0x0
            canvas.width = 1; canvas.height = 1;
            dummyStream = canvas.captureStream(10); // 10fps
          } catch (e) {
            // Fallback
            console.error("Canvas stream failed, using empty", e);
            dummyStream = new MediaStream();
          }

          const callObj = myPeer.call(hostId, dummyStream);

          callObj.on('stream', (hostStream: MediaStream) => {
            console.log("Received Host Stream!", hostStream);
            setConnectionStatus("Connected! Watch Stream.");
            setRemoteStream(hostStream);
            if (videoRef.current) {
              videoRef.current.srcObject = hostStream;
              videoRef.current.play().catch(e => console.error("Play error", e));
            }
          });

          callObj.on('close', () => setConnectionStatus("Stream Ended by Host"));
          callObj.on('error', (e: any) => {
            console.error("Call Error", e);
            setConnectionStatus("Connection Failed. Retrying...");
          });
        });

        myPeer.on('error', (err: any) => {
          console.error("Peer Error:", err);
          setConnectionStatus("P2P Error: " + err.type);
        });
      }
    };

    if (isHost) {
      initHost();
    } else {
      initViewer();
    }

    return cleanup;
  }, [viewMode, activeStream, isHost, peerReady]);

  // --- RECORDING LOGIC ---
  const startRecording = (stream: MediaStream) => {
    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        try {
          const thumbBlob = await generateThumbnail(blob);
          setRecordedBlobs({ video: blob, thumbnail: thumbBlob });
          setShowPricingModal(true); // Open modal instead of direct upload
        } catch (e) {
          console.error("Thumbnail gen failed", e);
          // Fallback? still show modal but maybe without thumbnail
          setRecordedBlobs({ video: blob, thumbnail: blob }); // Fallback to video blob (?) or skip
          setShowPricingModal(true);
        }
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (e) {
      console.error("Recording init error", e);
    }
  };

  const handlePublishReplay = async () => {
    if (!recordedBlobs || !activeStream || !account) return;
    setIsPublishing(true);
    
    try {
      const timestamp = Date.now();
      const videoFileName = `replays/${account.address.toString()}_${timestamp}.webm`;
      const thumbFileName = `thumbnails/${account.address.toString()}_${timestamp}.jpg`;

      // 1. Upload Video
      const { error: vidError } = await supabase.storage.from('videos').upload(videoFileName, recordedBlobs.video);
      if (vidError) throw vidError;

      // 2. Upload Thumbnail
      const { error: thumbError } = await supabase.storage.from('videos').upload(thumbFileName, recordedBlobs.thumbnail);
      // Ignore thumbnail error if minor?
      
      const videoUrl = supabase.storage.from('videos').getPublicUrl(videoFileName).data.publicUrl;
      const thumbUrl = thumbError ? videoUrl : supabase.storage.from('videos').getPublicUrl(thumbFileName).data.publicUrl;

      // 3. Insert Premium Content
      await supabase.from('premium_content').insert({
        creator_id: account.address.toString(),
        title: `Replay: ${activeStream.title}`,
        description: 'Live Stream Replay',
        video_url: videoUrl,
        preview_url: thumbUrl,
        price_amount: replayPrice * 100000000 // Convert APT to Octas
      });

      // 4. Cleanup
      setIsPublishing(false);
      await cleanUpAndClose();

    } catch (e: any) {
      console.error("Publish Error:", e);
      alert("Failed to publish replay: " + e.message);
      setIsPublishing(false);
    }
  };

  const cleanUpAndClose = async () => {
    if (activeStream) {
      await supabase.from('livestreams').update({ status: 'ended' }).eq('id', activeStream.id);
    }
    
    // Reset Everything
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    if (peerRef.current) peerRef.current.destroy();
    
    setActiveStream(null);
    setShowPricingModal(false);
    setRecordedBlobs(null);
    setViewMode('lobby');
  };

  // --- ROOM: End Stream ---
  // --- ROOM: End Stream ---
  const endStream = async () => {
    if (!activeStream) return;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // onstop will fire -> sets state -> shows modal
      setIsRecording(false);
    } else {
      // No recording, just exit
      cleanUpAndClose();
    }
  };

  // --- CHAT LOGIC ---
  useEffect(() => {
    if (!activeStream) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', activeStream.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();
    const channel = supabase.channel(`live_${activeStream.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `stream_id=eq.${activeStream.id}` },
        (payload: any) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); }
  }, [activeStream]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeStream || !connected || !account) return;
    await supabase.from('live_chat_messages').insert({
      stream_id: activeStream.id,
      user_wallet: account.address.toString(),
      content: chatInput.trim(),
      msg_type: 'chat'
    });
    setChatInput('');
  };

  const handleSendGift = async (label: string) => {
    if (!connected || !account || !activeStream) { alert("Connect wallet first!"); return; }

    let octas = 0;
    if (label === '10') octas = 1000000;
    if (label === '100') octas = 10000000;
    if (label === '500') octas = 50000000;

    try {
      const recipient = activeStream.creator;
      if (recipient === account.address.toString()) { alert("Cannot tip self!"); return; }

      await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [recipient, octas]
        }
      });

      await supabase.from('live_chat_messages').insert({
        stream_id: activeStream.id,
        user_wallet: account.address.toString(),
        content: `Sent ${label} Gems!`,
        msg_type: 'gift',
        gift_amount: parseInt(label)
      });
    } catch (e: any) {
      console.error("Gift failed:", e);
      alert("Gift failed. " + e.message);
    }
  };


  // --- VIEWS ---

  // Inject Script 
  const PeerScript = () => (
    <Script
      src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"
      onLoad={() => { console.log("PeerJS Loaded"); setPeerReady(true); }}
    />
  );


  if (viewMode === 'lobby') {
    return (
      <div className="w-full h-full bg-zinc-950 p-8 overflow-y-auto">
        <PeerScript />
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-4xl font-bold text-white">Live Channels 🔴</h1>
            {connected && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Stream Title..."
                  className="bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  value={streamTitle}
                  onChange={e => setStreamTitle(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={goLive}
                  disabled={loading}
                  className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-lg"
                >
                  {loading ? 'Starting...' : 'Go Live Now'}
                </button>
              </div>
            )}
          </div>

          {loading && streams.length === 0 && <div className="text-zinc-500">Loading channels...</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams.length === 0 && !loading && (
              <div className="text-zinc-500 col-span-3 text-center py-20">No active streams. Go Live!</div>
            )}
            {streams.map(stream => (
              <div
                key={stream.id}
                onClick={() => { setActiveStream(stream); setViewMode('room'); }}
                className="bg-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform group shadow-lg"
              >
                <div className="aspect-video bg-zinc-900 relative">
                  <div className="w-full h-full bg-black flex items-center justify-center text-zinc-600">
                    <div className="text-center">
                      <p className="font-bold text-rose-500 animate-pulse">LIVE SIGNAL</p>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded">LIVE</div>
                  <div className="absolute bottom-2 left-2 text-white font-bold">{stream.title}</div>
                </div>
                <div className="p-4 flex justify-between items-center bg-zinc-800">
                  <div className="text-sm text-zinc-400">by {stream.creator.slice(0, 6)}...</div>
                  <div className="flex items-center gap-1 text-rose-400 text-xs font-bold">
                    <ViewersIcon className="w-4 h-4" /> <span>{stream.viewers || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- ROOM VIEW ---
  if (!activeStream) return null;

  return (
    <div className="w-full h-[calc(100vh-64px)] md:h-full relative overflow-hidden bg-black flex flex-col md:flex-row">
      <PeerScript />
      {/* Main Video Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isHost} // Host mutes self
          className={`w-full h-full object-contain ${isHost ? 'mirror-mode' : ''}`}
        />

        {!isHost && !remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <LoadingIcon className="w-10 h-10 animate-spin mx-auto mb-2" />
              <p className="font-bold mb-2">{connectionStatus}</p>
              <p className="text-xs text-zinc-500">PeerJS {peerReady ? 'Ready' : 'Loading'}...</p>
            </div>
          </div>
        )}
        {/* ... Overlay UI remains same ... */}
        <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-start z-10">
          <div className="flex items-center gap-3">
            <div className="bg-rose-500 text-white font-bold px-3 py-1 rounded text-sm animate-pulse flex items-center gap-2">
              <span>LIVE</span>
              {isRecording && <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>}
            </div>
            <div>
              <h2 className="text-white font-bold shadow-black drop-shadow-md">{activeStream.title}</h2>
              <p className="text-zinc-300 text-xs shadow-black drop-shadow-md">Host: {activeStream.creator.slice(0, 8)}...</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isHost && (
              <button
                onClick={endStream}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-sm shadow-lg"
              >
                End Stream
              </button>
            )}
            <button onClick={() => { endStream(); }} className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm">
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Sidebar ... Same as before ... */}
      <div className="w-full md:w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col h-[40vh] md:h-full z-20">
        <div className="p-3 border-b border-zinc-800 font-bold text-white flex justify-between items-center bg-zinc-900">
          <span>Live Chat</span>
          {isHost && <span className="text-xs text-emerald-400 font-normal">Host Controls</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-900">
          {messages.map(msg => (
            <div key={msg.id} className="animate-fade-in-up">
              {msg.msg_type === 'gift' ? (
                <div className="bg-yellow-500/10 border border-yellow-500/50 p-2 rounded-lg text-yellow-300 text-sm font-bold flex items-center gap-2">
                  <GiftIcon className="w-4 h-4" />
                  <span>{msg.user_wallet.slice(0, 4)}... sent {msg.gift_amount} Gems!</span>
                </div>
              ) : (
                <div className="text-sm">
                  <span className={`font-bold mr-2 ${isHost && msg.user_wallet === account?.address.toString() ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {msg.user_wallet.slice(0, 6)}:
                  </span>
                  <span className="text-white break-words">{msg.content}</span>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="p-4 border-t border-zinc-800 space-y-3 bg-zinc-900">
          {!isHost && (
            <div className="flex justify-between gap-2">
              <button onClick={() => handleSendGift('10')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded flex flex-col items-center"><SparklesIcon className="w-5 h-5 text-pink-400" /></button>
              <button onClick={() => handleSendGift('100')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded flex flex-col items-center"><DiamondIcon className="w-5 h-5 text-cyan-400" /></button>
              <button onClick={() => handleSendGift('500')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded flex flex-col items-center"><GiftIcon className="w-5 h-5 text-yellow-400" /></button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="relative">
            <input type="text" disabled={!connected} value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." className="w-full bg-black/50 border border-zinc-700 rounded-full px-4 py-2 text-white" />
            <button type="submit" disabled={!chatInput} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-emerald-500"><SendIcon className="w-4 h-4" /></button>
          </form>
        </div>
      </div>
      {/* Modal for Pricing */}
      {showPricingModal && (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-2">Stream Ended!</h3>
            <p className="text-zinc-400 mb-6">Publish the replay to Explore? Set a price for viewers.</p>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-zinc-300 mb-2">Price (APT)</label>
              <input 
                type="number" 
                value={replayPrice} 
                onChange={e => setReplayPrice(parseFloat(e.target.value))}
                className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500"
                min="0"
                step="0.1"
              />
              <p className="text-xs text-emerald-400 mt-2">
                * Viewers will pay via x402 to access this replay.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={cleanUpAndClose}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold"
                disabled={isPublishing}
              >
                Discard
              </button>
              <button 
                onClick={handlePublishReplay}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                disabled={isPublishing}
              >
                {isPublishing ? <LoadingIcon className="w-5 h-5 animate-spin"/> : 'Publish Replay'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
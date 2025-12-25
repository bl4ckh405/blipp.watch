'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Video, TransactionStatus } from '../types';
import { CloseIcon, ChartBarIcon } from './Icons';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { getMarketInfo, getCurrentPrice, buyShares, aptToOctas, octasToApt, sharesToHuman, getUserShareBalance } from '@/lib/aptos-contract';
import { Account } from '@aptos-labs/ts-sdk';

// Bonding curve constants
const BONDING_CURVE_CONSTANTS = {
  CURVE_SUPPLY: 1000000000, // 1B tokens
  GRADUATION_THRESHOLD: 69000, // $69k market cap
};

// Calculate buy amount using bonding curve formula
const calculateBuyAmount = (amount: number, reserve1: number, reserve2: number) => {
  const k = reserve1 * reserve2;
  const newReserve1 = reserve1 + amount;
  const newReserve2 = k / newReserve1;
  const sharesOut = reserve2 - newReserve2;
  const pricePerShare = amount / sharesOut;
  return { sharesOut, pricePerShare };
};

// Calculate sell amount using bonding curve formula
const calculateSellAmount = (sharesToSell: number, reserve1: number, reserve2: number) => {
  const k = reserve1 * reserve2;
  const newReserve2 = reserve2 + sharesToSell;
  const newReserve1 = k / newReserve2;
  const aptOut = reserve1 - newReserve1;
  const pricePerShare = aptOut / sharesToSell;
  return { aptOut, pricePerShare };
};

// Get current price
const calculateCurrentPrice = (reserve1: number, reserve2: number) => {
  return reserve1 / reserve2;
};

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null;
}

const formatMarketNumber = (num: number): string => {
  if (num === null || num === undefined) return '$0';
  if (num < 1000) return `$${num.toFixed(0)}`;
  if (num < 1e6) return `$${(num / 1e3).toFixed(1)}K`;
  if (num < 1e9) return `$${(num / 1e6).toFixed(2)}M`;
  if (num < 1e12) return `$${(num / 1e9).toFixed(2)}B`;
  return `$${(num / 1e12).toFixed(2)}T`;
};

const StatItem: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = '' }) => (
  <div>
    <p className="text-sm text-zinc-400">{label}</p>
    <p className={`text-xl sm:text-2xl font-bold ${className}`}>{value}</p>
  </div>
);

const PriceChart: React.FC<{ data: number[] }> = ({ data }) => {
  const [viewRange, setViewRange] = useState<[number, number]>([0, data.length > 1 ? data.length - 1 : 1]);
  const [activePoint, setActivePoint] = useState<{ index: number; value: number; x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number, viewStart: number }>({ x: 0, viewStart: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { visibleData, min, max, range, isUp } = useMemo(() => {
    if (!data || data.length === 0) return { visibleData: [], min: 0, max: 0, range: 1, isUp: false };
    const [start, end] = viewRange;
    const sliced = data.slice(Math.floor(start), Math.ceil(end) + 1);
    const maxVal = Math.max(...sliced);
    const minVal = Math.min(...sliced);
    return {
      visibleData: sliced,
      max: maxVal,
      min: minVal,
      range: maxVal - minVal === 0 ? 1 : maxVal - minVal,
      isUp: sliced.length > 1 ? sliced[sliced.length - 1] > sliced[0] : false,
    };
  }, [data, viewRange]);

  const points = useMemo(() => {
    if (visibleData.length < 2) return '0,100 100,100';
    return visibleData.map((d, i) => {
      const x = (i / (visibleData.length - 1)) * 100;
      const y = 100 - ((d - min) / range) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }, [visibleData, min, range]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || visibleData.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (isPanning) {
      const dx = (e.clientX - panStartRef.current.x) / rect.width;
      const rangeWidth = viewRange[1] - viewRange[0];
      const panAmount = dx * rangeWidth;

      let newStart = panStartRef.current.viewStart - panAmount;
      newStart = Math.max(0, Math.min(newStart, data.length - rangeWidth - 1));

      setViewRange([newStart, newStart + rangeWidth]);
      return;
    }

    const percentX = x / rect.width;
    const indexInView = Math.round(percentX * (visibleData.length - 1));
    const dataIndex = Math.floor(viewRange[0]) + indexInView;
    const value = data[dataIndex];

    if (value !== undefined && visibleData.length > 1) {
      const y = 100 - ((value - min) / range) * 100;
      setActivePoint({ index: dataIndex, value, x: (indexInView / (visibleData.length - 1)) * 100, y });
    }
  }, [isPanning, viewRange, visibleData, data, min, range]);

  const handleMouseLeave = useCallback(() => {
    setActivePoint(null);
    if (isPanning) setIsPanning(false);
  }, [isPanning]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    const currentRangeWidth = viewRange[1] - viewRange[0];
    const change = currentRangeWidth * zoomFactor;

    let newStart = viewRange[0];
    let newEnd = viewRange[1];

    if (e.deltaY < 0) { // Zoom in
      if (currentRangeWidth <= 5) return; // Min zoom level
      newStart += change / 2;
      newEnd -= change / 2;
    } else { // Zoom out
      newStart -= change / 2;
      newEnd += change / 2;
    }

    newStart = Math.max(0, newStart);
    newEnd = Math.min(data.length - 1, newEnd);

    if (newStart < newEnd) setViewRange([newStart, newEnd]);

  }, [data.length, viewRange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, viewStart: viewRange[0] };
  };

  const handleMouseUp = () => setIsPanning(false);

  if (!data || data.length === 0) {
    return <div className="h-48 bg-zinc-800 rounded-lg flex items-center justify-center"><p className="text-zinc-500">No price data available.</p></div>;
  }

  const strokeColor = isUp ? '#34d399' : '#f87171';
  const gradientId = isUp ? 'chart-gradient-up' : 'chart-gradient-down';
  const cursorClass = isPanning ? 'cursor-grabbing' : 'cursor-crosshair';

  return (
    <div
      ref={containerRef}
      className={`relative h-48 ${cursorClass} select-none`}
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
      onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chart-gradient-up" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="chart-gradient-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={points} fill={`url(#${gradientId})`} stroke={strokeColor} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-0 grid grid-rows-4 pointer-events-none">
        {[...Array(4)].map((_, i) => <div key={i} className="border-b border-white/5 last:border-b-0"></div>)}
      </div>
      {activePoint && !isPanning && (
        <div className="absolute top-0 left-0 h-full w-full pointer-events-none" style={{ transform: `translateX(${activePoint.x}%)` }}>
          <div className="absolute w-px h-full bg-white/30"></div>
          <div className="absolute w-2.5 h-2.5 bg-zinc-900 rounded-full border-2" style={{ borderColor: strokeColor, top: `${activePoint.y}%`, transform: 'translate(-50%, -50%)' }} />
          <div className="absolute bg-zinc-800 border border-zinc-700 text-white text-xs font-bold p-1.5 rounded-md shadow-lg whitespace-nowrap" style={{ top: `${activePoint.y}%`, transform: `translate(10px, -50%)` }}>
            ${activePoint.value.toFixed(2)}
            <span className="text-zinc-400 ml-2">Day {activePoint.index + 1}</span>
          </div>
        </div>
      )}
    </div>
  );
};


export const MarketModal: React.FC<MarketModalProps> = ({ isOpen, onClose, video }) => {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [market, setMarket] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<string>('0');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState(0.1);
  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string>('');

  useEffect(() => {
    if (isOpen && video) {
      loadMarketData();
    }
  }, [isOpen, video]);

  const loadMarketData = async () => {
    if (!video) return;

    // Check if video is actually tradeable
    if (!video.isTradeable) {
      console.log('Video is not tradeable, skipping market load');
      return;
    }

    // Check if videoId exists (for blockchain operations)
    if (!video.videoId) {
      console.error('Video is missing videoId (original UUID) - cannot query market');
      setError('Unable to load market data: video ID not available');
      return;
    }

    try {
      const videoId = video.videoId; // Use original UUID, not converted number
      console.log('Loading market for video UUID:', videoId);
      const marketInfo = await getMarketInfo(videoId);

      if (marketInfo) {
        setMarket({
          ...marketInfo,
          aptosReserve: marketInfo.aptosReserve,
          tokenReserve: marketInfo.tokenReserve,
        });
        console.log('Market loaded successfully:', marketInfo);
      }

      // Fetch user's balance if connected
      if (account) {
        const balance = await getUserShareBalance(videoId, account.address.toString());
        setUserBalance(balance);
        console.log('User balance:', balance);
      }
    } catch (err: any) {
      console.error('Failed to load market:', err);

      // Check if it's a "market not found" error
      if (err.message?.includes('E_MARKET_NOT_FOUND')) {
        setError('Market not yet created for this video. The creator needs to initialize trading first.');
      } else {
        setError('Failed to load market data. Please try again.');
      }
    }
  };

  const handleBuy = async () => {
    if (!video || !connected || !account) return;

    // Check if videoId exists
    if (!video.videoId) {
      setError('Unable to buy: video ID not available');
      return;
    }

    setTxStatus('pending');
    setError(null);
    setTxHash('');

    try {
      const videoId = video.videoId; // Use original UUID
      console.log('Buying shares for video UUID:', videoId);
      const aptAmount = aptToOctas(amount);

      // Submit transaction using wallet adapter
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `0xe839b729a89575c5930c1691b6817de70ecfb4cc229268108ee8eba64a4da792::bonding_curve::buy_shares`,
          functionArguments: [videoId, aptAmount],
        },
      });

      if (response?.hash) {
        setTxHash(response.hash);
        setTxStatus('success');
        console.log('Buy transaction successful:', response.hash);
        // Reload market data after successful purchase
        setTimeout(() => loadMarketData(), 2000);
      }
    } catch (err: any) {
      setTxStatus('error');
      setError(err.message || 'Transaction failed');
      console.error('Buy failed:', err);
    }
  };

  const handleSell = async () => {
    if (!video || !connected || !account) return;

    // Check if videoId exists
    if (!video.videoId) {
      setError('Unable to sell: video ID not available');
      return;
    }

    // Check if user has shares to sell
    const userSharesHuman = parseFloat(userBalance) / 100000000;
    if (userSharesHuman === 0) {
      setError('You have no shares to sell');
      return;
    }

    setTxStatus('pending');
    setError(null);
    setTxHash('');

    try {
      const videoId = video.videoId; // Use original UUID
      console.log('Selling shares for video UUID:', videoId);
      // Convert amount (in APT worth) to number of shares to sell
      // For now, user inputs APT amount they want to receive
      const sharesToSell = Math.floor(amount * 100000000); // Convert to smallest units

      // Submit transaction using wallet adapter
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `0xe839b729a89575c5930c1691b6817de70ecfb4cc229268108ee8eba64a4da792::bonding_curve::sell_shares`,
          functionArguments: [videoId, sharesToSell.toString()],
        },
      });

      if (response?.hash) {
        setTxHash(response.hash);
        setTxStatus('success');
        console.log('Sell transaction successful:', response.hash);
        // Reload market data after successful sale
        setTimeout(() => loadMarketData(), 2000);
      }
    } catch (err: any) {
      setTxStatus('error');
      setError(err.message || 'Transaction failed');
      console.error('Sell failed:', err);
    }
  };

  // Convert reserves from octas/smallest units to human-readable
  // Token reserve is stored with DECIMALS (8 decimals)
  const DECIMALS = 100000000; // 10^8
  const tokenReserve = market ? parseFloat(market.tokenReserve) / DECIMALS : BONDING_CURVE_CONSTANTS.CURVE_SUPPLY;
  const aptosReserve = market ? octasToApt(market.aptosReserve) : 30; // Initial virtual reserve is 30 APT

  // Calculate current price: price = aptosReserve / tokenReserve
  const currentPrice = tokenReserve > 0 ? aptosReserve / tokenReserve : 0;

  // Calculate buy or sell based on trade type
  const buyResult = market && amount > 0 && tradeType === 'buy'
    ? calculateBuyAmount(amount, aptosReserve, tokenReserve)
    : null;

  const sellResult = market && amount > 0 && tradeType === 'sell'
    ? calculateSellAmount(amount, aptosReserve, tokenReserve)
    : null;

  // Shares out for buy, APT out for sell
  const sharesOut = buyResult?.sharesOut || 0;
  const aptReceived = sellResult?.aptOut || 0;

  // Price impact = (new price - current price) / current price * 100
  const priceImpact = tradeType === 'buy'
    ? (buyResult && currentPrice > 0
      ? ((buyResult.pricePerShare - currentPrice) / currentPrice) * 100
      : 0)
    : (sellResult && currentPrice > 0
      ? ((sellResult.pricePerShare - currentPrice) / currentPrice) * 100
      : 0);

  // Market cap = current price * total supply sold
  // Total supply = 1B tokens, sold = 1B - tokenReserve
  const totalSold = BONDING_CURVE_CONSTANTS.CURVE_SUPPLY - tokenReserve;
  const marketCap = currentPrice * totalSold;

  // Graduation progress based on real APT reserve (not virtual)
  // Graduation threshold is 69 APT of real reserves
  const realAptosReserve = aptosReserve - 30; // Subtract virtual 30 APT
  const graduationProgress = (realAptosReserve / 69) * 100;


  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 md:p-8 relative transform transition-all duration-300 scale-95 animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
          <CloseIcon className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-3 mb-6">
          <ChartBarIcon className="w-8 h-8 text-indigo-400" />
          <h2 className="text-2xl md:text-3xl font-bold">Post Market</h2>
        </div>

        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden relative bg-black">
            {video.videoUrl ? (
              <video
                src={video.videoUrl}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                onMouseOver={(e) => e.currentTarget.play()}
                onMouseOut={(e) => {
                  e.currentTarget.pause();
                  e.currentTarget.currentTime = 0;
                }}
              />
            ) : (
              <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="Post thumbnail" />
            )}
          </div>
          <div>
            <p className="text-base md:text-lg font-bold leading-tight line-clamp-2">{video.description}</p>
            <p className="text-sm text-zinc-400">by @{video.user.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 text-center">
          <StatItem label="Market Cap" value={formatMarketNumber(marketCap)} className="text-emerald-400" />
          <StatItem label="Price" value={currentPrice > 0 ? `$${currentPrice.toFixed(8)}` : '$0.00000000'} />
          <StatItem
            label="Your Shares"
            value={connected ? formatMarketNumber(parseFloat(userBalance) / 100000000) : '-'}
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">Graduation Progress</span>
            <span className="font-bold">{graduationProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${market?.graduated
                ? 'bg-linear-to-r from-emerald-400 to-green-500'
                : 'bg-linear-to-r from-indigo-500 to-purple-500'
                }`}
              style={{ width: `${Math.min(graduationProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>$0</span>
            <span className="text-emerald-400 font-semibold">$69k {market?.graduated && '✅'}</span>
          </div>
        </div>

        {txStatus === 'success' && txHash && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-lg p-3 mb-4">
            <p className="text-emerald-400 text-sm font-semibold">✓ Transaction successful!</p>
            <p className="text-emerald-300/70 text-xs mt-1 break-all">Hash: {txHash.slice(0, 16)}...{txHash.slice(-8)}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-zinc-800 rounded-lg p-4 mb-4">
          {/* Buy/Sell Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTradeType('buy')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${tradeType === 'buy'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                }`}
            >
              Buy
            </button>
            <button
              onClick={() => setTradeType('sell')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${tradeType === 'sell'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                }`}
            >
              Sell
            </button>
          </div>

          <label className="text-sm text-zinc-400 mb-2 block">
            {tradeType === 'buy' ? 'Amount (APT)' : 'Shares to Sell'}
          </label>
          <div className="relative mb-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-zinc-700 text-white px-4 py-3 rounded-lg text-lg font-semibold"
              min="0.01"
              step="0.1"
              placeholder="0.1"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">
              {tradeType === 'buy' ? 'APT' : 'Shares'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            {[0.1, 0.5, 1, 5].map(amt => (
              <button
                key={amt}
                onClick={() => setAmount(amt)}
                className="bg-zinc-700 hover:bg-zinc-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                {amt} USD
              </button>
            ))}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">
                {tradeType === 'buy' ? "You'll receive:" : "You'll get:"}
              </span>
              <span className="font-bold text-emerald-400">
                {tradeType === 'buy'
                  ? `${formatMarketNumber(sharesOut)} shares`
                  : `${aptReceived.toFixed(4)} APT`
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Price per share:</span>
              <span className="font-semibold">
                ${((tradeType === 'buy' ? buyResult?.pricePerShare : sellResult?.pricePerShare) || 0).toFixed(8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Price impact:</span>
              <span className={`font-semibold ${Math.abs(priceImpact) > 5 ? 'text-red-400' :
                Math.abs(priceImpact) > 2 ? 'text-yellow-400' :
                  'text-emerald-400'
                }`}>
                {priceImpact > 0 ? '+' : ''}{priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Platform fee (1%):</span>
              <span className="text-zinc-500">
                {tradeType === 'buy'
                  ? `${(amount * 0.01).toFixed(4)} APT`
                  : `${(aptReceived * 0.01).toFixed(4)} APT`
                }
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={tradeType === 'buy' ? handleBuy : handleSell}
          disabled={txStatus === 'pending' || !connected}
          className={`w-full font-bold text-lg py-4 rounded-lg transition-colors disabled:opacity-50 ${tradeType === 'buy'
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
        >
          {txStatus === 'pending'
            ? 'Processing...'
            : !connected
              ? 'Connect Wallet'
              : tradeType === 'buy'
                ? '🚀 Buy Shares'
                : '💰 Sell Shares'
          }
        </button>
      </div>
    </div>
  );
};



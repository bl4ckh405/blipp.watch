'use client'

import { useState } from 'react'
import { checkUsernameAvailable, createUser } from '@/lib/supabase-auth'

interface UsernameSetupProps {
  walletAddress: string
  onComplete: (username: string) => void
}

export function UsernameSetup({ walletAddress, onComplete }: UsernameSetupProps) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('Username must be 3-20 characters (letters, numbers, underscore only)')
      setLoading(false)
      return
    }

    try {
      const available = await checkUsernameAvailable(username)
      if (!available) {
        setError('Username already taken')
        setLoading(false)
        return
      }

      await createUser(walletAddress, username)
      onComplete(username)
    } catch (err) {
      setError('Failed to create account')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 relative transform transition-all duration-300 scale-95 animate-scale-in">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Choose Your Username</h2>
        <p className="text-zinc-400 mb-6">
          Your profile will be: <span className="font-mono font-bold text-white">{username || '___'}.blipp</span>
        </p>
        <p className="text-sm text-red-400 mb-4">⚠️ This username is permanent and cannot be changed</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="username"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4 disabled:opacity-50"
            maxLength={20}
            disabled={loading}
          />
          
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          
          <button
            type="submit"
            disabled={loading || !username}
            className="w-full bg-emerald-500 text-black font-bold py-3 rounded-lg hover:bg-emerald-600 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

-- ========================================
-- SIMPLIFIED MIGRATION FOR WALLET-BASED AUTH
-- Videos table schema:
--   id: UUID (text)
--   creator_id: TEXT (wallet address)
-- ========================================

-- ========================================
-- PART 1: VIDEOS TABLE RLS
-- ========================================

-- Enable RLS on videos table
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON videos;
DROP POLICY IF EXISTS "Anyone can create videos" ON videos;
DROP POLICY IF EXISTS "Anyone can update videos" ON videos;
DROP POLICY IF EXISTS "Anyone can delete videos" ON videos;

-- Policy: Anyone can view all videos (for public feed)
CREATE POLICY "Videos are viewable by everyone"
ON videos FOR SELECT
USING (true);

-- Policy: Anyone can insert videos (wallet-based, no auth required)
-- Ownership verification happens in application layer
CREATE POLICY "Anyone can create videos"
ON videos FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can update videos
-- Ownership verification happens in application layer (user-videos-service.ts)
CREATE POLICY "Anyone can update videos"
ON videos FOR UPDATE
USING (true);

-- Policy: Anyone can delete videos
-- Ownership verification happens in application layer (user-videos-service.ts)
CREATE POLICY "Anyone can delete videos"
ON videos FOR DELETE
USING (true);


-- ========================================
-- PART 2: STORAGE BUCKET POLICIES
-- ========================================

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- NOTE: storage.objects is a Supabase system table with RLS already enabled
-- We don't need to ALTER it - just create policies

-- Drop existing storage policies if they exist (idempotent)
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update videos in storage" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete videos from storage" ON storage.objects;

-- Policy: Anyone can view videos (public bucket)
CREATE POLICY "Videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- Policy: Anyone can upload videos
CREATE POLICY "Anyone can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos');

-- Policy: Anyone can update their video files
CREATE POLICY "Anyone can update videos in storage"
ON storage.objects FOR UPDATE
USING (bucket_id = 'videos');

-- Policy: Anyone can delete video files
CREATE POLICY "Anyone can delete videos from storage"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos');


-- ========================================
-- PART 3: HELPER FUNCTIONS
-- ========================================

-- Create function to increment video views
-- Accepts UUID because videos.id is UUID type
CREATE OR REPLACE FUNCTION increment_video_views(video_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos
  SET views = views + 1
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment video likes
-- Accepts UUID because videos.id is UUID type
CREATE OR REPLACE FUNCTION increment_video_likes(video_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos
  SET likes = likes + 1
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========================================
-- PART 4: PERFORMANCE INDEXES
-- ========================================

-- Add index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- Add index on is_tradeable for filtered queries
CREATE INDEX IF NOT EXISTS idx_videos_is_tradeable ON videos(is_tradeable);

-- Add index on creator_id for creator-specific queries
CREATE INDEX IF NOT EXISTS idx_videos_creator_id ON videos(creator_id);


-- ========================================
-- PART 5: GRANTS
-- ========================================

-- Grant necessary permissions
GRANT ALL ON videos TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_video_views(UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_video_likes(UUID) TO postgres, anon, authenticated, service_role;

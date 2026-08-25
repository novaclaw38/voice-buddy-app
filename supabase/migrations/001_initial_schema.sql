-- Buddy Tactical Academy: Full Site Schema
-- Supabase/PostgreSQL migration

-- Profiles table (Parents)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled')),
  payfast_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cadets table (Children)
CREATE TABLE IF NOT EXISTS cadets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  current_rank INT DEFAULT 1 CHECK (current_rank BETWEEN 1 AND 6),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  total_points INT DEFAULT 0,
  avatar_type TEXT DEFAULT 'bear',
  avatar_color TEXT DEFAULT '#7c3aed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storybooks table (AI-generated Sunday Storybooks)
CREATE TABLE IF NOT EXISTS storybooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadet_id UUID REFERENCES cadets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}',
  rank_at_time INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Curriculum progress table
CREATE TABLE IF NOT EXISTS curriculum_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadet_id UUID REFERENCES cadets(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cadet_id, module_id)
);

-- Rank names lookup
CREATE TABLE IF NOT EXISTS ranks (
  rank_level INT PRIMARY KEY,
  rank_name TEXT NOT NULL,
  description TEXT
);

INSERT INTO ranks (rank_level, rank_name, description) VALUES
  (1, 'Recruit', 'Basic training, safety, and discipline'),
  (2, 'Specialist', 'Focus on specific tactical skills'),
  (3, 'Corporal', 'Introduction to leadership and responsibility'),
  (4, 'Sergeant', 'Advanced problem solving'),
  (5, 'Lieutenant', 'Strategic thinking'),
  (6, 'Commander', 'Final evolution and graduation')
ON CONFLICT (rank_level) DO NOTHING;

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storybooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_progress ENABLE ROW LEVEL SECURITY;

-- Profiles: parents can only see their own profile
CREATE POLICY "Parents view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Parents update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Cadets: parents can manage their own cadets
CREATE POLICY "Parents view own cadets" ON cadets
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Parents insert cadets" ON cadets
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents update own cadets" ON cadets
  FOR UPDATE USING (auth.uid() = parent_id);

CREATE POLICY "Parents delete own cadets" ON cadets
  FOR DELETE USING (auth.uid() = parent_id);

-- Storybooks: access through cadet ownership
CREATE POLICY "Parents view cadet storybooks" ON storybooks
  FOR SELECT USING (
    cadet_id IN (SELECT id FROM cadets WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents insert cadet storybooks" ON storybooks
  FOR INSERT WITH CHECK (
    cadet_id IN (SELECT id FROM cadets WHERE parent_id = auth.uid())
  );

-- Curriculum progress: access through cadet ownership
CREATE POLICY "Parents view cadet progress" ON curriculum_progress
  FOR SELECT USING (
    cadet_id IN (SELECT id FROM cadets WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents insert cadet progress" ON curriculum_progress
  FOR INSERT WITH CHECK (
    cadet_id IN (SELECT id FROM cadets WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents update cadet progress" ON curriculum_progress
  FOR UPDATE USING (
    cadet_id IN (SELECT id FROM cadets WHERE parent_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cadets_parent_id ON cadets(parent_id);
CREATE INDEX IF NOT EXISTS idx_storybooks_cadet_id ON storybooks(cadet_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_cadet_id ON curriculum_progress(cadet_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_module ON curriculum_progress(module_id);

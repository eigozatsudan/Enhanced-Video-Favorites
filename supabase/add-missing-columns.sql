-- 既存のテーブルに不足しているカラムを追加するSQL
-- データを保持したまま修正したい場合に使用してください

-- 1. favoritesテーブルに不足しているカラムを追加
DO $$ 
BEGIN
    -- image_urlカラムが存在しない場合は追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'favorites' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE favorites ADD COLUMN image_url TEXT;
    END IF;
    
    -- tagsカラムが存在しない場合は追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'favorites' AND column_name = 'tags'
    ) THEN
        ALTER TABLE favorites ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
    
    -- categoryカラムが存在しない場合は追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'favorites' AND column_name = 'category'
    ) THEN
        ALTER TABLE favorites ADD COLUMN category TEXT;
    END IF;
    
    -- created_atカラムが存在しない場合は追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'favorites' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE favorites ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- updated_atカラムが存在しない場合は追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'favorites' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE favorites ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 2. 既存のデータのcreated_atとupdated_atを更新（NULLの場合）
UPDATE favorites 
SET created_at = NOW() 
WHERE created_at IS NULL;

UPDATE favorites 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- 3. テーブル構造を確認するクエリ（実行後に結果を確認）
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'favorites'
ORDER BY ordinal_position;
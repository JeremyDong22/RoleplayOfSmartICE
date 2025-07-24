-- 完全移除 storage 的所有限制 - 仅供内部使用
-- WARNING: 这将完全开放存储访问，不适合公开部署
-- Created: 2025-01-23

-- 1. 确保 bucket 存在且为公开
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'duty-manager-photos',
    'duty-manager-photos', 
    true, -- 公开访问
    52428800, -- 50MB
    NULL -- 允许所有文件类型
)
ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = NULL;

-- 2. 删除所有现有的 RLS 策略
DO $$
DECLARE
    pol record;
BEGIN
    -- 删除所有与 storage.objects 相关的策略
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 3. 创建完全开放的策略（允许所有操作）
CREATE POLICY "allow_all_select" ON storage.objects
FOR SELECT USING (true);

CREATE POLICY "allow_all_insert" ON storage.objects
FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update" ON storage.objects
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_delete" ON storage.objects
FOR DELETE USING (true);

-- 4. 确保 RLS 已启用（这是必需的，即使策略允许所有操作）
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- 5. 为 buckets 表也创建开放策略
DROP POLICY IF EXISTS "allow_all_buckets_select" ON storage.buckets;
DROP POLICY IF EXISTS "allow_all_buckets_insert" ON storage.buckets;
DROP POLICY IF EXISTS "allow_all_buckets_update" ON storage.buckets;
DROP POLICY IF EXISTS "allow_all_buckets_delete" ON storage.buckets;

CREATE POLICY "allow_all_buckets_select" ON storage.buckets
FOR SELECT USING (true);

CREATE POLICY "allow_all_buckets_insert" ON storage.buckets
FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_buckets_update" ON storage.buckets
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_buckets_delete" ON storage.buckets
FOR DELETE USING (true);

-- 6. 验证配置
SELECT 
    'Bucket Configuration:' as info,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'duty-manager-photos'
UNION ALL
SELECT 
    'Storage Policies:' as info,
    policyname,
    cmd::text,
    permissive::text,
    '', ''
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename IN ('objects', 'buckets')
AND policyname LIKE 'allow_all%';

-- 7. 成功消息
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✓ 存储限制已完全移除！';
    RAISE NOTICE '✓ 任何人都可以上传/下载/删除文件';
    RAISE NOTICE '✓ 没有认证要求';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '⚠️  警告：仅供内部测试使用！';
    RAISE NOTICE '⚠️  不要在生产环境使用此配置！';
    RAISE NOTICE '=====================================================';
END $$;
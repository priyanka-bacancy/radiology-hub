-- Run in SQL editor or via Supabase Dashboard > Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('dicoms', 'dicoms', false);

-- Storage RLS
CREATE POLICY "Authenticated users can upload dicoms"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dicoms');

CREATE POLICY "Institution members can read dicoms"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'dicoms');

INSERT INTO storage.buckets (id, name, public)
VALUES ('dicoms', 'dicoms', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "allow_authenticated_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dicoms');

CREATE POLICY "allow_authenticated_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dicoms');

# CloudRAD MVP — Codex Execution Plan

**Stack:** Next.js 14 (App Router) · Supabase · Tailwind · TypeScript  
**Scope:** DICOM Viewer (X-ray) · Study Management · Worklist · Auth · Reports · HL7  
**Target:** 5 hours / 6 phases

---

## Phase 1 — Scaffold + Supabase Setup (0:00–0:30)

### 1.1 Bootstrap project

```bash
npx create-next-app@latest cloudrad \
  --typescript --tailwind --app --src-dir \
  --import-alias '@/*'

cd cloudrad

npm install @supabase/supabase-js @supabase/ssr
npm install @cornerstonejs/core @cornerstonejs/tools @cornerstonejs/dicom-image-loader
npm install dicom-parser dcmjs
npm install hl7
npm install @tanstack/react-table

npx shadcn@latest init
npx shadcn@latest add button input label select badge table dialog toast
```

### 1.2 Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 1.3 Folder structure

```
src/
  app/
    (auth)/login/page.tsx
    (dashboard)/
      layout.tsx
      studies/
        page.tsx
        [id]/
          page.tsx
          view/page.tsx
          report/page.tsx
      worklist/page.tsx
      settings/page.tsx
    api/
      hl7/send/route.ts
      dicom/upload/route.ts
  components/
    viewer/DicomViewer.tsx
    viewer/ViewerToolbar.tsx
    viewer/SeriesThumbnails.tsx
    studies/StudyTable.tsx
    studies/UploadDropzone.tsx
    studies/StatusBadge.tsx
    reports/ReportEditor.tsx
    reports/TemplateSelector.tsx
    worklist/WorklistTable.tsx
    layout/Sidebar.tsx
    layout/TopBar.tsx
  lib/
    supabase/client.ts
    supabase/server.ts
    hl7/builder.ts
    dicom/cornerstone-init.ts
    dicom/metadata.ts
  hooks/useRole.ts
  types/database.ts
  middleware.ts
```

### 1.4 Supabase clients

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
      }
    }
  )
}
```

### 1.5 Route protection middleware

```ts
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) }
      }
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/studies', request.url))
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/public).*)'],
}
```

---

## Phase 2 — Database Schema (Run in Supabase SQL Editor)

### 2.1 Tables

```sql
-- institutions
CREATE TABLE institutions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  address    TEXT,
  phone      TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- users (extends auth.users)
CREATE TABLE users (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id),
  full_name      TEXT,
  role           TEXT CHECK (role IN ('admin','radiologist','clinician','technician')),
  specialization TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- auto-create user row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- patients
CREATE TABLE patients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  mrn            TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  date_of_birth  DATE,
  gender         TEXT CHECK (gender IN ('M','F','Other','Unknown')),
  phone          TEXT,
  email          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (institution_id, mrn)
);

-- studies
CREATE TABLE studies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID NOT NULL REFERENCES institutions(id),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  accession_number    TEXT,
  study_instance_uid  TEXT UNIQUE,
  modality            TEXT NOT NULL DEFAULT 'CR',
  body_part           TEXT,
  study_description   TEXT,
  study_date          TIMESTAMPTZ,
  referring_physician TEXT,
  status              TEXT DEFAULT 'unread'
    CHECK (status IN ('unread','in_progress','reported','verified','amended')),
  priority            TEXT DEFAULT 'routine'
    CHECK (priority IN ('stat','urgent','routine')),
  assigned_to         UUID REFERENCES users(id),
  num_series          INT DEFAULT 0,
  num_images          INT DEFAULT 0,
  storage_path        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studies_institution ON studies(institution_id);
CREATE INDEX idx_studies_patient     ON studies(patient_id);
CREATE INDEX idx_studies_status      ON studies(status);
CREATE INDEX idx_studies_assigned    ON studies(assigned_to);

-- series
CREATE TABLE series (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id            UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  series_instance_uid TEXT UNIQUE,
  series_number       INT,
  series_description  TEXT,
  modality            TEXT,
  num_images          INT DEFAULT 0,
  storage_path        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- images
CREATE TABLE images (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id        UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  study_id         UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  sop_instance_uid TEXT UNIQUE,
  instance_number  INT,
  storage_path     TEXT NOT NULL,
  file_size        BIGINT,
  rows             INT,
  columns          INT,
  bits_allocated   INT,
  photometric      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_images_series ON images(series_id);
CREATE INDEX idx_images_study  ON images(study_id);

-- reports
CREATE TABLE reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id         UUID UNIQUE NOT NULL REFERENCES studies(id),
  institution_id   UUID NOT NULL REFERENCES institutions(id),
  radiologist_id   UUID REFERENCES users(id),
  template_id      UUID,
  clinical_history TEXT,
  technique        TEXT,
  findings         TEXT NOT NULL DEFAULT '',
  impression       TEXT NOT NULL DEFAULT '',
  recommendation   TEXT,
  critical_finding BOOLEAN DEFAULT FALSE,
  status           TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','preliminary','final','amended','addendum')),
  signed_at        TIMESTAMPTZ,
  signed_by        UUID REFERENCES users(id),
  hl7_sent         BOOLEAN DEFAULT FALSE,
  hl7_sent_at      TIMESTAMPTZ,
  hl7_message_id   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- report_templates
CREATE TABLE report_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID REFERENCES institutions(id),
  name              TEXT NOT NULL,
  modality          TEXT,
  body_part         TEXT,
  technique_text    TEXT,
  findings_prompt   TEXT,
  impression_prompt TEXT,
  is_global         BOOLEAN DEFAULT FALSE,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- worklist_items
CREATE TABLE worklist_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id       UUID UNIQUE NOT NULL REFERENCES studies(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  assigned_to    UUID REFERENCES users(id),
  priority       TEXT DEFAULT 'routine'
    CHECK (priority IN ('stat','urgent','routine')),
  due_by         TIMESTAMPTZ,
  notes          TEXT,
  status         TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','on_hold')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worklist_assigned ON worklist_items(assigned_to);
CREATE INDEX idx_worklist_status   ON worklist_items(status, priority);

-- audit_logs
CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id),
  institution_id UUID REFERENCES institutions(id),
  action         TEXT NOT NULL,
  resource_type  TEXT,
  resource_id    UUID,
  ip_address     INET,
  metadata       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user     ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
```

### 2.2 Row Level Security

```sql
ALTER TABLE institutions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE series         ENABLE ROW LEVEL SECURITY;
ALTER TABLE images         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE worklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION current_institution_id()
RETURNS UUID AS $$
  SELECT institution_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Studies policies
CREATE POLICY studies_select ON studies FOR SELECT
  USING (institution_id = current_institution_id());

CREATE POLICY studies_insert ON studies FOR INSERT
  WITH CHECK (
    institution_id = current_institution_id()
    AND current_user_role() IN ('admin','technician','radiologist')
  );

CREATE POLICY studies_update ON studies FOR UPDATE
  USING (institution_id = current_institution_id())
  WITH CHECK (institution_id = current_institution_id());

-- Reports policies
CREATE POLICY reports_select ON reports FOR SELECT
  USING (institution_id = current_institution_id());

CREATE POLICY reports_write ON reports FOR ALL
  USING (
    institution_id = current_institution_id()
    AND current_user_role() IN ('admin','radiologist')
  )
  WITH CHECK (
    institution_id = current_institution_id()
    AND current_user_role() IN ('admin','radiologist')
  );

-- Worklist policies
CREATE POLICY worklist_select ON worklist_items FOR SELECT
  USING (
    institution_id = current_institution_id()
    AND (assigned_to = auth.uid() OR current_user_role() = 'admin')
  );

-- Patients, series, images — institution-scoped read
CREATE POLICY patients_select ON patients FOR SELECT
  USING (institution_id = current_institution_id());

CREATE POLICY series_select ON series FOR SELECT
  USING (study_id IN (SELECT id FROM studies WHERE institution_id = current_institution_id()));

CREATE POLICY images_select ON images FOR SELECT
  USING (study_id IN (SELECT id FROM studies WHERE institution_id = current_institution_id()));
```

### 2.3 Supabase Storage bucket

```sql
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
```

### 2.4 Seed templates

```sql
INSERT INTO report_templates (name, modality, body_part, is_global, technique_text, findings_prompt, impression_prompt) VALUES
(
  'Chest X-Ray PA',
  'CR', 'CHEST', TRUE,
  'Single PA view of the chest. No prior studies available for comparison.',
  'Trachea: Midline.
Lungs: [Air entry, consolidation, effusion, pneumothorax].
Heart: [Cardiothoracic ratio, cardiac borders].
Mediastinum: [Width, contour].
Bony thorax: [Ribs, clavicles, visible spine].
Diaphragm: [Domes, costophrenic angles].',
  '[Primary diagnosis]. [Secondary findings if any]. Clinical correlation advised.'
),
(
  'Abdomen X-Ray Supine',
  'CR', 'ABDOMEN', TRUE,
  'Supine AP view of the abdomen.',
  'Bowel gas pattern: [Normal/Distended].
Air-fluid levels: [Present/Absent, location].
Free air: [Present/Absent under diaphragm].
Calcifications: [Renal/Bladder/Vascular].
Soft tissue: [Psoas shadows, liver, spleen size].
Bony structures: [Lumbar spine, pelvis].',
  '[Primary finding]. [Recommendation for further imaging if indicated].'
),
(
  'Hand/Wrist X-Ray',
  'CR', 'HAND', TRUE,
  'PA and lateral views of the [right/left] hand/wrist.',
  'Bones: [Fracture/dislocation - location, type, displacement].
Joint spaces: [Preserved/Narrowed].
Soft tissues: [Swelling/Gas/Foreign body].
Bone density: [Normal/Osteopenic].',
  '[Fracture type + location] OR [No acute bony abnormality detected].'
);
```

---

## Phase 3 — Study Management + Worklist (0:30–1:45)

### 3.1 DICOM upload API route

```ts
// src/app/api/dicom/upload/route.ts
import { createClient } from '@/lib/supabase/server'
import dicomParser from 'dicom-parser'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('institution_id').eq('id', user.id).single()
  const institutionId = userData!.institution_id!

  const formData = await req.formData()
  const file = formData.get('file') as File
  const buffer = await file.arrayBuffer()

  // Parse DICOM tags
  const ds = dicomParser.parseDicom(new Uint8Array(buffer))
  const tag = (t: string) => { try { return ds.string(t) ?? '' } catch { return '' } }

  const patientName         = tag('x00100010').replace('^', ' ')
  const patientId           = tag('x00100020')
  const dob                 = tag('x00100030')
  const gender              = tag('x00100040')
  const studyUID            = tag('x0020000d')
  const seriesUID           = tag('x0020000e')
  const sopUID              = tag('x00080018')
  const modality            = tag('x00080060') || 'CR'
  const studyDate           = tag('x00080020')
  const bodyPart            = tag('x00180015')
  const studyDesc           = tag('x00081030')
  const accessionNumber     = tag('x00080050')
  const referringPhysician  = tag('x00080090')
  const seriesNumber        = parseInt(tag('x00200011') || '1')
  const instanceNumber      = parseInt(tag('x00200013') || '1')

  // Upload to storage
  const storagePath = `${institutionId}/${studyUID}/${seriesUID}/${sopUID}.dcm`
  const { error: uploadError } = await supabase.storage
    .from('dicoms')
    .upload(storagePath, file, { contentType: 'application/dicom', upsert: true })

  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

  // Upsert patient
  const { data: patient } = await supabase
    .from('patients')
    .upsert({ institution_id: institutionId, mrn: patientId || sopUID, full_name: patientName || 'Unknown',
              date_of_birth: dob || null, gender: gender || 'Unknown' },
             { onConflict: 'institution_id,mrn' })
    .select().single()

  // Upsert study
  const { data: study } = await supabase
    .from('studies')
    .upsert({ institution_id: institutionId, patient_id: patient!.id,
              study_instance_uid: studyUID, modality, body_part: bodyPart,
              study_description: studyDesc, accession_number: accessionNumber,
              referring_physician: referringPhysician,
              study_date: studyDate ? new Date(studyDate) : null,
              storage_path: `${institutionId}/${studyUID}` },
             { onConflict: 'study_instance_uid' })
    .select().single()

  // Upsert series
  const { data: seriesRow } = await supabase
    .from('series')
    .upsert({ study_id: study!.id, series_instance_uid: seriesUID,
              series_number: seriesNumber, modality,
              storage_path: `${institutionId}/${studyUID}/${seriesUID}` },
             { onConflict: 'series_instance_uid' })
    .select().single()

  // Insert image
  await supabase.from('images').upsert(
    { series_id: seriesRow!.id, study_id: study!.id,
      sop_instance_uid: sopUID, instance_number: instanceNumber,
      storage_path: storagePath },
    { onConflict: 'sop_instance_uid' }
  )

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id, institution_id: institutionId,
    action: 'upload_dicom', resource_type: 'study', resource_id: study!.id
  })

  return Response.json({ success: true, studyId: study!.id })
}
```

### 3.2 Studies page

```tsx
// src/app/(dashboard)/studies/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import StudyTable from '@/components/studies/StudyTable'
import UploadDropzone from '@/components/studies/UploadDropzone'

export default function StudiesPage() {
  const supabase = createClient()
  const [studies, setStudies] = useState<any[]>([])
  const [filters, setFilters] = useState({ status: '', modality: '', search: '' })

  const fetchStudies = useCallback(async () => {
    let q = supabase
      .from('studies')
      .select('*, patients(full_name, mrn), users!assigned_to(full_name)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filters.status)   q = q.eq('status', filters.status)
    if (filters.modality) q = q.eq('modality', filters.modality)

    const { data } = await q
    let results = data ?? []

    if (filters.search) {
      const s = filters.search.toLowerCase()
      results = results.filter((r: any) =>
        r.patients?.full_name?.toLowerCase().includes(s) ||
        r.patients?.mrn?.toLowerCase().includes(s)
      )
    }
    setStudies(results)
  }, [filters])

  useEffect(() => { fetchStudies() }, [fetchStudies])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Studies</h1>
        <UploadDropzone onUploaded={fetchStudies} />
      </div>
      <StudyTable studies={studies} filters={filters} onFilterChange={setFilters} />
    </div>
  )
}
```

### 3.3 Worklist with Realtime

```tsx
// src/app/(dashboard)/worklist/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const PRIORITY_COLOR = { stat: 'destructive', urgent: 'warning', routine: 'secondary' } as const

export default function WorklistPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return

    // Initial fetch
    supabase.from('worklist_items')
      .select('*, studies(*, patients(full_name, mrn))')
      .eq('assigned_to', userId)
      .neq('status', 'completed')
      .order('priority', { ascending: true })
      .then(({ data }) => setItems(data ?? []))

    // Realtime subscription
    const channel = supabase
      .channel('worklist-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'worklist_items',
        filter: `assigned_to=eq.${userId}`,
      }, payload => {
        if (payload.eventType === 'INSERT') setItems(p => [payload.new as any, ...p])
        if (payload.eventType === 'UPDATE') setItems(p => p.map(i => i.id === (payload.new as any).id ? payload.new : i))
        if (payload.eventType === 'DELETE') setItems(p => p.filter(i => i.id !== (payload.old as any).id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Worklist</h1>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="border rounded-lg p-4 flex items-center justify-between bg-white">
            <div>
              <p className="font-medium">{item.studies?.patients?.full_name}</p>
              <p className="text-sm text-slate-500">
                {item.studies?.modality} · {item.studies?.study_description} · MRN: {item.studies?.patients?.mrn}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={PRIORITY_COLOR[item.priority as keyof typeof PRIORITY_COLOR]}>
                {item.priority.toUpperCase()}
              </Badge>
              <Link href={`/studies/${item.studies?.id}/view`}
                className="bg-blue-700 text-white text-sm px-4 py-1.5 rounded">
                Open
              </Link>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-slate-400 text-center py-12">Worklist is clear</p>
        )}
      </div>
    </div>
  )
}
```

---

## Phase 4 — DICOM Viewer (1:45–2:45)

### 4.1 Cornerstone initialization

```ts
// src/lib/dicom/cornerstone-init.ts
let initialized = false

export async function initCornerstoneOnce() {
  if (initialized) return
  initialized = true

  const cs = await import('@cornerstonejs/core')
  const csTools = await import('@cornerstonejs/tools')
  const csLoader = await import('@cornerstonejs/dicom-image-loader')
  const dicomParser = await import('dicom-parser')

  csLoader.default.external.cornerstone = cs
  csLoader.default.external.dicomParser = dicomParser.default

  csLoader.default.configure({
    useWebWorkers: true,
    decodeConfig: { convertFloatPixelDataToInt: false },
  })

  await cs.init()
  await csTools.init()
}
```

### 4.2 DicomViewer component

```tsx
// src/components/viewer/DicomViewer.tsx
'use client'
import { useEffect, useRef, useCallback } from 'react'
import { RenderingEngine, Enums } from '@cornerstonejs/core'
import type { Types } from '@cornerstonejs/core'
import {
  ToolGroupManager, WindowLevelTool, ZoomTool, PanTool,
  LengthTool, AngleTool, ProbeTool, StackScrollMouseWheelTool,
  Enums as ToolEnums, addTool
} from '@cornerstonejs/tools'
import { initCornerstoneOnce } from '@/lib/dicom/cornerstone-init'

interface Props {
  imageIds: string[]
  studyId: string
  activeTool?: string
}

export default function DicomViewer({ imageIds, studyId, activeTool = 'WindowLevel' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<RenderingEngine | null>(null)
  const toolGroupId = `tg-${studyId}`

  useEffect(() => {
    if (!containerRef.current || imageIds.length === 0) return

    let engine: RenderingEngine

    async function setup() {
      await initCornerstoneOnce()

      // Register tools once
      ;[WindowLevelTool, ZoomTool, PanTool, LengthTool, AngleTool,
        ProbeTool, StackScrollMouseWheelTool].forEach(t => {
        try { addTool(t) } catch {}
      })

      engine = new RenderingEngine(`engine-${studyId}`)
      engineRef.current = engine

      const viewport = {
        viewportId: 'main',
        type: Enums.ViewportType.STACK,
        element: containerRef.current!,
        defaultOptions: { background: [0, 0, 0] as Types.Point3 },
      }
      engine.enableElement(viewport)

      const vp = engine.getViewport('main') as Types.IStackViewport
      await vp.setStack(imageIds, 0)
      vp.render()

      // Tool group
      let tg = ToolGroupManager.getToolGroup(toolGroupId)
      if (!tg) tg = ToolGroupManager.createToolGroup(toolGroupId)!

      tg.addTool(WindowLevelTool.toolName)
      tg.addTool(ZoomTool.toolName)
      tg.addTool(PanTool.toolName)
      tg.addTool(LengthTool.toolName)
      tg.addTool(AngleTool.toolName)
      tg.addTool(StackScrollMouseWheelTool.toolName)
      tg.addViewport('main', `engine-${studyId}`)

      tg.setToolActive(WindowLevelTool.toolName, {
        bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
      })
      tg.setToolActive(ZoomTool.toolName, {
        bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
      })
      tg.setToolActive(PanTool.toolName, {
        bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
      })
      tg.setToolActive(StackScrollMouseWheelTool.toolName)
    }

    setup()
    return () => { engine?.destroy() }
  }, [imageIds, studyId])

  // Switch active tool
  useEffect(() => {
    const tg = ToolGroupManager.getToolGroup(toolGroupId)
    if (!tg) return
    const toolMap: Record<string, string> = {
      'WindowLevel': WindowLevelTool.toolName,
      'Zoom': ZoomTool.toolName,
      'Pan': PanTool.toolName,
      'Length': LengthTool.toolName,
      'Angle': AngleTool.toolName,
    }
    const toolName = toolMap[activeTool]
    if (toolName) {
      tg.setToolActive(toolName, {
        bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
      })
    }
  }, [activeTool, toolGroupId])

  return <div ref={containerRef} className="w-full h-full bg-black rounded" />
}
```

### 4.3 Viewer toolbar with W/L presets

```tsx
// src/components/viewer/ViewerToolbar.tsx
'use client'

const TOOLS = ['WindowLevel', 'Pan', 'Zoom', 'Length', 'Angle'] as const
const WL_PRESETS: Record<string, { ww: number; wc: number }> = {
  'Default':     { ww: 255,  wc: 128  },
  'Soft Tissue': { ww: 400,  wc: 40   },
  'Lung':        { ww: 1500, wc: -600 },
  'Bone':        { ww: 2000, wc: 400  },
  'Brain':       { ww: 80,   wc: 40   },
}

interface Props {
  activeTool: string
  onToolChange: (tool: string) => void
  onPresetChange: (ww: number, wc: number) => void
  onReset: () => void
  onInvert: () => void
}

export default function ViewerToolbar({ activeTool, onToolChange, onPresetChange, onReset, onInvert }: Props) {
  return (
    <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 flex-wrap">
      {TOOLS.map(t => (
        <button key={t} onClick={() => onToolChange(t)}
          className={`px-3 py-1.5 text-sm rounded ${activeTool === t ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
          {t}
        </button>
      ))}
      <div className="w-px h-6 bg-slate-600 mx-1" />
      <select onChange={e => {
        const p = WL_PRESETS[e.target.value]
        if (p) onPresetChange(p.ww, p.wc)
      }} className="bg-slate-700 text-slate-200 text-sm rounded px-2 py-1.5">
        {Object.keys(WL_PRESETS).map(name => (
          <option key={name}>{name}</option>
        ))}
      </select>
      <button onClick={onReset}
        className="px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded">
        Reset
      </button>
      <button onClick={onInvert}
        className="px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded">
        Invert
      </button>
    </div>
  )
}
```

### 4.4 Viewer page

```tsx
// src/app/(dashboard)/studies/[id]/view/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import ViewerToolbar from '@/components/viewer/ViewerToolbar'

// Cornerstone3D must not SSR
const DicomViewer = dynamic(() => import('@/components/viewer/DicomViewer'), { ssr: false })

export default function ViewerPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [imageIds, setImageIds] = useState<string[]>([])
  const [activeTool, setActiveTool] = useState('WindowLevel')

  useEffect(() => {
    async function loadImages() {
      const { data: imgs } = await supabase
        .from('images')
        .select('storage_path, instance_number')
        .eq('study_id', params.id)
        .order('instance_number')

      if (!imgs) return

      // Get signed URLs for each image
      const ids = await Promise.all(imgs.map(async img => {
        const { data } = await supabase.storage
          .from('dicoms')
          .createSignedUrl(img.storage_path, 3600)
        return data ? `wadouri:${data.signedUrl}` : null
      }))

      setImageIds(ids.filter(Boolean) as string[])
    }
    loadImages()
  }, [params.id])

  return (
    <div className="flex flex-col h-screen bg-black">
      <ViewerToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onPresetChange={(ww, wc) => { /* apply via cornerstone viewport ref */ }}
        onReset={() => {}}
        onInvert={() => {}}
      />
      <div className="flex-1">
        {imageIds.length > 0
          ? <DicomViewer imageIds={imageIds} studyId={params.id} activeTool={activeTool} />
          : <div className="flex items-center justify-center h-full text-slate-400">Loading images...</div>
        }
      </div>
    </div>
  )
}
```

---

## Phase 5 — Auth + RBAC (2:45–3:30)

### 5.1 Login page

```tsx
// src/app/(auth)/login/page.tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const { error } = await supabase.auth.signInWithPassword({
      email: fd.get('email') as string,
      password: fd.get('password') as string,
    })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/studies')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleLogin} className="bg-white border rounded-xl p-8 w-full max-w-sm space-y-4 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-800">CloudRAD</h1>
          <p className="text-slate-500 text-sm mt-1">Cloud Radiology Platform</p>
        </div>
        {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</p>}
        <input name="email" type="email" placeholder="Email" required
          className="w-full border rounded-lg px-3 py-2.5 text-sm" />
        <input name="password" type="password" placeholder="Password" required
          className="w-full border rounded-lg px-3 py-2.5 text-sm" />
        <button type="submit" disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
```

### 5.2 Role hook

```ts
// src/hooks/useRole.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Role = 'admin' | 'radiologist' | 'clinician' | 'technician' | null

export function useRole() {
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      supabase.from('users').select('role').eq('id', user.id).single()
        .then(({ data }) => { setRole((data?.role ?? null) as Role); setLoading(false) })
    })
  }, [])

  return {
    role,
    loading,
    isRadiologist: role === 'radiologist' || role === 'admin',
    isAdmin: role === 'admin',
    canSign: role === 'radiologist' || role === 'admin',
    canUpload: ['admin', 'radiologist', 'technician'].includes(role ?? ''),
  }
}
```

### 5.3 Dashboard layout with sidebar

```tsx
// src/app/(dashboard)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
```

```tsx
// src/components/layout/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/studies',  label: 'Studies' },
  { href: '/worklist', label: 'Worklist' },
  { href: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  const router = useRouter()

  return (
    <aside className="w-56 bg-slate-900 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-700">
        <span className="text-white font-bold text-lg">CloudRAD</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href}
            className={`block px-3 py-2 rounded text-sm ${pathname.startsWith(href) ? 'bg-blue-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
            {label}
          </Link>
        ))}
      </nav>
      <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
        className="px-5 py-4 text-left text-sm text-slate-400 hover:text-white border-t border-slate-700">
        Sign Out
      </button>
    </aside>
  )
}
```

---

## Phase 6 — Reports + HL7 (3:30–4:30)

### 6.1 Report editor

```tsx
// src/components/reports/ReportEditor.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/hooks/useRole'
import { Badge } from '@/components/ui/badge'

interface Props {
  studyId: string
  patientName: string
  modality: string
  bodyPart?: string
}

const FIELDS = [
  { key: 'clinical_history', label: 'Clinical History', rows: 2 },
  { key: 'technique',        label: 'Technique',        rows: 2 },
  { key: 'findings',         label: 'Findings',         rows: 8 },
  { key: 'impression',       label: 'Impression',       rows: 4 },
  { key: 'recommendation',   label: 'Recommendation',   rows: 2 },
] as const

export default function ReportEditor({ studyId, patientName, modality, bodyPart }: Props) {
  const supabase = createClient()
  const { canSign } = useRole()
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const [status, setStatus] = useState<'draft' | 'preliminary' | 'final'>('draft')
  const [saving, setSaving] = useState(false)
  const [signingOff, setSigningOff] = useState(false)
  const [report, setReport] = useState({
    clinical_history: '', technique: '',
    findings: '', impression: '', recommendation: '',
    critical_finding: false,
  })

  // Load existing report
  useEffect(() => {
    supabase.from('reports').select('*').eq('study_id', studyId).single()
      .then(({ data }) => {
        if (data) {
          setReport({
            clinical_history: data.clinical_history ?? '',
            technique: data.technique ?? '',
            findings: data.findings ?? '',
            impression: data.impression ?? '',
            recommendation: data.recommendation ?? '',
            critical_finding: data.critical_finding ?? false,
          })
          setStatus(data.status as any)
        }
      })
  }, [studyId])

  // Auto-save with debounce
  function handleChange(key: string, value: string | boolean) {
    const next = { ...report, [key]: value }
    setReport(next)
    if (status === 'final') return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('reports').upsert(
        { study_id: studyId, ...next, radiologist_id: user!.id,
          status: 'draft', updated_at: new Date().toISOString() },
        { onConflict: 'study_id' }
      )
      setSaving(false)
    }, 1500)
  }

  async function handleSign() {
    setSigningOff(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('reports').upsert(
      { study_id: studyId, ...report, radiologist_id: user!.id,
        status: 'final', signed_at: new Date().toISOString(), signed_by: user!.id,
        updated_at: new Date().toISOString() },
      { onConflict: 'study_id' }
    )
    await supabase.from('studies').update({ status: 'reported' }).eq('id', studyId)
    await fetch('/api/hl7/send', {
      method: 'POST',
      body: JSON.stringify({ studyId }),
      headers: { 'Content-Type': 'application/json' }
    })
    setStatus('final')
    setSigningOff(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-800">{patientName}</p>
          <p className="text-sm text-slate-500">{modality} {bodyPart && `· ${bodyPart}`}</p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-slate-400">Saving...</span>}
          <Badge variant={status === 'final' ? 'default' : 'secondary'}>
            {status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {FIELDS.map(({ key, label, rows }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
          <textarea rows={rows}
            disabled={status === 'final'}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-none disabled:bg-slate-50 disabled:text-slate-500"
            value={(report as any)[key]}
            onChange={e => handleChange(key, e.target.value)}
          />
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-red-600 font-medium text-sm cursor-pointer">
          <input type="checkbox"
            checked={report.critical_finding}
            disabled={status === 'final'}
            onChange={e => handleChange('critical_finding', e.target.checked)}
            className="w-4 h-4"
          />
          Critical Finding — notify referring physician
        </label>
        {canSign && status !== 'final' && (
          <button onClick={handleSign} disabled={signingOff}
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {signingOff ? 'Signing...' : 'Sign & Finalise'}
          </button>
        )}
      </div>
    </div>
  )
}
```

### 6.2 HL7 ORU^R01 builder + API route

```ts
// src/lib/hl7/builder.ts
export interface HL7Params {
  messageId: string
  patientId: string
  patientName: string
  dob?: string
  gender?: string
  accessionNumber?: string
  modality: string
  findings: string
  impression: string
  recommendation?: string
  radiologistName: string
  signedAt: string
  studyDate?: string
}

export function buildORUR01(p: HL7Params): string {
  const fmt = (d: string) => d ? new Date(d).toISOString().replace(/[-:T.Z]/g, '').slice(0, 14) : ''
  const dt = fmt(p.signedAt)
  const dob = p.dob ? p.dob.replace(/-/g, '') : ''
  const escape = (s: string) => s.replace(/\|/g, '\\F\\').replace(/\n/g, '\\X000d\\')

  return [
    `MSH|^~\\&|CLOUDRAD|HOSPITAL|RIS|HIS|${dt}||ORU^R01^ORU_R01|${p.messageId}|P|2.5|||NE|AL|USA|UNICODE UTF-8`,
    `PID|1||${p.patientId}^^^HOSP^MR||${escape(p.patientName)}||${dob}|${p.gender ?? 'U'}`,
    `OBR|1|${p.accessionNumber ?? ''}||${p.modality}^${p.modality} Examination|||${fmt(p.studyDate ?? p.signedAt)}||||||||${p.radiologistName}|||${dt}|||F`,
    `OBX|1|TX|59776-5^Procedure Findings^LN||${escape(p.findings)}||||||F|||${dt}`,
    `OBX|2|TX|19005-8^Radiology Report Impression^LN||${escape(p.impression)}||||||F|||${dt}`,
    p.recommendation ? `OBX|3|TX|18783-1^Recommendation^LN||${escape(p.recommendation)}||||||F|||${dt}` : null,
    `ZDS|${p.radiologistName}|${dt}|FINAL`,
  ].filter(Boolean).join('\r')
}
```

```ts
// src/app/api/hl7/send/route.ts
import { createClient } from '@/lib/supabase/server'
import { buildORUR01 } from '@/lib/hl7/builder'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { studyId } = await req.json()

  const { data: report } = await supabase
    .from('reports')
    .select(`*, studies(*, patients(*), users!assigned_to(full_name))`)
    .eq('study_id', studyId)
    .single()

  if (!report) return Response.json({ error: 'Report not found' }, { status: 404 })

  const study   = (report as any).studies
  const patient = study?.patients
  const rad     = study?.users

  const messageId = `MSG-${Date.now()}-${studyId.slice(0, 8)}`
  const hl7Message = buildORUR01({
    messageId,
    patientId:       patient?.mrn ?? '',
    patientName:     patient?.full_name ?? '',
    dob:             patient?.date_of_birth,
    gender:          patient?.gender,
    accessionNumber: study?.accession_number,
    modality:        study?.modality ?? 'CR',
    findings:        report.findings,
    impression:      report.impression,
    recommendation:  report.recommendation,
    radiologistName: rad?.full_name ?? 'Unknown Radiologist',
    signedAt:        report.signed_at ?? new Date().toISOString(),
    studyDate:       study?.study_date,
  })

  // Log to audit
  await supabase.from('audit_logs').insert({
    action: 'hl7_sent',
    resource_type: 'report',
    resource_id: report.id,
    metadata: { hl7_message: hl7Message, message_id: messageId }
  })

  // Mark sent on report
  await supabase.from('reports').update({
    hl7_sent: true,
    hl7_sent_at: new Date().toISOString(),
    hl7_message_id: messageId,
  }).eq('id', report.id)

  return Response.json({ success: true, messageId, hl7: hl7Message })
}
```

---

## Phase 7 — Polish + Deploy (4:30–5:00)

### 7.1 Seed demo data

```ts
// scripts/seed.ts
// Run: npx ts-node -e "require('./scripts/seed')"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // service role to bypass RLS
)

async function seed() {
  // 1. Create institutions
  const hospitals = ['Apollo Ahmedabad', 'CIMS Hospital', 'SAL Hospital']
  for (const name of hospitals) {
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const { data: inst } = await supabase
      .from('institutions')
      .insert({ name, slug })
      .select().single()

    // 2. Create demo users via Supabase Auth
    const roles = ['radiologist', 'clinician'] as const
    for (const role of roles) {
      const email = `${role}@${slug}.demo`
      const { data: authUser } = await supabase.auth.admin.createUser({
        email, password: 'Demo@1234', email_confirm: true,
        user_metadata: { full_name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}` }
      })
      if (authUser.user) {
        await supabase.from('users').update({ institution_id: inst!.id, role })
          .eq('id', authUser.user.id)
      }
    }

    console.log(`Seeded: ${name}`)
  }
}

seed()

// Sample DICOM files: https://www.dicomserver.co.uk/
// Download CXR and hand samples, upload via the UI
```

### 7.2 Vercel deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set env vars in Vercel dashboard or via CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Add Vercel URL to Supabase Auth:
# Dashboard > Authentication > URL Configuration
# Site URL: https://cloudrad-xxx.vercel.app
# Redirect URLs: https://cloudrad-xxx.vercel.app/**
```

### 7.3 next.config.ts (required for Cornerstone3D)

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false }
    // Required for cornerstone3D workers
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' },
    })
    return config
  },
  // Allow Supabase storage domain for images
  images: {
    remotePatterns: [{ hostname: '*.supabase.co' }],
  },
}

export default nextConfig
```

---

## Feature Checklist

| # | Feature | File | Done |
|---|---------|------|------|
| 1 | DICOM upload | `api/dicom/upload/route.ts` | ☐ |
| 2 | Study list + search | `studies/page.tsx` | ☐ |
| 3 | Worklist + realtime | `worklist/page.tsx` | ☐ |
| 4 | DICOM viewer (X-ray) | `components/viewer/DicomViewer.tsx` | ☐ |
| 5 | W/L presets toolbar | `components/viewer/ViewerToolbar.tsx` | ☐ |
| 6 | Length + angle tools | Built into DicomViewer | ☐ |
| 7 | Login page | `(auth)/login/page.tsx` | ☐ |
| 8 | Route protection | `middleware.ts` | ☐ |
| 9 | Role-based access | `hooks/useRole.ts` + RLS | ☐ |
| 10 | Institution scoping | RLS policies | ☐ |
| 11 | Structured report editor | `components/reports/ReportEditor.tsx` | ☐ |
| 12 | Report sign + status flow | ReportEditor → sign button | ☐ |
| 13 | HL7 ORU^R01 generation | `lib/hl7/builder.ts` | ☐ |
| 14 | HL7 audit logging | `api/hl7/send/route.ts` | ☐ |
| 15 | Seed data | `scripts/seed.ts` | ☐ |
| 16 | Deploy to Vercel | `vercel --prod` | ☐ |

---

## Risk & Fallbacks

| Risk | Fallback |
|------|----------|
| Cornerstone3D webpack issues | Use `dynamic(() => import(...), { ssr: false })` — already in viewer page |
| DICOM parse fails | Add try/catch in upload route; allow manual metadata entry form |
| Supabase signed URL expiry | Regenerate on each viewer page load (1hr TTL) |
| HL7 too complex | Return JSON from `/api/hl7/send` and display raw in UI — still demonstrates the architecture |
| No real DICOM files | Download samples: `dicomserver.co.uk` or `rubomedical.com/datashare` |

---

## Codex Prompt Suggestions

Use these prompts to delegate each phase:

```
Phase 2: "Create all Supabase tables, RLS policies, and storage bucket config
from the schema in cloudrad_mvp.md. Output as a single SQL file."

Phase 3: "Implement the DICOM upload API route and StudyTable component
exactly as specified in cloudrad_mvp.md Phase 3."

Phase 4: "Build the DicomViewer and ViewerToolbar components from cloudrad_mvp.md.
Use dynamic import with ssr:false for Cornerstone3D."

Phase 5: "Create the login page, useRole hook, and dashboard layout with sidebar
from cloudrad_mvp.md Phase 5."

Phase 6: "Implement ReportEditor with auto-save and sign flow, plus the HL7
ORU^R01 builder and API route from cloudrad_mvp.md Phase 6."
```

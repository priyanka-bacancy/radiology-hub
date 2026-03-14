'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const DicomViewer = dynamic(
  () => import('@/components/viewer/DicomViewer'),
  { 
    ssr: false,
    loading: () => (
      <div style={{
        width: '100%', height: '100%', background: '#000',
        display: 'flex', alignItems: 'center', 
        justifyContent: 'center', color: '#666', fontSize: '14px'
      }}>
        Loading viewer...
      </div>
    )
  }
)

export default function ViewerPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = createClient()
  const [imageIds, setImageIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Step 1: Wait for component to mount before 
  // rendering Cornerstone3D
  useEffect(() => {
    setMounted(true)
  }, [])

  // Step 2: Fetch images only after mounted
  useEffect(() => {
    if (!mounted) return

    async function loadImages() {
      setLoading(true)
      setImageIds([])

      const { data: imgs } = await supabase
        .from('images')
        .select('storage_path, instance_number')
        .eq('study_id', params.id)
        .order('instance_number')

      if (!imgs || imgs.length === 0) {
        console.log('No images found for study:', params.id)
        setLoading(false)
        return
      }

      console.log('Found images:', imgs.length)

      const ids = await Promise.all(
        imgs.map(async img => {
          const { data } = await supabase.storage
            .from('dicoms')
            .createSignedUrl(img.storage_path, 3600)
          if (!data?.signedUrl) return null
          return `wadouri:${data.signedUrl}`
        })
      )

      const validIds = ids.filter((id): id is string => id !== null)
      console.log('Valid imageIds:', validIds.length)
      setImageIds(validIds)
      setLoading(false)
    }

    loadImages()
  }, [params.id, mounted])

  return (
    <div style={{ height: '100vh', background: '#000' }}>
      {!mounted || loading ? (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#000',
          flexDirection: 'column', gap: '12px'
        }}>
          <div style={{
            width: '32px', height: '32px',
            border: '2px solid rgba(255,255,255,0.1)',
            borderTop: '2px solid #1a6cff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span style={{ color: '#666', fontSize: '13px' }}>
            Loading images...
          </span>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      ) : imageIds.length === 0 ? (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#000',
          color: '#666', fontSize: '14px',
          flexDirection: 'column', gap: '8px'
        }}>
          <span>No images found for this study</span>
          <span style={{ fontSize: '12px', color: '#444' }}>
            Study ID: {params.id}
          </span>
        </div>
      ) : (
        <DicomViewer
          key={params.id}
          imageIds={imageIds}
          studyId={params.id}
        />
      )}
    </div>
  )
}

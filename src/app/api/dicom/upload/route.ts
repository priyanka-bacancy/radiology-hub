import { createClient } from '@/lib/supabase/server'
import dicomParser from 'dicom-parser'

console.log('=== UPLOAD ROUTE LOADED ===')

export async function POST(req: Request) {
  console.log('=== UPLOAD ROUTE HIT ===')
  console.log('=== UPLOAD START ===')

  try {
    const supabase = await createClient()

    console.log('Step 1: parsing formdata')
    const formData = await req.formData()

    console.log('Step 2: getting file')
    const file = formData.get('file') as File
    console.log('Step 3: file name:', file?.name, 'size:', file?.size)

    const { data: { user } } = await supabase.auth.getUser()
    console.log('Step 4: auth user:', user?.id)
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()
    console.log('Step 5: user institution lookup:', userData, userError?.message)

    const institutionId = (userData as any)?.institution_id
    if (!institutionId) {
      return Response.json({ error: 'No institution_id found for current user' }, { status: 400 })
    }

    if (!file) {
      return Response.json({ error: 'Missing file' }, { status: 400 })
    }

    console.log('Step 6: reading file arrayBuffer')
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    let ds: ReturnType<typeof dicomParser.parseDicom> | null = null
    try {
      console.log('Step 7: parsing dicom')
      ds = dicomParser.parseDicom(bytes)
    } catch (error) {
      console.error('Step 7 failed: dicom parse error', error)
      ds = null
    }

    const safeTag = (tag: string, fallback = '') => {
      try {
        if (!ds) return fallback
        return ds.string(tag) ?? fallback
      } catch {
        return fallback
      }
    }

    const now = Date.now()
    const patientName = safeTag('x00100010', '').replace(/\^/g, ' ') || 'Unknown Patient'
    const mrn = safeTag('x00100020', '') || `MRN-${now}`
    const gender = safeTag('x00100040', '') || 'Unknown'
    const studyUID = safeTag('x0020000d', '') || `study-${now}`
    const seriesUID = safeTag('x0020000e', '') || `series-${now}`
    const sopUID = safeTag('x00080018', '') || `sop-${now}`
    const modality = safeTag('x00080060', '') || 'CR'
    const bodyPart = safeTag('x00180015', '')
    const studyDescription = safeTag('x00081030', '')
    const accessionNumber = safeTag('x00080050', '')
    const referringPhysician = safeTag('x00080090', '')
    const seriesNumber = Number.parseInt(safeTag('x00200011', '1'), 10) || 1
    const instanceNumber = Number.parseInt(safeTag('x00200013', '1'), 10) || 1
    console.log('Step 8: parsed/fallback identifiers:', {
      patientName,
      mrn,
      studyUID,
      seriesUID,
      sopUID,
      modality,
    })

    const baseName = file.name.replace(/\.[^/.]+$/, '') || `upload-${now}`
    const filename = `${baseName}.dcm`
    const storagePath = `${institutionId}/${studyUID}/${seriesUID}/${filename}`
    console.log('Step 9: upload path:', storagePath)

    const { error: uploadError } = await supabase.storage
      .from('dicoms')
      .upload(storagePath, file, { contentType: 'application/dicom', upsert: true })
    console.log('Step 10: upload result:', uploadError?.message ?? 'ok')

    if (uploadError) {
      console.error('Upload storage error:', uploadError)
      return Response.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .upsert(
        {
          institution_id: institutionId,
          mrn,
          full_name: patientName || 'Unknown Patient',
          gender: gender || 'Unknown',
        },
        { onConflict: 'institution_id,mrn' }
      )
      .select()
      .single()
    console.log('Step 11: patient upsert:', patient?.id, patientError?.message)
    if (patientError || !patient) {
      throw new Error(patientError?.message || 'Failed to upsert patient')
    }

    const { data: study, error: studyError } = await supabase
      .from('studies')
      .upsert(
        {
          institution_id: institutionId,
          patient_id: patient.id,
          assigned_to: user.id,
          study_instance_uid: studyUID,
          modality,
          body_part: bodyPart || null,
          study_description: studyDescription || null,
          accession_number: accessionNumber || null,
          referring_physician: referringPhysician || null,
          status: 'unread',
          priority: 'routine',
          storage_path: `${institutionId}/${studyUID}`,
        },
        { onConflict: 'study_instance_uid' }
      )
      .select()
      .single()
    console.log('Step 12: study upsert:', study?.id, studyError?.message)
    if (studyError || !study) {
      throw new Error(studyError?.message || 'Failed to upsert study')
    }

    const { data: seriesRow, error: seriesError } = await supabase
      .from('series')
      .upsert(
        {
          study_id: study.id,
          series_instance_uid: seriesUID,
          series_number: seriesNumber,
          series_description: 'Series 1',
          modality,
          storage_path: `${institutionId}/${studyUID}/${seriesUID}`,
        },
        { onConflict: 'series_instance_uid' }
      )
      .select()
      .single()
    console.log('Step 13: series upsert:', seriesRow?.id, seriesError?.message)
    if (seriesError || !seriesRow) {
      throw new Error(seriesError?.message || 'Failed to upsert series')
    }

    const { error: imageError } = await supabase
      .from('images')
      .upsert(
        {
          series_id: seriesRow.id,
          study_id: study.id,
          sop_instance_uid: sopUID,
          instance_number: instanceNumber,
          storage_path: storagePath,
        },
        { onConflict: 'sop_instance_uid' }
      )
    console.log('Step 14: image upsert:', imageError?.message ?? 'ok')
    if (imageError) {
      throw new Error(imageError.message)
    }

    console.log('Step 15: success', study.id)
    return Response.json({ success: true, studyId: study.id })
  } catch (error) {
    console.error('=== UPLOAD FATAL ERROR ===', error)
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 })
  }
}

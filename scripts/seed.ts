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

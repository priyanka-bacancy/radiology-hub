export async function GET() {
  return Response.json({ status: 'API working' })
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    return Response.json({
      status: 'POST working',
      hasFile: !!file,
      fileName: file instanceof File ? file.name : 'no file',
      fileSize: file instanceof File ? file.size : 0
    })
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'unknown',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 })
  }
}

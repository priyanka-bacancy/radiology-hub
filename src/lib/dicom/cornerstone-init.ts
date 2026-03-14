let initialized = false
let initPromise: Promise<void> | null = null

export async function initCornerstoneOnce(): Promise<void> {
  if (initialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      console.log('CS Step 1: import core')
      const cs = await import('@cornerstonejs/core')

      console.log('CS Step 2: import tools')
      const csTools = await import('@cornerstonejs/tools')

      console.log('CS Step 3: import dicom-parser')
      const dicomParserModule = await import('dicom-parser')
      const dicomParser = dicomParserModule.default ?? dicomParserModule

      console.log('CS Step 4: import dicom image loader')
      const loaderModule = await import('@cornerstonejs/dicom-image-loader')
      
      console.log('CS Step 5: log all exports of loader module:')
      console.log('loaderModule keys:', Object.keys(loaderModule))
      console.log('loaderModule.default:', loaderModule.default)
      console.log('loaderModule.external:', (loaderModule as any).external)
      console.log('loaderModule.default?.external:', (loaderModule as any).default?.external)

      console.log('CS Step 6: init core first')
      await cs.init()

      console.log('CS Step 7: init tools')
      await csTools.init()

      console.log('CS Step 8: register image loaders using cs.imageLoader')
      console.log('cs.imageLoader:', cs.imageLoader)
      console.log('loaderModule.wadouri:', (loaderModule as any).wadouri)
      console.log('loaderModule.default?.wadouri:', (loaderModule as any).default?.wadouri)

      const loader = (loaderModule as any)
      const wadouri = loader.wadouri ?? loader.default?.wadouri
      const wadors = loader.wadors ?? loader.default?.wadors

      if (wadouri?.loadImage) {
        cs.imageLoader.registerImageLoader('wadouri', wadouri.loadImage)
        console.log('wadouri loader registered ✓')
      } else {
        console.error('wadouri.loadImage not found in module')
      }

      if (wadors?.loadImage) {
        cs.imageLoader.registerImageLoader('wadors', wadors.loadImage)
        console.log('wadors loader registered ✓')
      }

      console.log('CS Step 9: init web worker loader (if available)')
      const loaderModuleAny = loaderModule as any
      const loaderInit = loaderModuleAny.init ?? loaderModuleAny.default?.init
      if (loaderInit) {
        await loaderInit({
          maxWebWorkers: 1,
          startWebWorkersOnDemand: true,
          webWorkerPath: '/cornerstoneWADOImageLoaderWebWorker.min.js',
          taskConfiguration: {
            decodeTask: {
              initializeCodecsOnStartup: true,
              usePDFJS: false,
              strict: false,
            },
          },
        })
        console.log('web worker loader initialized ✓')
      } else {
        console.warn('loader.init not found; skipping web worker setup')
      }

      initialized = true
      console.log('CS Init COMPLETE ✓')
    } catch (err) {
      initPromise = null
      initialized = false
      console.error('CS Init FAILED:', err)
      throw err
    }
  })()

  return initPromise
}

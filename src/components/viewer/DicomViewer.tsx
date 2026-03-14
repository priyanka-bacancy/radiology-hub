'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  imageIds: string[]
  studyId: string
}

export default function DicomViewer({ imageIds, studyId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<any>(null)
  const toolGroupRef = useRef<any>(null)
  const engineIdRef = useRef<string>(`engine-${studyId}-${Date.now()}`)
  const toolGroupIdRef = useRef<string>(`tg-${studyId}-${Date.now()}`)
  const [activeTool, setActiveTool] = useState('WindowLevel')
  const [ww, setWw] = useState(255)
  const [wl, setWl] = useState(128)

  const PRESETS: Record<string, { ww: number; wl: number }> = {
    'Default':      { ww: 255,  wl: 128  },
    'Soft Tissue':  { ww: 400,  wl: 40   },
    'Lung':         { ww: 1500, wl: -600 },
    'Bone':         { ww: 2000, wl: 400  },
    'Brain':        { ww: 80,   wl: 40   },
  }

  useEffect(() => {
    if (!containerRef.current || imageIds.length === 0) return
    let cancelled = false

    async function setup() {
      await new Promise(resolve => setTimeout(resolve, 100))
      if (cancelled || !containerRef.current) return

      try {
        const { initCornerstoneOnce } = await import('@/lib/dicom/cornerstone-init')
        await initCornerstoneOnce()
        if (cancelled) return

        const cs = await import('@cornerstonejs/core')
        const csTools = await import('@cornerstonejs/tools')
        if (cancelled) return

        const engineId = engineIdRef.current
        const toolGroupId = toolGroupIdRef.current

        // Create rendering engine
        const engine = new cs.RenderingEngine(engineId)
        engineRef.current = engine

        // Enable element
        engine.enableElement({
          viewportId: 'main',
          type: cs.Enums.ViewportType.STACK,
          element: containerRef.current!,
          defaultOptions: {
            background: [0, 0, 0] as [number, number, number],
          },
        })

        // Set stack
        const viewport = engine.getViewport('main') as any
        await viewport.setStack(imageIds, 0)
        viewport.render()

        // Register all tools globally (ignore if already registered)
        const toolsToRegister = [
          csTools.WindowLevelTool,
          csTools.ZoomTool,
          csTools.PanTool,
          csTools.LengthTool,
          csTools.AngleTool,
          csTools.ProbeTool,
          // csTools.StackScrollMouseWheelTool,
          csTools.StackScrollTool,
        ].filter(Boolean)

        toolsToRegister.forEach(tool => {
          try { csTools.addTool(tool) } catch {}
        })

        // Create tool group
        let toolGroup = csTools.ToolGroupManager.getToolGroup(toolGroupId)
        if (toolGroup) {
          csTools.ToolGroupManager.destroyToolGroup(toolGroupId)
        }
        toolGroup = csTools.ToolGroupManager.createToolGroup(toolGroupId)!

        // Add all tools to group
        const toolNames = [
          'WindowLevel', 'Zoom', 'Pan', 'Length',
          'Angle', 'Probe', 'StackScrollMouseWheel'
        ]

        toolNames.forEach(name => {
          try {
            toolGroup.addTool(name)
            console.log('Added tool:', name)
          } catch (err) {
            console.log('Tool already added:', name)
          }
        })

        // Add viewport BEFORE setting tool states
        toolGroup.addViewport('main', engineId)
        console.log('Viewport added to tool group')

        // Set WindowLevel as default active on left click
        toolGroup.setToolActive('WindowLevel', {
          bindings: [{ mouseButton: 1 }],
        })

        // Set Zoom on right click
        toolGroup.setToolActive('Zoom', {
          bindings: [{ mouseButton: 2 }],
        })

        // Set Pan on middle click
        toolGroup.setToolActive('Pan', {
          bindings: [{ mouseButton: 4 }],
        })

        // Set scroll wheel
        toolGroup.setToolActive('StackScrollMouseWheel', {
          bindings: [],
        })

        // Set annotation tools as passive (visible but not active)
        toolGroup.setToolPassive('Length')
        toolGroup.setToolPassive('Angle')
        toolGroup.setToolPassive('Probe')

        toolGroupRef.current = toolGroup
        console.log('Tool group setup complete')

        console.log('Tool group tools:', 
          toolGroup.getToolInstances()
        )

      } catch (err) {
        console.error('DicomViewer setup failed:', err)
      }
    }

    setup()

    return () => {
      cancelled = true
      try {
        const { ToolGroupManager } = require('@cornerstonejs/tools')
        ToolGroupManager.destroyToolGroup(toolGroupIdRef.current)
      } catch {}
      try { engineRef.current?.destroy() } catch {}
    }
  }, [imageIds, studyId])

  // Switch active tool on left mouse button
  function switchTool(toolName: string) {
    if (!toolGroupRef.current) {
      console.error('No tool group available')
      return
    }

    console.log('Switching to tool:', toolName)
    setActiveTool(toolName)

    try {
      // Step 1: Disable the current active tool from 
      // primary mouse button by setting it to passive
      const currentTools = [
        'WindowLevel', 'Zoom', 'Pan', 
        'Length', 'Angle', 'Probe'
      ]
      
      currentTools.forEach(t => {
        try {
          const toolInstance = toolGroupRef.current.getToolInstance(t)
          if (toolInstance) {
            toolGroupRef.current.setToolPassive(t)
          }
        } catch {}
      })

      // Step 2: Set the new tool as active on left click
      toolGroupRef.current.setToolActive(toolName, {
        bindings: [
          { mouseButton: 1 } // Left mouse button
        ],
      })

      // Step 3: Always keep these on secondary bindings
      try {
        toolGroupRef.current.setToolActive('Zoom', {
          bindings: [
            { mouseButton: toolName === 'Zoom' ? 1 : 2 }
          ],
        })
      } catch {}

      try {
        toolGroupRef.current.setToolActive('Pan', {
          bindings: [
            { mouseButton: toolName === 'Pan' ? 1 : 4 }
          ],
        })
      } catch {}

      // Step 4: Always keep scroll wheel active
      try {
        toolGroupRef.current.setToolActive(
          'StackScrollMouseWheel', 
          { bindings: [] }
        )
      } catch {}

      console.log('Tool switched successfully to:', toolName)
    } catch (err) {
      console.error('switchTool failed:', err)
    }
  }

  // Apply W/L preset
  function applyPreset(presetName: string) {
    const preset = PRESETS[presetName]
    if (!preset || !engineRef.current) return
    try {
      const viewport = engineRef.current.getViewport('main')
      viewport.setProperties({
        voiRange: {
          lower: preset.wl - preset.ww / 2,
          upper: preset.wl + preset.ww / 2,
        }
      })
      viewport.render()
      setWw(preset.ww)
      setWl(preset.wl)
    } catch (err) {
      console.error('Preset failed:', err)
    }
  }

  // Reset viewport
  function handleReset() {
    if (!engineRef.current) return
    try {
      const viewport = engineRef.current.getViewport('main')
      viewport.resetCamera()
      viewport.resetProperties()
      viewport.render()
    } catch {}
  }

  // Invert colors
  function handleInvert() {
    if (!engineRef.current) return
    try {
      const viewport = engineRef.current.getViewport('main')
      const { invert } = viewport.getProperties()
      viewport.setProperties({ invert: !invert })
      viewport.render()
    } catch {}
  }

  const tools = [
    { name: 'WindowLevel', label: 'W/L',    shortcut: 'W' },
    { name: 'Pan',         label: 'Pan',    shortcut: 'P' },
    { name: 'Zoom',        label: 'Zoom',   shortcut: 'Z' },
    { name: 'Length',      label: 'Length', shortcut: 'L' },
    { name: 'Angle',       label: 'Angle',  shortcut: 'A' },
  ]

  if (imageIds.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100%', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#666', fontSize: '14px'
      }}>
        No images found for this study
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000' }}>

      {/* TOOLBAR */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexWrap: 'wrap',
      }}>

        {/* Tool buttons */}
        {tools.map(tool => (
          <button
            key={tool.name}
            onClick={() => switchTool(tool.name)}
            title={`${tool.label} (${tool.shortcut})`}
            style={{
              padding: '5px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              border: activeTool === tool.name
                ? '1px solid rgba(26,108,255,0.6)'
                : '1px solid transparent',
              background: activeTool === tool.name
                ? 'rgba(26,108,255,0.2)'
                : 'rgba(255,255,255,0.06)',
              color: activeTool === tool.name ? '#60a5fa' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.15s',
            }}
          >
            {tool.label}
          </button>
        ))}

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        {/* Presets */}
        <select
          onChange={e => applyPreset(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '6px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '12px',
            padding: '5px 8px',
            cursor: 'pointer',
          }}
        >
          {Object.keys(PRESETS).map(p => (
            <option key={p} value={p} style={{ background: '#1a2035' }}>{p}</option>
          ))}
        </select>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        {/* Reset */}
        <button
          onClick={handleReset}
          style={{
            padding: '5px 14px', borderRadius: '6px', fontSize: '12px',
            fontWeight: 500, cursor: 'pointer',
            border: '1px solid transparent',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          Reset
        </button>

        {/* Invert */}
        <button
          onClick={handleInvert}
          style={{
            padding: '5px 14px', borderRadius: '6px', fontSize: '12px',
            fontWeight: 500, cursor: 'pointer',
            border: '1px solid transparent',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          Invert
        </button>

        {/* W/L readout */}
        <div style={{
          marginLeft: 'auto',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'monospace',
        }}>
          W:{ww} L:{wl}
        </div>
      </div>

      {/* VIEWPORT */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          background: '#000',
          cursor: activeTool === 'Pan' ? 'grab'
            : activeTool === 'Zoom' ? 'zoom-in'
            : activeTool === 'Length' || activeTool === 'Angle' ? 'crosshair'
            : 'default',
        }}
        onContextMenu={e => e.preventDefault()}
      />

      {/* HINT BAR */}
      <div style={{
        padding: '4px 12px',
        background: 'rgba(0,0,0,0.6)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.3)',
        display: 'flex',
        gap: '20px',
      }}>
        <span>Left click: {activeTool}</span>
        <span>Right click: Zoom</span>
        <span>Middle click: Pan</span>
        <span>Scroll: Navigate slices</span>
      </div>
    </div>
  )
}

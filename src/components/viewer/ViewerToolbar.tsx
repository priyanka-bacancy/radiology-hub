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

interface SliderProps {
  name: string
  unit?: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  format?: (v: number) => string
}

export function Slider({ name, unit, min, max, step = 1, value, onChange, format }: SliderProps) {
  const shown = format ? format(value) : String(value)
  return (
    <label className="slider">
      <span className="slider-head">
        <span className="name">{name}</span>
        <span className="value">
          {shown}
          {unit ? ` ${unit}` : ''}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

interface ReadoutProps {
  label: string
  value: string
  unit?: string
}

export function Readout({ label, value, unit }: ReadoutProps) {
  return (
    <div className="readout">
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit && <small>{unit}</small>}
      </div>
    </div>
  )
}

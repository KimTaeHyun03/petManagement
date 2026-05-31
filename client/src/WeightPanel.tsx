import { useState } from 'react'
import { type Pet } from './api'
import './WeightPanel.css'

interface Props {
  pets: Pet[]
}

interface WeightEntry {
  date: string
  weight: number
}

const MOCK_WEIGHT_DATA: WeightEntry[] = [
  { date: '2025-05-28', weight: 4.2 },
  { date: '2025-05-14', weight: 4.0 },
  { date: '2025-04-30', weight: 3.9 },
  { date: '2025-04-16', weight: 4.1 },
  { date: '2025-04-02', weight: 4.3 },
]

function WeightChart({ data }: { data: WeightEntry[] }) {
  if (data.length === 0) return null

  const WIDTH = 400
  const HEIGHT = 120
  const PAD_LEFT = 36
  const PAD_RIGHT = 12
  const PAD_TOP = 12
  const PAD_BOTTOM = 28

  const weights = data.map((d) => d.weight)
  const minW = Math.min(...weights) - 0.3
  const maxW = Math.max(...weights) + 0.3

  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM

  function xPos(i: number) {
    return PAD_LEFT + (i / (data.length - 1)) * innerW
  }

  function yPos(w: number) {
    return PAD_TOP + innerH - ((w - minW) / (maxW - minW)) * innerH
  }

  const points = data.map((d, i) => `${xPos(i)},${yPos(d.weight)}`).join(' ')

  // Y-axis labels: 3 ticks
  const yTicks = [minW, (minW + maxW) / 2, maxW]

  return (
    <div className="weight-chart">
      <svg
        className="weight-chart-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              y1={yPos(tick)}
              x2={WIDTH - PAD_RIGHT}
              y2={yPos(tick)}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="4,3"
            />
            <text
              x={PAD_LEFT - 4}
              y={yPos(tick) + 4}
              textAnchor="end"
              className="weight-axis-label"
            >
              {tick.toFixed(1)}
            </text>
          </g>
        ))}

        {/* X-axis date labels */}
        {data.map((d, i) => (
          <text
            key={d.date}
            x={xPos(i)}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="weight-axis-label"
          >
            {d.date.slice(5)}
          </text>
        ))}

        {/* Line */}
        <polyline points={points} className="weight-polyline" />

        {/* Dots */}
        {data.map((d, i) => (
          <circle
            key={d.date}
            cx={xPos(i)}
            cy={yPos(d.weight)}
            r={4}
            className="weight-dot"
          />
        ))}

        {/* Weight value labels above dots */}
        {data.map((d, i) => (
          <text
            key={`label-${d.date}`}
            x={xPos(i)}
            y={yPos(d.weight) - 8}
            textAnchor="middle"
            className="weight-axis-label"
            style={{ fontWeight: 700, fill: 'var(--primary)' }}
          >
            {d.weight}
          </text>
        ))}
      </svg>
    </div>
  )
}

function calcDiff(current: number, previous: number) {
  const diff = current - previous
  const pct = Math.abs(diff / previous) * 100
  return { diff, pct }
}

export default function WeightPanel({ pets }: Props) {
  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id ?? 'mock-1')
  const [weightData, setWeightData] = useState<WeightEntry[]>(MOCK_WEIGHT_DATA)
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]!)
  const [newWeight, setNewWeight] = useState('')

  const selectedPet = pets.find((p) => p.id === selectedPetId)
  const petName = selectedPet?.name ?? '콩이'

  // Sort by date ascending for chart
  const sorted = [...weightData].sort((a, b) => a.date.localeCompare(b.date))

  // Check for rapid weight change (most recent vs previous)
  const sortedDesc = [...weightData].sort((a, b) => b.date.localeCompare(a.date))
  const hasRapidChange =
    sortedDesc.length >= 2 &&
    calcDiff(sortedDesc[0].weight, sortedDesc[1].weight).pct > 10

  function handleAddWeight(e: React.FormEvent) {
    e.preventDefault()
    const w = parseFloat(newWeight)
    if (isNaN(w) || w <= 0 || w > 100) return
    setWeightData((prev) => {
      const filtered = prev.filter((d) => d.date !== newDate)
      return [...filtered, { date: newDate, weight: w }]
    })
    setNewWeight('')
  }

  return (
    <div>
      {/* Pet selector */}
      <div className="weight-pet-selector">
        {pets.length > 0 ? (
          <div className="field">
            <label className="field-label">반려동물 선택</label>
            <select
              className="field-select"
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
            >
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.species === 'dog' ? '🐶' : '🐱'} {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field">
            <label className="field-label">반려동물 (데모)</label>
            <select className="field-select" value="mock-1" readOnly>
              <option value="mock-1">🐶 콩이 (데모)</option>
              <option value="mock-2">🐱 나비 (데모)</option>
            </select>
          </div>
        )}
      </div>

      {/* Rapid change alert */}
      {hasRapidChange && (
        <div className="alert alert-warning weight-alert">
          ⚠️ <strong>급격한 체중 변화가 감지됐어요!</strong> {petName}의 체중이 최근 기록 대비 10% 이상 변화했습니다. 수의사 상담을 권장합니다.
        </div>
      )}

      {/* 2-col layout: chart + list */}
      <div className="weight-layout">
        {/* Chart */}
        <div className="weight-chart-wrap">
          <div className="weight-chart-title">📈 체중 추이</div>
          <WeightChart data={sorted} />

          {/* Add form */}
          <div className="weight-add-form">
            <div className="weight-add-form-title">체중 기록 추가</div>
            <form onSubmit={handleAddWeight}>
              <div className="weight-add-row">
                <div className="field">
                  <label className="field-label" htmlFor="w-date">날짜</label>
                  <input
                    id="w-date"
                    className="field-input"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="w-weight">체중 (kg)</label>
                  <input
                    id="w-weight"
                    className="field-input"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="예: 4.2"
                    required
                  />
                </div>
                <div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: 20 }}>
                    추가
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Weight list */}
        <div className="weight-chart-wrap">
          <div className="weight-list-title">📋 기록 목록</div>
          {sortedDesc.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚖️</div>
              <p className="empty-text">체중 기록이 없습니다.</p>
            </div>
          ) : (
            <ul className="weight-list">
              {sortedDesc.map((entry, idx) => {
                const prev = sortedDesc[idx + 1]
                let diffEl: React.ReactNode = null
                if (prev) {
                  const { diff, pct } = calcDiff(entry.weight, prev.weight)
                  if (Math.abs(diff) < 0.01) {
                    diffEl = <span className="weight-diff-same">—</span>
                  } else if (diff > 0) {
                    diffEl = (
                      <span className={`weight-diff-up${pct > 10 ? '' : ''}`}>
                        ▲ +{diff.toFixed(1)} kg ({pct.toFixed(0)}%)
                      </span>
                    )
                  } else {
                    diffEl = (
                      <span className="weight-diff-down">
                        ▼ {diff.toFixed(1)} kg ({pct.toFixed(0)}%)
                      </span>
                    )
                  }
                }
                return (
                  <li key={entry.date} className="weight-item">
                    <span className="weight-date">{entry.date}</span>
                    <div className="weight-item-right">
                      <span className="weight-val">{entry.weight.toFixed(1)} kg</span>
                      {diffEl}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

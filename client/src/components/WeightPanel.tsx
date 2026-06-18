import { useEffect, useState } from 'react'
import {
  api,
  errorMessage,
  type Pet,
  type WeightRecord,
  type WeightJudgement,
} from '../api'
import './WeightPanel.css'

interface Props {
  pets: Pet[]
}

interface LastResult {
  judgement: WeightJudgement
  surge: boolean
  deltaRatio: number | null
  weight: number
}

interface WeightEntry {
  id: string
  date: string
  weight: number
}

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
    return data.length === 1
      ? PAD_LEFT + innerW / 2
      : PAD_LEFT + (i / (data.length - 1)) * innerW
  }

  function yPos(w: number) {
    if (maxW === minW) return PAD_TOP + innerH / 2
    return PAD_TOP + innerH - ((w - minW) / (maxW - minW)) * innerH
  }

  const points = data.map((d, i) => `${xPos(i)},${yPos(d.weight)}`).join(' ')

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
            key={`${d.id}-x`}
            x={xPos(i)}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="weight-axis-label"
          >
            {d.date.slice(5)}
          </text>
        ))}

        {/* Line */}
        {data.length >= 2 && <polyline points={points} className="weight-polyline" />}

        {/* Dots */}
        {data.map((d, i) => (
          <circle
            key={`${d.id}-dot`}
            cx={xPos(i)}
            cy={yPos(d.weight)}
            r={4}
            className="weight-dot"
          />
        ))}

        {/* Weight value labels above dots */}
        {data.map((d, i) => (
          <text
            key={`${d.id}-label`}
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

const JUDGE_LABEL: Record<WeightJudgement, string> = {
  normal: '정상 체중',
  over: '과체중',
  under: '저체중',
  unknown: '판정 불가 (표준 데이터 없음)',
}

export default function WeightPanel({ pets }: Props) {
  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id ?? '')
  const [records, setRecords] = useState<WeightRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]!)
  const [newWeight, setNewWeight] = useState('')
  const [newMemo, setNewMemo] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<LastResult | null>(null)

  const selectedPet = pets.find((p) => p.id === selectedPetId)
  const petName = selectedPet?.name ?? ''

  // 펫 목록이 늦게 도착하면 첫 펫 자동 선택
  useEffect(() => {
    if (!selectedPetId && pets.length > 0) {
      setSelectedPetId(pets[0].id)
    }
  }, [pets, selectedPetId])

  async function reload(petId: string) {
    setLoading(true)
    setError(null)
    try {
      setRecords(await api.listWeights(petId))
    } catch (err) {
      setError(errorMessage(err))
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  // 선택된 펫이 바뀌면 기록 다시 로드
  useEffect(() => {
    if (!selectedPetId) {
      setRecords([])
      return
    }
    setLastResult(null)
    reload(selectedPetId)
  }, [selectedPetId])

  // 서버 WeightRecord → 차트/목록용 엔트리. 날짜 오름차순(차트), 내림차순(목록).
  const entries: WeightEntry[] = records.map((r) => ({
    id: r.id,
    date: r.recordedAt.slice(0, 10),
    weight: r.weight,
  }))
  const sortedAsc = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const sortedDesc = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  async function handleAddWeight(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!selectedPetId) {
      setFormError('반려동물을 먼저 선택해주세요.')
      return
    }
    const w = parseFloat(newWeight)
    if (isNaN(w) || w <= 0 || w > 100) {
      setFormError('체중은 0보다 크고 100kg 이하의 숫자여야 합니다.')
      return
    }
    // 날짜만 입력받으므로 정오로 고정해 ISO 변환 (서버 zod datetime 통과)
    const recordedAtIso = new Date(`${newDate}T12:00:00`).toISOString()
    setBusy(true)
    try {
      const res = await api.createWeight(selectedPetId, {
        weight: w,
        recordedAt: recordedAtIso,
        memo: newMemo || undefined,
      })
      setLastResult({
        judgement: res.judgement,
        surge: res.surge,
        deltaRatio: res.deltaRatio,
        weight: res.record.weight,
      })
      setNewWeight('')
      setNewMemo('')
      await reload(selectedPetId)
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!selectedPetId) return
    if (!confirm('이 체중 기록을 삭제할까요?')) return
    try {
      await api.deleteWeight(selectedPetId, id)
      setLastResult(null)
      await reload(selectedPetId)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <div>
      {/* Pet selector */}
      <div className="weight-pet-selector">
        <div className="field">
          <label className="field-label">반려동물 선택</label>
          {pets.length > 0 ? (
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
          ) : (
            <p className="empty-text" style={{ fontSize: 13 }}>
              반려동물을 먼저 등록해주세요.
            </p>
          )}
        </div>
      </div>

      {/* 최근 기록 판정/급변 배너 */}
      {lastResult && (
        <div
          className={`alert weight-alert ${lastResult.surge ? 'alert-error' : 'alert-success'}`}
        >
          <strong>{lastResult.weight}kg</strong> 기록됨 — {JUDGE_LABEL[lastResult.judgement]}
          {lastResult.surge && lastResult.deltaRatio !== null && (
            <>
              {' · '}⚠️ 직전 기록 대비{' '}
              <strong>
                {lastResult.deltaRatio >= 0 ? '+' : ''}
                {(lastResult.deltaRatio * 100).toFixed(1)}%
              </strong>{' '}
              변동 — 보호자에게 알림 메일이 발송되었습니다.
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading-wrap">
          <div className="loading-spinner"></div>
          <span>체중 기록을 불러오는 중…</span>
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : (
        /* 2-col layout: chart + list */
        <div className="weight-layout">
          {/* Chart + add form */}
          <div className="weight-chart-wrap">
            <div className="weight-chart-title">📈 체중 추이</div>
            {sortedAsc.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⚖️</div>
                <p className="empty-text">아직 기록된 체중이 없습니다.</p>
              </div>
            ) : (
              <WeightChart data={sortedAsc} />
            )}

            <div className="weight-add-form">
              <div className="weight-add-form-title">
                체중 기록 추가{petName && ` — ${petName}`}
              </div>
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
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ marginTop: 20 }}
                      disabled={busy || !selectedPetId}
                    >
                      {busy ? '추가 중…' : '추가'}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="w-memo">메모</label>
                  <input
                    id="w-memo"
                    className="field-input"
                    type="text"
                    maxLength={200}
                    value={newMemo}
                    onChange={(e) => setNewMemo(e.target.value)}
                    placeholder="병원 측정, 식후 등 (선택)"
                  />
                </div>
                {formError && (
                  <div className="alert alert-error" style={{ marginTop: 12 }}>
                    {formError}
                  </div>
                )}
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
                        <span className="weight-diff-up">
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
                    <li key={entry.id} className="weight-item">
                      <span className="weight-date">{entry.date}</span>
                      <div className="weight-item-right">
                        <span className="weight-val">{entry.weight.toFixed(1)} kg</span>
                        {diffEl}
                        <button
                          type="button"
                          className="weight-delete"
                          onClick={() => handleDelete(entry.id)}
                          title="삭제"
                          aria-label="삭제"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

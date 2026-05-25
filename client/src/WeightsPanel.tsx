import { useEffect, useState } from 'react'
import {
  api,
  errorMessage,
  type WeightRecord,
  type WeightJudgement,
} from './api'
import './WeightsPanel.css'

interface Props {
  petId: string
  petName: string
  /** 기록 추가·삭제 후 호출 — 부모가 타임라인 같은 형제 패널을 reload하기 위한 신호. */
  onChanged?: () => void
}

interface LastResult {
  judgement: WeightJudgement
  surge: boolean
  deltaRatio: number | null
  weight: number
}

export default function WeightsPanel({ petId, petName, onChanged }: Props) {
  const [records, setRecords] = useState<WeightRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 폼
  const [weight, setWeight] = useState('')
  const [recordedAtLocal, setRecordedAtLocal] = useState(nowLocalForInput())
  const [memo, setMemo] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<LastResult | null>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      setRecords(await api.listWeights(petId))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    setLastResult(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const w = Number(weight)
    if (!Number.isFinite(w) || w <= 0) {
      setFormError('체중은 0보다 큰 숫자여야 합니다.')
      return
    }
    // datetime-local("YYYY-MM-DDTHH:MM")은 TZ 없는 로컬 시각.
    // new Date(...)가 로컬로 해석한 뒤 toISOString()이 UTC ISO로 변환 → 서버 zod datetime 통과.
    let recordedAtIso: string | undefined
    if (recordedAtLocal) {
      const d = new Date(recordedAtLocal)
      if (Number.isNaN(d.getTime())) {
        setFormError('측정 시각이 올바르지 않습니다.')
        return
      }
      recordedAtIso = d.toISOString()
    }
    setBusy(true)
    try {
      const res = await api.createWeight(petId, {
        weight: w,
        recordedAt: recordedAtIso,
        memo: memo || undefined,
      })
      setLastResult({
        judgement: res.judgement,
        surge: res.surge,
        deltaRatio: res.deltaRatio,
        weight: res.record.weight,
      })
      setWeight('')
      setRecordedAtLocal(nowLocalForInput())
      setMemo('')
      await reload()
      onChanged?.()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 체중 기록을 삭제할까요?')) return
    try {
      await api.deleteWeight(petId, id)
      await reload()
      onChanged?.()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <div className="weight-panel">
      <h3>{petName}의 체중 관리</h3>

      <form className="weight-form" onSubmit={handleSubmit}>
        <label>
          체중 (kg) *
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="999.99"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
            placeholder="예: 4.2"
          />
        </label>
        <label>
          측정 시각 *
          <input
            type="datetime-local"
            value={recordedAtLocal}
            onChange={(e) => setRecordedAtLocal(e.target.value)}
            required
          />
        </label>
        <label>
          메모
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={200}
            placeholder="병원 측정, 식후 등"
          />
        </label>

        {formError && <p className="error">{formError}</p>}

        <button type="submit" disabled={busy}>
          {busy ? '기록 중…' : '체중 기록 추가'}
        </button>
      </form>

      {lastResult && <ResultBanner result={lastResult} />}

      {loading && <p>로딩 중…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && records.length > 0 && (
        <>
          <WeightChart records={records} />
          <ul className="weight-list">
            {records.map((rec) => (
              <li key={rec.id} className="weight-item">
                <div className="weight-item-info">
                  <div className="weight-value">{rec.weight} kg</div>
                  <div className="weight-meta">
                    {formatLocal(rec.recordedAt)}
                    {rec.memo && ` · ${rec.memo}`}
                  </div>
                </div>
                <button
                  className="weight-delete"
                  type="button"
                  onClick={() => handleDelete(rec.id)}
                  title="삭제"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!loading && records.length === 0 && (
        <p className="weight-empty">아직 기록된 체중이 없습니다.</p>
      )}
    </div>
  )
}

function ResultBanner({ result }: { result: LastResult }) {
  const judgeMap: Record<WeightJudgement, { label: string; cls: string }> = {
    normal: { label: '정상 체중', cls: 'normal' },
    over: { label: '과체중', cls: 'over' },
    under: { label: '저체중', cls: 'under' },
    unknown: { label: '판정 불가 (표준 데이터 없음)', cls: 'unknown' },
  }
  const j = judgeMap[result.judgement]
  return (
    <div className={`weight-result ${j.cls}`}>
      <div>
        <strong>{result.weight} kg</strong> 기록됨 — {j.label}
      </div>
      {result.surge && result.deltaRatio !== null && (
        <div className="weight-surge">
          ⚠ 직전 기록 대비{' '}
          <strong>
            {result.deltaRatio >= 0 ? '+' : ''}
            {(result.deltaRatio * 100).toFixed(1)}%
          </strong>{' '}
          변동 — 보호자에게 알림 메일이 발송되었습니다.
        </div>
      )}
    </div>
  )
}

// 단순 SVG 라인 차트 — 외부 의존 없음. 최근 N개를 시간 오름차순으로 그림.
function WeightChart({ records }: { records: WeightRecord[] }) {
  const MAX_POINTS = 20
  // 서버는 DESC. 차트는 오름차순.
  const points = [...records]
    .slice(0, MAX_POINTS)
    .reverse()
    .map((r) => ({ x: new Date(r.recordedAt).getTime(), y: r.weight }))

  if (points.length < 2) {
    return <p className="muted">기록이 2건 이상 쌓이면 추세 그래프가 표시됩니다.</p>
  }

  const width = 560
  const height = 160
  const pad = { top: 12, right: 12, bottom: 24, left: 36 }

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  // y 축에 위·아래 여백
  const yPadding = Math.max((yMax - yMin) * 0.15, 0.1)
  const yLo = yMin - yPadding
  const yHi = yMax + yPadding

  const sx = (x: number) =>
    pad.left + ((x - xMin) / Math.max(xMax - xMin, 1)) * (width - pad.left - pad.right)
  const sy = (y: number) =>
    pad.top + (1 - (y - yLo) / (yHi - yLo)) * (height - pad.top - pad.bottom)

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(' ')

  return (
    <div className="weight-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="체중 추세">
        {/* y축 라벨 */}
        <text x={4} y={pad.top + 4} className="weight-axis">
          {yHi.toFixed(1)}
        </text>
        <text x={4} y={height - pad.bottom} className="weight-axis">
          {yLo.toFixed(1)}
        </text>
        <path d={path} className="weight-line" />
        {points.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} className="weight-dot" />
        ))}
      </svg>
    </div>
  )
}

function formatLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// datetime-local 입력에 들어갈 현재 로컬 시각 — "YYYY-MM-DDTHH:MM"
function nowLocalForInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

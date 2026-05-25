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

type RangeKey = 'week' | 'month' | '3month'
const RANGE_DAYS: Record<RangeKey, number> = { week: 7, month: 30, '3month': 90 }
const RANGE_LABELS: Record<RangeKey, string> = {
  week: '1주',
  month: '1개월',
  '3month': '3개월',
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

  // 차트 표시 범위
  const [range, setRange] = useState<RangeKey>('week')

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
          <div className="weight-range" role="tablist" aria-label="기간 선택">
            {(Object.keys(RANGE_DAYS) as RangeKey[]).map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={range === r}
                className={range === r ? 'active' : ''}
                onClick={() => setRange(r)}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <WeightChart records={records} days={RANGE_DAYS[range]} />
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

// 단순 SVG 라인 차트 — 외부 의존 없음. `days`로 지정한 최근 N일(오늘 포함) 윈도우.
function WeightChart({ records, days }: { records: WeightRecord[]; days: number }) {
  const DAY_MS = 24 * 60 * 60 * 1000
  // 윈도우: [오늘-(N-1)일 00:00, 내일 00:00) — 오늘 포함 N일
  const now = new Date()
  const xMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  const xMin = xMax - days * DAY_MS

  const points = records
    .map((r) => ({ x: new Date(r.recordedAt).getTime(), y: r.weight }))
    .filter((p) => p.x >= xMin && p.x < xMax)
    .sort((a, b) => a.x - b.x)

  const width = 560
  const height = 180
  const pad = { top: 12, right: 12, bottom: 32, left: 36 }

  // y축 — 데이터가 없으면 임의 범위(라벨만 비움)
  const ys = points.map((p) => p.y)
  const yMin = points.length ? Math.min(...ys) : 0
  const yMax = points.length ? Math.max(...ys) : 1
  const yPadding = Math.max((yMax - yMin) * 0.15, 0.1)
  const yLo = yMin - yPadding
  const yHi = yMax + yPadding

  const sx = (x: number) =>
    pad.left + ((x - xMin) / (xMax - xMin)) * (width - pad.left - pad.right)
  const sy = (y: number) =>
    pad.top + (1 - (y - yLo) / (yHi - yLo)) * (height - pad.top - pad.bottom)

  // 날짜 라벨
  // - 7일 이하: 각 날 정오 위치 (N개)
  // - 8일 이상: 양끝 포함 7개 균등 분포 (양끝 라벨은 시작/끝 정렬로 클리핑 방지)
  const startMidnight = new Date(xMin)
  const labelCount = days <= 7 ? days : 7
  const dayLabels = Array.from({ length: labelCount }, (_, i) => {
    let t: number
    let anchor: 'start' | 'middle' | 'end' = 'middle'
    if (days <= 7) {
      const d = new Date(
        startMidnight.getFullYear(),
        startMidnight.getMonth(),
        startMidnight.getDate() + i,
      )
      t = d.getTime() + DAY_MS / 2
    } else {
      t = xMin + (i / (labelCount - 1)) * (xMax - xMin)
      if (i === 0) anchor = 'start'
      else if (i === labelCount - 1) anchor = 'end'
    }
    const date = new Date(t)
    return {
      x: sx(t),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      anchor,
    }
  })

  const path =
    points.length >= 2
      ? points
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
          .join(' ')
      : null

  return (
    <div className="weight-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`체중 추세 (최근 ${days}일)`}>
        {/* y축 라벨 — 데이터가 있을 때만 */}
        {points.length > 0 && (
          <>
            <text x={4} y={pad.top + 4} className="weight-axis">
              {yHi.toFixed(1)}
            </text>
            <text x={4} y={height - pad.bottom} className="weight-axis">
              {yLo.toFixed(1)}
            </text>
          </>
        )}
        {/* x축 날짜 라벨 */}
        {dayLabels.map((d, i) => (
          <text
            key={i}
            x={d.x}
            y={height - 10}
            className="weight-axis"
            textAnchor={d.anchor}
          >
            {d.label}
          </text>
        ))}
        {path && <path d={path} className="weight-line" />}
        {points.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} className="weight-dot" />
        ))}
        {points.length === 0 && (
          <text
            x={width / 2}
            y={height / 2}
            className="weight-axis"
            textAnchor="middle"
          >
            이 기간에 기록이 없습니다
          </text>
        )}
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

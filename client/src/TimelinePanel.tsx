import { useEffect, useState } from 'react'
import { api, errorMessage, type TimelineEvent } from './api'
import './TimelinePanel.css'

interface Props {
  petId: string
  petName: string
  /** 부모(다른 패널)에서 mutation이 일어났음을 알리는 신호. 값이 바뀌면 첫 페이지부터 reload. */
  refreshKey?: number
}

const PAGE_SIZE = 10

export default function TimelinePanel({ petId, petName, refreshKey = 0 }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  // limit 인자가 주어지면 그 크기만큼 가져온다. mutation 후 reload 에서
  // 현재까지 로드된 항목 수만큼 다시 가져와 페이지 위치를 유지한다.
  async function loadInitial(limit: number = PAGE_SIZE) {
    setLoading(true)
    setError(null)
    try {
      const page = await api.getTimeline(petId, { limit })
      setEvents(page.events)
      setNextBefore(page.nextBefore)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    if (!nextBefore) return
    setLoadingMore(true)
    try {
      const page = await api.getTimeline(petId, { limit: PAGE_SIZE, before: nextBefore })
      setEvents((prev) => [...prev, ...page.events])
      setNextBefore(page.nextBefore)
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  // petId 가 바뀌면 첫 페이지로 새로 시작. refreshKey 만 바뀐 경우엔
  // 이미 로드된 만큼(events.length, 최소 PAGE_SIZE) 유지하며 reload — 새 이벤트는 최상단에 추가됨.
  useEffect(() => {
    const preserveCount = Math.max(PAGE_SIZE, events.length)
    loadInitial(preserveCount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId, refreshKey])

  return (
    <div className="timeline-panel">
      <h3>{petName}의 통합 타임라인</h3>

      {loading && <p>로딩 중…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && events.length === 0 && (
        <p className="timeline-empty">
          아직 기록된 이벤트가 없습니다. (체중·접종·성분표 OCR이 시간순으로 표시됩니다)
        </p>
      )}

      <ol className="timeline-list">
        {events.map((ev) => (
          <li key={`${ev.type}-${ev.id}`} className={`timeline-item type-${ev.type}`}>
            <div className="timeline-time">{formatLocal(ev.occurredAt)}</div>
            <div className="timeline-body">{renderEvent(ev)}</div>
          </li>
        ))}
      </ol>

      {nextBefore && (
        <button
          type="button"
          className="timeline-more"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? '불러오는 중…' : '더 보기'}
        </button>
      )}
    </div>
  )
}

function renderEvent(ev: TimelineEvent) {
  switch (ev.type) {
    case 'weight':
      return (
        <>
          <span className="timeline-icon">⚖</span>
          <span className="timeline-title">체중: {ev.weight} kg</span>
          {ev.surge && ev.deltaRatio !== null && (
            <span className="timeline-badge surge">
              ⚠ 급변 {ev.deltaRatio >= 0 ? '+' : ''}
              {(ev.deltaRatio * 100).toFixed(1)}%
            </span>
          )}
          {ev.memo && <span className="timeline-memo"> · {ev.memo}</span>}
        </>
      )
    case 'vaccination':
      return (
        <>
          <span className="timeline-icon">💉</span>
          <span className="timeline-title">
            예방접종: {ev.vaccineName}
            {ev.doseTotal > 1 && ` ${ev.doseNo}/${ev.doseTotal}차`}
          </span>
          {ev.mandatory && <span className="timeline-badge mandatory">법적의무</span>}
          {ev.source === 'ocr' && <span className="timeline-badge ocr">OCR 자동</span>}
          {ev.memo && <span className="timeline-memo"> · {ev.memo}</span>}
        </>
      )
    case 'ingredient_scan':
      return (
        <>
          <span className="timeline-icon">📷</span>
          <span className="timeline-title">성분표 OCR</span>
          {ev.matchedFoods.length > 0 && (
            <span className="timeline-badge danger">
              위험 성분 {ev.matchedFoods.length}건
            </span>
          )}
          {ev.matchedAllergies.length > 0 && (
            <span className="timeline-badge allergy">
              알러지 {ev.matchedAllergies.length}건
            </span>
          )}
          {ev.matchedFoods.length === 0 && ev.matchedAllergies.length === 0 && (
            <span className="timeline-memo">위험 항목 없음</span>
          )}
        </>
      )
  }
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

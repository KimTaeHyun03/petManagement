import { useEffect, useState } from 'react'
import { api, errorMessage, type Pet, type TimelineEvent } from '../api'
import './TimelinePanel.css'

interface Props {
  pets: Pet[]
}

type DotColor = 'green' | 'amber' | 'red' | 'yellow'

interface RenderedEvent {
  icon: string
  title: string
  description: string
  dotColor: DotColor
  badge?: { text: string; cls: string }
}

const PAGE_SIZE = 10

export default function TimelinePanel({ pets }: Props) {
  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id ?? '')
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 펫 목록이 늦게 도착하면 첫 펫을 자동 선택
  useEffect(() => {
    if (!selectedPetId && pets.length > 0) {
      setSelectedPetId(pets[0].id)
    }
  }, [pets, selectedPetId])

  // 선택된 펫이 바뀌면 첫 페이지부터 로드
  useEffect(() => {
    if (!selectedPetId) {
      setEvents([])
      setNextBefore(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .getTimeline(selectedPetId, { limit: PAGE_SIZE })
      .then((page) => {
        if (cancelled) return
        setEvents(page.events)
        setNextBefore(page.nextBefore)
      })
      .catch((err) => {
        if (cancelled) return
        setError(errorMessage(err))
        setEvents([])
        setNextBefore(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedPetId])

  async function loadMore() {
    if (!nextBefore || !selectedPetId) return
    setLoadingMore(true)
    try {
      const page = await api.getTimeline(selectedPetId, {
        limit: PAGE_SIZE,
        before: nextBefore,
      })
      setEvents((prev) => [...prev, ...page.events])
      setNextBefore(page.nextBefore)
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="card">
      {/* Filter */}
      <div className="timeline-filter-row">
        <label>반려동물:</label>
        {pets.length > 0 ? (
          <select
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
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            반려동물을 먼저 등록해주세요.
          </span>
        )}
      </div>

      {loading ? (
        <div className="loading-wrap">
          <div className="loading-spinner"></div>
          <span>타임라인을 불러오는 중…</span>
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p className="empty-text">
            아직 기록이 없습니다. 체중·예방접종·성분표 스캔이 시간순으로 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="timeline">
          {events.map((event) => {
            const r = renderEvent(event)
            return (
              <div key={`${event.type}-${event.id}`} className="timeline-item">
                <div className={`timeline-dot timeline-dot-${r.dotColor}`} />
                <div className="timeline-content">
                  <div className="timeline-event-title">
                    <span>{r.icon}</span>
                    <span>{r.title}</span>
                    {r.badge && (
                      <span className={`badge ${r.badge.cls}`}>{r.badge.text}</span>
                    )}
                  </div>
                  <div className="timeline-event-desc">{r.description}</div>
                  <div className="timeline-event-time">{formatLocal(event.occurredAt)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {nextBefore && !loading && (
        <div className="timeline-load-more">
          <button
            className="btn btn-ghost btn-sm"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? '불러오는 중…' : '더 불러오기'}
          </button>
        </div>
      )}
    </div>
  )
}

// TimelineEvent(discriminated union) → 디자인 카드용 표현으로 매핑
function renderEvent(ev: TimelineEvent): RenderedEvent {
  switch (ev.type) {
    case 'weight': {
      const memo = ev.memo ? ` · ${ev.memo}` : ''
      if (ev.surge && ev.deltaRatio !== null) {
        const pct = (ev.deltaRatio * 100).toFixed(1)
        const sign = ev.deltaRatio >= 0 ? '+' : ''
        return {
          icon: '⚖️',
          title: `체중 기록: ${ev.weight}kg`,
          description: `직전 기록 대비 ${sign}${pct}% 급변이 감지됐습니다. 수의사 상담을 권장합니다.${memo}`,
          dotColor: 'red',
          badge: { text: `급변 ${sign}${pct}%`, cls: 'badge-red' },
        }
      }
      return {
        icon: '⚖️',
        title: `체중 기록: ${ev.weight}kg`,
        description: `체중이 기록됐습니다.${memo}`,
        dotColor: 'green',
        badge: { text: '정상', cls: 'badge-green' },
      }
    }
    case 'vaccination': {
      const dose = ev.doseTotal > 1 ? ` ${ev.doseNo}/${ev.doseTotal}차` : ''
      const memo = ev.memo ? ` · ${ev.memo}` : ''
      const next = ev.nextDueAt
        ? ` 다음 접종 예정일: ${formatDate(ev.nextDueAt)}.`
        : ''
      return {
        icon: '💉',
        title: `예방접종: ${ev.vaccineName}${dose}`,
        description: `${ev.source === 'ocr' ? '영수증 OCR로 자동 기록됐습니다.' : '접종이 기록됐습니다.'}${next}${memo}`,
        dotColor: 'green',
        badge: ev.mandatory
          ? { text: '법적의무', cls: 'badge-amber' }
          : { text: '완료', cls: 'badge-green' },
      }
    }
    case 'ingredient_scan': {
      const product = ev.productName ? ` — ${ev.productName}` : ''
      const danger = ev.matchedFoods.map((f) => f.name)
      const allergy = ev.matchedAllergies
      if (danger.length > 0) {
        return {
          icon: '⚠️',
          title: `성분표 스캔${product}`,
          description: `위험 성분이 검출됐습니다: ${summarizeNames(danger)}. 급여를 중단하고 수의사와 상담하세요.`,
          dotColor: 'red',
          badge: { text: '위험', cls: 'badge-red' },
        }
      }
      if (allergy.length > 0) {
        return {
          icon: '📷',
          title: `성분표 스캔${product}`,
          description: `등록된 알러지 성분이 포함되어 있어 주의가 필요합니다: ${summarizeNames(allergy)}.`,
          dotColor: 'amber',
          badge: { text: '알러지', cls: 'badge-amber' },
        }
      }
      return {
        icon: '📷',
        title: `성분표 스캔${product}`,
        description: '위험 성분이나 알러지 항목이 발견되지 않았습니다.',
        dotColor: 'green',
        badge: { text: '안전', cls: 'badge-green' },
      }
    }
  }
}

// 매칭된 이름 목록 요약 — 3개까지 나열, 그 이상은 "외 N개"
function summarizeNames(names: string[]): string {
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')} 외 ${names.length - 3}개`
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

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

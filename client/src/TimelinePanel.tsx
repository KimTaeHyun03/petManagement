import { useState } from 'react'
import { type Pet } from './api'
import './TimelinePanel.css'

interface Props {
  pets: Pet[]
}

type DotColor = 'green' | 'amber' | 'red' | 'yellow'

interface TimelineEvent {
  id: number
  icon: string
  title: string
  description: string
  petName: string
  timestamp: string
  dotColor: DotColor
  badge?: { text: string; cls: string }
}

const MOCK_EVENTS: TimelineEvent[] = [
  {
    id: 1,
    icon: '⚠️',
    title: '성분 경고: 자일리톨 검출됨',
    description: '스캔한 간식 성분표에서 자일리톨이 검출됐습니다. 즉시 해당 제품 급여를 중단해주세요.',
    petName: '콩이',
    timestamp: '2025-05-28 14:32',
    dotColor: 'red',
    badge: { text: '위험', cls: 'badge-red' },
  },
  {
    id: 2,
    icon: '💉',
    title: '접종 예정: 광견병 접종 D-7',
    description: '콩이의 광견병 접종 예정일이 7일 후입니다. 동물병원 예약을 미리 해두세요.',
    petName: '콩이',
    timestamp: '2025-05-27 09:00',
    dotColor: 'yellow',
    badge: { text: 'D-7', cls: 'badge-yellow' },
  },
  {
    id: 3,
    icon: '⚖️',
    title: '체중 기록: 4.2kg 기록됨',
    description: '이전 기록(4.0kg) 대비 0.2kg 증가했습니다. 변화율 5% 이내로 정상 범위입니다.',
    petName: '콩이',
    timestamp: '2025-05-28 10:15',
    dotColor: 'green',
    badge: { text: '정상', cls: 'badge-green' },
  },
  {
    id: 4,
    icon: '📷',
    title: 'OCR 스캔: 사료 성분표 분석',
    description: '로얄캐닌 인도어 성인 사료 성분표를 분석했습니다. 위험 성분이 발견되지 않았습니다.',
    petName: '나비',
    timestamp: '2025-05-26 18:44',
    dotColor: 'green',
    badge: { text: '안전', cls: 'badge-green' },
  },
  {
    id: 5,
    icon: '💉',
    title: '예방접종: 종합백신 1차 접종 완료',
    description: '나비의 종합백신(FVRCP) 1차 접종이 완료됐습니다. 다음 접종은 4주 후입니다.',
    petName: '나비',
    timestamp: '2025-05-20 11:30',
    dotColor: 'green',
    badge: { text: '완료', cls: 'badge-green' },
  },
  {
    id: 6,
    icon: '📷',
    title: 'OCR 스캔: 간식 성분표 분석',
    description: '수제 닭가슴살 간식 성분표를 분석했습니다. 콩이의 닭고기 알러지 성분이 포함되어 있어 주의가 필요합니다.',
    petName: '콩이',
    timestamp: '2025-05-18 15:22',
    dotColor: 'amber',
    badge: { text: '알러지', cls: 'badge-amber' },
  },
  {
    id: 7,
    icon: '⚖️',
    title: '체중 기록: 4.0kg 기록됨',
    description: '이전 기록(3.9kg) 대비 0.1kg 증가했습니다.',
    petName: '콩이',
    timestamp: '2025-05-14 09:05',
    dotColor: 'green',
  },
  {
    id: 8,
    icon: '💉',
    title: '예방접종: 심장사상충 예방약 투여',
    description: '콩이의 이번 달 심장사상충 예방약 투여가 완료됐습니다.',
    petName: '콩이',
    timestamp: '2025-05-01 13:00',
    dotColor: 'green',
    badge: { text: '완료', cls: 'badge-green' },
  },
]

export default function TimelinePanel({ pets }: Props) {
  const [filterPet, setFilterPet] = useState<string>('all')
  const [visibleCount, setVisibleCount] = useState(6)

  const petNames = ['all', ...Array.from(new Set(MOCK_EVENTS.map((e) => e.petName)))]

  const filtered = MOCK_EVENTS.filter((e) =>
    filterPet === 'all' || e.petName === filterPet
  )

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <div className="card">
      {/* Filter */}
      <div className="timeline-filter-row">
        <label>반려동물 필터:</label>
        <select value={filterPet} onChange={(e) => { setFilterPet(e.target.value); setVisibleCount(6) }}>
          <option value="all">전체 보기</option>
          {pets.length > 0
            ? pets.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.species === 'dog' ? '🐶' : '🐱'} {p.name}
                </option>
              ))
            : petNames.filter((n) => n !== 'all').map((n) => (
                <option key={n} value={n}>{n}</option>
              ))
          }
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p className="empty-text">아직 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="timeline">
          {visible.map((event) => (
            <div key={event.id} className="timeline-item">
              <div className={`timeline-dot timeline-dot-${event.dotColor}`} />
              <div className="timeline-content">
                <div className="timeline-event-title">
                  <span>{event.icon}</span>
                  <span>{event.title}</span>
                  <span className={`badge badge-neutral`} style={{ fontSize: 11 }}>{event.petName}</span>
                  {event.badge && (
                    <span className={`badge ${event.badge.cls}`}>{event.badge.text}</span>
                  )}
                </div>
                <div className="timeline-event-desc">{event.description}</div>
                <div className="timeline-event-time">{event.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="timeline-load-more">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setVisibleCount((v) => v + 4)}
          >
            더 불러오기 ({filtered.length - visibleCount}개 남음)
          </button>
        </div>
      )}
    </div>
  )
}

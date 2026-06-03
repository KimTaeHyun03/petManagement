import { useEffect, useState } from 'react'
import { api, errorMessage, type VaccinationRecord } from './api'
import './VaccinationsPanel.css'

interface Props {
  petId: string
  petName: string
  /** 기록 삭제 후 호출 — 부모가 타임라인 같은 형제 패널을 reload하기 위한 신호. */
  onChanged?: () => void
}

export default function VaccinationsPanel({ petId, petName, onChanged }: Props) {
  const [records, setRecords] = useState<VaccinationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const recs = await api.listVaccinations(petId)
      setRecords(recs)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [petId])

  async function handleDelete(id: string) {
    if (!confirm('이 접종 기록을 삭제할까요?')) return
    try {
      await api.deleteVaccination(petId, id)
      await reload()
      onChanged?.()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  function nextDueLabel(rec: VaccinationRecord) {
    if (!rec.nextDueAt) return null
    const days = rec.daysUntilNext!
    if (days < 0) return { text: `다음 접종 ${Math.abs(days)}일 지남 (${rec.nextDueAt})`, cls: 'overdue' }
    if (days <= 7) return { text: `다음 접종 D-${days} (${rec.nextDueAt})`, cls: 'soon' }
    return { text: `다음 접종 ${rec.nextDueAt} (${days}일 남음)`, cls: 'ok' }
  }

  return (
    <div className="vacc-panel">
      <h3>{petName}의 예방접종 관리</h3>

      {/* 접종 이력 목록 */}
      {loading && (
        <div className="loading-wrap">
          <div className="loading-spinner"></div>
          <span>로딩 중…</span>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {!loading && records.length === 0 && (
        <p className="vacc-empty">아직 기록된 접종이 없습니다.</p>
      )}
      <ul className="vacc-list">
        {records.map((rec) => {
          const next = nextDueLabel(rec)
          const itemCls = [
            'vacc-item',
            rec.vaccineMandatory ? 'mandatory' : '',
            !rec.vaccineMandatory && rec.vaccineSeverity === 'high' ? 'high' : '',
          ].filter(Boolean).join(' ')

          return (
            <li key={rec.id} className={itemCls}>
              <div className="vacc-item-info">
                <div className="vacc-name">
                  {rec.vaccineName}
                  {rec.doseTotal > 1 && ` ${rec.doseNo}/${rec.doseTotal}차`}
                  {rec.vaccineMandatory && <span className="badge-mandatory">법적의무</span>}
                </div>
                <div className="vacc-meta">
                  접종일: {rec.vaccinatedAt}
                  {rec.source === 'ocr' && ' · OCR 자동기록'}
                  {rec.memo && ` · ${rec.memo}`}
                </div>
                {next && (
                  <div className={`vacc-next ${next.cls}`}>{next.text}</div>
                )}
              </div>
              <button
                className="vacc-delete"
                type="button"
                onClick={() => handleDelete(rec.id)}
                title="삭제"
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

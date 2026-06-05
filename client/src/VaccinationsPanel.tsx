import { useEffect, useState } from 'react'
import { api, errorMessage, type Vaccine, type VaccinationRecord } from './api'
import './VaccinationsPanel.css'

interface Props {
  petId: string
  petName: string
  species: 'dog' | 'cat'
  /** 기록 추가·삭제 후 호출 — 부모가 타임라인 같은 형제 패널을 reload하기 위한 신호. */
  onChanged?: () => void
}

export default function VaccinationsPanel({ petId, petName, species, onChanged }: Props) {
  const [records, setRecords] = useState<VaccinationRecord[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [vaccineId, setVaccineId] = useState<number | ''>('')
  const [doseNo, setDoseNo] = useState(1)
  const [vaccinatedAt, setVaccinatedAt] = useState(today())
  const [memo, setMemo] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function today() {
    return new Date().toISOString().split('T')[0]!
  }

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [recs, vacs] = await Promise.all([
        api.listVaccinations(petId),
        api.listVaccines(species),
      ])
      setRecords(recs)
      setVaccines(vacs)
      if (vacs.length > 0 && vaccineId === '') {
        setVaccineId(vacs[0]!.id)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [petId])

  const selectedVaccine = vaccines.find((v) => v.id === vaccineId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vaccineId) return
    setFormError(null)
    setBusy(true)
    try {
      await api.createVaccination(petId, {
        vaccineId: vaccineId as number,
        doseNo,
        vaccinatedAt,
        memo: memo || undefined,
      })
      setMemo('')
      setDoseNo(1)
      setVaccinatedAt(today())
      await reload()
      onChanged?.()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

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

      <div className="vacc-columns">
        {/* 왼쪽: 접종 기록 추가 폼 */}
        <div className="vacc-col">
          <p className="vacc-col-title">접종 기록 추가</p>
          <form className="vacc-form" onSubmit={handleSubmit}>
            <label>
              백신 선택 *
              <select
                value={vaccineId}
                onChange={(e) => {
                  setVaccineId(Number(e.target.value))
                  setDoseNo(1)
                }}
                required
              >
                {vaccines.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.mandatory ? '⚠ ' : ''}{v.name}
                    {v.doseTotal > 1 ? ` (총 ${v.doseTotal}차)` : ''}
                  </option>
                ))}
              </select>
            </label>

            {selectedVaccine && selectedVaccine.doseTotal > 1 && (
              <label>
                차수 *
                <input
                  type="number"
                  min={1}
                  max={selectedVaccine.doseTotal}
                  value={doseNo}
                  onChange={(e) => setDoseNo(Number(e.target.value))}
                  required
                />
              </label>
            )}

            <label>
              접종일 *
              <input
                type="date"
                value={vaccinatedAt}
                onChange={(e) => setVaccinatedAt(e.target.value)}
                required
              />
            </label>

            <label>
              메모
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="병원명, 주의사항 등"
                maxLength={200}
              />
            </label>

            {formError && <p className="error">{formError}</p>}

            <button type="submit" disabled={busy || !vaccineId}>
              {busy ? '기록 중…' : '접종 기록 추가'}
            </button>
          </form>
        </div>

        {/* 오른쪽: 접종 이력 목록 */}
        <div className="vacc-col">
          <p className="vacc-col-title">접종 이력</p>
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
      </div>
    </div>
  )
}

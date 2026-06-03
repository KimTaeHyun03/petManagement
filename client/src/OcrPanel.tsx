import { useEffect, useRef, useState } from 'react'
import { api, errorMessage, type MatchedFood, type Pet, type ScanResult } from './api'
import './OcrPanel.css'

interface Props {
  pets: Pet[]
  /** confirmScan 저장 후 호출 — 부모가 타임라인 같은 형제 패널을 reload하기 위한 신호. */
  onChanged?: () => void
}

export default function OcrPanel({ pets, onChanged }: Props) {
  const [petId, setPetId]       = useState<string>(pets[0]?.id ?? '')

  // pets가 뒤늦게 로드될 때 petId가 빈 값이면 첫 번째 펫으로 초기화
  useEffect(() => {
    if (!petId && pets.length > 0) {
      setPetId(pets[0].id)
    }
  }, [pets, petId])
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [result, setResult]     = useState<ScanResult | null>(null)
  const [showText, setShowText] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [productName, setProductName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setResult(null)
    setSaved(false)
    setError(null)
    setShowText(false)
    setProductName('')
    setPreview(URL.createObjectURL(f))
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  async function handleScan() {
    if (!file || !petId) return
    setScanning(true)
    setError(null)
    setResult(null)
    setSaved(false)
    try {
      const res = await api.scanOcr(petId, file)
      setResult(res)
      setProductName(res.productName ?? '')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setScanning(false)
    }
  }

  async function handleConfirm() {
    if (!result || !petId) return
    setConfirming(true)
    setError(null)
    try {
      await api.confirmScan({
        petId,
        extractedText:        result.extractedText,
        matchedFoodsJson:     result.matches?.dangerFoods ?? [],
        matchedAllergiesJson: result.matches?.allergies ?? [],
        productName:          productName.trim() || null,
      })
      setSaved(true)
      onChanged?.()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setConfirming(false)
    }
  }

  if (pets.length === 0) {
    return (
      <div className="card">
        <div className="card-title">성분표 스캔</div>
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <p className="empty-text">먼저 반려동물을 등록해 주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title">성분표 스캔</div>

      {/* 펫 선택 */}
      <div className="ocr-select-row">
        <label style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', fontWeight: 600 }}>
          반려동물
        </label>
        <select value={petId} onChange={(e) => { setPetId(e.target.value); setResult(null); setSaved(false) }}>
          {pets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.species === 'dog' ? '강아지' : '고양이'})
            </option>
          ))}
        </select>
      </div>

      {/* 이미지 업로드 영역 */}
      <div
        className={`drop-zone${dragOver ? ' drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/bmp,image/tiff" onChange={onInputChange} />
        {preview ? (
          <img src={preview} alt="미리보기" className="preview-img" />
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
            <div>클릭하거나 이미지를 끌어다 놓으세요</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>jpg, png, bmp, tiff · 최대 10MB</div>
          </>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 10 }}>{error}</div>}

      <button
        className="btn btn-primary btn-full scan-btn"
        onClick={handleScan}
        disabled={!file || !petId || scanning}
      >
        {scanning ? '분석 중…' : '성분표 분석하기'}
      </button>

      {/* 결과 */}
      {result && (
        <div className="result-card">
          <div className="result-header">
            <span>분석 결과</span>
            <span className={`doc-badge ${result.docType}`}>
              {result.docType === 'ingredient' ? '성분표' : result.docType === 'receipt' ? '영수증' : '분류 불명'}
            </span>
          </div>

          <div className="result-body">
            {result.docType === 'receipt' && (
              <div className="alert-block safe">
                <div className="alert-title">영수증으로 분류됨</div>
                <div style={{ fontSize: 13 }}>이 이미지는 영수증으로 인식됐어요. 예방접종 기록은 예방접종 관리 탭을 이용해 주세요.</div>
              </div>
            )}

            {result.docType === 'unknown' && (
              <div className="alert-block" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                <div className="alert-title" style={{ color: 'var(--text)' }}>문서 유형을 인식하지 못했어요</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>성분표 또는 영수증 이미지를 올려주세요.</div>
              </div>
            )}

            {result.docType === 'ingredient' && (
              <label className="product-name-field">
                <span>제품명</span>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={result.productName ? '' : 'OCR에서 제품명을 못 찾았어요. 직접 입력하세요.'}
                  maxLength={120}
                  disabled={saved}
                />
              </label>
            )}

            {result.docType === 'ingredient' && result.matches && (
              <>
                {result.matches.dangerFoods.length > 0 ? (
                  <DangerFoodAlert foods={result.matches.dangerFoods} />
                ) : (
                  <div className="alert-block safe">
                    <div className="alert-title">위험 성분 없음</div>
                    <div style={{ fontSize: 13 }}>ASPCA 기준 위험 성분이 발견되지 않았습니다.</div>
                  </div>
                )}

                {result.matches.allergies.length > 0 ? (
                  <AllergyAlert allergies={result.matches.allergies} />
                ) : (
                  <div className="alert-block safe">
                    <div className="alert-title">알러지 성분 없음</div>
                    <div style={{ fontSize: 13 }}>이 펫의 알러지 성분이 발견되지 않았습니다.</div>
                  </div>
                )}
              </>
            )}

            {/* 추출 텍스트 토글 */}
            <div>
              <button className="extracted-toggle" type="button" onClick={() => setShowText((v) => !v)}>
                {showText ? '추출 텍스트 숨기기' : 'OCR 추출 텍스트 보기'}
              </button>
              {showText && (
                <div className="extracted-text" style={{ marginTop: 6 }}>{result.extractedText || '(추출된 텍스트 없음)'}</div>
              )}
            </div>

            <p className="disclaimer">{result.disclaimer}</p>

            {/* 저장 버튼 — 성분표이고 아직 저장 안 한 경우에만 노출 */}
            {result.docType === 'ingredient' && !saved && (
              <button className="btn btn-primary btn-full confirm-btn" onClick={handleConfirm} disabled={confirming}>
                {confirming ? '저장 중…' : '이 결과를 기록에 저장'}
              </button>
            )}

            {saved && (
              <div className="saved-notice">기록에 저장됐습니다!</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DangerFoodAlert({ foods }: { foods: MatchedFood[] }) {
  return (
    <div className="alert-block danger">
      <div className="alert-title">위험 성분 {foods.length}건 발견</div>
      {foods.map((f) => (
        <div key={f.id} className="food-item">
          <strong>{f.name}</strong>
          <span className={`severity-badge ${f.severity}`}>
            {f.severity === 'high' ? '고위험' : f.severity === 'medium' ? '주의' : '저위험'}
          </span>
          {f.symptoms && <div className="symptoms-text">{f.symptoms}</div>}
        </div>
      ))}
    </div>
  )
}

function AllergyAlert({ allergies }: { allergies: string[] }) {
  return (
    <div className="alert-block allergy">
      <div className="alert-title">이 펫의 알러지 성분 {allergies.length}건 발견</div>
      <div className="allergy-chips">
        {allergies.map((a) => (
          <span key={a} className="allergy-chip">{a}</span>
        ))}
      </div>
    </div>
  )
}

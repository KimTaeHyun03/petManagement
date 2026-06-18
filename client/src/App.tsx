import { useEffect, useState } from 'react'
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { api, errorMessage, type AuthUser, type Pet, type DashboardAlert } from './api'
import VaccinationsPanel from './components/VaccinationsPanel'
import OcrPanel from './components/OcrPanel'
import WeightPanel from './components/WeightPanel'
import ChatbotPanel from './components/ChatbotPanel'
import TimelinePanel from './components/TimelinePanel'
import './App.css'

type AuthMode = 'login' | 'register'

/* ─────────────────────────────────────────────────────────────
   AuthPage
───────────────────────────────────────────────────────────── */
function AuthPage({ onAuthenticated }: { onAuthenticated: (u: AuthUser) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'register') {
        await api.register(email, password)
        setMode('login')
        setNotice('회원가입 완료! 같은 이메일·비밀번호로 로그인해 주세요.')
        setPassword('')
      } else {
        const u = await api.login(email, password)
        onAuthenticated(u)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Left hero */}
      <div className="auth-hero">
        <div className="auth-hero-logo">🐾 PawCare</div>
        <p className="auth-hero-tagline">
          병원을 최대한 적게 가기 위해<br />사전에 대비하는 스마트 반려동물 헬스케어
        </p>
        <div className="auth-features">
          <div className="auth-feature-item">
            <span className="auth-feature-icon">📷</span>
            <div className="auth-feature-text">
              <strong>사진 한 장으로 성분 분석</strong>
              <span>사료 성분표를 찍으면 위험 성분과 알러지를 자동으로 확인해드려요.</span>
            </div>
          </div>
          <div className="auth-feature-item">
            <span className="auth-feature-icon">💉</span>
            <div className="auth-feature-text">
              <strong>예방접종 일정 자동 관리</strong>
              <span>영수증 OCR로 접종 이력을 자동 기록하고, 다음 접종일을 미리 알려드려요.</span>
            </div>
          </div>
          <div className="auth-feature-item">
            <span className="auth-feature-icon">💬</span>
            <div className="auth-feature-text">
              <strong>AI 챗봇 맞춤 상담</strong>
              <span>내 반려동물 데이터를 기반으로 맞춤 건강 정보를 제공해드려요.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="tabs">
            <button
              type="button"
              className={mode === 'login' ? 'tab active' : 'tab'}
              onClick={() => { setMode('login'); setError(null); setNotice(null) }}
            >
              로그인
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'tab active' : 'tab'}
              onClick={() => { setMode('register'); setError(null); setNotice(null) }}
            >
              회원가입
            </button>
          </div>

          <p className="auth-form-title">
            {mode === 'login' ? '다시 오셨군요! 👋' : 'PawCare 시작하기'}
          </p>
          <p className="auth-form-sub">
            {mode === 'login'
              ? '이메일과 비밀번호로 로그인하세요.'
              : '이메일과 비밀번호를 입력해 계정을 만드세요.'}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="auth-email">이메일</label>
              <input
                id="auth-email"
                className="field-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="example@email.com"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="auth-pw">
                비밀번호
                {mode === 'register' && <small>(10자 이상)</small>}
              </label>
              <input
                id="auth-pw"
                className="field-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 10 : 1}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder="••••••••••"
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {notice && <div className="alert alert-success">{notice}</div>}

            <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
              {busy ? '처리 중…' : mode === 'login' ? '로그인' : '가입하기'}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>아직 계정이 없으신가요?{' '}
                <button type="button" onClick={() => { setMode('register'); setError(null); setNotice(null) }}>
                  회원가입
                </button>
              </>
            ) : (
              <>이미 계정이 있으신가요?{' '}
                <button type="button" onClick={() => { setMode('login'); setError(null); setNotice(null) }}>
                  로그인
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Sidebar
───────────────────────────────────────────────────────────── */
interface SidebarProps {
  userEmail: string
  onLogout: () => void
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `nav-item${isActive ? ' active' : ''}`

function Sidebar({ userEmail, onLogout }: SidebarProps) {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">🐾 PawCare</div>
        <div className="sidebar-logo-sub">반려동물 헬스케어</div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-label">메인</div>
        <NavLink to="/" end className={navClass}>
          <span className="nav-item-icon">🏠</span>홈
        </NavLink>
        <NavLink to="/pets" className={navClass}>
          <span className="nav-item-icon">🐾</span>내 반려동물
        </NavLink>
        <NavLink to="/register" className={navClass}>
          <span className="nav-item-icon">➕</span>반려동물 등록
        </NavLink>

        <div className="sidebar-section-label">기록</div>
        <NavLink to="/ocr" className={navClass}>
          <span className="nav-item-icon">📷</span>성분표 스캔
        </NavLink>
        <NavLink to="/vaccinations" className={navClass}>
          <span className="nav-item-icon">💉</span>예방접종
        </NavLink>
        <NavLink to="/weight" className={navClass}>
          <span className="nav-item-icon">⚖️</span>체중 관리
        </NavLink>

        <div className="sidebar-section-label">분석</div>
        <NavLink to="/chatbot" className={navClass}>
          <span className="nav-item-icon">💬</span>챗봇 상담
        </NavLink>
        <NavLink to="/timeline" className={navClass}>
          <span className="nav-item-icon">📋</span>통합 타임라인
        </NavLink>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user-email">{userEmail}</div>
        <button className="sidebar-logout-btn" onClick={onLogout}>로그아웃</button>
      </div>
    </nav>
  )
}

/* ─────────────────────────────────────────────────────────────
   DashboardScreen
───────────────────────────────────────────────────────────── */
function DashboardScreen({ pets }: { pets: Pet[] }) {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  const [vaccThisMonth, setVaccThisMonth] = useState(0)
  const [scanCount, setScanCount] = useState(0)

  useEffect(() => {
    api.listNotifications().then(setAlerts).catch(() => {})
  }, [])

  // 대시보드 통계는 실제 데이터에서 집계 (펫별 API 합산).
  // 펫이 없으면 모두 0 — 신규 계정엔 더미 없이 빈 상태가 보이도록.
  useEffect(() => {
    if (pets.length === 0) {
      setVaccThisMonth(0)
      setScanCount(0)
      return
    }
    let cancelled = false

    // 이번 달 접종 횟수
    Promise.all(pets.map((p) => api.listVaccinations(p.id).catch(() => [])))
      .then((lists) => {
        if (cancelled) return
        const now = new Date()
        const y = now.getFullYear()
        const m = now.getMonth()
        const count = lists.flat().filter((v) => {
          const d = new Date(v.vaccinatedAt)
          return d.getFullYear() === y && d.getMonth() === m
        }).length
        setVaccThisMonth(count)
      })
      .catch(() => { if (!cancelled) setVaccThisMonth(0) })

    // 스캔 횟수 (타임라인의 성분표 스캔 이벤트 집계)
    Promise.all(pets.map((p) => api.getTimeline(p.id, { limit: 100 }).catch(() => null)))
      .then((pages) => {
        if (cancelled) return
        const count = pages.reduce(
          (sum, pg) => sum + (pg?.events.filter((e) => e.type === 'ingredient_scan').length ?? 0),
          0,
        )
        setScanCount(count)
      })
      .catch(() => { if (!cancelled) setScanCount(0) })

    return () => { cancelled = true }
  }, [pets])

  function alertLabel(a: DashboardAlert): string {
    if (a.alertType === 'overdue') return `${a.petName}의 ${a.vaccineName} 접종이 ${Math.abs(a.daysUntil)}일 초과됐습니다.`
    if (a.alertType === 'dday') return `${a.petName}의 ${a.vaccineName} 접종일입니다.`
    return `${a.petName}의 ${a.vaccineName} 접종이 ${a.daysUntil}일 후 예정됩니다.`
  }

  function alertClass(a: DashboardAlert): string {
    if (a.alertType === 'overdue') return 'alert-item alert-item-urgent'
    if (a.alertType === 'dday') return 'alert-item alert-item-warning'
    return 'alert-item alert-item-info'
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">대시보드</h1>
        <p className="page-subtitle">반려동물의 건강 현황을 한눈에 확인하세요.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap">🐾</div>
          <div>
            <div className="stat-label">총 반려동물</div>
            <div className="stat-value">{pets.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap amber">💉</div>
          <div>
            <div className="stat-label">이번 달 접종</div>
            <div className="stat-value">{vaccThisMonth}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap">📷</div>
          <div>
            <div className="stat-label">스캔 횟수</div>
            <div className="stat-value">{scanCount}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap yellow">🔔</div>
          <div>
            <div className="stat-label">알림</div>
            <div className="stat-value">{alerts.length}</div>
          </div>
        </div>
      </div>

      {/* 2-col layout */}
      <div className="dashboard-grid">
        {/* Left: pet cards */}
        <div>
          <div className="card">
            <div className="card-title">내 반려동물</div>
            <div className="pet-cards">
              {pets.map((p) => (
                <div key={p.id} className="pet-card" onClick={() => navigate('/pets')}>
                  <div className="pet-card-avatar">
                    {p.photoUrl ? <img src={p.photoUrl} alt={p.name} /> : (p.species === 'dog' ? '🐶' : '🐱')}
                  </div>
                  <div className="pet-card-body">
                    <div className="pet-card-name">{p.name}</div>
                    <div className="pet-card-meta">
                      <span className="badge badge-neutral">{p.species === 'dog' ? '강아지' : '고양이'}</span>
                      {p.breed && <span>{p.breed}</span>}
                      {p.birth && <span>{p.birth}</span>}
                    </div>
                    {p.allergies.length > 0 && (
                      <div className="pet-card-badges">
                        {p.allergies.map((a) => (
                          <span key={a} className="chip">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button className="pet-add-card" onClick={() => navigate('/register')}>
                ➕ 반려동물 추가
              </button>
            </div>
          </div>
        </div>

        {/* Right: quick actions + alerts */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">빠른 실행</div>
            <div className="quick-actions">
              <button className="quick-action" onClick={() => navigate('/ocr')}>
                <span className="quick-action-icon">📷</span>
                성분표 스캔
              </button>
              <button className="quick-action" onClick={() => navigate('/vaccinations')}>
                <span className="quick-action-icon">💉</span>
                접종 기록
              </button>
              <button className="quick-action" onClick={() => navigate('/weight')}>
                <span className="quick-action-icon">⚖️</span>
                체중 입력
              </button>
              <button className="quick-action" onClick={() => navigate('/chatbot')}>
                <span className="quick-action-icon">💬</span>
                챗봇 상담
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">알림</div>
            <div className="alert-list">
              {alerts.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 14, padding: '8px 0' }}>예정된 알림이 없습니다.</div>
              ) : alerts.map((a) => (
                <div key={a.recordId} className={alertClass(a)}>
                  <div className="alert-item-dot"></div>
                  <div>{alertLabel(a)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PetsScreen
───────────────────────────────────────────────────────────── */
function PetsScreen({ pets, onDeleted }: { pets: Pet[]; onDeleted: () => void }) {
  async function handleDelete(p: Pet) {
    if (!confirm(`${p.name}을(를) 삭제할까요?\n접종·체중·스캔 등 모든 기록이 함께 삭제됩니다.`)) return
    try {
      await api.deletePet(p.id)
      onDeleted()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">내 반려동물</h1>
        <p className="page-subtitle">등록된 반려동물 목록입니다.</p>
      </div>

      {pets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🐾</div>
            <p className="empty-text">아직 등록된 반려동물이 없어요. 반려동물을 먼저 등록해주세요.</p>
          </div>
        </div>
      ) : (
        <div className="pet-cards">
          {pets.map((p) => (
            <div key={p.id} className="pet-card">
              <div className="pet-card-avatar">
                {p.photoUrl ? <img src={p.photoUrl} alt={p.name} /> : (p.species === 'dog' ? '🐶' : '🐱')}
              </div>
              <div className="pet-card-body">
                <div className="pet-card-name">{p.name}</div>
                <div className="pet-card-meta">
                  <span className="badge badge-neutral">{p.species === 'dog' ? '강아지' : '고양이'}</span>
                  {p.breed && <span>{p.breed}</span>}
                  {p.birth && <span>{p.birth}</span>}
                  {p.gender && <span>{p.gender === 'M' ? '수컷' : '암컷'}</span>}
                  {p.neutered && <span className="badge badge-green">중성화</span>}
                </div>
                {p.allergies.length > 0 && (
                  <div className="pet-card-badges">
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>알러지:</span>
                    {p.allergies.map((a) => (
                      <span key={a} className="chip">{a}</span>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="pet-delete-btn"
                type="button"
                onClick={() => handleDelete(p)}
                title="삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   RegisterScreen
───────────────────────────────────────────────────────────── */
function RegisterScreen({ onRegistered }: { onRegistered: () => void }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog')
  const [breed, setBreed] = useState('')
  const [birth, setBirth] = useState('')
  const [gender, setGender] = useState<'' | 'M' | 'F'>('')
  const [neutered, setNeutered] = useState(false)
  const [allergiesText, setAllergiesText] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setError(null)
    if (file && file.size > 5 * 1024 * 1024) {
      setError('사진 용량은 5MB 이하만 가능합니다.')
      e.target.value = ''
      return
    }
    // 이전 미리보기 URL 정리 (메모리 누수 방지)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(null)
    setPhotoPreview(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      const allergies = allergiesText.split(',').map((s) => s.trim()).filter(Boolean)
      await api.createPet({
        name,
        species,
        breed: breed || undefined,
        birth: birth || undefined,
        gender: gender || undefined,
        neutered,
        allergies,
        photo,
      })
      setName(''); setBreed(''); setBirth(''); setGender(''); setNeutered(false); setAllergiesText('')
      clearPhoto()
      setSuccess(`${name}이(가) 등록됐습니다!`)
      onRegistered()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">반려동물 등록</h1>
        <p className="page-subtitle">새로운 반려동물의 정보를 입력해주세요.</p>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="pet-form">
            <div className="field">
              <label className="field-label" htmlFor="pet-name">이름 *</label>
              <input
                id="pet-name"
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={40}
                placeholder="예: 콩이"
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="pet-species">종 *</label>
              <select
                id="pet-species"
                className="field-select"
                value={species}
                onChange={(e) => setSpecies(e.target.value as 'dog' | 'cat')}
              >
                <option value="dog">강아지</option>
                <option value="cat">고양이</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="pet-breed">품종</label>
              <input
                id="pet-breed"
                className="field-input"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                maxLength={60}
                placeholder="예: 말티즈, 푸들"
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="pet-birth">생년월일</label>
              <input
                id="pet-birth"
                className="field-input"
                type="date"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="pet-gender">성별</label>
              <select
                id="pet-gender"
                className="field-select"
                value={gender}
                onChange={(e) => setGender(e.target.value as '' | 'M' | 'F')}
              >
                <option value="">(선택 안 함)</option>
                <option value="M">수컷</option>
                <option value="F">암컷</option>
              </select>
            </div>

            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={neutered}
                  onChange={(e) => setNeutered(e.target.checked)}
                />
                중성화 함
              </label>
            </div>

            <div className="field pet-form-full">
              <label className="field-label" htmlFor="pet-allergies">
                알러지 <small>(쉼표로 구분, 예: 닭고기, 감자)</small>
              </label>
              <input
                id="pet-allergies"
                className="field-input"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="닭고기, 감자"
              />
            </div>

            <div className="field pet-form-full">
              <label className="field-label" htmlFor="pet-photo">
                사진 <small>(선택, jpg·png·webp, 5MB 이하)</small>
              </label>
              <div className="pet-photo-field">
                {photoPreview ? (
                  <div className="pet-photo-preview">
                    <img src={photoPreview} alt="미리보기" />
                    <button type="button" className="pet-photo-remove" onClick={clearPhoto}>
                      ✕ 사진 제거
                    </button>
                  </div>
                ) : (
                  <label htmlFor="pet-photo" className="pet-photo-dropzone">
                    <span className="pet-photo-dropzone-icon">🖼</span>
                    <span>클릭해서 사진 파일 선택</span>
                  </label>
                )}
                <input
                  id="pet-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  hidden
                />
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginTop: 16 }}>{success}</div>}

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 20 }} disabled={busy}>
            {busy ? '등록 중…' : '반려동물 등록'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   OcrScreen
───────────────────────────────────────────────────────────── */
function OcrScreen({ pets }: { pets: Pet[] }) {
  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">성분표 스캔</h1>
        <p className="page-subtitle">사료나 간식 성분표 사진을 올리면 위험 성분과 알러지를 분석해드려요.</p>
      </div>
      <OcrPanel pets={pets} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   VaccinationsScreen
───────────────────────────────────────────────────────────── */
function VaccinationsScreen({ pets }: { pets: Pet[] }) {
  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id ?? '')

  useEffect(() => {
    if (!selectedPetId && pets.length > 0) {
      setSelectedPetId(pets[0].id)
    }
  }, [pets, selectedPetId])

  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? null

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">예방접종 관리</h1>
        <p className="page-subtitle">접종 이력을 기록하고 다음 접종일을 확인하세요.</p>
      </div>

      {pets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">💉</div>
            <p className="empty-text">반려동물을 먼저 등록해주세요.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="field" style={{ marginBottom: 20 }}>
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
          {selectedPet && (
            <VaccinationsPanel
              petId={selectedPet.id}
              petName={selectedPet.name}
              species={selectedPet.species}
            />
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   WeightScreen
───────────────────────────────────────────────────────────── */
function WeightScreen({ pets }: { pets: Pet[] }) {
  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">체중 관리</h1>
        <p className="page-subtitle">반려동물의 체중 변화를 기록하고 급격한 변화를 감지해요.</p>
      </div>
      <WeightPanel pets={pets} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ChatbotScreen
───────────────────────────────────────────────────────────── */
function ChatbotScreen({ pets }: { pets: Pet[] }) {
  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">챗봇 상담</h1>
        <p className="page-subtitle">반려동물 건강에 대해 궁금한 것을 물어보세요.</p>
      </div>
      <ChatbotPanel pets={pets} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TimelineScreen
───────────────────────────────────────────────────────────── */
function TimelineScreen({ pets }: { pets: Pet[] }) {
  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">통합 타임라인</h1>
        <p className="page-subtitle">모든 기록을 시간순으로 확인하세요.</p>
      </div>
      <TimelinePanel pets={pets} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   App (root)
───────────────────────────────────────────────────────────── */
function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)
  const [pets, setPets] = useState<Pet[]>([])

  useEffect(() => {
    api.me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoadingMe(false))
  }, [])

  useEffect(() => {
    if (user) {
      api.listPets()
        .then((list) => setPets(list))
        .catch(() => setPets([]))
    }
  }, [user])

  function reloadPets() {
    api.listPets().then(setPets).catch(() => {})
  }

  async function handleLogout() {
    try {
      await api.logout()
    } catch {
      // ignore
    }
    setUser(null)
    setPets([])
    navigate('/')
  }

  if (loadingMe) {
    return (
      <div className="loading-wrap" style={{ height: '100vh' }}>
        <div className="loading-spinner"></div>
        <span>로딩 중…</span>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onAuthenticated={(u) => setUser(u)} />
  }

  return (
    <div className="app-shell">
      <Sidebar userEmail={user.email} onLogout={handleLogout} />
      <div className="main-area">
        <Routes>
          <Route path="/" element={<DashboardScreen pets={pets} />} />
          <Route path="/pets" element={<PetsScreen pets={pets} onDeleted={reloadPets} />} />
          <Route path="/register" element={<RegisterScreen onRegistered={reloadPets} />} />
          <Route path="/ocr" element={<OcrScreen pets={pets} />} />
          <Route path="/vaccinations" element={<VaccinationsScreen pets={pets} />} />
          <Route path="/weight" element={<WeightScreen pets={pets} />} />
          <Route path="/chatbot" element={<ChatbotScreen pets={pets} />} />
          <Route path="/timeline" element={<TimelineScreen pets={pets} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App

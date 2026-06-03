import { useEffect, useState } from 'react'
import { api, errorMessage, type AuthUser, type Pet } from './api'
import VaccinationsPanel from './VaccinationsPanel'
import OcrPanel from './OcrPanel'
import WeightPanel from './WeightPanel'
import ChatbotPanel from './ChatbotPanel'
import TimelinePanel from './TimelinePanel'
import './App.css'

type Screen = 'dashboard' | 'pets' | 'register' | 'ocr' | 'vaccinations' | 'weight' | 'chatbot' | 'timeline'
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
  screen: Screen
  onNavigate: (s: Screen) => void
  userEmail: string
  onLogout: () => void
}

function Sidebar({ screen, onNavigate, userEmail, onLogout }: SidebarProps) {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">🐾 PawCare</div>
        <div className="sidebar-logo-sub">반려동물 헬스케어</div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-label">메인</div>
        <button
          className={`nav-item${screen === 'dashboard' ? ' active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <span className="nav-item-icon">🏠</span>홈
        </button>
        <button
          className={`nav-item${screen === 'pets' ? ' active' : ''}`}
          onClick={() => onNavigate('pets')}
        >
          <span className="nav-item-icon">🐾</span>내 반려동물
        </button>
        <button
          className={`nav-item${screen === 'register' ? ' active' : ''}`}
          onClick={() => onNavigate('register')}
        >
          <span className="nav-item-icon">➕</span>반려동물 등록
        </button>

        <div className="sidebar-section-label">기록</div>
        <button
          className={`nav-item${screen === 'ocr' ? ' active' : ''}`}
          onClick={() => onNavigate('ocr')}
        >
          <span className="nav-item-icon">📷</span>성분표 스캔
        </button>
        <button
          className={`nav-item${screen === 'vaccinations' ? ' active' : ''}`}
          onClick={() => onNavigate('vaccinations')}
        >
          <span className="nav-item-icon">💉</span>예방접종
        </button>
        <button
          className={`nav-item${screen === 'weight' ? ' active' : ''}`}
          onClick={() => onNavigate('weight')}
        >
          <span className="nav-item-icon">⚖️</span>체중 관리
        </button>

        <div className="sidebar-section-label">분석</div>
        <button
          className={`nav-item${screen === 'timeline' ? ' active' : ''}`}
          onClick={() => onNavigate('timeline')}
        >
          <span className="nav-item-icon">📋</span>통합 타임라인
        </button>
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
function DashboardScreen({ pets, onNavigate }: { pets: Pet[]; onNavigate: (s: Screen) => void }) {
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
            <div className="stat-value">{pets.length || 2}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap amber">💉</div>
          <div>
            <div className="stat-label">이번 달 접종</div>
            <div className="stat-value">3</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap">📷</div>
          <div>
            <div className="stat-label">스캔 횟수</div>
            <div className="stat-value">8</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap yellow">🔔</div>
          <div>
            <div className="stat-label">알림</div>
            <div className="stat-value">1</div>
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
              {pets.length > 0 ? pets.map((p) => (
                <div key={p.id} className="pet-card" onClick={() => onNavigate('pets')}>
                  <div className="pet-card-avatar">
                    {p.species === 'dog' ? '🐶' : '🐱'}
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
              )) : (
                <>
                  {/* Mock pets when none loaded */}
                  <div className="pet-card" onClick={() => onNavigate('pets')}>
                    <div className="pet-card-avatar">🐶</div>
                    <div className="pet-card-body">
                      <div className="pet-card-name">콩이</div>
                      <div className="pet-card-meta">
                        <span className="badge badge-neutral">강아지</span>
                        <span>말티즈</span>
                        <span>2021-03-15</span>
                      </div>
                      <div className="pet-card-badges">
                        <span className="chip">닭고기</span>
                      </div>
                    </div>
                  </div>
                  <div className="pet-card" onClick={() => onNavigate('pets')}>
                    <div className="pet-card-avatar">🐱</div>
                    <div className="pet-card-body">
                      <div className="pet-card-name">나비</div>
                      <div className="pet-card-meta">
                        <span className="badge badge-neutral">고양이</span>
                        <span>코리안숏헤어</span>
                        <span>2020-07-22</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <button className="pet-add-card" onClick={() => onNavigate('register')}>
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
              <button className="quick-action" onClick={() => onNavigate('ocr')}>
                <span className="quick-action-icon">📷</span>
                성분표 스캔
              </button>
              <button className="quick-action" onClick={() => onNavigate('vaccinations')}>
                <span className="quick-action-icon">💉</span>
                접종 기록
              </button>
              <button className="quick-action" onClick={() => onNavigate('weight')}>
                <span className="quick-action-icon">⚖️</span>
                체중 입력
              </button>
              <button className="quick-action" onClick={() => onNavigate('chatbot')}>
                <span className="quick-action-icon">💬</span>
                챗봇 상담
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">알림</div>
            <div className="alert-list">
              <div className="alert-item alert-item-warning">
                <div className="alert-item-dot"></div>
                <div>콩이의 광견병 접종이 7일 후 예정됩니다.</div>
              </div>
              <div className="alert-item alert-item-info">
                <div className="alert-item-dot"></div>
                <div>나비의 종합백신 접종이 완료됐습니다.</div>
              </div>
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
function PetsScreen({ pets }: { pets: Pet[] }) {
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? null

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">내 반려동물</h1>
        <p className="page-subtitle">등록된 반려동물 목록입니다. 클릭하면 예방접종 기록을 볼 수 있어요.</p>
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
            <div
              key={p.id}
              className={`pet-card${selectedPetId === p.id ? ' selected' : ''}`}
              onClick={() => setSelectedPetId(selectedPetId === p.id ? null : p.id)}
            >
              <div className="pet-card-avatar">
                {p.species === 'dog' ? '🐶' : '🐱'}
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
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {selectedPetId === p.id ? '▲ 접기' : '▼ 접종 기록'}
              </span>
            </div>
          ))}
        </div>
      )}

      {selectedPet && (
        <div style={{ marginTop: 20 }}>
          <VaccinationsPanel
            petId={selectedPet.id}
            petName={selectedPet.name}
            species={selectedPet.species}
          />
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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
      })
      setName(''); setBreed(''); setBirth(''); setGender(''); setNeutered(false); setAllergiesText('')
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
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)
  const [screen, setScreen] = useState<Screen>('dashboard')
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

  async function handleLogout() {
    try {
      await api.logout()
    } catch {
      // ignore
    }
    setUser(null)
    setPets([])
    setScreen('dashboard')
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

  function renderScreen() {
    switch (screen) {
      case 'dashboard':
        return <DashboardScreen pets={pets} onNavigate={setScreen} />
      case 'pets':
        return <PetsScreen pets={pets} />
      case 'register':
        return (
          <RegisterScreen
            onRegistered={() => {
              api.listPets().then(setPets).catch(() => {})
            }}
          />
        )
      case 'ocr':
        return <OcrScreen pets={pets} />
      case 'vaccinations':
        return <VaccinationsScreen pets={pets} />
      case 'weight':
        return <WeightScreen pets={pets} />
      case 'chatbot':
        return <ChatbotScreen pets={pets} />
      case 'timeline':
        return <TimelineScreen pets={pets} />
      default:
        return <DashboardScreen pets={pets} onNavigate={setScreen} />
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        screen={screen}
        onNavigate={setScreen}
        userEmail={user.email}
        onLogout={handleLogout}
      />
      <div className="main-area">
        {renderScreen()}
      </div>
    </div>
  )
}

export default App

import { useEffect, useState } from 'react'
import { api, errorMessage, type AuthUser, type Pet } from './api'
import VaccinationsPanel from './VaccinationsPanel'
import OcrPanel from './OcrPanel'
import WeightsPanel from './WeightsPanel'
import TimelinePanel from './TimelinePanel'
import './App.css'

type Screen = 'auth' | 'pets'
type AuthMode = 'login' | 'register'

function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)

  // 페이지 로드 시 쿠키로 자동 로그인 시도
  useEffect(() => {
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoadingMe(false))
  }, [])

  if (loadingMe) {
    return <div className="page"><p>로딩 중…</p></div>
  }

  const screen: Screen = user ? 'pets' : 'auth'

  return (
    <div className="page">
      <header className="topbar">
        <h1>🐾 Pet Management — 테스트 콘솔</h1>
        {user && (
          <div className="user-info">
            <span>{user.email}</span>
            <button
              type="button"
              onClick={async () => {
                await api.logout()
                setUser(null)
              }}
            >
              로그아웃
            </button>
          </div>
        )}
      </header>

      <main>
        {screen === 'auth' ? (
          <AuthPanel onAuthenticated={setUser} />
        ) : (
          <PetsPanel />
        )}
      </main>
    </div>
  )
}

function AuthPanel({ onAuthenticated }: { onAuthenticated: (u: AuthUser) => void }) {
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
        // 회원가입은 자동 로그인 X 정책 → 로그인 화면으로 전환 + 안내
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
    <section className="card">
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

      <form onSubmit={handleSubmit} className="form">
        <label>
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          비밀번호 {mode === 'register' && <small>(10자 이상)</small>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'register' ? 10 : 1}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
        </label>

        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}

        <button type="submit" disabled={busy}>
          {busy ? '처리 중…' : mode === 'login' ? '로그인' : '가입하기'}
        </button>
      </form>
    </section>
  )
}

function PetsPanel() {
  const [view, setView] = useState<'list' | 'register'>('list')
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  // 형제 패널 간 mutation 알림용 — 값이 바뀌면 TimelinePanel이 reload 한다.
  const [timelineVersion, setTimelineVersion] = useState(0)
  const bumpTimeline = () => setTimelineVersion((v) => v + 1)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const list = await api.listPets()
      setPets(list)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? null

  if (view === 'register') {
    return (
      <PetRegisterPage
        onBack={() => setView('list')}
        onCreated={async () => {
          await reload()
          setView('list')
        }}
      />
    )
  }

  const navItems = [
    { id: 'pet-list', label: '내 반려동물', petOnly: false },
    { id: 'ocr-scan', label: '성분표 스캔', petOnly: false },
    { id: 'pet-weights', label: '체중 관리', petOnly: true },
    { id: 'pet-vaccinations', label: '예방접종 관리', petOnly: true },
    { id: 'pet-timeline', label: '통합 타임라인', petOnly: true },
  ]

  return (
    <>
      <nav className="section-nav">
        {navItems.map((item) => {
          const disabled = item.petOnly && !selectedPet
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`section-nav-item${disabled ? ' disabled' : ''}`}
              onClick={(e) => { if (disabled) e.preventDefault() }}
              aria-disabled={disabled}
            >
              {item.label}
            </a>
          )
        })}
      </nav>

      <div className="pets-layout">
      <div className="pets-main">
      <section id="pet-list" className="card">
        <div className="card-header">
          <h2>내 반려동물 ({pets.length})</h2>
          <button type="button" onClick={() => setView('register')}>+ 반려동물 등록</button>
        </div>
        {loading && <p>로딩 중…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && pets.length === 0 && <p className="muted">아직 등록된 반려동물이 없습니다.</p>}
        <ul className="pet-list">
          {pets.map((p) => (
            <li
              key={p.id}
              className={`pet-item${selectedPetId === p.id ? ' selected' : ''}`}
              onClick={() => setSelectedPetId(selectedPetId === p.id ? null : p.id)}
              style={{ cursor: 'pointer' }}
            >
              <strong>{p.name}</strong>
              <span className="badge">{p.species === 'dog' ? '🐶 강아지' : '🐱 고양이'}</span>
              {p.breed && <span className="muted"> · {p.breed}</span>}
              {p.birth && <span className="muted"> · {p.birth}</span>}
              {p.gender && <span className="muted"> · {p.gender === 'M' ? '수컷' : '암컷'}</span>}
              {p.neutered && <span className="muted"> · 중성화</span>}
              {p.allergies.length > 0 && (
                <div className="allergies">
                  알러지: {p.allergies.map((a) => <span key={a} className="chip">{a}</span>)}
                </div>
              )}
            </li>
          ))}
        </ul>

      </section>

      <div id="ocr-scan">
        <OcrPanel pets={pets} onChanged={bumpTimeline} />
      </div>

      {selectedPet && (
        <>
          <section id="pet-weights" className="card">
            <WeightsPanel
              petId={selectedPet.id}
              petName={selectedPet.name}
              onChanged={bumpTimeline}
            />
          </section>
          <section id="pet-vaccinations" className="card">
            <VaccinationsPanel
              petId={selectedPet.id}
              petName={selectedPet.name}
              species={selectedPet.species}
              onChanged={bumpTimeline}
            />
          </section>
          <section id="pet-timeline" className="card timeline-card">
            <TimelinePanel
              petId={selectedPet.id}
              petName={selectedPet.name}
              refreshKey={timelineVersion}
            />
          </section>
        </>
      )}
      </div>
      </div>
    </>
  )
}

function PetRegisterPage({
  onBack,
  onCreated,
}: {
  onBack: () => void
  onCreated: () => void
}) {
  return (
    <section className="card register-page">
      <div className="card-header">
        <button type="button" onClick={onBack}>← 돌아가기</button>
        <h2>반려동물 등록</h2>
      </div>
      <PetForm onCreated={onCreated} />
    </section>
  )
}

function PetForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog')
  const [breed, setBreed] = useState('')
  const [birth, setBirth] = useState('')
  const [gender, setGender] = useState<'' | 'M' | 'F'>('')
  const [neutered, setNeutered] = useState(false)
  const [allergiesText, setAllergiesText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const allergies = allergiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      await api.createPet({
        name,
        species,
        breed: breed || undefined,
        birth: birth || undefined,
        gender: gender || undefined,
        neutered,
        allergies,
      })
      // 폼 리셋
      setName(''); setBreed(''); setBirth(''); setGender(''); setNeutered(false); setAllergiesText('')
      onCreated()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label>
        이름 *
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
      </label>
      <label>
        종 *
        <select value={species} onChange={(e) => setSpecies(e.target.value as 'dog' | 'cat')}>
          <option value="dog">강아지</option>
          <option value="cat">고양이</option>
        </select>
      </label>
      <label>
        품종
        <input value={breed} onChange={(e) => setBreed(e.target.value)} maxLength={60} placeholder="예: 푸들" />
      </label>
      <label>
        생년월일
        <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
      </label>
      <label>
        성별
        <select value={gender} onChange={(e) => setGender(e.target.value as '' | 'M' | 'F')}>
          <option value="">(선택 안 함)</option>
          <option value="M">수컷</option>
          <option value="F">암컷</option>
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={neutered} onChange={(e) => setNeutered(e.target.checked)} />
        중성화 함
      </label>
      <label>
        알러지 <small>(쉼표로 구분, 예: 닭고기, 감자)</small>
        <input value={allergiesText} onChange={(e) => setAllergiesText(e.target.value)} placeholder="닭고기, 감자" />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={busy}>
        {busy ? '등록 중…' : '등록'}
      </button>
    </form>
  )
}

export default App

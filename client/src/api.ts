// 백엔드 호출 유틸. 모든 요청에 credentials: 'include'를 강제해
// httpOnly 쿠키(Access Token)가 함께 전송되도록 한다.

export interface ApiError {
  status: number
  code: string
  issues?: unknown
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  // 본문이 없을 수도 있음 (204 등)
  const text = await res.text()
  const body = text ? JSON.parse(text) : null

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      code: (body && (body.error as string)) || 'unknown_error',
      issues: body?.issues,
    }
    throw err
  }
  return body as T
}

export interface AuthUser {
  id: string
  email: string
}

export interface Pet {
  id: string
  name: string
  species: 'dog' | 'cat'
  breed: string | null
  birth: string | null
  gender: 'M' | 'F' | null
  neutered: boolean
  allergies: string[]
  createdAt: string
}

export interface Vaccine {
  id: number
  species: 'dog' | 'cat' | 'both'
  name: string
  recommendWeeks: number | null
  doseTotal: number
  intervalWeeks: number | null
  boosterWeeks: number | null
  mandatory: boolean
  severity: 'high' | 'low'
}

export interface VaccinationRecord {
  id: string
  petId: string
  vaccineId: number
  vaccineName: string
  vaccineMandatory: boolean
  vaccineSeverity: 'high' | 'low'
  doseNo: number
  doseTotal: number
  vaccinatedAt: string
  nextDueAt: string | null
  daysUntilNext: number | null
  source: 'manual' | 'ocr'
  memo: string | null
  createdAt: string
}

export interface MatchedFood {
  id: string
  name: string
  severity: 'high' | 'medium' | 'low'
  symptoms: string | null
}

export interface ScanResult {
  docType: 'ingredient' | 'receipt' | 'unknown'
  extractedText: string
  /** OCR 텍스트의 "제품명" 라벨에서 자동 추출한 값. 없으면 null. */
  productName: string | null
  matches: {
    dangerFoods: MatchedFood[]
    allergies: string[]
  } | null
  disclaimer: string
}

export interface IngredientScan {
  id: string
  petId: string
  extractedText: string
  matchedFoods: MatchedFood[]
  matchedAllergies: string[]
  productName: string | null
  scannedAt: string
  disclaimer?: string
}

export interface WeightRecord {
  id: string
  petId: string
  weight: number
  recordedAt: string
  memo: string | null
  createdAt: string
}

export type WeightJudgement = 'normal' | 'over' | 'under' | 'unknown'

export interface CreateWeightResponse {
  record: WeightRecord
  judgement: WeightJudgement
  surge: boolean
  deltaRatio: number | null
}

// 통합 타임라인 — discriminated union (서버 PLAN §4.7)
export type TimelineEvent =
  | {
      type: 'weight'
      id: string
      petId: string
      occurredAt: string
      weight: number
      memo: string | null
      surge: boolean
      deltaRatio: number | null
    }
  | {
      type: 'vaccination'
      id: string
      petId: string
      occurredAt: string
      vaccineId: number
      vaccineName: string
      mandatory: boolean
      severity: 'high' | 'low'
      doseNo: number
      doseTotal: number
      source: 'manual' | 'ocr'
      nextDueAt: string | null
      memo: string | null
    }
  | {
      type: 'ingredient_scan'
      id: string
      petId: string
      occurredAt: string
      matchedFoods: MatchedFood[]
      matchedAllergies: string[]
      extractedTextPreview: string
      /** OCR 첫 줄에서 추출한 제품명 후보 — 없으면 null */
      productName: string | null
    }

export interface DashboardAlert {
  recordId: string
  petName: string
  vaccineName: string
  mandatory: boolean
  nextDueAt: string
  daysUntil: number
  alertType: 'd7' | 'd1' | 'dday' | 'overdue'
}

export interface TimelinePage {
  events: TimelineEvent[]
  nextBefore: string | null
}

// multipart 전송용 — Content-Type 헤더를 브라우저가 자동 설정하도록 headers 제외
async function upload<T>(path: string, body: FormData): Promise<T> {
  const res = await fetch(path, { method: 'POST', credentials: 'include', body })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      code: (data && (data.error as string)) || 'unknown_error',
    }
    throw err
  }
  return data as T
}

export const api = {
  register: (email: string, password: string) =>
    request<AuthUser>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<null>('/api/auth/logout', {
      method: 'POST',
    }),

  me: () => request<AuthUser>('/api/auth/me'),

  listPets: () => request<Pet[]>('/api/pets'),

  createPet: (input: {
    name: string
    species: 'dog' | 'cat'
    breed?: string
    birth?: string
    gender?: 'M' | 'F'
    neutered?: boolean
    allergies?: string[]
  }) =>
    request<Pet>('/api/pets', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listVaccines: (species: 'dog' | 'cat') =>
    request<Vaccine[]>(`/api/vaccines?species=${species}`),

  listVaccinations: (petId: string) =>
    request<VaccinationRecord[]>(`/api/pets/${petId}/vaccinations`),

  createVaccination: (
    petId: string,
    input: { vaccineId: number; doseNo: number; vaccinatedAt: string; memo?: string },
  ) =>
    request<VaccinationRecord>(`/api/pets/${petId}/vaccinations`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  deleteVaccination: (petId: string, id: string) =>
    request<null>(`/api/pets/${petId}/vaccinations/${id}`, { method: 'DELETE' }),

  // OCR 스캔 — 이미지 업로드 후 분류·매칭 결과 반환 (저장 X)
  scanOcr: (petId: string, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return upload<ScanResult>(`/api/ocr/scan?petId=${petId}`, form)
  },

  // 스캔 결과 확정 저장
  confirmScan: (input: {
    petId: string
    extractedText: string
    matchedFoodsJson: MatchedFood[]
    matchedAllergiesJson: string[]
    productName?: string | null
  }) =>
    request<IngredientScan>('/api/ingredient-scans/confirm', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listWeights: (petId: string) =>
    request<WeightRecord[]>(`/api/pets/${petId}/weights`),

  createWeight: (
    petId: string,
    input: { weight: number; recordedAt?: string; memo?: string },
  ) =>
    request<CreateWeightResponse>(`/api/pets/${petId}/weights`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  deleteWeight: (petId: string, id: string) =>
    request<null>(`/api/pets/${petId}/weights/${id}`, { method: 'DELETE' }),

  getTimeline: (petId: string, params?: { limit?: number; before?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.before) qs.set('before', params.before)
    const s = qs.toString()
    return request<TimelinePage>(`/api/pets/${petId}/timeline${s ? `?${s}` : ''}`)
  },

  getChatHistory: (petId: string) =>
    request<Array<{ id: string; role: 'user' | 'assistant'; message: string; createdAt: string }>>(
      `/api/pets/${petId}/chat`,
    ),

  sendChatMessage: (petId: string, message: string) =>
    request<{ answer: string }>(`/api/pets/${petId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  listNotifications: () => request<DashboardAlert[]>('/api/notifications'),

  deletePet: (petId: string) =>
    request<null>(`/api/pets/${petId}`, { method: 'DELETE' }),
}

// 사용자 친화적 에러 메시지 매핑
export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as ApiError).code
    switch (code) {
      case 'email_already_registered':
        return '이미 가입된 이메일입니다.'
      case 'password_compromised':
        return '유출 이력이 있는 비밀번호입니다. 다른 비밀번호를 사용해주세요.'
      case 'invalid_credentials':
        return '이메일 또는 비밀번호가 올바르지 않습니다.'
      case 'unauthenticated':
        return '로그인이 필요합니다.'
      case 'invalid_request':
        return '입력값이 올바르지 않습니다.'
      default:
        return `오류: ${code}`
    }
  }
  return '네트워크 오류가 발생했습니다.'
}

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

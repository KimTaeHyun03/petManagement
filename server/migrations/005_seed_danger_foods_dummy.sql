-- 005_seed_danger_foods_dummy.sql
-- 위험 음식 더미 시드 5개 (검수 전 테스트용)
-- 풀 시드(23개)는 장윤서 검수 후 별도 마이그레이션으로 추가 예정
-- 출처: ASPCA Animal Poison Control Center (https://www.aspca.org/pet-care/animal-poison-control)

INSERT INTO danger_foods (name, name_en, toxic_compound, symptoms, severity, source_url)
VALUES
  (
    '초콜릿',
    'Chocolate',
    'Theobromine, Caffeine',
    '구토, 설사, 빠른 호흡, 근육 경련, 발작. 다크·베이킹 초콜릿이 특히 위험.',
    'high',
    'https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants'
  ),
  (
    '양파',
    'Onion',
    'N-propyl disulfide',
    '적혈구 손상(용혈성 빈혈), 구토, 무기력, 창백한 잇몸. 익혀도 독성 유지.',
    'high',
    'https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants'
  ),
  (
    '포도',
    'Grape',
    '미확인 독성 물질',
    '급성 신부전, 구토, 설사, 무기력. 건포도도 동일하게 위험.',
    'high',
    'https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants'
  ),
  (
    '자일리톨',
    'Xylitol',
    'Xylitol',
    '인슐린 과다 분비로 인한 저혈당, 구토, 허약, 발작, 간부전.',
    'high',
    'https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants'
  ),
  (
    '마카다미아',
    'Macadamia',
    '미확인 독성 물질',
    '허약증, 고체온, 구토, 떨림, 관절 통증. 강아지에게만 보고됨.',
    'medium',
    'https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants'
  )
ON CONFLICT (name) DO NOTHING;

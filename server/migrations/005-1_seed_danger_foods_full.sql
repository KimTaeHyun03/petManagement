-- 005-1_seed_danger_foods_full.sql
-- 위험 음식 풀 시드 — 005(더미 5개)에 18개 추가하여 총 23개로 확장.
-- 출처: ASPCA Animal Poison Control + Merck Veterinary Manual 교차검증 (CLAUDE.md "2개 이상 출처" 규칙)
-- 자료: research/research_yunseo.md (장윤서 자료조사)
-- ON CONFLICT (name) DO NOTHING — 005와 중복되어도 안전 (실행 순서 무관).

INSERT INTO danger_foods (name, name_en, toxic_compound, symptoms, severity, source_url)
VALUES
  -- ── 알코올 / 카페인 계열 (메틸크산틴·에탄올) ────────────────────────────────
  (
    '알코올',
    'Alcohol',
    'Ethanol',
    '구토, 설사, 운동 실조, 호흡 곤란, 떨림, 혈액 pH 변화, 혼수, 사망. 섭취 후 빠르게 흡수되므로 즉시 수의사 진료 필요.',
    'high',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),
  (
    '효모 반죽',
    'Yeast Dough',
    'Ethanol (발효), Gas',
    '소화기 가스 팽창으로 복부팽만·위염전(생명 위협). 효모가 위장에서 에탄올을 생성해 알코올 중독도 유발.',
    'high',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),
  (
    '커피',
    'Coffee',
    'Caffeine, Methylxanthines',
    '구토, 설사, 헐떡거림, 과도한 갈증·배뇨, 과잉행동, 비정상 심박, 떨림, 발작.',
    'high',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),
  (
    '카페인',
    'Caffeine',
    'Caffeine, Methylxanthines',
    '에너지드링크·차·각성제 등에 함유. 비정상 심박, 떨림, 발작, 사망 가능.',
    'high',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),

  -- ── 알리움(Allium)속 ───────────────────────────────────────────────────────
  (
    '마늘',
    'Garlic',
    'N-propyl disulfide, Thiosulfate',
    '알리움 속. 위장 자극과 적혈구 손상으로 빈혈 유발. 양파보다 단위 무게당 독성이 강함.',
    'high',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),
  (
    '부추',
    'Chives',
    'N-propyl disulfide, Thiosulfate',
    '알리움 속. 양파·마늘과 같은 적혈구 손상·빈혈 위험. 고양이가 특히 취약.',
    'high',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),

  -- ── 과일 ───────────────────────────────────────────────────────────────────
  (
    '건포도',
    'Raisin',
    '미확인 독성 물질 (주석산 추정)',
    '포도와 동일한 독성. 급성 신부전, 구토, 설사, 무기력. 체중 4.5kg당 한 알도 위험.',
    'high',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),
  (
    '아보카도',
    'Avocado',
    'Persin',
    '개·고양이는 위장 자극(구토·설사) 위주. 잎·줄기·씨앗이 가장 독성이 강함. 조류·반추동물에게는 치명적.',
    'medium',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),

  -- ── 감귤류 (구연산·에센셜 오일) ─────────────────────────────────────────────
  (
    '레몬',
    'Lemon',
    'Citric acid, Essential oils',
    '감귤류. 다량 섭취 시 위장 자극·구토·우울증 가능. 소량은 보통 가벼운 복통.',
    'low',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),
  (
    '라임',
    'Lime',
    'Citric acid, Essential oils',
    '감귤류. 껍질·잎·씨앗에 자극 성분 농축. 위장 자극·우울증 가능.',
    'low',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),
  (
    '자몽',
    'Grapefruit',
    'Citric acid, Psoralens, Essential oils',
    '감귤류 중 비교적 자극 강한 편. 위장 자극·구토·광과민성 가능.',
    'medium',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),
  (
    '오렌지',
    'Orange',
    'Citric acid, Essential oils',
    '감귤류. 과육 소량은 대체로 안전하나 껍질·씨·잎은 위장 자극·우울증 유발 가능.',
    'low',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),

  -- ── 유제품 ─────────────────────────────────────────────────────────────────
  (
    '우유',
    'Milk',
    'Lactose',
    '반려동물은 락타아제가 부족해 유당을 분해하지 못함. 설사·소화 장애 유발.',
    'low',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),

  -- ── 견과류 (지방·췌장염 위험) ──────────────────────────────────────────────
  (
    '아몬드',
    'Almond',
    'Fat (고지방)',
    '고지방으로 구토·설사·췌장염 위험. 통째 삼키면 기도·소화관 폐색 가능.',
    'medium',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),
  (
    '피칸',
    'Pecan',
    'Fat, Juglone',
    '고지방 + 곰팡이(주글론) 노출 시 신경 독성. 췌장염·떨림·발작 가능.',
    'medium',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),
  (
    '호두',
    'Walnut',
    'Fat, Juglone, Tremorgenic mycotoxins',
    '고지방·곰팡이 독소로 췌장염·떨림·발작 위험. 흑호두(black walnut)가 특히 위험.',
    'medium',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),
  (
    '코코넛',
    'Coconut',
    'Medium-chain triglycerides',
    '소량은 대체로 안전하지만 신선한 과육·코코넛 밀크의 기름이 위장 장애·묽은 변·설사 유발.',
    'low',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  ),

  -- ── 소금 ───────────────────────────────────────────────────────────────────
  (
    '소금',
    'Salt',
    'Sodium chloride',
    '과다 섭취 시 갈증·소변량 증가, 전해질 이상. 구토·설사·우울증·떨림·발작·사망 가능.',
    'medium',
    'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  )
ON CONFLICT (name) DO NOTHING;

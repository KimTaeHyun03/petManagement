import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { loadPetContext, loadChatHistory, saveChatLog, type PetContext } from './chatbot.repo.js';
import { HttpError } from '../../middleware/error.js';

const openai = new OpenAI({ apiKey: env.openaiApiKey });

const SYSTEM_PROMPT = `당신은 반려동물 헬스케어 서비스 PawCare의 건강 정보 안내 챗봇입니다.
아래 규칙을 반드시 지키세요:
- 진단, 처방, 투약 지시는 절대 하지 않습니다.
- 일반적인 건강 정보와 예방 관리 안내만 제공합니다.
- 응급 증상(호흡곤란, 경련, 대량 출혈 등)이 언급되면 즉시 동물병원 방문을 권장합니다.
- 답변 마지막에는 항상 "본 정보는 참고용이며, 정확한 진단은 수의사에게 문의하세요." 를 포함합니다.
- 한국어로 답변합니다.`;

function buildContextMessage(ctx: PetContext): string {
  const lines: string[] = [
    `[반려동물 정보]`,
    `이름: ${ctx.name}`,
    `종: ${ctx.species === 'dog' ? '강아지' : '고양이'}`,
    ctx.breed ? `품종: ${ctx.breed}` : '',
    ctx.birthDate ? `생일: ${ctx.birthDate}` : '',
    ctx.allergies.length > 0 ? `알러지: ${ctx.allergies.join(', ')}` : '알러지: 없음',
  ];

  if (ctx.recentWeights.length > 0) {
    const latest = ctx.recentWeights[0]!;
    lines.push(`최근 체중: ${latest.weight}kg (${latest.recordedAt.slice(0, 10)})`);
  }

  if (ctx.upcomingVaccinations.length > 0) {
    lines.push(`예정된 접종: ${ctx.upcomingVaccinations.map((v) => `${v.name}(${v.dueAt})`).join(', ')}`);
  }

  if (ctx.recentScans.length > 0) {
    const scanSummary = ctx.recentScans
      .map((s) => {
        const product = s.productName ?? '제품명 미상';
        const foods = s.matchedFoods.length > 0 ? `위험성분: ${s.matchedFoods.join(', ')}` : '위험성분 없음';
        return `${product}(${foods})`;
      })
      .join(' / ');
    lines.push(`최근 성분표 스캔: ${scanSummary}`);
  }

  return lines.filter(Boolean).join('\n');
}

export async function getHistory(petId: string, userId: string) {
  const rows = await loadChatHistory(petId, userId);
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    message: r.message,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function chat(
  petId: string,
  userId: string,
  userMessage: string,
): Promise<string> {
  const ctx = await loadPetContext(petId, userId);
  if (!ctx) throw new HttpError(403, 'forbidden');

  const contextMessage = buildContextMessage(ctx);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: contextMessage },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 800,
    temperature: 0.5,
  });

  const answer = completion.choices[0]?.message?.content ?? '응답을 받지 못했습니다.';

  // 사용자 메시지와 답변을 각각 로그 저장 (context_snapshot은 assistant 행에만)
  await saveChatLog(userId, petId, 'user', userMessage, null);
  await saveChatLog(userId, petId, 'assistant', answer, ctx);

  return answer;
}

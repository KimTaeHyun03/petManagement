import { sendMail } from '../notifications/mailer.js';
import { getOwnerEmailAndPetName, insertAlert } from './weights.repo.js';

// PLAN §4.3 / §6 — 체중 ±10% 급변 즉시 알림.
// 호출 측은 surge 가 true 일 때만 호출하면 됨. 실패해도 throw 하지 않고 로그만 — API 응답을 막지 않음.
export async function notifyWeightSurge(params: {
  petId: string;
  weightRecordId: string;
  prevWeight: number;
  newWeight: number;
  deltaRatio: number;
  recordedAt: string;
}): Promise<void> {
  const { petId, weightRecordId, prevWeight, newWeight, deltaRatio, recordedAt } = params;

  try {
    const inserted = await insertAlert(petId, weightRecordId, prevWeight, newWeight, deltaRatio);
    if (!inserted) {
      // 동일 weight_record_id 에 대해 이미 발송 — 중복 호출이라 조용히 종료
      return;
    }

    const target = await getOwnerEmailAndPetName(petId);
    if (!target) {
      console.error(`[weights.notify] pet or owner not found — petId=${petId}`);
      return;
    }

    await sendMail(target.email, buildSubject(target.petName, deltaRatio), buildHtml({
      petName: target.petName,
      prevWeight,
      newWeight,
      deltaRatio,
      recordedAt,
    }));
  } catch (err) {
    console.error('[weights.notify] 발송 실패', err);
  }
}

function formatPct(deltaRatio: number): string {
  const sign = deltaRatio >= 0 ? '+' : '';
  return `${sign}${(deltaRatio * 100).toFixed(1)}%`;
}

function buildSubject(petName: string, deltaRatio: number): string {
  return `[체중 급변] ${petName}의 체중이 ${formatPct(deltaRatio)} 변동되었습니다`;
}

function buildHtml(p: {
  petName: string;
  prevWeight: number;
  newWeight: number;
  deltaRatio: number;
  recordedAt: string;
}): string {
  const direction = p.deltaRatio < 0 ? '감소' : '증가';
  const color = p.deltaRatio < 0 ? '#dc2626' : '#d97706';
  const deltaKg = p.newWeight - p.prevWeight;
  const deltaKgLabel = `${deltaKg >= 0 ? '+' : ''}${deltaKg.toFixed(2)} kg`;
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
      <div style="background:${color};padding:16px 20px">
        <h2 style="margin:0;color:#fff;font-size:16px">⚖ 체중 급변 알림</h2>
      </div>
      <div style="padding:20px">
        <p style="margin:0 0 12px"><strong>${p.petName}</strong>의 체중이 직전 기록 대비
          <strong style="color:${color}">${formatPct(p.deltaRatio)}</strong> ${direction}했습니다.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="color:#6b7280;padding:4px 0">이전 체중</td><td><strong>${p.prevWeight} kg</strong></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">현재 체중</td><td><strong>${p.newWeight} kg (${deltaKgLabel})</strong></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">측정 시각</td><td>${p.recordedAt}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
        <p style="font-size:12px;color:#9ca3af;margin:0">본 정보는 참고용이며 응급 시 동물병원 방문을 권장합니다.</p>
      </div>
    </div>
  `;
}

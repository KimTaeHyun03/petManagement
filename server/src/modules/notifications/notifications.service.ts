// PLAN §6 알림 정책
// - 다음 접종일 D-7, D-1, D-day → Push / Email
// - 의무 백신(광견병 등) 기한 초과 → 강조 경고 이메일
// 중복 방지: notification_log 에서 오늘 이미 발송된 건 skip

import { pool } from '../../db/pool.js';
import { sendMail } from './mailer.js';

export interface DashboardAlert {
  recordId: string;
  petName: string;
  vaccineName: string;
  mandatory: boolean;
  nextDueAt: string;
  daysUntil: number;
  alertType: 'd7' | 'd1' | 'dday' | 'overdue';
}

// 로그인 사용자의 대시보드 알림 조회 (D-7/D-1/D-day + 의무백신 기한초과)
export async function queryUserAlerts(userId: string): Promise<DashboardAlert[]> {
  const { rows } = await pool.query<{
    record_id: string;
    pet_name: string;
    vaccine_name: string;
    mandatory: boolean;
    next_due_at: string;
    days_until: number;
  }>(
    `SELECT
      r.id           AS record_id,
      p.name         AS pet_name,
      v.name         AS vaccine_name,
      v.mandatory,
      r.next_due_at::text AS next_due_at,
      (r.next_due_at - CURRENT_DATE)::int AS days_until
    FROM vaccination_records r
    JOIN pets    p ON p.id = r.pet_id
    JOIN vaccines v ON v.id = r.vaccine_id
    WHERE p.user_id = $1
      AND r.next_due_at IS NOT NULL
      AND (
        (r.next_due_at - CURRENT_DATE) IN (7, 1, 0)
        OR
        (v.mandatory = TRUE AND r.next_due_at < CURRENT_DATE)
      )
    ORDER BY r.next_due_at ASC`,
    [userId],
  );

  return rows.map((r) => ({
    recordId: r.record_id,
    petName: r.pet_name,
    vaccineName: r.vaccine_name,
    mandatory: r.mandatory,
    nextDueAt: r.next_due_at,
    daysUntil: r.days_until,
    alertType: r.days_until < 0 ? 'overdue' : r.days_until === 7 ? 'd7' : r.days_until === 1 ? 'd1' : 'dday',
  }));
}

interface DueRecord {
  record_id: string;
  user_id: string;
  user_email: string;
  pet_name: string;
  vaccine_name: string;
  mandatory: boolean;
  next_due_at: string;
  days_until: number;
}

// 오늘 기준 D-7 / D-1 / D-day / 기한초과(의무백신) 대상 조회
async function queryDueRecords(): Promise<DueRecord[]> {
  const { rows } = await pool.query<DueRecord>(`
    SELECT
      r.id           AS record_id,
      u.id           AS user_id,
      u.email        AS user_email,
      p.name         AS pet_name,
      v.name         AS vaccine_name,
      v.mandatory,
      r.next_due_at::text AS next_due_at,
      (r.next_due_at - CURRENT_DATE)::int AS days_until
    FROM vaccination_records r
    JOIN pets    p ON p.id = r.pet_id
    JOIN users   u ON u.id = p.user_id
    JOIN vaccines v ON v.id = r.vaccine_id
    WHERE r.next_due_at IS NOT NULL
      AND (
        -- D-7, D-1, D-day
        (r.next_due_at - CURRENT_DATE) IN (7, 1, 0)
        OR
        -- 의무 백신 기한 초과
        (v.mandatory = TRUE AND r.next_due_at < CURRENT_DATE)
      )
  `);
  return rows;
}

// 오늘 이미 발송한 알림인지 확인
async function isAlreadySent(recordId: string, notifyType: string): Promise<boolean> {
  const { rows } = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt
     FROM notification_log
     WHERE vaccination_record_id = $1
       AND notify_type = $2
       AND sent_at::date = CURRENT_DATE`,
    [recordId, notifyType],
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

// 발송 이력 기록
async function logNotification(
  userId: string,
  petId: string,
  recordId: string,
  notifyType: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO notification_log (user_id, pet_id, vaccination_record_id, notify_type)
     VALUES ($1, $2, $3, $4)`,
    [userId, petId, recordId, notifyType],
  );
}

// pet_id 조회 헬퍼
async function getPetId(recordId: string): Promise<string> {
  const { rows } = await pool.query<{ pet_id: string }>(
    'SELECT pet_id FROM vaccination_records WHERE id = $1',
    [recordId],
  );
  return rows[0]!.pet_id;
}

function notifyType(daysUntil: number, mandatory: boolean): string {
  if (daysUntil < 0 && mandatory) return 'overdue';
  if (daysUntil === 7) return 'd7';
  if (daysUntil === 1) return 'd1';
  return 'dday';
}

function buildSubject(rec: DueRecord): string {
  if (rec.days_until < 0) return `[긴급] ${rec.pet_name}의 광견병 접종이 ${Math.abs(rec.days_until)}일 초과되었습니다`;
  if (rec.days_until === 0) return `[D-day] ${rec.pet_name}의 ${rec.vaccine_name} 접종일입니다`;
  return `[D-${rec.days_until}] ${rec.pet_name}의 ${rec.vaccine_name} 접종일이 ${rec.days_until}일 남았습니다`;
}

function buildHtml(rec: DueRecord): string {
  const urgencyColor = rec.days_until < 0 ? '#dc2626' : rec.days_until === 0 ? '#d97706' : '#2563eb';
  const urgencyLabel = rec.days_until < 0
    ? `⚠ <strong style="color:#dc2626">기한 ${Math.abs(rec.days_until)}일 초과</strong>`
    : rec.days_until === 0
      ? '💉 <strong>오늘이 접종일입니다</strong>'
      : `📅 접종일까지 <strong>D-${rec.days_until}</strong>`;

  const mandatoryNote = rec.mandatory
    ? `<p style="color:#dc2626;font-weight:bold">⚠ 광견병은 가축전염병예방법 제5조에 따른 법적 의무 접종입니다. 미접종 시 과태료가 부과될 수 있습니다.</p>`
    : '';

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
      <div style="background:${urgencyColor};padding:16px 20px">
        <h2 style="margin:0;color:#fff;font-size:16px">🐾 반려동물 예방접종 알림</h2>
      </div>
      <div style="padding:20px">
        <p style="margin:0 0 12px">${urgencyLabel}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="color:#6b7280;padding:4px 0">반려동물</td><td><strong>${rec.pet_name}</strong></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">백신</td><td><strong>${rec.vaccine_name}</strong></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">접종 예정일</td><td><strong>${rec.next_due_at}</strong></td></tr>
        </table>
        ${mandatoryNote}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
        <p style="font-size:12px;color:#9ca3af;margin:0">본 정보는 참고용이며 응급 시 동물병원 방문을 권장합니다.</p>
      </div>
    </div>
  `;
}

// 매일 실행되는 알림 체크 메인 함수
export async function runNotificationCheck(): Promise<void> {
  console.log('[notifications] 접종 알림 체크 시작');
  const records = await queryDueRecords();
  console.log(`[notifications] 대상 ${records.length}건`);

  let sent = 0;
  let skipped = 0;

  for (const rec of records) {
    const type = notifyType(rec.days_until, rec.mandatory);
    const already = await isAlreadySent(rec.record_id, type);

    if (already) {
      skipped++;
      continue;
    }

    try {
      await sendMail(rec.user_email, buildSubject(rec), buildHtml(rec));
      const petId = await getPetId(rec.record_id);
      await logNotification(rec.user_id, petId, rec.record_id, type);
      sent++;
    } catch (err) {
      console.error(`[notifications] 발송 실패 (record: ${rec.record_id})`, err);
    }
  }

  console.log(`[notifications] 완료 — 발송 ${sent}건, 중복 skip ${skipped}건`);
}

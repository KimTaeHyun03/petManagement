import cron from 'node-cron';
import { runNotificationCheck } from './notifications.service.js';

// 매일 오전 9시 (KST = UTC+9 → UTC 00:00) 알림 발송
// 크론 표현식: 초 분 시 일 월 요일
const CRON_SCHEDULE = '0 0 * * *'; // UTC 00:00 = KST 09:00

export function startScheduler(): void {
  cron.schedule(CRON_SCHEDULE, () => {
    runNotificationCheck().catch((err) => {
      console.error('[scheduler] 알림 체크 오류', err);
    });
  });
  console.log('[scheduler] 접종 알림 스케줄러 시작 (매일 KST 09:00)');
}

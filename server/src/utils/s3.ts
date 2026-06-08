import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env, s3Enabled } from '../config/env.js';
import { HttpError } from '../middleware/error.js';

// s3Enabled일 때만 클라이언트를 생성한다 (미설정 환경에서 부팅 실패 방지).
// 키가 .env에 있으면 명시적으로 사용하고(로컬 개발), 없으면 credentials를 생략해
// SDK 기본 자격증명 체인이 EC2 인스턴스 IAM Role을 자동으로 사용하도록 둔다.
const hasExplicitKeys = Boolean(env.awsAccessKeyId && env.awsSecretAccessKey);
const client = s3Enabled
  ? new S3Client({
      region: env.awsRegion,
      ...(hasExplicitKeys
        ? {
            credentials: {
              accessKeyId: env.awsAccessKeyId,
              secretAccessKey: env.awsSecretAccessKey,
            },
          }
        : {}),
    })
  : null;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * 이미지 버퍼를 S3에 업로드하고 공개 접근 URL을 반환한다.
 * 키는 `{prefix}/{userId}/{uuid}.{ext}` — 펫 단위/사용자 단위 격리 + UUID로 추측 차단.
 * 버킷은 정책으로 public read가 설정돼 있다고 가정한다(객체 ACL 미사용).
 */
export async function uploadImage(
  buffer: Buffer,
  mimetype: string,
  prefix: string,
  userId: string,
): Promise<string> {
  if (!client) {
    // s3Enabled=false인데 호출됐다면 호출부의 가드가 빠진 것.
    throw new HttpError(503, 'image_storage_not_configured');
  }
  const ext = EXT_BY_MIME[mimetype] ?? 'bin';
  const key = `${prefix}/${userId}/${randomUUID()}.${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    }),
  );

  return `https://${env.s3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
}

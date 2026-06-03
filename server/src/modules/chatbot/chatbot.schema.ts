import { z } from 'zod';

export const SendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

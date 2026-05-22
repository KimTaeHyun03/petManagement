import { createApp } from './app.js';
import { env } from './config/env.js';
import { startScheduler } from './modules/notifications/scheduler.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`server on :${env.port}`);
  startScheduler();
});

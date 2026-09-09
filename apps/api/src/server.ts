import cors from 'cors';
import express from 'express';
import { errorHandler } from './http.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { ensureBuiltInSources } from './services/built-in-sources.js';
import { jwtSecret } from './config.js';
import { migrate } from './services/migrations.js';

const app = express();
app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(publicRouter);
app.use(authRouter);
app.use('/admin', adminRouter);
app.use(errorHandler);

async function start() {
  jwtSecret();
  await migrate();
  await ensureBuiltInSources();

  app.listen(Number(process.env.PORT || 3001), () => {
    console.log('API listening on 3001');
  });
}

void start().catch((error: unknown) => {
  console.error('API startup failed', error);
  process.exitCode = 1;
});

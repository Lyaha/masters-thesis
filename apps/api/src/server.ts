import cors from 'cors';
import express from 'express';
import { errorHandler } from './http.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { ensureBuiltInSources } from './services/built-in-sources.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(publicRouter);
app.use(authRouter);
app.use('/admin', adminRouter);
app.use(errorHandler);

async function start() {
  await ensureBuiltInSources();

  app.listen(Number(process.env.PORT || 3001), () => {
    console.log('API listening on 3001');
  });
}

void start().catch((error: unknown) => {
  console.error('API startup failed', error);
  process.exitCode = 1;
});

import cors from 'cors';
import express from 'express';
import { errorHandler } from './http.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(publicRouter);
app.use(authRouter);
app.use('/admin', adminRouter);
app.use(errorHandler);

app.listen(Number(process.env.PORT || 3001), () => {
  console.log('API listening on 3001');
});

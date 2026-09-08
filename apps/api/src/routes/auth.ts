import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { requireAuth, tokenFor, type AuthRequest } from '../auth.js';
import { query } from '../db.js';
import { asyncRoute } from '../http.js';
import { credentialsSchema, profileSchema } from '../schemas.js';

export const authRouter = Router();

authRouter.post(
  '/auth/register',
  asyncRoute(async (request, response) => {
    const credentials = credentialsSchema.safeParse(request.body);

    if (!credentials.success) {
      response.status(400).json({ error: 'Вкажіть коректний email і пароль від 8 символів' });
      return;
    }

    try {
      const passwordHash = await bcrypt.hash(credentials.data.password, 10);
      const { rows } = await query<{ id: string; role: string }>(
        'INSERT INTO users(email, password_hash) VALUES($1, $2) RETURNING id, role',
        [credentials.data.email, passwordHash],
      );

      response.status(201).json({ token: tokenFor(rows[0]), role: rows[0].role });
    } catch {
      response.status(409).json({ error: 'Цей email вже зареєстрований' });
    }
  }),
);

authRouter.post(
  '/auth/login',
  asyncRoute(async (request, response) => {
    const credentials = credentialsSchema.safeParse(request.body);

    if (!credentials.success) {
      response.status(400).json({ error: 'Некоректні облікові дані' });
      return;
    }

    const { rows } = await query<{ id: string; role: string; password_hash: string }>(
      'SELECT id, role, password_hash FROM users WHERE email = $1',
      [credentials.data.email],
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(credentials.data.password, user.password_hash))) {
      response.status(401).json({ error: 'Неправильний email або пароль' });
      return;
    }

    response.json({ token: tokenFor(user), role: user.role });
  }),
);

authRouter.put(
  '/profile/statistics',
  requireAuth,
  asyncRoute(async (request, response) => {
    const authRequest = request as AuthRequest;
    const profile = profileSchema.safeParse(authRequest.body);

    if (!profile.success) {
      response.status(400).json({ error: 'Заповніть усі поля та підтвердьте згоду' });
      return;
    }

    await query(
      `INSERT INTO voluntary_profiles(user_id, gender_identity, institution, specialty, education_level)
       VALUES($1, $2, $3, $4, $5)
       ON CONFLICT(user_id) DO UPDATE SET
         gender_identity = EXCLUDED.gender_identity,
         institution = EXCLUDED.institution,
         specialty = EXCLUDED.specialty,
         education_level = EXCLUDED.education_level,
         consent_given_at = now()`,
      [
        authRequest.user!.id,
        profile.data.genderIdentity,
        profile.data.institution,
        profile.data.specialty,
        profile.data.educationLevel,
      ],
    );

    response.status(204).end();
  }),
);

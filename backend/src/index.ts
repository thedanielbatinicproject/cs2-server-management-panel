import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import serverRoutes from './routes/servers';
import mapRoutes from './routes/maps';
import promptRoutes from './routes/prompts';
import userRoutes from './routes/users';
import { authMiddleware } from './auth';

const app = express();

// Handle CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/servers', authMiddleware, serverRoutes);
app.use('/api/maps', authMiddleware, mapRoutes);
app.use('/api/prompts', authMiddleware, promptRoutes);
app.use('/api/users', authMiddleware, userRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Backend listening on port ${port}`));

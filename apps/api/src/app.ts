import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Keeper API',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api', routes);

  app.use(errorHandler);

  return app;
};

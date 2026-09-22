import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Keeper API server running on http://localhost:${PORT}`);
  console.log(`📋 Healthcheck at http://localhost:${PORT}/health`);
});

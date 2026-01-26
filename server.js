import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import matchRoutes from './routes/matchRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import { initializeScheduler, runDailyTask } from './services/scheduler.js';
import { scheduleAllPendingMatches } from './services/matchScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fblive2v2')
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // Run daily task on startup (server resilience)
    console.log('\n🔄 Running daily task on startup...');
    await runDailyTask();

    // Re-schedule pending matches (server resilience)
    console.log('\n📅 Re-scheduling pending matches...');
    await scheduleAllPendingMatches();

    // Initialize daily scheduler
    initializeScheduler();
    console.log('\n✅ V2 Automation Ready!\n');
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api', teamRoutes);
app.use('/api', matchRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'FBLive 2 v2 API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Teams API: http://localhost:${PORT}/api/teams`);
  console.log(`📍 Matches API: http://localhost:${PORT}/api/matches\n`);
});

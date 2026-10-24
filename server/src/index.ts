import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { registerSocketHandlers } from './sockets/socketHandler.js';
import { roomManager } from './managers/RoomManager.js';
import { wordManager } from './managers/WordManager.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// API Endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeRooms: roomManager.getRoomCount(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/rooms', (req, res) => {
  res.json({
    rooms: roomManager.getPublicRooms(),
  });
});

app.get('/api/words/categories', (req, res) => {
  res.json({
    categories: ['all', 'animals', 'food', 'objects', 'actions', 'places'],
  });
});

// Serve frontend static build in production
const clientDistPath = path.resolve(process.cwd(), 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 25000,
});

// Register real-time event handlers
registerSocketHandlers(io);

// Start server
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🎨 Skribbl Clone Server is running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Client static path: ${clientDistPath} (exists: ${fs.existsSync(clientDistPath)})`);
  console.log(`===============================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down gracefully.');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

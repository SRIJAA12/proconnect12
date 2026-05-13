import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Created uploads directory at ${uploadsDir}`);
}

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Serve frontend build (Vite dist) at root
const frontendDistDir = path.join(__dirname, 'dist');
if (fs.existsSync(frontendDistDir)) {
  app.use(express.static(frontendDistDir));
} else {
  console.warn(`Frontend build not found at ${frontendDistDir}. Run frontend build first.`);
}

// SPA fallback: let React Router handle deep links such as /student/login
// and /faculty/login after nginx proxies /proconnect/* to this app.
app.get(/.*/, (req, res) => {
  if (!fs.existsSync(frontendDistDir)) {
    return res.status(404).json({
      error: 'Frontend build not found. Run `npm run build` inside /frontend.'
    });
  }

  return res.sendFile(path.join(frontendDistDir, 'index.html'));
});

const PORT = process.env.PORT || 3035;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server available at:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  
});
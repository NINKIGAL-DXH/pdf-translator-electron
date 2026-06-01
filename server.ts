import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '5050');

app.use(cors());
app.use(express.json());

// Serve static files from dist (built React app)
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy API requests to Python Flask backend
app.use('/api', (req, res) => {
  const url = `http://127.0.0.1:5051${req.url}`;
  const options: RequestInit = {
    method: req.method,
    headers: { 'Content-Type': req.headers['content-type'] || 'application/json' },
  };

  if (req.method === 'POST') {
    options.body = JSON.stringify(req.body);
  }

  fetch(url, options)
    .then(r => r.json())
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PDF Translator server running on http://localhost:${PORT}`);
});

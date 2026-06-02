import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5050;

app.use(cors());
app.use(express.json());

// Serve React build
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy API to Python Flask on 5051
app.all('/api/*', async (req, res) => {
  try {
    const url = 'http://127.0.0.1:5051' + req.url;
    const options = { method: req.method, headers: {} };
    if (req.method === 'POST') {
      options.headers['Content-Type'] = req.headers['content-type'] || 'application/json';
      options.body = JSON.stringify(req.body);
    }
    const r = await fetch(url, options);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});

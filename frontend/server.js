const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';

// Proxy /api requests to backend
app.use('/api', createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'build')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend running on port ${PORT}`);
});

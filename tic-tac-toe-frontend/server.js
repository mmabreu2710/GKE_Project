const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = process.env.PORT || 3000;

const client = require('prom-client');

// Collect default metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

// Create custom metrics
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint']
});

const httpRequestLatencyGauge = new client.Gauge({
  name: 'http_request_latency_seconds',
  help: 'Latency of HTTP requests in seconds',
  labelNames: ['method', 'endpoint']
});

// Middleware to track requests and latency
app.use((req, res, next) => {
  const start = process.hrtime();  // High-resolution time

  // Increase request counter
  httpRequestCounter.inc({ method: req.method, endpoint: req.route ? req.route.path : req.path });

  // Track latency when the response finishes
  res.on('finish', () => {
      const duration = process.hrtime(start);  // Calculate the request duration
      const seconds = duration[0] + duration[1] / 1e9;  // Convert to seconds

      // Set the latency in seconds for the specific method and endpoint
      httpRequestLatencyGauge.set({ method: req.method, endpoint: req.route ? req.route.path : req.path }, seconds);
  });

  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Proxy requests to play-computer-service
app.use('/play-computer', createProxyMiddleware({
  target: 'http://play-computer-service.default.svc.cluster.local',
  changeOrigin: true,
  pathRewrite: { '^/play-computer': '' }  // This will strip '/play-computer' from the path
}));

// Proxy requests to play-player-service
app.use('/play-player', createProxyMiddleware({
  target: 'http://play-player-service.default.svc.cluster.local',
  changeOrigin: true,
  pathRewrite: { '^/play-player': '' }  // This will strip '/play-player' from the path
}));

// Proxy requests to history-service
app.use('/history', createProxyMiddleware({
  target: 'http://history-service.default.svc.cluster.local',
  changeOrigin: true,
  pathRewrite: { '^/history': '' }  // This will strip '/history' from the path
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend server running on port ${port}`);
});

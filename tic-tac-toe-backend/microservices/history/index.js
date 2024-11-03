const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');  // Add this line to import CORS

const app = express();
app.use(cors());  // Enable CORS for all routes
app.use(express.json());

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

// Set up PostgreSQL connection using environment variables
const pool = new Pool({
  user: process.env.DATABASE_USER || 'postgres',
  host: process.env.DATABASE_HOST || 'postgres-service',  // Kubernetes service name for PostgreSQL
  database: process.env.DATABASE_NAME || 'tictactoe',
  password: process.env.DATABASE_PASSWORD || 'password',
  port: process.env.DATABASE_PORT || 5432,
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});


// Endpoint to get all game history using GET request
app.get('/read-db', async (req, res) => {
  const { player_name } = req.query;  // Receive player_name from query parameters
  console.log('Fetching game history for player:', player_name);

  try {
    let result;
    
    if (player_name) {
      // If player_name is provided, filter the game history for that player
      result = await pool.query(
        'SELECT result, opponent, difficulty FROM game_history WHERE player_name = $1',
        [player_name]
      );
    } else {
      // If no player_name, fetch all game history
      result = await pool.query('SELECT result, opponent, difficulty FROM game_history');
    }

    console.log('Fetched result:', result.rows);
    res.json(result.rows);  // Send result to frontend
  } catch (err) {
    console.error('Error fetching game history:', err.message);
    res.status(500).send('Server Error');
  }
});


// Endpoint to add a new game result
app.post('/write-db', async (req, res) => {
  const { player_name, result, opponent, difficulty } = req.body;

  try {
      const queryResult = await pool.query(
          'INSERT INTO game_history (player_name, result, opponent, difficulty) VALUES ($1, $2, $3, $4) RETURNING *',
          [player_name, result, opponent, difficulty]
      );
      res.json(queryResult.rows[0]);
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
  }
});


// Start the server on port 8080
app.listen(8080, () => {
  console.log('History microservice is running on port 8080');
});

const express = require('express');
const { Pool } = require('pg'); // Import PostgreSQL client
const cors = require('cors');  // Add this line to import CORS
const fetch = require('node-fetch');

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

// Set up PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'postgres-service',  // This is the Kubernetes service name for PostgreSQL
  database: 'tictactoe',
  password: 'password',  // Replace with the actual password
  port: 5432,
});

// Game State (store for multiple games)
let activeGames = {};

// Winning Conditions
const winningConditions = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

// Check for Winner or Tie
function checkWinner(board) {
  for (let i = 0; i < winningConditions.length; i++) {
    const [a, b, c] = winningConditions[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Winner found
    }
  }

  if (!board.includes(null)) {
    return 'tie'; // It's a tie
  }

  return null; // No winner yet
}

// Log game result to PostgreSQL
async function logGameResult(playerName, opponentName, result) {
  try {
    console.log('Logging game result to history-service:', {
        player_name: playerName,
        result: result,
        opponent: opponentName,
        difficulty: "---"
    });
    
    const response = await fetch('http://history-service/write-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            player_name: playerName,
            result: result,
            opponent: opponentName,     
            difficulty: "---"
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to log game result: ${response.statusText}`);
    }
    
    console.log('Game result logged successfully');
  } catch (err) {
      console.error('Error logging game result:', err);
  }
}

// Routes

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});


// Start a new player-vs-player game
app.post('/start', (req, res) => {
  const { playerName, opponentName } = req.body;

  if (!playerName || !opponentName) {
    return res.status(400).json({ message: "Both players must be specified." });
  }

  let game = activeGames[playerName] || activeGames[opponentName];

  if (!game) {
    const yourSymbol = Math.random() > 0.5 ? 'X' : 'O';
    const opponentSymbol = yourSymbol === 'X' ? 'O' : 'X';

    game = {
      playerName,
      opponentName,
      board: Array(9).fill(null),
      symbols: {
        [playerName]: yourSymbol,
        [opponentName]: opponentSymbol
      },
      currentPlayer: 'X'
    };

    activeGames[playerName] = game;
    activeGames[opponentName] = game;
  }

  const yourSymbol = game.symbols[playerName];
  const opponentSymbol = game.symbols[opponentName];

  res.json({
    message: `Game already exists between ${playerName} and ${opponentName}.`,
    board: game.board,
    currentPlayer: game.currentPlayer,
    yourSymbol,
    opponentSymbol
  });
});

// Make a move
app.post('/move', async(req, res) => {
  const { cellIndex, player, playerName, opponentName } = req.body;

  const game = activeGames[playerName] || activeGames[opponentName];

  if (!game || !game.board || game.board[cellIndex] !== null || game.symbols[playerName] !== player) {
    return res.status(400).json({ message: 'Invalid move' });
  }

  game.board[cellIndex] = player;

  const winner = checkWinner(game.board);
  if (winner != null & winner != 'tie') {
    if (player === winner){
      await logGameResult(playerName, opponentName, "Won");
      await logGameResult(opponentName, playerName, "Lost");
    }
    else{
      await logGameResult(playerName, opponentName, "Lost");
      await logGameResult(opponentName, playerName, "Win");
    }
    // Send the response immediately
    res.json({ message: `${winner} wins!`, board: game.board });

    // Delete the active games after a 4-second delay
    setTimeout(() => {
      delete activeGames[playerName];
      delete activeGames[opponentName];
    }, 4000);  // 4 seconds delay

    return;
  }

  if (!game.board.includes(null)) {
    await logGameResult(playerName, opponentName, "Tied");
    await logGameResult(opponentName, playerName, "Tied");
    // Send the response immediately
    res.json({ message: 'It\'s a tie!', board: game.board });

    // Delete the active games after a 4-second delay
    setTimeout(() => {
      delete activeGames[playerName];
      delete activeGames[opponentName];
    }, 4000);  // 4 seconds delay

    return;
  }

  game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

  res.json({
    message: `Next turn, ${game.currentPlayer}'s turn`,
    board: game.board,
    currentPlayer: game.currentPlayer
  });
});

// Fetch game state every few seconds
app.get('/game-state', (req, res) => {
  const { playerName, opponentName } = req.query;
  const game = activeGames[playerName] || activeGames[opponentName];
  const finalWinner = checkWinner(game.board)

  if (!game) {
    return res.status(400).json({ message: 'No active game found' });
  }

  res.json({
    board: game.board,
    currentPlayer: game.currentPlayer,
    symbols: game.symbols,
    winner:finalWinner,
  });
});

// Start the server
app.listen(8080, () => {
  console.log('Play-player microservice is running on port 8080');
});

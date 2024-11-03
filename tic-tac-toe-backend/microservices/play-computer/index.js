const express = require('express');
const { Pool } = require('pg');  // PostgreSQL connection
const cors = require('cors');  // Add CORS
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
  host: 'postgres-service',  // Kubernetes service name for PostgreSQL
  database: 'tictactoe',
  password: 'password',  // Replace with the correct password
  port: 5432,
});

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
    for (let condition of winningConditions) {
        const [a, b, c] = condition;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a]; // Winner found
        }
    }
    return !board.includes(null) ? 'tie' : null; // Return 'tie' or null if no winner yet
}

// AI Move Logic Based on Difficulty
function aiMove(board, difficulty) {
    if (difficulty === 'easy') return randomMove(board);
    if (difficulty === 'medium') return blockOrRandomMove(board);
    if (difficulty === 'hard') return minimax(board, 'O').index;
}

// Easy: Random Move
function randomMove(board) {
    let emptyCells = board.map((cell, index) => (cell === null ? index : null)).filter(index => index !== null);
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

// Medium: Block or Random Move
function blockOrRandomMove(board) {
    // Try to block player's winning move or make a random move
    for (let i = 0; i < board.length; i++) {
        if (board[i] === null) {
            board[i] = 'O';  // AI's move
            if (checkWinner(board) === 'O') return i;
            board[i] = null;
        }
    }

    let opponent = 'X';
    for (let i = 0; i < board.length; i++) {
        if (board[i] === null) {
            board[i] = opponent;
            if (checkWinner(board) === opponent) return i;
            board[i] = null;
        }
    }

    return randomMove(board);
}

// Hard: Minimax Algorithm for Optimal Moves
function minimax(newBoard, player) {
    let availableSpots = newBoard.map((cell, index) => (cell === null ? index : null)).filter(index => index !== null);

    if (checkWinCondition(newBoard, 'X')) return { score: -10 };
    if (checkWinCondition(newBoard, 'O')) return { score: 10 };
    if (availableSpots.length === 0) return { score: 0 };

    let moves = [];
    for (let spot of availableSpots) {
        let move = { index: spot };
        newBoard[spot] = player;
        move.score = player === 'O' ? minimax(newBoard, 'X').score : minimax(newBoard, 'O').score;
        newBoard[spot] = null;
        moves.push(move);
    }

    return player === 'O' ? moves.reduce((best, move) => (move.score > best.score ? move : best)) :
                            moves.reduce((best, move) => (move.score < best.score ? move : best));
}

// Check Win Condition (for minimax)
function checkWinCondition(boardState, player) {
    return winningConditions.some(condition => condition.every(index => boardState[index] === player));
}

// Log the result of the game to the History microservice
async function logGameResult(playerName, result, difficulty) {
    try {
        console.log('Logging game result to history-service:', {
            player_name: playerName,
            result: result,
            opponent: 'AI',
            difficulty: difficulty
        });
        
        const response = await fetch('http://history-service/write-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_name: playerName,
                result: result,
                opponent: 'AI',     // Assuming this is always against AI in play-computer-service
                difficulty: difficulty
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

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });


// Start a new game
app.post('/start', (req, res) => {
    const { selectedPlayer, selectedDifficulty } = req.body;
    currentPlayer = selectedPlayer;
    difficulty = selectedDifficulty;
    board = Array(9).fill(null);
    gameActive = true;

    res.json({
        message: `Game started. You are ${selectedPlayer}, playing on ${selectedDifficulty} difficulty.`,
        board,
        currentPlayer
    });
});

// Make a move
app.post('/move', async(req, res) => {
    const { board, cellIndex, player, difficulty, playerName } = req.body;
    let AI = '';
    if (player == 'X'){
        actual_player = 'O'
        AI = 'X';
    }
    else{
        actual_player = 'X'
        AI = 'O';
    }
    // Validate the move
    if (board[cellIndex] == null) {
        return res.status(400).json({ message: "Invalid move" });
    }

    // Player's move
    board[cellIndex] = actual_player;
    let winner = checkWinner(board);

    if (winner !== 'tie' && winner !== null) {
        let result = "";
        if (actual_player === winner){
            result = "Won";
        }
        else{
            result = "Lost";
        }
        await logGameResult(playerName, result, difficulty);
        return res.json({ message: `${winner} wins!`, board, status: 'game_over' });
    }

    // AI's move
    const aiMoveIndex = aiMove(board, difficulty);
    board[aiMoveIndex] = AI;
    winner = checkWinner(board);

    // Check for tie
    if (!board.includes(null)) {
        const result = "Tied";
        await logGameResult(playerName, result, difficulty);
        return res.json({ message: 'It\'s a tie!', board, status: 'game_over' });
    }

    if (winner !== 'tie' && winner !== null) {
        let result = "";
        if (actual_player === winner){
            result = "Won";
        }
        else{
            result = "Lost";
        }
        await logGameResult(playerName, result, difficulty);
        return res.json({ message: `${winner} wins!`, board, status: 'game_over' });
    }

    // Continue the game
    res.json({ message: "It's " + actual_player + "'s turn", board, status: 'continue' });
});

// Start the server
app.listen(8080, () => {
    console.log('Play-computer microservice is running on port 8080');
});

let currentPlayer = 'X';
let board = Array(9).fill(null);
let gameActive = true;
let player = 'X';  // The player's choice (either X or O)
let difficulty = 'easy';  // Difficulty level (easy, medium, hard)
let gameMode = 'computer'; // Default game mode is against the computer
let gameHistory = []; // Store game history
let playerName = '';
let intervalId = 0;

// DOM Elements
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('status');
const resetButton = document.getElementById('reset');
const loginForm = document.getElementById('login-form');
const loginContainer = document.getElementById('login-container');
const gameContainer = document.getElementById('game-container');
const historyButton = document.getElementById('history-btn');
const backToGameButton = document.getElementById('back-to-game');
const backToLoginButton = document.getElementById('back-to-login');
const historyContainer = document.getElementById('history-container');
const gameModeSelect = document.getElementById('game-mode');
const difficultySelect = document.getElementById('difficulty');
const playComputerServiceURL = "/play-computer";
const playPlayerServiceURL = "/play-player";
const historyServiceURL = "/history";


// Handle form submission (login)
loginForm.addEventListener('submit', (event) => {
  event.preventDefault(); // Prevent form from submitting
  playerName = document.getElementById('name').value;
  opponentName = document.getElementById('opponent-name').value;  // Get the opponent's name
  player = document.getElementById('player-choice').value;
  difficulty = difficultySelect.value;
  gameMode = gameModeSelect.value;

  if (gameMode === 'computer' && difficulty !== '---' && player !== '---'){
    // Display the player's choice and game mode
    alert(`Welcome, ${playerName}! You are playing as ${player} in ${gameMode} mode.`);

    // Start the game
    startGame();
  }
  else if(gameMode === 'player'){
    // Display the player's choice and game mode
    alert(`Welcome, ${playerName}! May the odds be forever in your favor`);

    // Start the game
    startGame();
  }
  else {
    alert('There cannot be one required parameter with ---');
  }
});

// Enable/disable fields based on game mode
gameModeSelect.addEventListener('change', function() {
  if (gameModeSelect.value === 'player') {
    document.getElementById('opponent-name').disabled = false;
    document.getElementById('opponent-name').required = true;
    document.getElementById('difficulty').value = '---';
    document.getElementById('difficulty').disabled = true;
    document.getElementById('player-choice').value = '---';
    document.getElementById('player-choice').disabled = true;
  } else {
    document.getElementById('opponent-name').disabled = true;
    document.getElementById('opponent-name').required = false;
    document.getElementById('difficulty').disabled = false;
    document.getElementById('difficulty').value = 'easy';
    document.getElementById('player-choice').value = 'X';
    document.getElementById('player-choice').disabled = false;
  }
});

// Start the game depending on the game mode
function startGame() {
  if (gameMode === 'computer') {
    startGameAgainstComputer();
  } else {
    startGameAgainstPlayer();
  }
  // Switch to game view
  loginContainer.style.display = 'none';
  gameContainer.style.display = 'block';
}

// Function to start a game against the computer
function startGameAgainstComputer() {
  fetch(`${playComputerServiceURL}/start`, { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selectedPlayer: player,
      selectedDifficulty: difficulty
    })
  })
  .then(response => response.json())
  .then(data => {
    board = data.board;
    currentPlayer = data.currentPlayer;
    statusDisplay.innerHTML = `It's ${currentPlayer}'s turn`;
  })
  .catch(error => console.error('Error starting game against computer:', error));
}

// Start player-vs-player game
function startGameAgainstPlayer() {
  fetch(`${playPlayerServiceURL}/start`, {  
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerName: playerName,
      opponentName: opponentName,
    })
  })
  .then(response => response.json())
  .then(data => {
    board = data.board;
    currentPlayer = data.currentPlayer;
    player = data.yourSymbol;
    gameActive = true;

    // Display X and O assignments on the game page
    document.getElementById('your-symbol').textContent = data.yourSymbol;
    document.getElementById('opponent-symbol').textContent = data.opponentSymbol;
    document.getElementById('player-assignments').style.display = 'block';

    statusDisplay.innerHTML = `It's ${currentPlayer}'s turn`;

    // Start polling for game state updates
    intervalId = setInterval(pollGameState, 3000);
  })
  .catch(error => console.error('Error starting game against player:', error));
}

// Poll for the game state every 3 seconds
function pollGameState() {
  fetch(`${playPlayerServiceURL}/game-state?playerName=${encodeURIComponent(playerName)}&opponentName=${encodeURIComponent(opponentName)}`)
    .then(response => response.json())
    .then(data => {
      board = data.board;
      currentPlayer = data.currentPlayer;
      if (data.winner !== null){
        gameActive = false;
        updateBoardAndStatus("Game over");  
        clearInterval(intervalId);  // Stops the polling
      }
      else{
        updateBoardAndStatus(`It's ${currentPlayer}'s turn`);        
      }
    })
    .catch(error => console.error('Error polling game state:', error));
}

// Add event listeners to the cells
cells.forEach(cell => {
  cell.addEventListener('click', () => {
    const cellIndex = parseInt(cell.id);  // Ensure cellIndex is treated as a number

    if (!board[cellIndex] && gameActive && currentPlayer === player) {
      board[cellIndex] = player;
      cell.textContent = player;

      // Check the game mode
      if (gameMode === 'computer') {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';  // Switch turn for computer mode
        statusDisplay.innerHTML = `It's ${currentPlayer}'s turn`;

        makeMoveAgainstComputer(cellIndex);  // Pass the correct cellIndex to computer move
        
      } else if (gameMode === 'player') {
          // Make a move against another player
            makeMoveAgainstPlayer(cellIndex);
      }
    }
  });
});

// Function to make a move against the computer
function makeMoveAgainstComputer(cellIndex) {
  fetch(`${playComputerServiceURL}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      board: board,               // Send the current board state
      cellIndex: cellIndex,        // Send the index of the player's move
      player: currentPlayer,       // Send the current player
      difficulty: difficulty,      // Send the selected difficulty level
      playerName: playerName       // Send the player name
    })
  })
  .then(response => response.json())
  .then(data => {
    board = data.board;          // Update the board with the AI's move

    // Update the visual board (DOM) to reflect the new board state
    cells.forEach((cell, index) => {
      cell.textContent = board[index]; // Update each cell's content based on the board array
    });

    statusDisplay.innerHTML = data.message;  // Display the game status

    if (data.status === 'game_over') {
      gameActive = false;        // End the game if someone wins or ties
    } else {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';  // Switch turns if the game continues
    }
  })
  .catch(error => console.error('Error making move against computer:', error));
}

// Function to make a move against another player
function makeMoveAgainstPlayer(cellIndex) {
  fetch(`${playPlayerServiceURL}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      board: board,               // Send the current board state
      cellIndex: cellIndex,        // Send the index of the player's move
      player: currentPlayer,       // Send the current player
      playerName: playerName,      // Send the player name
      opponentName: opponentName   // Send the opponent's name
    })
  })
  .then(response => response.json())
  .then(data => {
    // Update the board and display changes for both players
    board = data.board;
    currentPlayer = data.currentPlayer;  // Update the current player
    updateBoardAndStatus(data.message);  // Update the game status for both players
  })
  .catch(error => console.error('Error making move against player:', error));
}

// Function to update the board and status
function updateBoardAndStatus(message) {
  // Update the visual board (DOM) to reflect the new board state
  cells.forEach((cell, index) => {
    cell.textContent = board[index]; // Update each cell's content based on the board array
  });

  statusDisplay.innerHTML = message;  // Display the game status

  if (message.includes('wins') || message.includes("It's a tie")) {
    gameActive = false;  // End the game if someone wins or ties
  }
}

// Reset game logic
resetButton.addEventListener('click', resetGame);

// Function to reset the game based on the game mode
function resetGame() {
  // If playing against the computer, always reset
  if (gameMode === 'computer') {
    resetGameLogicWithComputer();
  }
  // If playing against another player, reset only if the game is over
  else if (gameMode === 'player' && !gameActive) {
    resetGameLogicWithPlayer();
  } else {
    // If the game is still active and playing against another player, do nothing
    statusDisplay.innerHTML = `The game is still ongoing. Finish the game to reset.`;
  }
}

// Function to reset the game logic (shared by both game modes)
function resetGameLogicWithComputer() {
  board = Array(9).fill(null);  // Reset the game board to be empty
  currentPlayer = 'X';          // Set the current player to 'X'
  gameActive = true;            // Reactivate the game

  statusDisplay.innerHTML = `It's ${currentPlayer}'s turn`;  // Reset the status display
  cells.forEach(cell => cell.textContent = '');              // Clear the content of each cell
}

// Function to reset the game logic (shared by both game modes)
function resetGameLogicWithPlayer() {
  startGameAgainstPlayer();
}

// Event listener for the history button
historyButton.addEventListener('click', function () {
  gameContainer.style.display = 'none';
  historyContainer.style.display = 'block';

  const username = document.getElementById('name').value;
  document.getElementById('username-title').textContent = username;

  // Fetch the history from the backend and display it
  fetchHistory(username);
});

// Function to fetch and display game history using GET request
function fetchHistory(playerName) {
  fetch(`${historyServiceURL}/read-db?player_name=${encodeURIComponent(playerName)}`, {  // Use GET with query parameter
    method: 'GET',  // Use GET method
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => response.json())
  .then(historyData => {
    displayGameHistory(historyData);  // Pass the fetched data to display it in the frontend
  })
  .catch(error => console.error('Error fetching game history:', error));
}


// Function to display game history in the frontend
function displayGameHistory(historyData) {
  const historyBody = document.getElementById('history-body');

  // Clear any previous history display
  historyBody.innerHTML = '';

  if (historyData.length === 0) {
    historyBody.innerHTML = '<tr><td colspan="3">No game history available.</td></tr>';
    return;
  }

  // Add rows to the table for each game history entry
  historyData.forEach(game => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${game.result}</td>
      <td>${game.opponent}</td>
      <td>${game.difficulty}</td>
    `;
    historyBody.appendChild(row);
  });
}

// Event listener for the "Back to Game" button
backToGameButton.addEventListener('click', function () {
  historyContainer.style.display = 'none';
  gameContainer.style.display = 'block';
});

// Event listener for "Back to Login" button
backToLoginButton.addEventListener('click', function () {
  gameContainer.style.display = 'none';
  loginContainer.style.display = 'block';
  resetGameBoard();
});

// Function to reset the game board and clear status
function resetGameBoard() {
  cells.forEach(cell => {
    cell.textContent = ''; // Clear the text content of each cell
  });

  board.fill(null);
  document.getElementById('status').textContent = '';
  gameActive = true;
  currentPlayer = player;

  statusDisplay.innerHTML = `It's ${currentPlayer}'s turn`;
}

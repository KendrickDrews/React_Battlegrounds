const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// In-memory database
let games = new Map();

// Function to generate a short, unique ID
function generateShortId() {
    return crypto.randomBytes(3).toString('hex');
}

// Create a new game
app.post('/game', (req, res) => {
    const gameId = generateShortId();
    games.set(gameId, {
        id: gameId,
        players: [],
        choices: {},
        health: { '1': 2, '2': 2 },
        status: 'waiting',
        roundResult: null,
        roundNumber: 1
    });
    res.json({ gameId });
});

// Join a game
app.post('/game/:id/join/:player', (req, res) => {
    const gameId = req.params.id;
    const player = req.params.player;
    const game = games.get(gameId);

    if (!game || game.status === 'game_over') {
        return res.status(404).json({ error: 'Game not found or already completed' });
    }

    if (!game.players.includes(player)) {
        game.players.push(player);
    }

    if (game.players.length === 2) {
        game.status = 'round_active';
    }

    res.json({ player });
});

// Make a choice
app.post('/game/:id/choice', (req, res) => {
    const { id: gameId } = req.params;
    const { player, choice } = req.body;
    const game = games.get(gameId);

    if (!game || game.status === 'game_over') {
        return res.status(404).json({ error: 'Game not found or already completed' });
    }

    game.choices[player] = choice;

    if (Object.keys(game.choices).length === 2) {
        calculateRound(game);
    }

    res.json({ success: true });
});

// Get game state
app.get('/game/:id', (req, res) => {
    const gameId = req.params.id;
    const game = games.get(gameId);

    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
});

function calculateRound(game) {
    const [player1, player2] = game.players;
    const choice1 = game.choices[player1];
    const choice2 = game.choices[player2];

    if (choice1 === choice2) {
        game.roundResult = 'tie';
    } else if (
        (choice1 === 'rock' && choice2 === 'scissors') ||
        (choice1 === 'paper' && choice2 === 'rock') ||
        (choice1 === 'scissors' && choice2 === 'paper')
    ) {
        game.health[player2] = Math.max(0, game.health[player2] - 1);
        game.roundResult = player1;
    } else {
        game.health[player1] = Math.max(0, game.health[player1] - 1);
        game.roundResult = player2;
    }

    if (game.health[player1] === 0 || game.health[player2] === 0) {
        game.status = 'game_over';
        game.winner = game.health[player1] > 0 ? player1 : player2;
        // Store final game state
        games.set(game.id, {
            ...game,
            finalState: true
        });
    } else {
        game.status = 'round_complete';
        setTimeout(() => {
            game.status = 'round_active';
            game.choices = {};
            game.roundResult = null;
            game.roundNumber++;
        }, 3000);
    }
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
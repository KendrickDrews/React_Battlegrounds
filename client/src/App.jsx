import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = '/api';

function App() {
    const [gameId, setGameId] = useState(null)
    const [player, setPlayer] = useState(null)
    const [gameState, setGameState] = useState(null)
    const [choice, setChoice] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const gameIdParam = params.get('gameId')
        const playerParam = params.get('player')

        if (gameIdParam && playerParam) {
            setGameId(gameIdParam)
            setPlayer(playerParam)
            joinGame(gameIdParam, playerParam)
        }
    }, [])

    useEffect(() => {
        if (gameId && gameState && gameState.status !== 'game_over') {
            const interval = setInterval(() => fetchGameState(gameId), 1000)
            return () => clearInterval(interval)
        }
    }, [gameId, gameState])

    const createGame = async () => {
        try {
            const response = await axios.post(`${API_URL}/game`)
            const newGameId = response.data.gameId
            setGameId(newGameId)
            setPlayer('1')
            setError(null)
            window.history.pushState({}, '', `?gameId=${newGameId}&player=1`)
            joinGame(newGameId, '1')
        } catch (error) {
            setError('Failed to create game. Please try again.')
        }
    }

    const joinGame = async (id, playerNumber) => {
        try {
            await axios.post(`${API_URL}/game/${id}/join/${playerNumber}`)
            setGameId(id)
            setPlayer(playerNumber)
            fetchGameState(id)
        } catch (error) {
            setError('Error joining game. The game might not exist or has already ended.')
        }
    }

    const fetchGameState = async (id) => {
        try {
            const response = await axios.get(`${API_URL}/game/${id}`)
            setGameState(response.data)
            setError(null)
            if (response.data.status === 'round_active' && !response.data.choices[player]) {
                setChoice(null)
            }
        } catch (error) {
            setError('Error fetching game state. The game might not exist.')
            setGameState(null)
        }
    }

    const makeChoice = async (selectedChoice) => {
        if (gameState.status !== 'round_active') return;
        // setChoice(selectedChoice)
        try {
            await axios.post(`${API_URL}/game/${gameId}/choice`, {
                player,
                choice: selectedChoice,
            })
        } catch (error) {
            setError('Error making choice. Please try again.')
        }
    }
    const [items, setItems] = useState([
        { id: 1, content: 'rock', list: 'list1' },
        { id: 2, content: 'paper', list: 'list1' },
        { id: 3, content: 'scissors', list: 'list1' },
    ])
    const handleDragStart = (e, id) => {
        e.dataTransfer.setData('text/plain', id);
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('opacity-50');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-blue-100');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('bg-blue-100');
    };

    const handleDrop = (e, targetList) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-100');

        const itemId = parseInt(e.dataTransfer.getData('text/plain'));

        if (targetList === "list2") {
            setChoice(itemId.content)
        }

        setItems(items.map(item =>
            item.id === itemId
                ? { ...item, list: targetList }
                : item
        ));
    };

    const getListItems = (listName) =>
        items.filter(item => item.list === listName);

    const renderGame = () => {
        if (!gameState) return <p>Loading game state...</p>

        if (gameState.status === 'waiting') {
            return (
                <div>
                    <p>Waiting for opponent. Share this URL with your opponent:</p>
                    <input
                        type="text"
                        value={`${window.location.origin}${window.location.pathname}?gameId=${gameId}&player=2`}
                        readOnly
                        style={{width: '100%', marginBottom: '10px'}}
                    />
                    <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?gameId=${gameId}&player=2`)}>
                        Copy Game URL
                    </button>
                </div>
            )
        }

        if (gameState.status === 'game_over' || gameState.finalState) {
            const winner = gameState.winner === player ? 'You win!' : 'Opponent wins!'
            return (
                <div>
                    <p>Game Over! {winner}</p>
                    <p>Final Health:</p>
                    <p>Player 1: {gameState.health['1']}</p>
                    <p>Player 2: {gameState.health['2']}</p>
                    <button onClick={resetAndCreateNewGame}>Start New Game</button>
                </div>
            )
        }

        return (
            <>
            <div className={"game-bar"}>
                <p>You are Player {player}</p>
                <p>Round: {gameState.roundNumber}</p>
            </div>
            <div className={"battle-area"}>
                <div className={"team-area"}>
                    <div className={"player-area"}>
                        <div className={"amulet"}>
                            Amulet
                        </div>
                        <div className={"player-hero"}>
                            <p>Your health: {gameState.health[player]}</p>
                        </div>
                        <div className={"ring"}>
                            Ring 1
                        </div>
                        <div className={"ring"}>
                            Ring 2
                        </div>
                    </div>

                    <div className={"player-units"}>
                        <div className="card" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, 'list2')} >
                            {getListItems('list2').map(item => (
                                <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.id)}
                                    onDragEnd={handleDragEnd}
                                    className="p-3 mb-2 bg-white border rounded-lg cursor-move hover:bg-gray-50"
                                >
                                    {item.content}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className={"team-area opponent-area"}>
                    <p>Opponent health: {gameState.health[player === '1' ? '2' : '1']}</p>
                </div>
            </div>
                {gameState.status === 'round_complete' && gameState.roundResult && (
                    <p>
                        Round result:
                        {gameState.roundResult === 'tie' ? ' Tie!' :
                            gameState.roundResult === player ? ' You won!' : ' Opponent won!'}
                    </p>
                )}
                {gameState.status === 'round_active' && !choice && (
                        <div
                            className="card-container"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, 'list1')}
                        >
                            {getListItems('list1').map(item => (
                                <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.id)}
                                    onDragEnd={handleDragEnd}
                                    className={"card"}
                                >
                                    {item.content}
                                </div>
                            ))}
                        <div draggable={false}>
                            <button onClick={() => makeChoice(choice)}>Confirm Choice</button>
                        </div>
                    </div>
                )
                }
                {
                    gameState.status === 'round_active' && choice && <p>You chose: {choice}. Waiting for opponent...</p>
                }
                {
                    gameState.status === 'round_complete' && <p>Round complete! Next round starting soon...</p>
                }
            </>
        )
    }

    const resetAndCreateNewGame = () => {
        setGameId(null)
        setPlayer(null)
        setGameState(null)
        setChoice(null)
        setError(null)
        window.history.pushState({}, '', window.location.pathname)
        createGame()
    }

    return (
        <>
            {error && (
                <div>
                    <p style={{color: 'red'}}>{error}</p>
                    <button onClick={resetAndCreateNewGame}>Create New Game</button>
                </div>
            )}
            {!gameId && !error && <button onClick={createGame}>Create New Game</button>}
            {gameId && !error && renderGame()}
        </>
    )
}

export default App
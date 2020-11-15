/*
  {
    gameId: id do jogo
    i: 2
    j: 0
    player: {}
  }
*/
import { winCombinations } from './utils/winCombinations.js'

export function gameRules(data, sockets, players, games) {
  const game = games.find(game => game.id === data.gameId)
  const player1 = players.find(({ id }) => game.player1.id === id)
  const player2 = players.find(({ id }) => game.player2.id === id)

  game.playboard[data.i][data.j] = game.sign[data.player.id]

  let isDraw = true

  game.playboard.forEach(row => {
    row.forEach(column => {
      if (game.playboard[row][column] === '') {
        isDraw = false
      }
    })
  })

  if (isDraw) {
    game.game_status = 'draw'

    players[game[game.player1].mobile_number].draw++
    players[game[game.player2].mobile_number].draw++

    return 'draw'
  }

  for (let i = 0; i < winCombinations.length; i++) {
    const tempComb =
      game.playboard[winCombinations[i][0][0]][winCombinations[i][0][1]] +
      game.playboard[winCombinations[i][1][0]][winCombinations[i][1][1]] +
      game.playboard[winCombinations[i][2][0]][winCombinations[i][2][1]]

    if (tempComb === 'xxx' || tempComb === 'ooo') {
      game.game_winner = game.whose_turn
      game.game_status = 'won'
      game.winning_combination = [
        [winCombinations[i][0][0], winCombinations[i][0][1]],
        [winCombinations[i][1][0], winCombinations[i][1][1]],
        [winCombinations[i][2][0], winCombinations[i][2][1]],
      ]

      game.whose_turn === player1.id ? player1.won++ : player2.won++
      return 'won'
    }
  }

  game.whose_turn = game.whose_turn === player1.id ? player2.id : player1.id

  if (game.game_status == 'draw' || game.game_status == 'won') {
    gameBetweenSeconds = 10
    gameBetweenInterval = setInterval(() => {
      gameBetweenSeconds--
      io.to(data.gameId).emit('gameInterval', gameBetweenSeconds)
      if (gameBetweenSeconds == 0) {
        clearInterval(gameBetweenInterval)

        const gameId = uuidv4()
        sockets[game.player1].game_id = gameId
        sockets[game.player2].game_id = gameId
        players[sockets[game.player1].mobile_number].played =
          players[sockets[game.player1].mobile_number].played + 1
        players[sockets[game.player2].mobile_number].played =
          players[sockets[game.player2].mobile_number].played + 1

        games[gameId] = {
          player1: game.player1,
          player2: game.player2,
          whose_turn:
            game.game_status == 'won' ? game.game_winner : game.whose_turn,
          playboard: [
            ['', '', ''],
            ['', '', ''],
            ['', '', ''],
          ],
          game_status: 'ongoing', // "ongoing","won","draw"
          game_winner: null, // winner_id if status won
          winning_combination: [],
        }
        games[gameId][game.player1] = {
          mobile_number: sockets[game.player1].mobile_number,
          sign: 'x',
          played: players[sockets[game.player1].mobile_number].played,
          won: players[sockets[game.player1].mobile_number].won,
          draw: players[sockets[game.player1].mobile_number].draw,
        }
        games[gameId][game.player2] = {
          mobile_number: sockets[game.player2].mobile_number,
          sign: 'o',
          played: players[sockets[game.player2].mobile_number].played,
          won: players[sockets[game.player2].mobile_number].won,
          draw: players[sockets[game.player2].mobile_number].draw,
        }
        io.sockets.connected[game.player1].join(gameId)
        io.sockets.connected[game.player2].join(gameId)

        io.to(gameId).emit('nextGameData', {
          status: true,
          game_id: gameId,
          game_data: games[gameId],
        })

        io.sockets.connected[game.player1].leave(data.gameId)
        io.sockets.connected[game.player2].leave(data.gameId)
        // delete game
      }
    }, 1000)
  }
}

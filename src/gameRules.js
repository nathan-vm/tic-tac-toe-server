/*
  {
    gameId: id do jogo
    i: 2
    j: 0
    player: {}
  }
*/
import { winCombinations } from './utils/winCombinations.js'

export function gameRules(data, players, games, sockets) {
  const game = games[data.gameId]
  const player1 = players[sockets[game.player1].name]
  const player2 = players[sockets[game.player2].name]

  game.playboard[data.i][data.j] = game.sign[data.player]

  let isDraw = true

  game.playboard.forEach((row, rowIdx) => {
    row.forEach((_, columnIdx) => {
      if (game.playboard[rowIdx][columnIdx] === '') {
        isDraw = false
      }
    })
  })

  if (isDraw) {
    game.gameStatus = 'draw'
  }

  for (let i = 0; i < winCombinations.length; i++) {
    const tempComb =
      game.playboard[winCombinations[i][0][0]][winCombinations[i][0][1]] +
      game.playboard[winCombinations[i][1][0]][winCombinations[i][1][1]] +
      game.playboard[winCombinations[i][2][0]][winCombinations[i][2][1]]

    if (tempComb === 'XXX' || tempComb === 'OOO') {
      game.gameWinner = game.whoseTurn
      game.gameStatus = 'won'
      game.winning_combination = [
        [winCombinations[i][0][0], winCombinations[i][0][1]],
        [winCombinations[i][1][0], winCombinations[i][1][1]],
        [winCombinations[i][2][0], winCombinations[i][2][1]],
      ]

      game.whoseTurn === player1.id ? player1.won++ : player2.won++
    }
  }

  game.whoseTurn = game.whoseTurn === game.player1 ? game.player2 : game.player1
  return game
}

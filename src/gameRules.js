/*
  {
    gameId: id do jogo
    i: 2
    j: 0
    player: {}
  }
*/
import { winCombinations } from './utils/winCombinations.js'

export function gameRules(data, players, games) {
  const game = games.find(({ gameId }) => gameId === data.gameId)
  const player1 = players.find(({ id }) => game.player1.id === id)
  const player2 = players.find(({ id }) => game.player2.id === id)

  game.playboard[data.i][data.j] = game.sign[data.player.id]

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

  game.whoseTurn = game.whoseTurn === player1.id ? player2.id : player1.id
  return game
}

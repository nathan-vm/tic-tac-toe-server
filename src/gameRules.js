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
    game.game_status = 'draw'

    players[game[game.player1].mobile_number].draw++
    players[game[game.player2].mobile_number].draw++
  }

  for (let i = 0; i < winCombinations.length; i++) {
    const tempComb =
      game.playboard[winCombinations[i][0][0]][winCombinations[i][0][1]] +
      game.playboard[winCombinations[i][1][0]][winCombinations[i][1][1]] +
      game.playboard[winCombinations[i][2][0]][winCombinations[i][2][1]]

    if (tempComb === 'xxx' || tempComb === 'ooo') {
      game.game_winner = game.whoseTurn
      game.game_status = 'won'
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

import dotenv from 'dotenv'
import http from 'http'
import { v4 as uuid } from 'uuid'

import { Server } from 'socket.io'
dotenv.config()

const PORT = process.env.PORT
const HOST = process.env.HOST

const players = {
  /**
   * nathan: {
   *  win: 10,
   *  draw: 5,
   *  played: 20,
   * },
   * mauricius: {
   *  win: 10,
   *  draw: 5,
   *  played: 20,
   * },
   * cadu: {
   *  win: 10,
   *  draw: 5,
   *  played: 20,
   * },
   */
}
const sockets = {
  /**
   *
   * y4JZOz9g5ma9k1PJAAAB : {
   *  name: Mauricius,
   *  gameId: null,
   *  isPlaying: false
   * },
   *
   * dFlua5hkgjA2K3NSAAAD : {
   *  name: Nathan,
   *  gameId: 2189a7bb-709a-46f7-9ff9-3b9c55e6543c,
   *  isPlaying: true
   * },
   *
   * 7oBVk0gIvaALKYmnAAAF : {
   *  name: Cadu,
   *  gameId: 2189a7bb-709a-46f7-9ff9-3b9c55e6543c,
   *  isPlaying: true
   * }
   */
}
const games = {
  /**
   * {
   *    2189a7bb-709a-46f7-9ff9-3b9c55e6543c: {
   *      player1: dFlua5hkgjA2K3NSAAAD,
   *      player2: 7oBVk0gIvaALKYmnAAAF,
   *      whoseTurn: dFlua5hkgjA2K3NSAAAD,
   *      sign: {
   *        dFlua5hkgjA2K3NSAAAD: 'X',
   *        7oBVk0gIvaALKYmnAAAF: 'O',
   *      },
   *      playboard: [
   *        ['','','']
   *        ['','','']
   *        ['','','']
   *      ],
   *      gameStatus: 'ongoing', // "ongoing","won","draw"
   *      gameWinner: null, // player id if status won
   *    }
   * },
   */
}

const server = http.createServer()
const io = new Server(server, { cors: ['http://localhost:8080'] })

io.on('connection', client => {
  console.log('connected : ' + client.id)

  client.emit('connected', { id: client.id })

  client.on('Login', data => {
    let socketVerification = false
    let response = null

    for (const id in sockets) {
      if (sockets[id].name === data.name) {
        socketVerification = true
        response = sockets[id]
      }
    }

    if (!socketVerification) {
      sockets[client.id] = {
        name: data.name,
        gameId: null,
        isPlaying: false,
      }

      let alreadyPlayed = false

      for (const name in players) {
        if (name === data.name) {
          alreadyPlayed = true
        }
      }

      if (!alreadyPlayed) {
        players[data.name] = {
          played: 0,
          won: 0,
          draw: 0,
        }
      }

      response = sockets[client.id]
    }
    client.emit('LoginResponse', response)
  })

  client.on('getOpponents', () => {
    console.log(sockets[client.id])

    const response = []

    for (const id in sockets) {
      if (id !== client.id && !id.isPlaying) {
        response.push({
          id: id,
          name: sockets[id].name,
          played: players[sockets[id].name].played,
          won: players[sockets[id].name].won,
          draw: players[sockets[id].name].draw,
        })
      }
    }

    client.emit('getOpponentsResponse', response)

    client.broadcast.emit('newOpponent', {
      id: client.id,
      name: sockets[client.id].name,
      played: players[sockets[client.id].name].played,
      won: players[sockets[client.id].name].won,
      draw: players[sockets[client.id].name].draw,
    })
  })

  client.on('selectOpponent', data => {
    let player1 = null
    let player2 = null
    if (sockets[data.id] && !sockets[data.id]?.isPlaying) {
      player2 = sockets[data.id]
    }

    if (player2) {
      const gameId = uuid()
      player1 = sockets[client.id]

      player1.isPlaying = true
      player2.isPlaying = true

      player1.gameId = gameId
      player2.gameId = gameId

      player1.played += 1
      player2.played += 1

      games[gameId] = {
        player1: player1.id,
        player2: player2.id,
        whoseTurn: player1.id,
        sign: {
          [player1.id]: 'X',
          [player2.id]: 'O',
        },
        playboard: [
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
        ],
        gameStatus: 'ongoing', // "ongoing","won","draw"
        gameWinner: null, // winner_id if status won
      }

      io.sockets.sockets.get(player1.id).join(gameId)
      io.sockets.sockets.get(player2.id).join(gameId)

      io.emit('excludePlayers', { player1: player1.id, player2: player2.id })
      io.to(gameId).emit('gameStarted', {
        gameId,
        ...games[gameId],
      })
    }

    client.emit('alreadyPlaying', {
      message: 'Opponent is playing with someone else.',
    })
  })

  client.on('selectCell', data => {
    // TODO
  })

  client.on('disconnect', () => {
    console.log('disconnect : ' + client.id)

    if (typeof sockets[client.id] !== 'undefined') {
      if (sockets[client.id].is_playing) {
        io.to(sockets[client.id].gameId).emit('opponentLeft', {})

        players[sockets[games[sockets[client.id].game_id].player1].name]
          .played--

        players[sockets[games[sockets[client.id].game_id].player2].name]
          .played--

        io.sockets.connected[
          client.id === games[sockets[client.id].game_id].player1
            ? games[sockets[client.id].game_id].player2
            : games[sockets[client.id].game_id].player1
        ].leave(sockets[client.id].game_id)
        delete games[sockets[client.id].game_id]
      }
    }

    delete sockets[client.id]
    client.broadcast.emit('opponentDisconnected', {
      id: client.id,
    })
  })
})

server.listen(PORT, HOST)
console.log('listening to : ' + HOST + ':' + PORT)

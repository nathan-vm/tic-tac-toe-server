import dotenv from 'dotenv'
import http from 'http'
import { v4 as uuid } from 'uuid'

import { gameRules } from './gameRules.js'
import { Server } from 'socket.io'
dotenv.config()

const PORT = process.env.PORT
const HOST = process.env.HOST

let players = []
let sockets = []
const games = []

const server = http.createServer()
const io = new Server(server, { cors: ['http:localhost:3000'] })

io.on('connection', client => {
  console.log('connected : ' + client.id)
  client.emit('connected', { id: client.id })

  client.on('checkUserDetail', data => {
    const alreadyExist = sockets.find(socket => {
      if (socket.id === data.id) {
        return true
      }
      return false
    })

    let response = alreadyExist

    if (!alreadyExist) {
      const newSocket = {
        id: client.id,
        isPlaying: false,
        gameId: null,
        playerData: null,
      }

      sockets = [...sockets, newSocket]

      const alreadyPlayed = players.find(player => {
        if (player.name === data.name) {
          return true
        }
        return false
      })

      newSocket.playerData = alreadyPlayed

      if (!alreadyPlayed) {
        const newPlayer = {
          id: client.id,
          name: data.name,
          played: 0,
          won: 0,
          draw: 0,
        }

        players = [...players, newPlayer]

        newSocket.playerData = newPlayer
      }

      response = newSocket
    }
    client.emit('checkUserDetailResponse', response)
  })

  client.on('getOpponents', () => {
    const response = []
    sockets.forEach(socket => {
      if (socket.id !== client.id && !socket.isPlaying) {
        response.push({
          id: socket.id,
          name: socket.playerData.name,
          played: socket.playerData.played,
          won: socket.playerData.won,
          draw: socket.playerData.draw,
        })
      }
    })

    client.emit('getOpponentsResponse', response)

    const clientSocket = sockets.find(({ id }) => id === client.id)

    if (clientSocket) {
      client.broadcast.emit('newOpponentAdded', {
        id: clientSocket.id,
        name: clientSocket.playerData.name,
        played: clientSocket.playerData.played,
        won: clientSocket.playerData.won,
        draw: clientSocket.playerData.draw,
      })
    }
  })

  client.on('selectOpponent', data => {
    const player2Socket = sockets.find(
      ({ id, isPlaying }) => data.id === id && !isPlaying,
    )

    if (player2Socket) {
      const player1Socket = sockets.find(({ id }) => client.id === id)

      const gameId = uuid()

      player1Socket.is_playing = true
      player2Socket.is_playing = true

      player1Socket.gameId = gameId
      player2Socket.gameId = gameId

      player1Socket.played += 1
      player2Socket.played += 1

      const gameData = {
        gameId,
        player1: player1Socket,
        player2: player2Socket,
        whoseTurn: player1Socket.id,
        sign: {
          [player1Socket.id]: 'X',
          [player2Socket.id]: 'O',
        },
        playboard: [
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
        ],
        gameStatus: 'ongoing', // "ongoing","won","draw"
        gameWinner: null, // winner_id if status won
        winningCombination: [],
      }

      games.push(gameData)

      io.sockets.sockets.get(player1Socket.id).join(gameId)
      io.sockets.sockets.get(player2Socket.id).join(gameId)

      const response = []

      sockets.forEach(socket => {
        if (
          socket.id !== player1Socket.id &&
          socket.id !== player2Socket.id &&
          socket.id !== client.id &&
          !socket.isPlaying
        ) {
          response.push({
            id: socket.id,
            name: socket.playerData.name,
            played: socket.playerData.played,
            won: socket.playerData.won,
            draw: socket.playerData.draw,
          })
        }
      })

      io.emit('excludePlayers', response)
      io.to(gameId).emit('gameStarted', {
        status: true,
        gameId,
        gameData,
      })
    }

    const response = {
      status: false,
      message: 'Opponent is playing with someone else.',
    }

    client.emit('alreadyPlaying', response)
  })

  client.on('selectCell', data => {
    const game = gameRules(data, players, games)

    if (game.gameStatus !== 'draw' || game.gameStatus !== 'won') {
      io.to(data.gameId).emit('selectCellResponse', game)
    }

    if (game.gameStatus === 'draw' || game.gameStatus === 'won') {
      io.to(data.gameId).emit('selectCellResponse', game)

      let gameBetweenSeconds = 10
      const gameBetweenInterval = setInterval(() => {
        gameBetweenSeconds--
        io.to(data.gameId).emit('gameInterval', gameBetweenSeconds)

        const gameIndex = games.indexOf(game)

        if (gameIndex >= 0) {
          games.splice(gameIndex, 1)
        }

        if (gameBetweenSeconds === 0) {
          clearInterval(gameBetweenInterval)

          const gameId = uuid()

          game.player1.is_playing = true
          game.player2.is_playing = true

          game.player1.gameId = gameId
          game.player2.gameId = gameId

          game.player1.played += 1
          game.player2.played += 1

          const gameData = {
            gameId,
            player1: game.player1,
            player2: game.player2,
            whoseTurn: game.player1.id,
            sign: {
              [game.player1.id]: 'X',
              [game.player2.id]: 'O',
            },
            playboard: [
              ['', '', ''],
              ['', '', ''],
              ['', '', ''],
            ],
            gameStatus: 'ongoing', // "ongoing","won","draw"
            gameWinner: null, // winner_id if status won
            winningCombination: [],
          }

          games.push(gameData)

          io.sockets.sockets.get(game.player1.id).join(gameId)
          io.sockets.sockets.get(game.player2.id).join(gameId)

          io.to(gameId).emit('nextGameData', {
            status: true,
            game_id: gameId,
            game_data: games[gameId],
          })
          io.sockets.sockets.get(game.player1.id).leave(data.gameId)
          io.sockets.sockets.get(game.player2.id).leave(data.gameId)
          // delete game
        }
      }, 1000)
    }
  })

  client.on('disconnect', () => {
    console.log('disconnect : ' + client.id)

    const existingSocket = sockets.find(({ id }) => id === client.id)
    const indexSocket = sockets.indexOf(existingSocket)

    if (existingSocket) {
      if (existingSocket.is_playing) {
        io.to(existingSocket.gameId).emit('opponentLeft', {})

        const player = players.find(({ id }) => client.id === id)
        const playerIndex = players.indexOf(player)

        let game = {}
        let gameIndex = -1
        let playerSocket = ''

        if (playerIndex >= 0) {
          game = games.find(({ gameId }) => gameId === existingSocket.gameId)
          gameIndex = games.indexOf(game)
          if (game) {
            playerSocket =
              game.player1.id === client.id ? game.player2.id : game.player1.id
            const playerLeave =
              game.player1.id === client.id ? game.player1 : game.player2

            playerLeave.isPlaying = false
          }
          players.splice(playerIndex, 1)
        }
        if (playerSocket) {
          io.sockets.sockets.get(playerSocket).leave(existingSocket.gameId)
        }

        games.splice(gameIndex, 1)
      }
    }
    if (indexSocket >= 0) {
      sockets.splice(indexSocket, 1)
    }
    client.broadcast.emit('opponentDisconnected', {
      id: client.id,
    })
  })
})

server.listen(PORT, HOST)
console.log('listening to : ' + HOST + ':' + PORT)

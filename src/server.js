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
        player1: player1Socket,
        player2: player2Socket,
        whoseTurn: player1Socket.id,
        sign: {
          [player1Socket.id]: 'x',
          [player2Socket.id]: 'o',
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

      io.emit('excludePlayers', [player1Socket.id, player2Socket.id])
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
    const status = gameRules(data, sockets, players, games)

    if (status === 'draw' || status === 'won') {
      io.to(data.gameId).emit('selectCellResponse', status)
    }
  })

  client.on('disconnect', () => {
    console.log('disconnect : ' + client.id)

    const existingSocket = sockets.find(({ id }) => id === client.id)
    const indexSocket = sockets.findIndex(({ id }) => id === client.id)

    if (existingSocket) {
      if (existingSocket.is_playing) {
        io.to(existingSocket.gameId).emit('opponentLeft', {})

        const playerIndex = players.findIndex(
          ({ name }) => client.name === name,
        )
        if (playerIndex.length >= 0) {
          players.splice(playerIndex, 1)
        }

        io.sockets.connected[
          client.id == games[sockets[client.id].gameId].player1
            ? games[sockets[client.id].gameId].player2
            : games[sockets[client.id].gameId].player1
        ].leave(sockets[client.id].gameId)

        delete games[sockets[client.id].gameId]
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

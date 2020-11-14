import 'dotenv/config'
import http from 'http'
import socket from 'socket.io'

const PORT = process.env.PORT
const HOST = process.env.HOST

let players = []
let sockets = []
// const games = []

const server = http.createServer()
const io = socket(server)

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
        game_id: null,
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

    client.broadcast.emit('newOpponentAdded', {
      id: client.id,
      name: sockets[client.id].mobile_number,
      played: players[sockets[client.id].mobile_number].played,
      won: players[sockets[client.id].mobile_number].won,
      draw: players[sockets[client.id].mobile_number].draw,
    })
  })
})

server.listen(PORT, HOST)
console.log('listening to : ' + HOST + ':' + PORT)

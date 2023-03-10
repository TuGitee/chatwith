const JWT = require('../utils/JWT');
const pool = require('../config/pool');

const WorldID = 'd29ybGQ=';

function start(server) {
    const io = require('socket.io')(server, { cors: true });
    io.on('connect', async (socket) => {
        const payload = JWT.verify(socket.handshake.query.token);
        socket.user = payload;
        if (payload) {
            await pool.query('update users set online=1 where id=?', [socket.user.id])
            socket.emit(WebSocketType.System, createMessage('system', 'hello world!'))
        } else {
            socket.emit(WebSocketType.Error, createMessage('system', 'token error'))
        }
        socket.on(WebSocketType.GroupList, async () => {
            let data = []
            let res = await pool.query('select * from world where read_list not like ? and from_id!=?', [`%${socket.user.id}%`, socket.user.id])
            let msg = res[0]
            data.push({
                id: WorldID,
                unread: msg.length,
                to: socket.user.id,
            })
            await socket.emit(WebSocketType.WorldItem, createMessage('system', data))
            changeList(io, socket)
        })

        socket.on(WebSocketType.GroupChat, (data) => {
            socket.broadcast.emit(WebSocketType.GroupChat, createMessage(socket.user.username, data.msg, socket.user.avatar, WorldID, +new Date()))
            pool.query('insert into world (from_id,message) values (?,?)', [socket.user.id, data.msg])
        })

        socket.on(WebSocketType.PrivateChat, (data) => {
            io.sockets.sockets.forEach(item => {
                if (item.user.id === Number(data.to)) {
                    item.emit(WebSocketType.PrivateChat, createMessage(socket.user.username, data.msg, socket.user.avatar, String(socket.user.id), +new Date()))
                    pool.query('insert into private (from_id,to_id,message) values (?,?,?)', [socket.user.id, item.user.id, data.msg])
                }
            })
        })

        socket.on(WebSocketType.PrivateRead, async (data) => {
            await pool.query('update private set to_read=1 where from_id=? and to_id=?', [Number(data.to), Number(socket.user.id)])
        })

        socket.on(WebSocketType.WorldRead, async () => {
            await pool.query('update world set read_list=concat(read_list,?) where from_id!=? and read_list not like ?', [`${socket.user.id},`, socket.user.id, `%${socket.user.id}%`])
        })

        socket.on('disconnect', () => {
            pool.query('update users set online=0 where id=?', [socket.user.id])
            changeList(io, socket)
        })
    })
}

const WebSocketType = {
    Error: 0,
    GroupList: 1,
    GroupChat: 2,
    PrivateChat: 3,
    System: 4,
    PrivateRead: 5,
    WorldItem: 6,
    WorldRead: 7
}

function createMessage(user, data, avatar, id, time) {
    return {
        user,
        data,
        avatar,
        id,
        time
    }
}

async function changeList(io, socket) {
    const data = []
    const users = Array.from(io.sockets.sockets).map(item => item[1].user).filter(item => item)
    for (let item of users) {
        for (let user of users) {
            if (item.id === user.id) {
                data.push({
                    avatar: user.avatar,
                    username: user.username,
                    id: user.id,
                    unread: 0,
                    to: item.id,
                    last: ''
                })
            }

            else {
                let res = await pool.query('select * from private where from_id=? and to_id=? and to_read=0', [user.id, item.id])
                let msg = res[0]
                data.push({
                    avatar: user.avatar,
                    username: user.username,
                    id: user.id,
                    unread: msg.length,
                    to: item.id,
                    last: msg.length === 0 ? '' : msg[msg.length - 1]?.message
                })
            }
        }
    }
    io.sockets.emit(WebSocketType.GroupList, createMessage('system', data))
}

module.exports = start
const express = require('express');
const { createServer } = require('http');
const { join } = require('path');
const { Server } = require('socket.io');

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const server = createServer(app);
const io = new Server(server);

async function main() {
    const db = await open({
        filename: 'chat.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        DROP TABLE IF EXISTS messages;
        CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_offset TEXT UNIQUE,
            content TEXT,
            username TEXT,
            avatar TEXT
        );
    `);

    app.get('/', (req, res) => {
        res.sendFile(join(__dirname, 'index.html'));
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        const username = socket.handshake.auth.username || 'Anonymous';
        const avatar = socket.handshake.auth.avatar || '';

        socket.on('chat message', async (msg) => {
            console.log('Received message from', username, ':', msg);
            let result;
            try {
                result = await db.run('INSERT INTO messages (content, username, avatar) VALUES (?, ?, ?)', msg, username, avatar);
            } catch (e) {
                console.error(e);
                return;
            }

            io.emit('chat message', msg, result.lastID, username, avatar);
            console.log('Message forwarded to all users:', msg);
        });

        (async () => {
            if (!socket.recovered) {
                try {
                    await db.each('SELECT id, content, username, avatar FROM messages WHERE id > ?',
                        [socket.handshake.auth.serverOffset || 0],
                        (err, row) => {
                            if (err) {
                                console.error(err);
                                return;
                            }
                            socket.emit('chat message', row.content, row.id, row.username, row.avatar);
                        }
                    );
                } catch (e) {
                    console.error(e);
                }
            }
        })();
    });
}

main();

server.listen(3001, () => {
    console.log('Server running at http://localhost:3001');
});

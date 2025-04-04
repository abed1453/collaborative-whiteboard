const http = require('http');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    
    if (!path.extname(filePath)) {
        filePath = path.join(__dirname, 'public', 'index.html');
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };

    const contentType = contentTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// WebSocket server implementation with native Node.js
class WebSocketServer {
    constructor(httpServer) {
        this.clients = new Set();
        this.drawHistory = [];
        
        httpServer.on('upgrade', (request, socket, head) => {
            this.handleUpgrade(request, socket, head);
        });
    }
    
    handleUpgrade(request, socket, head) {
        // WebSocket handshake
        const key = request.headers['sec-websocket-key'];
        const acceptKey = createHash('sha1')
            .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
            .digest('base64');
            
        const headers = [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${acceptKey}`,
            '\r\n'
        ];
        
        socket.write(headers.join('\r\n'));
        
        // Handle new connection
        const client = {
            socket,
            color: this.getRandomColor(),
            isAlive: true
        };
        
        this.clients.add(client);
        
        // Send initial data
        this.sendToClient(client, {
            type: 'init',
            color: client.color,
            activeUsers: this.clients.size,
            drawHistory: this.drawHistory
        });
        
        // Update user count for all clients
        this.broadcastUserCount();
        
        // Set up event listeners
        socket.on('data', (buffer) => {
            this.handleMessage(client, buffer);
        });
        
        socket.on('close', () => {
            this.clients.delete(client);
            this.broadcastUserCount();
        });
        
        socket.on('error', (err) => {
            console.error('Socket error:', err);
            socket.destroy();
            this.clients.delete(client);
            this.broadcastUserCount();
        });
    }
    
    handleMessage(client, buffer) {
        try {
            const decoded = this.decodeMessage(buffer);
            if (!decoded) return;
            
            const message = JSON.parse(decoded.toString());
            
            switch (message.type) {
                case 'draw':
                    this.drawHistory.push(message.data);
                    this.broadcast({
                        type: 'draw',
                        data: message.data
                    }, client);
                    break;
                    
                case 'clear':
                    this.drawHistory = [];
                    this.broadcast({ type: 'clear' }, client);
                    break;
                    
                case 'sync':
                    this.sendToClient(client, {
                        type: 'init',
                        color: client.color,
                        activeUsers: this.clients.size,
                        drawHistory: this.drawHistory
                    });
                    break;
            }
        } catch (e) {
            console.error('Error handling message:', e);
        }
    }
    
    decodeMessage(buffer) {
        const firstByte = buffer[0];
        const isFinalFrame = Boolean((firstByte >>> 7) & 0x1);
        const opCode = firstByte & 0xF;
        
        // Only handle text frames (opCode === 1)
        if (opCode !== 1) return null;
        
        const secondByte = buffer[1];
        const isMasked = Boolean((secondByte >>> 7) & 0x1);
        
        // Client messages must be masked
        if (!isMasked) return null;
        
        let offset = 2;
        let payloadLength = secondByte & 0x7F;
        
        if (payloadLength === 126) {
            payloadLength = buffer.readUInt16BE(offset);
            offset += 2;
        } else if (payloadLength === 127) {
            // 64-bit length is not supported in this example
            return null;
        }
        
        const maskingKey = buffer.slice(offset, offset + 4);
        offset += 4;
        
        const payload = Buffer.alloc(payloadLength);
        
        for (let i = 0; i < payloadLength; i++) {
            payload[i] = buffer[offset + i] ^ maskingKey[i % 4];
        }
        
        return payload;
    }
    
    encodeMessage(data) {
        const json = JSON.stringify(data);
        const jsonBytes = Buffer.from(json);
        const length = jsonBytes.length;
        
        let header;
        
        if (length < 126) {
            header = Buffer.alloc(2);
            header[0] = 0x81; // Text frame, FIN=1
            header[1] = length;
        } else if (length < 65536) {
            header = Buffer.alloc(4);
            header[0] = 0x81; // Text frame, FIN=1
            header[1] = 126;
            header.writeUInt16BE(length, 2);
        } else {
            header = Buffer.alloc(10);
            header[0] = 0x81; // Text frame, FIN=1
            header[1] = 127;
            // For Node.js versions that support BigInt
            if (typeof header.writeBigUInt64BE === 'function') {
                header.writeBigUInt64BE(BigInt(length), 2);
            } else {
                // Fallback for older Node.js versions
                const high = Math.floor(length / Math.pow(2, 32));
                const low = length % Math.pow(2, 32);
                header.writeUInt32BE(high, 2);
                header.writeUInt32BE(low, 6);
            }
        }
        
        return Buffer.concat([header, jsonBytes]);
    }
    
    sendToClient(client, data) {
        if (client.socket.writable) {
            client.socket.write(this.encodeMessage(data));
        }
    }
    
    broadcast(data, excludeClient = null) {
        for (const client of this.clients) {
            if (client !== excludeClient && client.socket.writable) {
                client.socket.write(this.encodeMessage(data));
            }
        }
    }
    
    broadcastUserCount() {
        this.broadcast({
            type: 'userCount',
            count: this.clients.size
        });
    }
    
    getRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 50%)`;
    }
}

// Initialize WebSocket server
const wsServer = new WebSocketServer(server);

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
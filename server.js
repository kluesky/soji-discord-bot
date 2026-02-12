const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');

class DashboardServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server);
        this.port = 3000;
        this.botClient = null;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketIO();
    }
    
    setupMiddleware() {
        this.app.use(express.static('public'));
        this.app.use(express.json());
    }
    
    setupRoutes() {
        // API Endpoints
        this.app.get('/api/status', (req, res) => {
            const status = this.getStatus();
            res.json({
                success: true,
                data: status,
                timestamp: new Date().toISOString()
            });
        });
        
        this.app.get('/api/guilds', async (req, res) => {
            if (!this.botClient || !this.botClient.isReady()) {
                return res.json({ success: false, error: 'Bot not ready' });
            }
            
            try {
                const guilds = this.botClient.guilds.cache.map(guild => ({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.iconURL({ size: 256 }),
                    members: guild.memberCount,
                    online: guild.members.cache.filter(m => m.presence?.status === 'online').size,
                    owner: guild.ownerId,
                    created: guild.createdAt.toISOString(),
                    channels: guild.channels.cache.size,
                    roles: guild.roles.cache.size
                }));
                
                res.json({ 
                    success: true, 
                    count: guilds.length, 
                    guilds 
                });
            } catch (error) {
                res.json({ success: false, error: error.message });
            }
        });
        
        this.app.get('/api/commands', (req, res) => {
            try {
                const mainModule = require('./main.js');
                const commands = mainModule.commands.map(cmd => ({
                    name: cmd.name,
                    description: cmd.description || 'No description',
                    options: cmd.options || []
                }));
                
                res.json({ 
                    success: true, 
                    count: commands.length, 
                    commands 
                });
            } catch (error) {
                res.json({ success: false, error: error.message });
            }
        });
        
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy',
                bot: this.botClient?.isReady() ? 'connected' : 'disconnected'
            });
        });
    }
    
    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('📡 Dashboard client connected');
            
            // Send initial status
            socket.emit('status', this.getStatus());
            
            socket.on('disconnect', () => {
                console.log('📡 Dashboard client disconnected');
            });
        });
    }
    
    getStatus() {
        if (!this.botClient || !this.botClient.isReady()) {
            return {
                online: false,
                botName: 'Soji Bot',
                uptime: 0,
                guilds: 0,
                users: 0,
                ping: 0,
                memory: { used: 0, total: 0, percent: 0 },
                lastUpdate: new Date().toISOString()
            };
        }
        
        const memoryUsage = process.memoryUsage();
        const memoryPercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
        
        return {
            online: true,
            botName: this.botClient.user.tag,
            botId: this.botClient.user.id,
            avatar: this.botClient.user.displayAvatarURL({ size: 256 }),
            uptime: Math.floor(process.uptime()),
            guilds: this.botClient.guilds.cache.size,
            users: this.botClient.users.cache.size,
            channels: this.botClient.channels.cache.size,
            ping: Math.round(this.botClient.ws.ping),
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                percent: memoryPercent
            },
            system: {
                platform: os.platform(),
                nodeVersion: process.version
            },
            lastUpdate: new Date().toISOString()
        };
    }
    
    setBotClient(client) {
        this.botClient = client;
    }
    
    update() {
        const status = this.getStatus();
        this.io.emit('status', status);
    }
    
    start() {
        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`🚀 Dashboard running on: http://localhost:${this.port}`);
            console.log(`📱 Network: http://${this.getLocalIP()}:${this.port}`);
            
            // Auto update every 5 seconds
            setInterval(() => {
                this.update();
            }, 5000);
        });
    }
    
    getLocalIP() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }
}

// Create and export instance
const dashboard = new DashboardServer();
module.exports = dashboard;
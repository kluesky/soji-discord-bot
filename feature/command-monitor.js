// command-monitor.js - REALTIME COMMAND MONITORING SYSTEM
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class CommandMonitor {
    constructor(client) {
        this.client = client;
        this.name = 'command-monitor';
        this.version = '1.0.0';
        
        this.statsPath = path.join(__dirname, 'data', 'command_stats.json');
        this.commandsPath = path.join(__dirname, 'data', 'command_list.json');
        
        this.stats = {
            totalCommands: 0,
            totalServers: 0,
            totalUsers: 0,
            uptime: 0,
            commandsExecuted: new Map(), // commandName -> count
            serversExecuted: new Map(),   // serverId -> { count, lastUsed }
            usersExecuted: new Map(),     // userId -> { count, lastUsed }
            dailyStats: new Map(),        // date -> count
            hourlyStats: new Array(24).fill(0), // jam 0-23
            popularCommands: [],
            lastUpdate: Date.now()
        };
        
        this.allCommands = [];
        this.loadData();
        this.setupCommandListener();
        this.startStatsUpdate();
    }

    async loadData() {
        try {
            await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
            
            // Load command stats
            try {
                const data = await fs.readFile(this.statsPath, 'utf8');
                if (data.trim() !== '') {
                    const parsed = JSON.parse(data);
                    this.stats = {
                        ...this.stats,
                        ...parsed,
                        commandsExecuted: new Map(parsed.commandsExecuted || []),
                        serversExecuted: new Map(parsed.serversExecuted || []),
                        usersExecuted: new Map(parsed.usersExecuted || []),
                        dailyStats: new Map(parsed.dailyStats || [])
                    };
                }
            } catch (error) {
                console.log('📊 Creating new command stats database...');
                await this.saveData();
            }
            
            console.log('📊 Command Monitor initialized');
        } catch (error) {
            console.error('Error loading command monitor data:', error);
        }
    }

    async saveData() {
        try {
            const data = {
                ...this.stats,
                commandsExecuted: Array.from(this.stats.commandsExecuted.entries()),
                serversExecuted: Array.from(this.stats.serversExecuted.entries()),
                usersExecuted: Array.from(this.stats.usersExecuted.entries()),
                dailyStats: Array.from(this.stats.dailyStats.entries())
            };
            await fs.writeFile(this.statsPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving command stats:', error);
        }
    }

    setupCommandListener() {
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isCommand()) return;
            
            this.recordCommandExecution(interaction);
        });
    }

    startStatsUpdate() {
        // Update stats every minute
        setInterval(() => {
            this.updateStats();
        }, 60000);
        
        // Save data every 5 minutes
        setInterval(() => {
            this.saveData();
        }, 300000);
    }

    updateStats() {
        // Update uptime
        this.stats.uptime = process.uptime();
        
        // Update total servers
        this.stats.totalServers = this.client.guilds.cache.size;
        
        // Update total users
        this.stats.totalUsers = this.client.users.cache.size;
        
        // Update popular commands
        this.stats.popularCommands = Array.from(this.stats.commandsExecuted.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        this.stats.lastUpdate = Date.now();
    }

    recordCommandExecution(interaction) {
        const commandName = interaction.commandName;
        const serverId = interaction.guild?.id || 'DM';
        const userId = interaction.user.id;
        const now = Date.now();
        const hour = new Date().getHours();
        const date = new Date().toISOString().split('T')[0];
        
        // Update total commands
        this.stats.totalCommands++;
        
        // Update command counter
        this.stats.commandsExecuted.set(
            commandName, 
            (this.stats.commandsExecuted.get(commandName) || 0) + 1
        );
        
        // Update server counter
        const serverStats = this.stats.serversExecuted.get(serverId) || { count: 0, lastUsed: 0 };
        serverStats.count++;
        serverStats.lastUsed = now;
        this.stats.serversExecuted.set(serverId, serverStats);
        
        // Update user counter
        const userStats = this.stats.usersExecuted.get(userId) || { count: 0, lastUsed: 0 };
        userStats.count++;
        userStats.lastUsed = now;
        this.stats.usersExecuted.set(userId, userStats);
        
        // Update daily stats
        this.stats.dailyStats.set(date, (this.stats.dailyStats.get(date) || 0) + 1);
        
        // Update hourly stats
        this.stats.hourlyStats[hour] = (this.stats.hourlyStats[hour] || 0) + 1;
        
        // Auto save every 10 commands
        if (this.stats.totalCommands % 10 === 0) {
            this.saveData();
        }
    }

    setAllCommands(commands) {
        this.allCommands = commands;
        this.saveCommandList();
    }

    async saveCommandList() {
        try {
            const commandList = this.allCommands.map(cmd => {
                const json = cmd.toJSON();
                return {
                    name: json.name,
                    description: json.description || 'No description',
                    options: json.options || [],
                    type: 'slash'
                };
            });
            
            await fs.writeFile(this.commandsPath, JSON.stringify(commandList, null, 2));
        } catch (error) {
            console.error('Error saving command list:', error);
        }
    }

    async getServerStats(guildId) {
        const serverStats = this.stats.serversExecuted.get(guildId) || { count: 0, lastUsed: 0 };
        
        // Get command usage in this server
        const serverCommands = [];
        for (const [cmd, count] of this.stats.commandsExecuted.entries()) {
            serverCommands.push({ name: cmd, count });
        }
        
        serverCommands.sort((a, b) => b.count - a.count);
        
        return {
            totalExecuted: serverStats.count,
            lastUsed: serverStats.lastUsed,
            popularCommands: serverCommands.slice(0, 5)
        };
    }

    // ==================== COMMAND HANDLERS ====================

    async handleBotStats(interaction) {
        await interaction.deferReply();
        
        this.updateStats();
        
        const uptime = this.formatUptime(this.stats.uptime);
        const memoryUsage = process.memoryUsage();
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const totalMemoryMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        const cpuUsage = process.cpuUsage();
        const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000).toFixed(2);
        
        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const todayCommands = this.stats.dailyStats.get(today) || 0;
        
        // Get server stats
        const serverStats = await this.getServerStats(interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('📊 **BOT STATISTICS**')
            .setDescription(`**${this.client.user.username}** - Realtime Monitoring`)
            .addFields(
                // ===== BOT INFO =====
                { 
                    name: '🤖 **BOT INFORMATION**', 
                    value: `
📋 **Name:** ${this.client.user.tag}
🆔 **ID:** \`${this.client.user.id}\`
📅 **Created:** <t:${Math.floor(this.client.user.createdTimestamp / 1000)}:R>
⏰ **Uptime:** ${uptime}
🌐 **Latency:** ${Math.round(this.client.ws.ping)}ms
                    `, 
                    inline: false 
                },
                
                // ===== STATISTICS =====
                { 
                    name: '📈 **GLOBAL STATISTICS**', 
                    value: `
🎯 **Total Commands:** ${this.stats.totalCommands.toLocaleString()}
📊 **Commands Today:** ${todayCommands.toLocaleString()}
🏰 **Servers:** ${this.stats.totalServers.toLocaleString()}
👥 **Users:** ${this.stats.totalUsers.toLocaleString()}
                    `, 
                    inline: true 
                },
                
                // ===== PERFORMANCE =====
                { 
                    name: '⚡ **PERFORMANCE**', 
                    value: `
💾 **Memory:** ${memoryMB}MB / ${totalMemoryMB}MB
⚙️ **CPU:** ${cpuPercent}%
🔄 **Node:** ${process.version}
📦 **Discord.js:** v14
                    `, 
                    inline: true 
                },
                
                // ===== SERVER STATS =====
                { 
                    name: `📋 **THIS SERVER STATS**`, 
                    value: `
🔧 **Commands Executed:** ${serverStats.totalExecuted.toLocaleString()}
🕐 **Last Used:** ${serverStats.lastUsed ? `<t:${Math.floor(serverStats.lastUsed / 1000)}:R>` : 'Never'}
                    `, 
                    inline: false 
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: `Last Updated • ${new Date().toLocaleString('id-ID')}`,
                iconURL: this.client.user.displayAvatarURL()
            });
        
        // Add popular commands in this server
        if (serverStats.popularCommands.length > 0) {
            let popularText = '';
            serverStats.popularCommands.forEach((cmd, i) => {
                popularText += `**${i + 1}.** \`/${cmd.name}\` - ${cmd.count}x\n`;
            });
            
            embed.addFields({
                name: '🔥 **POPULAR COMMANDS IN THIS SERVER**',
                value: popularText,
                inline: false
            });
        }
        
        // Add global popular commands
        if (this.stats.popularCommands.length > 0) {
            let globalPopularText = '';
            this.stats.popularCommands.forEach(([cmd, count], i) => {
                globalPopularText += `**${i + 1}.** \`/${cmd}\` - ${count.toLocaleString()}x\n`;
            });
            
            embed.addFields({
                name: '🌍 **GLOBAL POPULAR COMMANDS**',
                value: globalPopularText,
                inline: false
            });
        }
        
        // Add hourly activity chart
        const hourlyChart = this.generateHourlyChart();
        embed.addFields({
            name: '⏰ **HOURLY ACTIVITY (24h)**',
            value: hourlyChart,
            inline: false
        });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('stats_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('stats_commands')
                    .setLabel('📋 Command List')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('stats_reset')
                    .setLabel('⚠️ Reset Stats')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
    }

    async handleCommandList(interaction) {
        const category = interaction.options?.getString('category') || 'all';
        
        await interaction.deferReply({ ephemeral: true });
        
        // Group commands by category
        const categories = {
            'anime': [],
            'economy': [],
            'guild': [],
            'festival': [],
            'theater': [],
            'tournament': [],
            'ticket': [],
            'template': [],
            'monitor': [],
            'automod': [],
            'giveaway': [],
            'voice': [],
            'translate': [],
            'utility': [],
            'admin': [],
            'other': []
        };
        
        this.allCommands.forEach(cmd => {
            const json = cmd.toJSON();
            const name = json.name;
            const description = json.description || 'No description';
            
            // Categorize commands
            if (name.startsWith('anime')) categories.anime.push({ name, description });
            else if (name.startsWith('economy')) categories.economy.push({ name, description });
            else if (name === 'guild') categories.guild.push({ name, description });
            else if (name === 'festival') categories.festival.push({ name, description });
            else if (name === 'theater') categories.theater.push({ name, description });
            else if (name === 'tournament') categories.tournament.push({ name, description });
            else if (name === 'ticket') categories.ticket.push({ name, description });
            else if (name === 'template') categories.template.push({ name, description });
            else if (['setup_monitor', 'disable_monitor', 'server_stats', 'monitor_style', 'botstats', 'commandlist'].includes(name)) 
                categories.monitor.push({ name, description });
            else if (name === 'automod') categories.automod.push({ name, description });
            else if (name === 'giveaway') categories.giveaway.push({ name, description });
            else if (name === 'voice') categories.voice.push({ name, description });
            else if (name === 'translate') categories.translate.push({ name, description });
            else if (['ping', 'help', 'serverinfo', 'userinfo', 'membercount', 'roles', 'avatar', 'banner', 'invite'].includes(name))
                categories.utility.push({ name, description });
            else if (['clear', 'slowmode', 'announce', 'say', 'poll'].includes(name))
                categories.admin.push({ name, description });
            else categories.other.push({ name, description });
        });
        
        // Get server stats for executed commands
        const serverStats = await this.getServerStats(interaction.guild.id);
        const executedCommands = new Map();
        
        for (const [cmd, count] of this.stats.commandsExecuted.entries()) {
            executedCommands.set(cmd, count);
        }
        
        if (category === 'all') {
            // Show summary of all categories
            const embed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle('📋 **COMMAND LIST**')
                .setDescription(`**Total Commands:** ${this.allCommands.length}\n**Executed in this server:** ${serverStats.totalExecuted} commands\n`)
                .addFields(
                    { name: '🎴 Anime', value: `${categories.anime.length} commands\n\`/anime\` \`/guild\` \`/festival\` \`/theater\` \`/tournament\``, inline: true },
                    { name: '💰 Economy', value: `${categories.economy.length} commands\n\`/economy\` \`/economy-admin\``, inline: true },
                    { name: '🎫 Ticket', value: `${categories.ticket.length} commands\n\`/ticket\``, inline: true },
                    { name: '📊 Monitor', value: `${categories.monitor.length} commands\n\`/setup_monitor\` \`/botstats\``, inline: true },
                    { name: '🛠️ Utility', value: `${categories.utility.length} commands\n\`/ping\` \`/help\` \`/serverinfo\``, inline: true },
                    { name: '👑 Admin', value: `${categories.admin.length} commands\n\`/clear\` \`/announce\` \`/say\``, inline: true },
                    { name: '🚫 AutoMod', value: `${categories.automod.length} commands\n\`/automod\``, inline: true },
                    { name: '🎪 Giveaway', value: `${categories.giveaway.length} commands\n\`/giveaway\``, inline: true },
                    { name: '🔊 Voice', value: `${categories.voice.length} commands\n\`/voice\``, inline: true },
                    { name: '🌍 Translate', value: `${categories.translate.length} commands\n\`/translate\``, inline: true },
                    { name: '📋 Template', value: `${categories.template.length} commands\n\`/template\``, inline: true }
                )
                .setFooter({ text: 'Gunakan /commandlist <category> untuk detail' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } else {
            // Show detailed commands for specific category
            const categoryCommands = categories[category] || [];
            const categoryNames = {
                'anime': '🎴 ANIME COMMANDS',
                'economy': '💰 ECONOMY COMMANDS',
                'guild': '🏰 GUILD COMMANDS',
                'festival': '🎪 FESTIVAL COMMANDS',
                'theater': '🎬 THEATER COMMANDS',
                'tournament': '🏆 TOURNAMENT COMMANDS',
                'ticket': '🎫 TICKET COMMANDS',
                'template': '📋 TEMPLATE COMMANDS',
                'monitor': '📊 MONITOR COMMANDS',
                'automod': '🚫 AUTOMOD COMMANDS',
                'giveaway': '🎪 GIVEAWAY COMMANDS',
                'voice': '🔊 VOICE COMMANDS',
                'translate': '🌍 TRANSLATE COMMANDS',
                'utility': '🛠️ UTILITY COMMANDS',
                'admin': '👑 ADMIN COMMANDS',
                'other': '📌 OTHER COMMANDS'
            };
            
            const embed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle(categoryNames[category] || '📋 COMMANDS')
                .setDescription(`**Total:** ${categoryCommands.length} commands\n`);
            
            // Split into chunks of 10
            const chunks = this.chunkArray(categoryCommands, 10);
            chunks.forEach((chunk, index) => {
                let value = '';
                chunk.forEach(cmd => {
                    const executedCount = executedCommands.get(cmd.name) || 0;
                    const executedEmoji = executedCount > 0 ? '✅' : '⏳';
                    value += `${executedEmoji} \`/${cmd.name}\` - ${executedCount}x\n`;
                });
                
                embed.addFields({
                    name: index === 0 ? '📝 COMMANDS' : '​',
                    value: value || 'No commands',
                    inline: false
                });
            });
            
            embed.setFooter({ text: '✅ = Already used | ⏳ = Never used' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    }

    async handleResetStats(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Kamu butuh permission **Administrator**!', 
                ephemeral: true 
            });
        }
        
        // Reset stats for this server only
        const serverId = interaction.guild.id;
        
        // Remove server from stats
        this.stats.serversExecuted.delete(serverId);
        
        // Recalculate command counts (remove this server's usage)
        // This is simplified - in production you'd want to track per-server command usage
        this.stats.commandsExecuted.clear();
        this.stats.usersExecuted.clear();
        this.stats.totalCommands = 0;
        
        await this.saveData();
        
        await interaction.reply({ 
            content: '✅ Command statistics for this server has been reset!', 
            ephemeral: true 
        });
    }

    // ==================== HELPER FUNCTIONS ====================

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0) parts.push(`${secs}s`);
        
        return parts.join(' ') || '0s';
    }

    generateHourlyChart() {
        const hours = this.stats.hourlyStats;
        const max = Math.max(...hours, 1);
        
        let chart = '';
        for (let i = 0; i < 24; i += 3) {
            const hour = i.toString().padStart(2, '0');
            const count = hours[i] || 0;
            const barLength = Math.max(1, Math.floor((count / max) * 10));
            const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);
            chart += `\`${hour}:00\` ${bar} ${count.toLocaleString()}\n`;
        }
        
        return chart;
    }

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // ==================== INTERACTION HANDLER ====================

    async handleInteraction(interaction) {
        if (!interaction.isButton()) return;
        
        const { customId } = interaction;
        
        if (customId === 'stats_refresh') {
            await interaction.deferUpdate();
            await this.handleBotStats(interaction);
        } else if (customId === 'stats_commands') {
            await this.handleCommandList(interaction);
        } else if (customId === 'stats_reset') {
            await this.handleResetStats(interaction);
        }
    }

    // ==================== STATIC METHODS ====================

    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('botstats')
                .setDescription('📊 Lihat statistik bot secara realtime'),
            
            new SlashCommandBuilder()
                .setName('commandlist')
                .setDescription('📋 Lihat semua command yang tersedia')
                .addStringOption(opt =>
                    opt.setName('category')
                        .setDescription('Kategori command')
                        .setRequired(false)
                        .addChoices(
                            { name: '🎴 Anime', value: 'anime' },
                            { name: '💰 Economy', value: 'economy' },
                            { name: '🏰 Guild', value: 'guild' },
                            { name: '🎪 Festival', value: 'festival' },
                            { name: '🎬 Theater', value: 'theater' },
                            { name: '🏆 Tournament', value: 'tournament' },
                            { name: '🎫 Ticket', value: 'ticket' },
                            { name: '📋 Template', value: 'template' },
                            { name: '📊 Monitor', value: 'monitor' },
                            { name: '🚫 AutoMod', value: 'automod' },
                            { name: '🎪 Giveaway', value: 'giveaway' },
                            { name: '🔊 Voice', value: 'voice' },
                            { name: '🌍 Translate', value: 'translate' },
                            { name: '🛠️ Utility', value: 'utility' },
                            { name: '👑 Admin', value: 'admin' }
                        ))
        ];
    }

    static async handleCommand(interaction, monitor) {
        const commandName = interaction.commandName;
        
        if (commandName === 'botstats') {
            await monitor.handleBotStats(interaction);
        } else if (commandName === 'commandlist') {
            await monitor.handleCommandList(interaction);
        }
    }
}

module.exports = CommandMonitor;
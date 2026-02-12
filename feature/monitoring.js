// monitor.js - REAL-TIME SERVER MONITORING (UPDATE 1 PESAN SAJA)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class ServerMonitor {
    constructor(client) {
        this.client = client;
        this.monitorData = new Map();
        this.statusHistory = new Map();
        this.maxHistory = 100;
        this.monitoringMessages = new Map(); // Store message IDs per guild
        this.alertThresholds = {
            highCPU: 80,
            highMemory: 85,
            highPing: 300,
            lowOnline: 20
        };
        this.monitoringInterval = null;
        
        // Styling configuration
        this.style = {
            title: '**FOR DISCORD**',
            imageUrl: 'https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyZWhpN3Q1Y2kzejB0b3dkbXdidGFsNTJ4NGk5cWJhMmhuZ3B1dGNwdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1xONKAmjT1GHFpkLRd/giphy.gif',
            footerText: 'Lyora Community',
            color: 0x1E90FF,
            accentColor: 0x00BFFF
        };
        
        this.configPath = path.join(__dirname, 'monitor_config.json');
        this.loadConfig();
    }

    async loadConfig() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            const config = JSON.parse(data);
            
            // Load style if exists
            if (config.style) {
                this.style = { ...this.style, ...config.style };
            }
            
            for (const [guildId, guildConfig] of Object.entries(config)) {
                if (guildId !== 'style') {
                    this.monitorData.set(guildId, {
                        enabled: guildConfig.enabled || false,
                        channel: guildConfig.channel || null,
                        messageId: guildConfig.messageId || null, // Store message ID
                        alerts: guildConfig.alerts || true,
                        trackStats: guildConfig.trackStats || true,
                        autoReport: guildConfig.autoReport || false,
                        reportInterval: guildConfig.reportInterval || 3600,
                        lastReport: guildConfig.lastReport || 0,
                        customThresholds: guildConfig.customThresholds || {},
                        customStyle: guildConfig.customStyle || null
                    });
                    
                    // Store message ID in cache
                    if (guildConfig.messageId) {
                        this.monitoringMessages.set(guildId, guildConfig.messageId);
                    }
                }
            }
            
            console.log(`✅ Loaded monitoring config for ${this.monitorData.size} guilds`);
            
            // Start monitoring if any guild has it enabled
            const anyEnabled = Array.from(this.monitorData.values()).some(cfg => cfg.enabled);
            if (anyEnabled && !this.monitoringInterval) {
                this.startMonitoring();
            }
            
        } catch (error) {
            console.log('📝 No monitoring config found, creating default...');
            await this.saveConfig();
        }
    }

    async saveConfig() {
        const config = {};
        this.monitorData.forEach((data, guildId) => {
            config[guildId] = data;
        });
        
        // Save style
        config.style = this.style;
        
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    }

    async enableMonitoring(guildId, channelId) {
        const channel = this.client.channels.cache.get(channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }
        
        try {
            // Create initial monitoring message
            const stats = await this.collectStats(this.client.guilds.cache.get(guildId));
            const embed = this.createMonitoringEmbed(stats, [], guildId);
            const components = this.createMonitoringComponents();
            
            const message = await channel.send({ 
                content: '📊 **REAL-TIME SERVER MONITORING**',
                embeds: [embed], 
                components: [components] 
            });
            
            // Save message ID
            const config = {
                enabled: true,
                channel: channelId,
                messageId: message.id,
                alerts: true,
                trackStats: true,
                autoReport: false,
                reportInterval: 3600,
                lastReport: Date.now(),
                customThresholds: {},
                customStyle: null
            };
            
            this.monitorData.set(guildId, config);
            this.monitoringMessages.set(guildId, message.id);
            await this.saveConfig();
            
            // Start monitoring interval if not already running
            if (!this.monitoringInterval) {
                this.startMonitoring();
            }
            
            console.log(`✅ Monitoring enabled for guild ${guildId}, message ID: ${message.id}`);
            return config;
            
        } catch (error) {
            console.error('Error creating monitoring message:', error);
            throw new Error('Failed to create monitoring message');
        }
    }

    async disableMonitoring(guildId) {
        const config = this.monitorData.get(guildId);
        if (config) {
            config.enabled = false;
            this.monitorData.set(guildId, config);
            this.monitoringMessages.delete(guildId);
            await this.saveConfig();
        }
        
        // Check if any guilds still have monitoring enabled
        const anyEnabled = Array.from(this.monitorData.values()).some(cfg => cfg.enabled);
        if (!anyEnabled && this.monitoringInterval) {
            this.stopMonitoring();
        }
        
        console.log(`❌ Monitoring disabled for guild ${guildId}`);
        return true;
    }

    startMonitoring() {
        console.log('📊 Starting server monitoring (updating 1 message)...');
        
        // Update every 30 seconds
        this.monitoringInterval = setInterval(() => {
            this.updateAllGuilds();
        }, 30000);
        
        // Initial update
        setTimeout(() => this.updateAllGuilds(), 2000);
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('📊 Stopped server monitoring');
        }
    }

    async updateAllGuilds() {
        for (const [guildId, config] of this.monitorData) {
            if (config.enabled && config.channel && config.messageId) {
                try {
                    await this.updateGuildStats(guildId);
                } catch (error) {
                    console.error(`Error updating stats for guild ${guildId}:`, error.message);
                    
                    // Try to recover if message was deleted
                    if (error.message.includes('Unknown Message')) {
                        await this.recoverMonitoringMessage(guildId);
                    }
                }
            }
        }
    }

    async updateGuildStats(guildId) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild || !guild.available) return;

        const config = this.monitorData.get(guildId);
        if (!config) return;

        const channel = guild.channels.cache.get(config.channel);
        if (!channel) return;

        // Collect statistics
        const stats = await this.collectStats(guild);
        
        // Store in history
        this.addToHistory(guildId, stats);
        
        // Check for alerts
        const alerts = this.checkAlerts(stats, config);
        
        // Update existing message
        await this.updateExistingMessage(channel, config.messageId, stats, alerts, guildId);
    }

    async updateExistingMessage(channel, messageId, stats, alerts, guildId) {
        try {
            const message = await channel.messages.fetch(messageId);
            if (!message) {
                throw new Error('Message not found');
            }
            
            const guildConfig = this.monitorData.get(guildId);
            const useCompact = guildConfig?.customStyle?.title?.includes('COMPACT') || false;
            
            const embed = useCompact ? 
                this.createCompactEmbed(stats, alerts) : 
                this.createMonitoringEmbed(stats, alerts, guildId);
            
            const components = this.createMonitoringComponents();
            
            await message.edit({ 
                embeds: [embed], 
                components: [components] 
            });
            
        } catch (error) {
            console.error('Error updating monitoring message:', error.message);
            throw error;
        }
    }

    async recoverMonitoringMessage(guildId) {
        console.log(`🔄 Attempting to recover monitoring message for guild ${guildId}`);
        
        const config = this.monitorData.get(guildId);
        if (!config || !config.channel) return;
        
        try {
            const guild = this.client.guilds.cache.get(guildId);
            const channel = guild.channels.cache.get(config.channel);
            
            if (!channel) {
                console.error(`Channel ${config.channel} not found for guild ${guildId}`);
                return;
            }
            
            // Create new message
            const stats = await this.collectStats(guild);
            const alerts = this.checkAlerts(stats, config);
            const embed = this.createMonitoringEmbed(stats, alerts, guildId);
            const components = this.createMonitoringComponents();
            
            const message = await channel.send({ 
                content: '📊 **REAL-TIME SERVER MONITORING**',
                embeds: [embed], 
                components: [components] 
            });
            
            // Update config with new message ID
            config.messageId = message.id;
            this.monitorData.set(guildId, config);
            this.monitoringMessages.set(guildId, message.id);
            await this.saveConfig();
            
            console.log(`✅ Recovered monitoring message for guild ${guildId}, new message ID: ${message.id}`);
            
        } catch (error) {
            console.error(`Failed to recover monitoring message for guild ${guildId}:`, error);
        }
    }

    async collectStats(guild) {
        // Fetch members for accurate counts
        await guild.members.fetch().catch(() => {});
        
        // Member statistics
        const members = guild.members.cache;
        const online = members.filter(m => m.presence?.status === 'online').size;
        const idle = members.filter(m => m.presence?.status === 'idle').size;
        const dnd = members.filter(m => m.presence?.status === 'dnd').size;
        const offline = members.filter(m => !m.presence?.status).size;
        const bots = members.filter(m => m.user.bot).size;
        const humans = guild.memberCount - bots;
        
        // Calculate online percentage safely
        const onlinePercent = guild.memberCount > 0 ? 
            Math.round((online / guild.memberCount) * 100) : 0;
        
        // Channel statistics
        const channels = guild.channels.cache;
        const textChannels = channels.filter(c => c.type === 0).size;
        const voiceChannels = channels.filter(c => c.type === 2).size;
        const categories = channels.filter(c => c.type === 4).size;
        
        // Role statistics
        const roles = guild.roles.cache;
        const roleCount = roles.size;
        
        // Bot statistics
        const memoryUsage = process.memoryUsage();
        const memoryPercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
        
        // System statistics
        const cpuUsage = os.loadavg()[0] / (os.cpus()?.length || 1) * 100;
        const uptime = process.uptime();
        
        // Get owner
        let ownerTag = 'Unknown';
        try {
            const owner = await guild.fetchOwner();
            ownerTag = owner.user.tag;
        } catch (error) {
            ownerTag = 'Could not fetch';
        }
        
        return {
            timestamp: Date.now(),
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ size: 256 }),
                owner: ownerTag,
                created: guild.createdAt
            },
            members: {
                total: guild.memberCount,
                online,
                idle,
                dnd,
                offline,
                bots,
                humans,
                onlinePercent
            },
            channels: {
                total: channels.size,
                text: textChannels,
                voice: voiceChannels,
                categories
            },
            roles: {
                count: roleCount,
                managed: roles.filter(r => r.managed).size
            },
            bot: {
                ping: this.client.ws.ping,
                uptime,
                memory: {
                    used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    percent: memoryPercent
                }
            },
            system: {
                cpu: Math.round(cpuUsage),
                platform: os.platform(),
                nodeVersion: process.version
            },
            boosts: guild.premiumSubscriptionCount || 0,
            boostLevel: guild.premiumTier
        };
    }

    addToHistory(guildId, stats) {
        if (!this.statusHistory.has(guildId)) {
            this.statusHistory.set(guildId, []);
        }
        
        const history = this.statusHistory.get(guildId);
        history.push(stats);
        
        // Keep only last N entries
        if (history.length > this.maxHistory) {
            history.shift();
        }
    }

    checkAlerts(stats, config) {
        const alerts = [];
        const thresholds = { ...this.alertThresholds, ...config.customThresholds };
        
        // Check bot alerts
        if (stats.bot.memory.percent > thresholds.highMemory) {
            alerts.push({
                type: 'memory',
                level: 'high',
                message: `⚠️ Bot memory usage is high: ${stats.bot.memory.percent}%`
            });
        }
        
        if (stats.bot.ping > thresholds.highPing) {
            alerts.push({
                type: 'ping',
                level: 'high',
                message: `⚠️ Bot ping is high: ${stats.bot.ping}ms`
            });
        }
        
        // Check server alerts
        if (stats.members.onlinePercent < thresholds.lowOnline) {
            alerts.push({
                type: 'online',
                level: 'medium',
                message: `ℹ️ Low online rate: ${stats.members.onlinePercent}%`
            });
        }
        
        // Check system alerts
        if (stats.system.cpu > thresholds.highCPU) {
            alerts.push({
                type: 'cpu',
                level: 'high',
                message: `⚠️ High CPU usage: ${stats.system.cpu}%`
            });
        }
        
        return alerts;
    }

    createMonitoringEmbed(stats, alerts, guildId) {
        const guildConfig = this.monitorData.get(guildId);
        const style = guildConfig?.customStyle || this.style;
        
        // Create progress bars
        const onlineBar = this.createProgressBar(stats.members.onlinePercent, 10);
        const memoryBar = this.createProgressBar(stats.bot.memory.percent, 10);
        const cpuBar = this.createProgressBar(stats.system.cpu, 10);
        
        // Create the main embed
        const embed = new EmbedBuilder()
            .setColor(style.color)
            .setTitle(style.title)
            .setDescription(`📊 **${stats.guild.name.toUpperCase()} REAL-TIME MONITORING**\n\n` +
                `**Last Updated:** <t:${Math.floor(stats.timestamp/1000)}:R>\n` +
                `**Monitoring Since:** <t:${Math.floor(Date.now()/1000 - stats.bot.uptime)}:R>`)
            .addFields(
                {
                    name: '👥 **MEMBER STATISTICS**',
                    value: `🟢 **Online:** ${stats.members.online} (${stats.members.onlinePercent}%)\n` +
                           `${onlineBar}\n` +
                           `👤 **Humans:** ${stats.members.humans}\n` +
                           `🤖 **Bots:** ${stats.members.bots}\n` +
                           `📊 **Total:** ${stats.members.total}`,
                    inline: false
                },
                {
                    name: '📊 **SERVER METRICS**',
                    value: `📁 **Channels:** ${stats.channels.total} (${stats.channels.text} text, ${stats.channels.voice} voice)\n` +
                           `🎭 **Roles:** ${stats.roles.count}\n` +
                           `🚀 **Boosts:** ${stats.boosts} (Level ${stats.boostLevel})\n` +
                           `👑 **Owner:** ${stats.guild.owner}`,
                    inline: false
                },
                {
                    name: '🤖 **BOT PERFORMANCE**',
                    value: `📶 **Ping:** ${stats.bot.ping}ms\n` +
                           `⏱️ **Uptime:** ${this.formatUptime(stats.bot.uptime)}\n` +
                           `💾 **Memory:** ${stats.bot.memory.percent}% ${memoryBar}\n` +
                           `📈 **Usage:** ${stats.bot.memory.used}MB / ${stats.bot.memory.total}MB`,
                    inline: false
                },
                {
                    name: '💻 **SYSTEM STATUS**',
                    value: `⚡ **CPU:** ${stats.system.cpu}% ${cpuBar}\n` +
                           `🖥️ **Platform:** ${stats.system.platform}\n` +
                           `🔧 **Node:** ${stats.system.nodeVersion}`,
                    inline: false
                }
            )
            .setImage(style.imageUrl)
            .setTimestamp()
            .setFooter({ 
                text: `${style.footerText} • Server Monitoring • Updated every 30s`,
                iconURL: stats.guild.icon || this.client.user.displayAvatarURL()
            });
        
        // Add alerts section if any
        if (alerts.length > 0) {
            const alertMessages = alerts.map(alert => `• ${alert.message}`).join('\n');
            embed.addFields({
                name: '🚨 **ALERTS**',
                value: alertMessages,
                inline: false
            });
        }
        
        // Add thumbnail if server has icon
        if (stats.guild.icon) {
            embed.setThumbnail(stats.guild.icon);
        }
        
        return embed;
    }

    createProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        
        let bar = '';
        for (let i = 0; i < filled; i++) bar += '█';
        for (let i = 0; i < empty; i++) bar += '░';
        
        return `\`${bar}\` ${percentage}%`;
    }

    createCompactEmbed(stats, alerts) {
        const style = this.style;
        
        const embed = new EmbedBuilder()
            .setColor(style.color)
            .setTitle(style.title)
            .setDescription(`📈 **${stats.guild.name} SERVER DASHBOARD**\n\n` +
                `👥 **${stats.members.online}/${stats.members.total}** online • ` +
                `📁 **${stats.channels.total}** channels • ` +
                `🎭 **${stats.roles.count}** roles\n` +
                `🤖 **${stats.bot.ping}ms** ping • ` +
                `💾 **${stats.bot.memory.percent}%** memory • ` +
                `⚡ **${stats.system.cpu}%** CPU`)
            .addFields(
                {
                    name: '📊 REAL-TIME METRICS',
                    value: this.createMetricsDisplay(stats),
                    inline: false
                }
            )
            .setImage(style.imageUrl)
            .setTimestamp()
            .setFooter({ 
                text: `${style.footerText} • Updated every 30s`,
                iconURL: this.client.user.displayAvatarURL()
            });
        
        return embed;
    }

    createMetricsDisplay(stats) {
        return `🟢 **ONLINE:** ${this.createProgressBar(stats.members.onlinePercent, 8)}\n` +
               `💾 **MEMORY:** ${this.createProgressBar(stats.bot.memory.percent, 8)}\n` +
               `⚡ **CPU:** ${this.createProgressBar(stats.system.cpu, 8)}\n` +
               `📶 **PING:** ${stats.bot.ping < 100 ? '🟢' : stats.bot.ping < 300 ? '🟡' : '🔴'} ${stats.bot.ping}ms`;
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    // ==================== COMMAND HANDLERS ====================

    async handleSetupMonitor(interaction) {
        if (!interaction.memberPermissions.has('Administrator')) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!',
                ephemeral: true 
            });
        }
        
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const styleOption = interaction.options.getString('style') || 'default';
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Check if monitoring already enabled
            const existingConfig = this.monitorData.get(interaction.guild.id);
            if (existingConfig && existingConfig.enabled) {
                return interaction.editReply({ 
                    content: '❌ Monitoring already enabled for this server! Use `/disable_monitor` first.' 
                });
            }
            
            const config = await this.enableMonitoring(interaction.guild.id, channel.id);
            
            // Set custom style if specified
            if (styleOption === 'compact') {
                config.customStyle = {
                    ...this.style,
                    title: '**FOR DISCORD - COMPACT VIEW**'
                };
                this.monitorData.set(interaction.guild.id, config);
                await this.saveConfig();
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ **SERVER MONITORING ENABLED**')
                .setDescription(`Real-time monitoring has been enabled in ${channel}`)
                .addFields(
                    { 
                        name: '📊 **FEATURES**', 
                        value: '• Updates every 30 seconds\n• Real-time server statistics\n• Bot performance metrics\n• Alert system\n• Interactive buttons', 
                        inline: false 
                    },
                    { 
                        name: '⚙️ **CONFIGURATION**', 
                        value: `• Style: **${styleOption}**\n• Message ID: \`${config.messageId}\`\n• Auto-update: **Enabled**`, 
                        inline: false 
                    }
                )
                .setFooter({ 
                    text: 'The monitoring embed will auto-update every 30 seconds',
                    iconURL: interaction.guild.iconURL() || this.client.user.displayAvatarURL()
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Setup monitor error:', error);
            await interaction.editReply({ 
                content: `❌ Error: ${error.message}` 
            });
        }
    }

    async handleDisableMonitor(interaction) {
        if (!interaction.memberPermissions.has('Administrator')) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!',
                ephemeral: true 
            });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            await this.disableMonitoring(interaction.guild.id);
            
            const embed = new EmbedBuilder()
                .setColor(0xFF6B6B)
                .setTitle('✅ **SERVER MONITORING DISABLED**')
                .setDescription('Real-time monitoring has been disabled for this server')
                .addFields(
                    { 
                        name: '⚠️ **NOTE**', 
                        value: 'The monitoring message will no longer update automatically.\nYou can enable it again anytime with `/setup_monitor`', 
                        inline: false 
                    }
                )
                .setFooter({ text: 'Monitoring stopped' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Disable monitor error:', error);
            await interaction.editReply({ 
                content: '❌ Error disabling monitoring system!' 
            });
        }
    }

    async handleStats(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const stats = await this.collectStats(interaction.guild);
            const config = this.monitorData.get(interaction.guild.id) || { alerts: true };
            const alerts = config.alerts ? this.checkAlerts(stats, config) : [];
            
            const embed = this.createMonitoringEmbed(stats, alerts, interaction.guild.id);
            embed.setTitle(`📊 ${interaction.guild.name.toUpperCase()} LIVE STATISTICS`);
            embed.setFooter({ 
                text: 'One-time snapshot • Use /setup_monitor for real-time monitoring',
                iconURL: interaction.guild.iconURL() || this.client.user.displayAvatarURL()
            });
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Stats error:', error);
            await interaction.editReply({ 
                content: '❌ Error fetching server statistics!' 
            });
        }
    }

    async handleMonitorStyle(interaction) {
        if (!interaction.memberPermissions.has('Administrator')) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!',
                ephemeral: true 
            });
        }
        
        const title = interaction.options.getString('title');
        const footer = interaction.options.getString('footer');
        const imageUrl = interaction.options.getString('image_url');
        const color = interaction.options.getString('color');
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const guildId = interaction.guild.id;
            let config = this.monitorData.get(guildId);
            
            if (!config) {
                return interaction.editReply({ 
                    content: '❌ Monitoring not enabled for this server! Use `/setup_monitor` first.' 
                });
            }
            
            if (!config.customStyle) {
                config.customStyle = { ...this.style };
            }
            
            // Update custom style
            if (title) config.customStyle.title = title;
            if (footer) config.customStyle.footerText = footer;
            if (imageUrl) config.customStyle.imageUrl = imageUrl;
            if (color) {
                try {
                    config.customStyle.color = parseInt(color.replace('#', ''), 16);
                } catch (error) {
                    config.customStyle.color = this.style.color;
                }
            }
            
            this.monitorData.set(guildId, config);
            await this.saveConfig();
            
            const embed = new EmbedBuilder()
                .setColor(config.customStyle.color || this.style.color)
                .setTitle(config.customStyle.title || this.style.title)
                .setDescription('✅ **MONITORING STYLE UPDATED**\n\n' +
                    'Custom style has been applied to monitoring embed.')
                .addFields(
                    { 
                        name: '🎨 **NEW STYLE**', 
                        value: `• Title: **${config.customStyle.title}**\n• Footer: **${config.customStyle.footerText}**\n• Color: **#${(config.customStyle.color || this.style.color).toString(16).toUpperCase()}**\n• Image: ${config.customStyle.imageUrl ? 'Custom' : 'Default'}`, 
                        inline: false 
                    }
                )
                .setImage(config.customStyle.imageUrl || this.style.imageUrl)
                .setTimestamp()
                .setFooter({ 
                    text: config.customStyle.footerText || this.style.footerText,
                    iconURL: interaction.guild.iconURL() || this.client.user.displayAvatarURL()
                });
            
            await interaction.editReply({ embeds: [embed] });
            
            // Update the monitoring message with new style
            if (config.enabled && config.channel && config.messageId) {
                const channel = interaction.guild.channels.cache.get(config.channel);
                if (channel) {
                    const stats = await this.collectStats(interaction.guild);
                    const alerts = config.alerts ? this.checkAlerts(stats, config) : [];
                    const useCompact = config.customStyle?.title?.includes('COMPACT') || false;
                    
                    const newEmbed = useCompact ? 
                        this.createCompactEmbed(stats, alerts) : 
                        this.createMonitoringEmbed(stats, alerts, guildId);
                    
                    const components = this.createMonitoringComponents();
                    
                    try {
                        const message = await channel.messages.fetch(config.messageId);
                        await message.edit({ 
                            embeds: [newEmbed], 
                            components: [components] 
                        });
                    } catch (error) {
                        console.error('Error updating message style:', error);
                    }
                }
            }
            
        } catch (error) {
            console.error('Monitor style error:', error);
            await interaction.editReply({ 
                content: '❌ Error updating monitoring style!' 
            });
        }
    }

    // ==================== BUTTON HANDLERS ====================

    createMonitoringComponents() {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('monitor_refresh')
                    .setLabel('🔄 Refresh Now')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('monitor_report')
                    .setLabel('📊 Full Report')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('monitor_alerts')
                    .setLabel('🔔 Toggle Alerts')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('monitor_config')
                    .setLabel('⚙️ Configure')
                    .setStyle(ButtonStyle.Secondary)
            );
    }

    async handleInteraction(interaction) {
        if (!interaction.isButton()) return;
        
        const { customId } = interaction;
        
        try {
            switch (customId) {
                case 'monitor_refresh':
                    await this.handleRefresh(interaction);
                    break;
                case 'monitor_report':
                    await this.handleReport(interaction);
                    break;
                case 'monitor_alerts':
                    await this.handleToggleAlerts(interaction);
                    break;
                case 'monitor_config':
                    await this.handleConfig(interaction);
                    break;
            }
        } catch (error) {
            console.error('Monitor interaction error:', error);
        }
    }

    async handleRefresh(interaction) {
        await interaction.deferUpdate();
        
        const guildId = interaction.guild.id;
        const config = this.monitorData.get(guildId);
        
        if (!config || !config.enabled) {
            return;
        }
        
        const stats = await this.collectStats(interaction.guild);
        const alerts = config.alerts ? this.checkAlerts(stats, config) : [];
        
        const useCompact = config.customStyle?.title?.includes('COMPACT') || false;
        const embed = useCompact ? 
            this.createCompactEmbed(stats, alerts) : 
            this.createMonitoringEmbed(stats, alerts, guildId);
        
        const components = this.createMonitoringComponents();
        
        await interaction.message.edit({ 
            embeds: [embed], 
            components: [components] 
        });
    }

    async handleReport(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const stats = await this.collectStats(interaction.guild);
        const history = this.statusHistory.get(interaction.guild.id) || [];
        
        const embed = new EmbedBuilder()
            .setColor(0x9370DB)
            .setTitle(`📈 ${interaction.guild.name.toUpperCase()} DETAILED REPORT`)
            .setDescription(`**Historical Analysis**\nBased on ${history.length} data points`)
            .addFields(
                {
                    name: '📊 **PERFORMANCE TRENDS**',
                    value: `• Average Online Rate: ${this.calculateAverageOnline(interaction.guild.id)}%\n• Average Bot Ping: ${Math.round(this.calculateAveragePing(interaction.guild.id))}ms\n• Bot Uptime: ${this.formatUptime(stats.bot.uptime)}`,
                    inline: false
                },
                {
                    name: '📋 **RECOMMENDATIONS**',
                    value: this.generateRecommendations(stats),
                    inline: false
                }
            )
            .setFooter({ 
                text: 'Report generated from real-time monitoring data',
                iconURL: interaction.guild.iconURL() || this.client.user.displayAvatarURL()
            })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }

    calculateAverageOnline(guildId) {
        const history = this.statusHistory.get(guildId) || [];
        if (history.length === 0) return 0;
        
        const total = history.reduce((sum, stats) => sum + stats.members.onlinePercent, 0);
        return Math.round(total / history.length);
    }

    calculateAveragePing(guildId) {
        const history = this.statusHistory.get(guildId) || [];
        if (history.length === 0) return 0;
        
        const total = history.reduce((sum, stats) => sum + stats.bot.ping, 0);
        return total / history.length;
    }

    async handleToggleAlerts(interaction) {
        if (!interaction.memberPermissions.has('Administrator')) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!',
                ephemeral: true 
            });
        }
        
        await interaction.deferUpdate();
        
        const guildId = interaction.guild.id;
        let config = this.monitorData.get(guildId);
        
        if (!config) {
            return;
        }
        
        config.alerts = !config.alerts;
        
        this.monitorData.set(guildId, config);
        await this.saveConfig();
        
        const stats = await this.collectStats(interaction.guild);
        const alerts = config.alerts ? this.checkAlerts(stats, config) : [];
        
        const useCompact = config.customStyle?.title?.includes('COMPACT') || false;
        const embed = useCompact ? 
            this.createCompactEmbed(stats, alerts) : 
            this.createMonitoringEmbed(stats, alerts, guildId);
        
        const components = this.createMonitoringComponents();
        
        await interaction.message.edit({ 
            embeds: [embed], 
            components: [components] 
        });
    }

    async handleConfig(interaction) {
        if (!interaction.memberPermissions.has('Administrator')) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!',
                ephemeral: true 
            });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const config = this.monitorData.get(interaction.guild.id) || {
            enabled: false,
            alerts: true,
            autoReport: false,
            trackStats: true
        };
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('⚙️ MONITORING CONFIGURATION')
            .setDescription('Current monitoring settings for this server')
            .addFields(
                { name: '🔧 Status', value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '🔔 Alerts', value: config.alerts ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '📊 Auto-report', value: config.autoReport ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '📈 Stats Tracking', value: config.trackStats ? '✅ Enabled' : '❌ Disabled', inline: true }
            )
            .setFooter({ text: 'Use /setup_monitor to enable monitoring' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }

    generateRecommendations(stats) {
        const recommendations = [];
        
        if (stats.members.onlinePercent < 20) {
            recommendations.push('• Consider hosting events to increase engagement');
        }
        
        if (stats.roles.count > 30) {
            recommendations.push('• Clean up unused roles to reduce clutter');
        }
        
        if (stats.bot.ping > 200) {
            recommendations.push('• Consider hosting the bot on a better server');
        }
        
        if (stats.boosts === 0) {
            recommendations.push('• Consider boosting the server for better features');
        }
        
        if (stats.bot.memory.percent > 70) {
            recommendations.push('• Bot memory usage is high, consider optimization');
        }
        
        return recommendations.length > 0 ? recommendations.join('\n') : '✅ Server is performing optimally!';
    }

    // ==================== STATIC METHODS ====================

    static getCommands() {
        const { SlashCommandBuilder, ChannelType } = require('discord.js');
        
        return [
            new SlashCommandBuilder()
                .setName('setup_monitor')
                .setDescription('[ADMIN] Setup real-time server monitoring')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for monitoring updates')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('style')
                        .setDescription('Monitoring display style')
                        .addChoices(
                            { name: 'Default (Detailed)', value: 'default' },
                            { name: 'Compact Dashboard', value: 'compact' }
                        )
                        .setRequired(false)),
            
            new SlashCommandBuilder()
                .setName('disable_monitor')
                .setDescription('[ADMIN] Disable server monitoring'),
            
            new SlashCommandBuilder()
                .setName('server_stats')
                .setDescription('Get real-time server statistics'),
            
            new SlashCommandBuilder()
                .setName('monitor_style')
                .setDescription('[ADMIN] Customize monitoring display style')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Custom title for monitoring embeds')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('footer')
                        .setDescription('Custom footer text')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('image_url')
                        .setDescription('Custom image URL for embeds')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color (hex code, e.g. #1E90FF)')
                        .setRequired(false))
        ];
    }

    static async handleCommand(interaction, monitor) {
        const { commandName } = interaction;
        
        switch (commandName) {
            case 'setup_monitor':
                await monitor.handleSetupMonitor(interaction);
                break;
            case 'disable_monitor':
                await monitor.handleDisableMonitor(interaction);
                break;
            case 'server_stats':
                await monitor.handleStats(interaction);
                break;
            case 'monitor_style':
                await monitor.handleMonitorStyle(interaction);
                break;
        }
    }
}

module.exports = ServerMonitor;
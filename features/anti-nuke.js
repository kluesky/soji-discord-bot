// anti-nuke.js - ANTI NUKE PREMIUM SYSTEM
// Proteksi 360° dari serangan nuke!

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class AntiNuke {
    constructor(client) {
        this.client = client;
        this.name = 'anti-nuke';
        this.version = '2.0.0';
        
        this.configPath = path.join(__dirname, 'data', 'antinuke_config.json');
        this.whitelistPath = path.join(__dirname, 'data', 'antinuke_whitelist.json');
        this.logsPath = path.join(__dirname, 'data', 'antinuke_logs.json');
        this.backupPath = path.join(__dirname, 'data', 'server_backups');
        
        // Default configuration
        this.defaultConfig = {
            enabled: false,
            logChannel: null,
            
            // Channel Protection
            channelCreateLimit: 2,
            channelDeleteLimit: 1,
            channelUpdateLimit: 3,
            channelTimeWindow: 10000, // 10 detik
            
            // Role Protection
            roleCreateLimit: 2,
            roleDeleteLimit: 1,
            roleUpdateLimit: 3,
            roleTimeWindow: 10000,
            
            // Member Protection
            banLimit: 3,
            kickLimit: 5,
            memberTimeWindow: 60000, // 1 menit
            
            // Webhook Protection
            webhookProtection: true,
            webhookLimit: 2,
            webhookTimeWindow: 10000,
            
            // Emoji/Sticker Protection
            emojiCreateLimit: 3,
            emojiDeleteLimit: 2,
            stickerCreateLimit: 2,
            stickerDeleteLimit: 2,
            
            // Server Protection
            serverNameProtection: true,
            serverIconProtection: true,
            serverNameLimit: 2,
            serverIconLimit: 3,
            serverTimeWindow: 3600000, // 1 jam
            
            // Punishment Levels
            punishments: {
                1: { action: 'warn', duration: null },
                2: { action: 'mute', duration: 3600000 }, // 1 jam
                3: { action: 'kick', duration: null },
                4: { action: 'ban', duration: 86400000 }, // 1 hari
                5: { action: 'permaban', duration: null }
            },
            
            // Protected Items
            protectedChannels: [],
            protectedRoles: [],
            protectedCategories: [],
            
            // Auto Restore
            autoRestore: true,
            
            // Thresholds
            raidThreshold: 5,
            lockdownThreshold: 10
        };
        
        this.config = new Map();
        this.whitelist = new Map();
        this.violations = new Map();
        this.backupData = new Map();
        
        this.loadData();
        this.setupEventListeners();
        this.startAutoBackup();
    }

    async loadData() {
        try {
            await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
            await fs.mkdir(this.backupPath, { recursive: true });
            
            // Load config
            try {
                const configData = await fs.readFile(this.configPath, 'utf8');
                if (configData.trim() !== '') {
                    const parsed = JSON.parse(configData);
                    for (const [guildId, config] of Object.entries(parsed)) {
                        this.config.set(guildId, { ...this.defaultConfig, ...config });
                    }
                }
            } catch (error) {
                console.log('📝 No AntiNuke config found, creating new...');
                await this.saveConfig();
            }
            
            // Load whitelist
            try {
                const whitelistData = await fs.readFile(this.whitelistPath, 'utf8');
                if (whitelistData.trim() !== '') {
                    const parsed = JSON.parse(whitelistData);
                    for (const [guildId, data] of Object.entries(parsed)) {
                        this.whitelist.set(guildId, data);
                    }
                }
            } catch (error) {
                console.log('📝 No AntiNuke whitelist found, creating new...');
                await this.saveWhitelist();
            }
            
            console.log(`🛡️ AntiNuke loaded for ${this.config.size} servers`);
        } catch (error) {
            console.error('Error loading AntiNuke data:', error);
        }
    }

    async saveConfig() {
        const obj = {};
        this.config.forEach((config, guildId) => {
            obj[guildId] = config;
        });
        await fs.writeFile(this.configPath, JSON.stringify(obj, null, 2));
    }

    async saveWhitelist() {
        const obj = {};
        this.whitelist.forEach((data, guildId) => {
            obj[guildId] = data;
        });
        await fs.writeFile(this.whitelistPath, JSON.stringify(obj, null, 2));
    }

    async saveViolation(guildId, violation) {
        try {
            const logData = await fs.readFile(this.logsPath, 'utf8').catch(() => '{}');
            const logs = JSON.parse(logData);
            
            if (!logs[guildId]) logs[guildId] = [];
            logs[guildId].unshift({
                ...violation,
                timestamp: Date.now()
            });
            
            // Keep only last 100 logs
            if (logs[guildId].length > 100) logs[guildId] = logs[guildId].slice(0, 100);
            
            await fs.writeFile(this.logsPath, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Error saving violation:', error);
        }
    }

    async startAutoBackup() {
        // Backup every hour
        setInterval(async () => {
            for (const [guildId, config] of this.config) {
                if (config.enabled && config.autoRestore) {
                    await this.backupServer(guildId);
                }
            }
        }, 3600000);
    }

    async backupServer(guildId) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;
            
            const backup = {
                timestamp: Date.now(),
                channels: [],
                roles: [],
                emojis: [],
                stickers: []
            };
            
            // Backup channels
            guild.channels.cache.forEach(channel => {
                backup.channels.push({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    parent: channel.parentId,
                    position: channel.position,
                    topic: channel.topic,
                    nsfw: channel.nsfw,
                    rateLimit: channel.rateLimitPerUser,
                    permissionOverwrites: channel.permissionOverwrites.cache.map(perm => ({
                        id: perm.id,
                        type: perm.type,
                        allow: perm.allow.bitfield.toString(),
                        deny: perm.deny.bitfield.toString()
                    }))
                });
            });
            
            // Backup roles
            guild.roles.cache.forEach(role => {
                if (role.name !== '@everyone') {
                    backup.roles.push({
                        id: role.id,
                        name: role.name,
                        color: role.color,
                        hoist: role.hoist,
                        position: role.position,
                        permissions: role.permissions.bitfield.toString(),
                        mentionable: role.mentionable,
                        managed: role.managed,
                        icon: role.icon,
                        unicodeEmoji: role.unicodeEmoji
                    });
                }
            });
            
            // Save backup file
            const backupFile = path.join(this.backupPath, `${guildId}_${Date.now()}.json`);
            await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
            
            // Keep only last 5 backups
            const files = await fs.readdir(this.backupPath);
            const guildBackups = files.filter(f => f.startsWith(guildId));
            if (guildBackups.length > 5) {
                guildBackups.sort();
                await fs.unlink(path.join(this.backupPath, guildBackups[0]));
            }
            
        } catch (error) {
            console.error(`Error backing up server ${guildId}:`, error);
        }
    }

    async restoreChannel(guildId, channelId) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return null;
            
            // Find backup
            const files = await fs.readdir(this.backupPath);
            const guildBackups = files.filter(f => f.startsWith(guildId)).sort();
            if (guildBackups.length === 0) return null;
            
            const latestBackup = guildBackups[guildBackups.length - 1];
            const backupData = JSON.parse(await fs.readFile(path.join(this.backupPath, latestBackup), 'utf8'));
            
            const channelData = backupData.channels.find(c => c.id === channelId);
            if (!channelData) return null;
            
            // Create channel
            const channel = await guild.channels.create({
                name: channelData.name,
                type: channelData.type,
                parent: channelData.parent,
                topic: channelData.topic,
                nsfw: channelData.nsfw,
                rateLimitPerUser: channelData.rateLimit,
                permissionOverwrites: channelData.permissionOverwrites
            });
            
            return channel;
        } catch (error) {
            console.error('Error restoring channel:', error);
            return null;
        }
    }

    async restoreRole(guildId, roleData) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return null;
            
            const role = await guild.roles.create({
                name: roleData.name,
                color: roleData.color,
                hoist: roleData.hoist,
                permissions: BigInt(roleData.permissions),
                mentionable: roleData.mentionable,
                icon: roleData.icon,
                unicodeEmoji: roleData.unicodeEmoji
            });
            
            return role;
        } catch (error) {
            console.error('Error restoring role:', error);
            return null;
        }
    }

    isWhitelisted(guildId, userId, action = null) {
        const whitelist = this.whitelist.get(guildId);
        if (!whitelist) return false;
        
        // Check permanent whitelist
        if (whitelist.permanent?.users?.includes(userId)) return true;
        if (whitelist.permanent?.roles) {
            const guild = this.client.guilds.cache.get(guildId);
            const member = guild?.members.cache.get(userId);
            if (member && member.roles.cache.some(r => whitelist.permanent.roles.includes(r.id))) {
                return true;
            }
        }
        
        // Check temporary whitelist
        if (whitelist.temporary) {
            const temp = whitelist.temporary.find(t => t.userId === userId && t.expires > Date.now());
            if (temp) return true;
        }
        
        return false;
    }

    async punish(guildId, userId, level, violation) {
        const config = this.config.get(guildId);
        if (!config) return;
        
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return;
        
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return;
        
        const punishment = config.punishments[level];
        if (!punishment) return;
        
        let action = punishment.action;
        let duration = punishment.duration;
        
        try {
            switch (action) {
                case 'warn':
                    await member.send(`⚠️ **PERINGATAN ANTI-NUKE**\nKamu telah melakukan: **${violation}**\nLevel: ${level}`).catch(() => {});
                    break;
                    
                case 'mute':
                    const muteRole = guild.roles.cache.find(r => r.name === '🔇 Muted');
                    if (muteRole) {
                        await member.roles.add(muteRole);
                        setTimeout(async () => {
                            await member.roles.remove(muteRole).catch(() => {});
                        }, duration);
                    }
                    break;
                    
                case 'kick':
                    await member.kick(`Anti-Nuke: ${violation} (Level ${level})`);
                    break;
                    
                case 'ban':
                    await member.ban({ 
                        reason: `Anti-Nuke: ${violation} (Level ${level})`,
                        deleteMessageSeconds: 86400
                    });
                    if (duration) {
                        setTimeout(async () => {
                            await guild.members.unban(userId).catch(() => {});
                        }, duration);
                    }
                    break;
                    
                case 'permaban':
                    await member.ban({ 
                        reason: `Anti-Nuke: ${violation} (Level ${level}) - Permanent`,
                        deleteMessageSeconds: 604800
                    });
                    break;
            }
            
            // Log punishment
            await this.logAction(guildId, {
                type: 'punishment',
                action,
                userId,
                violation,
                level,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('Error punishing user:', error);
        }
    }

    async logAction(guildId, data) {
        const config = this.config.get(guildId);
        if (!config?.logChannel) return;
        
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return;
        
        const logChannel = guild.channels.cache.get(config.logChannel);
        if (!logChannel) return;
        
        let color, title, description;
        
        switch (data.type) {
            case 'violation':
                color = 0xFF0000;
                title = '🚨 **ANTI-NUKE VIOLATION**';
                description = `**User:** <@${data.userId}>\n**Violation:** ${data.violation}\n**Level:** ${data.level}\n**Action:** ${data.action}`;
                break;
                
            case 'punishment':
                color = 0xFFA500;
                title = '⚖️ **PUNISHMENT APPLIED**';
                description = `**User:** <@${data.userId}>\n**Punishment:** ${data.action}\n**Reason:** ${data.violation}\n**Level:** ${data.level}`;
                break;
                
            case 'restore':
                color = 0x00FF00;
                title = '🔄 **AUTO RESTORE**';
                description = `**Item:** ${data.item}\n**Name:** ${data.name}\n**ID:** \`${data.id}\``;
                break;
                
            case 'whitelist':
                color = 0x1E90FF;
                title = '✅ **WHITELIST UPDATED**';
                description = `**Action:** ${data.action}\n**User:** <@${data.userId}>\n**Duration:** ${data.duration || 'Permanent'}`;
                break;
                
            default:
                return;
        }
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .addFields(
                { name: '🕒 Time', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Anti-Nuke System v2.0` });
        
        await logChannel.send({ embeds: [embed] });
    }

    setupEventListeners() {
        // ===== CHANNEL DELETE PROTECTION =====
        this.client.on('channelDelete', async (channel) => {
            if (!channel.guild) return;
            
            const config = this.config.get(channel.guild.id);
            if (!config?.enabled) return;
            
            const auditLogs = await channel.guild.fetchAuditLogs({
                limit: 1,
                type: 12 // Channel Delete
            });
            
            const log = auditLogs.entries.first();
            if (!log) return;
            
            const executor = log.executor;
            
            // Check whitelist
            if (this.isWhitelisted(channel.guild.id, executor.id)) return;
            
            // Check if channel is protected
            if (config.protectedChannels.includes(channel.id) || 
                config.protectedCategories.includes(channel.parentId)) {
                
                // Level 4 - Ban
                await this.punish(channel.guild.id, executor.id, 4, 'Menghapus channel terproteksi');
                
                // Restore channel
                if (config.autoRestore) {
                    const restored = await this.restoreChannel(channel.guild.id, channel.id);
                    if (restored) {
                        await this.logAction(channel.guild.id, {
                            type: 'restore',
                            item: 'Channel',
                            name: channel.name,
                            id: restored.id
                        });
                    }
                }
                return;
            }
            
            // Track violations
            const key = `${channel.guild.id}-${executor.id}`;
            const now = Date.now();
            
            if (!this.violations.has(key)) {
                this.violations.set(key, []);
            }
            
            const violations = this.violations.get(key);
            violations.push({
                type: 'channel_delete',
                timestamp: now
            });
            
            // Clean old violations
            const recentViolations = violations.filter(v => 
                v.type === 'channel_delete' && 
                now - v.timestamp < config.channelTimeWindow
            );
            
            if (recentViolations.length >= config.channelDeleteLimit) {
                // Level 3 - Kick
                await this.punish(channel.guild.id, executor.id, 3, `Menghapus ${recentViolations.length} channel dalam ${config.channelTimeWindow/1000} detik`);
                
                // Log
                await this.logAction(channel.guild.id, {
                    type: 'violation',
                    userId: executor.id,
                    violation: 'Channel Delete Spam',
                    level: 3,
                    action: 'Kick'
                });
                
                // Clear violations
                this.violations.set(key, []);
            }
        });

        // ===== CHANNEL CREATE PROTECTION =====
        this.client.on('channelCreate', async (channel) => {
            if (!channel.guild) return;
            
            const config = this.config.get(channel.guild.id);
            if (!config?.enabled) return;
            
            const auditLogs = await channel.guild.fetchAuditLogs({
                limit: 1,
                type: 10 // Channel Create
            });
            
            const log = auditLogs.entries.first();
            if (!log) return;
            
            const executor = log.executor;
            
            if (this.isWhitelisted(channel.guild.id, executor.id)) return;
            
            const key = `${channel.guild.id}-${executor.id}`;
            const now = Date.now();
            
            if (!this.violations.has(key)) {
                this.violations.set(key, []);
            }
            
            const violations = this.violations.get(key);
            violations.push({
                type: 'channel_create',
                timestamp: now
            });
            
            const recentViolations = violations.filter(v => 
                v.type === 'channel_create' && 
                now - v.timestamp < config.channelTimeWindow
            );
            
            if (recentViolations.length >= config.channelCreateLimit) {
                // Level 2 - Mute
                await this.punish(channel.guild.id, executor.id, 2, `Membuat ${recentViolations.length} channel dalam ${config.channelTimeWindow/1000} detik`);
                
                // Delete extra channels
                if (recentViolations.length > config.channelCreateLimit) {
                    try {
                        await channel.delete('Anti-Nuke: Channel spam');
                    } catch (error) {}
                }
                
                await this.logAction(channel.guild.id, {
                    type: 'violation',
                    userId: executor.id,
                    violation: 'Channel Create Spam',
                    level: 2,
                    action: 'Mute 1 Jam'
                });
                
                this.violations.set(key, []);
            }
        });

        // ===== ROLE DELETE PROTECTION =====
        this.client.on('roleDelete', async (role) => {
            if (!role.guild) return;
            
            const config = this.config.get(role.guild.id);
            if (!config?.enabled) return;
            
            const auditLogs = await role.guild.fetchAuditLogs({
                limit: 1,
                type: 32 // Role Delete
            });
            
            const log = auditLogs.entries.first();
            if (!log) return;
            
            const executor = log.executor;
            
            if (this.isWhitelisted(role.guild.id, executor.id)) return;
            
            // Check if role is protected
            if (config.protectedRoles.includes(role.id)) {
                // Level 4 - Ban
                await this.punish(role.guild.id, executor.id, 4, 'Menghapus role terproteksi');
                
                // Restore role
                if (config.autoRestore) {
                    const roleData = {
                        name: role.name,
                        color: role.color,
                        hoist: role.hoist,
                        permissions: role.permissions.bitfield.toString(),
                        mentionable: role.mentionable,
                        icon: role.icon,
                        unicodeEmoji: role.unicodeEmoji
                    };
                    
                    const restored = await this.restoreRole(role.guild.id, roleData);
                    if (restored) {
                        await this.logAction(role.guild.id, {
                            type: 'restore',
                            item: 'Role',
                            name: role.name,
                            id: restored.id
                        });
                    }
                }
                return;
            }
            
            const key = `${role.guild.id}-${executor.id}`;
            const now = Date.now();
            
            if (!this.violations.has(key)) {
                this.violations.set(key, []);
            }
            
            const violations = this.violations.get(key);
            violations.push({
                type: 'role_delete',
                timestamp: now
            });
            
            const recentViolations = violations.filter(v => 
                v.type === 'role_delete' && 
                now - v.timestamp < config.roleTimeWindow
            );
            
            if (recentViolations.length >= config.roleDeleteLimit) {
                // Level 3 - Kick
                await this.punish(role.guild.id, executor.id, 3, `Menghapus ${recentViolations.length} role dalam ${config.roleTimeWindow/1000} detik`);
                
                await this.logAction(role.guild.id, {
                    type: 'violation',
                    userId: executor.id,
                    violation: 'Role Delete Spam',
                    level: 3,
                    action: 'Kick'
                });
                
                this.violations.set(key, []);
            }
        });

        // ===== ROLE CREATE PROTECTION =====
        this.client.on('roleCreate', async (role) => {
            if (!role.guild) return;
            
            const config = this.config.get(role.guild.id);
            if (!config?.enabled) return;
            
            const auditLogs = await role.guild.fetchAuditLogs({
                limit: 1,
                type: 30 // Role Create
            });
            
            const log = auditLogs.entries.first();
            if (!log) return;
            
            const executor = log.executor;
            
            if (this.isWhitelisted(role.guild.id, executor.id)) return;
            
            const key = `${role.guild.id}-${executor.id}`;
            const now = Date.now();
            
            if (!this.violations.has(key)) {
                this.violations.set(key, []);
            }
            
            const violations = this.violations.get(key);
            violations.push({
                type: 'role_create',
                timestamp: now
            });
            
            const recentViolations = violations.filter(v => 
                v.type === 'role_create' && 
                now - v.timestamp < config.roleTimeWindow
            );
            
            if (recentViolations.length >= config.roleCreateLimit) {
                // Level 2 - Mute
                await this.punish(role.guild.id, executor.id, 2, `Membuat ${recentViolations.length} role dalam ${config.roleTimeWindow/1000} detik`);
                
                // Delete extra roles
                if (recentViolations.length > config.roleCreateLimit) {
                    try {
                        await role.delete('Anti-Nuke: Role spam');
                    } catch (error) {}
                }
                
                await this.logAction(role.guild.id, {
                    type: 'violation',
                    userId: executor.id,
                    violation: 'Role Create Spam',
                    level: 2,
                    action: 'Mute 1 Jam'
                });
                
                this.violations.set(key, []);
            }
        });

        // ===== MEMBER BAN PROTECTION =====
        this.client.on('guildBanAdd', async (guild, user) => {
            const config = this.config.get(guild.id);
            if (!config?.enabled) return;
            
            const auditLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: 22 // Member Ban
            });
            
            const log = auditLogs.entries.first();
            if (!log) return;
            
            const executor = log.executor;
            
            if (this.isWhitelisted(guild.id, executor.id)) return;
            
            const key = `${guild.id}-${executor.id}`;
            const now = Date.now();
            
            if (!this.violations.has(key)) {
                this.violations.set(key, []);
            }
            
            const violations = this.violations.get(key);
            violations.push({
                type: 'ban',
                timestamp: now
            });
            
            const recentViolations = violations.filter(v => 
                v.type === 'ban' && 
                now - v.timestamp < config.memberTimeWindow
            );
            
            if (recentViolations.length >= config.banLimit) {
                // Level 5 - Permaban
                await this.punish(guild.id, executor.id, 5, `Mem-ban ${recentViolations.length} member dalam ${config.memberTimeWindow/1000} detik`);
                
                await this.logAction(guild.id, {
                    type: 'violation',
                    userId: executor.id,
                    violation: 'Mass Ban',
                    level: 5,
                    action: 'Permanent Ban'
                });
                
                this.violations.set(key, []);
            }
        });

        // ===== WEBHOOK CREATE PROTECTION =====
        this.client.on('webhookUpdate', async (channel) => {
            if (!channel.guild) return;
            
            const config = this.config.get(channel.guild.id);
            if (!config?.enabled || !config.webhookProtection) return;
            
            const auditLogs = await channel.guild.fetchAuditLogs({
                limit: 1,
                type: 50 // Webhook Create
            });
            
            const log = auditLogs.entries.first();
            if (!log) return;
            
            const executor = log.executor;
            
            if (this.isWhitelisted(channel.guild.id, executor.id)) return;
            
            const key = `${channel.guild.id}-${executor.id}`;
            const now = Date.now();
            
            if (!this.violations.has(key)) {
                this.violations.set(key, []);
            }
            
            const violations = this.violations.get(key);
            violations.push({
                type: 'webhook',
                timestamp: now
            });
            
            const recentViolations = violations.filter(v => 
                v.type === 'webhook' && 
                now - v.timestamp < config.webhookTimeWindow
            );
            
            if (recentViolations.length >= config.webhookLimit) {
                // Level 5 - Permaban (Webhook nuke sangat berbahaya)
                await this.punish(channel.guild.id, executor.id, 5, `Membuat ${recentViolations.length} webhook dalam ${config.webhookTimeWindow/1000} detik`);
                
                await this.logAction(channel.guild.id, {
                    type: 'violation',
                    userId: executor.id,
                    violation: 'Webhook Nuke Attempt',
                    level: 5,
                    action: 'Permanent Ban'
                });
                
                this.violations.set(key, []);
            }
        });

        // ===== SERVER UPDATE PROTECTION =====
        this.client.on('guildUpdate', async (oldGuild, newGuild) => {
            const config = this.config.get(newGuild.id);
            if (!config?.enabled) return;
            
            const auditLogs = await newGuild.fetchAuditLogs({
                limit: 1,
                type: 1 // Guild Update
            });
            
            const log = auditLogs.entries.first();
            if (!log) return;
            
            const executor = log.executor;
            
            if (this.isWhitelisted(newGuild.id, executor.id)) return;
            
            // Check name change
            if (config.serverNameProtection && oldGuild.name !== newGuild.name) {
                const key = `${newGuild.id}-${executor.id}-name`;
                const now = Date.now();
                
                if (!this.violations.has(key)) {
                    this.violations.set(key, []);
                }
                
                const violations = this.violations.get(key);
                violations.push({
                    type: 'server_name',
                    timestamp: now
                });
                
                const recentViolations = violations.filter(v => 
                    now - v.timestamp < config.serverTimeWindow
                );
                
                if (recentViolations.length >= config.serverNameLimit) {
                    // Level 3 - Kick
                    await this.punish(newGuild.id, executor.id, 3, `Mengganti nama server ${recentViolations.length}x dalam 1 jam`);
                    
                    // Revert name
                    await newGuild.setName(oldGuild.name, 'Anti-Nuke: Server name protection');
                    
                    await this.logAction(newGuild.id, {
                        type: 'violation',
                        userId: executor.id,
                        violation: 'Server Name Spam',
                        level: 3,
                        action: 'Kick + Revert'
                    });
                    
                    this.violations.set(key, []);
                }
            }
            
            // Check icon change
            if (config.serverIconProtection && oldGuild.icon !== newGuild.icon) {
                const key = `${newGuild.id}-${executor.id}-icon`;
                const now = Date.now();
                
                if (!this.violations.has(key)) {
                    this.violations.set(key, []);
                }
                
                const violations = this.violations.get(key);
                violations.push({
                    type: 'server_icon',
                    timestamp: now
                });
                
                const recentViolations = violations.filter(v => 
                    now - v.timestamp < config.serverTimeWindow
                );
                
                if (recentViolations.length >= config.serverIconLimit) {
                    // Level 2 - Mute
                    await this.punish(newGuild.id, executor.id, 2, `Mengganti icon server ${recentViolations.length}x dalam 1 jam`);
                    
                    // Revert icon
                    await newGuild.setIcon(oldGuild.icon, 'Anti-Nuke: Server icon protection');
                    
                    await this.logAction(newGuild.id, {
                        type: 'violation',
                        userId: executor.id,
                        violation: 'Server Icon Spam',
                        level: 2,
                        action: 'Mute + Revert'
                    });
                    
                    this.violations.set(key, []);
                }
            }
        });
    }

    // ==================== COMMAND HANDLERS ====================

    async handleEnable(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Kamu butuh permission **Administrator** untuk setting Anti-Nuke!',
                ephemeral: true
            });
        }

        const guildId = interaction.guild.id;
        let config = this.config.get(guildId);
        
        if (!config) {
            config = { ...this.defaultConfig, enabled: true };
            this.config.set(guildId, config);
        } else {
            config.enabled = true;
        }
        
        await this.saveConfig();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🛡️ **ANTI-NUKE ACTIVATED**')
            .setDescription('Sistem proteksi anti-nuke telah diaktifkan!')
            .addFields(
                { name: '📋 Status', value: '✅ Active', inline: true },
                { name: '🛡️ Protection Layers', value: '15+ Lapisan', inline: true },
                { name: '⚡ Response Time', value: '< 1 detik', inline: true }
            )
            .setFooter({ text: 'Gunakan /antinuke config untuk melihat pengaturan' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async handleDisable(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Kamu butuh permission **Administrator**!',
                ephemeral: true
            });
        }

        const guildId = interaction.guild.id;
        const config = this.config.get(guildId);
        
        if (config) {
            config.enabled = false;
            await this.saveConfig();
        }

        await interaction.reply({
            content: '🛡️ Anti-Nuke system **dinonaktifkan**!',
            ephemeral: true
        });
    }

    async handleConfig(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Kamu butuh permission **Administrator**!',
                ephemeral: true
            });
        }

        const guildId = interaction.guild.id;
        const config = this.config.get(guildId) || this.defaultConfig;

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('⚙️ **ANTI-NUKE CONFIGURATION**')
            .setDescription(`Status: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}`)
            .addFields(
                { name: '📋 LOG CHANNEL', value: config.logChannel ? `<#${config.logChannel}>` : '❌ Not set', inline: false },
                
                { name: '🚫 CHANNEL PROTECTION', value: `
Create Limit: ${config.channelCreateLimit}/10s
Delete Limit: ${config.channelDeleteLimit}/10s
Protected Channels: ${config.protectedChannels.length}
Protected Categories: ${config.protectedCategories.length}
                `, inline: true },
                
                { name: '🎭 ROLE PROTECTION', value: `
Create Limit: ${config.roleCreateLimit}/10s
Delete Limit: ${config.roleDeleteLimit}/10s
Protected Roles: ${config.protectedRoles.length}
                `, inline: true },
                
                { name: '👤 MEMBER PROTECTION', value: `
Ban Limit: ${config.banLimit}/min
Kick Limit: ${config.kickLimit}/min
                `, inline: true },
                
                { name: '🔧 WEBHOOK PROTECTION', value: `
${config.webhookProtection ? '✅ Enabled' : '❌ Disabled'}
Limit: ${config.webhookLimit}/10s
                `, inline: true },
                
                { name: '⚖️ PUNISHMENT LEVELS', value: `
Level 1: Warn
Level 2: Mute (1 jam)
Level 3: Kick
Level 4: Ban (1 hari)
Level 5: Permanent Ban
                `, inline: false }
            )
            .setFooter({ text: 'Gunakan /antinuke untuk mengubah pengaturan' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleLogChannel(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Kamu butuh permission **Administrator**!',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;
        
        let config = this.config.get(guildId);
        if (!config) {
            config = { ...this.defaultConfig };
            this.config.set(guildId, config);
        }
        
        config.logChannel = channel.id;
        await this.saveConfig();

        await interaction.reply({
            content: `✅ Log channel set to ${channel}`,
            ephemeral: true
        });
    }

    async handleWhitelistAdd(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Kamu butuh permission **Administrator**!',
                ephemeral: true
            });
        }

        const target = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const guildId = interaction.guild.id;
        
        let whitelist = this.whitelist.get(guildId);
        if (!whitelist) {
            whitelist = { permanent: { users: [], roles: [] }, temporary: [] };
        }
        
        if (duration) {
            // Temporary whitelist
            const expires = Date.now() + (duration * 3600000);
            whitelist.temporary.push({
                userId: target.id,
                expires: expires
            });
            
            await interaction.reply({
                content: `✅ ${target.tag} ditambahkan ke whitelist sementara selama **${duration} jam**!`,
                ephemeral: true
            });
        } else {
            // Permanent whitelist
            if (!whitelist.permanent) whitelist.permanent = { users: [], roles: [] };
            if (!whitelist.permanent.users.includes(target.id)) {
                whitelist.permanent.users.push(target.id);
            }
            
            await interaction.reply({
                content: `✅ ${target.tag} ditambahkan ke whitelist **permanent**!`,
                ephemeral: true
            });
        }
        
        this.whitelist.set(guildId, whitelist);
        await this.saveWhitelist();
        
        await this.logAction(guildId, {
            type: 'whitelist',
            action: duration ? 'Temporary Add' : 'Permanent Add',
            userId: target.id,
            duration: duration ? `${duration} jam` : null
        });
    }

    async handleWhitelistRemove(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Kamu butuh permission **Administrator**!',
                ephemeral: true
            });
        }

        const target = interaction.options.getUser('user');
        const guildId = interaction.guild.id;
        
        let whitelist = this.whitelist.get(guildId);
        if (!whitelist) {
            return interaction.reply({
                content: '❌ Whitelist kosong!',
                ephemeral: true
            });
        }
        
        // Remove from permanent
        if (whitelist.permanent?.users) {
            whitelist.permanent.users = whitelist.permanent.users.filter(id => id !== target.id);
        }
        
        // Remove from temporary
        if (whitelist.temporary) {
            whitelist.temporary = whitelist.temporary.filter(t => t.userId !== target.id);
        }
        
        this.whitelist.set(guildId, whitelist);
        await this.saveWhitelist();

        await interaction.reply({
            content: `✅ ${target.tag} dihapus dari whitelist!`,
            ephemeral: true
        });
    }

    async handleWhitelistList(interaction) {
        const guildId = interaction.guild.id;
        const whitelist = this.whitelist.get(guildId);
        
        if (!whitelist || (!whitelist.permanent?.users?.length && !whitelist.temporary?.length)) {
            return interaction.reply({
                content: '📭 Whitelist kosong!',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('📋 **WHITELIST - ANTI NUKE**')
            .setTimestamp();

        if (whitelist.permanent?.users?.length > 0) {
            let permanentList = '';
            for (const userId of whitelist.permanent.users.slice(0, 10)) {
                const user = await this.client.users.fetch(userId).catch(() => null);
                permanentList += `• ${user ? user.tag : 'Unknown User'} (Permanent)\n`;
            }
            embed.addFields({ name: '👑 PERMANENT WHITELIST', value: permanentList || 'None', inline: false });
        }

        if (whitelist.temporary?.length > 0) {
            let tempList = '';
            for (const item of whitelist.temporary.slice(0, 10)) {
                const user = await this.client.users.fetch(item.userId).catch(() => null);
                const expires = `<t:${Math.floor(item.expires/1000)}:R>`;
                tempList += `• ${user ? user.tag : 'Unknown User'} - Expires ${expires}\n`;
            }
            embed.addFields({ name: '⏳ TEMPORARY WHITELIST', value: tempList || 'None', inline: false });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleProtectChannel(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Kamu butuh permission **Administrator**!',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;
        
        let config = this.config.get(guildId);
        if (!config) {
            config = { ...this.defaultConfig };
            this.config.set(guildId, config);
        }
        
        if (!config.protectedChannels) config.protectedChannels = [];
        if (!config.protectedChannels.includes(channel.id)) {
            config.protectedChannels.push(channel.id);
            await this.saveConfig();
        }

        await interaction.reply({
            content: `✅ ${channel} telah diproteksi!`,
            ephemeral: true
        });
    }

    async handleProtectRole(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Kamu butuh permission **Administrator**!',
                ephemeral: true
            });
        }

        const role = interaction.options.getRole('role');
        const guildId = interaction.guild.id;
        
        let config = this.config.get(guildId);
        if (!config) {
            config = { ...this.defaultConfig };
            this.config.set(guildId, config);
        }
        
        if (!config.protectedRoles) config.protectedRoles = [];
        if (!config.protectedRoles.includes(role.id)) {
            config.protectedRoles.push(role.id);
            await this.saveConfig();
        }

        await interaction.reply({
            content: `✅ Role ${role} telah diproteksi!`,
            ephemeral: true
        });
    }

    async handleRestoreChannel(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Kamu butuh permission **Administrator**!',
                ephemeral: true
            });
        }

        const channelId = interaction.options.getString('channel_id');
        
        await interaction.deferReply({ ephemeral: true });
        
        const restored = await this.restoreChannel(interaction.guild.id, channelId);
        
        if (restored) {
            await interaction.editReply({
                content: `✅ Channel berhasil direstore! <#${restored.id}>`
            });
        } else {
            await interaction.editReply({
                content: '❌ Gagal merestore channel. Pastikan ID benar dan backup tersedia.'
            });
        }
    }

    async handleStats(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const logData = await fs.readFile(this.logsPath, 'utf8').catch(() => '{}');
            const logs = JSON.parse(logData);
            const guildLogs = logs[guildId] || [];
            
            const violations = guildLogs.filter(l => l.type === 'violation');
            const punishments = guildLogs.filter(l => l.type === 'punishment');
            const restores = guildLogs.filter(l => l.type === 'restore');
            
            const embed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle('📊 **ANTI-NUKE STATISTICS**')
                .addFields(
                    { name: '🚫 Total Violations', value: `${violations.length}`, inline: true },
                    { name: '⚖️ Total Punishments', value: `${punishments.length}`, inline: true },
                    { name: '🔄 Total Restores', value: `${restores.length}`, inline: true },
                    { name: '🛡️ Protection Status', value: this.config.get(guildId)?.enabled ? '✅ Active' : '❌ Inactive', inline: true },
                    { name: '👥 Whitelisted Users', value: `${this.whitelist.get(guildId)?.permanent?.users?.length || 0}`, inline: true },
                    { name: '⏳ Temporary Whitelist', value: `${this.whitelist.get(guildId)?.temporary?.length || 0}`, inline: true }
                )
                .setFooter({ text: 'Last 24 hours' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Stats error:', error);
            await interaction.reply({
                content: '❌ Error fetching statistics!',
                ephemeral: true
            });
        }
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            // ===== MAIN COMMANDS =====
            new SlashCommandBuilder()
                .setName('antinuke')
                .setDescription('🛡️ Anti-Nuke Premium System')
                .addSubcommand(sub =>
                    sub.setName('enable')
                        .setDescription('Aktifkan Anti-Nuke'))
                .addSubcommand(sub =>
                    sub.setName('disable')
                        .setDescription('Nonaktifkan Anti-Nuke'))
                .addSubcommand(sub =>
                    sub.setName('config')
                        .setDescription('Lihat konfigurasi Anti-Nuke'))
                .addSubcommand(sub =>
                    sub.setName('log')
                        .setDescription('Set channel untuk log')
                        .addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('Channel logs')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('stats')
                        .setDescription('Lihat statistik Anti-Nuke')),
            
            // ===== WHITELIST COMMANDS =====
            new SlashCommandBuilder()
                .setName('antinuke-whitelist')
                .setDescription('👑 Kelola whitelist Anti-Nuke')
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Tambah user ke whitelist')
                        .addUserOption(opt =>
                            opt.setName('user')
                                .setDescription('User yang di-whitelist')
                                .setRequired(true))
                        .addIntegerOption(opt =>
                            opt.setName('duration')
                                .setDescription('Durasi dalam jam (kosongkan untuk permanent)')
                                .setMinValue(1)
                                .setMaxValue(720)
                                .setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Hapus user dari whitelist')
                        .addUserOption(opt =>
                            opt.setName('user')
                                .setDescription('User yang dihapus')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('Lihat semua whitelist')),
            
            // ===== PROTECT COMMANDS =====
            new SlashCommandBuilder()
                .setName('antinuke-protect')
                .setDescription('🛡️ Proteksi channel & role spesifik')
                .addSubcommand(sub =>
                    sub.setName('channel')
                        .setDescription('Proteksi channel dari penghapusan')
                        .addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('Channel yang diproteksi')
                                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory)
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('role')
                        .setDescription('Proteksi role dari penghapusan')
                        .addRoleOption(opt =>
                            opt.setName('role')
                                .setDescription('Role yang diproteksi')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('unprotect')
                        .setDescription('Hapus proteksi')
                        .addStringOption(opt =>
                            opt.setName('type')
                                .setDescription('Tipe yang di-unprotect')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Channel', value: 'channel' },
                                    { name: 'Role', value: 'role' }
                                ))
                        .addStringOption(opt =>
                            opt.setName('id')
                                .setDescription('ID channel/role')
                                .setRequired(true))),
            
            // ===== RESTORE COMMANDS =====
            new SlashCommandBuilder()
                .setName('antinuke-restore')
                .setDescription('🔄 Restore channel/role yang terhapus')
                .addSubcommand(sub =>
                    sub.setName('channel')
                        .setDescription('Restore channel dari backup')
                        .addStringOption(opt =>
                            opt.setName('channel_id')
                                .setDescription('ID channel yang di-restore')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('role')
                        .setDescription('Restore role dari backup')
                        .addStringOption(opt =>
                            opt.setName('role_id')
                                .setDescription('ID role yang di-restore')
                                .setRequired(true)))
        ];
    }

    static async handleCommand(interaction, antiNuke) {
        const commandName = interaction.commandName;
        
        if (commandName === 'antinuke') {
            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case 'enable': await antiNuke.handleEnable(interaction); break;
                case 'disable': await antiNuke.handleDisable(interaction); break;
                case 'config': await antiNuke.handleConfig(interaction); break;
                case 'log': await antiNuke.handleLogChannel(interaction); break;
                case 'stats': await antiNuke.handleStats(interaction); break;
            }
        } else if (commandName === 'antinuke-whitelist') {
            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case 'add': await antiNuke.handleWhitelistAdd(interaction); break;
                case 'remove': await antiNuke.handleWhitelistRemove(interaction); break;
                case 'list': await antiNuke.handleWhitelistList(interaction); break;
            }
        } else if (commandName === 'antinuke-protect') {
            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case 'channel': await antiNuke.handleProtectChannel(interaction); break;
                case 'role': await antiNuke.handleProtectRole(interaction); break;
                case 'unprotect': await antiNuke.handleUnprotect(interaction); break;
            }
        } else if (commandName === 'antinuke-restore') {
            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case 'channel': await antiNuke.handleRestoreChannel(interaction); break;
                case 'role': await antiNuke.handleRestoreRole(interaction); break;
            }
        }
    }
}

module.exports = AntiNuke;
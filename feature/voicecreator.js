// voicecreator.js - ULTIMATE VOICE CREATOR SYSTEM (TEMP VOICE LIKE)
// FULLY FIXED VERSION - NO MORE INTERACTION FAILED!

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType,
    PermissionFlagsBits,
    OverwriteType
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class VoiceCreatorPlugin {
    constructor(client) {
        this.client = client;
        this.name = 'voicecreator';
        this.version = '2.0.0';
        this.description = 'Voice Channel Creator System';
        
        this.configPath = path.join(__dirname, 'data', 'voicecreator_config.json');
        this.channelsPath = path.join(__dirname, 'data', 'voicecreator_channels.json');
        this.activeChannels = new Map();
        this.config = new Map();
        this.panels = new Map();
        this.userSettings = new Map();
        
        // Load data
        this.loadConfig();
        this.loadChannels();
    }

    async init() {
        console.log('🎤 Voice Creator system initialized v2.0');
        this.startCleanupInterval();
    }

    startCleanupInterval() {
        setInterval(() => {
            this.cleanupEmptyChannels();
        }, 300000);
    }

    async cleanupEmptyChannels() {
        for (const [channelId, data] of this.activeChannels) {
            const guild = this.client.guilds.cache.get(data.guildId);
            if (!guild) continue;
            
            const channel = guild.channels.cache.get(channelId);
            if (channel && channel.members.size === 0) {
                const config = await this.getGuildConfig(data.guildId);
                if (config.autoDelete) {
                    setTimeout(() => {
                        if (channel && channel.members.size === 0) {
                            this.deleteVoiceChannel(channelId, 'Auto cleanup');
                        }
                    }, config.deleteDelay || 5000);
                }
            }
        }
    }

    async loadConfig() {
        try {
            const dataDir = path.join(__dirname, 'data');
            await fs.mkdir(dataDir, { recursive: true });
            
            const data = await fs.readFile(this.configPath, 'utf8').catch(async () => {
                await fs.writeFile(this.configPath, '{}');
                return '{}';
            });
            const configs = JSON.parse(data);
            
            for (const [guildId, config] of Object.entries(configs)) {
                this.config.set(guildId, config);
            }
            
            console.log(`🎤 Loaded Voice Creator config for ${this.config.size} guilds`);
        } catch (error) {
            console.log('📝 No Voice Creator config found, creating default...');
            await this.saveConfig();
        }
    }

    async loadChannels() {
        try {
            const data = await fs.readFile(this.channelsPath, 'utf8').catch(async () => {
                await fs.writeFile(this.channelsPath, '{}');
                return '{}';
            });
            const channels = JSON.parse(data);
            
            for (const [channelId, channelData] of Object.entries(channels)) {
                this.activeChannels.set(channelId, channelData);
            }
            
            console.log(`🎤 Loaded ${this.activeChannels.size} active voice channels`);
        } catch (error) {
            console.log('📝 No active channels found');
        }
    }

    async saveChannels() {
        const obj = {};
        this.activeChannels.forEach((data, channelId) => {
            obj[channelId] = data;
        });
        await fs.writeFile(this.channelsPath, JSON.stringify(obj, null, 2));
    }

    async saveConfig() {
        const obj = {};
        this.config.forEach((config, guildId) => {
            obj[guildId] = config;
        });
        await fs.writeFile(this.configPath, JSON.stringify(obj, null, 2));
    }

    async getGuildConfig(guildId) {
        if (!this.config.has(guildId)) {
            this.config.set(guildId, {
                enabled: false,
                categoryId: null,
                joinToCreateChannel: null,
                channelLimit: 5,
                autoDelete: true,
                deleteDelay: 5000,
                defaultUserLimit: 0,
                defaultBitrate: 64000,
                defaultNameFormat: '🔊 {username}\'s Channel',
                allowedRoles: [],
                blockedRoles: [],
                blockedPermissions: [],
                premiumOnly: false,
                customIcons: true,
                region: null,
                logChannel: null,
                welcomeMessage: true,
                panelMessage: null,
                panelChannel: null,
                creationCost: 0,
                maxChannelsPerUser: 3,
                interfaceStyle: 'modern',
                defaultVoiceRegion: 'us-west'
            });
            await this.saveConfig();
        }
        return this.config.get(guildId);
    }

    async getUserSettings(userId) {
        if (!this.userSettings.has(userId)) {
            this.userSettings.set(userId, {
                defaultName: null,
                defaultLimit: 0,
                defaultBitrate: 64000,
                defaultRegion: null,
                autoDelete: true,
                private: false,
                locked: false,
                hidden: false
            });
        }
        return this.userSettings.get(userId);
    }

    // ==================== VOICE STATE HANDLER ====================
    async handleVoiceUpdate(oldState, newState) {
        try {
            if (!oldState.channelId && newState.channelId) {
                await this.handleVoiceJoin(newState);
            }
            
            if (oldState.channelId && !newState.channelId) {
                await this.handleVoiceLeave(oldState);
            }
            
            if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                await this.handleVoiceLeave(oldState);
                await this.handleVoiceJoin(newState);
            }
        } catch (error) {
            console.error('Voice Creator error:', error);
        }
    }

    async handleVoiceJoin(voiceState) {
        const guild = voiceState.guild;
        const member = voiceState.member;
        const channel = voiceState.channel;
        
        const config = await this.getGuildConfig(guild.id);
        if (!config.enabled) return;
        
        if (config.joinToCreateChannel && channel.id === config.joinToCreateChannel) {
            await this.createVoiceChannel(member, channel, config);
            return;
        }
    }

    async handleVoiceLeave(voiceState) {
        const channel = voiceState.channel;
        if (!channel) return;
        
        const channelData = this.activeChannels.get(channel.id);
        if (!channelData) return;
        
        const config = await this.getGuildConfig(voiceState.guild.id);
        
        if (channel.members.size === 0 && config.autoDelete) {
            setTimeout(async () => {
                const updatedChannel = voiceState.guild.channels.cache.get(channel.id);
                if (updatedChannel && updatedChannel.members.size === 0) {
                    await this.deleteVoiceChannel(channel.id, 'Channel empty');
                }
            }, config.deleteDelay || 5000);
        }
        
        channelData.lastActivity = Date.now();
        this.activeChannels.set(channel.id, channelData);
        await this.saveChannels();
    }

    // ==================== CHANNEL CREATION ====================
    async createVoiceChannel(member, joinChannel, config) {
        try {
            const guild = member.guild;
            
            const userChannels = Array.from(this.activeChannels.values())
                .filter(c => c.guildId === guild.id && c.ownerId === member.id);
            
            if (userChannels.length >= (config.maxChannelsPerUser || config.channelLimit)) {
                await member.send(`❌ Kamu sudah mencapai limit **${config.maxChannelsPerUser || config.channelLimit}** voice channel!`).catch(() => {});
                await member.voice.disconnect().catch(() => {});
                return;
            }
            
            if (!await this.checkPermissions(member, config)) {
                await member.send('❌ Kamu tidak memiliki izin untuk membuat voice channel!').catch(() => {});
                await member.voice.disconnect().catch(() => {});
                return;
            }
            
            const userSettings = await this.getUserSettings(member.id);
            let channelName = userSettings.defaultName || config.defaultNameFormat || '🔊 {username}\'s Channel';
            channelName = channelName
                .replace(/{username}/g, member.user.username)
                .replace(/{displayname}/g, member.displayName)
                .replace(/{tag}/g, member.user.discriminator)
                .replace(/{count}/g, userChannels.length + 1);
            
            const permissionOverwrites = [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.Connect],
                    type: OverwriteType.Role
                },
                {
                    id: member.id,
                    allow: [
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.MuteMembers,
                        PermissionFlagsBits.DeafenMembers,
                        PermissionFlagsBits.MoveMembers,
                        PermissionFlagsBits.Stream,
                        PermissionFlagsBits.UseVAD
                    ],
                    type: OverwriteType.Member
                }
            ];
            
            if (config.allowedRoles.length > 0) {
                for (const roleId of config.allowedRoles) {
                    permissionOverwrites.push({
                        id: roleId,
                        allow: [PermissionFlagsBits.Connect],
                        type: OverwriteType.Role
                    });
                }
            }
            
            const voiceChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: config.categoryId,
                userLimit: userSettings.defaultLimit || config.defaultUserLimit || 0,
                bitrate: userSettings.defaultBitrate || config.defaultBitrate || 64000,
                rtcRegion: userSettings.defaultRegion || config.defaultVoiceRegion || null,
                permissionOverwrites: permissionOverwrites
            });

            await member.voice.setChannel(voiceChannel);

            const channelData = {
                id: voiceChannel.id,
                guildId: guild.id,
                ownerId: member.id,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                name: channelName,
                userLimit: voiceChannel.userLimit,
                bitrate: voiceChannel.bitrate,
                region: voiceChannel.rtcRegion,
                locked: userSettings.locked || false,
                hidden: userSettings.hidden || false,
                private: userSettings.private || false,
                allowedUsers: [],
                bannedUsers: [],
                trustedUsers: [member.id],
                interface: config.interfaceStyle || 'modern'
            };
            
            this.activeChannels.set(voiceChannel.id, channelData);
            await this.saveChannels();

            if (config.welcomeMessage) {
                await this.sendWelcomeMessage(voiceChannel, member, config);
            }

            await this.logActivity(guild, 'CHANNEL_CREATE', {
                channel: voiceChannel.name,
                owner: member.user.tag,
                timestamp: Date.now()
            });

            console.log(`🎤 Voice channel created for ${member.user.tag} in ${guild.name}`);

        } catch (error) {
            console.error('Error creating voice channel:', error);
        }
    }

    async sendWelcomeMessage(channel, member, config) {
        try {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🎤 **VOICE CHANNEL CREATED**')
                .setDescription(`Welcome to your private voice channel, **${member.user.username}**!`)
                .addFields(
                    { name: '📌 Channel', value: `<#${channel.id}>`, inline: true },
                    { name: '👑 Owner', value: `${member.user.tag}`, inline: true },
                    { name: '👥 User Limit', value: `${channel.userLimit || '∞'}`, inline: true },
                    { name: '🎚️ Bitrate', value: `${channel.bitrate / 1000}kbps`, inline: true },
                    { name: '🌍 Region', value: `${channel.rtcRegion || 'Auto'}`, inline: true },
                    { name: '⚙️ Commands', value: 'Use `/voice` to control your channel', inline: false }
                )
                .setFooter({ text: 'Lyora Voice Panel' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    }

    async deleteVoiceChannel(channelId, reason = 'Unknown') {
        try {
            const channelData = this.activeChannels.get(channelId);
            if (!channelData) return;
            
            const guild = this.client.guilds.cache.get(channelData.guildId);
            if (!guild) return;
            
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                await channel.delete(`Voice channel deleted: ${reason}`);
            }
            
            this.activeChannels.delete(channelId);
            await this.saveChannels();
            
            await this.logActivity(guild, 'CHANNEL_DELETE', {
                channelId: channelId,
                ownerId: channelData.ownerId,
                reason: reason,
                timestamp: Date.now()
            });
            
            console.log(`🎤 Voice channel ${channelId} deleted (${reason})`);
            
        } catch (error) {
            console.error('Error deleting voice channel:', error);
        }
    }

    async checkPermissions(member, config) {
        if (config.allowedRoles.length > 0) {
            const hasAllowedRole = member.roles.cache.some(role => config.allowedRoles.includes(role.id));
            if (!hasAllowedRole) return false;
        }
        
        if (config.blockedRoles.length > 0) {
            const hasBlockedRole = member.roles.cache.some(role => config.blockedRoles.includes(role.id));
            if (hasBlockedRole) return false;
        }
        
        return true;
    }

    async logActivity(guild, type, data) {
        const config = await this.getGuildConfig(guild.id);
        if (!config.logChannel) return;
        
        const logChannel = guild.channels.cache.get(config.logChannel);
        if (!logChannel) return;
        
        const embed = new EmbedBuilder()
            .setColor(type.includes('CREATE') ? 0x00FF00 : 0xFF0000)
            .setTitle(`🎤 **VOICE CREATOR LOG**`)
            .setDescription(`**Type:** ${type}`)
            .setTimestamp();
            
        for (const [key, value] of Object.entries(data)) {
            embed.addFields({ name: key, value: String(value), inline: true });
        }
        
        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }

    // ==================== ADMIN COMMANDS ====================
    async handleSetup(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const joinChannel = interaction.options.getChannel('join_channel');
        const category = interaction.options.getChannel('category');
        const limit = interaction.options.getInteger('user_limit');
        const bitrate = interaction.options.getInteger('bitrate');
        const nameFormat = interaction.options.getString('name_format');

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = await this.getGuildConfig(interaction.guild.id);
            
            if (joinChannel) config.joinToCreateChannel = joinChannel.id;
            if (category) config.categoryId = category.id;
            if (limit !== null) config.defaultUserLimit = limit;
            if (bitrate !== null) config.defaultBitrate = bitrate * 1000;
            if (nameFormat) config.defaultNameFormat = nameFormat;
            
            config.enabled = true;
            await this.saveConfig();

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🎤 **VOICE CREATOR CONFIGURED**')
                .setDescription('✅ Voice Creator system has been activated!')
                .addFields(
                    { name: '🔊 Join Channel', value: config.joinToCreateChannel ? `<#${config.joinToCreateChannel}>` : '❌ Not set', inline: true },
                    { name: '📁 Category', value: config.categoryId ? `<#${config.categoryId}>` : '❌ Not set', inline: true },
                    { name: '👥 Default Limit', value: `${config.defaultUserLimit || 'Unlimited'}`, inline: true },
                    { name: '🎚️ Default Bitrate', value: `${config.defaultBitrate / 1000}kbps`, inline: true },
                    { name: '📝 Name Format', value: config.defaultNameFormat || 'Default', inline: true },
                    { name: '🗑️ Auto Delete', value: config.autoDelete ? `✅ (${config.deleteDelay}ms)` : '❌', inline: true }
                )
                .setFooter({ text: 'Lyora Voice Panel' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Voice Creator setup error:', error);
            await interaction.editReply({ content: '❌ Error setting up Voice Creator!' });
        }
    }

    async handleDisable(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = await this.getGuildConfig(interaction.guild.id);
            config.enabled = false;
            await this.saveConfig();

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ **VOICE CREATOR DISABLED**')
                .setDescription('Voice creator system has been disabled.')
                .setFooter({ text: 'Lyora Voice Panel' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Voice Creator disable error:', error);
            await interaction.editReply({ content: '❌ Error disabling Voice Creator!' });
        }
    }

    async handleConfig(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = await this.getGuildConfig(interaction.guild.id);
            
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('⚙️ **VOICE CREATOR CONFIGURATION**')
                .setDescription(`Current settings for **${interaction.guild.name}**`)
                .addFields(
                    { name: '🔊 Status', value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '📊 Active Channels', value: `${Array.from(this.activeChannels.values()).filter(c => c.guildId === interaction.guild.id).length}`, inline: true },
                    { name: '🔊 Join Channel', value: config.joinToCreateChannel ? `<#${config.joinToCreateChannel}>` : '❌ Not set', inline: true },
                    { name: '📁 Category', value: config.categoryId ? `<#${config.categoryId}>` : '❌ Not set', inline: true },
                    { name: '👥 Default Limit', value: `${config.defaultUserLimit || '0'}`, inline: true },
                    { name: '🎚️ Default Bitrate', value: `${config.defaultBitrate / 1000 || '64'}kbps`, inline: true },
                    { name: '📝 Name Format', value: config.defaultNameFormat || '🔊 {username}\'s Channel', inline: true },
                    { name: '🗑️ Auto Delete', value: config.autoDelete ? `✅ (${config.deleteDelay}ms)` : '❌', inline: true },
                    { name: '👥 Max/User', value: `${config.maxChannelsPerUser || config.channelLimit || '3'}`, inline: true },
                    { name: '📋 Log Channel', value: config.logChannel ? `<#${config.logChannel}>` : '❌ Not set', inline: true }
                )
                .setFooter({ text: 'Lyora Voice Panel' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Config error:', error);
            await interaction.editReply({ content: '❌ Error fetching configuration!' });
        }
    }

    async handlePanel(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title') || '🎤 Voice Channel Creator';
        const description = interaction.options.getString('description') || 'Click the button below to create your own voice channel!';

        await interaction.deferReply({ ephemeral: true });

        try {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(title)
                .setDescription(description)
                .addFields(
                    { name: '📌 How to use', value: '1️⃣ Join **Join to Create** channel\n2️⃣ Auto-create voice channel\n3️⃣ Enjoy your private room!', inline: false },
                    { name: '⚙️ Features', value: '• Rename channel\n• Set user limit\n• Lock/Unlock\n• Transfer ownership\n• And more!', inline: true },
                    { name: '✨ Benefits', value: '• Private room\n• Full control\n• No interference\n• Instant setup', inline: true }
                )
                .setFooter({ text: 'Lyora Voice Panel' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            const config = await this.getGuildConfig(interaction.guild.id);
            config.panelChannel = channel.id;
            await this.saveConfig();

            await interaction.editReply({ 
                content: `✅ Voice creator panel has been sent to ${channel}!` 
            });

        } catch (error) {
            console.error('Panel creation error:', error);
            await interaction.editReply({ content: '❌ Error creating panel!' });
        }
    }

    // ==================== USER COMMANDS ====================
    async handleMyChannel(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const userChannels = Array.from(this.activeChannels.values())
                .filter(c => c.guildId === interaction.guild.id && c.ownerId === interaction.user.id);

            if (userChannels.length === 0) {
                return interaction.editReply({ 
                    content: '❌ Kamu belum memiliki voice channel! Join ke **Join to Create** channel untuk membuat.' 
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🎤 **YOUR VOICE CHANNELS**')
                .setDescription(`You have **${userChannels.length}** voice channel(s)`)
                .setTimestamp();

            for (const [index, channelData] of userChannels.entries()) {
                const guild = interaction.client.guilds.cache.get(channelData.guildId);
                const vc = guild?.channels.cache.get(channelData.id);
                
                let status = '';
                if (channelData.locked) status += '🔒 Locked ';
                if (channelData.hidden) status += '👻 Hidden ';
                if (!vc) status += '💀 Deleted ';
                
                embed.addFields({
                    name: `${index + 1}. ${channelData.name} ${status}`,
                    value: `📌 <#${channelData.id}>\n👥 Members: ${vc?.members.size || 0}/${channelData.userLimit || '∞'}\n🎚️ Bitrate: ${channelData.bitrate / 1000}kbps`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('My channel error:', error);
            await interaction.editReply({ content: '❌ Error fetching your channels!' });
        }
    }

    async handleRename(interaction) {
        const newName = interaction.options.getString('name');

        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            const channel = interaction.guild.channels.cache.get(channelData.id);
            await channel.setName(`🔊 ${newName}`);

            channelData.name = `🔊 ${newName}`;
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Channel Renamed')
                .setDescription(`Channel renamed to **${newName}**`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Rename error:', error);
            await interaction.editReply({ content: '❌ Error renaming channel!' });
        }
    }

    async handleLimit(interaction) {
        const limit = interaction.options.getInteger('limit');

        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            const channel = interaction.guild.channels.cache.get(channelData.id);
            await channel.setUserLimit(limit);

            channelData.userLimit = limit;
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ User Limit Updated')
                .setDescription(`User limit set to **${limit === 0 ? 'No limit' : limit}**`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Limit error:', error);
            await interaction.editReply({ content: '❌ Error setting user limit!' });
        }
    }

    async handleBitrate(interaction) {
        const bitrate = interaction.options.getInteger('bitrate');

        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            const channel = interaction.guild.channels.cache.get(channelData.id);
            await channel.setBitrate(bitrate * 1000);

            channelData.bitrate = bitrate * 1000;
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Bitrate Updated')
                .setDescription(`Bitrate set to **${bitrate}kbps**`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Bitrate error:', error);
            await interaction.editReply({ content: '❌ Error setting bitrate!' });
        }
    }

    async handleRegion(interaction) {
        const region = interaction.options.getString('region');

        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            const channel = interaction.guild.channels.cache.get(channelData.id);
            await channel.setRTCRegion(region === 'auto' ? null : region);

            channelData.region = region === 'auto' ? null : region;
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Region Updated')
                .setDescription(`Voice region set to **${region}**`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Region error:', error);
            await interaction.editReply({ content: '❌ Error setting region!' });
        }
    }

    async handleLock(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            const channel = interaction.guild.channels.cache.get(channelData.id);
            
            await channel.permissionOverwrites.edit(interaction.guild.id, {
                Connect: false
            });

            channelData.locked = true;
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🔒 Channel Locked')
                .setDescription('Channel is now locked. Only you and trusted users can join.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Lock error:', error);
            await interaction.editReply({ content: '❌ Error locking channel!' });
        }
    }

    async handleUnlock(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            const channel = interaction.guild.channels.cache.get(channelData.id);
            
            await channel.permissionOverwrites.edit(interaction.guild.id, {
                Connect: null
            });

            channelData.locked = false;
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🔓 Channel Unlocked')
                .setDescription('Channel is now unlocked. Everyone can join.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Unlock error:', error);
            await interaction.editReply({ content: '❌ Error unlocking channel!' });
        }
    }

    async handleHide(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            const channel = interaction.guild.channels.cache.get(channelData.id);
            
            await channel.permissionOverwrites.edit(interaction.guild.id, {
                ViewChannel: false
            });

            channelData.hidden = true;
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            const embed = new EmbedBuilder()
                .setColor(0x808080)
                .setTitle('👻 Channel Hidden')
                .setDescription('Channel is now hidden. Only you can see it.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Hide error:', error);
            await interaction.editReply({ content: '❌ Error hiding channel!' });
        }
    }

    async handleReveal(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            const channel = interaction.guild.channels.cache.get(channelData.id);
            
            await channel.permissionOverwrites.edit(interaction.guild.id, {
                ViewChannel: null
            });

            channelData.hidden = false;
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('👀 Channel Revealed')
                .setDescription('Channel is now visible to everyone.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Reveal error:', error);
            await interaction.editReply({ content: '❌ Error revealing channel!' });
        }
    }

    async handleClaim(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel dari sistem!' });
            }

            if (channelData.ownerId === interaction.user.id) {
                return interaction.editReply({ content: '❌ Kamu sudah menjadi owner channel ini!' });
            }

            const owner = await interaction.guild.members.fetch(channelData.ownerId).catch(() => null);
            if (owner && voiceState.channel.members.has(owner.id)) {
                return interaction.editReply({ 
                    content: '❌ Owner channel masih online! Tidak bisa claim.' 
                });
            }

            await voiceState.channel.permissionOverwrites.edit(interaction.user.id, {
                Connect: true,
                ManageChannels: true,
                MuteMembers: true,
                DeafenMembers: true,
                MoveMembers: true,
                Stream: true,
                UseVAD: true
            });

            if (owner) {
                await voiceState.channel.permissionOverwrites.edit(owner.id, {
                    Connect: true,
                    ManageChannels: false,
                    MuteMembers: false,
                    DeafenMembers: false,
                    MoveMembers: false,
                    Stream: false,
                    UseVAD: false
                });
            }

            channelData.ownerId = interaction.user.id;
            if (!channelData.trustedUsers) channelData.trustedUsers = [];
            channelData.trustedUsers.push(interaction.user.id);
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('👑 Channel Claimed')
                .setDescription(`You are now the owner of **${voiceState.channel.name}**!`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Claim error:', error);
            await interaction.editReply({ content: '❌ Error claiming channel!' });
        }
    }

    async handleTransfer(interaction) {
        const newOwner = interaction.options.getUser('user');

        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            if (!voiceState.channel.members.has(newOwner.id)) {
                return interaction.editReply({ 
                    content: '❌ User harus berada di voice channel ini!' 
                });
            }

            const channel = interaction.guild.channels.cache.get(channelData.id);
            
            await channel.permissionOverwrites.edit(interaction.user.id, {
                ManageChannels: false,
                MuteMembers: false,
                DeafenMembers: false,
                MoveMembers: false
            });

            await channel.permissionOverwrites.edit(newOwner.id, {
                Connect: true,
                ManageChannels: true,
                MuteMembers: true,
                DeafenMembers: true,
                MoveMembers: true,
                Stream: true,
                UseVAD: true
            });

            channelData.ownerId = newOwner.id;
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('👑 Ownership Transferred')
                .setDescription(`Channel ownership transferred to **${newOwner.tag}**`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Transfer error:', error);
            await interaction.editReply({ content: '❌ Error transferring ownership!' });
        }
    }

    async handlePermit(interaction) {
        const user = interaction.options.getUser('user');

        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            const channel = interaction.guild.channels.cache.get(channelData.id);
            
            await channel.permissionOverwrites.edit(user.id, {
                Connect: true
            });

            if (!channelData.allowedUsers) channelData.allowedUsers = [];
            if (!channelData.allowedUsers.includes(user.id)) {
                channelData.allowedUsers.push(user.id);
            }
            
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ User Permitted')
                .setDescription(`**${user.tag}** can now join this channel`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Permit error:', error);
            await interaction.editReply({ content: '❌ Error permitting user!' });
        }
    }

    async handleReject(interaction) {
        const user = interaction.options.getUser('user');

        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            const channel = interaction.guild.channels.cache.get(channelData.id);
            
            await channel.permissionOverwrites.edit(user.id, {
                Connect: false
            });

            if (channelData.allowedUsers) {
                channelData.allowedUsers = channelData.allowedUsers.filter(id => id !== user.id);
            }
            if (!channelData.bannedUsers) channelData.bannedUsers = [];
            if (!channelData.bannedUsers.includes(user.id)) {
                channelData.bannedUsers.push(user.id);
            }
            
            this.activeChannels.set(channelData.id, channelData);
            await this.saveChannels();

            if (voiceState.channel.members.has(user.id)) {
                const member = voiceState.channel.members.get(user.id);
                await member.voice.disconnect().catch(() => {});
            }

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⛔ User Rejected')
                .setDescription(`**${user.tag}** can no longer join this channel`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Reject error:', error);
            await interaction.editReply({ content: '❌ Error rejecting user!' });
        }
    }

    async handleTrusted(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel milikmu!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            if (!channelData || channelData.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ Ini bukan voice channel milikmu!' });
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🔐 Trusted Users')
                .setDescription(`Users who can join locked channel:`);

            if (channelData.trustedUsers && channelData.trustedUsers.length > 0) {
                for (const userId of channelData.trustedUsers) {
                    const user = await interaction.client.users.fetch(userId).catch(() => null);
                    if (user) {
                        embed.addFields({ 
                            name: user.tag, 
                            value: `🆔 ${userId}`, 
                            inline: true 
                        });
                    }
                }
            } else {
                embed.setDescription('No trusted users yet.');
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Trusted error:', error);
            await interaction.editReply({ content: '❌ Error fetching trusted users!' });
        }
    }

    async handleInfo(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const voiceState = interaction.member.voice;
            if (!voiceState.channel) {
                return interaction.editReply({ content: '❌ Kamu harus berada di voice channel!' });
            }

            const channelData = this.activeChannels.get(voiceState.channel.id);
            
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`📊 **VOICE CHANNEL INFO**`)
                .setDescription(`**${voiceState.channel.name}**`)
                .addFields(
                    { name: '🆔 Channel ID', value: `\`${voiceState.channel.id}\``, inline: true },
                    { name: '👥 Members', value: `${voiceState.channel.members.size}`, inline: true },
                    { name: '👤 User Limit', value: `${voiceState.channel.userLimit || '∞'}`, inline: true },
                    { name: '🎚️ Bitrate', value: `${voiceState.channel.bitrate / 1000}kbps`, inline: true },
                    { name: '🌍 Region', value: `${voiceState.channel.rtcRegion || 'Auto'}`, inline: true },
                    { name: '📁 Category', value: voiceState.channel.parent ? `<#${voiceState.channel.parentId}>` : 'None', inline: true }
                );

            if (channelData) {
                const owner = await interaction.guild.members.fetch(channelData.ownerId).catch(() => null);
                embed.addFields(
                    { name: '👑 Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
                    { name: '📅 Created', value: `<t:${Math.floor(channelData.createdAt/1000)}:R>`, inline: true },
                    { name: '🔒 Locked', value: channelData.locked ? '✅ Yes' : '❌ No', inline: true },
                    { name: '👻 Hidden', value: channelData.hidden ? '✅ Yes' : '❌ No', inline: true }
                );
            }

            embed.setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Info error:', error);
            await interaction.editReply({ content: '❌ Error fetching channel info!' });
        }
    }

    async handleDefault(interaction) {
        const name = interaction.options.getString('name');
        const limit = interaction.options.getInteger('limit');
        const bitrate = interaction.options.getInteger('bitrate');
        const region = interaction.options.getString('region');
        const private_mode = interaction.options.getBoolean('private');

        await interaction.deferReply({ ephemeral: true });

        try {
            const userSettings = await this.getUserSettings(interaction.user.id);
            
            if (name !== null) userSettings.defaultName = name;
            if (limit !== null) userSettings.defaultLimit = limit;
            if (bitrate !== null) userSettings.defaultBitrate = bitrate * 1000;
            if (region !== null) userSettings.defaultRegion = region === 'auto' ? null : region;
            if (private_mode !== null) userSettings.private = private_mode;
            
            this.userSettings.set(interaction.user.id, userSettings);

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('⚙️ **DEFAULT SETTINGS UPDATED**')
                .setDescription('Your default channel settings have been saved!')
                .addFields(
                    { name: '📝 Default Name', value: userSettings.defaultName || '🔊 {username}\'s Channel', inline: true },
                    { name: '👥 Default Limit', value: `${userSettings.defaultLimit || '0'}`, inline: true },
                    { name: '🎚️ Default Bitrate', value: `${userSettings.defaultBitrate / 1000 || '64'}kbps`, inline: true },
                    { name: '🌍 Default Region', value: userSettings.defaultRegion || 'Auto', inline: true },
                    { name: '🔒 Private Mode', value: userSettings.private ? '✅ On' : '❌ Off', inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Default settings error:', error);
            await interaction.editReply({ content: '❌ Error saving default settings!' });
        }
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('voice')
                .setDescription('🎤 Voice Channel Creator System')
                // Admin Commands
                .addSubcommand(sub =>
                    sub.setName('setup')
                        .setDescription('[ADMIN] Setup voice creator system')
                        .addChannelOption(opt => 
                            opt.setName('join_channel')
                                .setDescription('Channel untuk join-to-create')
                                .addChannelTypes(ChannelType.GuildVoice)
                                .setRequired(true))
                        .addChannelOption(opt => 
                            opt.setName('category')
                                .setDescription('Kategori untuk voice channels')
                                .addChannelTypes(ChannelType.GuildCategory)
                                .setRequired(true))
                        .addIntegerOption(opt => 
                            opt.setName('user_limit')
                                .setDescription('Default user limit (0 = unlimited)')
                                .setMinValue(0)
                                .setMaxValue(99)
                                .setRequired(false))
                        .addIntegerOption(opt => 
                            opt.setName('bitrate')
                                .setDescription('Default bitrate in kbps (8-384)')
                                .setMinValue(8)
                                .setMaxValue(384)
                                .setRequired(false))
                        .addStringOption(opt => 
                            opt.setName('name_format')
                                .setDescription('Format nama channel (use {username})')
                                .setMaxLength(100)
                                .setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('disable')
                        .setDescription('[ADMIN] Disable voice creator system'))
                .addSubcommand(sub =>
                    sub.setName('config')
                        .setDescription('[ADMIN] Lihat konfigurasi voice creator'))
                .addSubcommand(sub =>
                    sub.setName('panel')
                        .setDescription('[ADMIN] Send info panel to channel')
                        .addChannelOption(opt => 
                            opt.setName('channel')
                                .setDescription('Channel untuk mengirim panel')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true))
                        .addStringOption(opt => 
                            opt.setName('title')
                                .setDescription('Judul panel')
                                .setRequired(false))
                        .addStringOption(opt => 
                            opt.setName('description')
                                .setDescription('Deskripsi panel')
                                .setRequired(false)))
                
                // User Commands
                .addSubcommand(sub =>
                    sub.setName('my')
                        .setDescription('Lihat semua voice channel milikmu'))
                .addSubcommand(sub =>
                    sub.setName('rename')
                        .setDescription('Ganti nama voice channel mu')
                        .addStringOption(opt => 
                            opt.setName('name')
                                .setDescription('Nama baru untuk channel')
                                .setRequired(true)
                                .setMaxLength(50)))
                .addSubcommand(sub =>
                    sub.setName('limit')
                        .setDescription('Set user limit voice channel')
                        .addIntegerOption(opt => 
                            opt.setName('limit')
                                .setDescription('Jumlah maksimal user (0 = unlimited)')
                                .setRequired(true)
                                .setMinValue(0)
                                .setMaxValue(99)))
                .addSubcommand(sub =>
                    sub.setName('bitrate')
                        .setDescription('Set bitrate voice channel')
                        .addIntegerOption(opt => 
                            opt.setName('bitrate')
                                .setDescription('Bitrate in kbps (8-384)')
                                .setRequired(true)
                                .setMinValue(8)
                                .setMaxValue(384)))
                .addSubcommand(sub =>
                    sub.setName('region')
                        .setDescription('Set voice region channel')
                        .addStringOption(opt => 
                            opt.setName('region')
                                .setDescription('Voice region')
                                .setRequired(true)
                                .addChoices(
                                    { name: '🌍 Auto', value: 'auto' },
                                    { name: '🇺🇸 US West', value: 'us-west' },
                                    { name: '🇺🇸 US East', value: 'us-east' },
                                    { name: '🇺🇸 US Central', value: 'us-central' },
                                    { name: '🇪🇺 Europe', value: 'europe' },
                                    { name: '🇬🇧 UK', value: 'uk' },
                                    { name: '🇸🇬 Singapore', value: 'singapore' },
                                    { name: '🇯🇵 Japan', value: 'japan' },
                                    { name: '🇦🇺 Australia', value: 'australia' },
                                    { name: '🇧🇷 Brazil', value: 'brazil' }
                                )))
                .addSubcommand(sub =>
                    sub.setName('lock')
                        .setDescription('🔒 Lock voice channel'))
                .addSubcommand(sub =>
                    sub.setName('unlock')
                        .setDescription('🔓 Unlock voice channel'))
                .addSubcommand(sub =>
                    sub.setName('hide')
                        .setDescription('👻 Hide voice channel'))
                .addSubcommand(sub =>
                    sub.setName('reveal')
                        .setDescription('👀 Reveal voice channel'))
                .addSubcommand(sub =>
                    sub.setName('claim')
                        .setDescription('Claim voice channel yang owner nya offline'))
                .addSubcommand(sub =>
                    sub.setName('transfer')
                        .setDescription('👑 Transfer ownership ke user lain')
                        .addUserOption(opt => 
                            opt.setName('user')
                                .setDescription('User yang akan menjadi owner baru')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('permit')
                        .setDescription('✅ Izinkan user join ke channel')
                        .addUserOption(opt => 
                            opt.setName('user')
                                .setDescription('User yang diizinkan')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('reject')
                        .setDescription('⛔ Blokir user dari channel')
                        .addUserOption(opt => 
                            opt.setName('user')
                                .setDescription('User yang diblokir')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('trusted')
                        .setDescription('🔐 Lihat daftar trusted users'))
                .addSubcommand(sub =>
                    sub.setName('info')
                        .setDescription('Lihat info voice channel saat ini'))
                .addSubcommand(sub =>
                    sub.setName('default')
                        .setDescription('⚙️ Set default settings untuk channel mu')
                        .addStringOption(opt => 
                            opt.setName('name')
                                .setDescription('Default nama channel')
                                .setRequired(false))
                        .addIntegerOption(opt => 
                            opt.setName('limit')
                                .setDescription('Default user limit')
                                .setMinValue(0)
                                .setMaxValue(99)
                                .setRequired(false))
                        .addIntegerOption(opt => 
                            opt.setName('bitrate')
                                .setDescription('Default bitrate (kbps)')
                                .setMinValue(8)
                                .setMaxValue(384)
                                .setRequired(false))
                        .addStringOption(opt => 
                            opt.setName('region')
                                .setDescription('Default voice region')
                                .addChoices(
                                    { name: '🌍 Auto', value: 'auto' },
                                    { name: '🇺🇸 US West', value: 'us-west' },
                                    { name: '🇺🇸 US East', value: 'us-east' },
                                    { name: '🇪🇺 Europe', value: 'europe' },
                                    { name: '🇸🇬 Singapore', value: 'singapore' },
                                    { name: '🇯🇵 Japan', value: 'japan' }
                                )
                                .setRequired(false))
                        .addBooleanOption(opt => 
                            opt.setName('private')
                                .setDescription('Private mode (auto lock)')
                                .setRequired(false)))
        ];
    }

    // Static method untuk command handler
    static async handleCommand(interaction, plugin) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                // Admin commands
                case 'setup': await plugin.handleSetup(interaction); break;
                case 'disable': await plugin.handleDisable(interaction); break;
                case 'config': await plugin.handleConfig(interaction); break;
                case 'panel': await plugin.handlePanel(interaction); break;
                
                // User commands
                case 'my': await plugin.handleMyChannel(interaction); break;
                case 'rename': await plugin.handleRename(interaction); break;
                case 'limit': await plugin.handleLimit(interaction); break;
                case 'bitrate': await plugin.handleBitrate(interaction); break;
                case 'region': await plugin.handleRegion(interaction); break;
                case 'lock': await plugin.handleLock(interaction); break;
                case 'unlock': await plugin.handleUnlock(interaction); break;
                case 'hide': await plugin.handleHide(interaction); break;
                case 'reveal': await plugin.handleReveal(interaction); break;
                case 'claim': await plugin.handleClaim(interaction); break;
                case 'transfer': await plugin.handleTransfer(interaction); break;
                case 'permit': await plugin.handlePermit(interaction); break;
                case 'reject': await plugin.handleReject(interaction); break;
                case 'trusted': await plugin.handleTrusted(interaction); break;
                case 'info': await plugin.handleInfo(interaction); break;
                case 'default': await plugin.handleDefault(interaction); break;
                
                default:
                    await interaction.reply({ 
                        content: '❌ Subcommand tidak dikenal!', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error(`Voice Creator command error (${subcommand}):`, error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: `❌ Error: ${error.message.substring(0, 100)}`,
                    ephemeral: true 
                });
            } else if (interaction.deferred) {
                await interaction.editReply({ 
                    content: `❌ Error: ${error.message.substring(0, 100)}`
                });
            }
        }
    }
}

module.exports = VoiceCreatorPlugin;
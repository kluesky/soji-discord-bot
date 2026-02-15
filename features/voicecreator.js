// voicecreator.js - ULTIMATE VOICE CREATOR SYSTEM (FULL FITUR - FIXED!)
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
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
        this.description = 'Ultimate Voice Channel Creator System - Full Fitur';
        
        this.configPath = path.join(__dirname, 'data', 'voicecreator_config.json');
        this.channelsPath = path.join(__dirname, 'data', 'voicecreator_channels.json');
        this.activeChannels = new Map();
        this.config = new Map();
        this.userSettings = new Map();
        
        this.loadConfig();
        this.loadChannels();
        this.setupPanelHandler();
    }

    setupPanelHandler() {
        if (!this.client) return;
        
        if (this.client.voicePanelHandler) {
            this.client.removeListener('interactionCreate', this.client.voicePanelHandler);
        }
        
        this.client.voicePanelHandler = async (interaction) => {
            await this.handlePanelButtons(interaction);
        };
        
        this.client.on('interactionCreate', this.client.voicePanelHandler);
        console.log('🎤 Voice Panel button handler ready');
    }

    async init() {
        console.log('🎤 Ultimate Voice Creator System initialized v2.0 - FULL FITUR');
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
                logChannel: null,
                welcomeMessage: true,
                panelMessageId: null,
                panelChannelId: null,
                maxChannelsPerUser: 3,
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
                private: false
            });
        }
        return this.userSettings.get(userId);
    }

    // ==================== PANEL BUTTON HANDLER ====================
    async handlePanelButtons(interaction) {
        if (!interaction.isButton()) return;
        
        const customId = interaction.customId;
        
        if (customId === 'vc_join_create') {
            await interaction.deferReply({ ephemeral: true });
            
            try {
                const config = await this.getGuildConfig(interaction.guild.id);
                
                if (!config.enabled) {
                    return interaction.editReply({ content: '❌ Voice Creator sedang tidak aktif!' });
                }
                
                if (!config.joinToCreateChannel) {
                    return interaction.editReply({ content: '❌ Join channel belum di setup!' });
                }
                
                const joinChannel = interaction.guild.channels.cache.get(config.joinToCreateChannel);
                if (!joinChannel) {
                    return interaction.editReply({ content: '❌ Join channel tidak ditemukan!' });
                }
                
                if (interaction.member.voice.channel) {
                    return interaction.editReply({ 
                        content: `❌ Kamu sudah berada di <#${interaction.member.voice.channel.id}>!` 
                    });
                }
                
                await interaction.member.voice.setChannel(joinChannel);
                await interaction.editReply({ 
                    content: `✅ Kamu telah dipindahkan ke <#${joinChannel.id}>, channel akan otomatis dibuat!` 
                });
                
            } catch (error) {
                console.error('Join button error:', error);
                await interaction.editReply({ 
                    content: '❌ Gagal memindahkan ke join channel. Pastikan kamu tidak di AFK channel!' 
                });
            }
            return;
        }
        
        if (customId === 'vc_commands') {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 **VOICE COMMANDS**')
                .setDescription('```/voice my``` - Lihat channel kamu\n```/voice delete``` - Hapus channel kamu\n```/voice rename``` - Ganti nama channel\n```/voice limit``` - Set user limit\n```/voice lock``` - Kunci channel\n```/voice unlock``` - Buka channel\n```/voice hide``` - Sembunyikan channel\n```/voice reveal``` - Tampilkan channel\n```/voice claim``` - Claim channel\n```/voice transfer``` - Transfer ownership\n```/voice permit``` - Izinkan user\n```/voice reject``` - Blokir user\n```/voice info``` - Info channel')
                .setFooter({ text: 'Gunakan perintah di channel manapun' })
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        if (customId === 'vc_help') {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('❓ **VOICE CREATOR HELP**')
                .setDescription('**Cara Membuat Voice Channel:**\n1️⃣ Klik **Join to Create**\n2️⃣ Kamu akan dipindahkan ke join channel\n3️⃣ Channel pribadimu otomatis dibuat!\n\n**Cara Mengatur Channel:**\n• Gunakan **/voice** commands di bot channel\n• Owner bisa lock/hide/transfer/delete dll\n\n**Ada masalah?** Hubungi Admin!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
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
        if (!config.joinToCreateChannel) return;
        if (channel.id !== config.joinToCreateChannel) return;
        
        if (config.allowedRoles.length > 0) {
            const hasAllowedRole = member.roles.cache.some(role => config.allowedRoles.includes(role.id));
            if (!hasAllowedRole) {
                await member.send('❌ Kamu tidak memiliki izin untuk membuat voice channel!').catch(() => {});
                await voiceState.disconnect().catch(() => {});
                return;
            }
        }
        
        if (config.blockedRoles.length > 0) {
            const hasBlockedRole = member.roles.cache.some(role => config.blockedRoles.includes(role.id));
            if (hasBlockedRole) {
                await member.send('❌ Kamu diblokir dari membuat voice channel!').catch(() => {});
                await voiceState.disconnect().catch(() => {});
                return;
            }
        }

        const userChannels = Array.from(this.activeChannels.values())
            .filter(c => c.guildId === guild.id && c.ownerId === member.id);
        
        if (userChannels.length >= (config.maxChannelsPerUser || config.channelLimit)) {
            await member.send(`❌ Kamu sudah mencapai limit ${config.maxChannelsPerUser || config.channelLimit} voice channel!`).catch(() => {});
            await member.voice.disconnect().catch(() => {});
            return;
        }

        await this.createVoiceChannel(member, channel, config);
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
                locked: false,
                hidden: false,
                private: userSettings.private || false,
                allowedUsers: [],
                bannedUsers: [],
                trustedUsers: [member.id]
            };
            
            this.activeChannels.set(voiceChannel.id, channelData);
            await this.saveChannels();

            if (config.welcomeMessage) {
                await this.sendWelcomeMessage(voiceChannel, member);
            }

            await this.logActivity(guild, 'CHANNEL_CREATE', {
                channel: voiceChannel.name,
                owner: member.user.tag
            });

            console.log(`🎤 Voice channel created for ${member.user.tag} in ${guild.name}`);

        } catch (error) {
            console.error('Error creating voice channel:', error);
        }
    }

    async sendWelcomeMessage(channel, member) {
        try {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🎤 **VOICE CHANNEL CREATED**')
                .setDescription(`**${member.user.username}** telah membuat voice channel!`)
                .addFields(
                    { name: '📌 Channel', value: `<#${channel.id}>`, inline: true },
                    { name: '👑 Owner', value: `${member.user.tag}`, inline: true },
                    { name: '👥 User Limit', value: `${channel.userLimit || '∞'}`, inline: true },
                    { name: '🎚️ Bitrate', value: `${channel.bitrate / 1000}kbps`, inline: true },
                    { name: '🌍 Region', value: `${channel.rtcRegion || 'Auto'}`, inline: true },
                    { name: '⚙️ Commands', value: 'Gunakan `/voice` untuk mengatur channel', inline: false }
                )
                .setFooter({ text: 'TEMP VOICE • Ultimate Edition' })
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
                reason: reason
            });
            
            console.log(`🎤 Voice channel ${channelId} deleted (${reason})`);
            
        } catch (error) {
            console.error('Error deleting voice channel:', error);
        }
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
            .addFields(
                { name: 'Time', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
            );
            
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
                .setColor(0x00FF00)
                .setTitle('✅ **VOICE CREATOR CONFIGURED**')
                .setDescription('Sistem voice creator telah diaktifkan!')
                .addFields(
                    { name: '🔊 Join Channel', value: config.joinToCreateChannel ? `<#${config.joinToCreateChannel}>` : '❌ Not set', inline: true },
                    { name: '📁 Category', value: config.categoryId ? `<#${config.categoryId}>` : '❌ Not set', inline: true },
                    { name: '👥 Default Limit', value: `${config.defaultUserLimit || 'No limit'}`, inline: true },
                    { name: '🎚️ Default Bitrate', value: `${config.defaultBitrate / 1000}kbps`, inline: true },
                    { name: '📝 Name Format', value: config.defaultNameFormat || 'Default', inline: true },
                    { name: '🗑️ Auto Delete', value: config.autoDelete ? `✅ (${config.deleteDelay}ms)` : '❌', inline: true }
                )
                .setFooter({ text: 'TEMP VOICE • Ultimate Edition' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Voice Creator setup error:', error);
            await interaction.editReply({ content: '❌ Error setting up Voice Creator!' });
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

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = await this.getGuildConfig(interaction.guild.id);
            
            if (!config.joinToCreateChannel) {
                return interaction.editReply({ 
                    content: '❌ Setup voice creator dulu dengan `/voice setup`!' 
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🎤 **LYORA VOICE PANEL**')
                .setDescription('**Keamanan:**\n🔒 Lock - Kunci channel\n👻 Hide - Sembunyikan channel\n👑 Transfer - Pindah ownership\n🗑️ Delete - Hapus channel')
                .setFooter({ 
                    text: `Lyora Voice Panel | ${new Date().toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', ' |')}` 
                });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('vc_join_create')
                        .setLabel('Join to Create')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔊'),
                    new ButtonBuilder()
                        .setCustomId('vc_commands')
                        .setLabel('Commands')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📋'),
                    new ButtonBuilder()
                        .setCustomId('vc_help')
                        .setLabel('Help')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❓')
                );

            const panelMessage = await channel.send({
                embeds: [embed],
                components: [row]
            });

            if (config.panelMessageId) {
                try {
                    const oldChannel = interaction.guild.channels.cache.get(config.panelChannelId);
                    if (oldChannel) {
                        const oldMsg = await oldChannel.messages.fetch(config.panelMessageId).catch(() => null);
                        if (oldMsg) await oldMsg.delete().catch(() => {});
                    }
                } catch (e) {}
            }

            config.panelMessageId = panelMessage.id;
            config.panelChannelId = channel.id;
            await this.saveConfig();

            await interaction.editReply({ 
                content: `✅ Voice panel telah dikirim ke ${channel}!` 
            });

        } catch (error) {
            console.error('Panel error:', error);
            await interaction.editReply({ content: '❌ Error membuat panel!' });
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
                .setFooter({ text: 'TEMP VOICE • Ultimate Edition' })
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
                .setFooter({ text: 'TEMP VOICE • Ultimate Edition' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Config error:', error);
            await interaction.editReply({ content: '❌ Error fetching configuration!' });
        }
    }

    async handleLogs(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const logChannel = interaction.options.getChannel('channel');

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = await this.getGuildConfig(interaction.guild.id);
            config.logChannel = logChannel.id;
            await this.saveConfig();

            await interaction.editReply({ 
                content: `✅ Log channel set to ${logChannel}!` 
            });

        } catch (error) {
            console.error('Logs error:', error);
            await interaction.editReply({ content: '❌ Error setting log channel!' });
        }
    }

    async handleRoles(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const action = interaction.options.getString('action');
        const role = interaction.options.getRole('role');

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = await this.getGuildConfig(interaction.guild.id);
            
            if (!config.allowedRoles) config.allowedRoles = [];
            if (!config.blockedRoles) config.blockedRoles = [];

            if (action === 'allow') {
                if (!config.allowedRoles.includes(role.id)) {
                    config.allowedRoles.push(role.id);
                }
                await interaction.editReply({ content: `✅ Role ${role} sekarang bisa membuat voice channel!` });
            } else if (action === 'block') {
                if (!config.blockedRoles.includes(role.id)) {
                    config.blockedRoles.push(role.id);
                }
                await interaction.editReply({ content: `⛔ Role ${role} diblokir dari membuat voice channel!` });
            } else if (action === 'remove') {
                config.allowedRoles = config.allowedRoles.filter(id => id !== role.id);
                config.blockedRoles = config.blockedRoles.filter(id => id !== role.id);
                await interaction.editReply({ content: `✅ Role ${role} dihapus dari daftar!` });
            }
            
            await this.saveConfig();

        } catch (error) {
            console.error('Roles error:', error);
            await interaction.editReply({ content: '❌ Error managing roles!' });
        }
    }

    async handleReset(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guildChannels = Array.from(this.activeChannels.values())
                .filter(c => c.guildId === interaction.guild.id);
            
            for (const channelData of guildChannels) {
                await this.deleteVoiceChannel(channelData.id, 'Reset by admin');
            }
            
            this.config.delete(interaction.guild.id);
            await this.saveConfig();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🔄 **VOICE CREATOR RESET**')
                .setDescription('Semua konfigurasi dan channel telah direset!')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Reset error:', error);
            await interaction.editReply({ content: '❌ Error resetting system!' });
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
                    content: '❌ Kamu belum memiliki voice channel! Klik **Join to Create** di panel untuk membuat.' 
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🎤 **YOUR VOICE CHANNELS**')
                .setDescription(`Kamu memiliki **${userChannels.length}** voice channel`)
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
                    value: `📌 <#${channelData.id}>\n👥 Members: ${vc?.members.size || 0}/${channelData.userLimit || '∞'}\n🎚️ Bitrate: ${channelData.bitrate / 1000}kbps\n🌍 Region: ${channelData.region || 'Auto'}`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('My channel error:', error);
            await interaction.editReply({ content: '❌ Error fetching your channels!' });
        }
    }

    // ============ FIXED: VOICE DELETE COMMAND ============
    async handleDelete(interaction) {
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

            const confirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`vc_delete_confirm_${channelData.id}`)
                        .setLabel('✅ Ya, hapus channel')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`vc_delete_cancel_${channelData.id}`)
                        .setLabel('❌ Batal')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({
                content: '⚠️ **Yakin ingin menghapus voice channel ini?** Tindakan ini tidak dapat dibatalkan!',
                components: [confirmRow]
            });

            const filter = (i) => {
                return i.customId.startsWith('vc_delete_') && 
                       i.customId.includes(channelData.id) && 
                       i.user.id === interaction.user.id;
            };

            try {
                const confirmInteraction = await interaction.channel?.awaitMessageComponent({ 
                    filter, 
                    time: 15000 
                });

                if (confirmInteraction.customId.includes('confirm')) {
                    const channel = interaction.guild.channels.cache.get(channelData.id);
                    if (channel) {
                        await channel.delete('Deleted by owner');
                    }
                    
                    this.activeChannels.delete(channelData.id);
                    await this.saveChannels();
                    
                    await confirmInteraction.update({
                        content: '✅ **Voice channel berhasil dihapus!**',
                        components: []
                    });
                    
                    await this.logActivity(interaction.guild, 'CHANNEL_DELETE', {
                        channel: channelData.name,
                        owner: interaction.user.tag,
                        reason: 'Deleted by owner'
                    });
                    
                    console.log(`🏠 Voice channel ${channelData.id} deleted by owner ${interaction.user.tag}`);
                } else {
                    await confirmInteraction.update({
                        content: '❌ Penghapusan dibatalkan.',
                        components: []
                    });
                }
            } catch (timeoutError) {
                await interaction.editReply({
                    content: '⏰ Timeout! Penghapusan dibatalkan.',
                    components: []
                });
            }

        } catch (error) {
            console.error('Delete error:', error);
            await interaction.editReply({ content: '❌ Error deleting channel!' });
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

            await interaction.editReply({ 
                content: `✅ Nama voice channel diubah menjadi **${newName}**!` 
            });

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

            await interaction.editReply({ 
                content: `✅ User limit diubah menjadi **${limit === 0 ? 'No limit' : limit}**!` 
            });

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

            await interaction.editReply({ 
                content: `✅ Bitrate diubah menjadi **${bitrate}kbps**!` 
            });

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

            await interaction.editReply({ 
                content: `✅ Voice region diubah menjadi **${region}**!` 
            });

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

            await interaction.editReply({ 
                content: '🔒 **Channel locked!** Hanya kamu yang bisa join.' 
            });

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

            await interaction.editReply({ 
                content: '🔓 **Channel unlocked!** Semua orang bisa join.' 
            });

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

            await interaction.editReply({ 
                content: '👻 **Channel hidden!** Hanya kamu yang bisa melihat channel ini.' 
            });

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

            await interaction.editReply({ 
                content: '👀 **Channel revealed!** Semua orang bisa melihat channel ini.' 
            });

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

            await interaction.editReply({ 
                content: `✅ Kamu sekarang menjadi owner **${voiceState.channel.name}**!` 
            });

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

            await interaction.editReply({ 
                content: `✅ Ownership ditransfer ke **${newOwner.tag}**!` 
            });

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

            await interaction.editReply({ 
                content: `✅ **${user.tag}** diizinkan join ke channel ini!` 
            });

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

            await interaction.editReply({ 
                content: `⛔ **${user.tag}** diblokir dari channel ini!` 
            });

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
                .setTitle('🔐 **TRUSTED USERS**')
                .setDescription(`Daftar user yang bisa join saat channel di-lock:`);

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
                embed.setDescription('Belum ada trusted users.');
            }

            embed.setTimestamp();

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
                    { name: '🔒 Locked', value: channelData.locked ? '✅' : '❌', inline: true },
                    { name: '👻 Hidden', value: channelData.hidden ? '✅' : '❌', inline: true }
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
                .setDescription('Default settings untuk channel mu telah disimpan!')
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
                .setDescription('🎤 Ultimate Voice Channel Creator System - Full Fitur')
                
                // ============ ADMIN COMMANDS ============
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
                    sub.setName('panel')
                        .setDescription('[ADMIN] Kirim voice panel ke channel')
                        .addChannelOption(opt => 
                            opt.setName('channel')
                                .setDescription('Channel untuk panel')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('config')
                        .setDescription('[ADMIN] Lihat konfigurasi voice creator'))
                .addSubcommand(sub =>
                    sub.setName('logs')
                        .setDescription('[ADMIN] Set channel untuk logs')
                        .addChannelOption(opt => 
                            opt.setName('channel')
                                .setDescription('Channel untuk logs')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('roles')
                        .setDescription('[ADMIN] Atur role yang boleh/diblokir')
                        .addStringOption(opt =>
                            opt.setName('action')
                                .setDescription('Tindakan untuk role')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Allow', value: 'allow' },
                                    { name: 'Block', value: 'block' },
                                    { name: 'Remove', value: 'remove' }
                                ))
                        .addRoleOption(opt =>
                            opt.setName('role')
                                .setDescription('Role yang diatur')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('reset')
                        .setDescription('[ADMIN] Reset semua konfigurasi dan channel'))
                .addSubcommand(sub =>
                    sub.setName('disable')
                        .setDescription('[ADMIN] Disable voice creator system'))
                
                // ============ USER COMMANDS ============
                .addSubcommand(sub =>
                    sub.setName('my')
                        .setDescription('Lihat semua voice channel milikmu'))
                .addSubcommand(sub =>
                    sub.setName('delete')  // <=== PASTIKAN NAMANYA 'delete'
                        .setDescription('🗑️ Hapus voice channel milikmu'))
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

    static async handleCommand(interaction, plugin) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                // ADMIN COMMANDS
                case 'setup': await plugin.handleSetup(interaction); break;
                case 'panel': await plugin.handlePanel(interaction); break;
                case 'config': await plugin.handleConfig(interaction); break;
                case 'logs': await plugin.handleLogs(interaction); break;
                case 'roles': await plugin.handleRoles(interaction); break;
                case 'reset': await plugin.handleReset(interaction); break;
                case 'disable': await plugin.handleDisable(interaction); break;
                
                // USER COMMANDS - PASTIKAN NAMA CASE NYA SAMA!
                case 'my': await plugin.handleMyChannel(interaction); break;
                case 'delete': await plugin.handleDelete(interaction); break;  // <=== INI HARUS 'delete'
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
                        content: `❌ Subcommand \`${subcommand}\` tidak dikenal!`, 
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
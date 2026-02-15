// afk-keeper.js - AFK VOICE CHANNEL KEEPER (FINAL FIX!)
// KHUSUS UNTUK PTERODACTYL ALPINE LINUX
// Menggunakan @discordjs/voice@0.15.0 (STABLE)

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ChannelType,
    PermissionFlagsBits 
} = require('discord.js');
const { 
    joinVoiceChannel, 
    VoiceConnectionStatus,
    entersState
} = require('@discordjs/voice');
const fs = require('fs').promises;
const path = require('path');

class AFKKeeper {
    constructor(client) {
        this.client = client;
        this.name = 'afkkeeper';
        this.version = '2.2.0';
        this.description = 'Menjaga voice channel tetap aktif 24/7 - FINAL FIX';
        
        this.configPath = path.join(__dirname, 'data', 'afk_keeper_config.json');
        this.activeKeepers = new Map();
        this.keepAliveIntervals = new Map();
        this.connections = new Map();
        
        this.loadConfig();
    }

    async init() {
        console.log('🛡️ AFK Keeper System v2.2.0 - PTERODACTYL EDITION');
        console.log('🛡️ Using @discordjs/voice@0.15.0 (STABLE)');
        
        // Auto restart setelah 5 detik
        setTimeout(() => {
            this.restoreAllKeepers();
        }, 5000);
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
            
            for (const [channelId, config] of Object.entries(configs)) {
                this.activeKeepers.set(channelId, config);
            }
            
            console.log(`🛡️ Loaded ${this.activeKeepers.size} AFK Keepers`);
        } catch (error) {
            console.error('AFK Keeper load error:', error);
        }
    }

    async saveConfig() {
        try {
            const obj = {};
            this.activeKeepers.forEach((config, channelId) => {
                obj[channelId] = config;
            });
            await fs.writeFile(this.configPath, JSON.stringify(obj, null, 2));
        } catch (error) {
            console.error('AFK Keeper save error:', error);
        }
    }

    async restoreAllKeepers() {
        console.log('🛡️ Restoring all AFK Keepers...');
        
        for (const [channelId, config] of this.activeKeepers) {
            try {
                const guild = this.client.guilds.cache.get(config.guildId);
                if (!guild) {
                    this.activeKeepers.delete(channelId);
                    this.stopKeeper(channelId);
                    continue;
                }
                
                const channel = guild.channels.cache.get(channelId);
                if (!channel) {
                    this.activeKeepers.delete(channelId);
                    this.stopKeeper(channelId);
                    continue;
                }
                
                // Cek apakah bot sudah di voice channel
                const botMember = guild.members.cache.get(this.client.user.id);
                if (botMember.voice.channelId === channelId) {
                    console.log(`🛡️ Already in ${channel.name}, maintaining...`);
                    this.startKeepAlive(channelId, config);
                } else {
                    // Coba join ulang
                    await this.joinVoiceChannel(channel, config);
                }
            } catch (error) {
                console.error(`Error restoring keeper for ${channelId}:`, error.message);
            }
        }
    }

    // ============ FINAL FIX: JOIN VOICE CHANNEL ============
    async joinVoiceChannel(channel, config) {
        try {
            console.log(`🛡️ Attempting to join ${channel.name}...`);
            
            // Cek permission
            const botMember = channel.guild.members.cache.get(this.client.user.id);
            if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.Connect)) {
                throw new Error('Bot tidak punya permission Connect!');
            }

            // JOIN VOICE CHANNEL - VERSI STABLE 0.15.0
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });

            // Tunggu koneksi siap
            await entersState(connection, VoiceConnectionStatus.Ready, 15000);
            
            // Simpan connection
            this.connections.set(channel.id, connection);
            
            console.log(`🛡️✅ SUCCESS: Joined ${channel.name} (${channel.id})`);
            
            // Setup connection listeners
            this.setupConnectionListeners(channel.id, connection, config);
            
            // Start keep alive
            this.startKeepAlive(channel.id, config);
            
            return true;
            
        } catch (error) {
            console.error(`🛡️❌ FAILED: ${channel.name} - ${error.message}`);
            return false;
        }
    }

    setupConnectionListeners(channelId, connection, config) {
        // Handle disconnection
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log(`🛡️ Disconnected from ${config.channelName}, reconnecting in 5s...`);
            
            setTimeout(async () => {
                try {
                    const guild = this.client.guilds.cache.get(config.guildId);
                    if (!guild) return;
                    
                    const channel = guild.channels.cache.get(channelId);
                    if (!channel) return;
                    
                    await this.joinVoiceChannel(channel, config);
                } catch (e) {
                    console.error(`🛡️ Reconnect failed: ${e.message}`);
                }
            }, 5000);
        });

        // Handle destroyed
        connection.on(VoiceConnectionStatus.Destroyed, () => {
            console.log(`🛡️ Connection destroyed for ${config.channelName}`);
            this.connections.delete(channelId);
        });

        // Handle error
        connection.on('error', (error) => {
            console.error(`🛡️ Connection error for ${config.channelName}:`, error.message);
        });

        // Handle debug (optional, enable if needed)
        // connection.on('debug', (debug) => {
        //     console.log(`🛡️ Debug: ${debug}`);
        // });
    }

    startKeepAlive(channelId, config) {
        // Hapus interval lama
        this.stopKeeper(channelId);
        
        console.log(`🛡️ Starting keep-alive for ${config.channelName} (${config.interval/1000}s interval)`);
        
        // Kirim ping setiap interval
        const interval = setInterval(async () => {
            try {
                const connection = this.connections.get(channelId);
                
                if (!connection) {
                    console.log(`🛡️ No connection for ${config.channelName}, reconnecting...`);
                    
                    const guild = this.client.guilds.cache.get(config.guildId);
                    if (!guild) return;
                    
                    const channel = guild.channels.cache.get(channelId);
                    if (!channel) return;
                    
                    await this.joinVoiceChannel(channel, config);
                    return;
                }
                
                if (connection.state.status !== VoiceConnectionStatus.Ready) {
                    console.log(`🛡️ Connection not ready for ${config.channelName}, status: ${connection.state.status}`);
                    return;
                }
                
                // Kirim ping
                const ping = connection.ping;
                console.log(`🛡️ Heartbeat: ${config.channelName} | Ping: ${ping}ms`);
                
            } catch (error) {
                console.error(`🛡️ Keep-alive error for ${config.channelName}:`, error.message);
            }
        }, config.interval || 30000);
        
        this.keepAliveIntervals.set(channelId, interval);
    }

    stopKeeper(channelId) {
        if (this.keepAliveIntervals.has(channelId)) {
            clearInterval(this.keepAliveIntervals.get(channelId));
            this.keepAliveIntervals.delete(channelId);
        }
        
        if (this.connections.has(channelId)) {
            try {
                const connection = this.connections.get(channelId);
                connection.destroy();
            } catch (e) {}
            this.connections.delete(channelId);
        }
    }

    async leaveVoiceChannel(channelId) {
        try {
            const config = this.activeKeepers.get(channelId);
            if (!config) return false;
            
            this.stopKeeper(channelId);
            this.activeKeepers.delete(channelId);
            await this.saveConfig();
            
            console.log(`🛡️ Left ${config.channelName}`);
            return true;
        } catch (error) {
            console.error(`Error leaving ${channelId}:`, error.message);
            return false;
        }
    }

    // ==================== COMMAND HANDLERS ====================
    async handleStart(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const channel = interaction.options.getChannel('channel');
        const interval = interaction.options.getInteger('interval') || 30;

        await interaction.deferReply({ ephemeral: true });

        try {
            if (this.activeKeepers.has(channel.id)) {
                return interaction.editReply({ 
                    content: `❌ Channel <#${channel.id}> sudah dijaga oleh AFK Keeper!` 
                });
            }

            const botMember = interaction.guild.members.cache.get(this.client.user.id);
            if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.Connect)) {
                return interaction.editReply({ 
                    content: '❌ Bot tidak punya permission **Connect** ke voice channel ini!' 
                });
            }

            const config = {
                guildId: interaction.guild.id,
                channelId: channel.id,
                channelName: channel.name,
                startedBy: interaction.user.id,
                startedAt: Date.now(),
                interval: interval * 1000
            };

            const joined = await this.joinVoiceChannel(channel, config);
            
            if (!joined) {
                return interaction.editReply({ 
                    content: '❌ **GAGAL JOIN VOICE CHANNEL!**\n\n' +
                            '📌 **SOLUSI PTERODACTYL:**\n' +
                            '1️⃣ Hapus node_modules: `rm -rf node_modules`\n' +
                            '2️⃣ Install ulang: `npm install @discordjs/voice@0.15.0`\n' +
                            '3️⃣ Install libsodium: `npm install libsodium-wrappers@0.7.13`\n' +
                            '4️⃣ Restart bot\n\n' +
                            '🔄 **Coba lagi setelah instalasi!**' 
                });
            }

            this.activeKeepers.set(channel.id, config);
            await this.saveConfig();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🛡️ **AFK KEEPER AKTIF**')
                .setDescription(`✅ Bot berhasil join ke **${channel.name}**!`)
                .addFields(
                    { name: '📌 Channel', value: `<#${channel.id}>`, inline: true },
                    { name: '⏱️ Interval', value: `${interval} detik`, inline: true },
                    { name: '👑 Started By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📅 Started At', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
                )
                .setFooter({ text: 'AFK Keeper • Pterodactyl Edition v2.2' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('AFK Keeper start error:', error);
            await interaction.editReply({ 
                content: `❌ Error: ${error.message.substring(0, 100)}` 
            });
        }
    }

    async handleStop(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const channel = interaction.options.getChannel('channel');

        await interaction.deferReply({ ephemeral: true });

        try {
            if (!this.activeKeepers.has(channel.id)) {
                return interaction.editReply({ 
                    content: `❌ Channel <#${channel.id}> tidak dalam pengawasan AFK Keeper!` 
                });
            }

            await this.leaveVoiceChannel(channel.id);

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🛡️ **AFK KEEPER DIMATIKAN**')
                .setDescription(`✅ Bot berhenti menjaga **${channel.name}**`)
                .addFields(
                    { name: '📌 Channel', value: `<#${channel.id}>`, inline: true },
                    { name: '👑 Stopped By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📅 Stopped At', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('AFK Keeper stop error:', error);
            await interaction.editReply({ content: `❌ Error: ${error.message.substring(0, 100)}` });
        }
    }

    async handleList(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guildKeepers = Array.from(this.activeKeepers.values())
                .filter(k => k.guildId === interaction.guild.id);

            if (guildKeepers.length === 0) {
                return interaction.editReply({ 
                    content: '❌ Tidak ada AFK Keeper yang aktif di server ini!' 
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🛡️ **ACTIVE AFK KEEPERS**')
                .setDescription(`**${guildKeepers.length}** channel sedang dijaga`)
                .setTimestamp();

            for (const [index, keeper] of guildKeepers.entries()) {
                const channel = interaction.guild.channels.cache.get(keeper.channelId);
                const connection = this.connections.get(keeper.channelId);
                const status = connection ? '🟢 Online' : '🔴 Offline';
                
                embed.addFields({
                    name: `${index + 1}. ${keeper.channelName} ${status}`,
                    value: `📌 ${channel ? `<#${keeper.channelId}>` : '❌ Deleted'}\n⏱️ Interval: ${keeper.interval/1000} detik\n👑 Started: <@${keeper.startedBy}>\n📅 Since: <t:${Math.floor(keeper.startedAt/1000)}:R>\n📊 Ping: ${connection?.ping || 0}ms`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('AFK Keeper list error:', error);
            await interaction.editReply({ content: `❌ Error: ${error.message.substring(0, 100)}` });
        }
    }

    async handleStatus(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const botMember = interaction.guild.members.cache.get(this.client.user.id);
            const currentChannel = botMember.voice.channel;
            const activeConnections = Array.from(this.connections.values()).filter(c => c?.state?.status === VoiceConnectionStatus.Ready).length;
            
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🛡️ **AFK KEEPER STATUS**')
                .addFields(
                    { name: '🤖 Bot Status', value: '🟢 Online', inline: true },
                    { name: '📊 Total Keepers', value: `${this.activeKeepers.size}`, inline: true },
                    { name: '🔊 Active Connections', value: `${activeConnections}`, inline: true },
                    { name: '🎤 Current Voice', value: currentChannel ? `<#${currentChannel.id}>` : '❌ None', inline: true },
                    { name: '📈 Memory Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                    { name: '⏱️ Uptime', value: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`, inline: true }
                )
                .setFooter({ text: 'AFK Keeper • Pterodactyl Edition v2.2' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('AFK Keeper status error:', error);
            await interaction.editReply({ content: `❌ Error: ${error.message.substring(0, 100)}` });
        }
    }

    async handleCleanup(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            let cleaned = 0;
            
            for (const [channelId, config] of this.activeKeepers) {
                if (config.guildId !== interaction.guild.id) continue;
                
                const channel = interaction.guild.channels.cache.get(channelId);
                if (!channel) {
                    this.stopKeeper(channelId);
                    this.activeKeepers.delete(channelId);
                    cleaned++;
                }
            }

            await this.saveConfig();

            await interaction.editReply({ 
                content: `✅ **${cleaned}** channel tidak valid telah dibersihkan!` 
            });

        } catch (error) {
            console.error('AFK Keeper cleanup error:', error);
            await interaction.editReply({ content: `❌ Error: ${error.message.substring(0, 100)}` });
        }
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('afk')
                .setDescription('🛡️ AFK Keeper - Jaga Voice Channel Tetap Aktif 24/7')
                
                .addSubcommand(sub =>
                    sub.setName('start')
                        .setDescription('[ADMIN] Mulai jaga voice channel')
                        .addChannelOption(opt => 
                            opt.setName('channel')
                                .setDescription('Voice channel yang dijaga')
                                .addChannelTypes(ChannelType.GuildVoice)
                                .setRequired(true))
                        .addIntegerOption(opt => 
                            opt.setName('interval')
                                .setDescription('Interval keep-alive dalam detik (default: 30)')
                                .setMinValue(10)
                                .setMaxValue(300)
                                .setRequired(false)))
                
                .addSubcommand(sub =>
                    sub.setName('stop')
                        .setDescription('[ADMIN] Hentikan jaga voice channel')
                        .addChannelOption(opt => 
                            opt.setName('channel')
                                .setDescription('Voice channel yang dihentikan')
                                .addChannelTypes(ChannelType.GuildVoice)
                                .setRequired(true)))
                
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('Lihat semua AFK Keeper yang aktif'))
                
                .addSubcommand(sub =>
                    sub.setName('status')
                        .setDescription('Lihat status AFK Keeper'))
                
                .addSubcommand(sub =>
                    sub.setName('cleanup')
                        .setDescription('[ADMIN] Bersihkan channel yang tidak valid'))
        ];
    }

    static async handleCommand(interaction, plugin) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case 'start': await plugin.handleStart(interaction); break;
                case 'stop': await plugin.handleStop(interaction); break;
                case 'list': await plugin.handleList(interaction); break;
                case 'status': await plugin.handleStatus(interaction); break;
                case 'cleanup': await plugin.handleCleanup(interaction); break;
                default:
                    await interaction.reply({ 
                        content: '❌ Subcommand tidak dikenal!', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error(`AFK Keeper command error (${subcommand}):`, error);
            
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

module.exports = AFKKeeper;
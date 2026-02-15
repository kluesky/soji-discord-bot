// giveaway.js - FULL GIVEAWAY SYSTEM
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class GiveawayPlugin {
    constructor(client) {
        this.client = client;
        this.name = 'giveaway';
        this.version = '1.0.0';
        this.description = 'Sistem giveaway lengkap dengan auto draw';
        
        this.dbPath = path.join(__dirname, 'data', 'giveaways.json');
        this.giveaways = new Map();
        
        this.loadGiveaways();
        this.startGiveawayChecker();
    }

    async init() {
        console.log('🎪 Giveaway system initialized');
    }

    async loadGiveaways() {
        try {
            // Buat folder data jika belum ada
            const dataDir = path.join(__dirname, 'data');
            await fs.mkdir(dataDir, { recursive: true });
            
            const data = await fs.readFile(this.dbPath, 'utf8').catch(async () => {
                await fs.writeFile(this.dbPath, '{}');
                return '{}';
            });
            
            const parsed = JSON.parse(data);
            
            for (const [messageId, giveaway] of Object.entries(parsed)) {
                // Cek apakah giveaway masih aktif (belom lewat)
                if (giveaway.status === 'active' && giveaway.endTime > Date.now()) {
                    this.giveaways.set(messageId, giveaway);
                }
            }
            
            console.log(`🎪 Loaded ${this.giveaways.size} active giveaways`);
        } catch (error) {
            console.log('📝 No giveaways found, creating new database...');
            await fs.writeFile(this.dbPath, '{}');
        }
    }

    async saveGiveaways() {
        const obj = {};
        this.giveaways.forEach((giveaway, messageId) => {
            obj[messageId] = giveaway;
        });
        await fs.writeFile(this.dbPath, JSON.stringify(obj, null, 2));
    }

    startGiveawayChecker() {
        // Check every 10 seconds for ended giveaways
        setInterval(async () => {
            const now = Date.now();
            
            for (const [messageId, giveaway] of this.giveaways) {
                if (giveaway.endTime <= now && giveaway.status === 'active') {
                    await this.endGiveaway(messageId, giveaway);
                }
            }
        }, 10000);
    }

    parseDuration(duration) {
        const unit = duration.slice(-1);
        const value = parseInt(duration.slice(0, -1));
        
        if (isNaN(value)) return 60000; // default 1 menit
        
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return value * 60 * 1000; // Default minutes
        }
    }

    // ==================== CREATE GIVEAWAY ====================
    async createGiveaway(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
            return interaction.reply({ 
                content: '❌ Kamu butuh permission **Manage Events**!', 
                ephemeral: true 
            });
        }

        const prize = interaction.options.getString('prize');
        const winners = interaction.options.getInteger('winners');
        const duration = interaction.options.getString('duration');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const requiredRole = interaction.options.getRole('required_role');
        const description = interaction.options.getString('description') || 'Klik tombol 🎉 untuk ikut giveaway!';

        await interaction.deferReply({ ephemeral: true });

        try {
            // Parse duration
            const durationMs = this.parseDuration(duration);
            const endTime = Date.now() + durationMs;
            const endTimestamp = Math.floor(endTime / 1000);

            // Create giveaway embed
            const embed = new EmbedBuilder()
                .setColor(0xFF1493)
                .setTitle('🎉 **GIVEAWAY**')
                .setDescription(`**${prize}**\n\n${description}`)
                .addFields(
                    { name: '🏆 Winners', value: `${winners}`, inline: true },
                    { name: '⏰ Ends', value: `<t:${endTimestamp}:R>`, inline: true },
                    { name: '👥 Hosted by', value: `${interaction.user}`, inline: true }
                )
                .setTimestamp(endTime)
                .setFooter({ 
                    text: `Giveaway ends at • ${new Date(endTime).toLocaleString('id-ID')}`,
                    iconURL: interaction.guild.iconURL() || this.client.user.displayAvatarURL()
                });

            if (requiredRole) {
                embed.addFields({ name: '📌 Required Role', value: `${requiredRole}`, inline: false });
            }

            // Create button
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('giveaway_join')
                        .setLabel('🎉 Join Giveaway')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('giveaway_leave')
                        .setLabel('❌ Leave')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Send message
            const message = await channel.send({
                content: '@everyone 🎪 **GIVEAWAY BARU!**',
                embeds: [embed],
                components: [row]
            });

            // Save giveaway
            const giveawayId = message.id;
            this.giveaways.set(giveawayId, {
                messageId: giveawayId,
                channelId: channel.id,
                guildId: interaction.guild.id,
                hostId: interaction.user.id,
                prize,
                winners,
                endTime,
                description,
                requiredRole: requiredRole?.id || null,
                participants: [],
                status: 'active',
                createdAt: Date.now()
            });

            await this.saveGiveaways();

            // Confirm to user
            const confirmEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ **GIVEAWAY CREATED**')
                .setDescription(`Giveaway berhasil dibuat di ${channel}!`)
                .addFields(
                    { name: '🎁 Prize', value: prize, inline: true },
                    { name: '👥 Winners', value: `${winners}`, inline: true },
                    { name: '⏰ Duration', value: duration, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [confirmEmbed] });

        } catch (error) {
            console.error('Giveaway creation error:', error);
            await interaction.editReply({ 
                content: '❌ Error membuat giveaway! Pastikan format durasi benar (contoh: 10m, 1h, 2d)' 
            });
        }
    }

    // ==================== END GIVEAWAY ====================
    async endGiveaway(messageId, giveaway) {
        if (giveaway.status !== 'active') return;

        giveaway.status = 'ended';
        giveaway.endedAt = Date.now();
        
        try {
            const guild = this.client.guilds.cache.get(giveaway.guildId);
            if (!guild) return;

            const channel = guild.channels.cache.get(giveaway.channelId);
            if (!channel) return;

            const message = await channel.messages.fetch(messageId).catch(() => null);
            
            // Update embed
            if (message) {
                const endedEmbed = EmbedBuilder.from(message.embeds[0])
                    .setColor(0x808080)
                    .setFooter({ text: 'Giveaway ended' });

                await message.edit({ embeds: [endedEmbed], components: [] });
            }

            // Select winners
            const participants = giveaway.participants || [];
            
            if (participants.length === 0) {
                if (channel) {
                    await channel.send('❌ Tidak ada peserta, giveaway dibatalkan!');
                }
                this.giveaways.delete(messageId);
                await this.saveGiveaways();
                return;
            }

            // Pick random winners
            const winners = [];
            const shuffled = [...participants].sort(() => 0.5 - Math.random());
            
            for (let i = 0; i < Math.min(giveaway.winners, shuffled.length); i++) {
                winners.push(shuffled[i]);
            }

            // Save winners
            giveaway.winnersList = winners;

            // Announce winners
            const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
            
            const resultEmbed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🎉 **GIVEAWAY WINNERS**')
                .setDescription(`**Prize:** ${giveaway.prize}`)
                .addFields(
                    { name: '🏆 Winners', value: winnerMentions || 'None', inline: false },
                    { name: '👥 Total Participants', value: `${participants.length}`, inline: true },
                    { name: '🎫 Host', value: `<@${giveaway.hostId}>`, inline: true }
                )
                .setTimestamp();

            if (channel) {
                await channel.send({
                    content: `🎉 **SELAMAT!** ${winnerMentions} kamu menang **${giveaway.prize}**!`,
                    embeds: [resultEmbed]
                });
            }

            // Save to database
            this.giveaways.delete(messageId);
            await this.saveGiveaways();

        } catch (error) {
            console.error('Error ending giveaway:', error);
        }
    }

    // ==================== END GIVEAWAY EARLY ====================
    async endGiveawayEarly(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
            return interaction.reply({ 
                content: '❌ Kamu butuh permission **Manage Events**!', 
                ephemeral: true 
            });
        }

        const messageId = interaction.options.getString('message_id');
        const giveaway = this.giveaways.get(messageId);

        if (!giveaway) {
            return interaction.reply({ 
                content: '❌ Giveaway tidak ditemukan atau sudah berakhir!', 
                ephemeral: true 
            });
        }

        if (giveaway.status !== 'active') {
            return interaction.reply({ 
                content: '❌ Giveaway sudah berakhir!', 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            await this.endGiveaway(messageId, giveaway);
            
            await interaction.editReply({ 
                content: '✅ Giveaway berhasil diakhiri lebih awal!' 
            });

        } catch (error) {
            console.error('End giveaway early error:', error);
            await interaction.editReply({ 
                content: '❌ Error mengakhiri giveaway!' 
            });
        }
    }

    // ==================== REROLL WINNER ====================
    async handleReroll(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
            return interaction.reply({ 
                content: '❌ Kamu butuh permission **Manage Events**!', 
                ephemeral: true 
            });
        }

        const messageId = interaction.options.getString('message_id');
        
        await interaction.deferReply({ ephemeral: true });

        try {
            // Cek di database dulu
            const data = await fs.readFile(this.dbPath, 'utf8').catch(() => '{}');
            const allGiveaways = JSON.parse(data);
            const endedGiveaway = allGiveaways[messageId];

            if (!endedGiveaway) {
                return interaction.editReply({ 
                    content: '❌ Giveaway tidak ditemukan!' 
                });
            }

            const participants = endedGiveaway.participants || [];
            
            if (participants.length === 0) {
                return interaction.editReply({ 
                    content: '❌ Tidak ada peserta untuk di-reroll!' 
                });
            }

            // Filter out old winners
            const oldWinners = endedGiveaway.winnersList || [];
            const availableParticipants = participants.filter(p => !oldWinners.includes(p));
            
            if (availableParticipants.length === 0) {
                return interaction.editReply({ 
                    content: '❌ Semua peserta sudah pernah menang!' 
                });
            }

            // Pick new winner
            const newWinner = availableParticipants[Math.floor(Math.random() * availableParticipants.length)];

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🎲 **GIVEAWAY REROLL**')
                .setDescription(`**Prize:** ${endedGiveaway.prize}`)
                .addFields(
                    { name: '🎉 New Winner', value: `<@${newWinner}>`, inline: false },
                    { name: '🎫 Host', value: `<@${endedGiveaway.hostId}>`, inline: true },
                    { name: '📊 Participants', value: `${participants.length}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            // Send to channel
            const guild = this.client.guilds.cache.get(endedGiveaway.guildId);
            if (guild) {
                const channel = guild.channels.cache.get(endedGiveaway.channelId);
                if (channel) {
                    await channel.send({
                        content: `🎲 **REROLL!** Selamat <@${newWinner}>, kamu menang **${endedGiveaway.prize}**!`,
                        embeds: [embed]
                    });
                }
            }

        } catch (error) {
            console.error('Reroll error:', error);
            await interaction.editReply({ 
                content: '❌ Error melakukan reroll!' 
            });
        }
    }

    // ==================== LIST GIVEAWAYS ====================
    async listGiveaways(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const activeGiveaways = Array.from(this.giveaways.values())
                .filter(g => g.guildId === interaction.guild.id && g.status === 'active');

            if (activeGiveaways.length === 0) {
                return interaction.editReply({ 
                    content: '📭 Tidak ada giveaway aktif di server ini!' 
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0xFF1493)
                .setTitle('🎪 **ACTIVE GIVEAWAYS**')
                .setDescription(`**${activeGiveaways.length}** giveaway sedang berlangsung:`)
                .setTimestamp();

            activeGiveaways.forEach((giveaway, index) => {
                const endTime = Math.floor(giveaway.endTime / 1000);
                embed.addFields({
                    name: `${index + 1}. 🎁 ${giveaway.prize}`,
                    value: `🏆 Winners: ${giveaway.winners} | 👥 Participants: ${giveaway.participants?.length || 0}\n⏰ Ends: <t:${endTime}:R> | 🆔 \`${giveaway.messageId}\``,
                    inline: false
                });
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('List giveaways error:', error);
            await interaction.editReply({ 
                content: '❌ Error mengambil daftar giveaway!' 
            });
        }
    }

    // ==================== INTERACTION HANDLER ====================
    async handleInteraction(interaction) {
        if (!interaction.isButton()) return;
        
        const { customId } = interaction;

        if (customId === 'giveaway_join') {
            const messageId = interaction.message.id;
            const giveaway = this.giveaways.get(messageId);

            if (!giveaway) {
                return interaction.reply({ 
                    content: '❌ Giveaway sudah berakhir!', 
                    ephemeral: true 
                });
            }

            if (giveaway.status !== 'active') {
                return interaction.reply({ 
                    content: '❌ Giveaway sudah berakhir!', 
                    ephemeral: true 
                });
            }

            // Check required role
            if (giveaway.requiredRole) {
                if (!interaction.member.roles.cache.has(giveaway.requiredRole)) {
                    return interaction.reply({ 
                        content: `❌ Kamu butuh role <@&${giveaway.requiredRole}> untuk ikut giveaway ini!`, 
                        ephemeral: true 
                    });
                }
            }

            // Initialize participants array if not exists
            if (!giveaway.participants) {
                giveaway.participants = [];
            }

            // Add participant
            if (!giveaway.participants.includes(interaction.user.id)) {
                giveaway.participants.push(interaction.user.id);
                await this.saveGiveaways();
                
                await interaction.reply({ 
                    content: '✅ Kamu berhasil join giveaway!', 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: '❌ Kamu sudah join giveaway ini!', 
                    ephemeral: true 
                });
            }

        } else if (customId === 'giveaway_leave') {
            const messageId = interaction.message.id;
            const giveaway = this.giveaways.get(messageId);

            if (!giveaway || giveaway.status !== 'active') {
                return interaction.reply({ 
                    content: '❌ Giveaway tidak aktif!', 
                    ephemeral: true 
                });
            }

            if (!giveaway.participants) {
                giveaway.participants = [];
            }

            const index = giveaway.participants.indexOf(interaction.user.id);
            if (index !== -1) {
                giveaway.participants.splice(index, 1);
                await this.saveGiveaways();
                
                await interaction.reply({ 
                    content: '✅ Kamu keluar dari giveaway!', 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: '❌ Kamu tidak ikut giveaway ini!', 
                    ephemeral: true 
                });
            }
        }
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('giveaway')
                .setDescription('🎪 Giveaway system')
                .addSubcommand(sub =>
                    sub.setName('start')
                        .setDescription('[ADMIN] Mulai giveaway baru')
                        .addStringOption(opt => 
                            opt.setName('prize')
                                .setDescription('Hadiah giveaway')
                                .setRequired(true))
                        .addIntegerOption(opt => 
                            opt.setName('winners')
                                .setDescription('Jumlah pemenang')
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(10))
                        .addStringOption(opt => 
                            opt.setName('duration')
                                .setDescription('Durasi (contoh: 10m, 1h, 2d)')
                                .setRequired(true))
                        .addChannelOption(opt => 
                            opt.setName('channel')
                                .setDescription('Channel untuk giveaway')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(false))
                        .addRoleOption(opt => 
                            opt.setName('required_role')
                                .setDescription('Role yang diperlukan untuk join')
                                .setRequired(false))
                        .addStringOption(opt => 
                            opt.setName('description')
                                .setDescription('Deskripsi giveaway')
                                .setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('end')
                        .setDescription('[ADMIN] Akhiri giveaway lebih awal')
                        .addStringOption(opt => 
                            opt.setName('message_id')
                                .setDescription('ID pesan giveaway')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('reroll')
                        .setDescription('[ADMIN] Reroll pemenang giveaway')
                        .addStringOption(opt => 
                            opt.setName('message_id')
                                .setDescription('ID pesan giveaway')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('Lihat giveaway aktif'))
        ];
    }

    static async handleCommand(interaction, plugin) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case 'start':
                    await plugin.createGiveaway(interaction);
                    break;
                case 'end':
                    await plugin.endGiveawayEarly(interaction);
                    break;
                case 'reroll':
                    await plugin.handleReroll(interaction);
                    break;
                case 'list':
                    await plugin.listGiveaways(interaction);
                    break;
                default:
                    await interaction.reply({ 
                        content: '❌ Subcommand tidak dikenal!', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error(`Giveaway command error (${subcommand}):`, error);
            
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

module.exports = GiveawayPlugin;
// ticket.js - TICKET SYSTEM SEPERTI TICKET KING
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    PermissionFlagsBits,
    OverwriteType
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class TicketSystem {
    constructor(client) {
        this.client = client;
        this.tickets = new Map();
        this.config = new Map();
        this.configPath = path.join(__dirname, 'ticket_config.json');
        this.loadConfig();
        
        // Default configuration
        this.defaultConfig = {
            ticketCategory: null,
            supportRole: null, // Role untuk support team
            logChannel: null,
            autoTagRoles: ['1431273027424751771', '1430386847145656441'], // Default auto tag roles
            ticketMessage: '🎫 **BUAT TICKET**\nKlik tombol di bawah untuk membuat tiket bantuan!',
            ticketEmbedColor: 0x1E90FF,
            ticketCloseReason: 'Ticket ditutup',
            autoClose: false,
            autoCloseTime: 86400, // 24 jam dalam detik
            transcript: true,
            allowUserClose: true,
            maxTicketsPerUser: 3
        };
    }

    async loadConfig() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            const configs = JSON.parse(data);
            
            for (const [guildId, config] of Object.entries(configs)) {
                this.config.set(guildId, { ...this.defaultConfig, ...config });
            }
            
            console.log(`✅ Loaded ticket config for ${this.config.size} guilds`);
        } catch (error) {
            console.log('📝 No ticket config found, creating default...');
            await this.saveConfig();
        }
    }

    async saveConfig() {
        const configs = {};
        this.config.forEach((config, guildId) => {
            configs[guildId] = config;
        });
        
        await fs.writeFile(this.configPath, JSON.stringify(configs, null, 2));
    }

    async getGuildConfig(guildId) {
        if (!this.config.has(guildId)) {
            const config = { ...this.defaultConfig };
            this.config.set(guildId, config);
            await this.saveConfig();
        }
        return this.config.get(guildId);
    }

    async updateGuildConfig(guildId, updates) {
        const config = await this.getGuildConfig(guildId);
        const newConfig = { ...config, ...updates };
        this.config.set(guildId, newConfig);
        await this.saveConfig();
        return newConfig;
    }

    // ==================== EMBED CREATION ====================

    createTicketEmbed(title, description, fields = [], footer = null) {
        const config = this.config.get('global') || {};
        
        const embed = new EmbedBuilder()
            .setColor(config.ticketEmbedColor || 0x1E90FF)
            .setTitle(`**Lyora Ticket**`)
            .setDescription(description)
            .setImage('https://media1.giphy.com/media/v1.Y2lkPTZjMDliOTUyZnN0a3ZsOWY3bWU2bWIzM2N6MHpva2xyc2pza2RiNWs4YzlyMmV5eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/iQHDtnUZ7gxI4/giphy.gif')
            .setTimestamp();
        
        if (fields.length > 0) {
            embed.addFields(...fields);
        }
        
        if (footer) {
            embed.setFooter({ 
                text: footer
            });
        } else {
            embed.setFooter({ 
                text: 'Lyora Community',
                iconURL: this.client.user?.displayAvatarURL()
            });
        }
        
        return embed;
    }

    createTicketPanel() {
        const embed = this.createTicketEmbed(
            '🎫 **TICKET SUPPORT SYSTEM**',
            '**Klik tombol di bawah untuk membuat tiket baru!**\n\n' +
            '📝 **Log:**\n' +
            '• Support cepat dan responsif\n' +
            '• Privasi terjamin\n' +
            '• Riwayat percakapan lengkap\n' +
            '• Multi-kategori bantuan\n\n' +
            '⚡ **RESPON CEPAT:**\nTim support akan membantu Anda secepat mungkin!'
        );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create')
                    .setLabel('📩 Buat Tiket')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_help')
                    .setLabel('❓ Cara Pakai')
                    .setStyle(ButtonStyle.Secondary)
            );

        return { embeds: [embed], components: [row] };
    }

    // ==================== TICKET CREATION ====================

    async createTicketModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal')
            .setTitle('📝 Buat Tiket Baru');

        const subjectInput = new TextInputBuilder()
            .setCustomId('ticket_subject')
            .setLabel('Subjek / Judul Tiket')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
            .setPlaceholder('Masukkan judul tiket Anda');

        const descriptionInput = new TextInputBuilder()
            .setCustomId('ticket_description')
            .setLabel('Deskripsi Masalah')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000)
            .setPlaceholder('Jelaskan masalah atau pertanyaan Anda secara detail');

        const categoryInput = new TextInputBuilder()
            .setCustomId('ticket_category')
            .setLabel('Kategori (Opsional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(50)
            .setPlaceholder('Contoh: Laporan, Bantuan, Lainnya');

        const firstActionRow = new ActionRowBuilder().addComponents(subjectInput);
        const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(categoryInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
        return modal;
    }

    async createTicketChannel(interaction, subject, description, category = 'Umum') {
        const guild = interaction.guild;
        const user = interaction.user;
        const config = await this.getGuildConfig(guild.id);

        // Cek jumlah tiket user
        const userTickets = await this.getUserTickets(guild.id, user.id);
        if (userTickets.length >= (config.maxTicketsPerUser || 3)) {
            throw new Error(`Anda sudah memiliki ${config.maxTicketsPerUser} tiket aktif. Silakan tutup salah satu terlebih dahulu.`);
        }

        // Buat nama channel
        const ticketId = Date.now().toString().slice(-6);
        const channelName = `ticket-${user.username.toLowerCase().slice(0, 10)}-${ticketId}`;

        // Setup permissions
        const permissionOverwrites = [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
                type: OverwriteType.Role
            },
            {
                id: user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks
                ],
                type: OverwriteType.Member
            }
        ];

        // Tambahkan support role jika ada
        if (config.supportRole) {
            permissionOverwrites.push({
                id: config.supportRole,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.ManageChannels
                ],
                type: OverwriteType.Role
            });
        }

        // Tambahkan auto tag roles
        for (const roleId of config.autoTagRoles || []) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
                permissionOverwrites.push({
                    id: role.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ],
                    type: OverwriteType.Role
                });
            }
        }

        // Buat channel
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: config.ticketCategory,
            permissionOverwrites: permissionOverwrites,
            topic: `Tiket oleh ${user.tag} | ${subject} | ID: ${ticketId}`
        });

        // Simpan data tiket
        const ticketData = {
            id: ticketId,
            channelId: ticketChannel.id,
            userId: user.id,
            userName: user.tag,
            subject: subject,
            description: description,
            category: category,
            createdAt: Date.now(),
            status: 'open',
            claimedBy: null,
            messages: []
        };

        // Simpan di memory
        if (!this.tickets.has(guild.id)) {
            this.tickets.set(guild.id, new Map());
        }
        this.tickets.get(guild.id).set(ticketChannel.id, ticketData);

        // Kirim embed tiket di channel
        const ticketEmbed = this.createTicketEmbed(
            '🎫 **TIKET DIBUKA**',
            `**Tiket #${ticketId} telah dibuat!**\n\n` +
            `**👤 Dibuat oleh:** <@${user.id}>\n` +
            `**📝 Subjek:** ${subject}\n` +
            `**📂 Kategori:** ${category}\n` +
            `**🕒 Dibuat:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
            `**📋 Deskripsi:**\n${description}\n\n` +
            '**Tim support akan segera membantu Anda!**'
        );

        // Buat mention untuk auto tag roles
        let mentionString = '';
        for (const roleId of config.autoTagRoles || []) {
            mentionString += `<@&${roleId}> `;
        }

        // Komponen untuk tiket channel
        const ticketRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_close_${ticketChannel.id}`)
                    .setLabel('🔒 Tutup Tiket')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`ticket_claim_${ticketChannel.id}`)
                    .setLabel('🎯 Ambil Tiket')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`ticket_transcript_${ticketChannel.id}`)
                    .setLabel('📄 Transcript')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`ticket_adduser_${ticketChannel.id}`)
                    .setLabel('👥 Tambah User')
                    .setStyle(ButtonStyle.Primary)
            );

        // Kirim pesan di channel tiket
        const messageContent = mentionString.trim() || `**Tiket #${ticketId}**`;
        await ticketChannel.send({
            content: messageContent,
            embeds: [ticketEmbed],
            components: [ticketRow]
        });

        // Kirim log jika ada channel log
        if (config.logChannel) {
            await this.sendTicketLog(guild, ticketData, 'created');
        }

        // Kirim pesan sukses ke user
        await interaction.followUp({
            content: `✅ **Tiket berhasil dibuat!** Silakan kunjungi <#${ticketChannel.id}>`,
            ephemeral: true
        });

        return ticketData;
    }

    // ==================== TICKET MANAGEMENT ====================

    async closeTicket(channelId, closerId, reason = null) {
        const guild = this.client.guilds.cache.find(g => 
            g.channels.cache.has(channelId)
        );
        
        if (!guild) return null;

        const guildTickets = this.tickets.get(guild.id);
        if (!guildTickets) return null;

        const ticketData = guildTickets.get(channelId);
        if (!ticketData) return null;

        // Update status
        ticketData.status = 'closed';
        ticketData.closedAt = Date.now();
        ticketData.closedBy = closerId;
        ticketData.closeReason = reason || 'Ticket ditutup';

        // Update channel permissions
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
            // Lock channel
            await channel.permissionOverwrites.edit(guild.id, {
                ViewChannel: false
            });

            // Hanya beri akses ke staff
            const config = await this.getGuildConfig(guild.id);
            if (config.supportRole) {
                const supportRole = guild.roles.cache.get(config.supportRole);
                if (supportRole) {
                    await channel.permissionOverwrites.edit(supportRole.id, {
                        ViewChannel: true,
                        SendMessages: false
                    });
                }
            }

            // Update nama channel
            await channel.setName(`closed-${channel.name.replace('ticket-', '')}`);

            // Kirim embed penutupan
            const closer = await this.client.users.fetch(closerId).catch(() => ({ tag: 'System' }));
            
            const closeEmbed = this.createTicketEmbed(
                '🔒 **TIKET DITUTUP**',
                `**Tiket #${ticketData.id} telah ditutup!**\n\n` +
                `**👤 Ditutup oleh:** ${closer.tag}\n` +
                `**📝 Alasan:** ${ticketData.closeReason}\n` +
                `**🕒 Ditutup:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                '**⚠️ Channel ini telah dikunci dan hanya dapat dilihat oleh staff.**'
            );

            // Update komponen
            const closedRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket_reopen_${channelId}`)
                        .setLabel('🔓 Buka Kembali')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`ticket_delete_${channelId}`)
                        .setLabel('🗑️ Hapus Tiket')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`ticket_transcript_${channelId}`)
                        .setLabel('📄 Transcript')
                        .setStyle(ButtonStyle.Secondary)
                );

            await channel.send({
                embeds: [closeEmbed],
                components: [closedRow]
            });

            // Nonaktifkan komponen lama
            const messages = await channel.messages.fetch({ limit: 10 });
            const ticketMessage = messages.find(msg => 
                msg.embeds.length > 0 && 
                msg.embeds[0].title?.includes('TIKET DIBUKA')
            );
            
            if (ticketMessage) {
                const disabledRow = ActionRowBuilder.from(ticketMessage.components[0]);
                disabledRow.components.forEach(component => {
                    component.setDisabled(true);
                });
                await ticketMessage.edit({ components: [disabledRow] });
            }

            // Kirim log
            if (config.logChannel) {
                await this.sendTicketLog(guild, ticketData, 'closed');
            }
        }

        return ticketData;
    }

    async deleteTicket(channelId, deleterId) {
        const guild = this.client.guilds.cache.find(g => 
            g.channels.cache.has(channelId)
        );
        
        if (!guild) return false;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return false;

        // Hapus channel
        await channel.delete('Ticket deleted');

        // Hapus dari memory
        const guildTickets = this.tickets.get(guild.id);
        if (guildTickets) {
            const ticketData = guildTickets.get(channelId);
            if (ticketData) {
                // Kirim log
                const config = await this.getGuildConfig(guild.id);
                if (config.logChannel) {
                    ticketData.deletedBy = deleterId;
                    ticketData.deletedAt = Date.now();
                    await this.sendTicketLog(guild, ticketData, 'deleted');
                }
                
                guildTickets.delete(channelId);
            }
        }

        return true;
    }

    async claimTicket(channelId, claimerId) {
        const guild = this.client.guilds.cache.find(g => 
            g.channels.cache.has(channelId)
        );
        
        if (!guild) return null;

        const guildTickets = this.tickets.get(guild.id);
        if (!guildTickets) return null;

        const ticketData = guildTickets.get(channelId);
        if (!ticketData) return null;

        // Update claimer
        const claimer = await this.client.users.fetch(claimerId);
        ticketData.claimedBy = claimerId;
        ticketData.claimedAt = Date.now();

        // Kirim embed claim
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
            const claimEmbed = this.createTicketEmbed(
                '🎯 **TIKET DIAMBIL**',
                `**Tiket #${ticketData.id} telah diambil oleh staff!**\n\n` +
                `**👤 Staff:** ${claimer.tag}\n` +
                `**🕒 Diambil:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                '**Staff akan segera membantu Anda!**'
            );

            await channel.send({
                content: `<@${ticketData.userId}>`,
                embeds: [claimEmbed]
            });

            // Update komponen
            const messages = await channel.messages.fetch({ limit: 10 });
            const ticketMessage = messages.find(msg => 
                msg.embeds.length > 0 && 
                msg.embeds[0].title?.includes('TIKET DIBUKA')
            );
            
            if (ticketMessage) {
                const updatedRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ticket_close_${channelId}`)
                            .setLabel('🔒 Tutup Tiket')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId(`ticket_release_${channelId}`)
                            .setLabel('🔄 Lepas Tiket')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`ticket_transcript_${channelId}`)
                            .setLabel('📄 Transcript')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`ticket_adduser_${channelId}`)
                            .setLabel('👥 Tambah User')
                            .setStyle(ButtonStyle.Primary)
                    );

                await ticketMessage.edit({ components: [updatedRow] });
            }

            // Kirim log
            const config = await this.getGuildConfig(guild.id);
            if (config.logChannel) {
                await this.sendTicketLog(guild, ticketData, 'claimed');
            }
        }

        return ticketData;
    }

    async addUserToTicket(channelId, userId, adderId) {
        const guild = this.client.guilds.cache.find(g => 
            g.channels.cache.has(channelId)
        );
        
        if (!guild) return false;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return false;

        const user = await this.client.users.fetch(userId).catch(() => null);
        if (!user) return false;

        // Tambah permission
        await channel.permissionOverwrites.edit(userId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true
        });

        const adder = await this.client.users.fetch(adderId);
        
        const addEmbed = this.createTicketEmbed(
            '👥 **USER DITAMBAHKAN**',
            `**User telah ditambahkan ke tiket!**\n\n` +
            `**👤 User:** ${user.tag}\n` +
            `**👤 Ditambahkan oleh:** ${adder.tag}\n` +
            `**🕒 Waktu:** <t:${Math.floor(Date.now() / 1000)}:R>`
        );

        await channel.send({
            content: `<@${userId}>`,
            embeds: [addEmbed]
        });

        return true;
    }

    async generateTranscript(channelId) {
        const guild = this.client.guilds.cache.find(g => 
            g.channels.cache.has(channelId)
        );
        
        if (!guild) return null;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return null;

        // Ambil semua pesan
        let messages;
        try {
            messages = await channel.messages.fetch({ limit: 100 });
        } catch (error) {
            return null;
        }

        // Format transcript
        const transcript = messages
            .filter(msg => !msg.author.bot || msg.embeds.length === 0)
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .map(msg => {
                const date = new Date(msg.createdTimestamp).toLocaleString('id-ID');
                return `[${date}] ${msg.author.tag}: ${msg.content}`;
            })
            .join('\n');

        return transcript;
    }

    // ==================== LOGGING ====================

    async sendTicketLog(guild, ticketData, action) {
        const config = await this.getGuildConfig(guild.id);
        if (!config.logChannel) return;

        const logChannel = guild.channels.cache.get(config.logChannel);
        if (!logChannel) return;

        let title, description, color;

        switch (action) {
            case 'created':
                title = '🎫 **TIKET DIBUAT**';
                description = `**Tiket baru telah dibuat!**\n\n` +
                    `**ID:** #${ticketData.id}\n` +
                    `**User:** ${ticketData.userName}\n` +
                    `**Subjek:** ${ticketData.subject}\n` +
                    `**Channel:** <#${ticketData.channelId}>`;
                color = 0x00FF00;
                break;

            case 'closed':
                title = '🔒 **TIKET DITUTUP**';
                const closer = await this.client.users.fetch(ticketData.closedBy).catch(() => ({ tag: 'System' }));
                description = `**Tiket telah ditutup!**\n\n` +
                    `**ID:** #${ticketData.id}\n` +
                    `**User:** ${ticketData.userName}\n` +
                    `**Ditutup oleh:** ${closer.tag}\n` +
                    `**Alasan:** ${ticketData.closeReason}`;
                color = 0xFF0000;
                break;

            case 'claimed':
                title = '🎯 **TIKET DIAMBIL**';
                const claimer = await this.client.users.fetch(ticketData.claimedBy);
                description = `**Tiket telah diambil oleh staff!**\n\n` +
                    `**ID:** #${ticketData.id}\n` +
                    `**User:** ${ticketData.userName}\n` +
                    `**Diambil oleh:** ${claimer.tag}\n` +
                    `**Channel:** <#${ticketData.channelId}>`;
                color = 0xFFFF00;
                break;

            case 'deleted':
                title = '🗑️ **TIKET DIHAPUS**';
                description = `**Tiket telah dihapus!**\n\n` +
                    `**ID:** #${ticketData.id}\n` +
                    `**User:** ${ticketData.userName}\n` +
                    `**Durasi:** ${Math.round((ticketData.deletedAt - ticketData.createdAt) / 1000 / 60)} menit`;
                color = 0xFF6B6B;
                break;
        }

        const logEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .addFields(
                { name: '📅 Waktu', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📂 Kategori', value: ticketData.category || 'Umum', inline: true }
            )
            .setTimestamp()
            .setFooter({ 
                text: 'SOJI OSEM FORCE • Ticket System Log',
                iconURL: this.client.user?.displayAvatarURL()
            });

        await logChannel.send({ embeds: [logEmbed] });
    }

    // ==================== HELPER FUNCTIONS ====================

    async getUserTickets(guildId, userId) {
        const guildTickets = this.tickets.get(guildId);
        if (!guildTickets) return [];

        return Array.from(guildTickets.values()).filter(
            ticket => ticket.userId === userId && ticket.status === 'open'
        );
    }

    async getTicketByChannel(channelId) {
        for (const [guildId, guildTickets] of this.tickets) {
            const ticket = guildTickets.get(channelId);
            if (ticket) {
                const guild = this.client.guilds.cache.get(guildId);
                return { ticket, guild };
            }
        }
        return null;
    }

    // ==================== COMMAND HANDLERS ====================

    async handleSetup(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!',
                ephemeral: true 
            });
        }

        const category = interaction.options.getChannel('category');
        const supportRole = interaction.options.getRole('support_role');
        const logChannel = interaction.options.getChannel('log_channel');
        const autoTagRoles = interaction.options.getString('auto_tag_roles');

        await interaction.deferReply({ ephemeral: true });

        try {
            const updates = {};

            if (category) {
                if (category.type !== ChannelType.GuildCategory) {
                    return interaction.editReply({ 
                        content: '❌ Please select a category channel!' 
                    });
                }
                updates.ticketCategory = category.id;
            }

            if (supportRole) {
                updates.supportRole = supportRole.id;
            }

            if (logChannel) {
                if (logChannel.type !== ChannelType.GuildText) {
                    return interaction.editReply({ 
                        content: '❌ Please select a text channel for logs!' 
                    });
                }
                updates.logChannel = logChannel.id;
            }

            if (autoTagRoles) {
                // Parse role IDs (bisa berupa ID atau mention)
                const roleIds = autoTagRoles.split(/[, ]+/)
                    .map(id => id.replace(/[<@&>]/g, ''))
                    .filter(id => /^\d+$/.test(id));
                
                updates.autoTagRoles = roleIds;
            }

            await this.updateGuildConfig(interaction.guild.id, updates);
            const config = await this.getGuildConfig(interaction.guild.id);

            const embed = this.createTicketEmbed(
                '✅ **TICKET SYSTEM CONFIGURED**',
                '**Sistem tiket telah berhasil dikonfigurasi!**\n\n' +
                `**📂 Kategori:** ${config.ticketCategory ? `<#${config.ticketCategory}>` : 'Not set'}\n` +
                `**🛡️ Support Role:** ${config.supportRole ? `<@&${config.supportRole}>` : 'Not set'}\n` +
                `**📝 Log Channel:** ${config.logChannel ? `<#${config.logChannel}>` : 'Not set'}\n` +
                `**🏷️ Auto Tag Roles:** ${config.autoTagRoles?.map(id => `<@&${id}>`).join(', ') || 'Default roles'}\n\n` +
                '**Gunakan `/ticket panel` untuk membuat panel tiket!**'
            );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Setup error:', error);
            await interaction.editReply({ 
                content: '❌ Error configuring ticket system!' 
            });
        }
    }

    async handlePanel(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!',
                ephemeral: true 
            });
        }

        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const message = interaction.options.getString('message');

        await interaction.deferReply({ ephemeral: true });

        try {
            const panel = this.createTicketPanel();
            
            if (message) {
                panel.content = message;
            }

            await channel.send(panel);
            
            await interaction.editReply({ 
                content: `✅ Ticket panel created in <#${channel.id}>!` 
            });

        } catch (error) {
            console.error('Panel error:', error);
            await interaction.editReply({ 
                content: '❌ Error creating ticket panel!' 
            });
        }
    }

    async handleStats(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guildTickets = this.tickets.get(interaction.guild.id);
            const tickets = guildTickets ? Array.from(guildTickets.values()) : [];
            
            const openTickets = tickets.filter(t => t.status === 'open').length;
            const closedTickets = tickets.filter(t => t.status === 'closed').length;
            const claimedTickets = tickets.filter(t => t.claimedBy).length;
            const totalTickets = tickets.length;

            const embed = this.createTicketEmbed(
                '📊 **TICKET STATISTICS**',
                `**Statistik tiket untuk ${interaction.guild.name}**\n\n` +
                `**🎫 Total Tiket:** ${totalTickets}\n` +
                `**🟢 Tiket Aktif:** ${openTickets}\n` +
                `**🔴 Tiket Ditutup:** ${closedTickets}\n` +
                `**🎯 Tiket Diambil:** ${claimedTickets}\n` +
                `**📈 Rate Aktif:** ${totalTickets > 0 ? Math.round((openTickets / totalTickets) * 100) : 0}%\n\n` +
                '**Data diperbarui secara real-time**'
            );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Stats error:', error);
            await interaction.editReply({ 
                content: '❌ Error fetching ticket statistics!' 
            });
        }
    }

    // ==================== INTERACTION HANDLER ====================

    async handleInteraction(interaction) {
        try {
            if (interaction.isButton()) {
                await this.handleButton(interaction);
            } else if (interaction.isModalSubmit()) {
                await this.handleModal(interaction);
            }
        } catch (error) {
            console.error('Ticket interaction error:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ Error processing request!',
                    ephemeral: true 
                });
            }
        }
    }

    async handleButton(interaction) {
        const { customId } = interaction;

        if (customId === 'ticket_create') {
            const modal = await this.createTicketModal(interaction);
            await interaction.showModal(modal);
            return;
        }

        if (customId === 'ticket_help') {
            const embed = this.createTicketEmbed(
                '❓ **CARA MENGGUNAKAN TIKET**',
                '**📝 **LANGKAH-LANGKAH:**\n\n' +
                '1. **Klik "Buat Tiket"** untuk memulai tiket baru\n' +
                '2. **Isi formulir** dengan detail masalah Anda\n' +
                '3. **Tunggu respon** dari tim support\n' +
                '4. **Komunikasikan** masalah Anda di channel tiket\n' +
                '5. **Tutup tiket** ketika masalah selesai\n\n' +
                '**⚡ **TIPS:**\n' +
                '• Jelaskan masalah secara detail\n' +
                '• Sertakan screenshot jika perlu\n' +
                '• Bersabarlah menunggu respon\n' +
                '• Gunakan tiket dengan bijak\n\n' +
                '**🛡️ **PERATURAN:**\n' +
                '• Jangan spam atau buat tiket tidak perlu\n' +
                '• Hormati staff dan anggota lain\n' +
                '• Jangan bagikan informasi sensitif\n' +
                '• Tutup tiket ketika selesai'
            );

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Handle ticket channel buttons
        if (customId.startsWith('ticket_')) {
            const action = customId.split('_')[1];
            const channelId = customId.split('_')[2];

            switch (action) {
                case 'close':
                    await interaction.deferUpdate();
                    const ticketData = await this.getTicketByChannel(channelId);
                    
                    if (!ticketData) {
                        return;
                    }

                    // Cek permission
                    const canClose = interaction.memberPermissions.has(PermissionFlagsBits.Administrator) ||
                                   interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels) ||
                                   ticketData.ticket.userId === interaction.user.id;
                    
                    if (!canClose) {
                        return interaction.followUp({ 
                            content: '❌ Anda tidak memiliki izin untuk menutup tiket ini!',
                            ephemeral: true 
                        });
                    }

                    await this.closeTicket(channelId, interaction.user.id);
                    break;

                case 'claim':
                    await interaction.deferUpdate();
                    await this.claimTicket(channelId, interaction.user.id);
                    break;

                case 'transcript':
                    await interaction.deferReply({ ephemeral: true });
                    const transcript = await this.generateTranscript(channelId);
                    
                    if (transcript) {
                        await interaction.editReply({ 
                            content: '✅ Transcript generated!',
                            files: [{
                                attachment: Buffer.from(transcript),
                                name: `ticket-${channelId}-transcript.txt`
                            }]
                        });
                    } else {
                        await interaction.editReply({ 
                            content: '❌ Error generating transcript!' 
                        });
                    }
                    break;

                case 'adduser':
                    // Implementasi modal untuk menambah user
                    const modal = new ModalBuilder()
                        .setCustomId(`adduser_modal_${channelId}`)
                        .setTitle('👥 Tambah User ke Tiket');

                    const userIdInput = new TextInputBuilder()
                        .setCustomId('user_id')
                        .setLabel('User ID atau Mention')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('Contoh: 123456789012345678 atau @user');

                    const row = new ActionRowBuilder().addComponents(userIdInput);
                    modal.addComponents(row);

                    await interaction.showModal(modal);
                    break;

                case 'reopen':
                    await interaction.deferUpdate();
                    // Implementasi reopen ticket
                    const channel = interaction.guild.channels.cache.get(channelId);
                    if (channel) {
                        await channel.setName(channel.name.replace('closed-', 'ticket-'));
                        await interaction.followUp({ 
                            content: '✅ Ticket reopened!',
                            ephemeral: true 
                        });
                    }
                    break;

                case 'delete':
                    await interaction.deferUpdate();
                    await this.deleteTicket(channelId, interaction.user.id);
                    break;

                case 'release':
                    await interaction.deferUpdate();
                    // Implementasi release ticket
                    await interaction.followUp({ 
                        content: '✅ Ticket released!',
                        ephemeral: true 
                    });
                    break;
            }
        }
    }

    async handleModal(interaction) {
        const { customId } = interaction;

        if (customId === 'ticket_modal') {
            await interaction.deferReply({ ephemeral: true });

            const subject = interaction.fields.getTextInputValue('ticket_subject');
            const description = interaction.fields.getTextInputValue('ticket_description');
            const category = interaction.fields.getTextInputValue('ticket_category') || 'Umum';

            try {
                await this.createTicketChannel(interaction, subject, description, category);
            } catch (error) {
                await interaction.editReply({ 
                    content: `❌ Error: ${error.message}` 
                });
            }
            return;
        }

        if (customId.startsWith('adduser_modal_')) {
            await interaction.deferReply({ ephemeral: true });
            
            const channelId = customId.split('_')[2];
            const userIdInput = interaction.fields.getTextInputValue('user_id');
            
            // Extract user ID from input (bisa berupa ID atau mention)
            const userId = userIdInput.replace(/[<@!>]/g, '');
            
            try {
                await this.addUserToTicket(channelId, userId, interaction.user.id);
                await interaction.editReply({ 
                    content: `✅ User added to ticket!` 
                });
            } catch (error) {
                await interaction.editReply({ 
                    content: `❌ Error: ${error.message}` 
                });
            }
        }
    }

    // ==================== STATIC METHODS ====================

    static getCommands() {
        const { SlashCommandBuilder, ChannelType } = require('discord.js');
        
        return [
            new SlashCommandBuilder()
                .setName('ticket')
                .setDescription('Ticket system management')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('setup')
                        .setDescription('[ADMIN] Setup ticket system')
                        .addChannelOption(option =>
                            option.setName('category')
                                .setDescription('Category for ticket channels')
                                .addChannelTypes(ChannelType.GuildCategory)
                                .setRequired(false))
                        .addRoleOption(option =>
                            option.setName('support_role')
                                .setDescription('Role for support team')
                                .setRequired(false))
                        .addChannelOption(option =>
                            option.setName('log_channel')
                                .setDescription('Channel for ticket logs')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(false))
                        .addStringOption(option =>
                            option.setName('auto_tag_roles')
                                .setDescription('Roles to auto-tag (comma separated IDs or mentions)')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('panel')
                        .setDescription('[ADMIN] Create ticket panel')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('Channel to send panel to')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(false))
                        .addStringOption(option =>
                            option.setName('message')
                                .setDescription('Custom message above panel')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('stats')
                        .setDescription('View ticket statistics'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('config')
                        .setDescription('[ADMIN] View current configuration'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('close')
                        .setDescription('[MOD] Close a ticket')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('Ticket channel to close')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('reason')
                                .setDescription('Reason for closing')
                                .setRequired(false)))
        ];
    }

    static async handleCommand(interaction, ticketSystem) {
        const { commandName, options } = interaction;
        const subcommand = options.getSubcommand();

        switch (subcommand) {
            case 'setup':
                await ticketSystem.handleSetup(interaction);
                break;
            case 'panel':
                await ticketSystem.handlePanel(interaction);
                break;
            case 'stats':
                await ticketSystem.handleStats(interaction);
                break;
            case 'config':
                await ticketSystem.handleConfig(interaction);
                break;
            case 'close':
                await ticketSystem.handleClose(interaction);
                break;
        }
    }
}

module.exports = TicketSystem;
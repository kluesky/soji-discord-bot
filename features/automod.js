// plugins/automod.js - AUTO MODERATION + LOGGER SYSTEM
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ChannelType,
    PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class AutoModPlugin {
    constructor(client) {
        this.client = client;
        this.name = 'automod';
        this.version = '2.0.0';
        this.description = 'Auto moderation dengan sistem warning dan mute';
        
        this.configPath = path.join(__dirname, 'data/automod_config.json');
this.warningPath = path.join(__dirname, 'data/warnings.json');
        
        this.config = new Map();
        this.warnings = new Map();
        
        // Daftar kata terlarang (bisa ditambah via command)
        this.badWords = new Set([
            'anjing', 'bangsat', 'kontol', 'memek', 'ngentot', 'goblok', 'bodoh',
            'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'pussy',
            // Tambah sendiri
        ]);

        // Filter invite Discord
        this.inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|com|invite)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;

        // Filter link mencurigakan
        this.suspiciousDomains = [
            'bit.ly', 'tinyurl.com', 'shorturl.at', 'cutt.ly', 'short.link',
            'rebrand.ly', 'short.cm', 'shorte.st', 'adf.ly', 'ouo.io'
        ];

        this.loadConfig();
        this.loadWarnings();
    }

    async init() {
        console.log('🚫 AutoMod system initialized');
        
        // Setup message event listener
        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            if (!message.guild) return;

            await this.checkMessage(message);
        });
    }

    async loadConfig() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            const configs = JSON.parse(data);
            
            for (const [guildId, config] of Object.entries(configs)) {
                this.config.set(guildId, config);
            }
            
            console.log(`🚫 Loaded AutoMod config for ${this.config.size} guilds`);
        } catch (error) {
            console.log('📝 No AutoMod config found, creating default...');
            await this.saveConfig();
        }
    }

    async saveConfig() {
        const obj = {};
        this.config.forEach((config, guildId) => {
            obj[guildId] = config;
        });
        await fs.writeFile(this.configPath, JSON.stringify(obj, null, 2));
    }

    async loadWarnings() {
        try {
            const data = await fs.readFile(this.warningPath, 'utf8');
            this.warnings = new Map(Object.entries(JSON.parse(data)));
            console.log(`🚫 Loaded ${this.warnings.size} warnings`);
        } catch (error) {
            console.log('📝 No warnings data found');
            await this.saveWarnings();
        }
    }

    async saveWarnings() {
        const obj = Object.fromEntries(this.warnings);
        await fs.writeFile(this.warningPath, JSON.stringify(obj, null, 2));
    }

    async getGuildConfig(guildId) {
        if (!this.config.has(guildId)) {
            this.config.set(guildId, {
                enabled: true,
                logChannel: null,
                muteRole: null,
                warnThresholds: [3, 5, 7], // 3 = mute 1 jam, 5 = mute 1 hari, 7 = kick/ban
                autoDeleteBadWords: true,
                autoDeleteInvites: false,
                autoDeleteLinks: false,
                allowedChannels: [],
                ignoredRoles: []
            });
            await this.saveConfig();
        }
        return this.config.get(guildId);
    }

    async checkMessage(message) {
        const config = await this.getGuildConfig(message.guild.id);
        if (!config.enabled) return;
        
        // Skip if user has ignored role
        if (message.member.roles.cache.some(role => config.ignoredRoles?.includes(role.id))) {
            return;
        }

        // Skip if channel is allowed
        if (config.allowedChannels?.includes(message.channel.id)) {
            return;
        }

        const violations = [];

        // Check bad words
        if (config.autoDeleteBadWords) {
            const content = message.content.toLowerCase();
            for (const word of this.badWords) {
                if (content.includes(word)) {
                    violations.push({ type: 'bad_word', word });
                    break;
                }
            }
        }

        // Check Discord invites
        if (config.autoDeleteInvites) {
            if (this.inviteRegex.test(message.content)) {
                violations.push({ type: 'invite' });
            }
        }

        // Check suspicious links
        if (config.autoDeleteLinks) {
            for (const domain of this.suspiciousDomains) {
                if (message.content.toLowerCase().includes(domain)) {
                    violations.push({ type: 'suspicious_link', domain });
                    break;
                }
            }
        }

        if (violations.length > 0) {
            // Delete message
            await message.delete().catch(() => {});

            // Add warning
            const warnCount = await this.addWarning(message.author.id, message.guild.id, violations);

            // Check threshold
            await this.checkThreshold(message, warnCount);

            // Send log
            await this.sendLog(message, violations, warnCount);
        }
    }

    async addWarning(userId, guildId, violations) {
        const key = `${guildId}-${userId}`;
        
        if (!this.warnings.has(key)) {
            this.warnings.set(key, []);
        }

        const userWarnings = this.warnings.get(key);
        const warning = {
            id: Date.now().toString(36),
            timestamp: Date.now(),
            violations,
            moderator: 'AUTO_MOD',
            reason: violations.map(v => v.type).join(', ')
        };

        userWarnings.push(warning);
        await this.saveWarnings();

        return userWarnings.length;
    }

    async getWarnings(userId, guildId) {
        const key = `${guildId}-${userId}`;
        return this.warnings.get(key) || [];
    }

    async checkThreshold(message, warnCount) {
        const config = await this.getGuildConfig(message.guild.id);
        const thresholds = config.warnThresholds || [3, 5, 7];

        if (warnCount >= thresholds[2]) {
            // Ban/kick
            await message.member.ban({ reason: `AutoMod: Mencapai ${warnCount} warnings` }).catch(() => {});
            await this.sendPunishmentLog(message, 'BANNED', warnCount);
        } else if (warnCount >= thresholds[1]) {
            // Mute 1 hari
            await this.muteUser(message, 24 * 60 * 60 * 1000);
            await this.sendPunishmentLog(message, 'MUTED (1 Hari)', warnCount);
        } else if (warnCount >= thresholds[0]) {
            // Mute 1 jam
            await this.muteUser(message, 60 * 60 * 1000);
            await this.sendPunishmentLog(message, 'MUTED (1 Jam)', warnCount);
        }
    }

    async muteUser(message, duration) {
        const config = await this.getGuildConfig(message.guild.id);
        
        if (!config.muteRole) {
            // Create mute role if not exists
            const muteRole = await message.guild.roles.create({
                name: '🔇 Muted',
                color: '#808080',
                permissions: []
            });

            // Set permissions for all channels
            message.guild.channels.cache.forEach(async channel => {
                await channel.permissionOverwrites.edit(muteRole, {
                    SendMessages: false,
                    AddReactions: false,
                    Speak: false,
                    Connect: false
                }).catch(() => {});
            });

            config.muteRole = muteRole.id;
            await this.saveConfig();
        }

        // Add mute role
        await message.member.roles.add(config.muteRole).catch(() => {});

        // Auto unmute after duration
        setTimeout(async () => {
            await message.member.roles.remove(config.muteRole).catch(() => {});
            
            // Log unmute
            const logChannel = message.guild.channels.cache.get(config.logChannel);
            if (logChannel) {
                const unmuteEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🔊 **USER UNMUTED**')
                    .setDescription(`**${message.author.tag}** telah di-unmute otomatis`)
                    .addFields(
                        { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
                        { name: '⏰ Duration', value: `${duration / 3600000} jam`, inline: true }
                    )
                    .setTimestamp();
                
                await logChannel.send({ embeds: [unmuteEmbed] });
            }
        }, duration);
    }

    async sendLog(message, violations, warnCount) {
        const config = await this.getGuildConfig(message.guild.id);
        if (!config.logChannel) return;

        const logChannel = message.guild.channels.cache.get(config.logChannel);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🚫 **AUTO MODERATION**')
            .setDescription(`**Message deleted in ${message.channel}**`)
            .addFields(
                { name: '👤 User', value: `${message.author.tag} (<@${message.author.id}>)`, inline: false },
                { name: '📝 Message', value: message.content.length > 1000 ? message.content.substring(0, 1000) + '...' : message.content || '[EMBED/ATTACHMENT]', inline: false },
                { name: '⚠️ Violations', value: violations.map(v => `• ${v.type}${v.word ? `: ${v.word}` : ''}${v.domain ? `: ${v.domain}` : ''}`).join('\n'), inline: false },
                { name: '📊 Warning Count', value: `${warnCount}`, inline: true },
                { name: '🕒 Time', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `User ID: ${message.author.id}` });

        await logChannel.send({ embeds: [embed] });
    }

    async sendPunishmentLog(message, punishment, warnCount) {
        const config = await this.getGuildConfig(message.guild.id);
        if (!config.logChannel) return;

        const logChannel = message.guild.channels.cache.get(config.logChannel);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(punishment.includes('BAN') ? 0xFF0000 : 0xFFA500)
            .setTitle('⚖️ **PUNISHMENT APPLIED**')
            .setDescription(`**${message.author.tag} telah di-${punishment}**`)
            .addFields(
                { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
                { name: '⚖️ Punishment', value: punishment, inline: true },
                { name: '📊 Warning Count', value: `${warnCount}`, inline: true },
                { name: '📝 Reason', value: 'AutoMod: Mencapai batas warning', inline: false }
            )
            .setThumbnail(message.author.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `User ID: ${message.author.id}` });

        await logChannel.send({ embeds: [embed] });
    }

    // ==================== COMMAND HANDLERS ====================

    async handleSetup(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const logChannel = interaction.options.getChannel('log_channel');
        const muteRole = interaction.options.getRole('mute_role');
        const thresholds = interaction.options.getString('thresholds');

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = await this.getGuildConfig(interaction.guild.id);
            
            if (logChannel) config.logChannel = logChannel.id;
            if (muteRole) config.muteRole = muteRole.id;
            
            if (thresholds) {
                const nums = thresholds.split(',').map(n => parseInt(n.trim()));
                if (nums.length === 3 && nums.every(n => !isNaN(n))) {
                    config.warnThresholds = nums;
                }
            }

            await this.saveConfig();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ **AUTOMOD CONFIGURED**')
                .setDescription('AutoMod system has been set up!')
                .addFields(
                    { name: '📝 Log Channel', value: config.logChannel ? `<#${config.logChannel}>` : '❌ Not set', inline: true },
                    { name: '🔇 Mute Role', value: config.muteRole ? `<@&${config.muteRole}>` : '❌ Not set', inline: true },
                    { name: '⚠️ Warning Thresholds', value: `3 = Mute 1j, 5 = Mute 24j, 7 = Ban`, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('AutoMod setup error:', error);
            await interaction.editReply({ content: '❌ Error setting up AutoMod!' });
        }
    }

    async handleConfig(interaction) {
        const config = await this.getGuildConfig(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('⚙️ **AUTOMOD CONFIGURATION**')
            .addFields(
                { name: '📊 Status', value: config.enabled ? '✅ Active' : '❌ Disabled', inline: true },
                { name: '📝 Log Channel', value: config.logChannel ? `<#${config.logChannel}>` : '❌ Not set', inline: true },
                { name: '🔇 Mute Role', value: config.muteRole ? `<@&${config.muteRole}>` : '❌ Not set', inline: true },
                { name: '⚠️ Warning Thresholds', value: `1: **${config.warnThresholds[0]}** warns → Mute 1j\n2: **${config.warnThresholds[1]}** warns → Mute 24j\n3: **${config.warnThresholds[2]}** warns → Ban`, inline: false },
                { name: '🛡️ Filters', value: `Bad Words: ${config.autoDeleteBadWords ? '✅' : '❌'}\nDiscord Invites: ${config.autoDeleteInvites ? '✅' : '❌'}\nSuspicious Links: ${config.autoDeleteLinks ? '✅' : '❌'}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleWarnings(interaction) {
        const target = interaction.options.getUser('user');
        const warnings = await this.getWarnings(target.id, interaction.guild.id);

        if (warnings.length === 0) {
            return interaction.reply({ 
                content: `✅ **${target.tag}** has no warnings!`, 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle(`⚠️ **WARNINGS - ${target.tag}**`)
            .setThumbnail(target.displayAvatarURL())
            .setDescription(`**Total Warnings:** ${warnings.length}`);

        warnings.slice(-5).forEach((warn, index) => {
            embed.addFields({
                name: `Warning #${warnings.length - index}`,
                value: `📅 <t:${Math.floor(warn.timestamp/1000)}:F>\n📝 Reason: ${warn.reason}\n👮 Moderator: ${warn.moderator}`,
                inline: false
            });
        });

        embed.setTimestamp()
            .setFooter({ text: `User ID: ${target.id}` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleRemoveWarn(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: '❌ Kamu butuh permission Moderate Members!', ephemeral: true });
        }

        const target = interaction.options.getUser('user');
        const warnId = interaction.options.getString('warn_id');
        
        const key = `${interaction.guild.id}-${target.id}`;
        const warnings = this.warnings.get(key) || [];
        
        const index = warnings.findIndex(w => w.id === warnId);
        if (index === -1) {
            return interaction.reply({ content: '❌ Warning ID tidak ditemukan!', ephemeral: true });
        }

        warnings.splice(index, 1);
        this.warnings.set(key, warnings);
        await this.saveWarnings();

        await interaction.reply({ 
            content: `✅ Berhasil menghapus warning **${target.tag}**!`, 
            ephemeral: true 
        });
    }

    async handleAddWord(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Administrator permissions required!', ephemeral: true });
        }

        const word = interaction.options.getString('word').toLowerCase();
        this.badWords.add(word);

        await interaction.reply({ 
            content: `✅ **${word}** telah ditambahkan ke daftar kata terlarang!`, 
            ephemeral: true 
        });
    }

    async handleRemoveWord(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Administrator permissions required!', ephemeral: true });
        }

        const word = interaction.options.getString('word').toLowerCase();
        this.badWords.delete(word);

        await interaction.reply({ 
            content: `✅ **${word}** telah dihapus dari daftar kata terlarang!`, 
            ephemeral: true 
        });
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('automod')
                .setDescription('🚫 Auto moderation system')
                .addSubcommand(sub =>
                    sub.setName('setup')
                        .setDescription('[ADMIN] Setup AutoMod system')
                        .addChannelOption(opt => 
                            opt.setName('log_channel')
                                .setDescription('Channel untuk logs')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(false))
                        .addRoleOption(opt => 
                            opt.setName('mute_role')
                                .setDescription('Role untuk muted users')
                                .setRequired(false))
                        .addStringOption(opt => 
                            opt.setName('thresholds')
                                .setDescription('Warning thresholds (format: 3,5,7)')
                                .setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('config')
                        .setDescription('[ADMIN] View AutoMod configuration'))
                .addSubcommand(sub =>
                    sub.setName('warnings')
                        .setDescription('Lihat warnings user')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('User yang dicek').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('removewarn')
                        .setDescription('[MOD] Hapus warning user')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('User').setRequired(true))
                        .addStringOption(opt => 
                            opt.setName('warn_id').setDescription('ID warning').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('addword')
                        .setDescription('[ADMIN] Tambah kata terlarang')
                        .addStringOption(opt => 
                            opt.setName('word').setDescription('Kata yang diblokir').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('removeword')
                        .setDescription('[ADMIN] Hapus kata terlarang')
                        .addStringOption(opt => 
                            opt.setName('word').setDescription('Kata yang dihapus').setRequired(true)))
        ];
    }

    static async handleCommand(interaction, plugin) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'setup': await plugin.handleSetup(interaction); break;
            case 'config': await plugin.handleConfig(interaction); break;
            case 'warnings': await plugin.handleWarnings(interaction); break;
            case 'removewarn': await plugin.handleRemoveWarn(interaction); break;
            case 'addword': await plugin.handleAddWord(interaction); break;
            case 'removeword': await plugin.handleRemoveWord(interaction); break;
        }
    }
}

module.exports = AutoModPlugin;
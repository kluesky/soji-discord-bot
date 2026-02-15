// translator.js - TRANSLATOR BOT SYSTEM (FIXED 100%)
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ChannelType,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Simple translation API (gratis, tanpa key)
const TRANSLATE_API = 'https://api.mymemory.translated.net/get';

// Daftar bahasa yang didukung
const LANGUAGES = {
    'id': '🇮🇩 Indonesia',
    'en': '🇬🇧 English',
    'ja': '🇯🇵 Japanese',
    'ko': '🇰🇷 Korean',
    'zh': '🇨🇳 Chinese',
    'es': '🇪🇸 Spanish',
    'fr': '🇫🇷 French',
    'de': '🇩🇪 German',
    'ru': '🇷🇺 Russian',
    'ar': '🇸🇦 Arabic',
    'pt': '🇵🇹 Portuguese',
    'nl': '🇳🇱 Dutch',
    'it': '🇮🇹 Italian',
    'th': '🇹🇭 Thai',
    'vi': '🇻🇳 Vietnamese',
    'hi': '🇮🇳 Hindi',
    'tr': '🇹🇷 Turkish',
    'pl': '🇵🇱 Polish',
    'sv': '🇸🇪 Swedish',
    'fi': '🇫🇮 Finnish',
    'da': '🇩🇰 Danish',
    'no': '🇳🇴 Norwegian',
    'cs': '🇨🇿 Czech',
    'hu': '🇭🇺 Hungarian',
    'el': '🇬🇷 Greek',
    'he': '🇮🇱 Hebrew',
    'ro': '🇷🇴 Romanian',
    'sk': '🇸🇰 Slovak',
    'uk': '🇺🇦 Ukrainian'
};

class TranslatorPlugin {
    constructor(client) {
        this.client = client;
        this.name = 'translator';
        this.version = '1.0.0';
        this.description = 'Translate text ke berbagai bahasa';
        
        this.configPath = path.join(__dirname, 'data', 'translator_config.json');
        this.config = new Map();
        this.autoTranslateChannels = new Map();
        
        this.loadConfig();
        this.setupMessageListener();
    }

    async init() {
        console.log('🌍 Translator system initialized');
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
                if (config.autoTranslateChannels) {
                    for (const [channelId, targetLang] of Object.entries(config.autoTranslateChannels)) {
                        this.autoTranslateChannels.set(channelId, targetLang);
                    }
                }
            }
            
            console.log(`🌍 Loaded Translator config for ${this.config.size} guilds`);
        } catch (error) {
            console.log('📝 No Translator config found, creating default...');
            await this.saveConfig();
        }
    }

    async saveConfig() {
        const obj = {};
        this.config.forEach((config, guildId) => {
            const autoTranslateChannels = {};
            this.autoTranslateChannels.forEach((targetLang, channelId) => {
                const channel = this.client.channels.cache.get(channelId);
                if (channel && channel.guildId === guildId) {
                    autoTranslateChannels[channelId] = targetLang;
                }
            });
            
            obj[guildId] = {
                ...config,
                autoTranslateChannels
            };
        });
        
        await fs.writeFile(this.configPath, JSON.stringify(obj, null, 2));
    }

    async getGuildConfig(guildId) {
        if (!this.config.has(guildId)) {
            this.config.set(guildId, {
                enabled: true,
                defaultTargetLang: 'en',
                autoTranslateChannels: {}
            });
            await this.saveConfig();
        }
        return this.config.get(guildId);
    }

    setupMessageListener() {
        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            if (!message.guild) return;
            
            const targetLang = this.autoTranslateChannels.get(message.channel.id);
            if (!targetLang) return;
            if (message.content.length < 2) return;
            if (message.content.startsWith('[🌍]')) return;
            
            try {
                const detectedLang = await this.detectLanguage(message.content);
                if (detectedLang === targetLang) return;
                
                const translated = await this.translate(message.content, targetLang);
                
                if (translated && translated !== message.content) {
                    // 🔥 FIX: HAPUS SEMUA TIMESTAMP!
                    const embed = new EmbedBuilder()
                        .setColor(0x1E90FF)
                        .setAuthor({ 
                            name: message.author.tag, 
                            iconURL: message.author.displayAvatarURL() 
                        })
                        .setDescription(translated)
                        .addFields(
                            { name: '🌍 Original', value: `\`\`\`${message.content.substring(0, 500)}\`\`\``, inline: false },
                            { name: '🎯 Language', value: `${LANGUAGES[detectedLang] || 'Unknown'} → ${LANGUAGES[targetLang]}`, inline: true },
                            { name: '🔗 Source', value: `[Jump to message](${message.url})`, inline: true }
                        )
                        .setFooter({ text: 'Auto-translated • Reply with /translate for manual' });
                    
                    // 🔥 TIDAK PAKE .setTimestamp() SAMA SEKALI!

                    await message.reply({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Auto-translate error:', error);
            }
        });
    }

    async detectLanguage(text) {
        try {
            if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text)) return 'ja';
            if (/[\u0600-\u06ff]/.test(text)) return 'ar';
            if (/[\u0400-\u04ff]/.test(text)) return 'ru';
            if (/[àâçéèêëîïôûùüÿœ]/.test(text)) return 'fr';
            if (/[áéíóúüñ¿¡]/.test(text)) return 'es';
            if (/[äöüß]/.test(text)) return 'de';
            return 'en';
        } catch (error) {
            return 'en';
        }
    }

    async translate(text, targetLang, sourceLang = '') {
        try {
            const url = new URL(TRANSLATE_API);
            url.searchParams.append('q', text.substring(0, 500));
            url.searchParams.append('langpair', `${sourceLang || 'auto'}|${targetLang}`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.responseData && data.responseData.translatedText) {
                return data.responseData.translatedText;
            }
            return null;
        } catch (error) {
            console.error('Translation error:', error);
            return null;
        }
    }

    // ==================== COMMAND HANDLERS ====================

    async handleTranslate(interaction) {
        const text = interaction.options.getString('text');
        const target = interaction.options.getString('to');
        const source = interaction.options.getString('from') || 'auto';

        await interaction.deferReply();

        try {
            const translated = await this.translate(text, target, source);
            
            if (!translated) {
                return interaction.editReply('❌ Gagal menerjemahkan teks!');
            }

            const embed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle('🌍 **TRANSLATION RESULT**')
                .addFields(
                    { 
                        name: `📝 Original (${source === 'auto' ? 'Auto-detected' : LANGUAGES[source] || source})`, 
                        value: `\`\`\`${text.substring(0, 1024)}\`\`\``, 
                        inline: false 
                    },
                    { 
                        name: `🎯 Translation (${LANGUAGES[target] || target})`, 
                        value: `\`\`\`${translated.substring(0, 1024)}\`\`\``, 
                        inline: false 
                    }
                )
                .setFooter({ text: 'Powered by MyMemory Translation API' })
                .setTimestamp(); // 🔥 INI AMAN! HANYA DI COMMAND MANUAL

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Translate error:', error);
            await interaction.editReply('❌ Error translating text!');
        }
    }

    async handleLanguages(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('🌍 **SUPPORTED LANGUAGES**')
            .setDescription('Gunakan kode bahasa di bawah untuk translate:');

        const entries = Object.entries(LANGUAGES);
        const chunkSize = 10;
        
        for (let i = 0; i < entries.length; i += chunkSize) {
            const chunk = entries.slice(i, i + chunkSize);
            const fieldValue = chunk.map(([code, name]) => `\`${code}\` - ${name}`).join('\n');
            embed.addFields({ 
                name: i === 0 ? '📍 **Available Languages**' : '​', 
                value: fieldValue, 
                inline: true 
            });
        }

        embed.setTimestamp(); // 🔥 AMAN

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleAutoTranslate(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const channel = interaction.options.getChannel('channel');
        const language = interaction.options.getString('language');

        await interaction.deferReply({ ephemeral: true });

        try {
            if (language === 'disable') {
                this.autoTranslateChannels.delete(channel.id);
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ **AUTO-TRANSLATE DISABLED**')
                    .setDescription(`Auto-translate untuk <#${channel.id}> telah dinonaktifkan!`);
                    // 🔥 TIDAK PAKE TIMESTAMP!

                await interaction.editReply({ embeds: [embed] });
            } else {
                this.autoTranslateChannels.set(channel.id, language);
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ **AUTO-TRANSLATE ENABLED**')
                    .setDescription(`Channel <#${channel.id}> akan auto-translate ke **${LANGUAGES[language]}**!`)
                    .addFields(
                        { name: '📌 Channel', value: `<#${channel.id}>`, inline: true },
                        { name: '🎯 Target Language', value: LANGUAGES[language], inline: true },
                        { name: 'ℹ️ Note', value: 'Semua pesan di channel ini akan otomatis diterjemahkan', inline: false }
                    );
                    // 🔥 TIDAK PAKE TIMESTAMP!

                await interaction.editReply({ embeds: [embed] });
            }

            await this.saveConfig();

        } catch (error) {
            console.error('Auto-translate setup error:', error);
            await interaction.editReply({ content: '❌ Error setting up auto-translate!' });
        }
    }

    async handleDetect(interaction) {
        const text = interaction.options.getString('text');

        await interaction.deferReply();

        try {
            const detected = await this.detectLanguage(text);
            
            const embed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle('🔍 **LANGUAGE DETECTION**')
                .setDescription(`\`\`\`${text.substring(0, 500)}\`\`\``)
                .addFields(
                    { name: '🌍 Detected Language', value: LANGUAGES[detected] || detected, inline: true },
                    { name: '🎯 Language Code', value: `\`${detected}\``, inline: true }
                )
                .setTimestamp(); // 🔥 AMAN

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Detection error:', error);
            await interaction.editReply('❌ Error detecting language!');
        }
    }

    async handleBulk(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('translate_bulk_modal')
            .setTitle('🌍 Bulk Translate');

        const textInput = new TextInputBuilder()
            .setCustomId('bulk_text')
            .setLabel('Text to translate (max 1000 chars)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000)
            .setPlaceholder('Masukkan teks yang ingin diterjemahkan...');

        const langInput = new TextInputBuilder()
            .setCustomId('target_lang')
            .setLabel('Target Language (id/en/ja/etc)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(5)
            .setPlaceholder('Contoh: id, en, ja');

        const row1 = new ActionRowBuilder().addComponents(textInput);
        const row2 = new ActionRowBuilder().addComponents(langInput);

        modal.addComponents(row1, row2);
        await interaction.showModal(modal);
    }

    async handleModal(interaction) {
        if (interaction.customId === 'translate_bulk_modal') {
            const text = interaction.fields.getTextInputValue('bulk_text');
            const targetLang = interaction.fields.getTextInputValue('target_lang');

            await interaction.deferReply();

            try {
                const translated = await this.translate(text, targetLang);

                const embed = new EmbedBuilder()
                    .setColor(0x1E90FF)
                    .setTitle('📄 **BULK TRANSLATION**')
                    .addFields(
                        { name: `📝 Original`, value: `\`\`\`${text.substring(0, 500)}\`\`\``, inline: false },
                        { name: `🎯 Translation (${LANGUAGES[targetLang] || targetLang})`, value: `\`\`\`${translated.substring(0, 500)}\`\`\``, inline: false }
                    )
                    .setFooter({ text: 'Bulk translation completed' })
                    .setTimestamp(); // 🔥 AMAN

                await interaction.editReply({ embeds: [embed] });

            } catch (error) {
                console.error('Bulk translate error:', error);
                await interaction.editReply('❌ Error translating text!');
            }
        }
    }

    async handleInteraction(interaction) {
        if (interaction.isModalSubmit()) {
            await this.handleModal(interaction);
        }
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        const languageChoices = Object.entries(LANGUAGES).map(([code, name]) => ({
            name: name,
            value: code
        }));

        return [
            new SlashCommandBuilder()
                .setName('translate')
                .setDescription('🌍 Terjemahkan teks ke berbagai bahasa')
                .addSubcommand(sub =>
                    sub.setName('to')
                        .setDescription('Terjemahkan teks')
                        .addStringOption(opt => 
                            opt.setName('text')
                                .setDescription('Teks yang ingin diterjemahkan')
                                .setRequired(true)
                                .setMaxLength(500))
                        .addStringOption(opt => 
                            opt.setName('to')
                                .setDescription('Bahasa target')
                                .setRequired(true)
                                .addChoices(...languageChoices))
                        .addStringOption(opt => 
                            opt.setName('from')
                                .setDescription('Bahasa sumber (auto = deteksi otomatis)')
                                .setRequired(false)
                                .addChoices(...languageChoices)))
                .addSubcommand(sub =>
                    sub.setName('languages')
                        .setDescription('Lihat daftar bahasa yang didukung'))
                .addSubcommand(sub =>
                    sub.setName('detect')
                        .setDescription('Deteksi bahasa dari teks')
                        .addStringOption(opt => 
                            opt.setName('text')
                                .setDescription('Teks yang ingin dideteksi')
                                .setRequired(true)
                                .setMaxLength(500)))
                .addSubcommand(sub =>
                    sub.setName('bulk')
                        .setDescription('Terjemahkan teks panjang'))
                .addSubcommand(sub =>
                    sub.setName('auto')
                        .setDescription('[ADMIN] Setup auto-translate channel')
                        .addChannelOption(opt => 
                            opt.setName('channel')
                                .setDescription('Channel untuk auto-translate')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true))
                        .addStringOption(opt => 
                            opt.setName('language')
                                .setDescription('Bahasa target (disable = matikan)')
                                .setRequired(true)
                                .addChoices(
                                    { name: '🇮🇩 Indonesia', value: 'id' },
                                    { name: '🇬🇧 English', value: 'en' },
                                    { name: '🇯🇵 Japanese', value: 'ja' },
                                    { name: '🇰🇷 Korean', value: 'ko' },
                                    { name: '🇨🇳 Chinese', value: 'zh' },
                                    { name: '🇪🇸 Spanish', value: 'es' },
                                    { name: '🇫🇷 French', value: 'fr' },
                                    { name: '🇩🇪 German', value: 'de' },
                                    { name: '❌ Disable', value: 'disable' }
                                )))
        ];
    }

    static async handleCommand(interaction, plugin) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case 'to': await plugin.handleTranslate(interaction); break;
                case 'languages': await plugin.handleLanguages(interaction); break;
                case 'detect': await plugin.handleDetect(interaction); break;
                case 'bulk': await plugin.handleBulk(interaction); break;
                case 'auto': await plugin.handleAutoTranslate(interaction); break;
                default:
                    await interaction.reply({ 
                        content: '❌ Subcommand tidak dikenal!', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error(`Translator command error (${subcommand}):`, error);
            
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

module.exports = TranslatorPlugin;
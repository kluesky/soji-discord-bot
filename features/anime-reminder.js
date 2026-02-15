// anime-reminder.js - ANIME RELEASE REMINDER DENGAN POLLING SYSTEM!
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// 🔥 PAKE GRAPHQL REQUEST, BUKAN WEBSOCKET!
const { GraphQLClient, gql } = require('graphql-request');

class AnimeReminder {
    constructor(client) {
        this.client = client;
        this.name = 'anime-reminder';
        this.version = '2.0.0'; // POLLING VERSION!
        
        // ✅ ANILIST GRAPHQL ENDPOINT - 100% WORKING!
        this.anilist = new GraphQLClient('https://graphql.anilist.co');
        
        // Database paths
        this.subsPath = path.join(__dirname, 'data', 'anime_subs.json');
        this.cachePath = path.join(__dirname, 'data', 'anime_cache.json');
        
        // Store subscriptions
        this.subscriptions = new Map();
        this.notifiedEpisodes = new Map();
        
        this.loadData();
        this.startPolling();
        
        console.log('📺 Anime Reminder System initialized (Polling Mode)');
    }

    async loadData() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        
        // ===== LOAD SUBSCRIPTIONS =====
        try {
            const subsData = await fs.readFile(this.subsPath, 'utf8');
            
            // CEK APAKAH FILE KOSONG
            if (!subsData || subsData.trim() === '') {
                throw new Error('Empty file');
            }
            
            const parsedSubs = JSON.parse(subsData);
            for (const [key, sub] of Object.entries(parsedSubs)) {
                this.subscriptions.set(key, sub);
            }
            console.log(`📺 Loaded ${this.subscriptions.size} anime subscriptions`);
        } catch (error) {
            console.log('📺 No subscription data found, creating new database...');
            await fs.writeFile(this.subsPath, '{}');
            this.subscriptions.clear();
        }
        
        // ===== LOAD NOTIFIED EPISODES CACHE =====
        try {
            const cacheData = await fs.readFile(this.cachePath, 'utf8');
            
            // CEK APAKAH FILE KOSONG
            if (!cacheData || cacheData.trim() === '') {
                throw new Error('Empty file');
            }
            
            const parsedCache = JSON.parse(cacheData);
            for (const [key, value] of Object.entries(parsedCache)) {
                this.notifiedEpisodes.set(key, value);
            }
            console.log(`📺 Loaded ${this.notifiedEpisodes.size} notified episodes`);
        } catch (error) {
            console.log('📺 No cache data found, creating new database...');
            await fs.writeFile(this.cachePath, '{}');
            this.notifiedEpisodes.clear();
        }
        
    } catch (error) {
        console.error('Error loading anime reminder data:', error);
    }
}

    async saveData() {
        try {
            // Save subscriptions
            const subsObj = {};
            this.subscriptions.forEach((value, key) => {
                subsObj[key] = value;
            });
            await fs.writeFile(this.subsPath, JSON.stringify(subsObj, null, 2));
            
            // Save cache (only keep last 7 days)
            const now = Date.now();
            const cacheObj = {};
            this.notifiedEpisodes.forEach((timestamp, key) => {
                if (now - timestamp < 7 * 24 * 60 * 60 * 1000) { // 7 days
                    cacheObj[key] = timestamp;
                }
            });
            await fs.writeFile(this.cachePath, JSON.stringify(cacheObj, null, 2));
        } catch (error) {
            console.error('Error saving anime reminder data:', error);
        }
    }

    // 🔥 POLLING EVERY 2 MINUTES
    startPolling() {
        setInterval(async () => {
            await this.checkAiringSchedules();
        }, 120000); // 2 menit
        
        console.log('⏰ Polling started - checking every 2 minutes');
        
        // Initial check
        setTimeout(() => this.checkAiringSchedules(), 5000);
    }

    async checkAiringSchedules() {
        if (this.subscriptions.size === 0) return;
        
        // Get all unique anime IDs from subscriptions
        const animeIds = new Set();
        this.subscriptions.forEach(sub => {
            if (sub.animeId) animeIds.add(sub.animeId);
        });
        
        if (animeIds.size === 0) return;
        
        // Query AniList for airing schedules
        const query = gql`
            query ($ids: [Int]) {
                Page(page: 1, perPage: 50) {
                    media(id_in: $ids, type: ANIME, status_in: [RELEASING, NOT_YET_RELEASED]) {
                        id
                        title {
                            romaji
                            english
                            native
                        }
                        coverImage {
                            large
                            medium
                        }
                        bannerImage
                        siteUrl
                        meanScore
                        popularity
                        episodes
                        duration
                        nextAiringEpisode {
                            episode
                            airingAt
                            timeUntilAiring
                        }
                        externalLinks {
                            url
                            site
                        }
                    }
                }
            }
        `;

        try {
            const data = await this.anilist.request(query, { 
                ids: Array.from(animeIds) 
            });
            
            for (const anime of data.Page.media) {
                await this.processAnimeSchedule(anime);
            }
        } catch (error) {
            console.error('Polling error:', error.message);
        }
    }

    async processAnimeSchedule(anime) {
        const nextEpisode = anime.nextAiringEpisode;
        if (!nextEpisode) return;
        
        const { episode, airingAt } = nextEpisode;
        const cacheKey = `${anime.id}-${episode}`;
        const now = Date.now();
        const airingTime = airingAt * 1000; // Convert to milliseconds
        
        // Check if episode is airing now (within 5 minutes)
        if (airingTime <= now + 300000 && !this.notifiedEpisodes.has(cacheKey)) {
            // Get all subscribers for this anime
            const subscribers = [];
            this.subscriptions.forEach(sub => {
                if (sub.animeId === anime.id) {
                    subscribers.push(sub);
                }
            });
            
            if (subscribers.length > 0) {
                await this.sendNotification(anime, episode, airingAt, subscribers);
                this.notifiedEpisodes.set(cacheKey, now);
                await this.saveData();
            }
        }
    }

    async sendNotification(anime, episode, airingAt, subscribers) {
        const title = anime.title.english || anime.title.romaji;
        
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle(`📺 **${title}**`)
            .setDescription(`
🎬 **Episode ${episode}** telah rilis!

⏰ **Waktu Tayang:** <t:${airingAt}:F>
🕒 **Relative:** <t:${airingAt}:R>

📊 **Rating:** ${anime.meanScore ? `${anime.meanScore}%` : 'N/A'}
🔥 **Popularity:** ${anime.popularity?.toLocaleString() || 'N/A'}
            `)
            .setURL(anime.siteUrl || 'https://anilist.co')
            .setThumbnail(anime.coverImage?.large || anime.coverImage?.medium)
            .setTimestamp();

        if (anime.episodes) {
            embed.addFields({ 
                name: '📋 Total Episode', 
                value: `${episode}/${anime.episodes}`, 
                inline: true 
            });
        }

        if (anime.duration) {
            embed.addFields({ 
                name: '⏱️ Durasi', 
                value: `${anime.duration} menit`, 
                inline: true 
            });
        }

        // Add streaming links
        if (anime.externalLinks && anime.externalLinks.length > 0) {
            const streaming = anime.externalLinks
                .filter(link => ['Crunchyroll', 'Netflix', 'Hulu', 'Disney+', 'Amazon', 'Bstation', 'YouTube']
                    .includes(link.site))
                .slice(0, 3);
            
            if (streaming.length > 0) {
                const links = streaming.map(l => `[${l.site}](${l.url})`).join(' • ');
                embed.addFields({ name: '🔗 Streaming', value: links, inline: false });
            }
        }

        embed.setFooter({ 
            text: 'AniList • Auto-Update setiap 2 menit',
            iconURL: 'https://anilist.co/img/logo_al.png'
        });

        // Send to all subscribers
        for (const sub of subscribers) {
            try {
                const guild = this.client.guilds.cache.get(sub.guildId);
                if (!guild) continue;

                const channel = guild.channels.cache.get(sub.channelId);
                if (!channel) continue;

                let content = '';
                if (sub.roleId) {
                    content = `<@&${sub.roleId}> • **${title}** Episode ${episode} udah rilis!`;
                }

                await channel.send({ content, embeds: [embed] });
            } catch (error) {
                console.error(`Failed to send to ${sub.userId}:`, error.message);
            }
        }
    }

    async searchAnime(query) {
        const searchQuery = gql`
            query ($search: String) {
                Page(page: 1, perPage: 10) {
                    media(search: $search, type: ANIME, status_in: [RELEASING, NOT_YET_RELEASED]) {
                        id
                        title {
                            romaji
                            english
                            native
                        }
                        episodes
                        status
                        nextAiringEpisode {
                            episode
                            airingAt
                            timeUntilAiring
                        }
                        description
                        coverImage {
                            medium
                            large
                        }
                        meanScore
                        popularity
                    }
                }
            }
        `;

        try {
            const data = await this.anilist.request(searchQuery, { search: query });
            return data.Page.media;
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    // ==================== COMMAND HANDLERS ====================

    async handleSetup(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Kamu butuh permission **Administrator**!', 
                flags: 64 
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('📺 **ANIME REMINDER SETUP**')
            .setDescription(`
**Cara menggunakan Anime Reminder:**

1️⃣ **Subscribe Anime**
\`/anime-reminder subscribe anime: <judul>\`
• Bot akan cari anime yang sedang tayang
• Pilih channel notifikasi (default: channel saat ini)
• (Opsional) Pilih role untuk di-ping

2️⃣ **Lihat Subscription**
\`/anime-reminder list\`
• Tampilkan semua anime yang di-subscribe di server ini

3️⃣ **Berhenti Subscribe**
\`/anime-reminder unsubscribe anime: <judul>\`
• Hapus anime dari subscription

**📊 Cara Kerja:**
• Bot cek jadwal setiap **2 menit**
• Notifikasi dikirim **saat episode rilis**
• Support streaming: Crunchyroll, Netflix, Bstation, dll
• Data dari **AniList** (real-time)

**✅ Status:** 🟢 Online
**⏰ Polling:** Setiap 2 menit
**📊 Rate Limit:** Aman (30 req/jam)
            `)
            .setTimestamp()
            .setFooter({ 
                text: 'Anime Reminder System v2.0',
                iconURL: this.client.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed], flags: 64 });
    }

    async handleSubscribe(interaction) {
        const animeTitle = interaction.options.getString('anime');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const role = interaction.options.getRole('role');
        
        await interaction.deferReply({ flags: 64 });

        try {
            const results = await this.searchAnime(animeTitle);
            
            if (results.length === 0) {
                return interaction.editReply({ 
                    content: `❌ Anime "${animeTitle}" tidak ditemukan atau sudah tamat!` 
                });
            }

            // If multiple results, show selection menu
            if (results.length > 1) {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('anime_select')
                    .setPlaceholder('Pilih anime yang dimaksud')
                    .addOptions(
                        results.slice(0, 5).map(anime => {
                            const title = anime.title.english || anime.title.romaji;
                            const episode = anime.nextAiringEpisode?.episode || '?';
                            return new StringSelectMenuOptionBuilder()
                                .setLabel(title.length > 100 ? title.substring(0, 97) + '...' : title)
                                .setDescription(`Episode berikutnya: ${episode}`)
                                .setValue(anime.id.toString())
                                .setEmoji('📺');
                        })
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);
                
                // Store context for later
                interaction.client.tempSubscribe = interaction.client.tempSubscribe || new Map();
                interaction.client.tempSubscribe.set(interaction.user.id, {
                    channelId: channel.id,
                    roleId: role?.id,
                    guildId: interaction.guild.id
                });

                return interaction.editReply({
                    content: '🔍 **Ditemukan beberapa anime. Pilih yang kamu maksud:**',
                    components: [row]
                });
            }

            // Single result - subscribe langsung
            const anime = results[0];
            await this.createSubscription(interaction, anime, channel.id, role?.id);

        } catch (error) {
            console.error('Subscribe error:', error);
            await interaction.editReply({ 
                content: '❌ Gagal subscribe anime. Pastikan judul benar!' 
            });
        }
    }

    async createSubscription(interaction, anime, channelId, roleId = null) {
        const animeId = anime.id;
        const animeName = anime.title.english || anime.title.romaji;
        const subKey = `${interaction.guild.id}-${animeId}`;
        
        // Check if already subscribed in this guild
        if (this.subscriptions.has(subKey)) {
            return interaction.editReply({ 
                content: `❌ Anime **${animeName}** sudah di-subscribe di server ini!` 
            });
        }

        // Save subscription
        this.subscriptions.set(subKey, {
            guildId: interaction.guild.id,
            channelId: channelId,
            roleId: roleId,
            animeId: animeId,
            animeTitle: animeName,
            subscribedBy: interaction.user.id,
            subscribedAt: Date.now()
        });

        await this.saveData();

        const nextEpisode = anime.nextAiringEpisode;
        const nextTime = nextEpisode ? `<t:${nextEpisode.airingAt}:F>` : 'Tidak diketahui';
        const nextRelative = nextEpisode ? `<t:${nextEpisode.airingAt}:R>` : '-';

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **SUBSCRIPTION ADDED**')
            .setThumbnail(anime.coverImage?.medium || anime.coverImage?.large)
            .setDescription(`**${animeName}**`)
            .addFields(
                { name: '📺 Channel Notifikasi', value: `<#${channelId}>`, inline: true },
                { name: '📊 Total Episode', value: anime.episodes?.toString() || 'Ongoing', inline: true },
                { name: '🎬 Episode Berikutnya', value: nextEpisode ? `Episode ${nextEpisode.episode}` : 'TBD', inline: true },
                { name: '⏰ Jadwal Tayang', value: nextTime, inline: false },
                { name: '⏳ Countdown', value: nextRelative, inline: false }
            )
            .setTimestamp();

        if (roleId) {
            embed.addFields({ name: '🎭 Role Ping', value: `<@&${roleId}>`, inline: true });
        }

        if (anime.meanScore) {
            embed.addFields({ name: '⭐ Rating', value: `${anime.meanScore}%`, inline: true });
        }

        if (anime.popularity) {
            embed.addFields({ name: '🔥 Popularitas', value: anime.popularity.toLocaleString(), inline: true });
        }

        await interaction.editReply({ embeds: [embed] });
    }

    async handleList(interaction) {
        const guildSubs = [];
        this.subscriptions.forEach(sub => {
            if (sub.guildId === interaction.guild.id) {
                guildSubs.push(sub);
            }
        });

        if (guildSubs.length === 0) {
            return interaction.reply({ 
                content: '📭 Belum ada anime yang di-subscribe di server ini!', 
                flags: 64 
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('📋 **ANIME SUBSCRIPTIONS**')
            .setDescription(`Total: **${guildSubs.length}** anime`)
            .setTimestamp();

        for (const sub of guildSubs) {
            embed.addFields({
                name: sub.animeTitle,
                value: `📺 Channel: <#${sub.channelId}>\n👤 Subscribed by: <@${sub.subscribedBy}>\n📅 Since: <t:${Math.floor(sub.subscribedAt/1000)}:R>${sub.roleId ? `\n🎭 Role: <@&${sub.roleId}>` : ''}`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed], flags: 64 });
    }

    async handleUnsubscribe(interaction) {
        const animeTitle = interaction.options.getString('anime');
        
        let removed = false;
        let removedTitle = '';

        for (const [key, sub] of this.subscriptions) {
            if (sub.guildId === interaction.guild.id && 
                sub.animeTitle.toLowerCase().includes(animeTitle.toLowerCase())) {
                this.subscriptions.delete(key);
                removed = true;
                removedTitle = sub.animeTitle;
                break;
            }
        }

        if (removed) {
            await this.saveData();
            await interaction.reply({ 
                content: `✅ Berhasil unsubscribe **${removedTitle}**!`, 
                flags: 64 
            });
        } else {
            await interaction.reply({ 
                content: `❌ Anime "${animeTitle}" tidak ditemukan di subscription server ini!`, 
                flags: 64 
            });
        }
    }

    // ==================== INTERACTION HANDLER ====================

    async handleSelect(interaction) {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'anime_select') return;

        const animeId = parseInt(interaction.values[0]);
        const temp = interaction.client.tempSubscribe?.get(interaction.user.id);
        
        if (!temp) {
            return interaction.reply({ 
                content: '❌ Session expired! Coba subscribe ulang.', 
                flags: 64 
            });
        }

        await interaction.deferUpdate();

        try {
            // Get full anime data
            const query = gql`
                query ($id: Int) {
                    Media(id: $id, type: ANIME) {
                        id
                        title {
                            romaji
                            english
                        }
                        episodes
                        nextAiringEpisode {
                            episode
                            airingAt
                        }
                        coverImage {
                            medium
                            large
                        }
                        meanScore
                        popularity
                    }
                }
            `;

            const data = await this.anilist.request(query, { id: animeId });
            const anime = data.Media;

            await this.createSubscription(interaction, anime, temp.channelId, temp.roleId);
            
            // Clean up temp data
            interaction.client.tempSubscribe.delete(interaction.user.id);

        } catch (error) {
            console.error('Select error:', error);
            await interaction.editReply({ 
                content: '❌ Gagal memproses pilihan anime!' 
            });
        }
    }

    async handleInteraction(interaction) {
        await this.handleSelect(interaction);
    }

    // ==================== STATIC METHODS ====================

    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('anime-reminder')
                .setDescription('📺 Anime release notification system')
                .addSubcommand(sub =>
                    sub.setName('setup')
                        .setDescription('📖 Cara menggunakan anime reminder'))
                .addSubcommand(sub =>
                    sub.setName('subscribe')
                        .setDescription('✅ Subscribe notifikasi episode baru')
                        .addStringOption(opt =>
                            opt.setName('anime')
                                .setDescription('Judul anime')
                                .setRequired(true))
                        .addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('Channel untuk notifikasi (default: current)')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(false))
                        .addRoleOption(opt =>
                            opt.setName('role')
                                .setDescription('Role yang di-ping saat rilis')
                                .setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('unsubscribe')
                        .setDescription('❌ Berhenti subscribe anime')
                        .addStringOption(opt =>
                            opt.setName('anime')
                                .setDescription('Judul anime')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('📋 Lihat subscription di server ini'))
        ];
    }

    static async handleCommand(interaction, reminder) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'setup':
                await reminder.handleSetup(interaction);
                break;
            case 'subscribe':
                await reminder.handleSubscribe(interaction);
                break;
            case 'unsubscribe':
                await reminder.handleUnsubscribe(interaction);
                break;
            case 'list':
                await reminder.handleList(interaction);
                break;
        }
    }
}

module.exports = AnimeReminder;
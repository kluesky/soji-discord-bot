// anime-theater.js - ANIME VOICE CHANNEL THEATER
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class AnimeTheaterSystem {
    constructor(client) {
        this.client = client;
        this.name = 'anime-theater';
        this.version = '1.0.0';
        
        this.schedulePath = path.join(__dirname, 'data', 'theater_schedule.json');
        this.schedule = new Map();
        
        this.activeTheaters = new Map();
        
        this.loadData();
    }

    async loadData() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        
        try {
            const data = await fs.readFile(this.schedulePath, 'utf8');
            if (data.trim() === '') {
                throw new Error('Empty file');
            }
            const parsed = JSON.parse(data);
            for (const [id, schedule] of Object.entries(parsed)) {
                this.schedule.set(id, schedule);
            }
            console.log(`🎬 Loaded theater schedule for ${this.schedule.size} servers`);
        } catch (error) {
            console.log('🎬 Theater schedule empty, initializing default...');
            await this.initSchedule();
            // Load after init
            const data = await fs.readFile(this.schedulePath, 'utf8');
            const parsed = JSON.parse(data);
            for (const [id, schedule] of Object.entries(parsed)) {
                this.schedule.set(id, schedule);
            }
            console.log(`🎬 Initialized default theater schedule`);
        }
        
    } catch (error) {
        console.error('❌ Error loading theater data:', error);
    }
}

    async initSchedule() {
        const defaultSchedule = {
            "default": [
                {
                    day: "Friday",
                    time: "20:00",
                    title: "🎬 Movie Night",
                    description: "Nonton film anime bersama!",
                    anime: "Voting di #theater-vote"
                },
                {
                    day: "Saturday",
                    time: "19:00",
                    title: "📺 Episode Marathon",
                    description: "12 episode sekaligus!",
                    anime: "Voting di #theater-vote"
                },
                {
                    day: "Sunday",
                    time: "15:00",
                    title: "🎉 Season Premiere",
                    description: "Nonton episode 1 anime baru!",
                    anime: "Voting di #theater-vote"
                }
            ]
        };
        
        await fs.writeFile(this.schedulePath, JSON.stringify(defaultSchedule, null, 2));
    }

    async saveSchedule() {
        const obj = {};
        this.schedule.forEach((sched, id) => {
            obj[id] = sched;
        });
        await fs.writeFile(this.schedulePath, JSON.stringify(obj, null, 2));
    }

    // ==================== ANIME DATABASE ====================
    getAnimeSuggestions() {
        return [
            { name: "Spirited Away", year: 2001, studio: "Studio Ghibli", episodes: 1, rating: 8.6 },
            { name: "Your Name", year: 2016, studio: "CoMix Wave", episodes: 1, rating: 8.4 },
            { name: "Weathering With You", year: 2019, studio: "CoMix Wave", episodes: 1, rating: 7.8 },
            { name: "A Silent Voice", year: 2016, studio: "Kyoto Animation", episodes: 1, rating: 8.2 },
            { name: "Demon Slayer: Mugen Train", year: 2020, studio: "Ufotable", episodes: 1, rating: 8.3 },
            { name: "Jujutsu Kaisen 0", year: 2021, studio: "MAPPA", episodes: 1, rating: 8.0 },
            { name: "One Piece: Film Red", year: 2022, studio: "Toei", episodes: 1, rating: 7.9 },
            { name: "Dragon Ball Super: Broly", year: 2018, studio: "Toei", episodes: 1, rating: 8.1 }
        ];
    }

    // ==================== COMMAND HANDLERS ====================
    async handleSchedule(interaction) {
        const serverSchedule = this.schedule.get(interaction.guild.id) || this.schedule.get('default');
        
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('🎬 **THEATER SCHEDULE**')
            .setDescription('Jadwal nonton bareng minggu ini!')
            .setTimestamp();
        
        serverSchedule.forEach(item => {
            embed.addFields({
                name: `${item.day} ${item.time}`,
                value: `**${item.title}**\n${item.description}\n🎬 ${item.anime}`,
                inline: false
            });
        });
        
        embed.setFooter({ text: 'Gunakan /theater create untuk mulai nonton!' });
        
        await interaction.reply({ embeds: [embed] });
    }

    async handleCreate(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel) {
            return interaction.reply({ 
                content: '❌ Kamu harus berada di voice channel!', 
                ephemeral: true 
            });
        }
        
        await interaction.deferReply();
        
        try {
            // Create text channel for theater
            const theaterChannel = await interaction.guild.channels.create({
                name: `🎬-theater-${voiceChannel.name}`,
                type: ChannelType.GuildText,
                parent: voiceChannel.parent,
                topic: `Nonton bareng di ${voiceChannel.name} | Host: ${interaction.user.tag}`,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    }
                ]
            });
            
            // Store theater data
            const theaterId = `theater_${Date.now()}`;
            this.activeTheaters.set(theaterId, {
                id: theaterId,
                voiceChannelId: voiceChannel.id,
                textChannelId: theaterChannel.id,
                hostId: interaction.user.id,
                startedAt: Date.now(),
                viewers: [interaction.user.id],
                currentAnime: null,
                votes: new Map()
            });
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎬 **THEATER CREATED!**')
                .setDescription(`✅ Theater berhasil dibuat di **${voiceChannel.name}**!`)
                .addFields(
                    { name: '📺 Text Channel', value: `<#${theaterChannel.id}>`, inline: true },
                    { name: '🎤 Voice Channel', value: `${voiceChannel.name}`, inline: true },
                    { name: '👑 Host', value: `${interaction.user}`, inline: true }
                )
                .setFooter({ text: 'Gunakan /theater suggest untuk request anime!' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
            // Send welcome message in theater channel
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle('🎬 **WELCOME TO THE THEATER!**')
                .setDescription(`
👑 **Host:** ${interaction.user}
🎤 **Voice:** ${voiceChannel.name}

**COMMANDS:**
• /theater suggest - Request anime
• /theater vote - Vote anime
• /theater snack - Beli snack
• /theater react - Kirim reaction

Selamat menonton! 🍿
                `)
                .setTimestamp();
            
            await theaterChannel.send({ embeds: [welcomeEmbed] });
            
        } catch (error) {
            console.error('Theater creation error:', error);
            await interaction.editReply({ content: '❌ Error creating theater!' });
        }
    }

    async handleJoin(interaction) {
        // Find active theater
        let targetTheater = null;
        let theaterId = null;
        
        for (const [id, theater] of this.activeTheaters) {
            if (theater.voiceChannelId === interaction.member.voice.channel?.id) {
                targetTheater = theater;
                theaterId = id;
                break;
            }
        }
        
        if (!targetTheater) {
            return interaction.reply({ 
                content: '❌ Tidak ada theater aktif di voice channel ini!', 
                ephemeral: true 
            });
        }
        
        if (targetTheater.viewers.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: '❌ Kamu sudah join theater ini!', 
                ephemeral: true 
            });
        }
        
        targetTheater.viewers.push(interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **JOINED THEATER**')
            .setDescription(`${interaction.user} bergabung ke theater!`)
            .addFields(
                { name: '👥 Viewers', value: `${targetTheater.viewers.length}`, inline: true }
            )
            .setTimestamp();
        
        const textChannel = interaction.guild.channels.cache.get(targetTheater.textChannelId);
        if (textChannel) {
            await textChannel.send({ embeds: [embed] });
        }
        
        await interaction.reply({ 
            content: '✅ Kamu bergabung ke theater!', 
            ephemeral: true 
        });
    }

    async handleSuggest(interaction) {
        const animeName = interaction.options.getString('anime');
        
        // Find active theater
        let targetTheater = null;
        
        for (const theater of this.activeTheaters.values()) {
            if (theater.voiceChannelId === interaction.member.voice.channel?.id) {
                targetTheater = theater;
                break;
            }
        }
        
        if (!targetTheater) {
            return interaction.reply({ 
                content: '❌ Kamu harus berada di theater!', 
                ephemeral: true 
            });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const suggestion = {
                name: animeName,
                suggestedBy: interaction.user.id,
                suggestedAt: Date.now(),
                votes: 1,
                voters: [interaction.user.id]
            };
            
            if (!targetTheater.suggestions) {
                targetTheater.suggestions = [];
            }
            
            targetTheater.suggestions.push(suggestion);
            
            const embed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle('🎬 **ANIME SUGGESTION**')
                .setDescription(`**${animeName}** direquest oleh ${interaction.user}`)
                .addFields(
                    { name: '🗳️ Votes', value: '1', inline: true },
                    { name: '📊 Total Suggestions', value: `${targetTheater.suggestions.length}`, inline: true }
                )
                .setFooter({ text: 'Gunakan /theater vote untuk memilih!' })
                .setTimestamp();
            
            const textChannel = interaction.guild.channels.cache.get(targetTheater.textChannelId);
            if (textChannel) {
                await textChannel.send({ embeds: [embed] });
            }
            
            await interaction.editReply({ 
                content: `✅ Anime **${animeName}** berhasil direquest!` 
            });
            
        } catch (error) {
            console.error('Theater suggest error:', error);
            await interaction.editReply({ content: '❌ Error suggesting anime!' });
        }
    }

    async handleVote(interaction) {
        const suggestionIndex = interaction.options.getInteger('suggestion');
        
        // Find active theater
        let targetTheater = null;
        
        for (const theater of this.activeTheaters.values()) {
            if (theater.voiceChannelId === interaction.member.voice.channel?.id) {
                targetTheater = theater;
                break;
            }
        }
        
        if (!targetTheater) {
            return interaction.reply({ 
                content: '❌ Kamu harus berada di theater!', 
                ephemeral: true 
            });
        }
        
        if (!targetTheater.suggestions || targetTheater.suggestions.length === 0) {
            return interaction.reply({ 
                content: '❌ Belum ada request anime!', 
                ephemeral: true 
            });
        }
        
        if (suggestionIndex < 1 || suggestionIndex > targetTheater.suggestions.length) {
            return interaction.reply({ 
                content: '❌ Nomor suggestion tidak valid!', 
                ephemeral: true 
            });
        }
        
        const suggestion = targetTheater.suggestions[suggestionIndex - 1];
        
        if (suggestion.voters.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: '❌ Kamu sudah vote anime ini!', 
                ephemeral: true 
            });
        }
        
        suggestion.votes++;
        suggestion.voters.push(interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🗳️ **VOTE CASTED**')
            .setDescription(`Kamu memilih **${suggestion.name}**!`)
            .addFields(
                { name: '📊 Total Votes', value: `${suggestion.votes}`, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // Update suggestion message
        const textChannel = interaction.guild.channels.cache.get(targetTheater.textChannelId);
        if (textChannel) {
            const messages = await textChannel.messages.fetch({ limit: 10 });
            const suggestionMsg = messages.find(msg => 
                msg.embeds[0]?.title === '🎬 **ANIME SUGGESTION**' && 
                msg.embeds[0]?.description?.includes(suggestion.name)
            );
            
            if (suggestionMsg) {
                const updatedEmbed = EmbedBuilder.from(suggestionMsg.embeds[0])
                    .spliceFields(0, 1, { 
                        name: '🗳️ Votes', 
                        value: `${suggestion.votes}`, 
                        inline: true 
                    });
                
                await suggestionMsg.edit({ embeds: [updatedEmbed] });
            }
        }
    }

    async handleSnack(interaction) {
        const snack = interaction.options.getString('snack');
        
        // Get economy plugin
        const economyPlugin = interaction.client.economySystem;
        if (!economyPlugin) {
            return interaction.reply({ content: '❌ Economy system tidak tersedia!', ephemeral: true });
        }
        
        const snacks = {
            'popcorn': { name: '🍿 Popcorn', price: 100, emoji: '🍿' },
            'ramune': { name: '🥤 Ramune', price: 200, emoji: '🥤' },
            'ramen': { name: '🍜 Ramen', price: 500, emoji: '🍜' },
            'dango': { name: '🍡 Dango', price: 300, emoji: '🍡' }
        };
        
        const selectedSnack = snacks[snack];
        if (!selectedSnack) {
            return interaction.reply({ content: '❌ Snack tidak valid!', ephemeral: true });
        }
        
        const userBalance = await economyPlugin.getUser(interaction.user.id, interaction.guild.id);
        if (userBalance.balance < selectedSnack.price) {
            return interaction.reply({ 
                content: `❌ Uang tidak cukup! Butuh ${selectedSnack.price} coins`, 
                ephemeral: true 
            });
        }
        
        await economyPlugin.addBalance(interaction.user.id, interaction.guild.id, -selectedSnack.price);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🍿 **SNACK PURCHASED**')
            .setDescription(`${interaction.user} membeli **${selectedSnack.name}**!`)
            .addFields(
                { name: '💰 Price', value: `${selectedSnack.price} coins`, inline: true }
            )
            .setTimestamp();
        
        // Find active theater
        for (const theater of this.activeTheaters.values()) {
            if (theater.voiceChannelId === interaction.member.voice.channel?.id) {
                const textChannel = interaction.guild.channels.cache.get(theater.textChannelId);
                if (textChannel) {
                    await textChannel.send({ embeds: [embed] });
                }
                break;
            }
        }
        
        await interaction.reply({ 
            content: `✅ Kamu membeli **${selectedSnack.name}**!`, 
            ephemeral: true 
        });
    }

    async handleReact(interaction) {
        const reaction = interaction.options.getString('reaction');
        
        const reactions = {
            'laugh': { emoji: '😂', name: 'Laugh' },
            'cry': { emoji: '😭', name: 'Cry' },
            'shock': { emoji: '😱', name: 'Shock' },
            'heart': { emoji: '❤️', name: 'Heart' },
            'clap': { emoji: '👏', name: 'Clap' }
        };
        
        const selectedReact = reactions[reaction];
        if (!selectedReact) {
            return interaction.reply({ content: '❌ Reaction tidak valid!', ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setDescription(`${interaction.user} ${selectedReact.emoji} **${selectedReact.name}**`)
            .setTimestamp();
        
        // Find active theater
        for (const theater of this.activeTheaters.values()) {
            if (theater.voiceChannelId === interaction.member.voice.channel?.id) {
                const textChannel = interaction.guild.channels.cache.get(theater.textChannelId);
                if (textChannel) {
                    await textChannel.send({ embeds: [embed] });
                }
                break;
            }
        }
        
        await interaction.reply({ 
            content: `✅ Reaction **${selectedReact.name}** dikirim!`, 
            ephemeral: true 
        });
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('theater')
                .setDescription('🎬 Anime Voice Theater')
                .addSubcommand(sub =>
                    sub.setName('schedule')
                        .setDescription('Lihat jadwal nonton bareng'))
                .addSubcommand(sub =>
                    sub.setName('create')
                        .setDescription('Buat theater di voice channel'))
                .addSubcommand(sub =>
                    sub.setName('join')
                        .setDescription('Join ke theater aktif'))
                .addSubcommand(sub =>
                    sub.setName('suggest')
                        .setDescription('Request anime untuk ditonton')
                        .addStringOption(opt =>
                            opt.setName('anime')
                                .setDescription('Judul anime')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('vote')
                        .setDescription('Vote anime yang direquest')
                        .addIntegerOption(opt =>
                            opt.setName('suggestion')
                                .setDescription('Nomor suggestion')
                                .setRequired(true)
                                .setMinValue(1)))
                .addSubcommand(sub =>
                    sub.setName('snack')
                        .setDescription('Beli snack untuk theater')
                        .addStringOption(opt =>
                            opt.setName('snack')
                                .setDescription('Pilih snack')
                                .setRequired(true)
                                .addChoices(
                                    { name: '🍿 Popcorn - 100 coins', value: 'popcorn' },
                                    { name: '🥤 Ramune - 200 coins', value: 'ramune' },
                                    { name: '🍜 Ramen - 500 coins', value: 'ramen' },
                                    { name: '🍡 Dango - 300 coins', value: 'dango' }
                                )))
                .addSubcommand(sub =>
                    sub.setName('react')
                        .setDescription('Kirim reaction ke theater')
                        .addStringOption(opt =>
                            opt.setName('reaction')
                                .setDescription('Pilih reaction')
                                .setRequired(true)
                                .addChoices(
                                    { name: '😂 Laugh', value: 'laugh' },
                                    { name: '😭 Cry', value: 'cry' },
                                    { name: '😱 Shock', value: 'shock' },
                                    { name: '❤️ Heart', value: 'heart' },
                                    { name: '👏 Clap', value: 'clap' }
                                )))
        ];
    }

    static async handleCommand(interaction, system) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'schedule': await system.handleSchedule(interaction); break;
            case 'create': await system.handleCreate(interaction); break;
            case 'join': await system.handleJoin(interaction); break;
            case 'suggest': await system.handleSuggest(interaction); break;
            case 'vote': await system.handleVote(interaction); break;
            case 'snack': await system.handleSnack(interaction); break;
            case 'react': await system.handleReact(interaction); break;
        }
    }
}

module.exports = AnimeTheaterSystem;
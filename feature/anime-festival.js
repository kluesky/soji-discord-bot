// anime-festival.js - ANIME FESTIVAL EVENT SYSTEM - FULL FIXED
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class AnimeFestivalSystem {
    constructor(client) {
        this.client = client;
        this.name = 'anime-festival';
        this.version = '1.0.0';
        
        this.dataPath = path.join(__dirname, 'data', 'festival_data.json');
        this.itemsPath = path.join(__dirname, 'data', 'festival_items.json');
        
        this.festivalData = new Map();
        this.festivalItems = new Map();
        
        this.currentEvent = null;
        this.eventEndTime = null;
        
        this.loadData();
        this.checkEventStatus();
    }

    async loadData() {
        try {
            await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
            
            // ===== LOAD FESTIVAL DATA =====
            try {
                const data = await fs.readFile(this.dataPath, 'utf8');
                if (data.trim() === '') throw new Error('Empty file');
                const parsed = JSON.parse(data);
                for (const [userId, userData] of Object.entries(parsed)) {
                    this.festivalData.set(userId, userData);
                }
                console.log(`🎪 Loaded ${this.festivalData.size} festival users`);
            } catch (error) {
                console.log('🎪 Festival database empty, creating new...');
                await fs.writeFile(this.dataPath, '{}');
                this.festivalData.clear();
            }
            
            // ===== LOAD FESTIVAL ITEMS =====
            try {
                const items = await fs.readFile(this.itemsPath, 'utf8');
                if (items.trim() === '') throw new Error('Empty file');
                const parsedItems = JSON.parse(items);
                for (const [id, item] of Object.entries(parsedItems)) {
                    this.festivalItems.set(id, item);
                }
                console.log(`🎪 Loaded ${this.festivalItems.size} festival items`);
            } catch (error) {
                console.log('🎪 Festival items database empty, initializing...');
                await this.initFestivalItems();
                const items = await fs.readFile(this.itemsPath, 'utf8');
                const parsedItems = JSON.parse(items);
                for (const [id, item] of Object.entries(parsedItems)) {
                    this.festivalItems.set(id, item);
                }
                console.log(`🎪 Initialized ${this.festivalItems.size} festival items`);
            }
            
        } catch (error) {
            console.error('❌ Error loading festival data:', error);
        }
    }

    async initFestivalItems() {
        const items = {
            "sakura_001": {
                id: "sakura_001",
                name: "🌸 Sakura Hairpin",
                season: "spring",
                price: 500,
                description: "Hiasan rambut bunga sakura",
                emoji: "🌸",
                limited: true
            },
            "sakura_002": {
                id: "sakura_002",
                name: "🎋 Tanabata Wish",
                season: "spring",
                price: 1000,
                description: "Tulis harapan di festival",
                emoji: "🎋",
                limited: true
            },
            "summer_001": {
                id: "summer_001",
                name: "🎆 Sparkler",
                season: "summer",
                price: 300,
                description: "Kembang api kecil",
                emoji: "🎆",
                limited: true
            },
            "summer_002": {
                id: "summer_002",
                name: "👘 Yukata",
                season: "summer",
                price: 2000,
                description: "Pakaian festival musim panas",
                emoji: "👘",
                limited: true
            },
            "autumn_001": {
                id: "autumn_001",
                name: "🍡 Dango",
                season: "autumn",
                price: 200,
                description: "3 tusuk dango",
                emoji: "🍡",
                limited: true
            },
            "autumn_002": {
                id: "autumn_002",
                name: "🌕 Moon Rabbit",
                season: "autumn",
                price: 1500,
                description: "Kelinci bulan peliharaan",
                emoji: "🐇",
                limited: true
            },
            "winter_001": {
                id: "winter_001",
                name: "🎍 Kadomatsu",
                season: "winter",
                price: 800,
                description: "Dekorasi tahun baru",
                emoji: "🎍",
                limited: true
            },
            "winter_002": {
                id: "winter_002",
                name: "🧧 Omikuji",
                season: "winter",
                price: 100,
                description: "Lotre keberuntungan",
                emoji: "🧧",
                limited: true
            }
        };
        
        await fs.writeFile(this.itemsPath, JSON.stringify(items, null, 2));
    }

    async saveData() {
        const obj = {};
        this.festivalData.forEach((data, userId) => {
            obj[userId] = data;
        });
        await fs.writeFile(this.dataPath, JSON.stringify(obj, null, 2));
    }

    checkEventStatus() {
        setInterval(() => {
            const now = new Date();
            const month = now.getMonth() + 1;
            
            let season = 'spring';
            if (month >= 3 && month <= 5) season = 'spring';
            else if (month >= 6 && month <= 8) season = 'summer';
            else if (month >= 9 && month <= 11) season = 'autumn';
            else season = 'winter';
            
            if (!this.currentEvent || this.currentEvent.season !== season) {
                this.startEvent(season);
            }
        }, 3600000);
    }

    startEvent(season) {
        const eventNames = {
            spring: '🌸 SAKURA FESTIVAL',
            summer: '🎆 FIREWORKS FESTIVAL',
            autumn: '🌕 MOON VIEWING FESTIVAL',
            winter: '🎍 NEW YEAR FESTIVAL'
        };
        
        this.currentEvent = {
            season,
            name: eventNames[season],
            startTime: Date.now(),
            endTime: Date.now() + 7 * 24 * 60 * 60 * 1000
        };
        
        console.log(`🎪 Event started: ${eventNames[season]}`);
    }

    async getUserFestivalData(userId, guildId) {
        const key = `${guildId}-${userId}`;
        if (!this.festivalData.has(key)) {
            this.festivalData.set(key, {
                userId,
                guildId,
                tickets: 0,
                totalTickets: 0,
                gamesPlayed: 0,
                items: [],
                lastPlayed: 0,
                streak: 0,
                highScore: 0
            });
            await this.saveData();
        }
        return this.festivalData.get(key);
    }

    async playSakuraGame(interaction, bet) {
        const userData = await this.getUserFestivalData(interaction.user.id, interaction.guild.id);
        
        if (userData.tickets < bet) {
            return { success: false, message: '❌ Ticket tidak cukup!' };
        }
        
        const petals = Math.floor(Math.random() * 10) + 1;
        const caught = Math.floor(Math.random() * petals) + 1;
        const multiplier = caught / petals;
        
        let winAmount = 0;
        if (multiplier > 0.8) winAmount = Math.floor(bet * 2.5);
        else if (multiplier > 0.5) winAmount = Math.floor(bet * 1.5);
        else winAmount = Math.floor(bet * 0.5);
        
        userData.tickets -= bet;
        userData.tickets += winAmount;
        userData.totalTickets += winAmount;
        userData.gamesPlayed++;
        userData.lastPlayed = Date.now();
        userData.streak = winAmount > bet ? userData.streak + 1 : 0;
        
        if (caught > userData.highScore) userData.highScore = caught;
        
        await this.saveData();
        
        return {
            success: true,
            petals,
            caught,
            bet,
            winAmount,
            streak: userData.streak,
            highScore: userData.highScore
        };
    }

    async playFireworksGame(interaction, bet) {
        const userData = await this.getUserFestivalData(interaction.user.id, interaction.guild.id);
        
        if (userData.tickets < bet) {
            return { success: false, message: '❌ Ticket tidak cukup!' };
        }
        
        const patterns = ['🎆', '🎇', '✨', '💫', '⭐'];
        const targetPattern = patterns[Math.floor(Math.random() * patterns.length)];
        const guess = patterns[Math.floor(Math.random() * patterns.length)];
        
        let winAmount = 0;
        let accuracy = 0;
        
        if (guess === targetPattern) {
            winAmount = Math.floor(bet * 3);
            accuracy = 100;
        } else {
            const similarity = Math.random() * 50 + 30;
            winAmount = Math.floor(bet * (similarity / 100));
            accuracy = Math.floor(similarity);
        }
        
        userData.tickets -= bet;
        userData.tickets += winAmount;
        userData.totalTickets += winAmount;
        userData.gamesPlayed++;
        userData.lastPlayed = Date.now();
        
        await this.saveData();
        
        return {
            success: true,
            targetPattern,
            guess,
            accuracy,
            bet,
            winAmount
        };
    }

    async playDangoGame(interaction, bet) {
        const userData = await this.getUserFestivalData(interaction.user.id, interaction.guild.id);
        
        if (userData.tickets < bet) {
            return { success: false, message: '❌ Ticket tidak cukup!' };
        }
        
        const speed = Math.floor(Math.random() * 100) + 1;
        const opponentSpeed = Math.floor(Math.random() * 100) + 1;
        
        let winAmount = 0;
        let result = '';
        
        if (speed > opponentSpeed) {
            winAmount = Math.floor(bet * 2);
            result = 'MENANG';
        } else {
            winAmount = Math.floor(bet * 0.3);
            result = 'KALAH';
        }
        
        userData.tickets -= bet;
        userData.tickets += winAmount;
        userData.totalTickets += winAmount;
        userData.gamesPlayed++;
        userData.lastPlayed = Date.now();
        
        await this.saveData();
        
        return {
            success: true,
            speed,
            opponentSpeed,
            result,
            bet,
            winAmount
        };
    }

    async playOmikujiGame(interaction, bet) {
        const userData = await this.getUserFestivalData(interaction.user.id, interaction.guild.id);
        
        if (userData.tickets < bet) {
            return { success: false, message: '❌ Ticket tidak cukup!' };
        }
        
        const fortunes = [
            { name: '大吉 - Great Blessing', multiplier: 5, emoji: '🌟' },
            { name: '中吉 - Medium Blessing', multiplier: 3, emoji: '✨' },
            { name: '小吉 - Small Blessing', multiplier: 2, emoji: '⭐' },
            { name: '吉 - Blessing', multiplier: 1.5, emoji: '🎋' },
            { name: '末吉 - Future Blessing', multiplier: 1, emoji: '🎍' },
            { name: '凶 - Bad Luck', multiplier: 0.5, emoji: '💔' },
            { name: '大凶 - Great Bad Luck', multiplier: 0.1, emoji: '🌑' }
        ];
        
        const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
        const winAmount = Math.floor(bet * fortune.multiplier);
        
        userData.tickets -= bet;
        userData.tickets += winAmount;
        userData.totalTickets += winAmount;
        userData.gamesPlayed++;
        userData.lastPlayed = Date.now();
        
        await this.saveData();
        
        return {
            success: true,
            fortune,
            bet,
            winAmount
        };
    }

    // ==================== COMMAND HANDLERS ====================
    async handleStatus(interaction) {
        if (!this.currentEvent) {
            return interaction.reply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ **NO ACTIVE EVENT**')
                        .setDescription('Tidak ada event aktif saat ini!\nAdmin bisa memulai event dengan `/festival admin-start`')
                        .setTimestamp()
                ],
                ephemeral: true 
            });
        }
        
        const timeLeft = this.currentEvent.endTime - Date.now();
        const days = Math.floor(timeLeft / 86400000);
        const hours = Math.floor((timeLeft % 86400000) / 3600000);
        
        const userData = await this.getUserFestivalData(interaction.user.id, interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor(0xFF1493)
            .setTitle(`🎪 **${this.currentEvent.name}**`)
            .setDescription(`
✨ **${this.currentEvent.name}** sedang berlangsung!
⏰ Berakhir dalam: **${days} hari ${hours} jam**

**YOUR STATS:**
🎫 Tickets: **${userData.tickets.toLocaleString()}**
🎮 Games Played: **${userData.gamesPlayed}**
🔥 Streak: **${userData.streak}**
🏆 High Score: **${userData.highScore}**
            `)
            .addFields(
                { name: '🎮 AVAILABLE GAMES', value: `
🌸 **/festival play game:sakura** - Catch petals
🎆 **/festival play game:fireworks** - Guess pattern
🍡 **/festival play game:dango** - Eating contest
🧧 **/festival play game:omikuji** - Fortune lottery
                `, inline: false },
                { name: '🛒 FESTIVAL SHOP', value: 'Gunakan `/festival shop` untuk melihat item limited!', inline: false }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }

    async handlePlay(interaction) {
        if (!this.currentEvent) {
            return interaction.reply({ 
                content: '❌ Tidak ada event aktif!', 
                ephemeral: true 
            });
        }
        
        const game = interaction.options.getString('game');
        const bet = interaction.options.getInteger('bet');
        
        const userData = await this.getUserFestivalData(interaction.user.id, interaction.guild.id);
        
        if (bet < 10) {
            return interaction.reply({ content: '❌ Minimal bet 10 tickets!', ephemeral: true });
        }
        
        let result;
        
        switch (game) {
            case 'sakura':
                result = await this.playSakuraGame(interaction, bet);
                break;
            case 'fireworks':
                result = await this.playFireworksGame(interaction, bet);
                break;
            case 'dango':
                result = await this.playDangoGame(interaction, bet);
                break;
            case 'omikuji':
                result = await this.playOmikujiGame(interaction, bet);
                break;
            default:
                return interaction.reply({ content: '❌ Game tidak valid!', ephemeral: true });
        }
        
        if (!result.success) {
            return interaction.reply({ content: result.message, ephemeral: true });
        }
        
        let embed;
        
        switch (game) {
            case 'sakura':
                embed = new EmbedBuilder()
                    .setColor(result.winAmount > bet ? 0x00FF00 : 0xFF0000)
                    .setTitle('🌸 **SAKURA PETAL CATCH**')
                    .setDescription(`
🌸 Petals fell: **${result.petals}**
🎯 You caught: **${result.caught}**
📊 Accuracy: **${Math.floor((result.caught / result.petals) * 100)}%**

💰 Bet: **${result.bet}** tickets
🎁 Won: **${result.winAmount}** tickets
🔥 Streak: **${result.streak}**
                    `)
                    .setTimestamp();
                break;
                
            case 'fireworks':
                embed = new EmbedBuilder()
                    .setColor(result.accuracy > 80 ? 0x00FF00 : 0xFF0000)
                    .setTitle('🎆 **FIREWORKS PATTERN**')
                    .setDescription(`
🎯 Target: ${result.targetPattern}
✨ Your guess: ${result.guess}
📊 Accuracy: **${result.accuracy}%**

💰 Bet: **${result.bet}** tickets
🎁 Won: **${result.winAmount}** tickets
                    `)
                    .setTimestamp();
                break;
                
            case 'dango':
                embed = new EmbedBuilder()
                    .setColor(result.result === 'MENANG' ? 0x00FF00 : 0xFF0000)
                    .setTitle('🍡 **DANGO EATING CONTEST**')
                    .setDescription(`
⚡ Your speed: **${result.speed}**
👤 Opponent speed: **${result.opponentSpeed}**
🏆 Result: **${result.result}**

💰 Bet: **${result.bet}** tickets
🎁 Won: **${result.winAmount}** tickets
                    `)
                    .setTimestamp();
                break;
                
            case 'omikuji':
                embed = new EmbedBuilder()
                    .setColor(result.winAmount > result.bet ? 0x00FF00 : 0xFF0000)
                    .setTitle('🧧 **OMIKUJI FORTUNE**')
                    .setDescription(`
${result.fortune.emoji} **${result.fortune.name}**
💰 Multiplier: **x${result.fortune.multiplier}**

💰 Bet: **${result.bet}** tickets
🎁 Won: **${result.winAmount}** tickets
                    `)
                    .setTimestamp();
                break;
        }
        
        embed.addFields({
            name: '🎫 Your Tickets',
            value: `${userData.tickets.toLocaleString()}`,
            inline: false
        });
        
        await interaction.reply({ embeds: [embed] });
    }

    async handleShop(interaction) {
        if (!this.currentEvent) {
            return interaction.reply({ 
                content: '❌ Tidak ada event aktif!', 
                ephemeral: true 
            });
        }
        
        const seasonItems = Array.from(this.festivalItems.values())
            .filter(item => item.season === this.currentEvent.season);
        
        if (seasonItems.length === 0) {
            return interaction.reply({ 
                content: '🛒 Belum ada item untuk event ini!', 
                ephemeral: true 
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`🛒 **${this.currentEvent.name} SHOP**`)
            .setDescription('Limited items hanya tersedia selama event!')
            .setTimestamp();
        
        seasonItems.forEach(item => {
            embed.addFields({
                name: `${item.emoji} ${item.name} - ${item.price} tickets`,
                value: item.description,
                inline: false
            });
        });
        
        embed.setFooter({ text: 'Gunakan menu di bawah untuk membeli' });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('festival_buy')
            .setPlaceholder('🛒 Pilih item untuk dibeli')
            .addOptions(
                seasonItems.map(item => ({
                    label: item.name.substring(0, 100),
                    description: `${item.price} tickets - ${item.description.substring(0, 50)}`,
                    value: item.id,
                    emoji: item.emoji
                }))
            );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        await interaction.reply({ embeds: [embed], components: [row] });
    }

    async handleLeaderboard(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const guildId = interaction.guild.id;
            const users = Array.from(this.festivalData.values())
                .filter(u => u.guildId === guildId)
                .sort((a, b) => b.totalTickets - a.totalTickets)
                .slice(0, 10);
            
            if (users.length === 0) {
                return interaction.editReply({ content: '📭 Belum ada data festival di server ini!' });
            }
            
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle(`🎪 **FESTIVAL LEADERBOARD**`)
                .setDescription(`Top 10 Players in ${interaction.guild.name}`)
                .setTimestamp();
            
            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
                const username = member ? member.user.username : 'Unknown User';
                
                embed.addFields({
                    name: `${i + 1}. ${username}`,
                    value: `🎫 Tickets: ${user.totalTickets.toLocaleString()} | 🎮 Games: ${user.gamesPlayed} | 🔥 Streak: ${user.streak}`,
                    inline: false
                });
            }
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Festival leaderboard error:', error);
            await interaction.editReply({ content: '❌ Error fetching leaderboard!' });
        }
    }

    async handleAdminStart(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Kamu butuh permission **Administrator**!', 
                ephemeral: true 
            });
        }

        const season = interaction.options.getString('season');
        this.startEvent(season);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **EVENT STARTED**')
            .setDescription(`**${this.currentEvent.name}** telah dimulai!`)
            .addFields(
                { name: '📅 Durasi', value: '7 hari', inline: true },
                { name: '🎮 Games', value: 'Sakura, Fireworks, Dango, Omikuji', inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ 
            embeds: [embed],
            ephemeral: true 
        });
    }

    async handleAdminAdd(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Kamu butuh permission **Administrator**!', 
                ephemeral: true 
            });
        }

        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        
        const userData = await this.getUserFestivalData(target.id, interaction.guild.id);
        userData.tickets += amount;
        userData.totalTickets += amount;
        
        await this.saveData();
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **TICKETS ADDED**')
            .setDescription(`**${amount}** tickets ditambahkan ke **${target.tag}**!`)
            .addFields(
                { name: '🎫 Total Tickets', value: `${userData.tickets.toLocaleString()}`, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ 
            embeds: [embed],
            ephemeral: true 
        });
    }

    // ==================== INTERACTION HANDLER ====================
    async handleInteraction(interaction) {
        if (!interaction.isStringSelectMenu()) return;
        
        if (interaction.customId === 'festival_buy') {
            const itemId = interaction.values[0];
            const item = this.festivalItems.get(itemId);
            
            if (!item || item.season !== this.currentEvent?.season) {
                return interaction.reply({ 
                    content: '❌ Item tidak tersedia!', 
                    ephemeral: true 
                });
            }
            
            const userData = await this.getUserFestivalData(interaction.user.id, interaction.guild.id);
            
            if (userData.tickets < item.price) {
                return interaction.reply({ 
                    content: `❌ Ticket tidak cukup! Butuh ${item.price} tickets`, 
                    ephemeral: true 
                });
            }
            
            userData.tickets -= item.price;
            userData.items.push({
                id: item.id,
                name: item.name,
                purchasedAt: Date.now()
            });
            
            await this.saveData();
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ **PURCHASE SUCCESSFUL**')
                .setDescription(`Kamu membeli **${item.emoji} ${item.name}**!`)
                .addFields(
                    { name: '💰 Price', value: `${item.price} tickets`, inline: true },
                    { name: '🎫 Remaining', value: `${userData.tickets} tickets`, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('festival')
                .setDescription('🎪 Anime Festival Event')
                .addSubcommand(sub =>
                    sub.setName('status')
                        .setDescription('Cek status event aktif'))
                .addSubcommand(sub =>
                    sub.setName('play')
                        .setDescription('Main game festival')
                        .addStringOption(opt =>
                            opt.setName('game')
                                .setDescription('Pilih game')
                                .setRequired(true)
                                .addChoices(
                                    { name: '🌸 Sakura Petal Catch', value: 'sakura' },
                                    { name: '🎆 Fireworks Pattern', value: 'fireworks' },
                                    { name: '🍡 Dango Eating Contest', value: 'dango' },
                                    { name: '🧧 Omikuji Fortune', value: 'omikuji' }
                                ))
                        .addIntegerOption(opt =>
                            opt.setName('bet')
                                .setDescription('Jumlah ticket')
                                .setRequired(true)
                                .setMinValue(10)
                                .setMaxValue(1000)))
                .addSubcommand(sub =>
                    sub.setName('shop')
                        .setDescription('Lihat festival shop'))
                .addSubcommand(sub =>
                    sub.setName('leaderboard')
                        .setDescription('Top pemain festival'))
                .addSubcommand(sub =>
                    sub.setName('admin-start')
                        .setDescription('[ADMIN] Mulai event')
                        .addStringOption(opt =>
                            opt.setName('season')
                                .setDescription('Season event')
                                .setRequired(true)
                                .addChoices(
                                    { name: '🌸 Spring - Sakura', value: 'spring' },
                                    { name: '🎆 Summer - Fireworks', value: 'summer' },
                                    { name: '🌕 Autumn - Moon', value: 'autumn' },
                                    { name: '🎍 Winter - New Year', value: 'winter' }
                                )))
                .addSubcommand(sub =>
                    sub.setName('admin-add')
                        .setDescription('[ADMIN] Tambah ticket')
                        .addUserOption(opt =>
                            opt.setName('user')
                                .setDescription('User')
                                .setRequired(true))
                        .addIntegerOption(opt =>
                            opt.setName('amount')
                                .setDescription('Jumlah ticket')
                                .setRequired(true)
                                .setMinValue(1)))
        ];
    }

    static async handleCommand(interaction, system) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'status': await system.handleStatus(interaction); break;
            case 'play': await system.handlePlay(interaction); break;
            case 'shop': await system.handleShop(interaction); break;
            case 'leaderboard': await system.handleLeaderboard(interaction); break;
            case 'admin-start': await system.handleAdminStart(interaction); break;
            case 'admin-add': await system.handleAdminAdd(interaction); break;
        }
    }
}

module.exports = AnimeFestivalSystem;
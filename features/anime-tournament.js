// anime-tournament.js - ANIME TOURNAMENT ARENA
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

class AnimeTournamentSystem {
    constructor(client) {
        this.client = client;
        this.name = 'anime-tournament';
        this.version = '1.0.0';
        
        this.tournamentsPath = path.join(__dirname, 'data', 'tournaments.json');
        this.tournaments = new Map();
        
        this.loadData();
    }

    async loadData() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        
        try {
            const data = await fs.readFile(this.tournamentsPath, 'utf8');
            if (data.trim() === '') {
                throw new Error('Empty file');
            }
            const parsed = JSON.parse(data);
            for (const [id, tournament] of Object.entries(parsed)) {
                this.tournaments.set(id, tournament);
            }
            console.log(`🏆 Loaded ${this.tournaments.size} tournaments`);
        } catch (error) {
            console.log('🏆 Tournaments database empty, creating new...');
            await fs.writeFile(this.tournamentsPath, '{}');
            this.tournaments.clear();
        }
        
    } catch (error) {
        console.error('❌ Error loading tournament data:', error);
    }
}

    async saveData() {
        const obj = {};
        this.tournaments.forEach((tournament, id) => {
            obj[id] = tournament;
        });
        await fs.writeFile(this.tournamentsPath, JSON.stringify(obj, null, 2));
    }

    // ==================== TOURNAMENT BRACKET ====================
    generateBracket(participants) {
        const bracket = [];
        const shuffled = [...participants].sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < shuffled.length; i += 2) {
            bracket.push({
                matchId: bracket.length + 1,
                player1: shuffled[i],
                player2: shuffled[i + 1] || null,
                winner: null,
                completed: false
            });
        }
        
        return bracket;
    }

    // ==================== QUIZ QUESTIONS ====================
    getQuizQuestion(difficulty = 'medium') {
        const questions = {
            easy: [
                {
                    question: "Siapa nama tokoh utama di Naruto?",
                    options: ["Sasuke", "Naruto", "Kakashi", "Sakura"],
                    answer: 1
                },
                {
                    question: "Apa jurus khas Goku?",
                    options: ["Rasengan", "Getsuga Tensho", "Kamehameha", "Gomu Gomu Pistol"],
                    answer: 2
                },
                {
                    question: "Dari anime mana karakter Luffy?",
                    options: ["Naruto", "One Piece", "Bleach", "Dragon Ball"],
                    answer: 1
                }
            ],
            medium: [
                {
                    question: "Siapa nama ketua kelas 3-E di Assassination Classroom?",
                    options: ["Karma", "Nagisa", "Maehara", "Isogai"],
                    answer: 3
                },
                {
                    question: "Apa nama bankai Ichigo Kurosaki?",
                    options: ["Senbonzakura", "Tensa Zangetsu", "Ryujin Jakka", "Sode no Shirayuki"],
                    answer: 1
                }
            ],
            hard: [
                {
                    question: "Berapa total episode One Piece sampai tahun 2024?",
                    options: ["~900", "~1000", "~1100", "~1200"],
                    answer: 2
                }
            ]
        };
        
        const pool = questions[difficulty] || questions.medium;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ==================== COMMAND HANDLERS ====================
    async handleCreate(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }
        
        const name = interaction.options.getString('name');
        const type = interaction.options.getString('type');
        const entryFee = interaction.options.getInteger('entry_fee') || 0;
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const tournamentId = `tourney_${Date.now()}`;
            
            let maxPlayers = 8;
            let prize = 0;
            
            switch (type) {
                case 'bronze':
                    maxPlayers = 8;
                    prize = 10000;
                    break;
                case 'silver':
                    maxPlayers = 16;
                    prize = 30000;
                    break;
                case 'gold':
                    maxPlayers = 16;
                    prize = 75000;
                    break;
                case 'platinum':
                    maxPlayers = 16;
                    prize = 150000;
                    break;
                case 'champion':
                    maxPlayers = 8;
                    prize = 500000;
                    break;
            }
            
            const tournament = {
                id: tournamentId,
                guildId: interaction.guild.id,
                name,
                type,
                maxPlayers,
                prize,
                entryFee,
                players: [],
                bracket: [],
                status: 'registering',
                createdAt: Date.now(),
                startedAt: null,
                endedAt: null,
                hostId: interaction.user.id,
                currentRound: 0,
                champions: []
            };
            
            this.tournaments.set(tournamentId, tournament);
            await this.saveData();
            
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle(`🏆 **${name}**`)
                .setDescription(`
**Tournament Created!**

📊 Type: **${type.toUpperCase()}**
👥 Max Players: **${maxPlayers}**
💰 Prize Pool: **${prize.toLocaleString()} coins**
💵 Entry Fee: **${entryFee.toLocaleString()} coins**

Status: **REGISTERING**
                `)
                .addFields(
                    { name: '📝 Commands', value: `
/tournament join - Daftar turnamen
/tournament bracket - Lihat bracket
/tournament battle - Mulai battle (Admin)
                    `, inline: false }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Tournament creation error:', error);
            await interaction.editReply({ content: '❌ Error creating tournament!' });
        }
    }

    async handleJoin(interaction) {
        const tournamentId = interaction.options.getString('tournament_id');
        const tournament = this.tournaments.get(tournamentId);
        
        if (!tournament || tournament.guildId !== interaction.guild.id) {
            return interaction.reply({ content: '❌ Turnamen tidak ditemukan!', ephemeral: true });
        }
        
        if (tournament.status !== 'registering') {
            return interaction.reply({ content: '❌ Pendaftaran sudah ditutup!', ephemeral: true });
        }
        
        if (tournament.players.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ Kamu sudah terdaftar!', ephemeral: true });
        }
        
        if (tournament.players.length >= tournament.maxPlayers) {
            return interaction.reply({ content: '❌ Kuota peserta penuh!', ephemeral: true });
        }
        
        // Check entry fee
        if (tournament.entryFee > 0) {
            const economyPlugin = interaction.client.economySystem;
            if (!economyPlugin) {
                return interaction.reply({ content: '❌ Economy system tidak tersedia!', ephemeral: true });
            }
            
            const userBalance = await economyPlugin.getUser(interaction.user.id, interaction.guild.id);
            if (userBalance.balance < tournament.entryFee) {
                return interaction.reply({ 
                    content: `❌ Uang tidak cukup! Butuh ${tournament.entryFee.toLocaleString()} coins`, 
                    ephemeral: true 
                });
            }
            
            await economyPlugin.addBalance(interaction.user.id, interaction.guild.id, -tournament.entryFee);
            
            // Add to prize pool
            tournament.prize += tournament.entryFee;
        }
        
        tournament.players.push(interaction.user.id);
        await this.saveData();
        
        await interaction.reply({ 
            content: `✅ Kamu terdaftar di **${tournament.name}**! (${tournament.players.length}/${tournament.maxPlayers})`, 
            ephemeral: true 
        });
    }

    async handleBracket(interaction) {
        const tournamentId = interaction.options.getString('tournament_id');
        const tournament = this.tournaments.get(tournamentId);
        
        if (!tournament || tournament.guildId !== interaction.guild.id) {
            return interaction.reply({ content: '❌ Turnamen tidak ditemukan!', ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle(`🏆 **${tournament.name} - BRACKET**`)
            .setDescription(`
📊 Status: **${tournament.status.toUpperCase()}**
👥 Players: ${tournament.players.length}/${tournament.maxPlayers}
💰 Prize: ${tournament.prize.toLocaleString()} coins
            `)
            .setTimestamp();
        
        if (tournament.status === 'registering') {
            embed.addFields({
                name: '📝 Registered Players',
                value: tournament.players.map((p, i) => `${i + 1}. <@${p}>`).join('\n') || 'Belum ada peserta',
                inline: false
            });
        } else {
            // Show bracket
            tournament.bracket.forEach((match, i) => {
                const player1Name = match.player1 ? `<@${match.player1}>` : 'TBD';
                const player2Name = match.player2 ? `<@${match.player2}>` : 'TBD';
                const winnerText = match.winner ? `🏆 <@${match.winner}>` : '⏳ Belum dimainkan';
                
                embed.addFields({
                    name: `Match ${match.matchId}`,
                    value: `${player1Name} vs ${player2Name}\nWinner: ${winnerText}`,
                    inline: false
                });
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    }

    async handleBattle(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }
        
        const tournamentId = interaction.options.getString('tournament_id');
        const tournament = this.tournaments.get(tournamentId);
        
        if (!tournament || tournament.guildId !== interaction.guild.id) {
            return interaction.reply({ content: '❌ Turnamen tidak ditemukan!', ephemeral: true });
        }
        
        if (tournament.status === 'registering') {
            if (tournament.players.length < 2) {
                return interaction.reply({ 
                    content: '❌ Minimal 2 peserta untuk memulai turnamen!', 
                    ephemeral: true 
                });
            }
            
            // Start tournament
            tournament.status = 'active';
            tournament.startedAt = Date.now();
            tournament.bracket = this.generateBracket(tournament.players);
            
            await this.saveData();
            
            await interaction.reply({ 
                content: `✅ **${tournament.name}** dimulai!`, 
                ephemeral: true 
            });
            
        } else if (tournament.status === 'active') {
            // Simulate battle
            const incompleteMatches = tournament.bracket.filter(m => !m.completed);
            
            if (incompleteMatches.length === 0) {
                // Tournament finished
                tournament.status = 'ended';
                tournament.endedAt = Date.now();
                
                // Get champion (last match winner)
                const finalMatch = tournament.bracket[tournament.bracket.length - 1];
                const champion = finalMatch.winner;
                
                if (champion) {
                    tournament.champions.push(champion);
                    
                    // Give prize
                    const economyPlugin = interaction.client.economySystem;
                    if (economyPlugin) {
                        await economyPlugin.addBalance(champion, interaction.guild.id, tournament.prize);
                    }
                    
                    const embed = new EmbedBuilder()
                        .setColor(0xFFD700)
                        .setTitle('👑 **TOURNAMENT CHAMPION**')
                        .setDescription(`
🏆 **${tournament.name}** telah selesai!

👑 Champion: <@${champion}>
💰 Prize: ${tournament.prize.toLocaleString()} coins
                        `)
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed] });
                }
                
                await this.saveData();
                return;
            }
            
            const match = incompleteMatches[0];
            
            if (!match.player2) {
                // Bye, auto advance
                match.winner = match.player1;
                match.completed = true;
                
                await interaction.reply({ 
                    content: `✅ Match ${match.matchId}: <@${match.player1}> otomatis maju (bye)`, 
                    ephemeral: true 
                });
                
                await this.saveData();
                return;
            }
            
            // Get anime battle system for character comparison
            const battleSystem = interaction.client.animeBattleSystem;
            let winner = null;
            
            if (battleSystem) {
                // Get player collections
                const p1Collection = await battleSystem.getUserCollection(match.player1, interaction.guild.id);
                const p2Collection = await battleSystem.getUserCollection(match.player2, interaction.guild.id);
                
                const p1Power = p1Collection.characters.reduce((sum, c) => sum + c.level, 0);
                const p2Power = p2Collection.characters.reduce((sum, c) => sum + c.level, 0);
                
                winner = p1Power > p2Power ? match.player1 : match.player2;
            } else {
                // Random winner
                winner = Math.random() > 0.5 ? match.player1 : match.player2;
            }
            
            match.winner = winner;
            match.completed = true;
            
            // Advance winner to next round
            const nextMatchIndex = tournament.bracket.findIndex(m => !m.player1 || !m.player2);
            if (nextMatchIndex !== -1) {
                const nextMatch = tournament.bracket[nextMatchIndex];
                if (!nextMatch.player1) {
                    nextMatch.player1 = winner;
                } else {
                    nextMatch.player2 = winner;
                }
            }
            
            await this.saveData();
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('⚔️ **BATTLE RESULT**')
                .setDescription(`
**Match ${match.matchId}** selesai!

👤 <@${match.player1}> vs <@${match.player2}>
🏆 Winner: <@${winner}>
                `)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }
    }

    async handlePredict(interaction) {
        const tournamentId = interaction.options.getString('tournament_id');
        const playerId = interaction.options.getUser('player').id;
        
        const tournament = this.tournaments.get(tournamentId);
        
        if (!tournament || tournament.guildId !== interaction.guild.id) {
            return interaction.reply({ content: '❌ Turnamen tidak ditemukan!', ephemeral: true });
        }
        
        if (tournament.status !== 'active') {
            return interaction.reply({ content: '❌ Turnamen belum dimulai atau sudah selesai!', ephemeral: true });
        }
        
        if (!tournament.players.includes(playerId)) {
            return interaction.reply({ content: '❌ Player tidak terdaftar di turnamen ini!', ephemeral: true });
        }
        
        // Check economy
        const economyPlugin = interaction.client.economySystem;
        if (!economyPlugin) {
            return interaction.reply({ content: '❌ Economy system tidak tersedia!', ephemeral: true });
        }
        
        const userBalance = await economyPlugin.getUser(interaction.user.id, interaction.guild.id);
        if (userBalance.balance < 500) {
            return interaction.reply({ content: '❌ Kamu butuh 500 coins untuk predict!', ephemeral: true });
        }
        
        await economyPlugin.addBalance(interaction.user.id, interaction.guild.id, -500);
        
        await interaction.reply({ 
            content: `✅ Kamu memprediksi <@${playerId}> sebagai juara! (500 coins)`, 
            ephemeral: true 
        });
    }

    async handleHistory(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const guildTournaments = Array.from(this.tournaments.values())
                .filter(t => t.guildId === interaction.guild.id && t.status === 'ended')
                .sort((a, b) => b.endedAt - a.endedAt)
                .slice(0, 5);
            
            if (guildTournaments.length === 0) {
                return interaction.editReply({ content: '📭 Belum ada turnamen yang selesai!' });
            }
            
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🏆 **TOURNAMENT HISTORY**')
                .setDescription('5 turnamen terakhir')
                .setTimestamp();
            
            guildTournaments.forEach(t => {
                const champion = t.champions[0];
                embed.addFields({
                    name: t.name,
                    value: `🏆 Champion: <@${champion}>\n💰 Prize: ${t.prize.toLocaleString()} coins\n📅 Ended: <t:${Math.floor(t.endedAt/1000)}:R>`,
                    inline: false
                });
            });
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Tournament history error:', error);
            await interaction.editReply({ content: '❌ Error fetching tournament history!' });
        }
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('tournament')
                .setDescription('🏆 Anime Tournament Arena')
                .addSubcommand(sub =>
                    sub.setName('create')
                        .setDescription('[ADMIN] Buat turnamen baru')
                        .addStringOption(opt =>
                            opt.setName('name')
                                .setDescription('Nama turnamen')
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName('type')
                                .setDescription('Tipe turnamen')
                                .setRequired(true)
                                .addChoices(
                                    { name: '🥉 Bronze - 8 players (10k)', value: 'bronze' },
                                    { name: '🥈 Silver - 16 players (30k)', value: 'silver' },
                                    { name: '🥇 Gold - 16 players (75k)', value: 'gold' },
                                    { name: '💎 Platinum - 16 players (150k)', value: 'platinum' },
                                    { name: '👑 Champion - 8 players (500k)', value: 'champion' }
                                ))
                        .addIntegerOption(opt =>
                            opt.setName('entry_fee')
                                .setDescription('Biaya pendaftaran (opsional)')
                                .setMinValue(0)
                                .setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('join')
                        .setDescription('Daftar turnamen')
                        .addStringOption(opt =>
                            opt.setName('tournament_id')
                                .setDescription('ID turnamen')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('bracket')
                        .setDescription('Lihat bracket turnamen')
                        .addStringOption(opt =>
                            opt.setName('tournament_id')
                                .setDescription('ID turnamen')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('battle')
                        .setDescription('[ADMIN] Mulai battle')
                        .addStringOption(opt =>
                            opt.setName('tournament_id')
                                .setDescription('ID turnamen')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('predict')
                        .setDescription('Tebak juara turnamen (500 coins)')
                        .addStringOption(opt =>
                            opt.setName('tournament_id')
                                .setDescription('ID turnamen')
                                .setRequired(true))
                        .addUserOption(opt =>
                            opt.setName('player')
                                .setDescription('Player yang diprediksi juara')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('history')
                        .setDescription('Lihat history juara turnamen'))
        ];
    }

    static async handleCommand(interaction, system) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'create': await system.handleCreate(interaction); break;
            case 'join': await system.handleJoin(interaction); break;
            case 'bracket': await system.handleBracket(interaction); break;
            case 'battle': await system.handleBattle(interaction); break;
            case 'predict': await system.handlePredict(interaction); break;
            case 'history': await system.handleHistory(interaction); break;
        }
    }
}

module.exports = AnimeTournamentSystem;
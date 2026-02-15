// anime-battle.js - SAKURA CARD CAPTURE SYSTEM
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

class AnimeBattleSystem {
    constructor(client) {
        this.client = client;
        this.name = 'anime-battle';
        this.version = '1.0.0';
        
        this.charactersPath = path.join(__dirname, 'data', 'anime_characters.json');
        this.collectionsPath = path.join(__dirname, 'data', 'anime_collections.json');
        
        this.characters = new Map();
        this.collections = new Map();
        
        this.loadData();
    }

    async loadData() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        
        // ===== LOAD CHARACTERS =====
        try {
            const charData = await fs.readFile(this.charactersPath, 'utf8');
            if (charData.trim() === '') {
                throw new Error('Empty file');
            }
            const parsedChars = JSON.parse(charData);
            for (const [id, char] of Object.entries(parsedChars)) {
                this.characters.set(id, char);
            }
            console.log(`🎴 Loaded ${this.characters.size} characters from file`);
        } catch (error) {
            console.log('🎴 Characters database empty, initializing with default data...');
            await this.initCharacters();
            // Load after init
            const charData = await fs.readFile(this.charactersPath, 'utf8');
            const parsedChars = JSON.parse(charData);
            for (const [id, char] of Object.entries(parsedChars)) {
                this.characters.set(id, char);
            }
            console.log(`🎴 Initialized ${this.characters.size} default characters`);
        }
        
        // ===== LOAD COLLECTIONS =====
        try {
            const collData = await fs.readFile(this.collectionsPath, 'utf8');
            if (collData.trim() === '') {
                throw new Error('Empty file');
            }
            const parsedColl = JSON.parse(collData);
            for (const [userId, coll] of Object.entries(parsedColl)) {
                this.collections.set(userId, coll);
            }
            console.log(`🎴 Loaded ${this.collections.size} collections`);
        } catch (error) {
            console.log('🎴 Collections database empty, creating new...');
            await fs.writeFile(this.collectionsPath, '{}');
            this.collections.clear();
        }
        
    } catch (error) {
        console.error('❌ Error loading anime battle data:', error);
    }
}

    async saveCollections() {
        const obj = {};
        this.collections.forEach((coll, userId) => {
            obj[userId] = coll;
        });
        await fs.writeFile(this.collectionsPath, JSON.stringify(obj, null, 2));
    }

    async initCharacters() {
        const initialChars = {
            // ===== SHONEN TIER 1 (COMMON) =====
            "naruto_001": {
                id: "naruto_001",
                name: "Naruto Uzumaki",
                series: "Naruto",
                rarity: "common",
                rarityColor: "⚪",
                level: 1,
                baseHP: 100,
                baseATK: 80,
                baseDEF: 60,
                baseSPD: 70,
                captureRate: 50,
                image: "https://cdn.myanimelist.net/images/characters/2/284121.jpg",
                skills: [
                    { name: "Rasengan", power: 80, accuracy: 90 },
                    { name: "Shadow Clone", power: 60, accuracy: 100 }
                ],
                quotes: [
                    "I never go back on my word! That's my nindo!",
                    "Believe it!"
                ]
            },
            "luffy_001": {
                id: "luffy_001",
                name: "Monkey D. Luffy",
                series: "One Piece",
                rarity: "common",
                rarityColor: "⚪",
                level: 1,
                baseHP: 120,
                baseATK: 90,
                baseDEF: 50,
                baseSPD: 80,
                captureRate: 50,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRca3R2sUA8pg25ou0Xcmm6fq3sncc7xcmVnmmpuLWiPw&s=10",
                skills: [
                    { name: "Gomu Gomu Pistol", power: 85, accuracy: 95 },
                    { name: "Gear Second", power: 100, accuracy: 80 }
                ],
                quotes: [
                    "I'm going to be the Pirate King!",
                    "Meat! Meat! Meat!"
                ]
            },
            "goku_001": {
                id: "goku_001",
                name: "Son Goku",
                series: "Dragon Ball",
                rarity: "common",
                rarityColor: "⚪",
                level: 1,
                baseHP: 110,
                baseATK: 100,
                baseDEF: 70,
                baseSPD: 90,
                captureRate: 45,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTwf6cpu4-cmvxPhllBn1xMDOXm8aADU9qctD1Ygt9h9A&s=10",
                skills: [
                    { name: "Kamehameha", power: 90, accuracy: 95 },
                    { name: "Instant Transmission", power: 70, accuracy: 100 }
                ],
                quotes: [
                    "IT'S OVER 9000!",
                    "I am the hope of the universe!"
                ]
            },
            "ichigo_001": {
                id: "ichigo_001",
                name: "Ichigo Kurosaki",
                series: "Bleach",
                rarity: "common",
                rarityColor: "⚪",
                level: 1,
                baseHP: 115,
                baseATK: 95,
                baseDEF: 65,
                baseSPD: 75,
                captureRate: 50,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSz5pt7noeokGbq8oGSJfOl-kR6NbQsEiFjwskxihDw-w&s=10",
                skills: [
                    { name: "Getsuga Tensho", power: 95, accuracy: 90 },
                    { name: "Bankai", power: 110, accuracy: 85 }
                ],
                quotes: [
                    "I can't see or sense anything... But I know you're there!",
                    "I'm not protecting you because I like you!"
                ]
            },
            "tanjiro_001": {
                id: "tanjiro_001",
                name: "Tanjiro Kamado",
                series: "Demon Slayer",
                rarity: "common",
                rarityColor: "⚪",
                level: 1,
                baseHP: 100,
                baseATK: 85,
                baseDEF: 70,
                baseSPD: 80,
                captureRate: 50,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSvmDzypgTvbzKa6Uox6HriMLJjzoRv4VZ5OWYbJZIR2Wc0F74pHADz_g&s=10",
                skills: [
                    { name: "Water Breathing", power: 80, accuracy: 95 },
                    { name: "Hinokami Kagura", power: 100, accuracy: 80 }
                ],
                quotes: [
                    "Set your heart ablaze!",
                    "Never give up!"
                ]
            },
            "deku_001": {
                id: "deku_001",
                name: "Izuku Midoriya",
                series: "My Hero Academia",
                rarity: "common",
                rarityColor: "⚪",
                level: 1,
                baseHP: 90,
                baseATK: 110,
                baseDEF: 50,
                baseSPD: 85,
                captureRate: 50,
                image: "https://i.pinimg.com/736x/63/fb/eb/63fbebab2b193d2009002d322dd657e7.jpg",
                skills: [
                    { name: "Detroit Smash", power: 100, accuracy: 85 },
                    { name: "Delaware Smash", power: 80, accuracy: 95 }
                ],
                quotes: [
                    "I will become a hero!",
                    "Go beyond! Plus Ultra!"
                ]
            },

            // ===== RARE TIER (🟢) =====
            "gojo_001": {
                id: "gojo_001",
                name: "Satoru Gojo",
                series: "Jujutsu Kaisen",
                rarity: "rare",
                rarityColor: "🟢",
                level: 20,
                baseHP: 200,
                baseATK: 180,
                baseDEF: 150,
                baseSPD: 170,
                captureRate: 30,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJ68vNP_9viPlqVuqmUzgIgVsqF4FLOaAoN84zoXvHk_xBFlZugJZd6CE&s=10",
                skills: [
                    { name: "Infinity", power: 150, accuracy: 100 },
                    { name: "Hollow Purple", power: 200, accuracy: 80 },
                    { name: "Domain Expansion", power: 250, accuracy: 60 }
                ],
                quotes: [
                    "Nah, I'd win.",
                    "Throughout Heaven and Earth, I alone am the honored one."
                ]
            },
            "levi_001": {
                id: "levi_001",
                name: "Levi Ackerman",
                series: "Attack on Titan",
                rarity: "rare",
                rarityColor: "🟢",
                level: 20,
                baseHP: 160,
                baseATK: 200,
                baseDEF: 100,
                baseSPD: 190,
                captureRate: 30,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTAvMFTEF3AU5nIxUWVMRjZSohu_2q--RAuwo2Vrn5HIYbDhJfwqQ0RLQVg&s=10",
                skills: [
                    { name: "Vertical Maneuvering", power: 170, accuracy: 95 },
                    { name: "Thunder Spears", power: 190, accuracy: 85 }
                ],
                quotes: [
                    "Give up on your dreams and die.",
                    "Tch."
                ]
            },
            "killua_001": {
                id: "killua_001",
                name: "Killua Zoldyck",
                series: "Hunter x Hunter",
                rarity: "rare",
                rarityColor: "🟢",
                level: 20,
                baseHP: 150,
                baseATK: 190,
                baseDEF: 110,
                baseSPD: 200,
                captureRate: 30,
                image: "https://image.idntimes.com/post/20200820/killua-zoldyck-electric-3c4679201e4b56356cf16280f9f8cc44.jpg",
                skills: [
                    { name: "Godspeed", power: 180, accuracy: 90 },
                    { name: "Whirlwind", power: 160, accuracy: 95 }
                ],
                quotes: [
                    "I'm not a good person.",
                    "Gon is my best friend."
                ]
            },

            // ===== SUPER RARE TIER (🔵) =====
            "madara_001": {
                id: "madara_001",
                name: "Madara Uchiha",
                series: "Naruto",
                rarity: "super_rare",
                rarityColor: "🔵",
                level: 40,
                baseHP: 300,
                baseATK: 280,
                baseDEF: 250,
                baseSPD: 240,
                captureRate: 15,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHTLaIWIKzNjmC_hiUQhDeKU8wGVEnzM80KIyHIotUgHtQZzDaYEqz9Zw&s=10",
                skills: [
                    { name: "Perfect Susanoo", power: 300, accuracy: 90 },
                    { name: "Meteor Drop", power: 350, accuracy: 70 },
                    { name: "Rinnegan", power: 280, accuracy: 95 }
                ],
                quotes: [
                    "Wake up to reality! Nothing ever goes as planned in this world.",
                    "I'll put an end to this dream of peace."
                ]
            },
            "aizen_001": {
                id: "aizen_001",
                name: "Sosuke Aizen",
                series: "Bleach",
                rarity: "super_rare",
                rarityColor: "🔵",
                level: 40,
                baseHP: 280,
                baseATK: 290,
                baseDEF: 260,
                baseSPD: 250,
                captureRate: 15,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMa73zAtZ6hgJJ6os8_yxlgpvGFijAjgrGeDVnioQvcQ&s=10",
                skills: [
                    { name: "Kyoka Suigetsu", power: 320, accuracy: 85 },
                    { name: "Hado #90", power: 340, accuracy: 75 }
                ],
                quotes: [
                    "Admiration is the emotion furthest from understanding.",
                    "Since when were you under the impression..."
                ]
            },

            // ===== EPIC TIER (🟣) =====
            "meruem_001": {
                id: "meruem_001",
                name: "Meruem",
                series: "Hunter x Hunter",
                rarity: "epic",
                rarityColor: "🟣",
                level: 60,
                baseHP: 400,
                baseATK: 380,
                baseDEF: 350,
                baseSPD: 360,
                captureRate: 8,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxl1tH3r1S0X4vduucG0-GAdDwRAVBQiYVWK4HvrPZENaFyI9yRMD15n7J&s=10",
                skills: [
                    { name: "Rage Blast", power: 450, accuracy: 80 },
                    { name: "Tail Strike", power: 400, accuracy: 90 }
                ],
                quotes: [
                    "What is 'Komugi'?",
                    "I finally understand... my reason for being born."
                ]
            },
            "kaido_001": {
                id: "kaido_001",
                name: "Kaido",
                series: "One Piece",
                rarity: "epic",
                rarityColor: "🟣",
                level: 60,
                baseHP: 450,
                baseATK: 400,
                baseDEF: 380,
                baseSPD: 200,
                captureRate: 8,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2-fV3eRr1-XODYZzBSJSYP2ASC3NvN2zNWT0G6Ld0mA&s=10",
                skills: [
                    { name: "Thunder Bagua", power: 420, accuracy: 85 },
                    { name: "Boro Breath", power: 480, accuracy: 75 }
                ],
                quotes: [
                    "If it's one-on-one, Kaido will win.",
                    "The strongest creature!"
                ]
            },

            // ===== LEGENDARY TIER (🟡) =====
            "saitama_001": {
                id: "saitama_001",
                name: "Saitama",
                series: "One Punch Man",
                rarity: "legendary",
                rarityColor: "🟡",
                level: 80,
                baseHP: 500,
                baseATK: 999,
                baseDEF: 500,
                baseSPD: 400,
                captureRate: 3,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZM49jDn1wA2o38egOXQZexV8MgwK3ty_gsSm7oQ0cCg&s=10",
                skills: [
                    { name: "Serious Punch", power: 999, accuracy: 100 },
                    { name: "Consecutive Normal Punches", power: 800, accuracy: 95 }
                ],
                quotes: [
                    "OK.",
                    "I'm just a hero for fun.",
                    "100 push-ups, 100 sit-ups, 100 squats, and 10km run EVERY DAY!"
                ]
            },
            "goku_002": {
                id: "goku_002",
                name: "Goku (Ultra Instinct)",
                series: "Dragon Ball Super",
                rarity: "legendary",
                rarityColor: "🟡",
                level: 85,
                baseHP: 550,
                baseATK: 950,
                baseDEF: 450,
                baseSPD: 500,
                captureRate: 2,
                image: "https://wallpapers.com/images/hd/dark-goku-ultra-instinct-art-cgebo5hue38ak78m.jpg",
                skills: [
                    { name: "Ultra Instinct", power: 900, accuracy: 100 },
                    { name: "Kamehameha (UI)", power: 950, accuracy: 95 }
                ],
                quotes: [
                    "My body is moving on its own!",
                    "I'm not fighting seriously... yet."
                ]
            }
        };

        await fs.writeFile(this.charactersPath, JSON.stringify(initialChars, null, 2));
        console.log('🎴 Initialized anime characters database');
    }

    // ==================== GET USER COLLECTION ====================
    async getUserCollection(userId, guildId) {
        const key = `${guildId}-${userId}`;
        if (!this.collections.has(key)) {
            this.collections.set(key, {
                userId,
                guildId,
                characters: [],
                captureCards: 5,
                greatBalls: 0,
                ultraBalls: 0,
                masterBalls: 0,
                totalCaptures: 0,
                totalBattles: 0,
                wins: 0,
                losses: 0
            });
            await this.saveCollections();
        }
        return this.collections.get(key);
    }

    // ==================== GET WILD CHARACTER ====================
    getWildCharacter(area = 'any') {
        const chars = Array.from(this.characters.values());
        
        // Filter by rarity based on area
        let availableChars = chars;
        if (area === 'forest') {
            availableChars = chars.filter(c => c.rarity === 'common' || c.rarity === 'rare');
        } else if (area === 'mountain') {
            availableChars = chars.filter(c => c.rarity === 'rare' || c.rarity === 'super_rare');
        } else if (area === 'dungeon') {
            availableChars = chars.filter(c => c.rarity === 'super_rare' || c.rarity === 'epic');
        } else if (area === 'boss') {
            availableChars = chars.filter(c => c.rarity === 'epic' || c.rarity === 'legendary');
        }
        
        return availableChars[Math.floor(Math.random() * availableChars.length)];
    }

    // ==================== CALCULATE CAPTURE RATE ====================
    calculateCaptureRate(character, ballType = 'normal', userLevel = 1) {
        let rate = character.captureRate || 50;
        
        // Ball multiplier
        switch (ballType) {
            case 'great': rate *= 2; break;
            case 'ultra': rate *= 3; break;
            case 'master': rate = 100; break;
            default: rate *= 1; break;
        }
        
        // Level bonus (max 20%)
        const levelBonus = Math.min(userLevel * 0.5, 20);
        rate += levelBonus;
        
        // Rarity penalty
        if (character.rarity === 'legendary') rate *= 0.3;
        if (character.rarity === 'epic') rate *= 0.5;
        if (character.rarity === 'super_rare') rate *= 0.7;
        
        return Math.min(rate, 100);
    }

    // ==================== COMMAND HANDLERS ====================
    async handleWild(interaction) {
        const area = interaction.options.getString('area') || 'forest';
        const userData = await this.getUserCollection(interaction.user.id, interaction.guild.id);
        
        const wildChar = this.getWildCharacter(area);
        
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('🎴 **WILD CHARACTER APPEARED!**')
            .setDescription(`
**${wildChar.rarityColor} ${wildChar.name}** dari **${wildChar.series}**
                
Level: ${wildChar.level}
HP: ${wildChar.baseHP}
ATK: ${wildChar.baseATK}
DEF: ${wildChar.baseDEF}
SPD: ${wildChar.baseSPD}

*"${wildChar.quotes[Math.floor(Math.random() * wildChar.quotes.length)]}"*
            `)
            .setThumbnail(wildChar.image)
            .addFields(
                { name: '📊 Rarity', value: `${wildChar.rarityColor} ${wildChar.rarity.toUpperCase()}`, inline: true },
                { name: '🎯 Capture Rate', value: `${this.calculateCaptureRate(wildChar, 'normal', userData.totalCaptures)}%`, inline: true },
                { name: '🃏 Your Cards', value: `🎴 ${userData.captureCards} | 🟢 ${userData.greatBalls} | 🔵 ${userData.ultraBalls} | 🟡 ${userData.masterBalls}`, inline: false }
            )
            .setFooter({ text: 'Gunakan /capture untuk menangkap!' })
            .setTimestamp();
        
        // Store wild character in interaction
        interaction.client.tempWild = interaction.client.tempWild || new Map();
        interaction.client.tempWild.set(interaction.user.id, {
            character: wildChar,
            area,
            timestamp: Date.now()
        });
        
        await interaction.reply({ embeds: [embed] });
    }

    async handleCapture(interaction) {
        const ballType = interaction.options.getString('ball') || 'normal';
        const userData = await this.getUserCollection(interaction.user.id, interaction.guild.id);
        
        // Check if user has the ball
        if (ballType === 'great' && userData.greatBalls < 1) {
            return interaction.reply({ content: '❌ Kamu tidak punya Great Ball!', ephemeral: true });
        }
        if (ballType === 'ultra' && userData.ultraBalls < 1) {
            return interaction.reply({ content: '❌ Kamu tidak punya Ultra Ball!', ephemeral: true });
        }
        if (ballType === 'master' && userData.masterBalls < 1) {
            return interaction.reply({ content: '❌ Kamu tidak punya Master Ball!', ephemeral: true });
        }
        if (ballType === 'normal' && userData.captureCards < 1) {
            return interaction.reply({ content: '❌ Kamu tidak punya Capture Card!', ephemeral: true });
        }
        
        // Get wild character
        const tempWild = interaction.client.tempWild?.get(interaction.user.id);
        if (!tempWild || Date.now() - tempWild.timestamp > 300000) { // 5 minutes
            return interaction.reply({ content: '❌ Tidak ada karakter liar! Gunakan /wild dulu.', ephemeral: true });
        }
        
        const wildChar = tempWild.character;
        
        // Calculate capture chance
        const captureRate = this.calculateCaptureRate(wildChar, ballType, userData.totalCaptures);
        const roll = Math.random() * 100;
        
        // Use ball
        if (ballType === 'normal') userData.captureCards--;
        if (ballType === 'great') userData.greatBalls--;
        if (ballType === 'ultra') userData.ultraBalls--;
        if (ballType === 'master') userData.masterBalls--;
        
        let success = false;
        let embedColor = 0xFF0000;
        let description = '';
        
        if (ballType === 'master') {
            success = true;
        } else {
            success = roll <= captureRate;
        }
        
        if (success) {
            // Add to collection
            userData.characters.push({
                id: wildChar.id,
                name: wildChar.name,
                series: wildChar.series,
                rarity: wildChar.rarity,
                level: 1,
                xp: 0,
                capturedAt: Date.now(),
                battles: 0,
                wins: 0
            });
            userData.totalCaptures++;
            
            embedColor = 0x00FF00;
            description = `✅ **SUCCESS!** Kamu menangkap **${wildChar.name}**!`;
            
            // Clear temp
            interaction.client.tempWild.delete(interaction.user.id);
        } else {
            description = `❌ **FAILED!** ${wildChar.name} berhasil kabur!`;
        }
        
        await this.saveCollections();
        
        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('🎴 **CAPTURE ATTEMPT**')
            .setDescription(description)
            .addFields(
                { name: '🎯 Character', value: `${wildChar.rarityColor} ${wildChar.name}`, inline: true },
                { name: '🃏 Ball Used', value: ballType === 'normal' ? '🎴 Capture Card' : 
                    ballType === 'great' ? '🟢 Great Ball' : 
                    ballType === 'ultra' ? '🔵 Ultra Ball' : '🟡 Master Ball', inline: true },
                { name: '📊 Capture Rate', value: `${captureRate.toFixed(1)}%`, inline: true },
                { name: '🎲 Your Roll', value: `${roll.toFixed(1)}%`, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }

    async handleCollection(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const userData = await this.getUserCollection(target.id, interaction.guild.id);
        
        if (userData.characters.length === 0) {
            return interaction.reply({ 
                content: `📭 **${target.username}** belum memiliki karakter apapun!`, 
                ephemeral: true 
            });
        }
        
        // Group by rarity
        const common = userData.characters.filter(c => c.rarity === 'common').length;
        const rare = userData.characters.filter(c => c.rarity === 'rare').length;
        const superRare = userData.characters.filter(c => c.rarity === 'super_rare').length;
        const epic = userData.characters.filter(c => c.rarity === 'epic').length;
        const legendary = userData.characters.filter(c => c.rarity === 'legendary').length;
        
        // Get recent characters
        const recent = userData.characters.slice(-5).reverse();
        
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`🎴 **${target.username}'S COLLECTION**`)
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: '📊 STATISTICS', value: `
⚪ Common: ${common}
🟢 Rare: ${rare}
🔵 Super Rare: ${superRare}
🟣 Epic: ${epic}
🟡 Legendary: ${legendary}
**Total: ${userData.characters.length} characters**
                `, inline: true },
                { name: '🎮 BATTLE STATS', value: `
⚔️ Battles: ${userData.totalBattles || 0}
🏆 Wins: ${userData.wins || 0}
💔 Losses: ${userData.losses || 0}
🎯 Captures: ${userData.totalCaptures || 0}
                `, inline: true },
                { name: '🃏 INVENTORY', value: `
🎴 Capture Cards: ${userData.captureCards || 0}
🟢 Great Balls: ${userData.greatBalls || 0}
🔵 Ultra Balls: ${userData.ultraBalls || 0}
🟡 Master Balls: ${userData.masterBalls || 0}
                `, inline: true }
            )
            .setTimestamp();
        
        if (recent.length > 0) {
            let recentText = '';
            recent.forEach((c, i) => {
                const rarityEmoji = 
                    c.rarity === 'common' ? '⚪' : 
                    c.rarity === 'rare' ? '🟢' : 
                    c.rarity === 'super_rare' ? '🔵' : 
                    c.rarity === 'epic' ? '🟣' : '🟡';
                recentText += `${rarityEmoji} ${c.name} - Level ${c.level}\n`;
            });
            embed.addFields({ name: '📌 RECENT CAPTURES', value: recentText, inline: false });
        }
        
        await interaction.reply({ embeds: [embed] });
    }

    async handleBattle(interaction) {
        const opponent = interaction.options.getUser('user');
        
        if (opponent.id === interaction.user.id) {
            return interaction.reply({ content: '❌ Tidak bisa battle dengan diri sendiri!', ephemeral: true });
        }
        
        const userData = await this.getUserCollection(interaction.user.id, interaction.guild.id);
        const oppData = await this.getUserCollection(opponent.id, interaction.guild.id);
        
        if (userData.characters.length === 0) {
            return interaction.reply({ content: '❌ Kamu tidak punya karakter!', ephemeral: true });
        }
        if (oppData.characters.length === 0) {
            return interaction.reply({ content: '❌ Lawan tidak punya karakter!', ephemeral: true });
        }
        
        // Select strongest characters
        const userChar = userData.characters.sort((a, b) => b.level - a.level)[0];
        const oppChar = oppData.characters.sort((a, b) => b.level - a.level)[0];
        
        // Get full character data
        const userFullChar = this.characters.get(userChar.id);
        const oppFullChar = this.characters.get(oppChar.id);
        
        // Calculate power
        const userPower = userChar.level * 10 + (userFullChar?.baseATK || 80);
        const oppPower = oppChar.level * 10 + (oppFullChar?.baseATK || 80);
        
        const winner = userPower > oppPower ? interaction.user : opponent;
        const loser = userPower > oppPower ? opponent : interaction.user;
        
        // Update stats
        if (winner.id === interaction.user.id) {
            userData.wins = (userData.wins || 0) + 1;
            oppData.losses = (oppData.losses || 0) + 1;
        } else {
            oppData.wins = (oppData.wins || 0) + 1;
            userData.losses = (userData.losses || 0) + 1;
        }
        userData.totalBattles++;
        oppData.totalBattles++;
        
        await this.saveCollections();
        
        const embed = new EmbedBuilder()
            .setColor(0xFF1493)
            .setTitle('⚔️ **BATTLE RESULT**')
            .setDescription(`
**${interaction.user.username}** vs **${opponent.username}**

🎴 **${interaction.user.username}** menggunakan **${userChar.name}** (Level ${userChar.level})
🎴 **${opponent.username}** menggunakan **${oppChar.name}** (Level ${oppChar.level})

🏆 **WINNER: ${winner}**
            `)
            .addFields(
                { name: '📊 Power Comparison', value: `⚔️ ${userPower} vs ${oppPower}`, inline: false }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }

    async handleShop(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('🃏 **CAPTURE SHOP**')
            .setDescription('Beli item untuk menangkap karakter!')
            .addFields(
                { name: '🎴 Capture Card', value: '**500 coins**\nBasic capture card, 50% rate\n`/buy capture`', inline: false },
                { name: '🟢 Great Ball', value: '**1,500 coins**\n2x capture rate!\n`/buy great`', inline: false },
                { name: '🔵 Ultra Ball', value: '**5,000 coins**\n3x capture rate!\n`/buy ultra`', inline: false },
                { name: '🟡 Master Ball', value: '**20,000 coins**\n100% capture rate! (Limited)\n`/buy master`', inline: false }
            )
            .setFooter({ text: 'Gunakan /buy <item> untuk membeli' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }

    async handleBuy(interaction) {
        const item = interaction.options.getString('item');
        const userData = await this.getUserCollection(interaction.user.id, interaction.guild.id);
        
        // Get economy plugin
        const economyPlugin = interaction.client.economySystem;
        if (!economyPlugin) {
            return interaction.reply({ content: '❌ Economy system tidak tersedia!', ephemeral: true });
        }
        
        let price = 0;
        let itemName = '';
        let addAmount = 0;
        
        switch (item) {
            case 'capture':
                price = 500;
                itemName = '🎴 Capture Card';
                addAmount = 1;
                break;
            case 'great':
                price = 1500;
                itemName = '🟢 Great Ball';
                addAmount = 1;
                break;
            case 'ultra':
                price = 5000;
                itemName = '🔵 Ultra Ball';
                addAmount = 1;
                break;
            case 'master':
                price = 20000;
                itemName = '🟡 Master Ball';
                addAmount = 1;
                break;
            default:
                return interaction.reply({ content: '❌ Item tidak valid!', ephemeral: true });
        }
        
        const userBalance = await economyPlugin.getUser(interaction.user.id, interaction.guild.id);
        if (userBalance.balance < price) {
            return interaction.reply({ content: `❌ Uang tidak cukup! Butuh ${price} coins`, ephemeral: true });
        }
        
        // Deduct coins
        await economyPlugin.addBalance(interaction.user.id, interaction.guild.id, -price);
        
        // Add item
        if (item === 'capture') userData.captureCards += addAmount;
        if (item === 'great') userData.greatBalls += addAmount;
        if (item === 'ultra') userData.ultraBalls += addAmount;
        if (item === 'master') userData.masterBalls += addAmount;
        
        await this.saveCollections();
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **PURCHASE SUCCESSFUL**')
            .setDescription(`Kamu membeli **${itemName}**!`)
            .addFields(
                { name: '💰 Price', value: `${price} coins`, inline: true },
                { name: '📦 Stock', value: `+${addAmount}`, inline: true },
                { name: '🃏 Total', value: 
                    item === 'capture' ? `${userData.captureCards}` :
                    item === 'great' ? `${userData.greatBalls}` :
                    item === 'ultra' ? `${userData.ultraBalls}` :
                    `${userData.masterBalls}`, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('anime')
                .setDescription('🎴 Sakura Card Capture System')
                .addSubcommand(sub =>
                    sub.setName('wild')
                        .setDescription('Cari karakter liar untuk ditangkap')
                        .addStringOption(opt =>
                            opt.setName('area')
                                .setDescription('Area pencarian')
                                .addChoices(
                                    { name: '🌲 Forest - Common/Rare', value: 'forest' },
                                    { name: '⛰️ Mountain - Rare/Super Rare', value: 'mountain' },
                                    { name: '🏰 Dungeon - Super Rare/Epic', value: 'dungeon' },
                                    { name: '👑 Boss Area - Epic/Legendary', value: 'boss' }
                                )
                                .setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('capture')
                        .setDescription('Tangkap karakter liar')
                        .addStringOption(opt =>
                            opt.setName('ball')
                                .setDescription('Jenis capture ball')
                                .addChoices(
                                    { name: '🎴 Capture Card (500)', value: 'normal' },
                                    { name: '🟢 Great Ball (1,500)', value: 'great' },
                                    { name: '🔵 Ultra Ball (5,000)', value: 'ultra' },
                                    { name: '🟡 Master Ball (20,000)', value: 'master' }
                                )
                                .setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('collection')
                        .setDescription('Lihat koleksi karakter')
                        .addUserOption(opt =>
                            opt.setName('user')
                                .setDescription('User yang dicek')
                                .setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('battle')
                        .setDescription('Tantang user lain duel')
                        .addUserOption(opt =>
                            opt.setName('user')
                                .setDescription('Lawan')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('shop')
                        .setDescription('Capture shop'))
                .addSubcommand(sub =>
                    sub.setName('buy')
                        .setDescription('Beli item capture')
                        .addStringOption(opt =>
                            opt.setName('item')
                                .setDescription('Item yang dibeli')
                                .setRequired(true)
                                .addChoices(
                                    { name: '🎴 Capture Card (500)', value: 'capture' },
                                    { name: '🟢 Great Ball (1,500)', value: 'great' },
                                    { name: '🔵 Ultra Ball (5,000)', value: 'ultra' },
                                    { name: '🟡 Master Ball (20,000)', value: 'master' }
                                )))
        ];
    }

    static async handleCommand(interaction, system) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'wild': await system.handleWild(interaction); break;
            case 'capture': await system.handleCapture(interaction); break;
            case 'collection': await system.handleCollection(interaction); break;
            case 'battle': await system.handleBattle(interaction); break;
            case 'shop': await system.handleShop(interaction); break;
            case 'buy': await system.handleBuy(interaction); break;
        }
    }
}

module.exports = AnimeBattleSystem;
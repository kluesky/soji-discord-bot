// rpg-game.js - IDLE RPG GAME SYSTEM
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

class RPGame {
    constructor(client) {
        this.client = client;
        this.name = 'rpg-game';
        this.version = '1.0.0';
        
        this.playersPath = path.join(__dirname, 'data', 'rpg_players.json');
        this.itemsPath = path.join(__dirname, 'data', 'rpg_items.json');
        
        this.players = new Map();
        this.items = new Map();
        
        this.loadData();
        this.startIdleLoop();
    }

    async loadData() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        
        // ===== LOAD PLAYERS =====
        try {
            const playerData = await fs.readFile(this.playersPath, 'utf8');
            
            // CEK APAKAH FILE KOSONG
            if (!playerData || playerData.trim() === '') {
                throw new Error('Empty file');
            }
            
            const parsedPlayers = JSON.parse(playerData);
            for (const [id, player] of Object.entries(parsedPlayers)) {
                this.players.set(id, player);
            }
            console.log(`🎮 Loaded ${this.players.size} RPG players`);
        } catch (error) {
            console.log('🎮 No player data found, creating fresh database...');
            await fs.writeFile(this.playersPath, '{}');
            this.players.clear();
        }
        
        // ===== LOAD ITEMS =====
        try {
            const itemData = await fs.readFile(this.itemsPath, 'utf8');
            
            // CEK APAKAH FILE KOSONG
            if (!itemData || itemData.trim() === '') {
                throw new Error('Empty file');
            }
            
            const parsedItems = JSON.parse(itemData);
            for (const [id, item] of Object.entries(parsedItems)) {
                this.items.set(id, item);
            }
            console.log(`🎮 Loaded ${this.items.size} RPG items`);
        } catch (error) {
            console.log('🎮 No item data found, initializing items...');
            await this.initItems();
            
            // LOAD ITEMS AFTER INIT
            const itemData = await fs.readFile(this.itemsPath, 'utf8');
            const parsedItems = JSON.parse(itemData);
            for (const [id, item] of Object.entries(parsedItems)) {
                this.items.set(id, item);
            }
            console.log(`🎮 Initialized ${this.items.size} RPG items`);
        }
        
    } catch (error) {
        console.error('Error loading RPG data:', error);
    }
}

    async savePlayers() {
        const obj = {};
        this.players.forEach((player, id) => {
            obj[id] = player;
        });
        await fs.writeFile(this.playersPath, JSON.stringify(obj, null, 2));
    }

    async initItems() {
        const items = {
            // Weapons
            "wooden_sword": {
                id: "wooden_sword",
                name: "🗡️ Pedang Kayu",
                type: "weapon",
                rarity: "common",
                level: 1,
                attack: 10,
                defense: 0,
                hp: 0,
                price: 100,
                sell: 50,
                description: "Pedang dari kayu, cocok untuk pemula"
            },
            "iron_sword": {
                id: "iron_sword",
                name: "⚔️ Pedang Besi",
                type: "weapon",
                rarity: "rare",
                level: 5,
                attack: 30,
                defense: 5,
                hp: 0,
                price: 500,
                sell: 250,
                description: "Pedang besi yang tajam"
            },
            "dragon_sword": {
                id: "dragon_sword",
                name: "🐉 Pedang Naga",
                type: "weapon",
                rarity: "epic",
                level: 15,
                attack: 100,
                defense: 20,
                hp: 50,
                price: 5000,
                sell: 2500,
                description: "Pedang legendaris dari sisik naga"
            },
            
            // Armors
            "leather_armor": {
                id: "leather_armor",
                name: "🧥 Armor Kulit",
                type: "armor",
                rarity: "common",
                level: 1,
                attack: 0,
                defense: 15,
                hp: 20,
                price: 200,
                sell: 100,
                description: "Armor dari kulit hewan"
            },
            "iron_armor": {
                id: "iron_armor",
                name: "🛡️ Armor Besi",
                type: "armor",
                rarity: "rare",
                level: 5,
                attack: 0,
                defense: 40,
                hp: 50,
                price: 800,
                sell: 400,
                description: "Armor besi yang kokoh"
            },
            
            // Potions
            "health_potion": {
                id: "health_potion",
                name: "🧪 Health Potion",
                type: "consumable",
                rarity: "common",
                level: 1,
                hp_recover: 50,
                price: 50,
                sell: 25,
                description: "Memulihkan 50 HP"
            },
            "elixir": {
                id: "elixir",
                name: "✨ Elixir",
                type: "consumable",
                rarity: "epic",
                level: 10,
                hp_recover: 200,
                mana_recover: 100,
                price: 1000,
                sell: 500,
                description: "Memulihkan 200 HP dan 100 MP"
            }
        };
        
        await fs.writeFile(this.itemsPath, JSON.stringify(items, null, 2));
    }

    async getPlayer(userId, guildId, interaction = null) {
        const key = `${guildId}-${userId}`;
        
        if (!this.players.has(key)) {
            // Random starting class
            const classes = ['Warrior', 'Mage', 'Archer', 'Assassin'];
            const selectedClass = classes[Math.floor(Math.random() * classes.length)];
            
            let baseStats = {};
            switch (selectedClass) {
                case 'Warrior':
                    baseStats = { hp: 120, mp: 50, attack: 20, defense: 15, magic: 5, speed: 8 };
                    break;
                case 'Mage':
                    baseStats = { hp: 80, mp: 120, attack: 5, defense: 8, magic: 25, speed: 10 };
                    break;
                case 'Archer':
                    baseStats = { hp: 90, mp: 70, attack: 18, defense: 10, magic: 8, speed: 20 };
                    break;
                case 'Assassin':
                    baseStats = { hp: 85, mp: 60, attack: 22, defense: 8, magic: 5, speed: 25 };
                    break;
            }
            
            const username = interaction ? interaction.user.username : 'Player';
            
            this.players.set(key, {
                userId,
                guildId,
                name: username,
                class: selectedClass,
                level: 1,
                exp: 0,
                expNeeded: 100,
                hp: baseStats.hp,
                maxHp: baseStats.hp,
                mp: baseStats.mp,
                maxMp: baseStats.mp,
                attack: baseStats.attack,
                defense: baseStats.defense,
                magic: baseStats.magic,
                speed: baseStats.speed,
                gold: 500,
                inventory: [],
                equipment: {
                    weapon: null,
                    armor: null,
                    accessory: null
                },
                dungeon: {
                    exploring: false,
                    startTime: null,
                    endTime: null,
                    dungeon: null,
                    floor: 1
                },
                totalBattles: 0,
                totalWins: 0,
                totalLoot: 0,
                createdAt: Date.now()
            });
            
            await this.savePlayers();
        }
        
        return this.players.get(key);
    }

    startIdleLoop() {
        // Check every 30 seconds for idle rewards
        setInterval(async () => {
            const now = Date.now();
            
            for (const [key, player] of this.players) {
                // Check dungeon exploration
                if (player.dungeon.exploring && player.dungeon.endTime <= now) {
                    await this.completeDungeon(key, player);
                }
            }
        }, 30000);
    }

    async completeDungeon(playerKey, player) {
        const dungeon = player.dungeon;
        
        // Calculate rewards
        const baseGold = 100 * dungeon.floor;
        const baseExp = 50 * dungeon.floor;
        
        // Random loot
        const possibleItems = Array.from(this.items.values())
            .filter(item => item.level <= player.level);
        const loot = [];
        
        for (let i = 0; i < dungeon.floor; i++) {
            if (Math.random() < 0.3) { // 30% chance per floor
                const item = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                loot.push(item.id);
                
                // Add to inventory
                player.inventory.push({
                    id: item.id,
                    obtainedAt: Date.now()
                });
            }
        }
        
        // Add rewards
        player.gold += baseGold;
        player.exp += baseExp;
        player.totalLoot += loot.length;
        
        // Level up
        while (player.exp >= player.expNeeded) {
            player.level++;
            player.exp -= player.expNeeded;
            player.expNeeded = Math.floor(player.expNeeded * 1.5);
            
            // Increase stats
            player.maxHp += 10;
            player.hp = player.maxHp;
            player.maxMp += 5;
            player.mp = player.maxMp;
            player.attack += 3;
            player.defense += 2;
            player.magic += 2;
            player.speed += 1;
        }
        
        // Reset dungeon
        player.dungeon = {
            exploring: false,
            startTime: null,
            endTime: null,
            dungeon: null,
            floor: 1
        };
        
        await this.savePlayers();
        
        // Notify player if they're online
        const guild = this.client.guilds.cache.get(player.guildId);
        if (guild) {
            const member = await guild.members.fetch(player.userId).catch(() => null);
            if (member) {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🏆 **DUNGEON COMPLETED!**')
                    .setDescription(`Petualanganmu di **${dungeon.dungeon}** selesai!`)
                    .addFields(
                        { name: '📊 Floor', value: `${dungeon.floor}`, inline: true },
                        { name: '💰 Gold', value: `+${baseGold}`, inline: true },
                        { name: '✨ EXP', value: `+${baseExp}`, inline: true },
                        { name: '📦 Loot', value: loot.length > 0 ? `${loot.length} item` : 'Tidak ada', inline: true }
                    )
                    .setTimestamp();

                member.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }

    async handleStart(interaction) {
        const player = await this.getPlayer(interaction.user.id, interaction.guild.id, interaction);
        
        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🎮 **IDLE RPG - CHARACTER STATUS**')
            .setDescription(`
👤 **${player.name}**
🎭 **Class:** ${player.class}
📊 **Level:** ${player.level} (${player.exp}/${player.expNeeded} EXP)

❤️ **HP:** ${player.hp}/${player.maxHp}
💙 **MP:** ${player.mp}/${player.maxMp}
⚔️ **ATK:** ${player.attack}
🛡️ **DEF:** ${player.defense}
✨ **MAG:** ${player.magic}
💨 **SPD:** ${player.speed}

💰 **Gold:** ${player.gold.toLocaleString()}
📦 **Inventory:** ${player.inventory.length} items
⚔️ **Battles:** ${player.totalBattles} (${player.totalWins} wins)
            `)
            .setFooter({ text: 'Gunakan /rpg adventure untuk mulai petualangan!' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rpg_adventure')
                    .setLabel('🗺️ Adventure')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('rpg_inventory')
                    .setLabel('📦 Inventory')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('rpg_shop')
                    .setLabel('🏪 Shop')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('rpg_leaderboard')
                    .setLabel('📊 Leaderboard')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    async handleAdventure(interaction) {
        const player = await this.getPlayer(interaction.user.id, interaction.guild.id, interaction);
        
        // Check if already exploring
        if (player.dungeon.exploring) {
            const timeLeft = player.dungeon.endTime - Date.now();
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setTitle('⏳ **ADVENTURE IN PROGRESS**')
                        .setDescription(`Kamu sedang menjelajah **${player.dungeon.dungeon}**!`)
                        .addFields(
                            { name: '📍 Floor', value: `${player.dungeon.floor}`, inline: true },
                            { name: '⏰ Time Left', value: `${minutes}m ${seconds}s`, inline: true }
                        )
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }

        // Dungeon selection
        const dungeons = [
            { name: '🌲 Forest of Beginnings', minLevel: 1, duration: 2, reward: 1.0 },
            { name: '⛰️ Rocky Mountains', minLevel: 5, duration: 5, reward: 1.5 },
            { name: '🔥 Volcanic Cave', minLevel: 10, duration: 10, reward: 2.0 },
            { name: '❄️ Frozen Tundra', minLevel: 15, duration: 15, reward: 2.5 },
            { name: '💀 Dark Dungeon', minLevel: 20, duration: 20, reward: 3.0 },
            { name: '🐉 Dragon\'s Lair', minLevel: 30, duration: 30, reward: 4.0 }
        ];

        const availableDungeons = dungeons.filter(d => player.level >= d.minLevel);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('rpg_dungeon_select')
            .setPlaceholder('Pilih dungeon untuk dijelajahi')
            .addOptions(
                availableDungeons.map(d => ({
                    label: d.name,
                    description: `Level ${d.minLevel}+ • ${d.duration} menit • ${d.reward}x reward`,
                    value: d.name,
                    emoji: '🗺️'
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: '🗺️ **Pilih dungeon yang ingin dijelajahi:**',
            components: [row],
            ephemeral: true
        });
    }

    async handleInventory(interaction) {
        const player = await this.getPlayer(interaction.user.id, interaction.guild.id, interaction);
        
        if (player.inventory.length === 0) {
            return interaction.reply({
                content: '📦 Inventory kamu kosong! Coba adventure dulu ya~',
                ephemeral: true
            });
        }

        // Group items by type
        const weapons = player.inventory.filter(i => {
            const item = this.items.get(i.id);
            return item && item.type === 'weapon';
        });
        
        const armors = player.inventory.filter(i => {
            const item = this.items.get(i.id);
            return item && item.type === 'armor';
        });
        
        const consumables = player.inventory.filter(i => {
            const item = this.items.get(i.id);
            return item && item.type === 'consumable';
        });

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle(`📦 **INVENTORY - ${interaction.user.username}**`)
            .setDescription(`Total items: ${player.inventory.length}`)
            .setTimestamp();

        if (weapons.length > 0) {
            let weaponList = '';
            weapons.slice(-5).forEach((item, index) => {
                const itemData = this.items.get(item.id);
                weaponList += `**${index + 1}.** ${itemData.name} (ATK +${itemData.attack})\n`;
            });
            embed.addFields({ name: '⚔️ WEAPONS', value: weaponList, inline: false });
        }

        if (armors.length > 0) {
            let armorList = '';
            armors.slice(-5).forEach((item, index) => {
                const itemData = this.items.get(item.id);
                armorList += `**${index + 1}.** ${itemData.name} (DEF +${itemData.defense})\n`;
            });
            embed.addFields({ name: '🛡️ ARMORS', value: armorList, inline: false });
        }

        if (consumables.length > 0) {
            let consumableList = '';
            consumables.slice(-5).forEach((item, index) => {
                const itemData = this.items.get(item.id);
                consumableList += `**${index + 1}.** ${itemData.name} (HP +${itemData.hp_recover})\n`;
            });
            embed.addFields({ name: '🧪 CONSUMABLES', value: consumableList, inline: false });
        }

        embed.setFooter({ text: 'Gunakan /rpg equip <item_id> untuk equip item' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleShop(interaction) {
        const items = Array.from(this.items.values())
            .filter(item => Math.random() < 0.7) // Random stock
            .slice(0, 8);

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🏪 **RPG SHOP**')
            .setDescription('Items tersedia hari ini:')
            .setTimestamp();

        items.forEach(item => {
            let stats = '';
            if (item.attack) stats += `⚔️ ATK +${item.attack} `;
            if (item.defense) stats += `🛡️ DEF +${item.defense} `;
            if (item.hp_recover) stats += `❤️ HP +${item.hp_recover} `;
            
            embed.addFields({
                name: `${item.name} - ${item.price}💰`,
                value: `${item.description}\n${stats}\nLevel: ${item.level} | Rarity: ${item.rarity}\nID: \`${item.id}\``,
                inline: false
            });
        });

        embed.setFooter({ text: 'Gunakan /rpg buy <item_id> untuk membeli' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleBuy(interaction) {
        const itemId = interaction.options.getString('item_id');
        const item = this.items.get(itemId);
        
        if (!item) {
            return interaction.reply({ 
                content: '❌ Item tidak ditemukan! Cek ID item di shop.', 
                ephemeral: true 
            });
        }

        const player = await this.getPlayer(interaction.user.id, interaction.guild.id, interaction);
        
        if (player.gold < item.price) {
            return interaction.reply({ 
                content: `❌ Gold tidak cukup! Butuh ${item.price} gold (Kamu: ${player.gold} gold)`, 
                ephemeral: true 
            });
        }

        player.gold -= item.price;
        player.inventory.push({
            id: item.id,
            obtainedAt: Date.now()
        });

        await this.savePlayers();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **PURCHASE SUCCESSFUL**')
            .setDescription(`Kamu membeli **${item.name}**!`)
            .addFields(
                { name: '💰 Price', value: `${item.price} gold`, inline: true },
                { name: '💵 Gold Left', value: `${player.gold} gold`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ 
            embeds: [embed],
            ephemeral: true 
        });
    }

    async handleLeaderboard(interaction) {
        const guildPlayers = Array.from(this.players.values())
            .filter(p => p.guildId === interaction.guild.id)
            .sort((a, b) => b.level - a.level || b.exp - a.exp)
            .slice(0, 10);

        if (guildPlayers.length === 0) {
            return interaction.reply({ 
                content: '📊 Belum ada pemain RPG di server ini! Mulai dengan /rpg start', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🏆 **RPG LEADERBOARD**')
            .setDescription(`Top ${guildPlayers.length} Players in ${interaction.guild.name}`)
            .setTimestamp();

        for (let i = 0; i < guildPlayers.length; i++) {
            const player = guildPlayers[i];
            const member = await interaction.guild.members.fetch(player.userId).catch(() => null);
            const username = member ? member.user.username : 'Unknown Player';

            embed.addFields({
                name: `${i + 1}. ${username} (Level ${player.level})`,
                value: `🎭 ${player.class} | ⚔️ ${player.attack} ATK | 🛡️ ${player.defense} DEF | 💰 ${player.gold} gold`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    }

    async handleProfile(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const player = await this.getPlayer(target.id, interaction.guild.id);
        
        // Calculate progress bar
        const expPercent = (player.exp / player.expNeeded) * 100;
        const expBar = '█'.repeat(Math.floor(expPercent / 10)) + '░'.repeat(10 - Math.floor(expPercent / 10));
        
        // Get equipment
        const weapon = player.equipment.weapon ? this.items.get(player.equipment.weapon) : null;
        const armor = player.equipment.armor ? this.items.get(player.equipment.armor) : null;

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle(`👤 **RPG PROFILE - ${target.username}**`)
            .setThumbnail(target.displayAvatarURL())
            .setDescription(`
🎭 **Class:** ${player.class}
📊 **Level:** ${player.level}
✨ **EXP:** ${player.exp}/${player.expNeeded}
📈 **Progress:** \`${expBar}\` ${expPercent.toFixed(1)}%

❤️ **HP:** ${player.hp}/${player.maxHp}
💙 **MP:** ${player.mp}/${player.maxMp}
⚔️ **ATK:** ${player.attack} ${weapon ? `(+${weapon.attack})` : ''}
🛡️ **DEF:** ${player.defense} ${armor ? `(+${armor.defense})` : ''}
✨ **MAG:** ${player.magic}
💨 **SPD:** ${player.speed}

💰 **Gold:** ${player.gold.toLocaleString()}
📦 **Items:** ${player.inventory.length}
⚔️ **Battles:** ${player.totalBattles} (${player.totalWins} wins)
📅 **Joined:** <t:${Math.floor(player.createdAt/1000)}:R>
            `)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ==================== INTERACTION HANDLER ====================
    async handleInteraction(interaction) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        const { customId } = interaction;

        if (customId === 'rpg_adventure') {
            await this.handleAdventure(interaction);
        } else if (customId === 'rpg_inventory') {
            await this.handleInventory(interaction);
        } else if (customId === 'rpg_shop') {
            await this.handleShop(interaction);
        } else if (customId === 'rpg_leaderboard') {
            await this.handleLeaderboard(interaction);
        } else if (customId === 'rpg_dungeon_select') {
            const dungeonName = interaction.values[0];
            const player = await this.getPlayer(interaction.user.id, interaction.guild.id, interaction);
            
            // Dungeon config
            const dungeons = {
                '🌲 Forest of Beginnings': { time: 2, floor: 1, exp: 50, gold: 100 },
                '⛰️ Rocky Mountains': { time: 5, floor: 2, exp: 100, gold: 200 },
                '🔥 Volcanic Cave': { time: 10, floor: 3, exp: 200, gold: 400 },
                '❄️ Frozen Tundra': { time: 15, floor: 4, exp: 350, gold: 700 },
                '💀 Dark Dungeon': { time: 20, floor: 5, exp: 550, gold: 1100 },
                '🐉 Dragon\'s Lair': { time: 30, floor: 6, exp: 800, gold: 1600 }
            };

            const dungeon = dungeons[dungeonName];
            
            player.dungeon = {
                exploring: true,
                startTime: Date.now(),
                endTime: Date.now() + (dungeon.time * 60000),
                dungeon: dungeonName,
                floor: dungeon.floor
            };

            await this.savePlayers();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🗺️ **ADVENTURE STARTED!**')
                .setDescription(`Berangkat ke **${dungeonName}**!`)
                .addFields(
                    { name: '⏰ Duration', value: `${dungeon.time} menit`, inline: true },
                    { name: '📍 Floor', value: `${dungeon.floor}`, inline: true },
                    { name: '💰 Reward', value: `✨ ${dungeon.exp} EXP | 💰 ${dungeon.gold} gold`, inline: true }
                )
                .setFooter({ text: 'Kamu akan mendapat DM saat petualangan selesai!' })
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: []
            });
        }
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('rpg')
                .setDescription('🎮 Idle RPG Game')
                .addSubcommand(sub =>
                    sub.setName('start')
                        .setDescription('Mulai petualangan RPG'))
                .addSubcommand(sub =>
                    sub.setName('adventure')
                        .setDescription('Mulai menjelajah dungeon'))
                .addSubcommand(sub =>
                    sub.setName('inventory')
                        .setDescription('Lihat inventory'))
                .addSubcommand(sub =>
                    sub.setName('shop')
                        .setDescription('Lihat shop'))
                .addSubcommand(sub =>
                    sub.setName('buy')
                        .setDescription('Beli item')
                        .addStringOption(opt =>
                            opt.setName('item_id')
                                .setDescription('ID item (contoh: wooden_sword, health_potion)')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('leaderboard')
                        .setDescription('Top pemain RPG'))
                .addSubcommand(sub =>
                    sub.setName('profile')
                        .setDescription('Lihat profil karakter')
                        .addUserOption(opt =>
                            opt.setName('user')
                                .setDescription('User yang dicek')
                                .setRequired(false)))
        ];
    }

    static async handleCommand(interaction, rpg) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'start':
                await rpg.handleStart(interaction);
                break;
            case 'adventure':
                await rpg.handleAdventure(interaction);
                break;
            case 'inventory':
                await rpg.handleInventory(interaction);
                break;
            case 'shop':
                await rpg.handleShop(interaction);
                break;
            case 'buy':
                await rpg.handleBuy(interaction);
                break;
            case 'leaderboard':
                await rpg.handleLeaderboard(interaction);
                break;
            case 'profile':
                await rpg.handleProfile(interaction);
                break;
            default:
                await interaction.reply({ 
                    content: '❌ Subcommand tidak dikenal!', 
                    ephemeral: true 
                });
        }
    }
}

module.exports = RPGame;
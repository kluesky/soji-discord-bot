// economy.js - FULL ECONOMY SYSTEM DENGAN SEMUA COMMAND
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class EconomyPlugin {
    constructor(client) {
        this.client = client;
        this.name = 'economy';
        this.version = '2.0.0';
        this.description = 'Sistem ekonomi lengkap dengan level, shop, dan kerja';
        
        this.dbPath = path.join(__dirname, 'data', 'economy.json');
        this.shopPath = path.join(__dirname, 'data', 'shop.json');
        this.data = {
            users: new Map(),
            shop: new Map(),
            cooldowns: new Map()
        };
        
        this.loadData();
    }

    async init() {
        console.log('💰 Economy system initialized');
    }

    async loadData() {
        try {
            // Buat folder data jika belum ada
            const dataDir = path.join(__dirname, 'data');
            await fs.mkdir(dataDir, { recursive: true });
            
            // Load user data
            const userData = await fs.readFile(this.dbPath, 'utf8').catch(async () => {
                await fs.writeFile(this.dbPath, '{}');
                return '{}';
            });
            const parsed = JSON.parse(userData);
            
            for (const [userId, user] of Object.entries(parsed)) {
                this.data.users.set(userId, user);
            }

            // Load shop data
            const shopData = await fs.readFile(this.shopPath, 'utf8').catch(async () => {
                await fs.writeFile(this.shopPath, '{}');
                return '{}';
            });
            const parsedShop = JSON.parse(shopData);
            
            for (const [itemId, item] of Object.entries(parsedShop)) {
                this.data.shop.set(itemId, item);
            }

            console.log(`💰 Loaded ${this.data.users.size} users, ${this.data.shop.size} shop items`);
        } catch (error) {
            console.log('💰 Creating new economy database...');
            await this.saveData();
            await this.saveShop();
        }
    }

    async saveData() {
        const obj = {};
        this.data.users.forEach((user, userId) => {
            obj[userId] = user;
        });
        await fs.writeFile(this.dbPath, JSON.stringify(obj, null, 2));
    }

    async saveShop() {
        const obj = {};
        this.data.shop.forEach((item, itemId) => {
            obj[itemId] = item;
        });
        await fs.writeFile(this.shopPath, JSON.stringify(obj, null, 2));
    }

    // ==================== USER MANAGEMENT ====================
    async getUser(userId, guildId) {
        const key = `${guildId}-${userId}`;
        
        if (!this.data.users.has(key)) {
            this.data.users.set(key, {
                userId,
                guildId,
                balance: 1000,
                bank: 0,
                xp: 0,
                level: 1,
                daily: 0,
                weekly: 0,
                monthly: 0,
                inventory: [],
                workStreak: 0,
                lastWork: 0,
                lastDaily: 0,
                lastWeekly: 0,
                lastMonthly: 0,
                reputation: 0,
                badges: [],
                married: null,
                marriedSince: null,
                totalEarned: 0,
                totalSpent: 0,
                totalWorked: 0
            });
            await this.saveData();
        }
        
        return this.data.users.get(key);
    }

    async addBalance(userId, guildId, amount, reason = 'earned') {
        const user = await this.getUser(userId, guildId);
        user.balance += amount;
        if (amount > 0) {
            user.totalEarned += amount;
        }
        if (amount < 0) {
            user.totalSpent += Math.abs(amount);
        }
        if (user.balance < 0) user.balance = 0;
        await this.saveData();
        return user.balance;
    }

    async addBank(userId, guildId, amount) {
        const user = await this.getUser(userId, guildId);
        user.bank += amount;
        if (user.bank < 0) user.bank = 0;
        await this.saveData();
        return user.bank;
    }

    async addXP(userId, guildId, amount) {
        const user = await this.getUser(userId, guildId);
        user.xp += amount;
        
        // Level up system
        const xpNeeded = user.level * 100;
        if (user.xp >= xpNeeded) {
            user.level++;
            user.xp -= xpNeeded;
            return { leveledUp: true, newLevel: user.level };
        }
        
        await this.saveData();
        return { leveledUp: false, newLevel: user.level };
    }

    // ==================== COMMAND HANDLERS ====================

    // ----- BALANCE COMMAND -----
    async handleBalance(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const userData = await this.getUser(target.id, interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`💰 **BALANCE - ${target.username}**`)
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: '💵 **Cash**', value: `**${userData.balance.toLocaleString()}** coins`, inline: true },
                { name: '🏦 **Bank**', value: `**${userData.bank.toLocaleString()}** coins`, inline: true },
                { name: '💎 **Total**', value: `**${(userData.balance + userData.bank).toLocaleString()}** coins`, inline: true },
                { name: '📊 **Level**', value: `**${userData.level}** (${userData.xp}/${userData.level * 100} XP)`, inline: true },
                { name: '⭐ **Reputation**', value: `**${userData.reputation}** rep`, inline: true },
                { name: '🔥 **Work Streak**', value: `**${userData.workStreak}** days`, inline: true },
                { name: '💼 **Total Earned**', value: `**${userData.totalEarned.toLocaleString()}** coins`, inline: true },
                { name: '🛒 **Total Spent**', value: `**${userData.totalSpent.toLocaleString()}** coins`, inline: true }
            )
            .setFooter({ text: `User ID: ${target.id}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ----- DAILY COMMAND -----
    async handleDaily(interaction) {
        const userData = await this.getUser(interaction.user.id, interaction.guild.id);
        const now = Date.now();
        const lastDaily = userData.lastDaily || 0;
        
        if (now - lastDaily < 86400000) {
            const timeLeft = 86400000 - (now - lastDaily);
            const hours = Math.floor(timeLeft / 3600000);
            const minutes = Math.floor((timeLeft % 3600000) / 60000);
            
            return interaction.reply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⏰ **DAILY COOLDOWN**')
                        .setDescription(`Kamu sudah mengambil daily reward!`)
                        .addFields(
                            { name: '⏳ Waktu Tersisa', value: `**${hours} jam ${minutes} menit** lagi`, inline: false }
                        )
                ],
                ephemeral: true 
            });
        }

        // Base amount + streak bonus
        const baseAmount = 500;
        const streakBonus = userData.workStreak * 50;
        const amount = baseAmount + streakBonus;
        
        userData.balance += amount;
        userData.lastDaily = now;
        userData.workStreak++;
        userData.totalEarned += amount;
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **DAILY REWARD**')
            .setDescription(`**+${amount.toLocaleString()}** coins telah ditambahkan!`)
            .addFields(
                { name: '💰 Balance', value: `${userData.balance.toLocaleString()} coins`, inline: true },
                { name: '🔥 Streak', value: `${userData.workStreak} days`, inline: true },
                { name: '📅 Next Daily', value: `<t:${Math.floor((now + 86400000)/1000)}:R>`, inline: true }
            )
            .setColor(0x1E90FF)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ----- WEEKLY COMMAND -----
    async handleWeekly(interaction) {
        const userData = await this.getUser(interaction.user.id, interaction.guild.id);
        const now = Date.now();
        const lastWeekly = userData.lastWeekly || 0;
        
        if (now - lastWeekly < 604800000) {
            const timeLeft = 604800000 - (now - lastWeekly);
            const days = Math.floor(timeLeft / 86400000);
            const hours = Math.floor((timeLeft % 86400000) / 3600000);
            
            return interaction.reply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⏰ **WEEKLY COOLDOWN**')
                        .setDescription(`Kamu sudah mengambil weekly reward!`)
                        .addFields(
                            { name: '⏳ Waktu Tersisa', value: `**${days} hari ${hours} jam** lagi`, inline: false }
                        )
                ],
                ephemeral: true 
            });
        }

        const amount = 2000 + (userData.workStreak * 200);
        
        userData.balance += amount;
        userData.lastWeekly = now;
        userData.totalEarned += amount;
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('📅 **WEEKLY REWARD**')
            .setDescription(`**+${amount.toLocaleString()}** coins telah ditambahkan!`)
            .addFields(
                { name: '💰 Balance', value: `${userData.balance.toLocaleString()} coins`, inline: true },
                { name: '🔥 Streak', value: `${userData.workStreak} days`, inline: true },
                { name: '📅 Next Weekly', value: `<t:${Math.floor((now + 604800000)/1000)}:R>`, inline: true }
            )
            .setColor(0x1E90FF)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ----- MONTHLY COMMAND -----
    async handleMonthly(interaction) {
        const userData = await this.getUser(interaction.user.id, interaction.guild.id);
        const now = Date.now();
        const lastMonthly = userData.lastMonthly || 0;
        
        if (now - lastMonthly < 2592000000) {
            const timeLeft = 2592000000 - (now - lastMonthly);
            const days = Math.floor(timeLeft / 86400000);
            
            return interaction.reply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⏰ **MONTHLY COOLDOWN**')
                        .setDescription(`Kamu sudah mengambil monthly reward!`)
                        .addFields(
                            { name: '⏳ Waktu Tersisa', value: `**${days} hari** lagi`, inline: false }
                        )
                ],
                ephemeral: true 
            });
        }

        const amount = 10000;
        
        userData.balance += amount;
        userData.lastMonthly = now;
        userData.totalEarned += amount;
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('📆 **MONTHLY REWARD**')
            .setDescription(`**+${amount.toLocaleString()}** coins telah ditambahkan!`)
            .addFields(
                { name: '💰 Balance', value: `${userData.balance.toLocaleString()} coins`, inline: true },
                { name: '📅 Next Monthly', value: `<t:${Math.floor((now + 2592000000)/1000)}:R>`, inline: true }
            )
            .setColor(0x1E90FF)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ----- WORK COMMAND -----
    async handleWork(interaction) {
        const userData = await this.getUser(interaction.user.id, interaction.guild.id);
        const now = Date.now();
        const lastWork = userData.lastWork || 0;
        
        if (now - lastWork < 3600000) {
            const timeLeft = 3600000 - (now - lastWork);
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            
            return interaction.reply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⏰ **WORK COOLDOWN**')
                        .setDescription(`Kamu sudah bekerja! Istirahat dulu.`)
                        .addFields(
                            { name: '⏳ Waktu Tersisa', value: `**${minutes} menit ${seconds} detik** lagi`, inline: false }
                        )
                ],
                ephemeral: true 
            });
        }

        // Jobs berdasarkan level
        const jobs = [
            { name: '🧹 Cleaning Service', min: 50, max: 150, level: 1 },
            { name: '📦 Kurir', min: 100, max: 250, level: 2 },
            { name: '☕ Barista', min: 150, max: 350, level: 3 },
            { name: '💻 Programmer', min: 300, max: 600, level: 5 },
            { name: '🎨 Designer', min: 250, max: 500, level: 4 },
            { name: '📝 Writer', min: 200, max: 400, level: 3 },
            { name: '🎮 Game Tester', min: 150, max: 300, level: 2 },
            { name: '🛒 Trader', min: 400, max: 800, level: 6 },
            { name: '🏦 Banker', min: 500, max: 1000, level: 7 },
            { name: '👨‍💼 CEO', min: 800, max: 1500, level: 10 }
        ];

        // Filter jobs berdasarkan level user
        const availableJobs = jobs.filter(job => userData.level >= job.level);
        const job = availableJobs[Math.floor(Math.random() * availableJobs.length)] || jobs[0];
        
        const amount = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
        
        userData.balance += amount;
        userData.lastWork = now;
        userData.totalEarned += amount;
        userData.totalWorked++;
        await this.saveData();

        // Random bonus XP
        const xpGain = Math.floor(Math.random() * 20) + 10;
        const levelResult = await this.addXP(interaction.user.id, interaction.guild.id, xpGain);

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('💼 **WORK COMPLETED**')
            .setDescription(`Kamu bekerja sebagai **${job.name}**`)
            .addFields(
                { name: '💰 Reward', value: `**+${amount.toLocaleString()}** coins`, inline: true },
                { name: '💵 Balance', value: `${userData.balance.toLocaleString()} coins`, inline: true },
                { name: '✨ XP Gained', value: `+${xpGain} XP`, inline: true }
            )
            .setTimestamp();

        if (levelResult.leveledUp) {
            embed.addFields({ 
                name: '🎉 LEVEL UP!', 
                value: `Kamu naik ke level **${levelResult.newLevel}**!`, 
                inline: false 
            });
        }

        await interaction.reply({ embeds: [embed] });
    }

    // ----- DEPOSIT COMMAND -----
    async handleDeposit(interaction) {
        const amount = interaction.options.getInteger('amount');
        const userData = await this.getUser(interaction.user.id, interaction.guild.id);

        if (amount > userData.balance) {
            return interaction.reply({ 
                content: '❌ Uang cash kamu tidak cukup!', 
                ephemeral: true 
            });
        }

        userData.balance -= amount;
        userData.bank += amount;
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🏦 **DEPOSIT SUCCESSFUL**')
            .setDescription(`**+${amount.toLocaleString()}** coins disimpan ke bank!`)
            .addFields(
                { name: '💵 Cash', value: `${userData.balance.toLocaleString()} coins`, inline: true },
                { name: '🏦 Bank', value: `${userData.bank.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ----- WITHDRAW COMMAND -----
    async handleWithdraw(interaction) {
        const amount = interaction.options.getInteger('amount');
        const userData = await this.getUser(interaction.user.id, interaction.guild.id);

        if (amount > userData.bank) {
            return interaction.reply({ 
                content: '❌ Uang di bank tidak cukup!', 
                ephemeral: true 
            });
        }

        userData.bank -= amount;
        userData.balance += amount;
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('💵 **WITHDRAW SUCCESSFUL**')
            .setDescription(`**+${amount.toLocaleString()}** coins diambil dari bank!`)
            .addFields(
                { name: '💵 Cash', value: `${userData.balance.toLocaleString()} coins`, inline: true },
                { name: '🏦 Bank', value: `${userData.bank.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ----- TRANSFER COMMAND -----
    async handleTransfer(interaction) {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const userData = await this.getUser(interaction.user.id, interaction.guild.id);

        if (target.id === interaction.user.id) {
            return interaction.reply({ 
                content: '❌ Tidak bisa transfer ke diri sendiri!', 
                ephemeral: true 
            });
        }

        if (amount > userData.balance) {
            return interaction.reply({ 
                content: '❌ Uang cash kamu tidak cukup!', 
                ephemeral: true 
            });
        }

        // Transfer uang
        userData.balance -= amount;
        await this.saveData();

        const targetData = await this.getUser(target.id, interaction.guild.id);
        targetData.balance += amount;
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('💸 **TRANSFER SUCCESSFUL**')
            .setDescription(`**${amount.toLocaleString()}** coins telah ditransfer ke **${target.tag}**!`)
            .addFields(
                { name: '💰 Sisa Balance', value: `${userData.balance.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // DM ke penerima
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle('💰 **PENERIMAAN TRANSFER**')
                .setDescription(`Kamu menerima transfer **${amount.toLocaleString()}** coins dari **${interaction.user.tag}**!`)
                .setTimestamp();

            await target.send({ embeds: [dmEmbed] });
        } catch (error) {
            // Skip if DM closed
        }
    }

    // ----- LEADERBOARD COMMAND -----
    async handleLeaderboard(interaction) {
        const type = interaction.options.getString('type') || 'balance';
        await interaction.deferReply();

        try {
            const guildId = interaction.guild.id;
            const guildUsers = Array.from(this.data.users.values())
                .filter(u => u.guildId === guildId);

            let sorted = [];
            if (type === 'balance') {
                sorted = guildUsers.sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank));
            } else if (type === 'level') {
                sorted = guildUsers.sort((a, b) => b.level - a.level || b.xp - a.xp);
            } else if (type === 'work') {
                sorted = guildUsers.sort((a, b) => b.totalWorked - a.totalWorked);
            } else if (type === 'reputation') {
                sorted = guildUsers.sort((a, b) => b.reputation - a.reputation);
            }

            const top10 = sorted.slice(0, 10);

            if (top10.length === 0) {
                return interaction.editReply({ content: '📊 Belum ada data economy di server ini!' });
            }

            const titles = {
                balance: '🏆 **ECONOMY LEADERBOARD**',
                level: '📊 **LEVEL LEADERBOARD**',
                work: '💼 **WORK LEADERBOARD**',
                reputation: '⭐ **REPUTATION LEADERBOARD**'
            };

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle(titles[type] || titles.balance)
                .setDescription(`**Top 10 Users in ${interaction.guild.name}**\n`);

            for (let i = 0; i < top10.length; i++) {
                const user = top10[i];
                const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
                const username = member ? member.user.username : 'Unknown User';
                
                let value = '';
                if (type === 'balance') {
                    value = `💰 **${(user.balance + user.bank).toLocaleString()}** coins | Level ${user.level}`;
                } else if (type === 'level') {
                    value = `📊 Level **${user.level}** (${user.xp}/${user.level * 100} XP) | 💰 ${(user.balance + user.bank).toLocaleString()} coins`;
                } else if (type === 'work') {
                    value = `💼 **${user.totalWorked || 0}** kali bekerja | 💰 ${(user.balance + user.bank).toLocaleString()} coins`;
                } else if (type === 'reputation') {
                    value = `⭐ **${user.reputation || 0}** reputation | Level ${user.level}`;
                }

                embed.addFields({
                    name: `${i + 1}. ${username}`,
                    value: value,
                    inline: false
                });
            }

            embed.setTimestamp()
                .setFooter({ text: 'Lyora Community • Economy System' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Leaderboard error:', error);
            await interaction.editReply({ content: '❌ Error fetching leaderboard!' });
        }
    }

    // ----- SHOP COMMAND -----
    async handleShop(interaction) {
        const shopItems = Array.from(this.data.shop.values())
            .filter(item => item.guildId === interaction.guild.id);

        if (shopItems.length === 0) {
            return interaction.reply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('🛒 **SHOP KOSONG**')
                        .setDescription('Belum ada item di shop!')
                        .addFields(
                            { name: '📌 Admin', value: 'Gunakan `/economy-admin shopadd` untuk menambah item', inline: false }
                        )
                        .setTimestamp()
                ],
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('🛒 **SERVER SHOP**')
            .setDescription(`**${interaction.guild.name}**\n\n`);

        shopItems.forEach((item, index) => {
            embed.addFields({
                name: `${item.emoji || '📦'} **${item.name}** - ${item.price.toLocaleString()} coins`,
                value: `${item.description}\nStok: ${item.stock || '∞'} | ID: \`${item.id}\``,
                inline: false
            });
        });

        embed.setTimestamp()
            .setFooter({ text: 'Gunakan /economy buy <id> untuk membeli' });

        // Create select menu for buying
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('economy_buy_select')
            .setPlaceholder('🛒 Pilih item untuk dibeli')
            .addOptions(
                shopItems.slice(0, 25).map(item => ({
                    label: item.name.substring(0, 100),
                    description: `${item.price.toLocaleString()} coins - ${item.description.substring(0, 50)}`,
                    value: item.id,
                    emoji: item.emoji || '🛒'
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // ----- BUY COMMAND -----
    async handleBuy(interaction) {
        const itemId = interaction.options.getString('item_id');
        const item = this.data.shop.get(itemId);

        if (!item || item.guildId !== interaction.guild.id) {
            return interaction.reply({ 
                content: '❌ Item tidak ditemukan!', 
                ephemeral: true 
            });
        }

        const userData = await this.getUser(interaction.user.id, interaction.guild.id);

        if (userData.balance < item.price) {
            return interaction.reply({ 
                content: `❌ Uang kamu tidak cukup! Butuh **${item.price.toLocaleString()}** coins`, 
                ephemeral: true 
            });
        }

        // Check stock
        if (item.stock !== undefined && item.stock !== null && item.stock > 0) {
            item.stock--;
            this.data.shop.set(itemId, item);
            await this.saveShop();
        }

        // Process purchase
        userData.balance -= item.price;
        userData.totalSpent += item.price;
        
        // Add to inventory
        if (!userData.inventory) userData.inventory = [];
        userData.inventory.push({
            itemId: item.id,
            itemName: item.name,
            purchasedAt: Date.now(),
            price: item.price
        });
        
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **PURCHASE SUCCESSFUL**')
            .setDescription(`Kamu telah membeli **${item.name}**!`)
            .addFields(
                { name: '💰 Price', value: `${item.price.toLocaleString()} coins`, inline: true },
                { name: '💵 Sisa Balance', value: `${userData.balance.toLocaleString()} coins`, inline: true },
                { name: '📦 Stock Tersisa', value: `${item.stock !== undefined ? item.stock : '∞'}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ----- INVENTORY COMMAND -----
    async handleInventory(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const userData = await this.getUser(target.id, interaction.guild.id);

        if (!userData.inventory || userData.inventory.length === 0) {
            return interaction.reply({ 
                content: `📦 **${target.username}** tidak memiliki item apapun!`, 
                ephemeral: true 
            });
        }

        const items = userData.inventory.slice(-10).reverse(); // 10 item terbaru

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle(`📦 **INVENTORY - ${target.username}**`)
            .setDescription(`**Total Items:** ${userData.inventory.length}`)
            .setThumbnail(target.displayAvatarURL());

        items.forEach((item, index) => {
            embed.addFields({
                name: `${index + 1}. ${item.itemName}`,
                value: `🕒 Dibeli: <t:${Math.floor(item.purchasedAt/1000)}:R>\n💰 Harga: ${item.price.toLocaleString()} coins`,
                inline: false
            });
        });

        if (userData.inventory.length > 10) {
            embed.setFooter({ text: `...dan ${userData.inventory.length - 10} item lainnya` });
        }

        embed.setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ----- REPUTATION COMMAND -----
    async handleReputation(interaction) {
        const target = interaction.options.getUser('user');

        if (target.id === interaction.user.id) {
            return interaction.reply({ 
                content: '❌ Tidak bisa kasih rep ke diri sendiri!', 
                ephemeral: true 
            });
        }

        const userData = await this.getUser(interaction.user.id, interaction.guild.id);
        const now = Date.now();
        const lastRep = userData.lastRep || 0;

        if (now - lastRep < 86400000) {
            const timeLeft = 86400000 - (now - lastRep);
            const hours = Math.floor(timeLeft / 3600000);
            const minutes = Math.floor((timeLeft % 3600000) / 60000);
            
            return interaction.reply({ 
                content: `⏰ Kamu sudah kasih rep! Tunggu **${hours}j ${minutes}m** lagi.`,
                ephemeral: true 
            });
        }

        // Add reputation
        const targetData = await this.getUser(target.id, interaction.guild.id);
        targetData.reputation = (targetData.reputation || 0) + 1;
        
        userData.lastRep = now;
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('⭐ **REPUTATION GIVEN**')
            .setDescription(`Kamu memberikan 1 reputation kepada **${target.tag}**!`)
            .addFields(
                { name: '👤 Penerima', value: `${target.tag}`, inline: true },
                { name: '⭐ Total Rep', value: `${targetData.reputation} reputation`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ----- MARRIAGE COMMAND -----
    async handleMarry(interaction) {
        const target = interaction.options.getUser('user');

        if (target.id === interaction.user.id) {
            return interaction.reply({ 
                content: '❌ Tidak bisa menikah dengan diri sendiri!', 
                ephemeral: true 
            });
        }

        const userData = await this.getUser(interaction.user.id, interaction.guild.id);
        const targetData = await this.getUser(target.id, interaction.guild.id);

        if (userData.married) {
            return interaction.reply({ 
                content: `❌ Kamu sudah menikah dengan <@${userData.married}>!`, 
                ephemeral: true 
            });
        }

        if (targetData.married) {
            return interaction.reply({ 
                content: `❌ **${target.tag}** sudah menikah!`, 
                ephemeral: true 
            });
        }

        // Create proposal embed
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('💍 **PROPOSAL**')
            .setDescription(`${interaction.user} melamar ${target} untuk menikah!`)
            .addFields(
                { name: '💝 Dari', value: `${interaction.user.tag}`, inline: true },
                { name: '💝 Untuk', value: `${target.tag}`, inline: true }
            )
            .setFooter({ text: 'Klik tombol di bawah untuk menjawab' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`marry_accept_${interaction.user.id}_${target.id}`)
                    .setLabel('✅ Terima')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`marry_decline_${interaction.user.id}_${target.id}`)
                    .setLabel('❌ Tolak')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // ----- DIVORCE COMMAND -----
    async handleDivorce(interaction) {
        const userData = await this.getUser(interaction.user.id, interaction.guild.id);

        if (!userData.married) {
            return interaction.reply({ 
                content: '❌ Kamu tidak sedang menikah!', 
                ephemeral: true 
            });
        }

        const exPartner = userData.married;
        
        // Reset marriage status
        userData.married = null;
        userData.marriedSince = null;
        
        const partnerData = await this.getUser(exPartner, interaction.guild.id);
        partnerData.married = null;
        partnerData.marriedSince = null;
        
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(0x808080)
            .setTitle('💔 **DIVORCE**')
            .setDescription(`Kamu bercerai dengan <@${exPartner}>`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ----- SLOT MACHINE COMMAND -----
    async handleSlot(interaction) {
        const bet = interaction.options.getInteger('bet');
        const userData = await this.getUser(interaction.user.id, interaction.guild.id);

        if (bet > userData.balance) {
            return interaction.reply({ 
                content: '❌ Uang kamu tidak cukup!', 
                ephemeral: true 
            });
        }

        if (bet < 10) {
            return interaction.reply({ 
                content: '❌ Minimal bet 10 coins!', 
                ephemeral: true 
            });
        }

        // Slot symbols
        const symbols = ['🍒', '🍊', '🍇', '🍉', '💎', '7️⃣'];
        const results = [];
        
        for (let i = 0; i < 3; i++) {
            results.push(symbols[Math.floor(Math.random() * symbols.length)]);
        }

        // Calculate winnings
        let multiplier = 0;
        if (results[0] === results[1] && results[1] === results[2]) {
            // Jackpot - all three same
            if (results[0] === '7️⃣') multiplier = 10;
            else if (results[0] === '💎') multiplier = 7;
            else multiplier = 5;
        } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
            // Two same
            multiplier = 2;
        }

        const winAmount = bet * multiplier;
        
        if (winAmount > 0) {
            userData.balance += winAmount;
            userData.totalEarned += winAmount;
        } else {
            userData.balance -= bet;
            userData.totalSpent += bet;
        }
        
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(winAmount > 0 ? 0x00FF00 : 0xFF0000)
            .setTitle('🎰 **SLOT MACHINE**')
            .setDescription(`\`\`\`\n[ ${results.join(' | ')} ]\n\`\`\``)
            .addFields(
                { name: '💰 Bet', value: `${bet.toLocaleString()} coins`, inline: true },
                { name: '🎁 Won', value: `${winAmount.toLocaleString()} coins`, inline: true },
                { name: '💵 Balance', value: `${userData.balance.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ----- ADMIN COMMANDS -----
    async handleAdminAdd(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        await this.addBalance(target.id, interaction.guild.id, amount, 'admin_add');

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('💰 **ADMIN ADD**')
            .setDescription(`**+${amount.toLocaleString()}** coins ditambahkan ke **${target.tag}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleAdminRemove(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        await this.addBalance(target.id, interaction.guild.id, -amount, 'admin_remove');

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('💰 **ADMIN REMOVE**')
            .setDescription(`**-${amount.toLocaleString()}** coins diambil dari **${target.tag}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleAdminSet(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        
        const userData = await this.getUser(target.id, interaction.guild.id);
        userData.balance = amount;
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('💰 **ADMIN SET**')
            .setDescription(`Balance **${target.tag}** diatur menjadi **${amount.toLocaleString()}** coins`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleAdminShopAdd(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const name = interaction.options.getString('name');
        const price = interaction.options.getInteger('price');
        const description = interaction.options.getString('description');
        const emoji = interaction.options.getString('emoji') || '📦';
        const stock = interaction.options.getInteger('stock') || null;

        const itemId = `item_${Date.now()}`;

        const item = {
            id: itemId,
            guildId: interaction.guild.id,
            name,
            price,
            description,
            emoji,
            stock,
            createdAt: Date.now()
        };

        this.data.shop.set(itemId, item);
        await this.saveShop();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🛒 **SHOP ITEM ADDED**')
            .setDescription(`**${emoji} ${name}** telah ditambahkan ke shop!`)
            .addFields(
                { name: '💰 Price', value: `${price.toLocaleString()} coins`, inline: true },
                { name: '📝 Description', value: description, inline: true },
                { name: '📦 Stock', value: stock ? `${stock}` : 'Unlimited', inline: true },
                { name: '🆔 ID', value: `\`${itemId}\``, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleAdminShopRemove(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const itemId = interaction.options.getString('item_id');
        const item = this.data.shop.get(itemId);

        if (!item || item.guildId !== interaction.guild.id) {
            return interaction.reply({ 
                content: '❌ Item tidak ditemukan!', 
                ephemeral: true 
            });
        }

        this.data.shop.delete(itemId);
        await this.saveShop();

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🛒 **SHOP ITEM REMOVED**')
            .setDescription(`**${item.emoji || '📦'} ${item.name}** telah dihapus dari shop!`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleAdminShopEdit(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const itemId = interaction.options.getString('item_id');
        const name = interaction.options.getString('name');
        const price = interaction.options.getInteger('price');
        const description = interaction.options.getString('description');
        const emoji = interaction.options.getString('emoji');
        const stock = interaction.options.getInteger('stock');

        const item = this.data.shop.get(itemId);

        if (!item || item.guildId !== interaction.guild.id) {
            return interaction.reply({ 
                content: '❌ Item tidak ditemukan!', 
                ephemeral: true 
            });
        }

        if (name) item.name = name;
        if (price) item.price = price;
        if (description) item.description = description;
        if (emoji) item.emoji = emoji;
        if (stock !== null) item.stock = stock;

        this.data.shop.set(itemId, item);
        await this.saveShop();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🛒 **SHOP ITEM EDITED**')
            .setDescription(`**${item.emoji || '📦'} ${item.name}** telah diedit!`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleAdminReset(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Administrator permissions required!', 
                ephemeral: true 
            });
        }

        const target = interaction.options.getUser('user');
        const key = `${interaction.guild.id}-${target.id}`;
        
        this.data.users.delete(key);
        await this.saveData();

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔄 **ECONOMY RESET**')
            .setDescription(`Data economy **${target.tag}** telah direset!`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ==================== INTERACTION HANDLER ====================
    async handleInteraction(interaction) {
        if (interaction.isStringSelectMenu() && interaction.customId === 'economy_buy_select') {
            const itemId = interaction.values[0];
            const item = this.data.shop.get(itemId);

            if (!item || item.guildId !== interaction.guild.id) {
                return interaction.reply({ 
                    content: '❌ Item tidak ditemukan!', 
                    ephemeral: true 
                });
            }

            const userData = await this.getUser(interaction.user.id, interaction.guild.id);

            if (userData.balance < item.price) {
                return interaction.reply({ 
                    content: `❌ Uang kamu tidak cukup! Butuh **${item.price.toLocaleString()}** coins`, 
                    ephemeral: true 
                });
            }

            // Check stock
            if (item.stock !== undefined && item.stock !== null && item.stock > 0) {
                item.stock--;
                this.data.shop.set(itemId, item);
                await this.saveShop();
            }

            // Process purchase
            userData.balance -= item.price;
            userData.totalSpent += item.price;
            
            if (!userData.inventory) userData.inventory = [];
            userData.inventory.push({
                itemId: item.id,
                itemName: item.name,
                purchasedAt: Date.now(),
                price: item.price
            });
            
            await this.saveData();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ **PURCHASE SUCCESSFUL**')
                .setDescription(`Kamu telah membeli **${item.name}**!`)
                .addFields(
                    { name: '💰 Price', value: `${item.price.toLocaleString()} coins`, inline: true },
                    { name: '💵 Sisa Balance', value: `${userData.balance.toLocaleString()} coins`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (interaction.isButton() && interaction.customId.startsWith('marry_')) {
            const parts = interaction.customId.split('_');
            const action = parts[1];
            const proposerId = parts[2];
            const targetId = parts[3];

            if (interaction.user.id !== targetId) {
                return interaction.reply({ 
                    content: '❌ Ini bukan untuk kamu!', 
                    ephemeral: true 
                });
            }

            if (action === 'accept') {
                const proposerData = await this.getUser(proposerId, interaction.guild.id);
                const targetData = await this.getUser(targetId, interaction.guild.id);

                if (proposerData.married || targetData.married) {
                    return interaction.reply({ 
                        content: '❌ Salah satu sudah menikah!', 
                        ephemeral: true 
                    });
                }

                const now = Date.now();
                proposerData.married = targetId;
                proposerData.marriedSince = now;
                targetData.married = proposerId;
                targetData.marriedSince = now;
                
                await this.saveData();

                const embed = new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setTitle('💍 **MARRIAGE**')
                    .setDescription(`${interaction.user} dan <@${proposerId}> resmi menikah! 🎉`)
                    .addFields(
                        { name: '💝 Pasangan', value: `<@${proposerId}> 💕 ${interaction.user}`, inline: false },
                        { name: '📅 Menikah Sejak', value: `<t:${Math.floor(now/1000)}:F>`, inline: false }
                    )
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
            } else if (action === 'decline') {
                const embed = new EmbedBuilder()
                    .setColor(0x808080)
                    .setTitle('💔 **PROPOSAL DECLINED**')
                    .setDescription(`${interaction.user} menolak lamaran <@${proposerId}>`)
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
            }
        }
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            // ===== USER COMMANDS =====
            new SlashCommandBuilder()
                .setName('economy')
                .setDescription('💰 Sistem ekonomi server')
                .addSubcommand(sub =>
                    sub.setName('balance')
                        .setDescription('Cek balance kamu atau user lain')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('User yang ingin dicek').setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('daily')
                        .setDescription('Ambil daily reward (500 + streak)'))
                .addSubcommand(sub =>
                    sub.setName('weekly')
                        .setDescription('Ambil weekly reward (2000 + streak)'))
                .addSubcommand(sub =>
                    sub.setName('monthly')
                        .setDescription('Ambil monthly reward (10000)'))
                .addSubcommand(sub =>
                    sub.setName('work')
                        .setDescription('Bekerja untuk mendapatkan uang'))
                .addSubcommand(sub =>
                    sub.setName('deposit')
                        .setDescription('Simpan uang ke bank')
                        .addIntegerOption(opt => 
                            opt.setName('amount').setDescription('Jumlah uang').setRequired(true).setMinValue(1)))
                .addSubcommand(sub =>
                    sub.setName('withdraw')
                        .setDescription('Ambil uang dari bank')
                        .addIntegerOption(opt => 
                            opt.setName('amount').setDescription('Jumlah uang').setRequired(true).setMinValue(1)))
                .addSubcommand(sub =>
                    sub.setName('transfer')
                        .setDescription('Transfer uang ke user lain')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('Penerima').setRequired(true))
                        .addIntegerOption(opt => 
                            opt.setName('amount').setDescription('Jumlah uang').setRequired(true).setMinValue(1)))
                .addSubcommand(sub =>
                    sub.setName('leaderboard')
                        .setDescription('Top 10 di server')
                        .addStringOption(opt => 
                            opt.setName('type')
                                .setDescription('Tipe leaderboard')
                                .setRequired(false)
                                .addChoices(
                                    { name: '💰 Balance', value: 'balance' },
                                    { name: '📊 Level', value: 'level' },
                                    { name: '💼 Work', value: 'work' },
                                    { name: '⭐ Reputation', value: 'reputation' }
                                )))
                .addSubcommand(sub =>
                    sub.setName('shop')
                        .setDescription('Lihat item shop'))
                .addSubcommand(sub =>
                    sub.setName('buy')
                        .setDescription('Beli item dari shop')
                        .addStringOption(opt => 
                            opt.setName('item_id')
                                .setDescription('ID item yang ingin dibeli')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('inventory')
                        .setDescription('Lihat inventory kamu')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('User yang dicek').setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('rep')
                        .setDescription('Beri reputation ke user lain')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('User yang ingin diberi rep').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('marry')
                        .setDescription('Lamaran menikah dengan user lain')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('Pasangan').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('divorce')
                        .setDescription('Bercerai dengan pasangan'))
                .addSubcommand(sub =>
                    sub.setName('slot')
                        .setDescription('Main slot machine')
                        .addIntegerOption(opt => 
                            opt.setName('bet').setDescription('Jumlah taruhan').setRequired(true).setMinValue(10))),
            
            // ===== ADMIN COMMANDS =====
            new SlashCommandBuilder()
                .setName('economy-admin')
                .setDescription('[ADMIN] Kelola sistem economy')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Tambah balance user')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('User').setRequired(true))
                        .addIntegerOption(opt => 
                            opt.setName('amount').setDescription('Jumlah').setRequired(true).setMinValue(1)))
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Kurang balance user')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('User').setRequired(true))
                        .addIntegerOption(opt => 
                            opt.setName('amount').setDescription('Jumlah').setRequired(true).setMinValue(1)))
                .addSubcommand(sub =>
                    sub.setName('set')
                        .setDescription('Set balance user')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('User').setRequired(true))
                        .addIntegerOption(opt => 
                            opt.setName('amount').setDescription('Jumlah').setRequired(true).setMinValue(0)))
                .addSubcommand(sub =>
                    sub.setName('reset')
                        .setDescription('Reset data economy user')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('User').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('shopadd')
                        .setDescription('Tambah item ke shop')
                        .addStringOption(opt => 
                            opt.setName('name').setDescription('Nama item').setRequired(true))
                        .addIntegerOption(opt => 
                            opt.setName('price').setDescription('Harga').setRequired(true).setMinValue(1))
                        .addStringOption(opt => 
                            opt.setName('description').setDescription('Deskripsi').setRequired(true))
                        .addStringOption(opt => 
                            opt.setName('emoji').setDescription('Emoji item').setRequired(false))
                        .addIntegerOption(opt => 
                            opt.setName('stock').setDescription('Stok (0 = unlimited)').setRequired(false).setMinValue(0)))
                .addSubcommand(sub =>
                    sub.setName('shopremove')
                        .setDescription('Hapus item dari shop')
                        .addStringOption(opt => 
                            opt.setName('item_id').setDescription('ID item').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('shopedits')
                        .setDescription('Edit item shop')
                        .addStringOption(opt => 
                            opt.setName('item_id').setDescription('ID item').setRequired(true))
                        .addStringOption(opt => 
                            opt.setName('name').setDescription('Nama baru').setRequired(false))
                        .addIntegerOption(opt => 
                            opt.setName('price').setDescription('Harga baru').setRequired(false).setMinValue(1))
                        .addStringOption(opt => 
                            opt.setName('description').setDescription('Deskripsi baru').setRequired(false))
                        .addStringOption(opt => 
                            opt.setName('emoji').setDescription('Emoji baru').setRequired(false))
                        .addIntegerOption(opt => 
                            opt.setName('stock').setDescription('Stok baru').setRequired(false).setMinValue(0)))
        ];
    }

    static async handleCommand(interaction, plugin) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                // User commands
                case 'balance': await plugin.handleBalance(interaction); break;
                case 'daily': await plugin.handleDaily(interaction); break;
                case 'weekly': await plugin.handleWeekly(interaction); break;
                case 'monthly': await plugin.handleMonthly(interaction); break;
                case 'work': await plugin.handleWork(interaction); break;
                case 'deposit': await plugin.handleDeposit(interaction); break;
                case 'withdraw': await plugin.handleWithdraw(interaction); break;
                case 'transfer': await plugin.handleTransfer(interaction); break;
                case 'leaderboard': await plugin.handleLeaderboard(interaction); break;
                case 'shop': await plugin.handleShop(interaction); break;
                case 'buy': await plugin.handleBuy(interaction); break;
                case 'inventory': await plugin.handleInventory(interaction); break;
                case 'rep': await plugin.handleReputation(interaction); break;
                case 'marry': await plugin.handleMarry(interaction); break;
                case 'divorce': await plugin.handleDivorce(interaction); break;
                case 'slot': await plugin.handleSlot(interaction); break;
                
                // Admin commands
                case 'add': await plugin.handleAdminAdd(interaction); break;
                case 'remove': await plugin.handleAdminRemove(interaction); break;
                case 'set': await plugin.handleAdminSet(interaction); break;
                case 'reset': await plugin.handleAdminReset(interaction); break;
                case 'shopadd': await plugin.handleAdminShopAdd(interaction); break;
                case 'shopremove': await plugin.handleAdminShopRemove(interaction); break;
                case 'shopedits': await plugin.handleAdminShopEdit(interaction); break;
                
                default:
                    await interaction.reply({ 
                        content: '❌ Subcommand tidak dikenal!', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error(`Economy command error (${subcommand}):`, error);
            
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

module.exports = EconomyPlugin;
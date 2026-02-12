// anime-guild.js - ANIME GUILD SYSTEM
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

class AnimeGuildSystem {
    constructor(client) {
        this.client = client;
        this.name = 'anime-guild';
        this.version = '1.0.0';
        
        this.guildsPath = path.join(__dirname, 'data', 'guilds.json');
        this.membersPath = path.join(__dirname, 'data', 'guild_members.json');
        
        this.guilds = new Map();
        this.members = new Map();
        
        this.loadData();
    }

    async loadData() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        
        // ===== LOAD GUILDS =====
        try {
            const guildData = await fs.readFile(this.guildsPath, 'utf8');
            if (guildData.trim() === '') {
                throw new Error('Empty file');
            }
            const parsedGuilds = JSON.parse(guildData);
            for (const [id, guild] of Object.entries(parsedGuilds)) {
                this.guilds.set(id, guild);
            }
            console.log(`🏰 Loaded ${this.guilds.size} guilds`);
        } catch (error) {
            console.log('🏰 Guilds database empty, creating new...');
            await fs.writeFile(this.guildsPath, '{}');
            this.guilds.clear();
        }
        
        // ===== LOAD MEMBERS =====
        try {
            const memberData = await fs.readFile(this.membersPath, 'utf8');
            if (memberData.trim() === '') {
                throw new Error('Empty file');
            }
            const parsedMembers = JSON.parse(memberData);
            for (const [id, member] of Object.entries(parsedMembers)) {
                this.members.set(id, member);
            }
            console.log(`🏰 Loaded ${this.members.size} members`);
        } catch (error) {
            console.log('🏰 Members database empty, creating new...');
            await fs.writeFile(this.membersPath, '{}');
            this.members.clear();
        }
        
    } catch (error) {
        console.error('❌ Error loading guild data:', error);
    }
}

    async saveGuilds() {
        const obj = {};
        this.guilds.forEach((guild, id) => {
            obj[id] = guild;
        });
        await fs.writeFile(this.guildsPath, JSON.stringify(obj, null, 2));
    }

    async saveMembers() {
        const obj = {};
        this.members.forEach((member, id) => {
            obj[id] = member;
        });
        await fs.writeFile(this.membersPath, JSON.stringify(obj, null, 2));
    }

    // ==================== GUILD RAID BOSSES ====================
    getRaidBoss(level) {
        const bosses = [
            {
                name: "Madara Uchiha",
                series: "Naruto",
                level: 10,
                hp: 50000,
                maxHp: 50000,
                atk: 500,
                def: 300,
                reward: 10000,
                image: "https://www.arcadianorth.com/cdn/shop/files/Naruto_Madara_Uchiha_anime_silhouette_light_red.jpg?v=1721778867&width=2048"
            },
            {
                name: "Aizen Sosuke",
                series: "Bleach",
                level: 20,
                hp: 100000,
                maxHp: 100000,
                atk: 800,
                def: 500,
                reward: 20000,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXanKdbEmrTv5k5fEh0oHlTHFJgqEZ-fOicPA4uBoiog&s"
            },
            {
                name: "Meruem",
                series: "Hunter x Hunter",
                level: 30,
                hp: 200000,
                maxHp: 200000,
                atk: 1200,
                def: 800,
                reward: 35000,
                image: "https://static.wikia.nocookie.net/hunterxhunter/images/5/5d/MeruemAfterZero.png/revision/latest?cb=20140422200917"
            },
            {
                name: "Kaido",
                series: "One Piece",
                level: 40,
                hp: 350000,
                maxHp: 350000,
                atk: 1500,
                def: 1200,
                reward: 50000,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDGi4BOPX9zjhrTiPw4X6yMGdCTHuPxe1yIRgsatBlgLdeDCqFoW2b9QIf&s=10"
            },
            {
                name: "Saitama",
                series: "One Punch Man",
                level: 50,
                hp: 500000,
                maxHp: 500000,
                atk: 9999,
                def: 2000,
                reward: 100000,
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlrPQEEvWaZoQcdbIEs670lUOAphD53yUG6giNJ1gKMQ&s=10"
            }
        ];
        
        return bosses.find(b => b.level === level) || bosses[0];
    }

    // ==================== GET USER GUILD ====================
    async getUserGuild(userId, guildId) {
        const key = `${guildId}-${userId}`;
        return this.members.get(key)?.guildId || null;
    }

    async getGuild(guildId, guildServerId) {
        const key = `${guildServerId}-${guildId}`;
        if (!this.guilds.has(key)) {
            return null;
        }
        return this.guilds.get(key);
    }

    // ==================== COMMAND HANDLERS ====================
    async handleCreate(interaction) {
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description') || 'No description';
        
        // Get economy plugin
        const economyPlugin = interaction.client.economySystem;
        if (!economyPlugin) {
            return interaction.reply({ content: '❌ Economy system tidak tersedia!', ephemeral: true });
        }
        
        // Check balance
        const userBalance = await economyPlugin.getUser(interaction.user.id, interaction.guild.id);
        if (userBalance.balance < 10000) {
            return interaction.reply({ content: '❌ Kamu butuh 10,000 coins untuk membuat guild!', ephemeral: true });
        }
        
        // Check if already in guild
        const existingGuild = await this.getUserGuild(interaction.user.id, interaction.guild.id);
        if (existingGuild) {
            return interaction.reply({ content: '❌ Kamu sudah berada di guild!', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const guildId = `guild_${Date.now()}`;
            const key = `${interaction.guild.id}-${guildId}`;
            
            // Create guild
            const guild = {
                id: guildId,
                name,
                description,
                ownerId: interaction.user.id,
                guildServerId: interaction.guild.id,
                level: 1,
                xp: 0,
                xpNeeded: 1000,
                bank: 0,
                members: [interaction.user.id],
                createdAt: Date.now(),
                raidBoss: null,
                raidStartTime: null,
                totalDamage: 0,
                emblem: null,
                perks: []
            };
            
            this.guilds.set(key, guild);
            
            // Add member
            const memberKey = `${interaction.guild.id}-${interaction.user.id}`;
            this.members.set(memberKey, {
                userId: interaction.user.id,
                guildServerId: interaction.guild.id,
                guildId: guildId,
                joinedAt: Date.now(),
                role: 'owner',
                contributions: 0,
                damage: 0
            });
            
            // Deduct coins
            await economyPlugin.addBalance(interaction.user.id, interaction.guild.id, -10000);
            
            await this.saveGuilds();
            await this.saveMembers();
            
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🏰 **GUILD CREATED!**')
                .setDescription(`**${name}** telah didirikan!`)
                .addFields(
                    { name: '👑 Owner', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📝 Description', value: description, inline: false },
                    { name: '📊 Level', value: '1 (0/1000 XP)', inline: true },
                    { name: '💰 Guild Bank', value: '0 coins', inline: true }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Guild creation error:', error);
            await interaction.editReply({ content: '❌ Error creating guild!' });
        }
    }

    async handleJoin(interaction) {
        const guildId = interaction.options.getString('guild_id');
        const guild = await this.getGuild(guildId, interaction.guild.id);
        
        if (!guild) {
            return interaction.reply({ content: '❌ Guild tidak ditemukan!', ephemeral: true });
        }
        
        // Check if already in guild
        const existingGuild = await this.getUserGuild(interaction.user.id, interaction.guild.id);
        if (existingGuild) {
            return interaction.reply({ content: '❌ Kamu sudah berada di guild!', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Add member
            guild.members.push(interaction.user.id);
            
            const memberKey = `${interaction.guild.id}-${interaction.user.id}`;
            this.members.set(memberKey, {
                userId: interaction.user.id,
                guildServerId: interaction.guild.id,
                guildId: guildId,
                joinedAt: Date.now(),
                role: 'member',
                contributions: 0,
                damage: 0
            });
            
            await this.saveGuilds();
            await this.saveMembers();
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ **JOINED GUILD**')
                .setDescription(`Kamu bergabung dengan **${guild.name}**!`)
                .addFields(
                    { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                    { name: '📊 Level', value: `${guild.level}`, inline: true }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Guild join error:', error);
            await interaction.editReply({ content: '❌ Error joining guild!' });
        }
    }

    async handleLeave(interaction) {
        const guild = await this.getUserGuild(interaction.user.id, interaction.guild.id);
        if (!guild) {
            return interaction.reply({ content: '❌ Kamu tidak berada di guild!', ephemeral: true });
        }
        
        const guildData = await this.getGuild(guild, interaction.guild.id);
        if (!guildData) {
            return interaction.reply({ content: '❌ Guild tidak ditemukan!', ephemeral: true });
        }
        
        if (guildData.ownerId === interaction.user.id) {
            return interaction.reply({ 
                content: '❌ Kamu adalah owner! Gunakan `/guild disband` untuk membubarkan guild.', 
                ephemeral: true 
            });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Remove member
            guildData.members = guildData.members.filter(id => id !== interaction.user.id);
            
            const memberKey = `${interaction.guild.id}-${interaction.user.id}`;
            this.members.delete(memberKey);
            
            await this.saveGuilds();
            await this.saveMembers();
            
            await interaction.editReply({ 
                content: `✅ Kamu keluar dari **${guildData.name}**!` 
            });
            
        } catch (error) {
            console.error('Guild leave error:', error);
            await interaction.editReply({ content: '❌ Error leaving guild!' });
        }
    }

    async handleDisband(interaction) {
        const guild = await this.getUserGuild(interaction.user.id, interaction.guild.id);
        if (!guild) {
            return interaction.reply({ content: '❌ Kamu tidak berada di guild!', ephemeral: true });
        }
        
        const guildData = await this.getGuild(guild, interaction.guild.id);
        if (!guildData) {
            return interaction.reply({ content: '❌ Guild tidak ditemukan!', ephemeral: true });
        }
        
        if (guildData.ownerId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Hanya owner yang bisa membubarkan guild!', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Remove all members
            const key = `${interaction.guild.id}-${guild}`;
            this.guilds.delete(key);
            
            for (const memberId of guildData.members) {
                const memberKey = `${interaction.guild.id}-${memberId}`;
                this.members.delete(memberKey);
            }
            
            await this.saveGuilds();
            await this.saveMembers();
            
            await interaction.editReply({ 
                content: `✅ Guild **${guildData.name}** telah dibubarkan!` 
            });
            
        } catch (error) {
            console.error('Guild disband error:', error);
            await interaction.editReply({ content: '❌ Error disbanding guild!' });
        }
    }

    async handleProfile(interaction) {
        const guildId = interaction.options.getString('guild_id');
        
        let guildData;
        if (guildId) {
            guildData = await this.getGuild(guildId, interaction.guild.id);
            if (!guildData) {
                return interaction.reply({ content: '❌ Guild tidak ditemukan!', ephemeral: true });
            }
        } else {
            const userGuild = await this.getUserGuild(interaction.user.id, interaction.guild.id);
            if (!userGuild) {
                return interaction.reply({ content: '❌ Kamu tidak berada di guild!', ephemeral: true });
            }
            guildData = await this.getGuild(userGuild, interaction.guild.id);
        }
        
        // Get member count
        const memberCount = guildData.members.length;
        
        // Get online members
        let onlineCount = 0;
        for (const memberId of guildData.members) {
            const member = await interaction.guild.members.fetch(memberId).catch(() => null);
            if (member?.presence?.status === 'online') onlineCount++;
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle(`🏰 **${guildData.name}**`)
            .setDescription(guildData.description)
            .addFields(
                { name: '👑 Owner', value: `<@${guildData.ownerId}>`, inline: true },
                { name: '📊 Level', value: `${guildData.level} (${guildData.xp}/${guildData.xpNeeded} XP)`, inline: true },
                { name: '💰 Bank', value: `${guildData.bank.toLocaleString()} coins`, inline: true },
                { name: '👥 Members', value: `${memberCount} (${onlineCount} online)`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guildData.createdAt/1000)}:R>`, inline: true }
            )
            .setTimestamp();
        
        // Add perks if any
        if (guildData.perks.length > 0) {
            embed.addFields({ 
                name: '✨ Perks', 
                value: guildData.perks.map(p => `• ${p}`).join('\n'), 
                inline: false 
            });
        }
        
        // Add raid status if active
        if (guildData.raidBoss) {
            const boss = guildData.raidBoss;
            const hpPercent = (boss.hp / boss.maxHp) * 100;
            const bar = '█'.repeat(Math.floor(hpPercent / 10)) + '░'.repeat(10 - Math.floor(hpPercent / 10));
            
            embed.addFields({
                name: '⚔️ **ACTIVE RAID!**',
                value: `**${boss.name}** (Level ${boss.level})\nHP: \`${bar}\` ${boss.hp}/${boss.maxHp}\nDamage Dealt: ${guildData.totalDamage}`,
                inline: false
            });
        }
        
        // Add member list (top 5)
        const memberList = await Promise.all(
            guildData.members.slice(0, 5).map(async id => {
                const member = await interaction.guild.members.fetch(id).catch(() => null);
                return member ? `• ${member.user.username}` : null;
            })
        );
        
        embed.addFields({
            name: '👥 Members',
            value: memberList.filter(Boolean).join('\n') + (memberCount > 5 ? `\n...and ${memberCount - 5} others` : ''),
            inline: false
        });
        
        await interaction.reply({ embeds: [embed] });
    }

    async handleDeposit(interaction) {
        const amount = interaction.options.getInteger('amount');
        const guild = await this.getUserGuild(interaction.user.id, interaction.guild.id);
        
        if (!guild) {
            return interaction.reply({ content: '❌ Kamu tidak berada di guild!', ephemeral: true });
        }
        
        const guildData = await this.getGuild(guild, interaction.guild.id);
        if (!guildData) {
            return interaction.reply({ content: '❌ Guild tidak ditemukan!', ephemeral: true });
        }
        
        // Get economy plugin
        const economyPlugin = interaction.client.economySystem;
        if (!economyPlugin) {
            return interaction.reply({ content: '❌ Economy system tidak tersedia!', ephemeral: true });
        }
        
        const userBalance = await economyPlugin.getUser(interaction.user.id, interaction.guild.id);
        if (userBalance.balance < amount) {
            return interaction.reply({ content: '❌ Uang kamu tidak cukup!', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Deduct coins
            await economyPlugin.addBalance(interaction.user.id, interaction.guild.id, -amount);
            
            // Add to guild bank
            guildData.bank += amount;
            
            // Add contribution
            const memberKey = `${interaction.guild.id}-${interaction.user.id}`;
            const member = this.members.get(memberKey);
            if (member) {
                member.contributions += amount;
            }
            
            await this.saveGuilds();
            await this.saveMembers();
            
            await interaction.editReply({ 
                content: `✅ **${amount.toLocaleString()}** coins ditambahkan ke guild bank!` 
            });
            
        } catch (error) {
            console.error('Guild deposit error:', error);
            await interaction.editReply({ content: '❌ Error depositing coins!' });
        }
    }

    async handleRaid(interaction) {
        const guild = await this.getUserGuild(interaction.user.id, interaction.guild.id);
        if (!guild) {
            return interaction.reply({ content: '❌ Kamu harus berada di guild untuk raid!', ephemeral: true });
        }
        
        const guildData = await this.getGuild(guild, interaction.guild.id);
        if (!guildData) {
            return interaction.reply({ content: '❌ Guild tidak ditemukan!', ephemeral: true });
        }
        
        // Check if raid already active
        if (guildData.raidBoss) {
            return interaction.reply({ content: '❌ Raid sudah aktif!', ephemeral: true });
        }
        
        await interaction.deferReply();
        
        try {
            // Calculate boss level based on guild level
            const bossLevel = Math.min(Math.floor(guildData.level / 5) * 10 + 10, 50);
            const boss = this.getRaidBoss(bossLevel);
            
            guildData.raidBoss = {
                ...boss,
                hp: boss.hp,
                maxHp: boss.hp
            };
            guildData.raidStartTime = Date.now();
            guildData.totalDamage = 0;
            
            await this.saveGuilds();
            
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚔️ **RAID BOSS APPEARED!**')
                .setDescription(`
**${boss.name}** (Level ${boss.level})
Dari **${boss.series}**

HP: ${boss.hp.toLocaleString()}
ATK: ${boss.atk}
DEF: ${boss.def}

💰 **Reward:** ${boss.reward.toLocaleString()} coins
                `)
                .setThumbnail(boss.image)
                .addFields(
                    { name: '📊 Guild', value: guildData.name, inline: true },
                    { name: '⏰ Time', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
                )
                .setFooter({ text: 'Gunakan /guild attack untuk menyerang!' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Guild raid error:', error);
            await interaction.editReply({ content: '❌ Error starting raid!' });
        }
    }

    async handleAttack(interaction) {
        const guild = await this.getUserGuild(interaction.user.id, interaction.guild.id);
        if (!guild) {
            return interaction.reply({ content: '❌ Kamu tidak berada di guild!', ephemeral: true });
        }
        
        const guildData = await this.getGuild(guild, interaction.guild.id);
        if (!guildData) {
            return interaction.reply({ content: '❌ Guild tidak ditemukan!', ephemeral: true });
        }
        
        if (!guildData.raidBoss) {
            return interaction.reply({ content: '❌ Tidak ada raid aktif!', ephemeral: true });
        }
        
        await interaction.deferReply();
        
        try {
            const boss = guildData.raidBoss;
            
            // Calculate damage
            const baseDamage = Math.floor(Math.random() * 500) + 300;
            const damage = Math.max(baseDamage - Math.floor(boss.def / 2), 50);
            
            // Reduce boss HP
            boss.hp -= damage;
            guildData.totalDamage += damage;
            
            // Add contribution
            const memberKey = `${interaction.guild.id}-${interaction.user.id}`;
            const member = this.members.get(memberKey);
            if (member) {
                member.damage = (member.damage || 0) + damage;
            }
            
            let embed;
            
            if (boss.hp <= 0) {
                // Raid defeated
                boss.hp = 0;
                
                // Calculate rewards
                const baseReward = boss.reward;
                const guildReward = Math.floor(baseReward * 0.7);
                const memberReward = Math.floor(baseReward * 0.3 / guildData.members.length);
                
                // Add to guild bank
                guildData.bank += guildReward;
                
                // Add guild XP
                guildData.xp += boss.level * 100;
                
                // Level up
                while (guildData.xp >= guildData.xpNeeded) {
                    guildData.level++;
                    guildData.xp -= guildData.xpNeeded;
                    guildData.xpNeeded = Math.floor(guildData.xpNeeded * 1.5);
                    
                    // Add perk at certain levels
                    if (guildData.level === 5) guildData.perks.push('+5% EXP');
                    if (guildData.level === 10) guildData.perks.push('+10% Coins');
                    if (guildData.level === 15) guildData.perks.push('Guild Chat');
                    if (guildData.level === 20) guildData.perks.push('Custom Role Color');
                }
                
                // Get economy plugin for member rewards
                const economyPlugin = interaction.client.economySystem;
                if (economyPlugin) {
                    for (const memberId of guildData.members) {
                        await economyPlugin.addBalance(memberId, interaction.guild.id, memberReward);
                    }
                }
                
                // Clear raid
                guildData.raidBoss = null;
                guildData.raidStartTime = null;
                guildData.totalDamage = 0;
                
                embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ **RAID DEFEATED!**')
                    .setDescription(`**${boss.name}** telah dikalahkan!`)
                    .addFields(
                        { name: '💰 Guild Reward', value: `${guildReward.toLocaleString()} coins`, inline: true },
                        { name: '👥 Member Reward', value: `${memberReward.toLocaleString()} coins each`, inline: true },
                        { name: '📊 Guild XP', value: `+${boss.level * 100} XP`, inline: true }
                    )
                    .setTimestamp();
            } else {
                // Raid continues
                const hpPercent = (boss.hp / boss.maxHp) * 100;
                const bar = '█'.repeat(Math.floor(hpPercent / 10)) + '░'.repeat(10 - Math.floor(hpPercent / 10));
                
                embed = new EmbedBuilder()
                    .setColor(0xFF6B6B)
                    .setTitle('⚔️ **ATTACK!**')
                    .setDescription(`**${interaction.user.username}** menyerang **${boss.name}**!`)
                    .addFields(
                        { name: '💥 Damage', value: `${damage}`, inline: true },
                        { name: '💀 Boss HP', value: `${boss.hp.toLocaleString()}/${boss.maxHp.toLocaleString()}`, inline: true },
                        { name: '📊 HP Bar', value: `\`${bar}\` ${hpPercent.toFixed(1)}%`, inline: false }
                    )
                    .setTimestamp();
            }
            
            await this.saveGuilds();
            await this.saveMembers();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Guild attack error:', error);
            await interaction.editReply({ content: '❌ Error attacking boss!' });
        }
    }

    async handleUpgrade(interaction) {
        const guild = await this.getUserGuild(interaction.user.id, interaction.guild.id);
        if (!guild) {
            return interaction.reply({ content: '❌ Kamu tidak berada di guild!', ephemeral: true });
        }
        
        const guildData = await this.getGuild(guild, interaction.guild.id);
        if (!guildData) {
            return interaction.reply({ content: '❌ Guild tidak ditemukan!', ephemeral: true });
        }
        
        if (guildData.ownerId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Hanya owner yang bisa upgrade guild!', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const cost = guildData.level * 5000;
            
            if (guildData.bank < cost) {
                return interaction.editReply({ 
                    content: `❌ Guild bank tidak cukup! Butuh ${cost.toLocaleString()} coins` 
                });
            }
            
            guildData.bank -= cost;
            guildData.xp = guildData.xpNeeded;
            
            // Level up
            guildData.level++;
            guildData.xp -= guildData.xpNeeded;
            guildData.xpNeeded = Math.floor(guildData.xpNeeded * 1.5);
            
            // Add perk at certain levels
            if (guildData.level === 5) guildData.perks.push('+5% EXP');
            if (guildData.level === 10) guildData.perks.push('+10% Coins');
            if (guildData.level === 15) guildData.perks.push('Guild Chat');
            if (guildData.level === 20) guildData.perks.push('Custom Role Color');
            if (guildData.level === 25) guildData.perks.push('Custom Voice Channel');
            if (guildData.level === 30) guildData.perks.push('+15% Capture Rate');
            
            await this.saveGuilds();
            
            await interaction.editReply({ 
                content: `✅ Guild **${guildData.name}** naik ke level **${guildData.level}**!` 
            });
            
        } catch (error) {
            console.error('Guild upgrade error:', error);
            await interaction.editReply({ content: '❌ Error upgrading guild!' });
        }
    }

    async handleList(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const guildList = Array.from(this.guilds.values())
                .filter(g => g.guildServerId === interaction.guild.id)
                .sort((a, b) => b.level - a.level)
                .slice(0, 10);
            
            if (guildList.length === 0) {
                return interaction.editReply({ content: '📭 Belum ada guild di server ini!' });
            }
            
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🏰 **GUILD LEADERBOARD**')
                .setDescription(`Top 10 Guilds in ${interaction.guild.name}`)
                .setTimestamp();
            
            for (let i = 0; i < guildList.length; i++) {
                const guild = guildList[i];
                embed.addFields({
                    name: `${i + 1}. ${guild.name}`,
                    value: `👑 Owner: <@${guild.ownerId}>\n📊 Level: ${guild.level} | 👥 Members: ${guild.members.length} | 💰 Bank: ${guild.bank.toLocaleString()}`,
                    inline: false
                });
            }
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Guild list error:', error);
            await interaction.editReply({ content: '❌ Error fetching guilds!' });
        }
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('guild')
                .setDescription('🏰 Anime Guild System')
                .addSubcommand(sub =>
                    sub.setName('create')
                        .setDescription('Buat guild baru (10,000 coins)')
                        .addStringOption(opt =>
                            opt.setName('name')
                                .setDescription('Nama guild')
                                .setRequired(true)
                                .setMaxLength(30))
                        .addStringOption(opt =>
                            opt.setName('description')
                                .setDescription('Deskripsi guild')
                                .setRequired(false)
                                .setMaxLength(100)))
                .addSubcommand(sub =>
                    sub.setName('join')
                        .setDescription('Join ke guild')
                        .addStringOption(opt =>
                            opt.setName('guild_id')
                                .setDescription('ID guild')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('leave')
                        .setDescription('Keluar dari guild'))
                .addSubcommand(sub =>
                    sub.setName('disband')
                        .setDescription('[OWNER] Bubarkan guild'))
                .addSubcommand(sub =>
                    sub.setName('profile')
                        .setDescription('Lihat info guild')
                        .addStringOption(opt =>
                            opt.setName('guild_id')
                                .setDescription('ID guild (opsional)')
                                .setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('deposit')
                        .setDescription('Deposit coins ke guild bank')
                        .addIntegerOption(opt =>
                            opt.setName('amount')
                                .setDescription('Jumlah coins')
                                .setRequired(true)
                                .setMinValue(100)))
                .addSubcommand(sub =>
                    sub.setName('raid')
                        .setDescription('[OWNER] Mulai raid boss'))
                .addSubcommand(sub =>
                    sub.setName('attack')
                        .setDescription('Serang raid boss'))
                .addSubcommand(sub =>
                    sub.setName('upgrade')
                        .setDescription('[OWNER] Upgrade level guild'))
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('Lihat semua guild di server'))
        ];
    }

    static async handleCommand(interaction, system) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'create': await system.handleCreate(interaction); break;
            case 'join': await system.handleJoin(interaction); break;
            case 'leave': await system.handleLeave(interaction); break;
            case 'disband': await system.handleDisband(interaction); break;
            case 'profile': await system.handleProfile(interaction); break;
            case 'deposit': await system.handleDeposit(interaction); break;
            case 'raid': await system.handleRaid(interaction); break;
            case 'attack': await system.handleAttack(interaction); break;
            case 'upgrade': await system.handleUpgrade(interaction); break;
            case 'list': await system.handleList(interaction); break;
        }
    }
}

module.exports = AnimeGuildSystem;
// main.js - SLASH COMMANDS HANDLER
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');

// ==================== SLASH COMMANDS DEFINITION ====================
const commands = [
    // 🎉 WELCOME SYSTEM
    new SlashCommandBuilder()
        .setName('setup_welcome')
        .setDescription('[ADMIN] Setup sistem welcome')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Channel untuk welcome message')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Pesan welcome (gunakan {user}, {server})')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('test_welcome')
        .setDescription('[ADMIN] Test welcome message'),
    
    // 📊 SERVER INFO
    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Informasi detail server'),
    
    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Informasi user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User yang ingin dicek')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('membercount')
        .setDescription('Statistik member server'),
    
    new SlashCommandBuilder()
        .setName('roles')
        .setDescription('List semua role server'),
    
    // 🛠️ UTILITIES
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Cek latency bot'),
    
    new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Dapatkan link invite bot'),
    
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Dapatkan avatar user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User yang ingin diambil avatar')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Dapatkan banner user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User yang ingin diambil banner')
                .setRequired(false)),
    
    // 🔧 MODERATION
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('[MOD] Hapus pesan')
        .addIntegerOption(option => 
            option.setName('jumlah')
                .setDescription('Jumlah pesan yang akan dihapus (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    
    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('[MOD] Set slowmode untuk channel')
        .addIntegerOption(option => 
            option.setName('detik')
                .setDescription('Slowmode dalam detik (0-21600)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)),
    
    // 📢 ANNOUNCEMENT
    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('[ADMIN] Buat pengumuman')
        .addStringOption(option => 
            option.setName('judul')
                .setDescription('Judul pengumuman')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('pesan')
                .setDescription('Isi pengumuman')
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Channel untuk pengumuman')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),
    
    // 🎮 FUN
    new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Buat polling')
        .addStringOption(option => 
            option.setName('pertanyaan')
                .setDescription('Pertanyaan polling')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('opsi')
                .setDescription('Opsi dipisahkan | (maks 5)')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('say')
        .setDescription('[ADMIN] Buat bot berkata sesuatu')
        .addStringOption(option => 
            option.setName('pesan')
                .setDescription('Apa yang akan bot katakan')
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Channel tujuan')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),
    
    // ❓ HELP
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Tampilkan semua commands')
        .addStringOption(option => 
            option.setName('kategori')
                .setDescription('Kategori yang ingin dilihat')
                .setRequired(false)
                .addChoices(
                    { name: 'Welcome System', value: 'welcome' },
                    { name: 'Server Info', value: 'info' },
                    { name: 'Utilities', value: 'utils' },
                    { name: 'Moderation', value: 'mod' },
                    { name: 'Announcements', value: 'announce' },
                    { name: 'Fun', value: 'fun' }
                )),
    
    // 📈 MONITORING (akan ditambahkan oleh monitor.js)
];

// ==================== COMMAND HANDLERS ====================

// Setup Welcome
async function handleSetupWelcome(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ 
            content: '❌ Kamu butuh permission Administrator!',
            ephemeral: true 
        });
    }
    
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message') || 
        '🎉 **Selamat datang {user} di {server}!**\n\nKami senang kamu bergabung!';
    
    const config = {
        welcomeChannel: channel.id,
        welcomeMessage: message,
        welcomeEmbed: true,
        welcomeColor: 0x1E90FF
    };
    
    try {
        const welcome = require('./welcome.js');
        await welcome.setupWelcomeSystem(interaction.guild.id, config, client);
        
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('✅ SISTEM WELCOME DIKONFIGURASI')
            .setDescription('Sistem welcome berhasil diatur!')
            .addFields(
                { name: '📝 Channel', value: `<#${channel.id}>`, inline: true },
                { name: '💬 Pesan', value: message.substring(0, 100) + '...', inline: true }
            )
            .setFooter({ text: 'Member baru akan mendapatkan pesan welcome!' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
    } catch (error) {
        console.error('Setup welcome error:', error);
        await interaction.reply({ 
            content: '❌ Error setup sistem welcome!',
            ephemeral: true 
        });
    }
}

// Test Welcome
async function handleTestWelcome(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ 
            content: '❌ Permission Administrator dibutuhkan!',
            ephemeral: true 
        });
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const welcome = require('./welcome.js');
        await welcome.sendWelcomeMessage(interaction.member, client);
        
        await interaction.editReply({ 
            content: '✅ Test welcome message dikirim! Cek channel welcome.' 
        });
    } catch (error) {
        console.error('Test welcome error:', error);
        await interaction.editReply({ 
            content: '❌ Error mengirim test welcome!' 
        });
    }
}

// Server Info
async function handleServerInfo(interaction) {
    const guild = interaction.guild;
    
    // Ambil data member
    await guild.members.fetch();
    const members = guild.members.cache;
    const online = members.filter(m => m.presence?.status === 'online').size;
    const bots = members.filter(m => m.user.bot).size;
    const humans = guild.memberCount - bots;
    
    const embed = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle(`📊 ${guild.name.toUpperCase()}`)
        .setThumbnail(guild.iconURL({ size: 256 }))
        .addFields(
            { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true },
            { name: '📅 Dibuat', value: `<t:${Math.floor(guild.createdTimestamp/1000)}:R>`, inline: true },
            { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
            { name: '🤖 Bots', value: `${bots}`, inline: true },
            { name: '👤 Humans', value: `${humans}`, inline: true },
            { name: '🟢 Online', value: `${online}`, inline: true },
            { name: '📁 Channels', value: `${guild.channels.cache.size}`, inline: true },
            { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true }
        )
        .setFooter({ 
            text: `${guild.name} • Server Information`,
            iconURL: guild.iconURL()
        })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

// User Info
async function handleUserInfo(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    
    const embed = new EmbedBuilder()
        .setColor(member?.displayColor || 0x1E90FF)
        .setTitle(`👤 ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
            { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
            { name: '🤖 Bot', value: user.bot ? '✅ Yes' : '❌ No', inline: true },
            { name: '📅 Akun Dibuat', value: `<t:${Math.floor(user.createdTimestamp/1000)}:R>`, inline: true }
        );
    
    if (member) {
        embed.addFields(
            { name: '📅 Bergabung Server', value: `<t:${Math.floor(member.joinedTimestamp/1000)}:R>`, inline: true },
            { name: '🎭 Highest Role', value: member.roles.highest.toString(), inline: true },
            { name: '🎨 Warna Role', value: member.displayHexColor, inline: true }
        );
    }
    
    embed.setFooter({ 
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

// Member Count
async function handleMemberCount(interaction) {
    const guild = interaction.guild;
    await guild.members.fetch();
    
    const members = guild.members.cache;
    const online = members.filter(m => m.presence?.status === 'online').size;
    const idle = members.filter(m => m.presence?.status === 'idle').size;
    const dnd = members.filter(m => m.presence?.status === 'dnd').size;
    const offline = members.filter(m => !m.presence?.status).size;
    const bots = members.filter(m => m.user.bot).size;
    const humans = guild.memberCount - bots;
    
    const embed = new EmbedBuilder()
        .setColor(0x9370DB)
        .setTitle(`📈 ${guild.name.toUpperCase()} MEMBER STATS`)
        .setDescription(`**Total Members:** \`${guild.memberCount}\``)
        .addFields(
            { 
                name: '👥 MEMBER BREAKDOWN', 
                value: `👤 **Humans:** \`${humans}\`\n🤖 **Bots:** \`${bots}\``,
                inline: true 
            },
            { 
                name: '📊 ONLINE STATUS', 
                value: `🟢 **Online:** \`${online}\`\n🟡 **Idle:** \`${idle}\`\n🔴 **DND:** \`${dnd}\`\n⚫ **Offline:** \`${offline}\``,
                inline: true 
            }
        )
        .setFooter({ 
            text: `${guild.name} • Member Statistics`,
            iconURL: guild.iconURL()
        })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

// Roles
async function handleRoles(interaction) {
    const roles = interaction.guild.roles.cache
        .sort((a, b) => b.position - a.position)
        .filter(role => role.id !== interaction.guild.id);
    
    const roleList = roles.map(role => `${role.toString()} - \`${role.members.size} members\``)
        .join('\n')
        .substring(0, 1000) || 'No roles found';
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🎭 ${interaction.guild.name.toUpperCase()} ROLES`)
        .setDescription(`**Total Roles:** \`${roles.size}\``)
        .addFields({ name: '📋 ROLE LIST', value: roleList, inline: false })
        .setFooter({ 
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Ping
async function handlePing(interaction, client) {
    const sent = await interaction.reply({ 
        content: '🏓 Pinging...', 
        fetchReply: true,
        ephemeral: true 
    });
    
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);
    
    const embed = new EmbedBuilder()
        .setColor(latency < 200 ? 0x00FF00 : latency < 500 ? 0xFFFF00 : 0xFF0000)
        .setTitle('📶 BOT LATENCY')
        .addFields(
            { name: '🤖 Bot Latency', value: `\`${latency}ms\``, inline: true },
            { name: '🌐 API Latency', value: `\`${apiLatency}ms\``, inline: true },
            { name: '📊 Status', value: latency < 200 ? 'Excellent' : latency < 500 ? 'Good' : 'Slow', inline: true }
        )
        .setFooter({ text: 'Lower is better!' })
        .setTimestamp();
    
    await interaction.editReply({ content: null, embeds: [embed] });
}

// Avatar
async function handleAvatar(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    
    const embed = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle(`🖼️ ${user.tag}'s Avatar`)
        .setDescription(`[Download Avatar](${user.displayAvatarURL({ size: 4096 })})`)
        .setImage(user.displayAvatarURL({ size: 4096 }))
        .addFields(
            { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
            { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp/1000)}:R>`, inline: true }
        )
        .setFooter({ 
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

// Banner
async function handleBanner(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    
    try {
        const fetchedUser = await user.fetch();
        
        if (!fetchedUser.banner) {
            return interaction.reply({ 
                content: '❌ User ini tidak memiliki banner.',
                ephemeral: true 
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle(`🎨 ${user.tag}'s Banner`)
            .setDescription(`[Download Banner](${fetchedUser.bannerURL({ size: 4096 })})`)
            .setImage(fetchedUser.bannerURL({ size: 4096 }))
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Banner error:', error);
        await interaction.reply({ 
            content: '❌ Tidak bisa mengambil banner user.',
            ephemeral: true 
        });
    }
}

// Clear Messages
async function handleClear(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ 
            content: '❌ Permission Manage Messages dibutuhkan!',
            ephemeral: true 
        });
    }
    
    const amount = interaction.options.getInteger('jumlah');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const deleted = await interaction.channel.bulkDelete(amount, true);
        await interaction.editReply({ 
            content: `✅ Berhasil menghapus ${deleted.size} pesan!` 
        });
    } catch (error) {
        console.error('Clear error:', error);
        await interaction.editReply({ 
            content: '❌ Error menghapus pesan!' 
        });
    }
}

// Slowmode
async function handleSlowmode(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ 
            content: '❌ Permission Manage Channels dibutuhkan!',
            ephemeral: true 
        });
    }
    
    const seconds = interaction.options.getInteger('detik');
    
    try {
        await interaction.channel.setRateLimitPerUser(seconds);
        await interaction.reply({ 
            content: `✅ Slowmode diatur ke ${seconds} detik!`,
            ephemeral: true 
        });
    } catch (error) {
        console.error('Slowmode error:', error);
        await interaction.reply({ 
            content: '❌ Error mengatur slowmode!',
            ephemeral: true 
        });
    }
}

// Announce
async function handleAnnounce(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ 
            content: '❌ Permission Administrator dibutuhkan!',
            ephemeral: true 
        });
    }
    
    const title = interaction.options.getString('judul');
    const message = interaction.options.getString('pesan');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`📢 **${title.toUpperCase()}**`)
        .setDescription(message)
        .addFields(
            { name: '📅 Tanggal', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
            { name: '👤 Oleh', value: interaction.user.tag, inline: true }
        )
        .setFooter({ 
            text: `${interaction.guild.name} • Official Announcement`,
            iconURL: interaction.guild.iconURL()
        })
        .setTimestamp();
    
    try {
        await channel.send({ 
            content: '@everyone **PENGUMUMAN BARU!**', 
            embeds: [embed] 
        });
        
        await interaction.reply({ 
            content: `✅ Pengumuman dikirim ke <#${channel.id}>!`,
            ephemeral: true 
        });
    } catch (error) {
        console.error('Announce error:', error);
        await interaction.reply({ 
            content: '❌ Error mengirim pengumuman!',
            ephemeral: true 
        });
    }
}

// Poll
async function handlePoll(interaction) {
    const question = interaction.options.getString('pertanyaan');
    const optionsString = interaction.options.getString('opsi');
    
    let options = ['✅ Yes', '❌ No'];
    
    if (optionsString) {
        options = optionsString.split('|')
            .map(opt => opt.trim())
            .filter(opt => opt.length > 0)
            .slice(0, 5);
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 **POLL**')
        .setDescription(`**${question}**`)
        .addFields(
            options.map((opt, index) => ({
                name: `Option ${index + 1}`,
                value: opt,
                inline: true
            }))
        )
        .setFooter({ 
            text: `Poll dibuat oleh ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();
    
    const reply = await interaction.reply({ 
        embeds: [embed], 
        fetchReply: true 
    });
    
    // Add reactions
    const reactions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    for (let i = 0; i < options.length; i++) {
        try {
            await reply.react(reactions[i]);
        } catch (error) {
            console.error('Reaction error:', error);
        }
    }
}

// Say
async function handleSay(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ 
            content: '❌ Permission Administrator dibutuhkan!',
            ephemeral: true 
        });
    }
    
    const message = interaction.options.getString('pesan');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    
    try {
        await channel.send(message);
        await interaction.reply({ 
            content: `✅ Pesan dikirim ke <#${channel.id}>!`,
            ephemeral: true 
        });
    } catch (error) {
        console.error('Say error:', error);
        await interaction.reply({ 
            content: '❌ Error mengirim pesan!',
            ephemeral: true 
        });
    }
}

// Help
async function handleHelp(interaction) {
    const category = interaction.options.getString('kategori');
    
    const categories = {
        welcome: {
            title: '🎉 **WELCOME SYSTEM**',
            description: 'Commands untuk setup dan manage sistem welcome',
            color: 0x1E90FF,
            commands: [
                { name: '/setup_welcome', description: 'Setup sistem welcome (Admin only)' },
                { name: '/test_welcome', description: 'Test welcome message (Admin only)' }
            ]
        },
        info: {
            title: '📊 **SERVER INFORMATION**',
            description: 'Commands untuk mendapatkan informasi server dan user',
            color: 0x9370DB,
            commands: [
                { name: '/serverinfo', description: 'Informasi detail server' },
                { name: '/userinfo', description: 'Informasi user' },
                { name: '/membercount', description: 'Statistik member' },
                { name: '/roles', description: 'List semua role' }
            ]
        },
        utils: {
            title: '🛠️ **UTILITIES**',
            description: 'Commands utility yang berguna',
            color: 0x00FF00,
            commands: [
                { name: '/ping', description: 'Cek latency bot' },
                { name: '/invite', description: 'Dapatkan link invite bot' },
                { name: '/avatar', description: 'Dapatkan avatar user' },
                { name: '/banner', description: 'Dapatkan banner user' }
            ]
        },
        mod: {
            title: '🔧 **MODERATION**',
            description: 'Commands moderation (butuh permissions)',
            color: 0xFF0000,
            commands: [
                { name: '/clear', description: 'Hapus pesan (Manage Messages)' },
                { name: '/slowmode', description: 'Set slowmode (Manage Channels)' }
            ]
        },
        announce: {
            title: '📢 **ANNOUNCEMENTS**',
            description: 'Commands pengumuman (Admin only)',
            color: 0xFFD700,
            commands: [
                { name: '/announce', description: 'Buat pengumuman' },
                { name: '/say', description: 'Buat bot berkata sesuatu' }
            ]
        },
        fun: {
            title: '🎮 **FUN COMMANDS**',
            description: 'Commands fun dan interaktif',
            color: 0xFF6B6B,
            commands: [
                { name: '/poll', description: 'Buat polling' }
            ]
        }
    };
    
    if (category && categories[category]) {
        const cat = categories[category];
        const embed = new EmbedBuilder()
            .setColor(cat.color)
            .setTitle(cat.title)
            .setDescription(cat.description)
            .addFields(
                cat.commands.map(cmd => ({
                    name: `**${cmd.name}**`,
                    value: cmd.description,
                    inline: false
                }))
            )
            .setFooter({ text: 'Gunakan /help tanpa kategori untuk melihat semua' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        // Show all categories
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('❓ **BOT HELP - ALL COMMANDS**')
            .setDescription(`**Total Commands:** \`${commands.length}\`\nGunakan \`/help [kategori]\` untuk kategori spesifik\n\n**Kategori:**`)
            .addFields(
                { name: '🎉 Welcome System', value: '`/help welcome`', inline: true },
                { name: '📊 Server Info', value: '`/help info`', inline: true },
                { name: '🛠️ Utilities', value: '`/help utils`', inline: true },
                { name: '🔧 Moderation', value: '`/help mod`', inline: true },
                { name: '📢 Announcements', value: '`/help announce`', inline: true },
                { name: '🎮 Fun Commands', value: '`/help fun`', inline: true }
            )
            .setFooter({ 
                text: `${interaction.client.user.username} • Version 2.0`,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

// Invite
async function handleInvite(interaction) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🔗 **INVITE BOT**')
        .setDescription('Undang bot ini ke server Anda!')
        .addFields(
            { 
                name: '📥 Invite Link', 
                value: '`https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot+applications.commands&permissions=8`', 
                inline: false 
            },
            { 
                name: '🔧 Required Permissions', 
                value: '• Manage Messages\n• Manage Channels\n• View Channels\n• Send Messages\n• Embed Links\n• Attach Files\n• Read Message History\n• Add Reactions', 
                inline: false 
            }
        )
        .setFooter({ 
            text: 'Ganti YOUR_CLIENT_ID dengan Client ID bot Anda',
            iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ==================== MAIN INTERACTION HANDLER ====================
async function handleInteraction(interaction, client) {
    if (!interaction.isCommand()) return;
    
    const { commandName } = interaction;
    
    try {
        switch (commandName) {
            // 🎉 Welcome System
            case 'setup_welcome': await handleSetupWelcome(interaction, client); break;
            case 'test_welcome': await handleTestWelcome(interaction, client); break;
            
            // 📊 Server Info
            case 'serverinfo': await handleServerInfo(interaction); break;
            case 'userinfo': await handleUserInfo(interaction); break;
            case 'membercount': await handleMemberCount(interaction); break;
            case 'roles': await handleRoles(interaction); break;
            
            // 🛠️ Utilities
            case 'ping': await handlePing(interaction, client); break;
            case 'invite': await handleInvite(interaction); break;
            case 'avatar': await handleAvatar(interaction); break;
            case 'banner': await handleBanner(interaction); break;
            
            // 🔧 Moderation
            case 'clear': await handleClear(interaction); break;
            case 'slowmode': await handleSlowmode(interaction); break;
            
            // 📢 Announcements & Fun
            case 'announce': await handleAnnounce(interaction); break;
            case 'poll': await handlePoll(interaction); break;
            case 'say': await handleSay(interaction); break;
            
            // ❓ Help
            case 'help': await handleHelp(interaction); break;
            
            default: 
                await interaction.reply({ 
                    content: '❌ Command belum diimplementasikan!',
                    ephemeral: true 
                });
        }
    } catch (error) {
        console.error(`Error handling command ${commandName}:`, error);
        
        const errorMessage = error.message.length > 100 ? 
            error.message.substring(0, 100) + '...' : 
            error.message;
            
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: `❌ Error: ${errorMessage}`,
                ephemeral: true 
            });
        } else if (interaction.deferred) {
            await interaction.editReply({ 
                content: `❌ Error: ${errorMessage}`
            });
        }
    }
}

// ==================== EXPORTS ====================
module.exports = {
    commands,
    handleInteraction
};
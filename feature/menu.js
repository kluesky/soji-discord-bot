// menu.js - BOT FEATURE MENU DENGAN DROPDOWN (FIXED!)
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags // 🔥 FIX: Pake flags, bukan ephemeral!
} = require('discord.js');

class BotMenu {
    constructor(client) {
        this.client = client;
        this.name = 'bot-menu';
        this.version = '1.0.1'; // UPDATED!
    }

    // ==================== MAIN MENU EMBED ====================
    createMainMenuEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('🎯 **Lyora Community Menu**')
            .setDescription(`
Hai! **${this.client.user?.username || 'Lyora'}** siap membantu! ✨
Pilih kategori di bawah untuk melihat commands.

**📊 STATISTIK BOT:**
• 🏰 **Server:** ${this.client.guilds?.cache?.size || 0} server
• 👥 **Users:** ${this.client.users?.cache?.size || 0} users
• ⏰ **Uptime:** <t:${Math.floor(Date.now()/1000)}:R>
• 🛡️ **Status:** Online

Gunakan dropdown **📌 PILIH KATEGORI** untuk mulai!
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Pilih menu di bawah!',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== KATEGORI MENU ====================
    createCategorySelect() {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu_category')
            .setPlaceholder('📌 PILIH KATEGORI FITUR')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛡️ Security')
                    .setDescription('Anti Nuke, Whitelist, Backup, Logs')
                    .setValue('security')
                    .setEmoji('🛡️'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎮 Games')
                    .setDescription('RPG, Anime Battle, Guild, Tournament')
                    .setValue('games')
                    .setEmoji('🎮'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Economy')
                    .setDescription('Balance, Shop, Work, Daily, Leaderboard')
                    .setValue('economy')
                    .setEmoji('💰'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎫 Ticket')
                    .setDescription('Support System, Auto-tag, Transcript')
                    .setValue('ticket')
                    .setEmoji('🎫'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Monitoring')
                    .setDescription('Server Stats, Bot Stats, Command List')
                    .setValue('monitor')
                    .setEmoji('📊'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎪 Event')
                    .setDescription('Festival, Giveaway, Theater')
                    .setValue('event')
                    .setEmoji('🎪'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔧 Utility')
                    .setDescription('Template, Translator, Voice Creator')
                    .setValue('utility')
                    .setEmoji('🔧'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🚫 AutoMod')
                    .setDescription('Filter, Warning, Mute, Logs')
                    .setValue('automod')
                    .setEmoji('🚫')
            );

        return new ActionRowBuilder().addComponents(selectMenu);
    }

    // ==================== BUTTON NAVIGASI ====================
    createNavigationButtons() {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('menu_home')
                    .setLabel('🏠 Home')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('menu_commands')
                    .setLabel('📋 All Commands')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('menu_stats')
                    .setLabel('📊 Bot Stats')
                    .setStyle(ButtonStyle.Success)
            );

        return row;
    }

    // ==================== BUTTON LINK ====================
    // 🔥 FIX: Pisahkan button link dari button custom!
    createLinkButtons() {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('🔗 Invite Bot')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/oauth2/authorize?client_id=${this.client?.user?.id || '1470527774937841664'}&scope=bot+applications.commands&permissions=8`),
                new ButtonBuilder()
                    .setLabel('❓ Support Server')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/8Td3GKVsZk') // Ganti dengan invite server support
            );

        return row;
    }

    // ==================== FITUR SECURITY ====================
    createSecurityEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🛡️ **SECURITY & ANTI NUKE**')
            .setDescription(`
**Proteksi 15+ lapisan untuk server kamu!**

\`/antinuke enable\` - Aktifkan proteksi
\`/antinuke config\` - Lihat konfigurasi
\`/antinuke log #channel\` - Set log channel
\`/antinuke stats\` - Statistik keamanan

**👑 WHITELIST SYSTEM:**
\`/antinuke-whitelist add @user\` - Whitelist user
\`/antinuke-whitelist remove @user\` - Hapus whitelist
\`/antinuke-whitelist list\` - Lihat whitelist

**🛡️ PROTECT ITEMS:**
\`/antinuke-protect channel #channel\` - Proteksi channel
\`/antinuke-protect role @role\` - Proteksi role

**🔄 AUTO RESTORE:**
\`/antinuke-restore channel <id>\` - Restore channel
\`/antinuke-restore role <id>\` - Restore role
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Security System',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== FITUR GAMES ====================
    createGamesEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🎮 **GAMES & ENTERTAINMENT**')
            .setDescription(`
**🎴 SAKURA CARD CAPTURE:**
\`/anime wild\` - Cari karakter liar
\`/anime capture\` - Tangkap karakter
\`/anime collection\` - Lihat koleksi
\`/anime battle @user\` - Duel dengan user lain

**🏰 GUILD SYSTEM:**
\`/guild create\` - Buat guild (10k coins)
\`/guild raid\` - Mulai raid boss
\`/guild attack\` - Serang boss
\`/guild profile\` - Lihat info guild

**🎪 FESTIVAL EVENT:**
\`/festival status\` - Cek event aktif
\`/festival play\` - Main game festival
\`/festival shop\` - Tukar ticket

**🎬 VOICE THEATER:**
\`/theater create\` - Buat room nonton
\`/theater suggest\` - Request anime
\`/theater snack\` - Beli snack

**🏆 TOURNAMENT:**
\`/tournament create\` - Buat turnamen
\`/tournament join\` - Daftar turnamen
\`/tournament bracket\` - Lihat bracket
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Games System',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== FITUR RPG ====================
    createRPGEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('⚔️ **IDLE RPG GAME**')
            .setDescription(`
**Mulai petualangan RPG-mu sekarang!**

\`/rpg start\` - Lihat status karakter
\`/rpg adventure\` - Jelajahi dungeon
\`/rpg inventory\` - Lihat item
\`/rpg shop\` - Beli item
\`/rpg buy <item_id>\` - Transaksi
\`/rpg leaderboard\` - Top pemain
\`/rpg profile @user\` - Profil lengkap

**🏆 CLASSES:**
• ⚔️ Warrior - HP tinggi, defense kuat
• 🔮 Mage - Magic damage, MP besar
• 🏹 Archer - Critical, speed tinggi
• 🗡️ Assassin - Attack cepat, evasion

**🗺️ DUNGEONS:**
• 🌲 Forest of Beginnings (Lv.1)
• ⛰️ Rocky Mountains (Lv.5)
• 🔥 Volcanic Cave (Lv.10)
• ❄️ Frozen Tundra (Lv.15)
• 💀 Dark Dungeon (Lv.20)
• 🐉 Dragon's Lair (Lv.30)
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • RPG System',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== FITUR ECONOMY ====================
    createEconomyEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('💰 **ECONOMY SYSTEM**')
            .setDescription(`
**Kaya raya di Lyora Community!**

\`/economy balance\` - Cek uang
\`/economy daily\` - Daily reward
\`/economy weekly\` - Weekly reward
\`/economy monthly\` - Monthly reward
\`/economy work\` - Bekerja
\`/economy deposit\` - Simpan ke bank
\`/economy withdraw\` - Ambil dari bank
\`/economy transfer @user\` - Transfer uang

**🛒 SHOP & ITEMS:**
\`/economy shop\` - Lihat item
\`/economy buy <id>\` - Beli item
\`/economy inventory\` - Inventory

**📊 LEADERBOARD:**
\`/economy leaderboard\` - Top 10 terkaya
\`/economy leaderboard type:level\` - Top level

**🎰 GAMES:**
\`/economy slot <bet>\` - Slot machine
\`/economy dice <bet> <guess>\` - Dadu
\`/economy race <bet> <participant>\` - Balapan
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Economy System',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== FITUR TICKET ====================
    createTicketEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🎫 **TICKET SUPPORT SYSTEM**')
            .setDescription(`
**Butuh bantuan? Buat ticket sekarang!**

**🔧 SETUP (Admin):**
\`/ticket setup\` - Setup sistem ticket
\`/ticket panel\` - Buat panel ticket

**👤 USER COMMANDS:**
\`/ticket\` - Buat ticket baru
\`/ticket close\` - Tutup ticket
\`/ticket transcript\` - Ambil transcript

**✨ FITUR:**
• Auto tag role support
• Modal form detail masalah
• Claim system untuk staff
• Transcript lengkap
• Log channel
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Ticket System',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== FITUR MONITORING ====================
    createMonitoringEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('📊 **MONITORING SYSTEM**')
            .setDescription(`
**Pantau server secara real-time!**

\`/setup_monitor\` - Aktifkan monitoring
\`/disable_monitor\` - Nonaktifkan
\`/server_stats\` - Statistik server
\`/monitor_style\` - Custom tampilan

**📋 COMMAND MONITOR:**
\`/botstats\` - Statistik bot realtime
\`/commandlist\` - List semua command
\`/commandlist category:anime\` - Filter kategori

**✨ FITUR:**
• Update setiap 30 detik
• Progress bar keren
• Interactive buttons
• Alert system
• Hourly activity chart
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Monitoring System',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== FITUR EVENT ====================
    createEventEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0xE91E63)
            .setTitle('🎪 **EVENT & GIVEAWAY**')
            .setDescription(`
**Event seru setiap minggu!**

**🎁 GIVEAWAY:**
\`/giveaway start\` - Mulai giveaway
\`/giveaway end\` - Akhiri giveaway
\`/giveaway reroll\` - Pilih pemenang baru
\`/giveaway list\` - Giveaway aktif

**🎪 FESTIVAL EVENT:**
\`/festival status\` - Cek event
\`/festival play\` - Main game
\`/festival shop\` - Tukar ticket
\`/festival leaderboard\` - Top pemain

**✨ EVENT MUSIMAN:**
🌸 Spring - Sakura Festival
🎆 Summer - Fireworks Festival
🌕 Autumn - Moon Viewing
🎍 Winter - New Year Festival
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Event System',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== FITUR UTILITY ====================
    createUtilityEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0x95A5A6)
            .setTitle('🔧 **UTILITY & TOOLS**')
            .setDescription(`
**Tools berguna untuk server!**

**📋 TEMPLATE SYSTEM:**
\`/template list\` - Browse templates
\`/template apply\` - Apply template
\`/template info\` - Detail template

**🌍 TRANSLATOR:**
\`/translate to\` - Terjemahkan teks
\`/translate detect\` - Deteksi bahasa
\`/translate auto\` - Auto-translate channel

**🔊 VOICE CREATOR:**
\`/voice setup\` - Setup join-to-create
\`/voice rename\` - Ganti nama channel
\`/voice limit\` - Set user limit
\`/voice claim\` - Claim channel

**🛠️ MAIN COMMANDS:**
\`/ping\` - Cek latency
\`/serverinfo\` - Info server
\`/userinfo\` - Info user
\`/avatar\` - Ambil avatar
\`/banner\` - Ambil banner
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Utility System',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== FITUR AUTOMOD ====================
    createAutoModEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0x34495E)
            .setTitle('🚫 **AUTOMODERATION**')
            .setDescription(`
**Jaga server tetap aman dan bersih!**

\`/automod setup\` - Setup AutoMod
\`/automod config\` - Lihat konfigurasi
\`/automod warnings @user\` - Cek warning

**⚠️ FILTERS:**
• Kata kasar otomatis terhapus
• Link scam terblokir
• Invite server lain terdeteksi
• Spam & mass mention protection

**⚖️ PUNISHMENT:**
• 3x warning → Mute 1 jam
• 5x warning → Mute 1 hari
• 7x warning → Ban otomatis

**📝 LOGS:**
• Semua aksi tercatat
• Channel log khusus
• Detail pelanggaran
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • AutoMod System',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== ALL COMMANDS EMBED ====================
    createAllCommandsEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('📋 **LYORA COMMUNITY - ALL COMMANDS**')
            .setDescription(`
**Total Commands:** 100+ commands siap pakai!

**🛡️ SECURITY (4)**
\`/antinuke\` • \`/antinuke-whitelist\` • \`/antinuke-protect\` • \`/antinuke-restore\`

**🎮 GAMES (20+)**
\`/anime\` • \`/guild\` • \`/festival\` • \`/theater\` • \`/tournament\` • \`/rpg\`

**💰 ECONOMY (16)**
\`/economy\` • \`/economy-admin\` • \`/buy\` • \`/shop\`

**🎫 TICKET (5)**
\`/ticket\`

**📊 MONITORING (6)**
\`/setup_monitor\` • \`/server_stats\` • \`/botstats\` • \`/commandlist\`

**🎪 GIVEAWAY (4)**
\`/giveaway\`

**🔧 UTILITY (15+)**
\`/template\` • \`/translate\` • \`/voice\` • \`/ping\` • \`/serverinfo\`

**🚫 AUTOMOD (6)**
\`/automod\`

Gunakan **/help [kategori]** untuk detail lebih lanjut!
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Total Commands: 100+',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== STATS EMBED ====================
    createStatsEmbed() {
        const totalCommands = 100;
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        const memoryUsage = process.memoryUsage();
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const totalMemoryMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('📊 **LYORA COMMUNITY - BOT STATISTICS**')
            .setDescription(`
**🤖 BOT INFORMATION:**
• Name: ${this.client.user?.tag || 'Lyora Community'}
• ID: \`${this.client.user?.id || '000000'}\`
• Created: <t:${Math.floor((this.client.user?.createdTimestamp || Date.now())/1000)}:R>

**📈 GLOBAL STATS:**
• Servers: **${this.client.guilds?.cache?.size || 0}**
• Users: **${this.client.users?.cache?.size || 0}**
• Commands: **${totalCommands}+**

**⚡ PERFORMANCE:**
• Uptime: **${days}d ${hours}h ${minutes}m**
• Ping: **${Math.round(this.client.ws?.ping || 0)}ms**
• Memory: **${memoryMB}MB / ${totalMemoryMB}MB**

**🛡️ SECURITY:**
• Anti Nuke: **✅ Active**
• Protection Layers: **15+**
• Whitelist: **Available**
            `)
            .setImage('https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyYzBjNnk4YXV5em5pNmM5ZWUxZWppN3FmNTlnMW44MGgxeHBrZjI2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hx48Na3LBp1Dy/giphy.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Last Updated',
                iconURL: this.client.user?.displayAvatarURL()
            });

        return embed;
    }

    // ==================== HANDLE INTERACTION ====================
    async handleInteraction(interaction) {
        if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

        try {
            // Handle SELECT MENU
            if (interaction.isStringSelectMenu() && interaction.customId === 'menu_category') {
                const category = interaction.values[0];
                
                let embed;
                switch (category) {
                    case 'security':
                        embed = this.createSecurityEmbed();
                        break;
                    case 'games':
                        embed = this.createGamesEmbed();
                        break;
                    case 'economy':
                        embed = this.createEconomyEmbed();
                        break;
                    case 'ticket':
                        embed = this.createTicketEmbed();
                        break;
                    case 'monitor':
                        embed = this.createMonitoringEmbed();
                        break;
                    case 'event':
                        embed = this.createEventEmbed();
                        break;
                    case 'utility':
                        embed = this.createUtilityEmbed();
                        break;
                    case 'automod':
                        embed = this.createAutoModEmbed();
                        break;
                    default:
                        embed = this.createMainMenuEmbed();
                }

                // 🔥 FIX: Pisahkan components jadi array
                const components = [
                    this.createCategorySelect(),
                    this.createNavigationButtons(),
                    this.createLinkButtons() // 🔥 Link buttons dipisah!
                ];

                await interaction.update({
                    embeds: [embed],
                    components: components
                });
            }

            // Handle BUTTON
            if (interaction.isButton()) {
                let embed;
                const components = [];

                switch (interaction.customId) {
                    case 'menu_home':
                        embed = this.createMainMenuEmbed();
                        components.push(
                            this.createCategorySelect(),
                            this.createNavigationButtons(),
                            this.createLinkButtons()
                        );
                        break;
                    case 'menu_commands':
                        embed = this.createAllCommandsEmbed();
                        components.push(
                            this.createCategorySelect(),
                            this.createNavigationButtons(),
                            this.createLinkButtons()
                        );
                        break;
                    case 'menu_stats':
                        embed = this.createStatsEmbed();
                        components.push(
                            this.createCategorySelect(),
                            this.createNavigationButtons(),
                            this.createLinkButtons()
                        );
                        break;
                    default:
                        return;
                }

                await interaction.update({
                    embeds: [embed],
                    components: components
                });
            }
        } catch (error) {
            console.error('Menu interaction error:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ Error loading menu. Please try again.',
                    flags: MessageFlags.Ephemeral // 🔥 FIX: Pake flags!
                }).catch(() => {});
            }
        }
    }

    // ==================== COMMAND HANDLER ====================
    async handleMenu(interaction) {
        const embed = this.createMainMenuEmbed();
        
        // 🔥 FIX: Pisahkan components
        const components = [
            this.createCategorySelect(),
            this.createNavigationButtons(),
            this.createLinkButtons()
        ];
        
        await interaction.reply({
            embeds: [embed],
            components: components,
            flags: MessageFlags.Ephemeral // 🔥 FIX: Pake flags!
        });
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('menu')
                .setDescription('📋 Tampilkan menu fitur bot Lyora Community')
        ];
    }

    static async handleCommand(interaction, menu) {
        await menu.handleMenu(interaction);
    }
}

module.exports = BotMenu;
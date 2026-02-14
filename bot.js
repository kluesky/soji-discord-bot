// bot.js - BOT UTAMA DENGAN FEATURE FOLDER (MODULAR)
const { Client, GatewayIntentBits, REST, Routes, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution,
        GatewayIntentBits.GuildWebhooks,        
        GatewayIntentBits.GuildIntegrations,    
        GatewayIntentBits.GuildEmojisAndStickers 
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember],
    allowedMentions: { parse: ['users', 'roles'], repliedUser: true }
});

// ⚠️ GANTI DENGAN TOKEN DAN CLIENT ID ANDA!
const BOT_TOKEN = 'TOKEN';
const CLIENT_ID = 'ID';

// Store data
client.welcomeConfig = new Map();
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

// ==================== FEATURE MANAGER ====================
class FeatureManager {
    constructor(client) {
        this.client = client;
        this.features = new Map();
        this.commands = [];
        this.featurePath = path.join(__dirname, 'features');
    }

    async loadFeatures() {
        console.log('\n📂 LOADING FEATURES FROM FOLDER...');
        console.log('='.repeat(50));

        // Buat folder features jika belum ada
        if (!fs.existsSync(this.featurePath)) {
            fs.mkdirSync(this.featurePath);
            console.log('📁 Folder features dibuat!');
        }

        // Daftar file fitur yang akan diload
        const featureFiles = [
            'ticket.js',
            'template.js',
            'monitoring.js',
            'economy.js',
            'automod.js',
            'giveaway.js',
            'voicecreator.js',
            'translator.js',
            'anime-battle.js',
            'anime-guild.js',
            'anime-festival.js',
            'anime-theater.js',
            'anime-tournament.js',
            'command-monitor.js',
            'rpg-game.js',
            'anti-nuke.js',
            'menu.js',
            'anime-reminder.js',
            'music.js',
            'afk-keeper.js',
            'chisato-ai.js'
        ];

        for (const file of featureFiles) {
            try {
                const featurePath = path.join(this.featurePath, file);
                
                // Cek apakah file ada
                if (!fs.existsSync(featurePath)) {
                    console.log(`⚠️  ${file} tidak ditemukan, skipping...`);
                    continue;
                }

                const featureName = file.replace('.js', '');
                const FeatureClass = require(featurePath);
                
                // Inisialisasi fitur
                const featureInstance = new FeatureClass(this.client);
                this.features.set(featureName, featureInstance);
                
                // Load commands dari fitur
                if (FeatureClass.getCommands) {
                    const featureCmds = FeatureClass.getCommands();
                    this.commands.push(...featureCmds);
                    console.log(`✅ Loaded ${featureCmds.length} commands from ${file}`);
                }

                // Panggil init jika ada
                if (featureInstance.init) {
                    await featureInstance.init();
                }

            } catch (error) {
                console.error(`❌ Failed to load ${file}:`, error.message);
            }
        }

        console.log('='.repeat(50));
        console.log(`📊 Total: ${this.features.size} features loaded`);
        console.log(`📋 Commands: ${this.commands.length}`);
        
        return this.commands;
    }

    getFeature(name) {
        return this.features.get(name);
    }

    async handleInteraction(interaction) {
        for (const [name, feature] of this.features) {
            if (feature.handleInteraction) {
                try {
                    await feature.handleInteraction(interaction);
                } catch (error) {
                    // Skip if not handled by this feature
                }
            }
        }
    }
}

// Initialize Feature Manager
const featureManager = new FeatureManager(client);
client.featureManager = featureManager;

// ==================== WHATSAPP BOT INTEGRATION ====================
let waBot = null;

try {
    const waBotPath = path.join(__dirname, 'botwa', 'index.js');
    if (fs.existsSync(waBotPath)) {
        const waBotModule = require('./botwa/index.js');
        if (typeof waBotModule === 'function') {
            waBot = waBotModule();
        } else {
            waBot = waBotModule;
        }
        console.log('\n' + '📱'.repeat(30));
        console.log('📱 WHATSAPP BOT INTEGRATION');
        console.log('✅ WhatsApp Bot loaded from ./botwa/');
        console.log('📱 WhatsApp Bot is running alongside Discord!');
        console.log('📱'.repeat(30) + '\n');
    }
} catch (error) {
    console.log('\n⚠️ WhatsApp Bot error:', error.message);
    console.log('📱 Discord only mode - WA bot not loaded\n');
}

// ==================== BOT READY ====================
client.once('ready', async () => {
    console.log('\n' + '='.repeat(50));
    console.log(`🎉 ${client.user.tag} IS ONLINE!`);
    console.log(`📊 Server: ${client.guilds.cache.size}`);
    console.log('='.repeat(50));
    
    try {
        // ===== LOAD MAIN COMMANDS =====
        console.log('\n📚 LOADING MAIN COMMANDS...');
        const mainModule = require('./main.js');
        const mainCommands = mainModule.commands;
        console.log(`✅ Loaded ${mainCommands.length} main commands`);

        // ===== LOAD FEATURES =====
        const featureCommands = await featureManager.loadFeatures();
        
        // ===== COMBINE ALL COMMANDS =====
        const allCommands = [...mainCommands, ...featureCommands];
        
        // ===== COMMAND SUMMARY =====
        console.log('\n' + '='.repeat(50));
        console.log(`📋 TOTAL COMMANDS: ${allCommands.length}`);
        console.log('='.repeat(50));
        
        // GLOBAL VARIABLE
        global.allCommands = allCommands;
        global.client = client;

        // ===== REGISTER COMMANDS =====
        console.log('\n🔄 REGISTERING COMMANDS...');
        
        try {
            await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: allCommands.map(cmd => cmd.toJSON()) }
            );
            console.log(`✅ Successfully registered ${allCommands.length} global commands!`);
        } catch (error) {
            console.error(`❌ Failed to register commands: ${error.message}`);
        }

        // ===== LOAD WELCOME CONFIG =====
        try {
            await require('./welcome.js').loadWelcomeConfig(client);
            console.log('✅ Welcome system loaded');
        } catch (error) {
            console.log(`⚠️ Welcome system error: ${error.message}`);
        }

        // ===== SET STATUS =====
        client.user.setPresence({
            activities: [{ 
                name: `${allCommands.length} commands | /menu | 📱 WA Bot`, 
                type: 3 
            }],
            status: 'online'
        });

        console.log('\n' + '='.repeat(50));
        console.log('🚀 BOT IS READY WITH FEATURE FOLDER!');
        console.log(`📂 Loaded ${featureManager.features.size} features`);
        if (waBot) {
            console.log('📱 WhatsApp Bot: ✅ RUNNING');
        } else {
            console.log('📱 WhatsApp Bot: ❌ NOT LOADED');
        }
        console.log('='.repeat(50) + '\n');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    }
});

// ==================== INTERACTION HANDLER ====================
client.on('interactionCreate', async (interaction) => {
    try {
        // Handle feature interactions
        await featureManager.handleInteraction(interaction);

        // Handle custom interactions
        if (interaction.isButton()) {
            // Ticket System
            const ticketSystem = featureManager.getFeature('ticket');
            if (ticketSystem && interaction.customId?.startsWith('ticket_')) {
                await ticketSystem.handleInteraction(interaction);
                return;
            }
            
            // Template System
            const templateSystem = featureManager.getFeature('template');
            if (templateSystem && (
                interaction.customId?.startsWith('template_') || 
                interaction.customId === 'template_category' || 
                interaction.customId === 'template_select'
            )) {
                await templateSystem.handleInteraction(interaction);
                return;
            }
            
            // Monitoring System
            const monitoringSystem = featureManager.getFeature('monitoring');
            if (monitoringSystem && interaction.customId?.startsWith('monitor_')) {
                await monitoringSystem.handleInteraction(interaction);
                return;
            }
            
            // Giveaway System
            const giveawaySystem = featureManager.getFeature('giveaway');
            if (giveawaySystem && interaction.customId?.startsWith('giveaway_')) {
                await giveawaySystem.handleInteraction(interaction);
                return;
            }
            
            // Economy System
            const economySystem = featureManager.getFeature('economy');
            if (economySystem && interaction.customId?.startsWith('economy_')) {
                await economySystem.handleInteraction(interaction);
                return;
            }
            
            // Voice Creator
            const voiceCreator = featureManager.getFeature('voicecreator');
            if (voiceCreator && interaction.isButton() && interaction.customId.startsWith('vc_')) {
                await voiceCreator.handlePanelButtons(interaction);
                return;
            }
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            const translator = featureManager.getFeature('translator');
            if (translator && interaction.customId === 'translate_bulk_modal') {
                await translator.handleInteraction(interaction);
                return;
            }
        }

        // ===== SLASH COMMANDS =====
        if (interaction.isCommand()) {
            const { commandName } = interaction;
            
            // Chisato AI
            if (commandName === 'chisato') {
                const chisato = featureManager.getFeature('chisato-ai');
                if (chisato) {
                    const ChisatoAI = require('./features/chisato-ai.js');
                    await ChisatoAI.handleCommand(interaction, chisato);
                    return;
                }
            }
            
            // Music Bot
            if (commandName === 'music') {
                const music = featureManager.getFeature('music');
                if (music) {
                    const MusicSystem = require('./features/music.js');
                    await MusicSystem.handleCommand(interaction, music);
                    return;
                }
            }
            
            // Anime Reminder
            if (commandName === 'anime-reminder') {
                const reminder = featureManager.getFeature('anime-reminder');
                if (reminder) {
                    const AnimeReminder = require('./features/anime-reminder.js');
                    await AnimeReminder.handleCommand(interaction, reminder);
                    return;
                }
            }
            
            // Bot Menu
            if (commandName === 'menu') {
                const menu = featureManager.getFeature('menu');
                if (menu) {
                    const BotMenu = require('./features/menu.js');
                    await BotMenu.handleCommand(interaction, menu);
                    return;
                }
            }
            
            // Anti Nuke Commands
            if (commandName === 'antinuke' || commandName === 'antinuke-whitelist' || 
                commandName === 'antinuke-protect' || commandName === 'antinuke-restore') {
                const antiNuke = featureManager.getFeature('anti-nuke');
                if (antiNuke) {
                    const AntiNuke = require('./features/anti-nuke.js');
                    await AntiNuke.handleCommand(interaction, antiNuke);
                    return;
                }
            }
            
            // RPG Game
            if (commandName === 'rpg') {
                const rpg = featureManager.getFeature('rpg-game');
                if (rpg) {
                    const RPGame = require('./features/rpg-game.js');
                    await RPGame.handleCommand(interaction, rpg);
                    return;
                }
            }
            
            // Command Monitor
            if (commandName === 'botstats' || commandName === 'commandlist') {
                const monitor = featureManager.getFeature('command-monitor');
                if (monitor) {
                    const CommandMonitor = require('./features/command-monitor.js');
                    await CommandMonitor.handleCommand(interaction, monitor);
                    return;
                }
            }
            
            // Anime Systems
            if (commandName === 'anime') {
                const anime = featureManager.getFeature('anime-battle');
                if (anime) {
                    const AnimeBattle = require('./features/anime-battle.js');
                    await AnimeBattle.handleCommand(interaction, anime);
                    return;
                }
            }
            
            if (commandName === 'guild') {
                const guild = featureManager.getFeature('anime-guild');
                if (guild) {
                    const AnimeGuild = require('./features/anime-guild.js');
                    await AnimeGuild.handleCommand(interaction, guild);
                    return;
                }
            }
            
            if (commandName === 'festival') {
                const festival = featureManager.getFeature('anime-festival');
                if (festival) {
                    const AnimeFestival = require('./features/anime-festival.js');
                    await AnimeFestival.handleCommand(interaction, festival);
                    return;
                }
            }
            
            if (commandName === 'theater') {
                const theater = featureManager.getFeature('anime-theater');
                if (theater) {
                    const AnimeTheater = require('./features/anime-theater.js');
                    await AnimeTheater.handleCommand(interaction, theater);
                    return;
                }
            }
            
            if (commandName === 'tournament') {
                const tournament = featureManager.getFeature('anime-tournament');
                if (tournament) {
                    const AnimeTournament = require('./features/anime-tournament.js');
                    await AnimeTournament.handleCommand(interaction, tournament);
                    return;
                }
            }
            
            // Ticket System
            if (commandName === 'ticket') {
                const ticket = featureManager.getFeature('ticket');
                if (ticket) {
                    const TicketSystem = require('./features/ticket.js');
                    await TicketSystem.handleCommand(interaction, ticket);
                    return;
                }
            }
            
            // Template System
            if (commandName === 'template') {
                const template = featureManager.getFeature('template');
                if (template) {
                    const TemplateSystem = require('./features/template.js');
                    await TemplateSystem.handleCommand(interaction, template);
                    return;
                }
            }
            
            // Monitoring System
            if (['setup_monitor', 'disable_monitor', 'server_stats', 'monitor_style'].includes(commandName)) {
                const monitoring = featureManager.getFeature('monitoring');
                if (monitoring) {
                    const ServerMonitor = require('./features/monitoring.js');
                    await ServerMonitor.handleCommand(interaction, monitoring);
                    return;
                }
            }
            
            // Economy System
            if (commandName === 'economy' || commandName === 'economy-admin') {
                const economy = featureManager.getFeature('economy');
                if (economy) {
                    const EconomySystem = require('./features/economy.js');
                    await EconomySystem.handleCommand(interaction, economy);
                    return;
                }
            }
            
            // AutoMod System
            if (commandName === 'automod') {
                const automod = featureManager.getFeature('automod');
                if (automod) {
                    const AutoModSystem = require('./features/automod.js');
                    await AutoModSystem.handleCommand(interaction, automod);
                    return;
                }
            }
            
            // Giveaway System
            if (commandName === 'giveaway') {
                const giveaway = featureManager.getFeature('giveaway');
                if (giveaway) {
                    const GiveawaySystem = require('./features/giveaway.js');
                    await GiveawaySystem.handleCommand(interaction, giveaway);
                    return;
                }
            }
            
            // Voice Creator
            if (commandName === 'voice') {
                const voice = featureManager.getFeature('voicecreator');
                if (voice) {
                    const VoiceCreator = require('./features/voicecreator.js');
                    await VoiceCreator.handleCommand(interaction, voice);
                    return;
                }
            }
            
            // Translator System
            if (commandName === 'translate') {
                const translator = featureManager.getFeature('translator');
                if (translator) {
                    const TranslatorSystem = require('./features/translator.js');
                    await TranslatorSystem.handleCommand(interaction, translator);
                    return;
                }
            }
            
            // AFK Keeper
            if (commandName === 'afk') {
                const afk = featureManager.getFeature('afk-keeper');
                if (afk) {
                    const AFKKeeper = require('./features/afk-keeper.js');
                    await AFKKeeper.handleCommand(interaction, afk);
                    return;
                }
            }
            
            // Jika tidak ada yang handle, coba main commands
            await require('./main.js').handleInteraction(interaction, client);
        }
    } catch (error) {
        console.error('❌ Interaction error:', error.message);
        
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({ 
                    content: `❌ Error: ${error.message.substring(0, 100)}`,
                    flags: 64
                });
            } catch (e) {}
        }
    }
});

// ==================== EVENT HANDLERS ====================
client.on('guildMemberAdd', async (member) => {
    try {
        await require('./welcome.js').sendWelcomeMessage(member, client);
    } catch (error) {
        console.error('Welcome error:', error.message);
    }
});

client.on('guildMemberRemove', async (member) => {
    try {
        await require('./welcome.js').sendGoodbyeMessage(member, client);
    } catch (error) {
        console.error('Goodbye error:', error.message);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // AutoMod check
    const automod = featureManager.getFeature('automod');
    if (automod && automod.checkMessage) {
        await automod.checkMessage(message).catch(() => {});
    }
    
    // Chisato AI
    const chisato = featureManager.getFeature('chisato-ai');
    if (chisato && chisato.handleMessage) {
        await chisato.handleMessage(message);
    }
});

// ==================== VOICE STATE HANDLER ====================
client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        // Voice Creator
        const voiceCreator = featureManager.getFeature('voicecreator');
        if (voiceCreator && voiceCreator.handleVoiceUpdate) {
            await voiceCreator.handleVoiceUpdate(oldState, newState);
        }
        
        // Anime Theater
        const animeTheater = featureManager.getFeature('anime-theater');
        if (animeTheater && animeTheater.handleVoiceUpdate) {
            await animeTheater.handleVoiceUpdate(oldState, newState);
        }
        
        // AFK Keeper
        const afkKeeper = featureManager.getFeature('afk-keeper');
        if (afkKeeper && afkKeeper.handleVoiceUpdate) {
            await afkKeeper.handleVoiceUpdate(oldState, newState);
        }
    } catch (error) {
        console.error('❌ Voice state error:', error.message);
    }
});

client.on('guildCreate', async (guild) => {
    console.log(`✅ Bot added to: ${guild.name}`);
    
    try {
        const owner = await guild.fetchOwner();
        await owner.send({ 
            embeds: [{
                color: 0xFF69B4,
                title: '🎀 **TERIMA KASIH!**',
                description: `Halo **${owner.user.username}**!\n\nBot telah ditambahkan ke **${guild.name}**\n\n` +
                    `**🎀 CHISATO AI!**\n` +
                    `🎀 **/chisato setup** - Chat dengan Nishikigi Chisato!\n` +
                    `🎨 Minta gambar, Chisato bikin langsung!\n\n` +
                    `**🎵 MUSIC BOT!**\n` +
                    `🎵 **/music play** - Putar lagu di voice channel!\n\n` +
                    `**📺 ANIME REMINDER:**\n` +
                    `📺 **/anime-reminder** - Notifikasi episode anime real-time!\n\n` +
                    `**📋 INTERACTIVE MENU:**\n` +
                    `\`/menu\` - Lihat semua fitur bot dengan dropdown!\n\n` +
                    `**🛡️ ANTI NUKE PREMIUM:**\n` +
                    `✅ 15+ Protection Layers\n\n` +
                    `**🎮 FITUR LENGKAP:**\n` +
                    `🎮 RPG Game | 🎴 Anime Battle | 🏰 Guild System\n` +
                    `🎪 Festival | 🎬 Theater | 🏆 Tournament\n` +
                    `💰 Economy | 🎫 Ticket | 📊 Monitoring\n` +
                    `🎤 Voice Creator | 🛡️ AFK Keeper\n\n` +
                    (waBot ? `**📱 WhatsApp Bot:** ✅ Juga berjalan!\n\n` : ``) +
                    `Gunakan **/menu** untuk eksplorasi semua fitur!`
            }] 
        }).catch(() => {});
    } catch (error) {}
});

// ==================== ERROR HANDLING ====================
client.on('error', error => {
    console.error('❌ Discord client error:', error.message);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled rejection:', error.message);
});

// ==================== LOGIN ====================
client.login(BOT_TOKEN)
    .then(() => console.log('✅ Discord Bot login berhasil'))
    .catch(error => {
        console.error('❌ Discord Login gagal:', error.message);
    });

module.exports = { client, featureManager };
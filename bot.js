// bot.js - BOT UTAMA DENGAN MUSIC BOT & SEMUA FITUR!
const { Client, GatewayIntentBits, REST, Routes, Partials } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates, // 🔥 PENTING UNTUK MUSIC BOT!
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

// ==================== SYSTEM INITIALIZATION ====================
// Existing systems
let monitor = null;
let ticketSystem = null;
let templateSystem = null;
let economySystem = null;
let automodSystem = null;
let giveawaySystem = null;
let voiceCreatorSystem = null;
let translatorSystem = null;

// ==================== ANIME SYSTEMS ====================
let animeBattleSystem = null;
let animeGuildSystem = null;
let animeFestivalSystem = null;
let animeTheaterSystem = null;
let animeTournamentSystem = null;

// ==================== COMMAND MONITOR ====================
let commandMonitor = null;

// ==================== RPG GAME ====================
let rpgGame = null;

// ==================== ANTI NUKE ====================
let antiNuke = null;

// ==================== BOT MENU ====================
let botMenu = null;

// ==================== ANIME REMINDER ====================
let animeReminder = null;

// ==================== MUSIC BOT ====================
let musicSystem = null;

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

        // ===== LOAD ALL SYSTEM COMMANDS =====
        const allCommands = [...mainCommands];
        
        // 1. TICKET SYSTEM
        let ticketCmds = [];
        try {
            const TicketSystem = require('./ticket.js');
            ticketSystem = new TicketSystem(client);
            ticketCmds = TicketSystem.getCommands ? TicketSystem.getCommands() : [];
            allCommands.push(...ticketCmds);
            console.log(`✅ Loaded Ticket System: ${ticketCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Ticket System error: ${error.message}`);
        }

        // 2. TEMPLATE SYSTEM
        let templateCmds = [];
        try {
            const TemplateSystem = require('./template.js');
            templateSystem = new TemplateSystem(client);
            templateCmds = TemplateSystem.getCommands ? TemplateSystem.getCommands() : [];
            allCommands.push(...templateCmds);
            console.log(`✅ Loaded Template System: ${templateCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Template System error: ${error.message}`);
        }

        // 3. MONITORING SYSTEM
        let monitorCmds = [];
        try {
            const ServerMonitor = require('./monitor.js');
            monitor = new ServerMonitor(client);
            monitorCmds = ServerMonitor.getCommands ? ServerMonitor.getCommands() : [];
            allCommands.push(...monitorCmds);
            console.log(`✅ Loaded Monitoring System: ${monitorCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Monitoring System error: ${error.message}`);
        }

        // 4. ECONOMY SYSTEM
        let economyCmds = [];
        try {
            const EconomySystem = require('./economy.js');
            economySystem = new EconomySystem(client);
            client.economySystem = economySystem;
            economyCmds = EconomySystem.getCommands ? EconomySystem.getCommands() : [];
            allCommands.push(...economyCmds);
            console.log(`✅ Loaded Economy System: ${economyCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Economy System error: ${error.message}`);
        }

        // 5. AUTOMOD SYSTEM
        let automodCmds = [];
        try {
            const AutoModSystem = require('./automod.js');
            automodSystem = new AutoModSystem(client);
            client.automodSystem = automodSystem;
            automodCmds = AutoModSystem.getCommands ? AutoModSystem.getCommands() : [];
            allCommands.push(...automodCmds);
            console.log(`✅ Loaded AutoMod System: ${automodCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ AutoMod System error: ${error.message}`);
        }

        // 6. GIVEAWAY SYSTEM
        let giveawayCmds = [];
        try {
            const GiveawaySystem = require('./giveaway.js');
            giveawaySystem = new GiveawaySystem(client);
            client.giveawaySystem = giveawaySystem;
            giveawayCmds = GiveawaySystem.getCommands ? GiveawaySystem.getCommands() : [];
            allCommands.push(...giveawayCmds);
            console.log(`✅ Loaded Giveaway System: ${giveawayCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Giveaway System error: ${error.message}`);
        }

        // 7. VOICE CREATOR SYSTEM
        let voiceCmds = [];
        try {
            const VoiceCreatorSystem = require('./voicecreator.js');
            voiceCreatorSystem = new VoiceCreatorSystem(client);
            client.voiceCreatorSystem = voiceCreatorSystem;
            voiceCmds = VoiceCreatorSystem.getCommands ? VoiceCreatorSystem.getCommands() : [];
            allCommands.push(...voiceCmds);
            console.log(`✅ Loaded Voice Creator: ${voiceCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Voice Creator error: ${error.message}`);
        }

        // 8. TRANSLATOR SYSTEM
        let translatorCmds = [];
        try {
            const TranslatorSystem = require('./translator.js');
            translatorSystem = new TranslatorSystem(client);
            client.translatorSystem = translatorSystem;
            translatorCmds = TranslatorSystem.getCommands ? TranslatorSystem.getCommands() : [];
            allCommands.push(...translatorCmds);
            console.log(`✅ Loaded Translator System: ${translatorCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Translator System error: ${error.message}`);
        }

        // ==================== ANIME SYSTEMS ====================
        
        // 9. ANIME BATTLE SYSTEM - SAKURA CARD CAPTURE
        let battleCmds = [];
        try {
            const AnimeBattleSystem = require('./anime-battle.js');
            animeBattleSystem = new AnimeBattleSystem(client);
            client.animeBattleSystem = animeBattleSystem;
            battleCmds = AnimeBattleSystem.getCommands ? AnimeBattleSystem.getCommands() : [];
            allCommands.push(...battleCmds);
            console.log(`✅ Loaded Anime Battle: ${battleCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Anime Battle error: ${error.message}`);
        }

        // 10. ANIME GUILD SYSTEM
        let guildCmds = [];
        try {
            const AnimeGuildSystem = require('./anime-guild.js');
            animeGuildSystem = new AnimeGuildSystem(client);
            client.animeGuildSystem = animeGuildSystem;
            guildCmds = AnimeGuildSystem.getCommands ? AnimeGuildSystem.getCommands() : [];
            allCommands.push(...guildCmds);
            console.log(`✅ Loaded Anime Guild: ${guildCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Anime Guild error: ${error.message}`);
        }

        // 11. ANIME FESTIVAL SYSTEM
        let festivalCmds = [];
        try {
            const AnimeFestivalSystem = require('./anime-festival.js');
            animeFestivalSystem = new AnimeFestivalSystem(client);
            client.animeFestivalSystem = animeFestivalSystem;
            festivalCmds = AnimeFestivalSystem.getCommands ? AnimeFestivalSystem.getCommands() : [];
            allCommands.push(...festivalCmds);
            console.log(`✅ Loaded Anime Festival: ${festivalCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Anime Festival error: ${error.message}`);
        }

        // 12. ANIME THEATER SYSTEM
        let theaterCmds = [];
        try {
            const AnimeTheaterSystem = require('./anime-theater.js');
            animeTheaterSystem = new AnimeTheaterSystem(client);
            client.animeTheaterSystem = animeTheaterSystem;
            theaterCmds = AnimeTheaterSystem.getCommands ? AnimeTheaterSystem.getCommands() : [];
            allCommands.push(...theaterCmds);
            console.log(`✅ Loaded Anime Theater: ${theaterCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Anime Theater error: ${error.message}`);
        }

        // 13. ANIME TOURNAMENT SYSTEM
        let tourneyCmds = [];
        try {
            const AnimeTournamentSystem = require('./anime-tournament.js');
            animeTournamentSystem = new AnimeTournamentSystem(client);
            client.animeTournamentSystem = animeTournamentSystem;
            tourneyCmds = AnimeTournamentSystem.getCommands ? AnimeTournamentSystem.getCommands() : [];
            allCommands.push(...tourneyCmds);
            console.log(`✅ Loaded Anime Tournament: ${tourneyCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Anime Tournament error: ${error.message}`);
        }

        // ==================== COMMAND MONITOR SYSTEM ====================
        
        // 14. COMMAND MONITOR SYSTEM
        let monitorCmds2 = [];
        try {
            const CommandMonitor = require('./command-monitor.js');
            commandMonitor = new CommandMonitor(client);
            client.commandMonitor = commandMonitor;
            
            // Kumpulkan semua commands untuk di monitor
            const allCommandsList = [
                ...mainCommands, 
                ...ticketCmds, 
                ...templateCmds, 
                ...monitorCmds, 
                ...economyCmds, 
                ...automodCmds, 
                ...giveawayCmds, 
                ...voiceCmds, 
                ...translatorCmds, 
                ...battleCmds, 
                ...guildCmds, 
                ...festivalCmds, 
                ...theaterCmds, 
                ...tourneyCmds
            ];
            
            commandMonitor.setAllCommands(allCommandsList);
            
            monitorCmds2 = CommandMonitor.getCommands ? CommandMonitor.getCommands() : [];
            allCommands.push(...monitorCmds2);
            console.log(`✅ Loaded Command Monitor: ${monitorCmds2.length} commands`);
        } catch (error) {
            console.log(`⚠️ Command Monitor error: ${error.message}`);
        }

        // ==================== RPG GAME SYSTEM ====================
        
        // 15. RPG GAME - IDLE RPG
        let rpgCmds = [];
        try {
            const RPGame = require('./rpg-game.js');
            rpgGame = new RPGame(client);
            client.rpgGame = rpgGame;
            rpgCmds = RPGame.getCommands ? RPGame.getCommands() : [];
            allCommands.push(...rpgCmds);
            console.log(`✅ Loaded RPG Game: ${rpgCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ RPG Game error: ${error.message}`);
        }

        // ==================== ANTI NUKE SYSTEM ====================
        
        // 16. ANTI NUKE PREMIUM
        let antiNukeCmds = [];
        try {
            const AntiNuke = require('./anti-nuke.js');
            antiNuke = new AntiNuke(client);
            client.antiNuke = antiNuke;
            antiNukeCmds = AntiNuke.getCommands ? AntiNuke.getCommands() : [];
            allCommands.push(...antiNukeCmds);
            console.log(`✅ Loaded Anti Nuke Premium: ${antiNukeCmds.length} commands`);
            console.log(`🛡️ 15+ Protection Layers Active!`);
        } catch (error) {
            console.log(`⚠️ Anti Nuke error: ${error.message}`);
        }

        // ==================== BOT MENU SYSTEM ====================
        
        // 17. BOT MENU
        let menuCmds = [];
        try {
            const BotMenu = require('./menu.js');
            botMenu = new BotMenu(client);
            client.botMenu = botMenu;
            menuCmds = BotMenu.getCommands ? BotMenu.getCommands() : [];
            allCommands.push(...menuCmds);
            console.log(`✅ Loaded Bot Menu: ${menuCmds.length} commands`);
        } catch (error) {
            console.log(`⚠️ Bot Menu error: ${error.message}`);
        }

        // ==================== ANIME REMINDER SYSTEM ====================
        
        // 18. ANIME REMINDER
        let reminderCmds = [];
        try {
            const AnimeReminder = require('./anime-reminder.js');
            animeReminder = new AnimeReminder(client);
            client.animeReminder = animeReminder;
            reminderCmds = AnimeReminder.getCommands ? AnimeReminder.getCommands() : [];
            allCommands.push(...reminderCmds);
            console.log(`✅ Loaded Anime Reminder: ${reminderCmds.length} commands`);
            console.log(`📺 Real-time anime release notification ready!`);
        } catch (error) {
            console.log(`⚠️ Anime Reminder error: ${error.message}`);
        }

        // ==================== MUSIC BOT SYSTEM ====================
        
        // 19. MUSIC BOT
        let musicCmds = [];
        try {
            const MusicSystem = require('./music.js');
            musicSystem = new MusicSystem(client);
            client.musicSystem = musicSystem;
            musicCmds = MusicSystem.getCommands ? MusicSystem.getCommands() : [];
            allCommands.push(...musicCmds);
            console.log(`✅ Loaded Music System: ${musicCmds.length} commands`);
            console.log(`🎵 Music Bot ready!`);
        } catch (error) {
            console.log(`⚠️ Music System error: ${error.message}`);
        }

        // ===== COMMAND SUMMARY =====
        console.log('\n' + '='.repeat(50));
        console.log(`📋 TOTAL COMMANDS: ${allCommands.length}`);
        console.log('='.repeat(50));
        
        // 🔥 GLOBAL VARIABLE UNTUK DASHBOARD
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

        // ===== START DASHBOARD =====
        try {
            const dashboard = require('./server.js');
            dashboard.setBotClient(client);
            dashboard.start();
            console.log('🌐 Dashboard: http://localhost:3000');
        } catch (error) {
            console.log(`⚠️ Dashboard error: ${error.message}`);
        }

        // ===== SET STATUS =====
        client.user.setPresence({
            activities: [{ 
                name: `${allCommands.length} commands | /music play`, 
                type: 3 
            }],
            status: 'online'
        });

        console.log('\n' + '='.repeat(50));
        console.log('🚀 BOT IS READY WITH ALL SYSTEMS!');
        console.log('🎵 Music Bot | 📺 Anime Reminder | 📋 /menu | 🛡️ Anti Nuke | 🎮 RPG');
        console.log('='.repeat(50) + '\n');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    }
});

// ==================== INTERACTION HANDLER ====================
client.on('interactionCreate', async (interaction) => {
    try {
        // ===== BOT MENU INTERACTIONS =====
        if (botMenu && botMenu.handleInteraction) {
            await botMenu.handleInteraction(interaction);
        }

        // ===== ANIME REMINDER INTERACTIONS =====
        if (animeReminder && animeReminder.handleInteraction) {
            await animeReminder.handleInteraction(interaction);
        }

        // ===== COMMAND MONITOR INTERACTIONS =====
        if (commandMonitor && commandMonitor.handleInteraction) {
            await commandMonitor.handleInteraction(interaction);
        }

        // ===== RPG GAME INTERACTIONS =====
        if (rpgGame && rpgGame.handleInteraction) {
            await rpgGame.handleInteraction(interaction);
        }

        // ===== ANTI NUKE INTERACTIONS =====
        if (antiNuke && antiNuke.handleInteraction) {
            await antiNuke.handleInteraction(interaction);
        }

        // ===== ANIME BATTLE INTERACTIONS =====
        if (animeBattleSystem && animeBattleSystem.handleInteraction) {
            await animeBattleSystem.handleInteraction(interaction);
        }

        // ===== ANIME GUILD INTERACTIONS =====
        if (animeGuildSystem && animeGuildSystem.handleInteraction) {
            await animeGuildSystem.handleInteraction(interaction);
        }

        // ===== ANIME FESTIVAL INTERACTIONS =====
        if (animeFestivalSystem && animeFestivalSystem.handleInteraction) {
            await animeFestivalSystem.handleInteraction(interaction);
        }

        // ===== ANIME THEATER INTERACTIONS =====
        if (animeTheaterSystem && animeTheaterSystem.handleInteraction) {
            await animeTheaterSystem.handleInteraction(interaction);
        }

        // ===== ANIME TOURNAMENT INTERACTIONS =====
        if (animeTournamentSystem && animeTournamentSystem.handleInteraction) {
            await animeTournamentSystem.handleInteraction(interaction);
        }

        // ===== TICKET SYSTEM =====
        if (ticketSystem && interaction.customId?.startsWith('ticket_')) {
            await ticketSystem.handleInteraction(interaction);
            return;
        }

        // ===== TEMPLATE SYSTEM =====
        if (templateSystem && (
            interaction.customId?.startsWith('template_') ||
            interaction.customId === 'template_category' ||
            interaction.customId === 'template_select'
        )) {
            await templateSystem.handleInteraction(interaction);
            return;
        }

        // ===== MONITORING SYSTEM =====
        if (monitor && interaction.customId?.startsWith('monitor_')) {
            await monitor.handleInteraction(interaction);
            return;
        }

        // ===== GIVEAWAY SYSTEM =====
        if (giveawaySystem && interaction.customId?.startsWith('giveaway_')) {
            await giveawaySystem.handleInteraction(interaction);
            return;
        }

        // ===== ECONOMY SYSTEM =====
        if (economySystem && interaction.customId?.startsWith('economy_')) {
            await economySystem.handleInteraction(interaction);
            return;
        }

        // ===== TRANSLATOR SYSTEM =====
        if (translatorSystem && interaction.isModalSubmit() && interaction.customId === 'translate_bulk_modal') {
            await translatorSystem.handleInteraction(interaction);
            return;
        }

        // ===== SLASH COMMANDS =====
        if (interaction.isCommand()) {
            const { commandName } = interaction;
            
            // ===== MUSIC BOT =====
            if (commandName === 'music' && musicSystem) {
                const MusicSystem = require('./music.js');
                await MusicSystem.handleCommand(interaction, musicSystem);
            }
            
            // ===== ANIME REMINDER =====
            else if (commandName === 'anime-reminder' && animeReminder) {
                const AnimeReminder = require('./anime-reminder.js');
                await AnimeReminder.handleCommand(interaction, animeReminder);
            }
            
            // ===== BOT MENU =====
            else if (commandName === 'menu' && botMenu) {
                const BotMenu = require('./menu.js');
                await BotMenu.handleCommand(interaction, botMenu);
            }
            
            // ===== ANTI NUKE COMMANDS =====
            else if (commandName === 'antinuke' && antiNuke) {
                const AntiNuke = require('./anti-nuke.js');
                await AntiNuke.handleCommand(interaction, antiNuke);
            }
            else if (commandName === 'antinuke-whitelist' && antiNuke) {
                const AntiNuke = require('./anti-nuke.js');
                await AntiNuke.handleCommand(interaction, antiNuke);
            }
            else if (commandName === 'antinuke-protect' && antiNuke) {
                const AntiNuke = require('./anti-nuke.js');
                await AntiNuke.handleCommand(interaction, antiNuke);
            }
            else if (commandName === 'antinuke-restore' && antiNuke) {
                const AntiNuke = require('./anti-nuke.js');
                await AntiNuke.handleCommand(interaction, antiNuke);
            }
            
            // ===== RPG GAME =====
            else if (commandName === 'rpg' && rpgGame) {
                const RPGame = require('./rpg-game.js');
                await RPGame.handleCommand(interaction, rpgGame);
            }
            
            // ===== COMMAND MONITOR =====
            else if (commandName === 'botstats' && commandMonitor) {
                const CommandMonitor = require('./command-monitor.js');
                await CommandMonitor.handleCommand(interaction, commandMonitor);
            }
            else if (commandName === 'commandlist' && commandMonitor) {
                const CommandMonitor = require('./command-monitor.js');
                await CommandMonitor.handleCommand(interaction, commandMonitor);
            }
            
            // ===== ANIME SYSTEMS =====
            else if (commandName === 'anime' && animeBattleSystem) {
                const AnimeBattleSystem = require('./anime-battle.js');
                await AnimeBattleSystem.handleCommand(interaction, animeBattleSystem);
            }
            else if (commandName === 'guild' && animeGuildSystem) {
                const AnimeGuildSystem = require('./anime-guild.js');
                await AnimeGuildSystem.handleCommand(interaction, animeGuildSystem);
            }
            else if (commandName === 'festival' && animeFestivalSystem) {
                const AnimeFestivalSystem = require('./anime-festival.js');
                await AnimeFestivalSystem.handleCommand(interaction, animeFestivalSystem);
            }
            else if (commandName === 'theater' && animeTheaterSystem) {
                const AnimeTheaterSystem = require('./anime-theater.js');
                await AnimeTheaterSystem.handleCommand(interaction, animeTheaterSystem);
            }
            else if (commandName === 'tournament' && animeTournamentSystem) {
                const AnimeTournamentSystem = require('./anime-tournament.js');
                await AnimeTournamentSystem.handleCommand(interaction, animeTournamentSystem);
            }
            
            // ===== EXISTING SYSTEMS =====
            else if (commandName === 'ticket' && ticketSystem) {
                const TicketSystem = require('./ticket.js');
                await TicketSystem.handleCommand(interaction, ticketSystem);
            }
            else if (commandName === 'template' && templateSystem) {
                const TemplateSystem = require('./template.js');
                await TemplateSystem.handleCommand(interaction, templateSystem);
            }
            else if (['setup_monitor', 'disable_monitor', 'server_stats', 'monitor_style'].includes(commandName) && monitor) {
                const ServerMonitor = require('./monitor.js');
                await ServerMonitor.handleCommand(interaction, monitor);
            }
            else if (commandName === 'economy' && economySystem) {
                const EconomySystem = require('./economy.js');
                await EconomySystem.handleCommand(interaction, economySystem);
            }
            else if (commandName === 'economy-admin' && economySystem) {
                const EconomySystem = require('./economy.js');
                await EconomySystem.handleCommand(interaction, economySystem);
            }
            else if (commandName === 'automod' && automodSystem) {
                const AutoModSystem = require('./automod.js');
                await AutoModSystem.handleCommand(interaction, automodSystem);
            }
            else if (commandName === 'giveaway' && giveawaySystem) {
                const GiveawaySystem = require('./giveaway.js');
                await GiveawaySystem.handleCommand(interaction, giveawaySystem);
            }
            else if (commandName === 'voice' && voiceCreatorSystem) {
                const VoiceCreatorSystem = require('./voicecreator.js');
                await VoiceCreatorSystem.handleCommand(interaction, voiceCreatorSystem);
            }
            else if (commandName === 'translate' && translatorSystem) {
                const TranslatorSystem = require('./translator.js');
                await TranslatorSystem.handleCommand(interaction, translatorSystem);
            }
            else {
                // Handle main commands
                await require('./main.js').handleInteraction(interaction, client);
            }
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
    if (automodSystem && automodSystem.checkMessage) {
        await automodSystem.checkMessage(message).catch(() => {});
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    // Voice Creator
    if (voiceCreatorSystem && voiceCreatorSystem.handleVoiceUpdate) {
        await voiceCreatorSystem.handleVoiceUpdate(oldState, newState).catch(() => {});
    }
    
    // Anime Theater
    if (animeTheaterSystem && animeTheaterSystem.handleVoiceUpdate) {
        await animeTheaterSystem.handleVoiceUpdate(oldState, newState).catch(() => {});
    }
});

client.on('guildCreate', async (guild) => {
    console.log(`✅ Bot added to: ${guild.name}`);
    
    try {
        const owner = await guild.fetchOwner();
        await owner.send({ 
            embeds: [{
                color: 0x1E90FF,
                title: '🎉 **TERIMA KASIH!**',
                description: `Halo **${owner.user.username}**!\n\nBot telah ditambahkan ke **${guild.name}**\n\n**🎵 FITUR BARU!**\n🎵 **/music play** - Putar lagu di voice channel!\n\n**📺 ANIME REMINDER:**\n📺 **/anime-reminder** - Notifikasi episode anime real-time!\n\n**📋 INTERACTIVE MENU:**\n\`/menu\` - Lihat semua fitur bot dengan dropdown!\n\n**🛡️ ANTI NUKE PREMIUM:**\n✅ 15+ Protection Layers\n✅ Auto Backup & Restore\n✅ Whitelist System\n\n**🎮 FITUR LENGKAP:**\n🎮 RPG Game | 🎴 Anime Battle | 🏰 Guild System\n🎪 Festival | 🎬 Theater | 🏆 Tournament\n💰 Economy | 🎫 Ticket | 📊 Monitoring\n\nGunakan **/menu** untuk eksplorasi semua fitur!`
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
    .then(() => console.log('✅ Bot login berhasil'))
    .catch(error => {
        console.error('❌ Login gagal:', error.message);
    });

module.exports = { client };
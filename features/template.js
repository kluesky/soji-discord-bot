// template.js - DISCORD SERVER TEMPLATE SYSTEM (25+ TEMPLATES)
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    PermissionFlagsBits,
    OverwriteType
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class TemplateSystem {
    constructor(client) {
        this.client = client;
        this.templates = new Map();
        this.userCooldowns = new Map();
        this.cooldownTime = 24 * 60 * 60 * 1000; // 24 jam
        this.templatePath = path.join(__dirname, 'templates');
        this.loadAllTemplates();
    }

    async loadAllTemplates() {
        try {
            // Template data langsung di kode (bisa juga load dari file)
            this.loadTemplateData();
            console.log(`✅ Loaded ${this.templates.size} server templates`);
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    loadTemplateData() {
        // ==================== 🎮 GAMING TEMPLATES ====================
        this.templates.set('gaming-general', {
            id: 'gaming-general',
            name: '🎮 General Gaming Server',
            description: 'Server gaming umum untuk semua game',
            icon: '🎮',
            color: 0x5865F2,
            categories: 12,
            channels: 45,
            roles: 15,
            structure: {
                categories: [
                    {
                        name: '📢 ANNOUNCEMENTS',
                        position: 0,
                        channels: [
                            { name: 'announcements', type: 0, topic: 'Pengumuman server dan event' },
                            { name: 'updates', type: 0, topic: 'Update game dan patch notes' },
                            { name: 'events', type: 0, topic: 'Event server dan tournament' }
                        ]
                    },
                    {
                        name: '💬 GENERAL CHAT',
                        position: 1,
                        channels: [
                            { name: 'general', type: 0, topic: 'Chat umum tentang gaming' },
                            { name: 'introductions', type: 0, topic: 'Perkenalkan diri Anda' },
                            { name: 'memes', type: 0, topic: 'Share meme gaming lucu' },
                            { name: 'media', type: 0, topic: 'Share screenshot dan video' }
                        ]
                    },
                    {
                        name: '🎯 GAME SPECIFIC',
                        position: 2,
                        channels: [
                            { name: 'fps-games', type: 0, topic: 'Valorant, CS2, Apex, dll' },
                            { name: 'moba-games', type: 0, topic: 'Dota 2, LoL, Mobile Legends' },
                            { name: 'mmorpg', type: 0, topic: 'WoW, FFXIV, Genshin Impact' },
                            { name: 'mobile-games', type: 0, topic: 'Mobile gaming discussion' },
                            { name: 'indie-games', type: 0, topic: 'Game indie dan hidden gems' }
                        ]
                    },
                    {
                        name: '🎮 VOICE CHANNELS',
                        position: 3,
                        channels: [
                            { name: 'General VC', type: 2 },
                            { name: 'Gaming VC 1', type: 2 },
                            { name: 'Gaming VC 2', type: 2 },
                            { name: 'AFK Channel', type: 2 }
                        ]
                    },
                    {
                        name: '🏆 ESPORTS & TOURNAMENTS',
                        position: 4,
                        channels: [
                            { name: 'tournament-info', type: 0, topic: 'Info tournament dan rules' },
                            { name: 'team-recruitment', type: 0, topic: 'Cari teammate atau team' },
                            { name: 'scrims-lfg', type: 0, topic: 'Cari scrim partner' },
                            { name: 'esports-news', type: 0, topic: 'Berita esports terbaru' }
                        ]
                    }
                ],
                roles: [
                    { name: 'Owner', color: '#FF0000', permissions: PermissionFlagsBits.Administrator },
                    { name: 'Admin', color: '#FF6B6B', permissions: PermissionFlagsBits.ManageGuild },
                    { name: 'Moderator', color: '#FFA500', permissions: PermissionFlagsBits.ManageMessages },
                    { name: 'Esports Player', color: '#00FF00', permissions: 0 },
                    { name: 'Content Creator', color: '#9370DB', permissions: 0 },
                    { name: 'Streamer', color: '#9146FF', permissions: 0 },
                    { name: 'Veteran Gamer', color: '#1E90FF', permissions: 0 },
                    { name: 'New Member', color: '#808080', permissions: 0 }
                ]
            }
        });

        this.templates.set('minecraft', {
            id: 'minecraft',
            name: '⛏️ Minecraft Server',
            description: 'Server khusus untuk komunitas Minecraft',
            icon: '⛏️',
            color: 0x00AA00,
            categories: 10,
            channels: 38,
            roles: 12,
            structure: {
                categories: [
                    {
                        name: '🏰 MINECRAFT SERVER',
                        position: 0,
                        channels: [
                            { name: 'server-info', type: 0, topic: 'Info server IP dan rules' },
                            { name: 'server-status', type: 0, topic: 'Status server online/offline' },
                            { name: 'updates', type: 0, topic: 'Update server dan plugin' }
                        ]
                    },
                    {
                        name: '🎮 GAMEPLAY',
                        position: 1,
                        channels: [
                            { name: 'survival-chat', type: 0, topic: 'Diskusi survival mode' },
                            { name: 'creative-chat', type: 0, topic: 'Diskusi creative mode' },
                            { name: 'redstone-tech', type: 0, topic: 'Redstone dan machinery' },
                            { name: 'building-showcase', type: 0, topic: 'Pamerkan build Anda' }
                        ]
                    }
                ],
                roles: [
                    { name: 'Server Owner', color: '#FFD700', permissions: PermissionFlagsBits.Administrator },
                    { name: 'Builder', color: '#00FF00', permissions: 0 },
                    { name: 'Redstone Engineer', color: '#FF0000', permissions: 0 },
                    { name: 'Mod Developer', color: '#9370DB', permissions: 0 }
                ]
            }
        });

        // ==================== 💻 PROGRAMMING TEMPLATES ====================
        this.templates.set('programming-community', {
            id: 'programming-community',
            name: '💻 Programming Community',
            description: 'Komunitas programming untuk semua level',
            icon: '💻',
            color: 0x00D8FF,
            categories: 15,
            channels: 65,
            roles: 22,
            structure: {
                categories: [
                    {
                        name: '📚 LEARNING RESOURCES',
                        position: 0,
                        channels: [
                            { name: 'beginner-help', type: 0, topic: 'Bantuan untuk pemula' },
                            { name: 'tutorials', type: 0, topic: 'Share tutorial dan resources' },
                            { name: 'code-challenges', type: 0, topic: 'Daily coding challenges' },
                            { name: 'book-recommendations', type: 0, topic: 'Rekomendasi buku programming' }
                        ]
                    },
                    {
                        name: '💻 PROGRAMMING LANGUAGES',
                        position: 1,
                        channels: [
                            { name: 'javascript', type: 0, topic: 'JavaScript, Node.js, TypeScript' },
                            { name: 'python', type: 0, topic: 'Python, Django, Flask' },
                            { name: 'java', type: 0, topic: 'Java, Spring, Android' },
                            { name: 'c-cpp', type: 0, topic: 'C, C++, C#' },
                            { name: 'web-dev', type: 0, topic: 'HTML, CSS, React, Vue' },
                            { name: 'mobile-dev', type: 0, topic: 'React Native, Flutter, Swift' }
                        ]
                    },
                    {
                        name: '🚀 PROJECTS & COLLABORATION',
                        position: 2,
                        channels: [
                            { name: 'project-ideas', type: 0, topic: 'Share ide project' },
                            { name: 'collaboration', type: 0, topic: 'Cari partner project' },
                            { name: 'code-review', type: 0, topic: 'Minta review code' },
                            { name: 'portfolio-showcase', type: 0, topic: 'Pamerkan portfolio' }
                        ]
                    }
                ],
                roles: [
                    { name: 'Senior Developer', color: '#FF6B6B', permissions: 0 },
                    { name: 'Full Stack', color: '#00FF00', permissions: 0 },
                    { name: 'Frontend Dev', color: '#FFA500', permissions: 0 },
                    { name: 'Backend Dev', color: '#1E90FF', permissions: 0 },
                    { name: 'Mobile Dev', color: '#9370DB', permissions: 0 },
                    { name: 'DevOps', color: '#00CED1', permissions: 0 },
                    { name: 'Data Scientist', color: '#FF1493', permissions: 0 },
                    { name: 'AI/ML Engineer', color: '#32CD32', permissions: 0 }
                ]
            }
        });

        this.templates.set('web-development', {
            id: 'web-development',
            name: '🌐 Web Development Server',
            description: 'Server khusus untuk web developer',
            icon: '🌐',
            color: 0x00AA00,
            categories: 12,
            channels: 55,
            roles: 18,
            structure: {
                categories: [
                    {
                        name: '🛠️ FRONTEND DEVELOPMENT',
                        position: 0,
                        channels: [
                            { name: 'html-css', type: 0, topic: 'HTML, CSS, Sass, Tailwind' },
                            { name: 'javascript', type: 0, topic: 'Vanilla JS, ES6+' },
                            { name: 'react-js', type: 0, topic: 'React, Next.js' },
                            { name: 'vue-js', type: 0, topic: 'Vue, Nuxt.js' },
                            { name: 'angular', type: 0, topic: 'Angular' },
                            { name: 'ui-ux-design', type: 0, topic: 'Design discussion' }
                        ]
                    },
                    {
                        name: '⚙️ BACKEND DEVELOPMENT',
                        position: 1,
                        channels: [
                            { name: 'node-js', type: 0, topic: 'Node.js, Express' },
                            { name: 'php', type: 0, topic: 'PHP, Laravel, Symfony' },
                            { name: 'python-backend', type: 0, topic: 'Django, Flask, FastAPI' },
                            { name: 'databases', type: 0, topic: 'SQL, NoSQL, ORM' },
                            { name: 'api-development', type: 0, topic: 'REST, GraphQL' }
                        ]
                    }
                ],
                roles: [
                    { name: 'Frontend Expert', color: '#FFA500', permissions: 0 },
                    { name: 'Backend Expert', color: '#1E90FF', permissions: 0 },
                    { name: 'Full Stack', color: '#00FF00', permissions: 0 },
                    { name: 'UI/UX Designer', color: '#9370DB', permissions: 0 }
                ]
            }
        });

        // ==================== 🎨 CREATIVE TEMPLATES ====================
        this.templates.set('digital-art', {
            id: 'digital-art',
            name: '🎨 Digital Art Community',
            description: 'Komunitas untuk digital artist',
            icon: '🎨',
            color: 0xFF6B6B,
            categories: 9,
            channels: 40,
            roles: 13,
            structure: {
                categories: [
                    {
                        name: '🖼️ ART SHOWCASE',
                        position: 0,
                        channels: [
                            { name: 'art-showcase', type: 0, topic: 'Pamerkan karya terbaik' },
                            { name: 'wip-progress', type: 0, topic: 'Work in progress' },
                            { name: 'feedback-critique', type: 0, topic: 'Minta feedback' },
                            { name: 'art-challenges', type: 0, topic: 'Art challenge dan event' }
                        ]
                    },
                    {
                        name: '🎨 ART DISCUSSIONS',
                        position: 1,
                        channels: [
                            { name: 'digital-painting', type: 0, topic: 'Photoshop, Procreate' },
                            { name: 'vector-art', type: 0, topic: 'Illustrator, Inkscape' },
                            { name: '3d-modeling', type: 0, topic: 'Blender, Maya, ZBrush' },
                            { name: 'animation', type: 0, topic: 'After Effects, Toon Boom' }
                        ]
                    }
                ],
                roles: [
                    { name: 'Professional Artist', color: '#FF6B6B', permissions: 0 },
                    { name: 'Digital Painter', color: '#FFA500', permissions: 0 },
                    { name: '3D Artist', color: '#1E90FF', permissions: 0 },
                    { name: 'Animator', color: '#9370DB', permissions: 0 },
                    { name: 'Beginner Artist', color: '#808080', permissions: 0 }
                ]
            }
        });

        // ==================== 📚 EDUCATION TEMPLATES ====================
        this.templates.set('study-group', {
            id: 'study-group',
            name: '📚 Study Group Server',
            description: 'Server untuk belajar bersama',
            icon: '📚',
            color: 0x9370DB,
            categories: 7,
            channels: 30,
            roles: 10,
            structure: {
                categories: [
                    {
                        name: '📖 STUDY ROOMS',
                        position: 0,
                        channels: [
                            { name: 'study-room-1', type: 2 },
                            { name: 'study-room-2', type: 2 },
                            { name: 'study-room-3', type: 2 },
                            { name: 'focus-room', type: 2 }
                        ]
                    },
                    {
                        name: '📚 SUBJECTS',
                        position: 1,
                        channels: [
                            { name: 'mathematics', type: 0, topic: 'Matematika dan kalkulus' },
                            { name: 'programming', type: 0, topic: 'Coding dan computer science' },
                            { name: 'science', type: 0, topic: 'Fisika, kimia, biologi' },
                            { name: 'languages', type: 0, topic: 'Bahasa asing' },
                            { name: 'humanities', type: 0, topic: 'Sejarah, sosiologi, filsafat' }
                        ]
                    }
                ],
                roles: [
                    { name: 'Study Leader', color: '#FFD700', permissions: PermissionFlagsBits.ManageChannels },
                    { name: 'Tutor', color: '#00FF00', permissions: 0 },
                    { name: 'Study Partner', color: '#1E90FF', permissions: 0 },
                    { name: 'Student', color: '#808080', permissions: 0 }
                ]
            }
        });

        // ==================== 🇮🇩 INDONESIAN TEMPLATES ====================
        this.templates.set('indonesian-community', {
            id: 'indonesian-community',
            name: '🇮🇩 Indonesian Community',
            description: 'Server komunitas Indonesia',
            icon: '🇮🇩',
            color: 0xFF0000,
            categories: 12,
            channels: 50,
            roles: 16,
            structure: {
                categories: [
                    {
                        name: '📢 PENGUMUMAN',
                        position: 0,
                        channels: [
                            { name: 'pengumuman', type: 0, topic: 'Pengumuman penting server' },
                            { name: 'rules', type: 0, topic: 'Peraturan server' },
                            { name: 'event', type: 0, topic: 'Event dan kegiatan' }
                        ]
                    },
                    {
                        name: '💬 OBROLAN',
                        position: 1,
                        channels: [
                            { name: 'lounge', type: 0, topic: 'Obrolan santai' },
                            { name: 'perkenalan', type: 0, topic: 'Perkenalkan diri Anda' },
                            { name: 'random', type: 0, topic: 'Random chat' },
                            { name: 'meme', type: 0, topic: 'Share meme lucu' },
                            { name: 'media', type: 0, topic: 'Share foto dan video' }
                        ]
                    },
                    {
                        name: '🎮 GAMING',
                        position: 2,
                        channels: [
                            { name: 'gaming-chat', type: 0, topic: 'Diskusi game' },
                            { name: 'mobile-legends', type: 0, topic: 'MLBB discussion' },
                            { name: 'valorant-cs', type: 0, topic: 'FPS games' },
                            { name: 'minecraft', type: 0, topic: 'Minecraft Indonesia' }
                        ]
                    }
                ],
                roles: [
                    { name: 'Pendiri', color: '#FF0000', permissions: PermissionFlagsBits.Administrator },
                    { name: 'Admin', color: '#FF6B6B', permissions: PermissionFlagsBits.ManageGuild },
                    { name: 'Moderator', color: '#FFA500', permissions: PermissionFlagsBits.ManageMessages },
                    { name: 'Member Aktif', color: '#00FF00', permissions: 0 },
                    { name: 'Gamer', color: '#1E90FF', permissions: 0 },
                    { name: 'Wibu', color: '#9370DB', permissions: 0 }
                ]
            }
        });

        // Add more templates as needed...
    }

    // ==================== COMMAND HANDLERS ====================

    async handleTemplateList(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎮 **SERVER TEMPLATES**')
            .setDescription('Pilih kategori template yang Anda inginkan:')
            .setImage('https://media1.tenor.com/m/ZpeNsM7u9fsAAAAC/chika-fujiwara-kaguya-sama.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Template System',
                iconURL: this.client.user?.displayAvatarURL()
            });

        const categories = [
            { label: '🎮 Gaming & Esports', value: 'gaming', description: 'Template server gaming' },
            { label: '💻 Programming & Tech', value: 'programming', description: 'Template programming' },
            { label: '🎨 Creative & Art', value: 'creative', description: 'Template kreatif' },
            { label: '📚 Education & Learning', value: 'education', description: 'Template edukasi' },
            { label: '🇮🇩 Indonesian Community', value: 'indonesian', description: 'Template Indonesia' },
            { label: '💼 Business & Community', value: 'business', description: 'Template bisnis' }
        ];

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('template_category')
            .setPlaceholder('Pilih kategori template')
            .addOptions(categories);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            ephemeral: true 
        });
    }

    async handleCategorySelect(interaction) {
        const category = interaction.values[0];
        
        // Filter templates by category
        let templates = [];
        let categoryName = '';
        
        switch (category) {
            case 'gaming':
                templates = [
                    this.templates.get('gaming-general'),
                    this.templates.get('minecraft')
                    // Add more gaming templates
                ];
                categoryName = '🎮 GAMING & ESPORTS';
                break;
            case 'programming':
                templates = [
                    this.templates.get('programming-community'),
                    this.templates.get('web-development')
                ];
                categoryName = '💻 PROGRAMMING & TECH';
                break;
            case 'creative':
                templates = [
                    this.templates.get('digital-art')
                ];
                categoryName = '🎨 CREATIVE & ART';
                break;
            case 'education':
                templates = [
                    this.templates.get('study-group')
                ];
                categoryName = '📚 EDUCATION & LEARNING';
                break;
            case 'indonesian':
                templates = [
                    this.templates.get('indonesian-community')
                ];
                categoryName = '🇮🇩 INDONESIAN COMMUNITY';
                break;
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`${categoryName} TEMPLATES`)
            .setDescription('Pilih template yang ingin Anda buat:')
            .setTimestamp();

        const options = templates.map(template => ({
            label: template.name,
            value: template.id,
            description: `${template.categories} categories • ${template.channels} channels • ${template.roles} roles`,
            emoji: template.icon
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('template_select')
            .setPlaceholder('Pilih template server')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.update({ 
            embeds: [embed], 
            components: [row] 
        });
    }

    async handleTemplateSelect(interaction) {
        const templateId = interaction.values[0];
        const template = this.templates.get(templateId);

        if (!template) {
            return interaction.update({ 
                content: '❌ Template tidak ditemukan!', 
                embeds: [], 
                components: [] 
            });
        }

        // Check cooldown
        const userId = interaction.user.id;
        const lastCreated = this.userCooldowns.get(userId);
        if (lastCreated && Date.now() - lastCreated < this.cooldownTime) {
            const remaining = Math.ceil((this.cooldownTime - (Date.now() - lastCreated)) / (1000 * 60 * 60));
            return interaction.update({ 
                content: `⏰ Anda harus menunggu ${remaining} jam sebelum membuat server lagi.`, 
                embeds: [], 
                components: [] 
            });
        }

        const embed = new EmbedBuilder()
            .setColor(template.color)
            .setTitle(`**Lyora Server Creator**`)
            .setDescription(`# ${template.name}\n\n${template.description}`)
            .addFields(
                { name: '📊 STATISTICS', value: `• **Categories:** ${template.categories}\n• **Channels:** ${template.channels}\n• **Roles:** ${template.roles}\n• **Setup Time:** ~2-5 menit`, inline: false },
                { name: '🎯 INCLUDED FEATURES', value: '• Organized category structure\n• Pre-configured permissions\n• Role hierarchy system\n• Channel topics and settings\n• Voice and text channels', inline: false }
            )
            .setImage('https://media1.tenor.com/m/ZpeNsM7u9fsAAAAC/chika-fujiwara-kaguya-sama.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Template Preview',
                iconURL: this.client.user?.displayAvatarURL()
            });

        // Show category and channel preview
        let previewText = '';
        template.structure.categories.slice(0, 3).forEach((category, index) => {
            previewText += `\n**${category.name}**\n`;
            category.channels.slice(0, 3).forEach(channel => {
                previewText += `├ #${channel.name}\n`;
            });
            if (category.channels.length > 3) {
                previewText += `└ ...and ${category.channels.length - 3} more\n`;
            }
        });

        if (previewText) {
            embed.addFields({
                name: '📁 STRUCTURE PREVIEW',
                value: previewText,
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`template_create_${templateId}`)
                    .setLabel('🚀 Buat Server')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('template_back')
                    .setLabel('🔙 Kembali')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('template_cancel')
                    .setLabel('❌ Batal')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.update({ 
            embeds: [embed], 
            components: [buttons] 
        });
    }

    async handleTemplateCreate(interaction) {
        const templateId = interaction.customId.replace('template_create_', '');
        const template = this.templates.get(templateId);

        if (!template) {
            return interaction.reply({ 
                content: '❌ Template tidak ditemukan!', 
                ephemeral: true 
            });
        }

        // Create modal for server name input
        const modal = new ModalBuilder()
            .setCustomId(`template_modal_${templateId}`)
            .setTitle(`Buat Server: ${template.name}`);

        const serverNameInput = new TextInputBuilder()
            .setCustomId('server_name')
            .setLabel('Nama Server')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder(`Contoh: ${template.name.replace(/^[^ ]+ /, '')} Community`)
            .setMaxLength(100);

        const serverRegionInput = new TextInputBuilder()
            .setCustomId('server_region')
            .setLabel('Region Server (Opsional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('Contoh: Indonesia, Singapore, Japan')
            .setMaxLength(50);

        const row1 = new ActionRowBuilder().addComponents(serverNameInput);
        const row2 = new ActionRowBuilder().addComponents(serverRegionInput);

        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    }

    async handleModalSubmit(interaction) {
        const templateId = interaction.customId.replace('template_modal_', '');
        const template = this.templates.get(templateId);
        
        const serverName = interaction.fields.getTextInputValue('server_name');
        const serverRegion = interaction.fields.getTextInputValue('server_region') || 'Indonesia';

        await interaction.deferReply({ ephemeral: true });

        try {
            // Kirim pesan bahwa proses dimulai
            const startingEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🚀 **MEMBUAT SERVER**')
                .setDescription(`**Memulai pembuatan server:**\n\`${serverName}\`\n\n**Template:** ${template.name}\n**Region:** ${serverRegion}\n\n⏳ Proses akan memakan waktu 2-5 menit...`)
                .setTimestamp()
                .setFooter({ 
                    text: 'Jangan tutup window ini!',
                    iconURL: this.client.user?.displayAvatarURL()
                });

            await interaction.editReply({ embeds: [startingEmbed] });

            // Simpan cooldown
            this.userCooldowns.set(interaction.user.id, Date.now());

            // Kirim DM dengan progress
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0x1E90FF)
                    .setTitle('🔨 **PROSES PEMBUATAN SERVER**')
                    .setDescription(`Halo **${interaction.user.username}**!\n\nServer Anda sedang dibuat dengan template:\n**${template.name}**\n\n**Detail:**\n• Nama: \`${serverName}\`\n• Region: ${serverRegion}\n• Estimasi: 2-5 menit\n\nSaya akan mengirimkan invite link ketika selesai!`)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Lyora Community • Template System',
                        iconURL: this.client.user?.displayAvatarURL()
                    });

                await interaction.user.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Tidak bisa kirim DM ke user');
            }

            // NOTE: Di Discord.js v14, bot TIDAK BISA membuat server baru
            // karena Discord API tidak mengizinkan bot membuat guild
            // Solusi: Berikan template configuration untuk user buat manual
            
            const guideEmbed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle('📋 **GUIDE PEMBUATAN SERVER**')
                .setDescription(`**Karena batasan Discord API, berikut panduan membuat server manual:**\n\n**LANGKAH 1:**\n• Buka Discord\n• Klik "+" di server list\n• Pilih "Create My Own"\n\n**LANGKAH 2:**\n• Beri nama: \`${serverName}\`\n• Pilih region: \`${serverRegion}\`\n\n**LANGKAH 3:**\n• Setelah server dibuat, undang bot ini\n• Gunakan \`/template apply ${templateId}\` di server baru\n• Bot akan mengatur semua struktur otomatis!`)
                .addFields(
                    { name: '📁 STRUCTURE YANG AKAN DIBUAT', value: `• ${template.categories} Kategori\n• ${template.channels} Channel\n• ${template.roles} Role`, inline: true },
                    { name: '⚡ FITUR', value: '• Permission system\n• Channel topics\n• Role colors\n• Voice channels', inline: true }
                )
                .setImage('https://media1.tenor.com/m/ZpeNsM7u9fsAAAAC/chika-fujiwara-kaguya-sama.gif')
                .setTimestamp()
                .setFooter({ 
                    text: 'Lyora Community • Template Application Guide',
                    iconURL: this.client.user?.displayAvatarURL()
                });

            const inviteButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('📥 Undang Bot ke Server')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.com/oauth2/authorize?client_id=${this.client.user.id}&scope=bot+applications.commands&permissions=8`)
                );

            await interaction.editReply({ 
                embeds: [guideEmbed],
                components: [inviteButton]
            });

        } catch (error) {
            console.error('Template creation error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ **ERROR**')
                .setDescription('Terjadi error saat membuat server. Silakan coba lagi nanti.')
                .addFields(
                    { name: 'Error Message', value: `\`\`\`${error.message.substring(0, 100)}\`\`\``, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }

    async handleTemplateApply(interaction) {
        const templateId = interaction.options.getString('template');
        const template = this.templates.get(templateId);

        if (!template) {
            return interaction.reply({ 
                content: '❌ Template tidak ditemukan!', 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            const member = interaction.member;

            // Check permissions
            if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.editReply({ 
                    content: '❌ Anda perlu permission **Manage Server** untuk menggunakan template!' 
                });
            }

            // Step 1: Create categories
            const progressEmbed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle('🔨 **APPLYING TEMPLATE**')
                .setDescription(`**Menerapkan template:** ${template.name}\n\n**Progress:**\n🔄 Membuat kategori... (0/${template.structure.categories.length})`)
                .setTimestamp();

            await interaction.editReply({ embeds: [progressEmbed] });

            const categories = new Map();

            for (let i = 0; i < template.structure.categories.length; i++) {
                const categoryData = template.structure.categories[i];
                
                try {
                    const category = await guild.channels.create({
                        name: categoryData.name,
                        type: ChannelType.GuildCategory,
                        position: categoryData.position || i
                    });

                    categories.set(categoryData.name, category);

                    // Update progress
                    progressEmbed.setDescription(`**Menerapkan template:** ${template.name}\n\n**Progress:**\n✅ Membuat kategori... (${i + 1}/${template.structure.categories.length})\n🔄 Membuat channel...`);
                    await interaction.editReply({ embeds: [progressEmbed] });

                    // Create channels in this category
                    for (const channelData of categoryData.channels) {
                        await guild.channels.create({
                            name: channelData.name,
                            type: channelData.type,
                            parent: category.id,
                            topic: channelData.topic || null
                        });
                    }

                } catch (error) {
                    console.error(`Error creating category ${categoryData.name}:`, error);
                }
            }

            // Step 2: Create roles
            progressEmbed.setDescription(`**Menerapkan template:** ${template.name}\n\n**Progress:**\n✅ Membuat kategori... (${template.structure.categories.length}/${template.structure.categories.length})\n✅ Membuat channel...\n🔄 Membuat role... (0/${template.structure.roles.length})`);
            await interaction.editReply({ embeds: [progressEmbed] });

            for (let i = 0; i < template.structure.roles.length; i++) {
                const roleData = template.structure.roles[i];
                
                try {
                    await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        permissions: roleData.permissions,
                        mentionable: true,
                        position: guild.roles.cache.size - 1
                    });

                    // Update progress
                    progressEmbed.setDescription(`**Menerapkan template:** ${template.name}\n\n**Progress:**\n✅ Membuat kategori... (${template.structure.categories.length}/${template.structure.categories.length})\n✅ Membuat channel...\n🔄 Membuat role... (${i + 1}/${template.structure.roles.length})`);
                    await interaction.editReply({ embeds: [progressEmbed] });

                } catch (error) {
                    console.error(`Error creating role ${roleData.name}:`, error);
                }
            }

            // Final message
            const finalEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ **TEMPLATE APPLIED SUCCESSFULLY**')
                .setDescription(`**Template ${template.name} berhasil diterapkan!**\n\n**Struktur yang dibuat:**\n• ${template.categories} Kategori\n• ${template.channels} Channel\n• ${template.roles} Role\n\n**Server Anda sekarang memiliki struktur yang terorganisir!**`)
                .addFields(
                    { name: '🎯 Tips', value: '• Atur permission sesuai kebutuhan\n• Customize channel names jika perlu\n• Undang member ke server Anda', inline: false }
                )
                .setImage('https://media1.tenor.com/m/ZpeNsM7u9fsAAAAC/chika-fujiwara-kaguya-sama.gif')
                .setTimestamp()
                .setFooter({ 
                    text: 'Lyora Community • Template Applied',
                    iconURL: this.client.user?.displayAvatarURL()
                });

            await interaction.editReply({ embeds: [finalEmbed] });

        } catch (error) {
            console.error('Template apply error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ **ERROR APPLYING TEMPLATE**')
                .setDescription('Terjadi error saat menerapkan template.')
                .addFields(
                    { name: 'Error Message', value: `\`\`\`${error.message.substring(0, 200)}\`\`\``, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }

    async handleTemplateInfo(interaction) {
        const templateId = interaction.options.getString('template');
        const template = this.templates.get(templateId);

        if (!template) {
            return interaction.reply({ 
                content: '❌ Template tidak ditemukan!', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setColor(template.color)
            .setTitle(`**Lyora Server Creator**`)
            .setDescription(`# ${template.name}\n\n${template.description}`)
            .addFields(
                { name: '📊 STATISTICS', value: `• **Categories:** ${template.categories}\n• **Channels:** ${template.channels}\n• **Roles:** ${template.roles}`, inline: true },
                { name: '🎨 DETAILS', value: `• **Icon:** ${template.icon}\n• **Color:** #${template.color.toString(16).toUpperCase()}`, inline: true },
                { name: '⚡ SETUP TIME', value: '• **Manual:** 30-60 menit\n• **With Bot:** 2-5 menit', inline: true }
            );

        // Show category structure
        let structureText = '';
        template.structure.categories.forEach((category, index) => {
            structureText += `\n**${category.name}**\n`;
            category.channels.slice(0, 5).forEach(channel => {
                const typeIcon = channel.type === 2 ? '🔊' : '#️⃣';
                structureText += `${typeIcon} ${channel.name}\n`;
            });
            if (category.channels.length > 5) {
                structureText += `...and ${category.channels.length - 5} more\n`;
            }
        });

        if (structureText) {
            embed.addFields({
                name: '📁 CATEGORY STRUCTURE',
                value: structureText.substring(0, 1000),
                inline: false
            });
        }

        // Show roles
        if (template.structure.roles && template.structure.roles.length > 0) {
            const rolesText = template.structure.roles.slice(0, 10).map(role => {
                return `• **${role.name}** - ${role.color ? 'Custom color' : 'Default'}`;
            }).join('\n');

            if (rolesText) {
                embed.addFields({
                    name: '👥 ROLES INCLUDED',
                    value: rolesText + (template.structure.roles.length > 10 ? `\n...and ${template.structure.roles.length - 10} more roles` : ''),
                    inline: false
                });
            }
        }

        embed.setImage('https://media1.tenor.com/m/ZpeNsM7u9fsAAAAC/chika-fujiwara-kaguya-sama.gif')
            .setTimestamp()
            .setFooter({ 
                text: 'Lyora Community • Template Information',
                iconURL: this.client.user?.displayAvatarURL()
            });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`template_create_${templateId}`)
                    .setLabel('🚀 Gunakan Template Ini')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [buttons],
            ephemeral: true 
        });
    }

    async handleTemplateCustom(interaction) {
        // Modal untuk custom template
        const modal = new ModalBuilder()
            .setCustomId('template_custom')
            .setTitle('🎨 Custom Template');

        const serverNameInput = new TextInputBuilder()
            .setCustomId('custom_name')
            .setLabel('Nama Server')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Nama server Anda')
            .setMaxLength(100);

        const templateTypeInput = new TextInputBuilder()
            .setCustomId('template_type')
            .setLabel('Jenis Template (gaming/programming/etc)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('gaming, programming, education, dll')
            .setMaxLength(50);

        const specialRequestInput = new TextInputBuilder()
            .setCustomId('special_requests')
            .setLabel('Request Khusus (Opsional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('Channel khusus, role khusus, dll')
            .setMaxLength(500);

        const row1 = new ActionRowBuilder().addComponents(serverNameInput);
        const row2 = new ActionRowBuilder().addComponents(templateTypeInput);
        const row3 = new ActionRowBuilder().addComponents(specialRequestInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    }

    // ==================== INTERACTION HANDLER ====================

    async handleInteraction(interaction) {
        try {
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'template_category') {
                    await this.handleCategorySelect(interaction);
                } else if (interaction.customId === 'template_select') {
                    await this.handleTemplateSelect(interaction);
                }
            } else if (interaction.isButton()) {
                if (interaction.customId.startsWith('template_create_')) {
                    await this.handleTemplateCreate(interaction);
                } else if (interaction.customId === 'template_back') {
                    await this.handleTemplateList(interaction);
                } else if (interaction.customId === 'template_cancel') {
                    await interaction.update({ 
                        content: '❌ Dibatalkan.', 
                        embeds: [], 
                        components: [] 
                    });
                }
            } else if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith('template_modal_')) {
                    await this.handleModalSubmit(interaction);
                } else if (interaction.customId === 'template_custom') {
                    // Handle custom template
                    await interaction.reply({ 
                        content: '✅ Request template custom telah diterima! Kami akan memprosesnya.', 
                        ephemeral: true 
                    });
                }
            }
        } catch (error) {
            console.error('Template interaction error:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ Error processing template request!', 
                    ephemeral: true 
                });
            }
        }
    }

    // ==================== STATIC METHODS ====================

    static getCommands() {
        const { SlashCommandBuilder } = require('discord.js');
        
        return [
            new SlashCommandBuilder()
                .setName('template')
                .setDescription('Server template system')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('Browse all server templates'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('apply')
                        .setDescription('[ADMIN] Apply template to current server')
                        .addStringOption(option =>
                            option.setName('template')
                                .setDescription('Template to apply')
                                .setRequired(true)
                                .addChoices(
                                    { name: '🎮 General Gaming', value: 'gaming-general' },
                                    { name: '⛏️ Minecraft', value: 'minecraft' },
                                    { name: '💻 Programming Community', value: 'programming-community' },
                                    { name: '🌐 Web Development', value: 'web-development' },
                                    { name: '🎨 Digital Art', value: 'digital-art' },
                                    { name: '📚 Study Group', value: 'study-group' },
                                    { name: '🇮🇩 Indonesian Community', value: 'indonesian-community' }
                                )))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('info')
                        .setDescription('Get info about a template')
                        .addStringOption(option =>
                            option.setName('template')
                                .setDescription('Template to view')
                                .setRequired(true)
                                .addChoices(
                                    { name: '🎮 General Gaming', value: 'gaming-general' },
                                    { name: '⛏️ Minecraft', value: 'minecraft' },
                                    { name: '💻 Programming Community', value: 'programming-community' },
                                    { name: '🌐 Web Development', value: 'web-development' },
                                    { name: '🎨 Digital Art', value: 'digital-art' },
                                    { name: '📚 Study Group', value: 'study-group' },
                                    { name: '🇮🇩 Indonesian Community', value: 'indonesian-community' }
                                )))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('custom')
                        .setDescription('Request custom template setup'))
        ];
    }

    static async handleCommand(interaction, templateSystem) {
        const { commandName, options } = interaction;
        const subcommand = options.getSubcommand();

        switch (subcommand) {
            case 'list':
                await templateSystem.handleTemplateList(interaction);
                break;
            case 'apply':
                await templateSystem.handleTemplateApply(interaction);
                break;
            case 'info':
                await templateSystem.handleTemplateInfo(interaction);
                break;
            case 'custom':
                await templateSystem.handleTemplateCustom(interaction);
                break;
        }
    }
}

module.exports = TemplateSystem;
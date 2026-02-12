// welcome.js - DIPERBARUI untuk kompatibilitas Android
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
// Ganti canvas dengan alternatif yang kompatibel
let Canvas;
try {
    // Coba gunakan @napi-rs/canvas (lebih kompatibel)
    Canvas = require('@napi-rs/canvas');
} catch (error) {
    console.warn('@napi-rs/canvas tidak tersedia, menggunakan fallback...');
    Canvas = null;
}

const CONFIG_PATH = path.join(__dirname, 'welcome_config.json');

// Default welcome configuration (sama seperti sebelumnya)
const defaultConfig = {
    welcomeChannel: null,
    welcomeMessage: '🎉 **WELCOME TO THE SERVER!**\n\nWe\'re excited to have you here! Make sure to read the rules and introduce yourself!',
    welcomeEmbed: true,
    welcomeRole: null,
    goodbyeChannel: null,
    goodbyeMessage: '👋 **GOODBYE**\n\n{user} has left the server. We\'ll miss you!',
    autoRole: null,
    welcomeImage: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NjN4dXJuNjlsZXR0ZGpmZnpyb3RrdzhjZGUwcjZ0eTA0NW14bjN4YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vRHKYJFbMNapxHnp6x/giphy.gif',
    rulesChannel: null,
    announcementChannel: null,
    welcomeColor: 0x1E90FF
};

async function loadWelcomeConfig(client) {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        const configs = JSON.parse(data);
        
        for (const [guildId, config] of Object.entries(configs)) {
            client.welcomeConfig.set(guildId, config);
        }
        
        console.log(`✅ Loaded welcome config for ${Object.keys(configs).length} guilds`);
    } catch (error) {
        console.log('📝 No welcome config found, creating default...');
        await fs.writeFile(CONFIG_PATH, JSON.stringify({}, null, 2));
    }
}

async function saveWelcomeConfig(client) {
    const configs = {};
    client.welcomeConfig.forEach((config, guildId) => {
        configs[guildId] = config;
    });
    
    await fs.writeFile(CONFIG_PATH, JSON.stringify(configs, null, 2));
}

async function createWelcomeImage(member) {
    try {
        // Jika Canvas tidak tersedia, return null untuk menggunakan fallback
        if (!Canvas) {
            console.log('Canvas tidak tersedia, menggunakan fallback image...');
            return null;
        }
        
        // Buat canvas untuk welcome image
        const canvas = Canvas.createCanvas(800, 300);
        const ctx = canvas.getContext('2d');

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 800, 300);
        gradient.addColorStop(0, '#1E90FF');
        gradient.addColorStop(1, '#4169E1');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 300);

        // Tambah pattern/design
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.random() * 800,
                Math.random() * 300,
                Math.random() * 30 + 10,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // Load user avatar
        const avatarUrl = member.user.displayAvatarURL({ extension: 'jpg', size: 256 });
        const response = await fetch(avatarUrl);
        const avatarBuffer = await response.arrayBuffer();
        const avatar = await Canvas.loadImage(Buffer.from(avatarBuffer));
        
        // Gambar avatar dengan frame lingkaran
        ctx.save();
        ctx.beginPath();
        ctx.arc(150, 150, 80, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        // Gambar avatar
        ctx.drawImage(avatar, 70, 70, 160, 160);
        ctx.restore();

        // Tambah border pada avatar
        ctx.beginPath();
        ctx.arc(150, 150, 82, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        // Teks welcome
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px "Arial"';
        ctx.textAlign = 'left';
        ctx.fillText('WELCOME', 300, 120);

        // Username
        ctx.font = '28px "Arial"';
        ctx.fillText(member.user.username, 300, 160);

        // Server name
        ctx.font = '24px "Arial"';
        ctx.fillStyle = '#F0F0F0';
        ctx.fillText(`to ${member.guild.name}`, 300, 200);

        // Member count
        ctx.font = '20px "Arial"';
        ctx.fillStyle = '#D0D0D0';
        ctx.fillText(`Member #${member.guild.memberCount}`, 300, 240);

        return canvas.toBuffer();
    } catch (error) {
        console.error('Error creating welcome image:', error);
        return null;
    }
}

async function sendWelcomeMessage(member, client) {
    const guildId = member.guild.id;
    const config = client.welcomeConfig.get(guildId) || defaultConfig;
    
    if (!config.welcomeChannel) return;
    
    const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannel);
    if (!welcomeChannel) return;
    
    try {
        // Coba buat welcome image custom
        const welcomeImageBuffer = await createWelcomeImage(member);
        
        // Buat embed dengan desain mirip Koya Bot
        const embed = new EmbedBuilder()
            .setColor(config.welcomeColor || 0x1E90FF)
            .setTitle('🎉 **WELCOME TO THE SERVER!**')
            .setDescription(`**Hello <@${member.id}>!** Welcome to **${member.guild.name}**!`)
            .addFields(
                {
                    name: '📝 **ACCOUNT INFO**',
                    value: `**Username:** ${member.user.tag}\n**Created:** <t:${Math.floor(member.user.createdTimestamp/1000)}:R>\n**ID:** \`${member.user.id}\``,
                    inline: true
                },
                {
                    name: '📊 **SERVER INFO**',
                    value: `**Members:** ${member.guild.memberCount}\n**Joined:** <t:${Math.floor(Date.now()/1000)}:R>\n**Position:** #${member.guild.memberCount}`,
                    inline: true
                }
            )
            .setImage(config.welcomeImage || 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NjN4dXJuNjlsZXR0ZGpmZnpyb3RrdzhjZGUwcjZ0eTA0NW14bjN4YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vRHKYJFbMNapxHnp6x/giphy.gif')
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            .setTimestamp()
            .setFooter({ 
                text: `${member.guild.name} • Welcome System`,
                iconURL: member.guild.iconURL()
            });

        // Additional info field
        embed.addFields({
            name: '📋 **GET STARTED**',
            value: '1. Read the rules in <#1452019807607324733>\n2. Check out the announcements\n3. Introduce yourself!\n4. Have fun and be respectful!',
            inline: false
        });

        // Jika ada custom image, upload sebagai attachment
        let messageOptions = { 
            content: `🎉 **A NEW MEMBER HAS ARRIVED!**\nSelamat datang <@${member.id}> Kami berharap server ini dapat menjadi tempat yang nyaman untuk berdiskusi, berbagi informasi, dan berinteraksi secara positif.\nSilakan membaca peraturan server sebelum berpartisipasi.\n\nTerima kasih dan selamat bergabung.`,
            embeds: [embed]
        };

        if (welcomeImageBuffer) {
            messageOptions.files = [{
                attachment: welcomeImageBuffer,
                name: 'welcome.png'
            }];
        }

        // Kirim welcome message
        await welcomeChannel.send(messageOptions);

        // Assign welcome role
        if (config.welcomeRole) {
            try {
                const role = member.guild.roles.cache.get(config.welcomeRole);
                if (role) {
                    await member.roles.add(role);
                    console.log(`✅ Assigned welcome role to ${member.user.tag}`);
                }
            } catch (error) {
                console.error('Error assigning welcome role:', error.message);
            }
        }

        // Assign auto role
        if (config.autoRole) {
            try {
                const role = member.guild.roles.cache.get(config.autoRole);
                if (role) {
                    await member.roles.add(role);
                    console.log(`✅ Assigned auto role to ${member.user.tag}`);
                }
            } catch (error) {
                console.error('Error assigning auto role:', error.message);
            }
        }

        // Kirim DM welcome
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle(`🎉 Welcome to ${member.guild.name}!`)
                .setDescription(`Hello **${member.user.username}**! Thanks for joining **${member.guild.name}**!`)
                .addFields(
                    { name: '📝 Important Channels', value: `• Rules: <#1452019807607324733>\n• Announcements: ${config.announcementChannel ? `<#${config.announcementChannel}>` : 'Check <#1430391402449207346>'}\n• Welcome: <#${config.welcomeChannel}>` },
                    { name: '🤝 Community Guidelines', value: '• Be respectful to everyone\n• No spam or self-promotion\n• Keep conversations appropriate\n• Have fun and make friends!' }
                )
                .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NjN4dXJuNjlsZXR0ZGpmZnpyb3RrdzhjZGUwcjZ0eTA0NW14bjN4YiZlcD12MV9naWWfzX3NlYXJjaCZjdD1n/vRHKYJFbMNapxHnp6x/giphy.gif')
                .setFooter({ text: 'We\'re glad to have you here!' })
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log(`Could not send DM to ${member.user.tag}`);
        }

    } catch (error) {
        console.error('Error sending welcome message:', error.message);
    }
}

async function sendGoodbyeMessage(member, client) {
    const guildId = member.guild.id;
    const config = client.welcomeConfig.get(guildId) || defaultConfig;
    
    if (!config.goodbyeChannel) return;
    
    const goodbyeChannel = member.guild.channels.cache.get(config.goodbyeChannel);
    if (!goodbyeChannel) return;
    
    try {
        const message = config.goodbyeMessage
            .replace(/{user}/g, member.user.tag)
            .replace(/{server}/g, member.guild.name)
            .replace(/{memberCount}/g, member.guild.memberCount)
            .replace(/{username}/g, member.user.username);

        const embed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle('👋 **MEMBER LEFT**')
            .setDescription(message)
            .addFields(
                { 
                    name: '📅 **JOINED**', 
                    value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime()/1000)}:R>` : 'Unknown', 
                    inline: true 
                },
                { 
                    name: '👥 **MEMBERS LEFT**', 
                    value: member.guild.memberCount.toString(), 
                    inline: true 
                },
                { 
                    name: '📊 **STATS**', 
                    value: `Roles: ${member.roles.cache.size - 1}\nAccount Age: <t:${Math.floor(member.user.createdTimestamp/1000)}:R>`, 
                    inline: true 
                }
            )
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NjN4dXJuNjlsZXR0ZGpmZnpyb3RrdzhjZGUwcjZ0eTA0NW14bjN4YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vRHKYJFbMNapxHnp6x/giphy.gif')
            .setFooter({ 
                text: `${member.guild.name} • We'll miss you!`,
                iconURL: member.guild.iconURL()
            })
            .setTimestamp();

        await goodbyeChannel.send({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error sending goodbye message:', error.message);
    }
}

async function setupWelcomeSystem(guildId, config, client) {
    const mergedConfig = { ...defaultConfig, ...config };
    client.welcomeConfig.set(guildId, mergedConfig);
    await saveWelcomeConfig(client);
    
    console.log(`✅ Welcome system configured for guild ${guildId}`);
    return true;
}

// Fungsi untuk test welcome
async function testWelcome(interaction, client) {
    const member = interaction.member;
    await sendWelcomeMessage(member, client);
}

module.exports = {
    loadWelcomeConfig,
    saveWelcomeConfig,
    sendWelcomeMessage,
    sendGoodbyeMessage,
    setupWelcomeSystem,
    testWelcome,
    defaultConfig,
    createWelcomeImage
};
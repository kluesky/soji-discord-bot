// whatsapp-bridge.js - WhatsApp & Discord Integration V3.7.0
// BY: Lyora Community
// FIXED: Connection loop + removeAllListeners error + logout handling

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ChannelType,
    PermissionFlagsBits,
    AttachmentBuilder
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// WA Library
const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    downloadContentFromMessage,
    getContentType
} = require('@whiskeysockets/baileys');
const P = require('pino');
const NodeCache = require('node-cache');
const QRCode = require('qrcode');
const sharp = require('sharp');
const axios = require('axios');

// ==================== AI GEMINI 1.5 FLASH ====================
const { GoogleGenerativeAI } = require('@google/generative-ai');

class WhatsAppBridge {
    constructor(client) {
        this.client = client;
        this.name = 'whatsapp';
        this.version = '3.7.0';
        this.description = '✅ WhatsApp Bridge - FIXED Connection & Logout!';
        
        // Paths
        this.configPath = path.join(__dirname, 'data', 'whatsapp_config.json');
        this.authPath = path.join(__dirname, 'data', 'wa_auth_info');
        this.stickerPath = path.join(__dirname, 'data', 'wa_stickers');
        this.qrPath = path.join(__dirname, 'data', 'wa_qr');
        this.viewoncePath = path.join(__dirname, 'data', 'wa_viewonce');
        
        // State
        this.sock = null;
        this.connected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 3;
        this.isConnecting = false;
        this.qrCode = null;
        this.qrChannelId = null;
        this.qrMessageId = null;
        this.bridgeChannels = new Map(); // Personal chat
        this.groupBridges = new Map();   // Group chat
        
        // Anti View-Once
        this.viewOnceEnabled = false;
        this.viewOnceChannelId = null;
        
        // Cache
        this.msgCache = new NodeCache({ stdTTL: 300 });
        
        // Config
        this.config = null;
        
        // ==================== AI GEMINI 1.5 FLASH ====================
        this.aiEnabled = false;
        this.aiChannelId = null;
        this.aiPrompt = `Kamu adalah asisten WhatsApp untuk server Discord "Lyora Community". 
Kamu ramah, informatif, dan menjawab dalam bahasa Indonesia yang santai tapi profesional. 
Jawab pertanyaan user dengan jelas dan ringkas. Gunakan emoji sesekali agar lebih ramah.`;
        this.aiModel = null;
        
        // API KEY GEMINI
        const GEMINI_API_KEY = 'AIzaSyA4Hi04ZRKQs54tRoX6_-__nZRuCglHmXc';
        this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        
        try {
            this.aiModel = this.genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash",
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500,
                    topP: 0.9,
                    topK: 40
                }
            });
            console.log('🤖 Gemini 1.5 Flash AI Ready!');
        } catch (error) {
            console.error('❌ Gemini AI Error:', error.message);
            this.aiModel = null;
        }
        
        this.init();
    }

    async init() {
        console.log('\n' + '✅'.repeat(40));
        console.log('📱 WhatsApp Bridge V3.7.0 - FIXED!');
        console.log('✅ Sticker Maker • AI Auto-Responder • Bridge Grup • Anti View-Once');
        console.log('✅'.repeat(40) + '\n');
        
        await this.ensureDirectories();
        await this.loadConfig();
        
        if (this.config?.autoConnect) {
            setTimeout(() => this.connect(), 3000);
        }
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.authPath, { recursive: true });
            await fs.mkdir(this.stickerPath, { recursive: true });
            await fs.mkdir(this.qrPath, { recursive: true });
            await fs.mkdir(this.viewoncePath, { recursive: true });
        } catch (error) {
            console.error('Directory error:', error.message);
        }
    }

    async loadConfig() {
        try {
            const defaultConfig = {
                autoConnect: false,
                bridgeChannels: {},
                groupBridges: {},
                stickerQuality: 80,
                stickerPackName: 'Discord Stickers',
                stickerPackAuthor: 'Lyora Bot',
                autoReconnect: true,
                aiEnabled: false,
                aiChannelId: null,
                aiPrompt: this.aiPrompt,
                viewOnceEnabled: false,
                viewOnceChannelId: null
            };
            
            const data = await fs.readFile(this.configPath, 'utf8').catch(async () => {
                await fs.writeFile(this.configPath, JSON.stringify(defaultConfig, null, 2));
                return JSON.stringify(defaultConfig);
            });
            
            this.config = { ...defaultConfig, ...JSON.parse(data) };
            
            // Load personal bridges
            this.bridgeChannels.clear();
            if (this.config.bridgeChannels) {
                Object.entries(this.config.bridgeChannels).forEach(([k, v]) => this.bridgeChannels.set(k, v));
            }
            
            // Load group bridges
            this.groupBridges.clear();
            if (this.config.groupBridges) {
                Object.entries(this.config.groupBridges).forEach(([k, v]) => this.groupBridges.set(k, v));
            }
            
            // Load AI config
            this.aiEnabled = this.config.aiEnabled || false;
            this.aiChannelId = this.config.aiChannelId || null;
            if (this.config.aiPrompt) this.aiPrompt = this.config.aiPrompt;
            
            // Load Anti View-Once config
            this.viewOnceEnabled = this.config.viewOnceEnabled || false;
            this.viewOnceChannelId = this.config.viewOnceChannelId || null;
            
            console.log(`📱 Loaded ${this.bridgeChannels.size} personal bridges`);
            console.log(`📱 Loaded ${this.groupBridges.size} group bridges`);
            console.log(`🤖 AI Auto-Responder: ${this.aiEnabled ? '✅ ACTIVE' : '❌ INACTIVE'}`);
            console.log(`👁️ Anti View-Once: ${this.viewOnceEnabled ? '✅ ACTIVE' : '❌ INACTIVE'}`);
            
        } catch (error) {
            console.error('Config error:', error.message);
            this.config = defaultConfig;
        }
    }

    async saveConfig() {
        try {
            this.config.bridgeChannels = Object.fromEntries(this.bridgeChannels);
            this.config.groupBridges = Object.fromEntries(this.groupBridges);
            this.config.aiEnabled = this.aiEnabled;
            this.config.aiChannelId = this.aiChannelId;
            this.config.aiPrompt = this.aiPrompt;
            this.config.viewOnceEnabled = this.viewOnceEnabled;
            this.config.viewOnceChannelId = this.viewOnceChannelId;
            await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Save error:', error.message);
        }
    }

    // ==================== NORMALIZE NUMBER FUNCTION ====================
    normalizeNumber(num) {
        if (!num) return 'unknown';
        let cleaned = num.split('@')[0].replace(/\D/g, '');
        return cleaned || 'unknown';
    }

    // ==================== IS GROUP FUNCTION ====================
    isGroupChat(jid) {
        if (!jid) return false;
        return jid.includes('@g.us') || 
               jid.endsWith('@g.us') ||
               jid.includes('@whatsapp.net') || 
               jid.split('@')[0].includes('-') ||
               (jid.includes('-') && jid.includes('@'));
    }

    // ==================== CONNECTION ====================
    async connect() {
        if (this.isConnecting) {
            console.log('📱 Already connecting...');
            return false;
        }

        try {
            this.isConnecting = true;
            this.connectionAttempts++;

            if (this.connectionAttempts > this.maxRetries) {
                console.log('📱 Max retries reached');
                this.isConnecting = false;
                return false;
            }

            console.log(`📱 Connecting... (${this.connectionAttempts}/${this.maxRetries})`);

            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
            const { version } = await fetchLatestBaileysVersion();

            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
                },
                printQRInTerminal: true,
                browser: Browsers.appropriate('Discord Bot'),
                syncFullHistory: false,
                logger: P({ level: 'silent' }),
                defaultQueryTimeoutMs: undefined
            });

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr && !this.connected) {
                    this.qrCode = qr;
                    await this.generateQRCode(qr);
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    
                    this.connected = false;
                    this.isConnecting = false;
                    
                    // 🔥 FIX: Cek dulu sebelum remove listeners
                    if (this.sock) {
                        try {
                            this.sock.removeAllListeners();
                        } catch (e) {
                            console.log('📱 Error removing listeners:', e.message);
                        }
                        this.sock = null;
                    }

                    if (statusCode === DisconnectReason.loggedOut) {
                        console.log('📱 Logged out');
                        await this.logout();
                    } 
                    else if (statusCode === 440) {
                        console.log('📱 Connected from another device');
                        this.config.autoConnect = false;
                        await this.saveConfig();
                    }
                    else if (this.config.autoReconnect) {
                        console.log('📱 Reconnecting in 5 seconds...');
                        setTimeout(() => this.connect(), 5000);
                    }
                }

                if (connection === 'open') {
                    setTimeout(async () => {
                        if (!this.sock?.user) {
                            console.log('📱 User data not ready, waiting 1 more second...');
                            setTimeout(async () => {
                                if (!this.sock?.user) {
                                    console.log('📱 Still no user data, but marking as connected');
                                }
                                this.connected = true;
                                this.connectionAttempts = 0;
                                this.qrCode = null;
                                this.isConnecting = false;
                                this.config.autoConnect = true;
                                await this.saveConfig();
                                
                                console.log('\n' + '✅'.repeat(30));
                                console.log(`📱✅ WHATSAPP CONNECTED!`);
                                console.log(`📱 ${this.sock?.user?.name || 'Unknown'}`);
                                console.log(`📱 ${this.sock?.user?.id?.split(':')[0] || 'Unknown'}`);
                                console.log('✅'.repeat(30) + '\n');
                            }, 1000);
                            return;
                        }
                        
                        this.connected = true;
                        this.connectionAttempts = 0;
                        this.qrCode = null;
                        this.isConnecting = false;
                        this.config.autoConnect = true;
                        await this.saveConfig();
                        
                        console.log('\n' + '✅'.repeat(30));
                        console.log(`📱✅ WHATSAPP CONNECTED!`);
                        console.log(`📱 ${this.sock.user.name}`);
                        console.log(`📱 ${this.sock.user.id.split(':')[0]}`);
                        console.log('✅'.repeat(30) + '\n');
                    }, 2000);
                }
            });

            this.sock.ev.on('creds.update', saveCreds);
            this.sock.ev.on('messages.upsert', async (m) => {
                await this.handleIncomingMessage(m);
            });

            this.isConnecting = false;
            return true;

        } catch (error) {
            console.error('Connection error:', error.message);
            this.isConnecting = false;
            return false;
        }
    }

    // ==================== LOGOUT FIXED ====================
    async logout() {
        try {
            this.connected = false;
            this.isConnecting = false;
            this.qrCode = null;
            this.connectionAttempts = 0;
            this.config.autoConnect = false;
            
            // 🔥 FIX: Cek dulu apakah sock ada sebelum panggil method
            if (this.sock) {
                try {
                    this.sock.removeAllListeners();
                    this.sock.end();
                } catch (e) {
                    console.log('📱 Error saat cleanup socket:', e.message);
                }
                this.sock = null;
            }
            
            await this.saveConfig();
            await fs.rm(this.authPath, { recursive: true, force: true }).catch(() => {});
            await fs.mkdir(this.authPath, { recursive: true }).catch(() => {});
            
            return true;
        } catch (error) {
            console.error('Logout error:', error.message);
            return false;
        }
    }

    async generateQRCode(qr) {
        if (!this.qrChannelId) return;
        
        try {
            const channel = this.client.channels.cache.get(this.qrChannelId);
            if (!channel) return;

            const qrBuffer = await QRCode.toBuffer(qr, { type: 'png', width: 400 });
            
            const embed = new EmbedBuilder()
                .setColor(0x25D366)
                .setTitle('📱 **WHATSAPP QR CODE**')
                .setDescription('Scan QR ini dengan WhatsApp untuk login!')
                .setImage('attachment://qr.png')
                .setFooter({ text: 'QR Code expired dalam 60 detik' })
                .setTimestamp();

            if (this.qrMessageId) {
                try {
                    const oldMsg = await channel.messages.fetch(this.qrMessageId);
                    await oldMsg.edit({ 
                        embeds: [embed], 
                        files: [{ attachment: qrBuffer, name: 'qr.png' }] 
                    });
                } catch {
                    const msg = await channel.send({ 
                        embeds: [embed], 
                        files: [{ attachment: qrBuffer, name: 'qr.png' }] 
                    });
                    this.qrMessageId = msg.id;
                }
            } else {
                const msg = await channel.send({ 
                    embeds: [embed], 
                    files: [{ attachment: qrBuffer, name: 'qr.png' }] 
                });
                this.qrMessageId = msg.id;
            }
        } catch (error) {
            console.error('QR error:', error.message);
        }
    }

    // ==================== STICKER MAKER ====================
    async createSticker(imageBuffer, options = {}) {
        try {
            const {
                quality = this.config.stickerQuality || 80,
                pack = this.config.stickerPackName || 'Discord Stickers',
                author = this.config.stickerPackAuthor || 'Lyora Bot',
                circle = false,
                crop = false
            } = options;

            let processedImage = sharp(imageBuffer);

            processedImage = processedImage.resize(512, 512, {
                fit: crop ? 'cover' : 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            });

            if (circle) {
                const circleBuffer = await sharp({
                    create: {
                        width: 512,
                        height: 512,
                        channels: 4,
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    }
                })
                .composite([{
                    input: await processedImage.png().toBuffer(),
                    blend: 'dest-in'
                }])
                .png()
                .toBuffer();

                processedImage = sharp(circleBuffer);
            }

            const stickerBuffer = await processedImage
                .webp({ quality, effort: 6 })
                .toBuffer();

            const fileName = `sticker_${Date.now()}.webp`;
            const filePath = path.join(this.stickerPath, fileName);
            await fs.writeFile(filePath, stickerBuffer);

            return {
                buffer: stickerBuffer,
                path: filePath,
                fileName,
                pack,
                author
            };

        } catch (error) {
            console.error('Sticker error:', error.message);
            throw error;
        }
    }

    async sendStickerToWA(jid, stickerData) {
        try {
            await this.sock.sendMessage(jid, {
                sticker: stickerData.buffer,
                mimetype: 'image/webp',
                contextInfo: {
                    externalAdReply: {
                        title: stickerData.pack,
                        body: stickerData.author,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        thumbnailUrl: 'https://files.catbox.moe/pvwbc6.jpg'
                    }
                }
            });
            return true;
        } catch (error) {
            console.error('Send sticker error:', error.message);
            return false;
        }
    }

    // ==================== AI GEMINI RESPONDER ====================
    async generateAIResponse(message) {
        try {
            if (!this.aiModel) return null;
            
            const prompt = `${this.aiPrompt}\n\nPesan dari user: ${message}\n\nRespon:`;
            const result = await this.aiModel.generateContent(prompt);
            const response = result.response.text();
            
            return response;
        } catch (error) {
            console.error('AI Generate Error:', error.message);
            return null;
        }
    }

    async handleAIResponse(waNumber, userMessage) {
        try {
            console.log(`🤖 [AI] Processing message from ${this.normalizeNumber(waNumber)}: "${userMessage.substring(0, 30)}..."`);
            
            const aiResponse = await this.generateAIResponse(userMessage);
            if (!aiResponse) {
                console.error('❌ [AI] Failed to generate response');
                return false;
            }
            
            console.log(`📤 [AI] Sending response to ${this.normalizeNumber(waNumber)}: "${aiResponse.substring(0, 30)}..."`);
            
            const sentMessage = await this.sock.sendMessage(waNumber, { 
                text: `🤖 *[AI Auto-Reply]*\n\n${aiResponse}` 
            });
            
            console.log(`✅ [AI] Message sent successfully! Message ID: ${sentMessage?.key?.id || 'unknown'}`);
            
            // Log ke Discord kalo ada channel
            if (this.aiChannelId) {
                const channel = this.client.channels.cache.get(this.aiChannelId);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor(0x4285F4)
                        .setTitle('🤖 **AI RESPONSE**')
                        .addFields(
                            { name: '📱 From', value: `\`${this.normalizeNumber(waNumber)}\``, inline: true },
                            { name: '📨 Message', value: `\`\`\`${userMessage.substring(0, 200)}\`\`\``, inline: false },
                            { name: '💬 Response', value: `\`\`\`${aiResponse.substring(0, 200)}\`\`\``, inline: false },
                            { name: '✅ Status', value: '✅ DELIVERED', inline: true }
                        )
                        .setFooter({ text: `Message ID: ${sentMessage?.key?.id || 'unknown'}` })
                        .setTimestamp();
                    
                    await channel.send({ embeds: [embed] }).catch(() => {});
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ [AI] Send Error:', error);
            return false;
        }
    }

    // ==================== INCOMING MESSAGE HANDLER ====================
    async handleIncomingMessage(m) {
        try {
            if (!m.messages?.length) return;
            if (!this.connected || !this.sock) return;
            
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;
            
            const chatId = msg.key.remoteJid;
            const isGroup = this.isGroupChat(chatId);
            const sender = isGroup ? msg.key.participant : chatId;
            const senderNumber = this.normalizeNumber(sender);
            const pushName = msg.pushName || senderNumber;
            
            const messageType = getContentType(msg.message);
            
            let text = msg.message.conversation || 
                      msg.message.extendedTextMessage?.text || 
                      msg.message.imageMessage?.caption || 
                      msg.message.videoMessage?.caption || 
                      '📎 Media';
            
            console.log(`📱 [WA] ${isGroup ? '👥 GROUP' : '👤 PERSONAL'} from ${pushName} (${senderNumber}): "${text.substring(0, 50)}..."`);
            
            // ===== BRIDGE TO DISCORD =====
            let channelId = null;
            let isBridged = false;

            // Cek di personal bridges
            for (const [bridgeJid, bridgeChannelId] of this.bridgeChannels) {
                const bridgeNumber = this.normalizeNumber(bridgeJid);
                if (bridgeNumber === senderNumber) {
                    channelId = bridgeChannelId;
                    isBridged = true;
                    console.log(`✅ Match found! Bridge: ${bridgeNumber} -> ${bridgeChannelId}`);
                    break;
                }
            }

            // Cek di group bridges (kalo grup)
            if (!channelId && isGroup) {
                channelId = this.groupBridges.get(chatId);
                isBridged = !!channelId;
                if (isBridged) console.log(`✅ Group match found!`);
            }
            
            // Kirim ke Discord kalo ada channel
            if (channelId) {
                const channel = this.client.channels.cache.get(channelId);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor(isGroup ? 0x9B59B6 : 0x25D366)
                        .setAuthor({ 
                            name: isGroup ? `👥 ${pushName} (Grup)` : `📱 ${pushName}`, 
                            iconURL: 'https://files.catbox.moe/pvwbc6.jpg' 
                        })
                        .setDescription(`\`\`\`${text}\`\`\``)
                        .setFooter({ text: isGroup ? `WhatsApp Grup • ${chatId.split('@')[0]}` : `WhatsApp • ${senderNumber}` })
                        .setTimestamp(msg.messageTimestamp * 1000);
                    
                    await channel.send({ embeds: [embed] }).catch(() => {});
                    console.log(`✅ Embed sent to <#${channelId}>`);
                }
            }
            
            // ===== AUTO AI RESPONDER (HANYA UNTUK PERSONAL) =====
            if (!isGroup && this.aiEnabled && this.connected && this.sock && !msg.key.fromMe) {
                if (!isBridged && text.length > 2) {
                    console.log(`🤖 [AI] Triggered for ${pushName} (non-bridged)`);
                    await this.handleAIResponse(chatId, text);
                } else if (isBridged && (text.toLowerCase().includes('bot') || text.includes('?'))) {
                    console.log(`🤖 [AI] Triggered for ${pushName} (bridged) - keyword detected`);
                    await this.handleAIResponse(chatId, text);
                }
            }
            
        } catch (error) {
            console.error('❌ Message error:', error);
        }
    }

    // ==================== GROUP BRIDGE COMMANDS ====================
    async handleGroupAdd(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        let groupId = interaction.options.getString('group_id');
        const channel = interaction.options.getChannel('channel');

        try {
            if (!groupId.includes('@g.us') && !groupId.includes('@whatsapp.net')) {
                groupId = groupId.replace(/\D/g, '');
                groupId = `${groupId}@g.us`;
            }

            this.groupBridges.set(groupId, channel.id);
            await this.saveConfig();

            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle('✅ **GRUP BRIDGE ADDED**')
                .setDescription(`👥 **${groupId}** → ${channel}`)
                .addFields(
                    { name: '📌 Note', value: 'Semua pesan dari grup WA akan muncul di channel ini', inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleGroupRemove(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        let groupId = interaction.options.getString('group_id');

        try {
            this.groupBridges.delete(groupId);
            await this.saveConfig();

            await interaction.editReply(`✅ Bridge grup **${groupId}** dihapus!`);

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleGroupList(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            if (this.groupBridges.size === 0) {
                return interaction.editReply('👥 Tidak ada grup bridge aktif!');
            }

            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle('👥 **GRUP BRIDGES**')
                .setDescription(`**Total:** ${this.groupBridges.size} grup`)
                .setTimestamp();

            let i = 1;
            for (const [groupId, channelId] of this.groupBridges) {
                embed.addFields({
                    name: `${i++}. 👥 **${groupId.split('@')[0]}**`,
                    value: `📌 <#${channelId}>`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    // ==================== PERSONAL BRIDGE COMMANDS ====================
    async handleBridgeAdd(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        let number = interaction.options.getString('number');
        const channel = interaction.options.getChannel('channel');

        try {
            const cleanNumber = number.replace(/\D/g, '');
            const jid = `${cleanNumber}@s.whatsapp.net`;
            
            this.bridgeChannels.set(jid, channel.id);
            await this.saveConfig();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ **PERSONAL BRIDGE ADDED**')
                .setDescription(`📱 **${cleanNumber}** → ${channel}`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleBridgeRemove(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        let number = interaction.options.getString('number');

        try {
            const cleanNumber = number.replace(/\D/g, '');
            const jid = `${cleanNumber}@s.whatsapp.net`;
            
            this.bridgeChannels.delete(jid);
            await this.saveConfig();

            await interaction.editReply(`✅ Personal bridge **${cleanNumber}** dihapus!`);

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleBridgeList(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const personalCount = this.bridgeChannels.size;
            const groupCount = this.groupBridges.size;
            
            if (personalCount === 0 && groupCount === 0) {
                return interaction.editReply('📱 Tidak ada bridge aktif!');
            }

            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle('📱 **BRIDGES**')
                .setDescription(`📱 Personal: ${personalCount}\n👥 Grup: ${groupCount}`)
                .setTimestamp();

            if (personalCount > 0) {
                let personalList = '';
                let i = 1;
                for (const [jid, channelId] of this.bridgeChannels) {
                    personalList += `${i++}. 📱 ${jid.split('@')[0]} → <#${channelId}>\n`;
                }
                embed.addFields({ name: '📱 PERSONAL', value: personalList, inline: false });
            }

            if (groupCount > 0) {
                let groupList = '';
                let i = 1;
                for (const [groupId, channelId] of this.groupBridges) {
                    groupList += `${i++}. 👥 ${groupId.split('@')[0]} → <#${channelId}>\n`;
                }
                embed.addFields({ name: '👥 GRUP', value: groupList, inline: false });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    // ==================== AI COMMAND HANDLERS ====================
    async handleAIEnable(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        const channel = interaction.options.getChannel('channel');
        const prompt = interaction.options.getString('prompt');

        try {
            if (!this.aiModel) {
                return interaction.editReply('❌ Gemini AI not initialized! Check API key.');
            }

            this.aiEnabled = true;
            this.aiChannelId = channel?.id || null;
            if (prompt) this.aiPrompt = prompt;
            
            await this.saveConfig();

            const embed = new EmbedBuilder()
                .setColor(0x4285F4)
                .setTitle('🤖 **AI AUTO-RESPONDER ENABLED**')
                .setDescription('✅ Auto-reply dengan Gemini AI aktif!')
                .addFields(
                    { name: '📊 Model', value: 'Gemini 1.5 Flash', inline: true },
                    { name: '📢 Log Channel', value: channel ? `<#${channel.id}>` : '❌ Tidak ada', inline: true },
                    { name: '🎯 Status', value: '✅ Online', inline: true }
                )
                .setFooter({ text: 'WhatsApp Bridge • AI Powered' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleAIDisable(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        this.aiEnabled = false;
        await this.saveConfig();

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🤖 **AI AUTO-RESPONDER DISABLED**')
            .setDescription('❌ Auto-reply dengan AI telah dimatikan.')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    async handleAIStatus(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(this.aiEnabled ? 0x00FF00 : 0xFF0000)
            .setTitle('🤖 **AI STATUS**')
            .addFields(
                { name: '📊 Status', value: this.aiEnabled ? '✅ ACTIVE' : '❌ INACTIVE', inline: true },
                { name: '🧠 Model', value: 'Gemini 1.5 Flash', inline: true },
                { name: '📢 Log Channel', value: this.aiChannelId ? `<#${this.aiChannelId}>` : '❌ None', inline: true },
                { name: '📝 Prompt', value: `\`\`\`${this.aiPrompt.substring(0, 200)}${this.aiPrompt.length > 200 ? '...' : ''}\`\`\``, inline: false }
            )
            .setFooter({ text: 'WhatsApp Bridge • AI Powered' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    async handleAISetPrompt(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        const prompt = interaction.options.getString('prompt');

        try {
            this.aiPrompt = prompt;
            await this.saveConfig();

            const embed = new EmbedBuilder()
                .setColor(0x4285F4)
                .setTitle('🤖 **AI PROMPT UPDATED**')
                .setDescription(`✅ Prompt berhasil diupdate!\n\n\`\`\`${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}\`\`\``)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleAITest(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const message = interaction.options.getString('message');

        try {
            await interaction.editReply('🤔 **AI is thinking...**');
            
            const response = await this.generateAIResponse(message);
            
            if (!response) {
                return interaction.editReply('❌ Gagal mendapatkan response dari AI!');
            }

            const embed = new EmbedBuilder()
                .setColor(0x4285F4)
                .setTitle('🤖 **AI TEST RESULT**')
                .addFields(
                    { name: '📨 Input', value: `\`\`\`${message}\`\`\``, inline: false },
                    { name: '💬 Output', value: `\`\`\`${response.substring(0, 500)}${response.length > 500 ? '...' : ''}\`\`\``, inline: false }
                )
                .setFooter({ text: 'Gemini 1.5 Flash • Response Time: ~1-2s' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    // ==================== ANTI VIEW-ONCE COMMANDS ====================
    async handleViewOnceSetup(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        const channel = interaction.options.getChannel('channel');

        try {
            this.viewOnceEnabled = true;
            this.viewOnceChannelId = channel.id;
            await this.saveConfig();

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('👁️ **ANTI VIEW-ONCE ENABLED**')
                .setDescription('✅ Fitur Anti View-Once telah diaktifkan!')
                .addFields(
                    { name: '📢 Log Channel', value: `<#${channel.id}>`, inline: true },
                    { name: '👥 Target', value: 'Semua Grup WhatsApp', inline: true },
                    { name: '📸 Media', value: 'Foto, Video, Audio', inline: true }
                )
                .setFooter({ text: 'Semua view-once akan otomatis tersimpan!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleViewOnceDisable(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        this.viewOnceEnabled = false;
        await this.saveConfig();

        const embed = new EmbedBuilder()
            .setColor(0x808080)
            .setTitle('👁️ **ANTI VIEW-ONCE DISABLED**')
            .setDescription('❌ Fitur Anti View-Once telah dimatikan.')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    async handleViewOnceStatus(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const viewOnceFiles = await fs.readdir(this.viewoncePath).catch(() => []);
            
            const embed = new EmbedBuilder()
                .setColor(this.viewOnceEnabled ? 0x00FF00 : 0xFF0000)
                .setTitle('👁️ **ANTI VIEW-ONCE STATUS**')
                .addFields(
                    { name: '📊 Status', value: this.viewOnceEnabled ? '✅ ACTIVE' : '❌ INACTIVE', inline: true },
                    { name: '📢 Log Channel', value: this.viewOnceChannelId ? `<#${this.viewOnceChannelId}>` : '❌ Not set', inline: true },
                    { name: '👥 Target', value: 'Semua Grup', inline: true },
                    { name: '📸 Saved Files', value: `${viewOnceFiles.length} files`, inline: true }
                )
                .setFooter({ text: 'Anti View-Once • Semua grup terdeteksi' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    // ==================== OTHER COMMAND HANDLERS ====================
    async handlePair(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        let phone = interaction.options.getString('phone');

        try {
            if (this.connected) {
                return interaction.editReply('❌ Already connected! Use `/wa logout` first.');
            }

            phone = phone.replace(/\D/g, '');
            if (phone.startsWith('0')) phone = phone.substring(1);
            if (!phone.startsWith('62')) phone = '62' + phone;

            await this.connect();
            
            let attempts = 0;
            while (!this.sock && attempts < 10) {
                await new Promise(r => setTimeout(r, 1000));
                attempts++;
            }

            if (!this.sock) {
                return interaction.editReply('❌ Failed to connect. Try again.');
            }

            const code = await this.sock.requestPairingCode(phone);
            const formatted = code.match(/.{1,4}/g)?.join('-') || code;

            const embed = new EmbedBuilder()
                .setColor(0x25D366)
                .setTitle('📱 **PAIRING CODE**')
                .setDescription(`\`\`\`\n${formatted}\n\`\`\``)
                .addFields(
                    { name: '📱 Number', value: `\`${phone}\``, inline: true },
                    { name: '🔑 Code', value: `\`${formatted}\``, inline: true },
                    { name: '⏰ Expires', value: '5 minutes', inline: true }
                )
                .setFooter({ text: 'WhatsApp Bridge V3.7.0' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleQR(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        const channel = interaction.options.getChannel('channel');

        try {
            this.qrChannelId = channel.id;
            
            if (!this.connected && !this.sock) {
                await this.connect();
                await interaction.editReply('⏳ Generating QR Code... Please wait.');
                await new Promise(r => setTimeout(r, 5000));
            }

            if (this.qrCode) {
                const qrBuffer = await QRCode.toBuffer(this.qrCode, { type: 'png', width: 400 });
                
                const embed = new EmbedBuilder()
                    .setColor(0x25D366)
                    .setTitle('📱 **WHATSAPP QR CODE**')
                    .setDescription('Scan QR ini dengan WhatsApp untuk login!')
                    .setImage('attachment://qr.png')
                    .setTimestamp();

                await channel.send({
                    embeds: [embed],
                    files: [{ attachment: qrBuffer, name: 'qr.png' }]
                });

                await interaction.editReply(`✅ QR Code sent to ${channel}!`);
            } else {
                await interaction.editReply('⏳ QR Code not ready. Use `/wa pair` instead.');
            }
        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleStickerCreate(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const attachment = interaction.options.getAttachment('image');
            const packName = interaction.options.getString('pack') || this.config.stickerPackName;
            const authorName = interaction.options.getString('author') || this.config.stickerPackAuthor;
            const circle = interaction.options.getBoolean('circle') || false;
            const crop = interaction.options.getBoolean('crop') || false;

            if (!attachment) {
                return interaction.editReply('❌ Harap upload gambar!');
            }

            await interaction.editReply('✨ **Membuat sticker...**');

            const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data);

            const stickerData = await this.createSticker(imageBuffer, {
                pack: packName,
                author: authorName,
                circle,
                crop
            });

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('✨ **STICKER CREATED**')
                .setDescription(`
✅ **Sticker berhasil dibuat!**

📦 **Pack:** ${packName}
👤 **Author:** ${authorName}
🎨 **Mode:** ${circle ? 'Circle' : crop ? 'Crop' : 'Contain'}
⚡ **Quality:** ${this.config.stickerQuality}%

📱 **Kirim ke WhatsApp:** \`/wa sticker-send ${stickerData.fileName}\`
                `)
                .setImage('attachment://sticker.webp')
                .setFooter({ text: 'WhatsApp Bridge • Sticker Maker' })
                .setTimestamp();

            const file = new AttachmentBuilder(stickerData.buffer, { name: 'sticker.webp' });

            await interaction.editReply({
                embeds: [embed],
                files: [file]
            });

        } catch (error) {
            await interaction.editReply(`❌ Gagal: ${error.message.substring(0, 100)}`);
        }
    }

    async handleStickerSend(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        let number = interaction.options.getString('number');
        const file = interaction.options.getString('file');

        try {
            if (!this.connected || !this.sock) {
                return interaction.editReply('❌ WhatsApp tidak terhubung!');
            }

            number = number.replace(/\D/g, '');
            if (number.startsWith('0')) number = number.substring(1);
            if (!number.startsWith('62')) number = '62' + number;

            const jid = `${number}@s.whatsapp.net`;
            const stickerPath = path.join(this.stickerPath, file);
            
            const buffer = await fs.readFile(stickerPath).catch(() => null);
            if (!buffer) {
                return interaction.editReply('❌ File sticker tidak ditemukan!');
            }

            await this.sendStickerToWA(jid, {
                buffer,
                pack: this.config.stickerPackName,
                author: this.config.stickerPackAuthor
            });

            await interaction.editReply(`✅ Sticker terkirim ke **${number}**!`);

        } catch (error) {
            await interaction.editReply(`❌ Gagal: ${error.message.substring(0, 100)}`);
        }
    }

    async handleStickerConfig(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        const quality = interaction.options.getInteger('quality');
        const packName = interaction.options.getString('pack');
        const authorName = interaction.options.getString('author');

        try {
            if (quality) this.config.stickerQuality = quality;
            if (packName) this.config.stickerPackName = packName;
            if (authorName) this.config.stickerPackAuthor = authorName;
            
            await this.saveConfig();

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('⚙️ **STICKER CONFIG**')
                .setDescription(`
✅ **Konfigurasi tersimpan!**

📦 **Pack:** ${this.config.stickerPackName}
👤 **Author:** ${this.config.stickerPackAuthor}
⚡ **Quality:** ${this.config.stickerQuality}%
                `)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleSend(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        let number = interaction.options.getString('number');
        const message = interaction.options.getString('message');

        try {
            if (!this.connected || !this.sock) {
                return interaction.editReply('❌ WhatsApp tidak terhubung!');
            }

            number = number.replace(/\D/g, '');
            if (number.startsWith('0')) number = number.substring(1);
            if (!number.startsWith('62')) number = '62' + number;

            const jid = `${number}@s.whatsapp.net`;
            console.log(`📤 [Manual] Sending to ${jid}: ${message.substring(0, 30)}...`);
            
            const sentMessage = await this.sock.sendMessage(jid, { text: `[Discord] ${message}` });
            
            console.log(`✅ [Manual] Message sent! ID: ${sentMessage?.key?.id || 'unknown'}`);

            await interaction.editReply(`✅ Pesan terkirim ke **${number}**!`);

        } catch (error) {
            console.error('❌ [Manual] Send error:', error);
            await interaction.editReply(`❌ Gagal: ${error.message.substring(0, 100)}`);
        }
    }

    async handleLogout(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ Admin only!');
        }

        try {
            await this.logout();
            await interaction.editReply('✅ Logout dari WhatsApp!');
        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleStatus(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const stickers = await fs.readdir(this.stickerPath).catch(() => []);
            const viewOnceFiles = await fs.readdir(this.viewoncePath).catch(() => []);
            
            const embed = new EmbedBuilder()
                .setColor(this.connected ? 0x00FF00 : 0xFF0000)
                .setTitle('📱 **WHATSAPP STATUS**')
                .addFields(
                    { name: '🔌 Connection', value: this.connected ? '✅ CONNECTED' : '❌ DISCONNECTED', inline: true },
                    { name: '📱 Device', value: this.sock?.user?.name || 'None', inline: true },
                    { name: '🆔 Number', value: this.sock?.user?.id?.split(':')[0] || 'None', inline: true },
                    { name: '📱 Personal Bridges', value: `${this.bridgeChannels.size}`, inline: true },
                    { name: '👥 Group Bridges', value: `${this.groupBridges.size}`, inline: true },
                    { name: '✨ Stickers', value: `${stickers.length}`, inline: true },
                    { name: '🤖 AI Status', value: this.aiEnabled ? '✅ ACTIVE' : '❌ INACTIVE', inline: true },
                    { name: '👁️ Anti View-Once', value: this.viewOnceEnabled ? '✅ ACTIVE' : '❌ INACTIVE', inline: true },
                    { name: '📸 ViewOnce Files', value: `${viewOnceFiles.length}`, inline: true },
                    { name: '📦 Version', value: '3.7.0', inline: true }
                )
                .setFooter({ text: 'WhatsApp Bridge • FIXED!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message.substring(0, 100)}`);
        }
    }

    async handleHelp(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(0x25D366)
            .setTitle('📚 **WHATSAPP BRIDGE - V3.7.0**')
            .setDescription(`
**📱 CONNECTION**
\`/wa pair 628xxx\` - Pairing WhatsApp
\`/wa qr #channel\` - Kirim QR Code
\`/wa logout\` - Logout

**✨ STICKER MAKER**
\`/wa sticker-create\` - Buat sticker
\`/wa sticker-send [file] [nomor]\` - Kirim sticker
\`/wa sticker-config\` - Atur default

**👁️ ANTI VIEW-ONCE**
\`/wa viewonce-setup #channel\` - Aktifkan (semua grup)
\`/wa viewonce-disable\` - Matikan
\`/wa viewonce-status\` - Cek status

**👤 PERSONAL BRIDGE**
\`/wa bridge-add [nomor] #channel\` - Bridge chat personal
\`/wa bridge-remove [nomor]\` - Hapus personal bridge

**👥 GRUP BRIDGE**
\`/wa group-add [id_grup] #channel\` - Bridge grup WA
\`/wa group-remove [id_grup]\` - Hapus grup bridge
\`/wa group-list\` - List grup bridge

**📋 BRIDGE LIST**
\`/wa bridge-list\` - List semua bridge

**📤 MESSAGING**
\`/wa send [nomor] [pesan]\` - Kirim pesan

**🤖 AI AUTO-RESPONDER**
\`/wa ai-enable #channel\` - Aktifkan AI
\`/wa ai-disable\` - Matikan AI
\`/wa ai-status\` - Cek status AI
\`/wa ai-setprompt [teks]\` - Ubah prompt AI
\`/wa ai-test [pesan]\` - Test AI

**📊 STATUS**
\`/wa status\` - Cek koneksi
\`/wa help\` - Bantuan ini
            `)
            .setFooter({ text: 'WhatsApp Bridge V3.7.0 • FIXED Connection & Logout!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    // ==================== STATIC METHODS ====================
    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('wa')
                .setDescription('📱 WhatsApp Bridge - Personal & Grup Support + Anti View-Once!')
                
                // ===== CONNECTION =====
                .addSubcommand(sub =>
                    sub.setName('pair')
                        .setDescription('[ADMIN] Pair WhatsApp')
                        .addStringOption(opt =>
                            opt.setName('phone')
                                .setDescription('Nomor HP (628123456789)')
                                .setRequired(true)))
                
                .addSubcommand(sub =>
                    sub.setName('qr')
                        .setDescription('[ADMIN] Kirim QR Code')
                        .addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('Channel')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))
                
                .addSubcommand(sub =>
                    sub.setName('logout')
                        .setDescription('[ADMIN] Logout'))
                
                // ===== STICKER =====
                .addSubcommand(sub =>
                    sub.setName('sticker-create')
                        .setDescription('✨ Buat sticker')
                        .addAttachmentOption(opt =>
                            opt.setName('image')
                                .setDescription('Gambar')
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName('pack')
                                .setDescription('Nama pack'))
                        .addStringOption(opt =>
                            opt.setName('author')
                                .setDescription('Nama author'))
                        .addBooleanOption(opt =>
                            opt.setName('circle')
                                .setDescription('Circle crop?'))
                        .addBooleanOption(opt =>
                            opt.setName('crop')
                                .setDescription('Force crop?')))
                
                .addSubcommand(sub =>
                    sub.setName('sticker-send')
                        .setDescription('[ADMIN] Kirim sticker ke WA')
                        .addStringOption(opt =>
                            opt.setName('number')
                                .setDescription('Nomor tujuan')
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName('file')
                                .setDescription('Nama file')
                                .setRequired(true)))
                
                .addSubcommand(sub =>
                    sub.setName('sticker-config')
                        .setDescription('[ADMIN] Atur config sticker')
                        .addIntegerOption(opt =>
                            opt.setName('quality')
                                .setDescription('Kualitas (50-100)')
                                .setMinValue(50)
                                .setMaxValue(100))
                        .addStringOption(opt =>
                            opt.setName('pack')
                                .setDescription('Nama pack default'))
                        .addStringOption(opt =>
                            opt.setName('author')
                                .setDescription('Nama author default')))
                
                // ===== ANTI VIEW-ONCE =====
                .addSubcommand(sub =>
                    sub.setName('viewonce-setup')
                        .setDescription('[ADMIN] Aktifkan Anti View-Once untuk semua grup')
                        .addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('Channel untuk log')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))
                
                .addSubcommand(sub =>
                    sub.setName('viewonce-disable')
                        .setDescription('[ADMIN] Matikan Anti View-Once'))
                
                .addSubcommand(sub =>
                    sub.setName('viewonce-status')
                        .setDescription('👁️ Cek status Anti View-Once'))
                
                // ===== PERSONAL BRIDGE =====
                .addSubcommand(sub =>
                    sub.setName('bridge-add')
                        .setDescription('[ADMIN] Bridge personal chat')
                        .addStringOption(opt =>
                            opt.setName('number')
                                .setDescription('Nomor WA')
                                .setRequired(true))
                        .addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('Channel')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))
                
                .addSubcommand(sub =>
                    sub.setName('bridge-remove')
                        .setDescription('[ADMIN] Hapus personal bridge')
                        .addStringOption(opt =>
                            opt.setName('number')
                                .setDescription('Nomor WA')
                                .setRequired(true)))
                
                // ===== GROUP BRIDGE =====
                .addSubcommand(sub =>
                    sub.setName('group-add')
                        .setDescription('[ADMIN] Bridge grup WhatsApp')
                        .addStringOption(opt =>
                            opt.setName('group_id')
                                .setDescription('ID grup WA (angka)')
                                .setRequired(true))
                        .addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('Channel Discord')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))
                
                .addSubcommand(sub =>
                    sub.setName('group-remove')
                        .setDescription('[ADMIN] Hapus grup bridge')
                        .addStringOption(opt =>
                            opt.setName('group_id')
                                .setDescription('ID grup WA')
                                .setRequired(true)))
                
                .addSubcommand(sub =>
                    sub.setName('group-list')
                        .setDescription('[ADMIN] List grup bridge'))
                
                // ===== BRIDGE LIST =====
                .addSubcommand(sub =>
                    sub.setName('bridge-list')
                        .setDescription('[ADMIN] List semua bridge'))
                
                // ===== MESSAGING =====
                .addSubcommand(sub =>
                    sub.setName('send')
                        .setDescription('[ADMIN] Kirim pesan')
                        .addStringOption(opt =>
                            opt.setName('number')
                                .setDescription('Nomor tujuan')
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName('message')
                                .setDescription('Pesan')
                                .setRequired(true)))
                
                // ===== AI AUTO-RESPONDER =====
                .addSubcommand(sub =>
                    sub.setName('ai-enable')
                        .setDescription('[ADMIN] Aktifkan AI Auto-Responder')
                        .addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('Channel untuk log AI')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName('prompt')
                                .setDescription('Custom prompt untuk AI')
                                .setRequired(false)))
                
                .addSubcommand(sub =>
                    sub.setName('ai-disable')
                        .setDescription('[ADMIN] Matikan AI Auto-Responder'))
                
                .addSubcommand(sub =>
                    sub.setName('ai-status')
                        .setDescription('🤖 Cek status AI'))
                
                .addSubcommand(sub =>
                    sub.setName('ai-setprompt')
                        .setDescription('[ADMIN] Set custom prompt')
                        .addStringOption(opt =>
                            opt.setName('prompt')
                                .setDescription('Prompt baru')
                                .setRequired(true)))
                
                .addSubcommand(sub =>
                    sub.setName('ai-test')
                        .setDescription('[ADMIN] Test AI response')
                        .addStringOption(opt =>
                            opt.setName('message')
                                .setDescription('Pesan test')
                                .setRequired(true)))
                
                // ===== STATUS =====
                .addSubcommand(sub =>
                    sub.setName('status')
                        .setDescription('📊 Status'))
                
                .addSubcommand(sub =>
                    sub.setName('help')
                        .setDescription('📚 Bantuan'))
        ];
    }

    static async handleCommand(interaction, plugin) {
        const sub = interaction.options.getSubcommand();
        
        try {
            switch (sub) {
                // Connection
                case 'pair': await plugin.handlePair(interaction); break;
                case 'qr': await plugin.handleQR(interaction); break;
                case 'logout': await plugin.handleLogout(interaction); break;
                
                // Sticker
                case 'sticker-create': await plugin.handleStickerCreate(interaction); break;
                case 'sticker-send': await plugin.handleStickerSend(interaction); break;
                case 'sticker-config': await plugin.handleStickerConfig(interaction); break;
                
                // Anti View-Once
                case 'viewonce-setup': await plugin.handleViewOnceSetup(interaction); break;
                case 'viewonce-disable': await plugin.handleViewOnceDisable(interaction); break;
                case 'viewonce-status': await plugin.handleViewOnceStatus(interaction); break;
                
                // Personal Bridge
                case 'bridge-add': await plugin.handleBridgeAdd(interaction); break;
                case 'bridge-remove': await plugin.handleBridgeRemove(interaction); break;
                
                // Group Bridge
                case 'group-add': await plugin.handleGroupAdd(interaction); break;
                case 'group-remove': await plugin.handleGroupRemove(interaction); break;
                case 'group-list': await plugin.handleGroupList(interaction); break;
                
                // Bridge List
                case 'bridge-list': await plugin.handleBridgeList(interaction); break;
                
                // Messaging
                case 'send': await plugin.handleSend(interaction); break;
                
                // AI
                case 'ai-enable': await plugin.handleAIEnable(interaction); break;
                case 'ai-disable': await plugin.handleAIDisable(interaction); break;
                case 'ai-status': await plugin.handleAIStatus(interaction); break;
                case 'ai-setprompt': await plugin.handleAISetPrompt(interaction); break;
                case 'ai-test': await plugin.handleAITest(interaction); break;
                
                // Status
                case 'status': await plugin.handleStatus(interaction); break;
                case 'help': await plugin.handleHelp(interaction); break;
                
                default: await interaction.reply({ content: '❌ Unknown command', ephemeral: true });
            }
        } catch (error) {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `❌ Error: ${error.message.substring(0, 100)}`, ephemeral: true });
            } else if (interaction.deferred) {
                await interaction.editReply({ content: `❌ Error: ${error.message.substring(0, 100)}` });
            }
        }
    }
}

module.exports = WhatsAppBridge;
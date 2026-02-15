// music.js - MUSIC BOT BARU TOTAL!
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');

class MusicSystem {
    constructor(client) {
        this.client = client;
        this.queues = new Map();
        console.log('🎵 Music System Ready!');
    }

    async search(query) {
        try {
            const result = await ytSearch(query);
            return result.videos[0];
        } catch {
            return null;
        }
    }

    getQueue(guildId) {
        if (!this.queues.has(guildId)) {
            this.queues.set(guildId, {
                songs: [],
                player: createAudioPlayer(),
                connection: null,
                nowPlaying: null,
                loop: false
            });
        }
        return this.queues.get(guildId);
    }

    async play(guildId) {
        const queue = this.getQueue(guildId);
        if (!queue.songs.length) return;

        const song = queue.songs[0];
        
        try {
            const stream = ytdl(song.url, {
                filter: 'audioonly',
                quality: 'lowestaudio'
            });
            
            const resource = createAudioResource(stream);
            queue.player.play(resource);
            queue.nowPlaying = song;

            queue.player.once(AudioPlayerStatus.Idle, () => {
                if (queue.loop) queue.songs.push(queue.songs[0]);
                queue.songs.shift();
                this.play(guildId);
            });

        } catch {
            queue.songs.shift();
            this.play(guildId);
        }
    }

    async join(interaction) {
        const vc = interaction.member.voice.channel;
        if (!vc) return { ok: false, msg: '❌ Join voice dulu!' };

        try {
            const queue = this.getQueue(interaction.guild.id);
            if (queue.connection) queue.connection.destroy();

            const conn = joinVoiceChannel({
                channelId: vc.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator
            });

            queue.connection = conn;
            conn.subscribe(queue.player);
            return { ok: true };
        } catch {
            return { ok: false, msg: '❌ Gagal join voice!' };
        }
    }

    async playCmd(interaction) {
        const query = interaction.options.getString('query');
        await interaction.deferReply();

        const song = await this.search(query);
        if (!song) return interaction.editReply('❌ Lagu tidak ditemukan!');

        const joinRes = await this.join(interaction);
        if (!joinRes.ok) return interaction.editReply(joinRes.msg);

        const queue = this.getQueue(interaction.guild.id);
        queue.songs.push({
            title: song.title,
            url: song.url,
            duration: song.duration.timestamp,
            thumbnail: song.thumbnail,
            requester: interaction.user.tag
        });

        if (queue.songs.length === 1) this.play(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('✅ Ditambahkan!')
            .setDescription(`[${song.title}](${song.url})`)
            .addFields(
                { name: '⏱️ Durasi', value: song.duration.timestamp || 'Live', inline: true },
                { name: '📊 Antrian', value: `${queue.songs.length}`, inline: true },
                { name: '👤 Request', value: interaction.user.username, inline: true }
            )
            .setThumbnail(song.thumbnail)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    async skipCmd(interaction) {
        const queue = this.getQueue(interaction.guild.id);
        if (!queue.connection || !queue.songs.length) {
            return interaction.reply({ content: '❌ Tidak ada lagu!', ephemeral: true });
        }
        queue.player.stop();
        await interaction.reply({ content: '⏭️ Skipped!', ephemeral: true });
    }

    async stopCmd(interaction) {
        const queue = this.getQueue(interaction.guild.id);
        if (!queue.connection) {
            return interaction.reply({ content: '❌ Bot tidak connect!', ephemeral: true });
        }
        queue.songs = [];
        queue.player.stop();
        queue.connection.destroy();
        queue.connection = null;
        await interaction.reply({ content: '⏹️ Stopped!', ephemeral: true });
    }

    async queueCmd(interaction) {
        const queue = this.getQueue(interaction.guild.id);
        if (!queue.songs.length) {
            return interaction.reply({ content: '📭 Antrian kosong!', ephemeral: true });
        }

        let text = '';
        queue.songs.slice(1, 11).forEach((s, i) => {
            text += `**${i+1}.** ${s.title} - ${s.duration}\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('📋 Antrian')
            .setDescription(`**Now Playing:**\n[${queue.nowPlaying?.title}](${queue.nowPlaying?.url})\n\n**Up Next:**\n${text || 'Kosong'}`)
            .setFooter({ text: `Total: ${queue.songs.length} lagu` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async pauseCmd(interaction) {
        const queue = this.getQueue(interaction.guild.id);
        if (!queue.connection) return interaction.reply({ content: '❌ Bot tidak connect!', ephemeral: true });
        queue.player.pause();
        await interaction.reply({ content: '⏸️ Paused!', ephemeral: true });
    }

    async resumeCmd(interaction) {
        const queue = this.getQueue(interaction.guild.id);
        if (!queue.connection) return interaction.reply({ content: '❌ Bot tidak connect!', ephemeral: true });
        queue.player.unpause();
        await interaction.reply({ content: '▶️ Resumed!', ephemeral: true });
    }

    async loopCmd(interaction) {
        const queue = this.getQueue(interaction.guild.id);
        queue.loop = !queue.loop;
        await interaction.reply({ content: `🔄 Loop ${queue.loop ? 'ON' : 'OFF'}`, ephemeral: true });
    }

    async npCmd(interaction) {
        const queue = this.getQueue(interaction.guild.id);
        if (!queue.nowPlaying) {
            return interaction.reply({ content: '❌ Tidak ada lagu!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('🎵 Now Playing')
            .setDescription(`[${queue.nowPlaying.title}](${queue.nowPlaying.url})`)
            .setThumbnail(queue.nowPlaying.thumbnail)
            .setFooter({ text: `Requested by: ${queue.nowPlaying.requester}` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async volumeCmd(interaction) {
        const vol = interaction.options.getInteger('level');
        await interaction.reply({ content: `🔊 Volume: ${vol}%`, ephemeral: true });
    }

    static getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('music')
                .setDescription('🎵 Music Bot')
                .addSubcommand(s => s.setName('play').setDescription('Play lagu').addStringOption(o => o.setName('query').setDescription('Judul/URL').setRequired(true)))
                .addSubcommand(s => s.setName('skip').setDescription('Skip lagu'))
                .addSubcommand(s => s.setName('stop').setDescription('Stop'))
                .addSubcommand(s => s.setName('queue').setDescription('Antrian'))
                .addSubcommand(s => s.setName('pause').setDescription('Pause'))
                .addSubcommand(s => s.setName('resume').setDescription('Resume'))
                .addSubcommand(s => s.setName('loop').setDescription('Loop on/off'))
                .addSubcommand(s => s.setName('nowplaying').setDescription('Lagu sekarang'))
                .addSubcommand(s => s.setName('volume').setDescription('Volume').addIntegerOption(o => o.setName('level').setDescription('0-100').setRequired(true).setMinValue(0).setMaxValue(100)))
        ];
    }

    static async handleCommand(i, m) {
        const cmd = i.options.getSubcommand();
        if (cmd === 'play') await m.playCmd(i);
        if (cmd === 'skip') await m.skipCmd(i);
        if (cmd === 'stop') await m.stopCmd(i);
        if (cmd === 'queue') await m.queueCmd(i);
        if (cmd === 'pause') await m.pauseCmd(i);
        if (cmd === 'resume') await m.resumeCmd(i);
        if (cmd === 'loop') await m.loopCmd(i);
        if (cmd === 'nowplaying') await m.npCmd(i);
        if (cmd === 'volume') await m.volumeCmd(i);
    }
}

module.exports = MusicSystem;
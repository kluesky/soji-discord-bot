# 🌸 Soji Discord Bot

 All-In-One Discord Bot\
**Anime • RPG • Economy • Anti-Nuke • Ticket • Monitoring • Music**

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![discord.js](https://img.shields.io/badge/discord.js-v14-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Status](https://img.shields.io/badge/Status-Production-brightgreen)

------------------------------------------------------------------------

## ✨ Features

-   🎌 Anime Search & Real-time Reminder (AniList GraphQL)
-   🗡️ RPG System with progression
-   💰 Economy System
-   🎫 Advanced Ticket System
-   🛡️ Anti-Nuke Protection
-   📊 Monitoring & Live Dashboard (Express + Socket.io)
-   🔔 Real-time Anime Notifications
-   🎵 YouTube Music System
-   ⚡ Optimized & Stable Architecture

------------------------------------------------------------------------

## 🛠 Tech Stack

-   Node.js 18+
-   discord.js v14
-   Express
-   Socket.io
-   GraphQL & AniList API
-   @discordjs/voice
-   yt-search
-   @distube/ytdl-core
-   @napi-rs/canvas

------------------------------------------------------------------------

## 📦 Installation

### 1️⃣ Clone Repository

git clone https://github.com/kluesky/soji-discord-bot.git\
cd soji-discord-bot

### 2️⃣ Install Dependencies

npm install

### 3️⃣ Setup Environment Variables

Create a `.env` file:

TOKEN=your_discord_bot_token\
CLIENT_ID=your_client_id\
GUILD_ID=your_guild_id

------------------------------------------------------------------------

## 🚀 Run The Bot

Production:

npm start

Development:

npm run dev

------------------------------------------------------------------------

## 🎵 Music System Requirements

To ensure music works correctly:

-   FFmpeg installed
-   Stable internet connection
-   Node 18+
-   UDP enabled (for voice connection)

------------------------------------------------------------------------

## 🖥 Pterodactyl Setup

If using Pterodactyl Panel:

-   Use Node 18 or 20
-   Install ffmpeg
-   Ensure network & UDP access allowed

------------------------------------------------------------------------

## 📂 Project Structure

```
soji-discord-bot/
│
├── bot.js
├── commands/
├── events/
├── dashboard/
├── utils/
├── assets/
├── package.json
└── README.md
```
------------------------------------------------------------------------

## 📜 Command Preview

### 🎌 Anime

-   /anime search
-   /anime reminder
-   /anime schedule

### 🎵 Music

-   /play
-   /skip
-   /stop
-   /queue

### 🛡️ Moderation

-   /ban
-   /kick
-   /lock
-   /antinuke enable

### 💰 Economy

-   /balance
-   /daily
-   /work
-   /shop

### 🎫 Ticket

-   /ticket create
-   /ticket close

------------------------------------------------------------------------

## 🔐 Required Bot Permissions

-   Send Messages
-   Manage Messages
-   Manage Channels
-   Connect to Voice
-   Speak
-   Administrator (recommended)

------------------------------------------------------------------------

## 🧠 About Soji

Soji is built as a scalable multi-system Discord bot combining:

-   Entertainment
-   Automation
-   Security
-   Anime ecosystem integration
-   Real-time monitoring

Designed for performance, stability, and production use.

------------------------------------------------------------------------

## 📜 License

MIT License © Lyora Community

------------------------------------------------------------------------

## 💖 Support

If you like this project:

-   ⭐ Star this repository
-   🍴 Fork it
-   🛠 Contribute improvements

------------------------------------------------------------------------

**Soji --- Not just a bot. A complete system.**

<!-- readme-seo: bannysukumar-professional-v4 -->

# GEN Bot

GEN Bot is a Node.js Telegram bot. `package.json` describes it as "GEN Bot with mining and admin features". `server.js` uses Telegraf, Express, Firebase Admin, cron, and WebSocket. A `/start` command is registered, and a cron job sets daily ROI to stake times 0.02.

## Overview

Express serves `public/` and listens on `process.env.PORT` or port 3000. Firebase Admin is initialized from `firebase-service-account.json` in `server.js`. Do not commit a real service-account key. The bot posts stake updates that include a GEN amount and a daily ROI amount. `POST /api/mining/start` checks the last mining time and rejects a new start when less than one hour has passed.

This repository is named `bot`. The package name is `gen-bot`.

## Features

Confirmed in `server.js` and `package.json`:

- Telegraf bot with a `/start` command
- Daily ROI calculated as `stake * 0.02`
- Mining start route `POST /api/mining/start` with a one-hour gap check
- Express static files from `public/`
- Firebase Admin and a cron job

## Tech Stack

| Technology | Where it shows up |
|---|---|
| Node.js | `server.js` |
| Telegraf | `package.json` and `server.js` |
| Express | `package.json` and `server.js` |
| Firebase Admin | `firebase-admin` and `server.js` |
| WebSocket | `ws` dependency |

## Architecture

Telegram → Telegraf in `server.js` → Firebase Admin. Express on the same process serves `public/` and the mining route.

## Project Structure

```text
bot/
├── server.js
├── package.json
├── public/
├── functions/
├── firebase.json
└── firestore.rules
```

## Prerequisites

- Node.js
- npm
- A Telegram bot token in the environment, read by the app through `dotenv`

## Installation

```bash
git clone https://github.com/Bannysukumar/bot.git
cd bot
npm install
npm start
```

`npm start` runs `node server.js`. `npm run dev` runs nodemon.

## Configuration

`server.js` calls `require('dotenv').config()` and loads `firebase-service-account.json`. Keep the bot token and the service-account JSON off public commits. `firebase.json` and `firestore.rules` are in the repository.

## Usage

Start the process and open the bot in Telegram. `/start` is implemented. Mining is the `POST /api/mining/start` handler, which enforces a one-hour wait.

## API

- `POST /api/mining/start`

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Licensed under MIT. See [LICENSE](LICENSE).

## Author

Banny Sukumar

GitHub: https://github.com/Bannysukumar

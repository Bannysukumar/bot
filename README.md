# Telegram Staking Bot + Web App

A Telegram bot and web application for token staking with 2% daily ROI and referral system.

## Features

- Buy tokens by sending USDT and submitting transaction hash
- Stake tokens and earn 2% daily ROI
- Restake after reaching 2x of staked amount
- Withdraw ROI or sell tokens (requires admin approval)
- Referral system with rewards
- Admin panel for managing deposits and withdrawals
- No login system - uses Telegram ID for authentication

## Prerequisites

- Node.js (v14 or higher)
- Firebase account
- Telegram Bot Token (from @BotFather)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd telegram-staking-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
TELEGRAM_BOT_TOKEN=your_bot_token
WEB_APP_URL=your_web_app_url
```

4. Set up Firebase:
   - Create a new Firebase project
   - Download the service account key file
   - Rename it to `firebase-service-account.json` and place it in the root directory

5. Start the server:
```bash
npm start
```

## Project Structure

- `server.js` - Main server file with Express and Telegram bot setup
- `public/` - Frontend files
  - `index.html` - Main web app interface
  - `admin.html` - Admin panel interface
  - `app.js` - Frontend JavaScript
  - `admin.js` - Admin panel JavaScript
  - `styles.css` - Common styles

## Usage

1. Start the Telegram bot and click the "Launch Web App" button
2. The web app will open with your Telegram ID
3. To buy tokens:
   - Send USDT to the admin wallet
   - Submit the transaction hash and amount
   - Wait for admin approval
4. To stake tokens:
   - Enter the amount to stake
   - Click "Stake"
5. To withdraw:
   - Enter the amount and select type (ROI or tokens)
   - Click "Withdraw"
   - Wait for admin approval
6. To restake:
   - Click "Restake" after reaching 2x of staked amount

## Admin Panel

Access the admin panel at `/admin.html` to:
- View all users and their balances
- Approve pending deposits
- Approve pending withdrawals
- Monitor referral activity

## Security Notes

- Keep your Firebase service account key secure
- Never share your Telegram bot token
- Implement proper admin authentication for the admin panel
- Consider adding rate limiting for API endpoints
- Use HTTPS in production

## License

MIT 
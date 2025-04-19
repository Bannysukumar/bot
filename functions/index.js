const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');
const cron = require('node-cron');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize Telegram Bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Basic bot commands
bot.command('start', async (ctx) => {
  const userId = ctx.from.id;
  const referralCode = ctx.message.text.split(' ')[1];
  
  // Store user in database if new
  const userRef = db.collection('users').doc(userId.toString());
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    await userRef.set({
      balance: 0,
      stake: 0,
      roi: 0,
      totalEarned: 0,
      referrer: referralCode || null,
      totalReferred: 0,
      status: 'active',
      createdAt: new Date()
    });

    // Credit referrer if exists
    if (referralCode) {
      const referrerRef = db.collection('users').doc(referralCode);
      const referrerDoc = await referrerRef.get();
      if (referrerDoc.exists) {
        await referrerRef.update({
          balance: admin.firestore.FieldValue.increment(100),
          totalReferred: admin.firestore.FieldValue.increment(1)
        });
      }
    }
  }

  await ctx.reply('Welcome to GEN Bot! 🚀\n\nExplore our features:\n• View market prices\n• Complete tasks to earn GEN\n• Stake your tokens\n• Manage your wallet', {
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🌟 Launch Web App',
          web_app: { url: `${process.env.WEB_APP_URL}?tgId=${userId}` }
        }
      ]]
    }
  });
});

// Start bot
bot.launch();

// API Routes
app.get('/api/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (userDoc.exists) {
    res.json({ success: true, data: userDoc.data() });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// ... (rest of your API routes)

// Export Express app as Firebase Function
exports.api = functions.https.onRequest(app);

// Export scheduled function for daily ROI calculation
exports.calculateDailyROI = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const usersSnapshot = await db.collection('users').get();
    
    usersSnapshot.forEach(async (doc) => {
      const userData = doc.data();
      if (userData.stake > 0 && userData.totalEarned < userData.stake * 2) {
        const dailyROI = userData.stake * 0.02;
        const newTotalEarned = userData.totalEarned + dailyROI;
        
        await doc.ref.update({
          roi: userData.roi + dailyROI,
          totalEarned: newTotalEarned
        });
      }
    });
  }); 
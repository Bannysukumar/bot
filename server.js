require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Telegraf, session } = require('telegraf');
const admin = require('firebase-admin');
const cron = require('node-cron');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize Firebase Admin
try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://web-bot-7454c-default-rtdb.firebaseio.com"
    });
    console.log('Firebase Admin initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    process.exit(1);
}

const db = admin.firestore();
const rtdb = admin.database();

// Set up error handling for Firebase
rtdb.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === false) {
        console.warn('Firebase Realtime Database connection lost');
    } else {
        console.log('Firebase Realtime Database connected');
    }
});

// Initialize Telegram Bot with session
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
bot.use(session());

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    // Handle different types of updates
    switch (data.type) {
      case 'balance_update':
        handleBalanceUpdate(data);
        break;
      case 'transaction_update':
        handleTransactionUpdate(data);
        break;
      case 'task_update':
        handleTaskUpdate(data);
        break;
    }
  });
});

// Real-time update handlers
async function sendBotUpdate(userId, message) {
  try {
    await bot.telegram.sendMessage(userId, message);
  } catch (error) {
    console.error('Error sending bot update:', error);
  }
}

// Listen for real-time updates
rtdb.ref('updates').on('child_added', async (snapshot) => {
  const update = snapshot.val();
  const { userId, type, data } = update;
  
  switch (type) {
    case 'balance':
      await sendBotUpdate(userId, `Your balance has been updated!\nNew balance: ${data.balance} GEN`);
      break;
    case 'transaction':
      await sendBotUpdate(userId, `Your ${data.type} transaction has been ${data.status}!\nAmount: ${data.amount} USDT`);
      break;
    case 'task':
      await sendBotUpdate(userId, `New task available: ${data.name}\nReward: ${data.reward} GEN`);
      break;
    case 'stake':
      await sendBotUpdate(userId, `Your stake has been updated!\nNew stake: ${data.stake} GEN\nDaily ROI: ${data.dailyROI} GEN`);
      break;
  }
  
  // Remove the update after processing
  snapshot.ref.remove();
});

// Update handlers
async function handleBalanceUpdate(data) {
  const { userId, newBalance } = data;
  try {
    await bot.telegram.sendMessage(
      userId,
      `Your balance has been updated!\nNew balance: ${newBalance} GEN`
    );
  } catch (error) {
    console.error('Error sending balance update:', error);
  }
}

async function handleTransactionUpdate(data) {
  const { userId, type, status, amount } = data;
  try {
    await bot.telegram.sendMessage(
      userId,
      `Your ${type} transaction has been ${status}!\nAmount: ${amount} USDT`
    );
  } catch (error) {
    console.error('Error sending transaction update:', error);
  }
}

async function handleTaskUpdate(data) {
  const { userId, taskName, reward } = data;
  try {
    await bot.telegram.sendMessage(
      userId,
      `New task available: ${taskName}\nReward: ${reward} GEN`
    );
  } catch (error) {
    console.error('Error sending task update:', error);
  }
}

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
        
        // Send real-time update to referrer
        rtdb.ref('updates').push({
          userId: referralCode,
          type: 'balance',
          data: { balance: 100 }
        });
      }
    }
  }

  // Send welcome message with Web App button
  const webAppUrl = `${process.env.WEB_APP_URL}?tgId=${userId}`;
  await ctx.reply('Welcome to GEN Bot! 🚀\n\nExplore our features:\n• View market prices\n• Complete tasks to earn GEN\n• Stake your tokens\n• Manage your wallet', {
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🌟 Launch Web App',
          web_app: { url: webAppUrl }
        }
      ]]
    }
  });
});

// Start bot
bot.launch();

// Daily ROI calculation job
cron.schedule('0 0 * * *', async () => {
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

// Mock tasks data
const mockTasks = [
    {
        id: '1',
        name: 'Follow on Telegram',
        description: 'Follow our official Telegram channel',
        type: 'social',
        reward: 10,
        status: 'active'
    },
    {
        id: '2',
        name: 'Watch Video Tutorial',
        description: 'Watch our introductory video tutorial',
        type: 'video',
        reward: 15,
        status: 'active'
    }
];

// Mock data for staking plans
const stakingPlans = [
    {
        id: '1',
        name: '30 Days Plan',
        duration: 30,
        apy: 12,
        minAmount: 100,
        maxAmount: 10000
    },
    {
        id: '2',
        name: '90 Days Plan',
        duration: 90,
        apy: 15,
        minAmount: 500,
        maxAmount: 50000
    },
    {
        id: '3',
        name: '180 Days Plan',
        duration: 180,
        apy: 18,
        minAmount: 1000,
        maxAmount: 100000
    }
];

// Mock data for user stakes
const userStakes = [
    {
        id: '1',
        planId: '1',
        planName: '30 Days Plan',
        amount: 1000,
        duration: 30,
        apy: 12,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
    }
];

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

app.post('/api/tasks/complete', async (req, res) => {
  const { userId, taskType } = req.body;
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  
  let reward = 0;
  if (taskType === 'telegram') {
    reward = 1000;
  } else if (taskType === 'facebook') {
    reward = 500;
  }
  
  await userRef.update({
    balance: admin.firestore.FieldValue.increment(reward)
  });
  
  // Send real-time update
  rtdb.ref('updates').push({
    userId,
    type: 'balance',
    data: { balance: userData.balance + reward }
  });
  
  res.json({ success: true });
});

app.get('/api/market/prices', async (req, res) => {
  // In a real app, you would fetch these from an exchange API
  res.json({
    'GEN/USDT': {
      price: 0.15,
      change: 5.2,
      volume: 156789
    },
    'GEN/BTC': {
      price: 0.00000521,
      change: 3.8,
      volume: 12.5
    }
  });
});

app.post('/api/deposit', async (req, res) => {
  const { userId, txHash, amount } = req.body;
  
  await db.collection('deposits').add({
    userId,
    txHash,
    amount,
    status: 'pending',
    createdAt: new Date()
  });
  
  res.json({ success: true });
});

app.post('/api/stake', async (req, res) => {
  const { userId, amount } = req.body;
  
  const userRef = db.collection('users').doc(userId.toString());
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  
  if (userData.balance >= amount) {
    await userRef.update({
      balance: userData.balance - amount,
      stake: userData.stake + amount,
      totalEarned: 0
    });
    
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Insufficient balance' });
  }
});

app.post('/api/withdraw', async (req, res) => {
  const { userId, amount, type } = req.body;
  
  const userRef = db.collection('users').doc(userId.toString());
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  
  if (type === 'roi' && userData.roi >= amount) {
    await db.collection('withdrawals').add({
      userId,
      amount,
      type,
      status: 'pending',
      createdAt: new Date()
    });
    
    await userRef.update({
      roi: userData.roi - amount
    });
    
    res.json({ success: true });
  } else if (type === 'tokens' && userData.balance >= amount) {
    await db.collection('withdrawals').add({
      userId,
      amount,
      type,
      status: 'pending',
      createdAt: new Date()
    });
    
    await userRef.update({
      balance: userData.balance - amount
    });
    
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Insufficient balance' });
  }
});

app.get('/api/transactions/:userId', async (req, res) => {
  const { userId } = req.params;
  const transactions = [];
  
  const deposits = await db.collection('deposits')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
    
  const withdrawals = await db.collection('withdrawals')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
    
  deposits.forEach(doc => {
    transactions.push({ type: 'deposit', ...doc.data() });
  });
  
  withdrawals.forEach(doc => {
    transactions.push({ type: 'withdrawal', ...doc.data() });
  });
  
  res.json(transactions.sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/referral/generate', async (req, res) => {
  const { userId } = req.body;
  const referralLink = `${process.env.WEB_APP_URL}?ref=${userId}`;
  res.json({ referralLink });
});

// Admin routes
app.get('/api/admin/users', async (req, res) => {
  const usersSnapshot = await db.collection('users').get();
  const users = [];
  
  usersSnapshot.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });
  
  res.json(users);
});

app.post('/api/admin/approve-deposit', async (req, res) => {
  const { depositId, userId, amount } = req.body;
  
  const userRef = db.collection('users').doc(userId.toString());
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  
  await userRef.update({
    balance: userData.balance + amount
  });
  
  await db.collection('deposits').doc(depositId).update({
    status: 'approved'
  });
  
  res.json({ success: true });
});

app.post('/api/admin/approve-withdrawal', async (req, res) => {
  const { withdrawalId } = req.body;
  
  await db.collection('withdrawals').doc(withdrawalId).update({
    status: 'approved'
  });
  
  res.json({ success: true });
});

app.post('/api/mining/start', async (req, res) => {
  const { userId } = req.body;
  const userRef = db.collection('users').doc(userId.toString());
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userData = userDoc.data();
  const now = new Date();
  const lastMiningTime = userData.lastMiningTime ? userData.lastMiningTime.toDate() : new Date(0);
  const hoursSinceLastMining = (now - lastMiningTime) / (1000 * 60 * 60);

  if (hoursSinceLastMining < 1) {
    const minutesRemaining = Math.ceil(60 - (hoursSinceLastMining * 60));
    return res.status(400).json({ 
      error: 'Mining cooldown', 
      minutesRemaining,
      nextMiningTime: new Date(lastMiningTime.getTime() + (60 * 60 * 1000))
    });
  }

  // Update user data with mining reward and timestamp
  await userRef.update({
    balance: admin.firestore.FieldValue.increment(4.02), // 4.02 GEN per hour as shown in the image
    lastMiningTime: now,
    miningLevel: userData.miningLevel || 0,
    totalMined: (userData.totalMined || 0) + 4.02
  });

  res.json({ 
    success: true, 
    reward: 4.02,
    nextMiningTime: new Date(now.getTime() + (60 * 60 * 1000))
  });
});

app.get('/api/mining/status/:userId', async (req, res) => {
  const { userId } = req.params;
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userData = userDoc.data();
  const now = new Date();
  const lastMiningTime = userData.lastMiningTime ? userData.lastMiningTime.toDate() : new Date(0);
  const hoursSinceLastMining = (now - lastMiningTime) / (1000 * 60 * 60);
  
  res.json({
    canMine: hoursSinceLastMining >= 1,
    nextMiningTime: new Date(lastMiningTime.getTime() + (60 * 60 * 1000)),
    miningLevel: userData.miningLevel || 0,
    totalMined: userData.totalMined || 0,
    miningRate: 4.02 // GEN per hour
  });
});

app.get('/api/tasks', (req, res) => {
    res.json(mockTasks);
});

app.get('/api/user/balance', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const userData = await getUserData(userId);
        if (!userData) {
            return res.status(500).json({ error: 'Failed to fetch user data' });
        }

        res.json({
            genBalance: userData.genBalance,
            usdtBalance: userData.usdtBalance
        });
    } catch (error) {
        console.error('Error fetching user balance:', error);
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
});

app.get('/api/staking/plans', async (req, res) => {
    try {
        const snapshot = await db.ref('staking/plans').once('value');
        const plans = snapshot.val() || stakingPlans;
        res.json(plans);
    } catch (error) {
        console.error('Error fetching staking plans:', error);
        res.status(500).json({ error: 'Failed to fetch staking plans' });
    }
});

app.get('/api/staking/user-stakes', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const snapshot = await db.ref(`users/${userId}/stakes`).once('value');
        const stakes = snapshot.val() || [];
        res.json(stakes);
    } catch (error) {
        console.error('Error fetching user stakes:', error);
        res.status(500).json({ error: 'Failed to fetch user stakes' });
    }
});

// API endpoint to complete a task
app.post('/api/tasks/:taskId/complete', (req, res) => {
    const taskId = req.params.taskId;
    const task = mockTasks.find(t => t.id === taskId);
    
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    
    if (task.status !== 'active') {
        return res.status(400).json({ error: 'Task is not active' });
    }
    
    // In a real application, you would:
    // 1. Verify the user has completed the task
    // 2. Update the user's balance
    // 3. Mark the task as completed for this user
    // 4. Return the updated task status
    
    res.json({ 
        success: true,
        message: 'Task completed successfully',
        reward: task.reward
    });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Function to sync user data
async function syncUserData(userId, data) {
    try {
        await db.ref(`users/${userId}`).update(data);
        return true;
    } catch (error) {
        console.error('Error syncing user data:', error);
        return false;
    }
}

// Function to get user data
async function getUserData(userId) {
    try {
        const snapshot = await db.ref(`users/${userId}`).once('value');
        return snapshot.val() || {
            genBalance: 0,
            usdtBalance: 0,
            miningRate: 2,
            miningTime: 0,
            level: 1,
            referrals: 0,
            earned: 0,
            activeReferrals: 0,
            transactions: []
        };
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// Admin configuration
const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Admin command handler
bot.command('admin', async (ctx) => {
    try {
        const userId = ctx.from.id;
        console.log('Admin command received from user:', userId);
        
        // Check if user is admin
        if (!ADMIN_IDS.includes(userId.toString())) {
            console.log('Unauthorized admin access attempt by user:', userId);
            await ctx.reply('You are not authorized to use this command.');
            return;
        }

        // Initialize session
        if (!ctx.session) {
            ctx.session = {};
        }

        // Check if user has already authenticated
        const userRef = db.collection('users').doc(userId.toString());
        const userDoc = await userRef.get();
        const userData = userDoc.data() || {};

        if (userData.isAdmin) {
            console.log('User already authenticated as admin:', userId);
            // Send admin panel with inline keyboard
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '📊 User Management', callback_data: 'admin_users' },
                        { text: '💰 Balance Management', callback_data: 'admin_balance' }
                    ],
                    [
                        { text: '📝 Task Management', callback_data: 'admin_tasks' },
                        { text: '📊 Statistics', callback_data: 'admin_stats' }
                    ],
                    [
                        { text: '⚙️ Settings', callback_data: 'admin_settings' }
                    ]
                ]
            };

            await ctx.reply('Admin Panel\n\nChoose an option:', {
                reply_markup: keyboard
            });
        } else {
            console.log('Requesting admin password from user:', userId);
            await ctx.reply('Please enter the admin password:');
            ctx.session.waitingForPassword = true;
            console.log('Session state after setting waitingForPassword:', ctx.session);
        }
    } catch (error) {
        console.error('Error in admin command handler:', error);
        await ctx.reply('An error occurred. Please try again.');
    }
});

// Handle text messages for admin actions
bot.on('text', async (ctx) => {
    try {
        if (!ctx.session) {
            ctx.session = {};
        }

        if (ctx.session.waitingForPassword) {
            console.log('Processing password for user:', ctx.from.id);
            
            if (ctx.message.text === ADMIN_PASSWORD) {
                console.log('Password correct for user:', ctx.from.id);
                
                // Update user as admin
                const userRef = db.collection('users').doc(ctx.from.id.toString());
                const userDoc = await userRef.get();
                const userData = userDoc.data() || {};
                
                await userRef.set({
                    ...userData,
                    isAdmin: true,
                    lastAdminAccess: new Date()
                }, { merge: true });

                // Clear the session
                ctx.session.waitingForPassword = false;
                console.log('Session state after clearing waitingForPassword:', ctx.session);
                
                // Send admin panel
                await sendAdminPanel(ctx);
            } else {
                console.log('Incorrect password for user:', ctx.from.id);
                await ctx.reply('Incorrect password. Please try again or use /cancel to cancel.');
            }
        } else if (ctx.session.waitingForBalanceUpdate) {
            const [userId, amount] = ctx.message.text.split(' ');
            
            if (!userId || !amount || isNaN(amount)) {
                await ctx.reply(
                    'Invalid format. Please use:\n' +
                    '`userId amount`\n\n' +
                    'Example: `5865652025 100`',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            try {
                const userRef = db.collection('users').doc(userId);
                const userDoc = await userRef.get();
                
                if (!userDoc.exists) {
                    await ctx.reply('User not found. Please check the user ID.');
                    return;
                }

                const currentBalance = userDoc.data().balance || 0;
                const newBalance = currentBalance + parseFloat(amount);

                await userRef.update({
                    balance: newBalance,
                    lastUpdated: new Date()
                });

                await ctx.reply(
                    `✅ Balance updated successfully!\n\n` +
                    `User ID: ${userId}\n` +
                    `Previous Balance: ${currentBalance} GEN\n` +
                    `Amount Changed: ${amount} GEN\n` +
                    `New Balance: ${newBalance} GEN`
                );

                // Clear the session
                ctx.session.waitingForBalanceUpdate = false;
                
                // Show admin panel again
                await sendAdminPanel(ctx);
            } catch (error) {
                console.error('Error updating balance:', error);
                await ctx.reply('Error updating balance. Please try again.');
            }
        }
    } catch (error) {
        console.error('Error in text message handler:', error);
        await ctx.reply('An error occurred. Please try again.');
    }
});

// Cancel command to exit password verification
bot.command('cancel', async (ctx) => {
    const session = ctx.session || {};
    if (session.waitingForPassword) {
        session.waitingForPassword = false;
        ctx.session = session;
        await ctx.reply('Password verification cancelled.');
    }
});

// Function to send admin panel
async function sendAdminPanel(ctx) {
    try {
        const adminPanel = {
            text: 'Admin Panel\n\nChoose an option:',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📊 User Management', callback_data: 'admin_users' },
                        { text: '💰 Balance Management', callback_data: 'admin_balance' }
                    ],
                    [
                        { text: '📝 Task Management', callback_data: 'admin_tasks' },
                        { text: '📊 Statistics', callback_data: 'admin_stats' }
                    ],
                    [
                        { text: '⚙️ Settings', callback_data: 'admin_settings' }
                    ]
                ]
            }
        };

        await ctx.reply(adminPanel.text, adminPanel.reply_markup);
    } catch (error) {
        console.error('Error sending admin panel:', error);
        await ctx.reply('Error loading admin panel. Please try again.');
    }
}

// Admin callback query handler
bot.action(/^admin_/, async (ctx) => {
    try {
        const userId = ctx.from.id;
        if (!ADMIN_IDS.includes(userId.toString())) {
            await ctx.answerCbQuery('Unauthorized access');
            return;
        }

        const action = ctx.match[0];
        
        switch (action) {
            case 'admin_users':
                await handleAdminUsers(ctx);
                break;
            case 'admin_balance':
                await handleAdminBalance(ctx);
                break;
            case 'admin_tasks':
                await handleAdminTasks(ctx);
                break;
            case 'admin_stats':
                await handleAdminStats(ctx);
                break;
            case 'admin_settings':
                await handleAdminSettings(ctx);
                break;
            case 'admin_main':
                await sendAdminPanel(ctx);
                break;
        }

        // Answer the callback query to remove the loading state
        await ctx.answerCbQuery();
    } catch (error) {
        console.error('Error handling admin action:', error);
        await ctx.answerCbQuery('Error processing your request');
    }
});

// Admin action handlers
async function handleAdminUsers(ctx) {
    try {
        const usersSnapshot = await db.collection('users').get();
        const users = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            users.push({
                id: doc.id,
                ...userData
            });
        });

        const message = users.map(user => 
            `👤 User ID: ${user.id}\n` +
            `💰 Balance: ${user.balance || 0} GEN\n` +
            `📊 Level: ${user.level || 1}\n` +
            `👥 Referrals: ${user.referrals || 0}\n` +
            `📅 Joined: ${user.createdAt?.toDate().toLocaleDateString() || 'N/A'}\n`
        ).join('\n');

        await ctx.editMessageText(`User List (${users.length}):\n\n${message}`, {
            reply_markup: {
                inline_keyboard: [[
                    { text: '🔙 Back to Main Menu', callback_data: 'admin_main' }
                ]]
            }
        });
    } catch (error) {
        console.error('Error handling admin users:', error);
        await ctx.editMessageText('Error loading user list. Please try again.', {
            reply_markup: {
                inline_keyboard: [[
                    { text: '🔙 Back to Main Menu', callback_data: 'admin_main' }
                ]]
            }
        });
    }
}

async function handleAdminBalance(ctx) {
    try {
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🔙 Back to Main Menu', callback_data: 'admin_main' }
                ]
            ]
        };

        await ctx.editMessageText(
            '💰 Balance Management\n\n' +
            'To update a user\'s balance, send a message in this format:\n' +
            '`userId amount`\n\n' +
            'Example:\n' +
            '`5865652025 100` - Adds 100 GEN\n' +
            '`5865652025 -50` - Deducts 50 GEN\n\n' +
            'Use /cancel to exit balance management mode.',
            {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            }
        );
        
        // Set session state for balance update
        if (!ctx.session) {
            ctx.session = {};
        }
        ctx.session.waitingForBalanceUpdate = true;
        console.log('Balance management mode activated for user:', ctx.from.id);
    } catch (error) {
        console.error('Error in balance management:', error);
        await ctx.reply('Error loading balance management. Please try again.');
    }
}

async function handleAdminTasks(ctx) {
    try {
        const tasksSnapshot = await db.collection('tasks').get();
        const tasks = [];
        
        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            tasks.push({
                id: doc.id,
                ...task
            });
        });

        let message = '📝 Task Management\n\n';
        
        if (tasks.length === 0) {
            message += 'No tasks available.';
        } else {
            tasks.forEach(task => {
                message += `Task ID: ${task.id}\n` +
                         `Name: ${task.name}\n` +
                         `Reward: ${task.reward} GEN\n` +
                         `Status: ${task.status}\n` +
                         `Description: ${task.description || 'No description'}\n\n`;
            });
        }

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '➕ Add New Task', callback_data: 'admin_add_task' },
                    { text: '✏️ Edit Task', callback_data: 'admin_edit_task' }
                ],
                [
                    { text: '🔙 Back to Main Menu', callback_data: 'admin_main' }
                ]
            ]
        };

        await ctx.editMessageText(message, {
            reply_markup: keyboard
        });
    } catch (error) {
        console.error('Error in task management:', error);
        await ctx.reply('Error loading task list. Please try again.');
    }
}

async function handleAdminStats(ctx) {
    try {
        const usersSnapshot = await db.collection('users').get();
        const stats = {
            totalUsers: usersSnapshot.size,
            totalBalance: 0,
            totalReferrals: 0,
            activeUsers: 0
        };

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            stats.totalBalance += userData.balance || 0;
            stats.totalReferrals += userData.referrals || 0;
            if (userData.lastActive && (new Date() - userData.lastActive.toDate()) < 24 * 60 * 60 * 1000) {
                stats.activeUsers++;
            }
        });

        const message = 
            `📊 Statistics\n\n` +
            `👥 Total Users: ${stats.totalUsers}\n` +
            `💰 Total Balance: ${stats.totalBalance} GEN\n` +
            `👥 Total Referrals: ${stats.totalReferrals}\n` +
            `🌟 Active Users (24h): ${stats.activeUsers}`;

        await ctx.editMessageText(message, {
            reply_markup: {
                inline_keyboard: [[
                    { text: '🔙 Back to Main Menu', callback_data: 'admin_main' }
                ]]
            }
        });
    } catch (error) {
        console.error('Error handling admin stats:', error);
        await ctx.editMessageText('Error loading statistics. Please try again.', {
            reply_markup: {
                inline_keyboard: [[
                    { text: '🔙 Back to Main Menu', callback_data: 'admin_main' }
                ]]
            }
        });
    }
}

async function handleAdminSettings(ctx) {
    try {
        await ctx.editMessageText('⚙️ Admin Settings\n\nChoose an option:', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔐 Change Password', callback_data: 'admin_change_password' },
                        { text: '📊 Update Statistics', callback_data: 'admin_update_stats' }
                    ],
                    [
                        { text: '🔙 Back to Main Menu', callback_data: 'admin_main' }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error('Error handling admin settings:', error);
        await ctx.editMessageText('Error loading settings. Please try again.', {
            reply_markup: {
                inline_keyboard: [[
                    { text: '🔙 Back to Main Menu', callback_data: 'admin_main' }
                ]]
            }
        });
    }
} 
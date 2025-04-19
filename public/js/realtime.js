// Real-time data management
class RealTimeData {
    constructor() {
        this.userId = null;
        this.listeners = [];
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            // Firebase configuration
            const firebaseConfig = {
                apiKey: "AIzaSyCZvQ0obFMggq0NjUMBjoWDd5SYAkqlPsg",
                authDomain: "web-bot-7454c.firebaseapp.com",
                databaseURL: "https://web-bot-7454c-default-rtdb.firebaseio.com",
                projectId: "web-bot-7454c",
                storageBucket: "web-bot-7454c.firebasestorage.app",
                messagingSenderId: "629369538479",
                appId: "1:629369538479:web:053fa38231ef4eb7ee515a",
                measurementId: "G-C00Q0MZ1ZX"
            };

            // Check if Firebase is already initialized
            if (!firebase.apps.length) {
                // Initialize Firebase
                firebase.initializeApp(firebaseConfig);
                
                // Initialize Analytics
                firebase.analytics();
                
                console.log('Firebase initialized successfully');
            } else {
                console.log('Firebase already initialized');
            }

            // Initialize Realtime Database
            this.db = firebase.database();
            
            // Set up error handling
            this.db.ref('.info/connected').on('value', (snapshot) => {
                if (snapshot.val() === false) {
                    console.warn('Firebase connection lost');
                } else {
                    console.log('Firebase connected');
                }
            });

        } catch (error) {
            console.error('Error initializing Firebase:', error);
            // Attempt to recover from initialization error
            if (firebase.apps.length) {
                try {
                    this.db = firebase.database();
                    console.log('Recovered Firebase connection');
                } catch (recoveryError) {
                    console.error('Failed to recover Firebase connection:', recoveryError);
                }
            }
        }
    }

    setUserId(userId) {
        this.userId = userId;
        this.startListening();
    }

    startListening() {
        if (!this.userId) {
            console.error('No user ID set');
            return;
        }

        // Listen for user data changes
        this.db.ref(`users/${this.userId}`).on('value', (snapshot) => {
            const data = snapshot.val() || this.getDefaultUserData();
            this.notifyListeners(data);
        });

        // Listen for price updates
        this.db.ref('prices/GEN').on('value', (snapshot) => {
            const priceData = snapshot.val() || { price: 0.000013, change: 0 };
            this.notifyListeners({ ...this.getCurrentData(), price: priceData.price, priceChange: priceData.change });
        });
    }

    getDefaultUserData() {
        return {
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
    }

    getCurrentData() {
        return this.currentData || this.getDefaultUserData();
    }

    addListener(listener) {
        this.listeners.push(listener);
        // Immediately notify with current data
        if (this.currentData) {
            listener(this.currentData);
        }
    }

    notifyListeners(data) {
        this.currentData = data;
        this.listeners.forEach(listener => listener(data));
    }

    // Data update methods
    async updateBalance(amount, currency = 'GEN') {
        if (!this.userId) return false;

        try {
            const updates = {};
            updates[`users/${this.userId}/${currency.toLowerCase()}Balance`] = amount;
            await this.db.ref().update(updates);
            return true;
        } catch (error) {
            console.error('Error updating balance:', error);
            return false;
        }
    }

    async addTransaction(transaction) {
        if (!this.userId) return false;

        try {
            const transactionRef = this.db.ref(`users/${this.userId}/transactions`).push();
            await transactionRef.set({
                ...transaction,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            return true;
        } catch (error) {
            console.error('Error adding transaction:', error);
            return false;
        }
    }

    async updateMiningStats(stats) {
        if (!this.userId) return false;

        try {
            const updates = {};
            Object.keys(stats).forEach(key => {
                updates[`users/${this.userId}/${key}`] = stats[key];
            });
            await this.db.ref().update(updates);
            return true;
        } catch (error) {
            console.error('Error updating mining stats:', error);
            return false;
        }
    }
}

// Create and export a single instance
window.realTimeData = new RealTimeData(); 
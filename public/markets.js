// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Get user ID from URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('tgId');

// Constants
const GEN_PRICE = 0.000013; // Base price in USDT
let currentPrice = GEN_PRICE;
let priceChart;
let trades = [];
let lastTradeTime = new Date();

// DOM Elements
const tradeAmount = document.getElementById('tradeAmount');
const equivalentValue = document.getElementById('equivalentValue');
const tradeButton = document.getElementById('tradeButton');
const tradeTypeButtons = document.querySelectorAll('.trade-type-btn');
const maxButton = document.querySelector('.max-btn');
const genBalance = document.getElementById('genBalance');
const usdtBalance = document.getElementById('usdtBalance');
const priceValue = document.querySelector('.price-value');
const tradesList = document.getElementById('tradesList');

// Initialize price chart
function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Create gradient for chart background
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(50, 205, 50, 0.2)');
    gradient.addColorStop(1, 'rgba(50, 205, 50, 0)');

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Price',
                    data: [],
                    borderColor: '#32cd32',
                    borderWidth: 2,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#32cd32'
                },
                {
                    label: 'Buy Orders',
                    data: [],
                    borderColor: '#28a745',
                    backgroundColor: '#28a745',
                    pointRadius: 4,
                    pointStyle: 'triangle',
                    showLine: false
                },
                {
                    label: 'Sell Orders',
                    data: [],
                    borderColor: '#dc3545',
                    backgroundColor: '#dc3545',
                    pointRadius: 4,
                    pointStyle: 'triangle',
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#ffffff',
                        usePointStyle: true
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(6) + ' USDT';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            minute: 'HH:mm'
                        }
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#888',
                        maxRotation: 0
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#888',
                        callback: value => value.toFixed(6)
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Fetch trading history
async function fetchTradingHistory() {
    try {
        const response = await fetch('/api/trading/history');
        const data = await response.json();
        
        if (data.success) {
            trades = data.trades;
            updateChartWithTrades();
        }
    } catch (error) {
        console.error('Error fetching trading history:', error);
    }
}

// Update chart with trades
function updateChartWithTrades() {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    
    // Filter trades from the last hour
    const recentTrades = trades.filter(trade => new Date(trade.timestamp) > oneHourAgo);
    
    // Sort trades by timestamp
    recentTrades.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Prepare data for chart
    const labels = recentTrades.map(trade => new Date(trade.timestamp));
    const prices = recentTrades.map(trade => trade.price);
    const buyOrders = recentTrades.filter(trade => trade.type === 'buy')
        .map(trade => ({
            x: new Date(trade.timestamp),
            y: trade.price
        }));
    const sellOrders = recentTrades.filter(trade => trade.type === 'sell')
        .map(trade => ({
            x: new Date(trade.timestamp),
            y: trade.price
        }));

    // Update chart data
    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = prices;
    priceChart.data.datasets[1].data = buyOrders;
    priceChart.data.datasets[2].data = sellOrders;
    
    // Update current price
    if (recentTrades.length > 0) {
        currentPrice = recentTrades[recentTrades.length - 1].price;
        updatePriceDisplay();
    }
    
    priceChart.update();
}

// Calculate new price based on trade
function calculateNewPrice(type, amount) {
    const impact = amount * 0.0000001; // Price impact factor
    const change = type === 'buy' ? impact : -impact;
    return Math.max(0.000001, currentPrice + change);
}

// Update price display
function updatePriceDisplay() {
    priceValue.textContent = currentPrice.toFixed(6);
    updateEquivalentValue();
}

// Update equivalent value when amount changes
function updateEquivalentValue() {
    const amount = parseFloat(tradeAmount.value) || 0;
    const total = amount * currentPrice;
    equivalentValue.textContent = `≈ ${total.toFixed(6)} USDT`;
}

// Handle trade execution
async function executeTrade() {
    const type = document.querySelector('.trade-type-btn.active').dataset.type;
    const amount = parseFloat(tradeAmount.value);
    
    if (!amount || amount <= 0) {
        tg.showAlert('Please enter a valid amount');
        return;
    }

    const total = amount * currentPrice;

    try {
        const response = await fetch('/api/trade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                type,
                amount,
                price: currentPrice,
                total,
                timestamp: new Date().toISOString()
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Update balances
            genBalance.textContent = data.genBalance.toFixed(6);
            usdtBalance.textContent = data.usdtBalance.toFixed(6);
            
            // Add trade to history and update chart
            trades.push({
                type,
                amount,
                price: currentPrice,
                timestamp: new Date().toISOString()
            });
            updateChartWithTrades();
            
            // Clear input
            tradeAmount.value = '';
            equivalentValue.textContent = '≈ 0.00 USDT';
            
            // Add trade to recent trades list
            addTradeToList(type, amount, currentPrice);
            
            // Calculate new price based on trade
            currentPrice = calculateNewPrice(type, amount);
            updatePriceDisplay();
            
            tg.showAlert(`${type.toUpperCase()} order executed successfully!`);
        } else {
            tg.showAlert(data.message || 'Failed to execute trade');
        }
    } catch (error) {
        console.error('Error executing trade:', error);
        tg.showAlert('Error executing trade. Please try again.');
    }
}

// Add trade to recent trades list
function addTradeToList(type, amount, price) {
    const tradeItem = document.createElement('div');
    tradeItem.className = 'trade-item';
    tradeItem.innerHTML = `
        <span class="trade-type ${type}">${type.toUpperCase()}</span>
        <span class="trade-amount">${amount.toFixed(6)} GEN</span>
        <span class="trade-price">${price.toFixed(6)} USDT</span>
    `;
    
    tradesList.insertBefore(tradeItem, tradesList.firstChild);
    
    // Keep only last 10 trades
    if (tradesList.children.length > 10) {
        tradesList.removeChild(tradesList.lastChild);
    }
}

// Event Listeners
tradeTypeButtons.forEach(button => {
    button.addEventListener('click', () => {
        tradeTypeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const type = button.dataset.type;
        tradeButton.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} GEN`;
        tradeButton.className = `trade-btn ${type}`;
    });
});

maxButton.addEventListener('click', () => {
    const activeType = document.querySelector('.trade-type-btn.active').dataset.type;
    if (activeType === 'buy') {
        const maxGEN = parseFloat(usdtBalance.textContent) / currentPrice;
        tradeAmount.value = maxGEN.toFixed(6);
    } else {
        tradeAmount.value = genBalance.textContent;
    }
    updateEquivalentValue();
});

tradeAmount.addEventListener('input', updateEquivalentValue);
tradeButton.addEventListener('click', executeTrade);

// Fetch user balances
async function fetchBalances() {
    try {
        const response = await fetch(`/api/balances/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            genBalance.textContent = data.genBalance.toFixed(6);
            usdtBalance.textContent = data.usdtBalance.toFixed(6);
        }
    } catch (error) {
        console.error('Error fetching balances:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (userId) {
        initChart();
        fetchTradingHistory();
        fetchBalances();
        
        // Set up periodic updates
        setInterval(fetchTradingHistory, 30000); // Update every 30 seconds
    }
}); 
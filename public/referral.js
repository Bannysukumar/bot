// Referral system configuration
const REFERRAL_CONFIG = {
    LEVEL1_PERCENTAGE: 0.04, // 4% for level 1
    LEVEL2_PERCENTAGE: 0.02, // 2% for level 2
    MAX_LEVELS: 2
};

// Generate referral link
function generateReferralLink(userId) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/?ref=${userId}`;
}

// Get referral data from URL
function getReferralData() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
}

// Handle referral registration
async function handleReferralRegistration(userId, referrerId) {
    try {
        const response = await fetch('/api/referral/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                referrerId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to register referral');
        }

        return await response.json();
    } catch (error) {
        console.error('Error registering referral:', error);
        throw error;
    }
}

// Calculate referral earnings
function calculateReferralEarnings(amount, level) {
    if (level === 1) {
        return amount * REFERRAL_CONFIG.LEVEL1_PERCENTAGE;
    } else if (level === 2) {
        return amount * REFERRAL_CONFIG.LEVEL2_PERCENTAGE;
    }
    return 0;
}

// Get referral statistics
async function getReferralStats(userId) {
    try {
        const response = await fetch(`/api/referral/stats/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch referral stats');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching referral stats:', error);
        throw error;
    }
}

// Update referral UI
function updateReferralUI(stats) {
    // Update level 1 referrals
    document.getElementById('level1Count').textContent = stats.level1Count || 0;
    document.getElementById('level1Earnings').textContent = (stats.level1Earnings || 0).toFixed(6);

    // Update level 2 referrals
    document.getElementById('level2Count').textContent = stats.level2Count || 0;
    document.getElementById('level2Earnings').textContent = (stats.level2Earnings || 0).toFixed(6);

    // Update total earnings
    document.getElementById('totalEarnings').textContent = (stats.totalEarnings || 0).toFixed(6);
}

// Copy referral link to clipboard
function copyReferralLink() {
    const referralLink = document.getElementById('referralLink').value;
    navigator.clipboard.writeText(referralLink).then(() => {
        alert('Referral link copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy referral link:', err);
    });
}

// Share referral link
function shareReferralLink() {
    const referralLink = document.getElementById('referralLink').value;
    const shareData = {
        title: 'Join GEN Bot',
        text: 'Join GEN Bot and start earning!',
        url: referralLink
    };

    if (navigator.share) {
        navigator.share(shareData)
            .catch(err => console.error('Error sharing:', err));
    } else {
        // Fallback for browsers that don't support Web Share API
        copyReferralLink();
    }
}

// Initialize referral system
function initReferralSystem(userId) {
    // Generate and display referral link
    const referralLink = generateReferralLink(userId);
    document.getElementById('referralLink').value = referralLink;

    // Add event listeners
    document.getElementById('copyLinkBtn').addEventListener('click', copyReferralLink);
    document.getElementById('shareLinkBtn').addEventListener('click', shareReferralLink);

    // Load referral stats
    getReferralStats(userId)
        .then(stats => updateReferralUI(stats))
        .catch(err => console.error('Error loading referral stats:', err));
}

// Export functions
window.referralSystem = {
    init: initReferralSystem,
    handleRegistration: handleReferralRegistration,
    getReferralData: getReferralData,
    calculateEarnings: calculateReferralEarnings
}; 
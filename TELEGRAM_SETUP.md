# Telegram Channel Setup Guide

## Getting Your Telegram Channel ID

Follow these steps to get your Telegram Channel ID and enable channel updates:

### Step 1: Create a Telegram Channel (if you don't have one)
1. Open Telegram
2. Click on the menu (☰) → **New Channel**
3. Enter channel name and description
4. Choose **Public** or **Private** channel
5. Create the channel

### Step 2: Add the Bot as Administrator
1. Open your channel
2. Click on the channel name to open settings
3. Click **Administrators**
4. Click **Add Administrator**
5. Search for your bot: `@YourBotUsername`
6. Add the bot and grant it permission to **Post Messages**

### Step 3: Get the Channel ID
There are two methods:

#### Method A: Forward a Message (Recommended)
1. Send any message to your channel
2. Forward that message to your bot
3. The bot will automatically detect the channel ID and display it
4. Copy the Channel ID from the bot's response

#### Method B: Send a Message in the Channel
1. Add the bot to your channel as admin
2. Send any message in the channel (or forward any message)
3. Check your console/terminal where the bot is running
4. You'll see a log entry with the Channel ID

### Step 4: Update Your .env File
Add the Channel ID to your `.env` file:

```bash
TELEGRAM_CHANNEL_ID=-100xxxxxxxxxx
```

**Note:** Channel IDs typically start with `-100` for supergroups and channels.

### Step 5: Restart the Bot
```bash
npm start
```

## What Updates Will Be Sent to the Channel?

Once configured, your channel will receive:

### 🚨 Opportunity Alerts
- Triggered when a profitable arbitrage opportunity is found
- Includes profit percentage, amount, score, and risk level
- Shows detailed trade breakdown

**Frequency:** When BUY or STRONG_BUY opportunities are detected (every 2-15 minutes)

### 📊 Daily Performance Reports
- Complete summary of the day's performance
- Scanning statistics and success rates
- Best opportunity of the day
- System health status

**Frequency:** Once per day at midnight (00:00)

### 💊 Health Check Updates
- System status (MongoDB, Binance API, WebSocket)
- Uptime and memory usage
- Active jobs and last scan time

**Frequency:** Every 6 hours

## Testing Your Setup

1. Start the bot with `npm start`
2. Send `/start` to your bot to verify it's working
3. Forward a message from your channel to the bot
4. Check that the bot displays your Channel ID
5. Update your `.env` file with the Channel ID
6. Restart the bot
7. Wait for the next scheduled task or trigger a manual scan

## Troubleshooting

### "Chat not found" Error
- Make sure the bot is added as an administrator to the channel
- Verify the Channel ID is correct (should start with `-100`)
- Ensure the bot has permission to post messages

### Bot Not Posting to Channel
- Check that `TELEGRAM_CHANNEL_ID` is set in `.env`
- Verify the bot is an admin with post permissions
- Restart the bot after updating `.env`

### Getting Wrong Channel ID
- Make sure you're forwarding from the correct channel
- Channel IDs for supergroups/channels start with `-100`
- Private chat IDs are different from channel IDs

## Example .env Configuration

```bash
# Telegram Bot Configuration
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=8312004557:AAGJNBgERQqPjoJ8ayoo0qaiCCiy2NlLX74
TELEGRAM_CHAT_ID=6657939040
TELEGRAM_CHANNEL_ID=-1001234567890  # ← Add this after getting it from the bot
```

## Channel Update Schedule

| Update Type | Frequency | Trigger |
|------------|-----------|---------|
| Opportunity Alerts | As found | BUY/STRONG_BUY signals |
| Performance Report | Daily | 00:00 (midnight) |
| Health Check | Every 6 hours | 00:00, 06:00, 12:00, 18:00 |
| Deep Scan Results | Every 15 minutes | Cron schedule |

## Message Format Examples

### Opportunity Alert
```
🚨 ARBITRAGE OPPORTUNITY DETECTED!
━━━━━━━━━━━━━━━━━━━━

💎 Triangle: BTC → ETH → USDT → BTC
💰 Profit: 0.4523%
💵 Amount: $45.23
⚡ Score: 87/100
📊 Risk Level: LOW
⏱️ Speed: 1250ms

🔄 Trade Breakdown:
1️⃣ Buy BTC with USDT
2️⃣ Trade BTC to ETH
3️⃣ Complete cycle ETH to USDT

🕐 Nov 5, 2025 14:32:15
```

### Daily Report
```
📊 Daily Performance Report
━━━━━━━━━━━━━━━━━━━━

🔍 Scanning Stats:
• Total Scans: 142
• Opportunities Found: 8
• Success Rate: 5.6%

💰 Best Opportunity:
• Profit: 0.5234%
• Path: BTC → ETH → BNB → BTC

⚡ Execution:
• Trades Executed: 0
• Successful: 0
• Failed: 0

📈 System Health:
• Uptime: 1440 minutes
• MongoDB: ✅
• WebSocket: ✅

🕐 Nov 5, 2025 00:00:00
```

### Health Check
```
✅ System Health Check
━━━━━━━━━━━━━━━━━━━━

🔌 Connections:
• MongoDB: ✅ Connected
• Binance API: ✅ Active
• WebSocket: ⚠️ Inactive

⚙️ System:
• Uptime: 360 minutes
• Memory: 245.67 MB
• CPU: N/A

📊 Activity:
• Last Scan: Just now
• Active Jobs: 5

🕐 Nov 5, 2025 12:00:00
```

---

**Need Help?** Check the main README.md or contact the developer.

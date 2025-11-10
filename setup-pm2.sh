#!/bin/bash

# PM2 Setup Script for Crypto Arbitrage Bot
# Ubuntu/Debian Linux

echo "🚀 Setting up PM2 for Crypto Arbitrage Bot..."
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    sudo npm install -g pm2
    echo "✅ PM2 installed successfully"
else
    echo "✅ PM2 already installed"
fi

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Stop any existing instance
echo "🛑 Stopping any existing bot instances..."
pm2 stop crypto-arbitrage-bot 2>/dev/null || true
pm2 delete crypto-arbitrage-bot 2>/dev/null || true

# Start the bot with PM2
echo "🚀 Starting bot with PM2..."
pm2 start ecosystem.config.json

# Save PM2 process list
echo "💾 Saving PM2 process list..."
pm2 save

# Setup PM2 to start on system boot
echo "⚙️  Configuring PM2 startup script..."
PM2_STARTUP_CMD=$(pm2 startup systemd -u $USER --hp $HOME | grep "sudo")
if [ ! -z "$PM2_STARTUP_CMD" ]; then
    echo "Running: $PM2_STARTUP_CMD"
    eval $PM2_STARTUP_CMD
    echo "✅ PM2 startup configured"
else
    echo "⚠️  PM2 startup already configured or command not found"
fi

# Display status
echo ""
echo "📊 Current PM2 status:"
pm2 status

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Useful PM2 commands:"
echo "   pm2 status                    - Show bot status"
echo "   pm2 logs crypto-arbitrage-bot - View live logs"
echo "   pm2 restart crypto-arbitrage-bot - Restart bot"
echo "   pm2 stop crypto-arbitrage-bot - Stop bot"
echo "   pm2 monit                     - Monitor resources"
echo "   pm2 flush                     - Clear logs"
echo ""

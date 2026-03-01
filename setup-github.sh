#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Scripture Unlocked — GitHub Repository Setup
# Run this from your local machine after downloading the repo
# ═══════════════════════════════════════════════════════════════

echo "🔥 Scripture Unlocked — GitHub Setup"
echo "======================================"
echo ""

# Step 1: Create the repo on GitHub first
echo "STEP 1: Create a new repository on GitHub"
echo "  → Go to: https://github.com/new"
echo "  → Repository name: scripture-unlocked"
echo "  → Description: Interactive Bible Study Platform — God's Word. Your Blueprint for Living."
echo "  → Private repository (recommended until launch)"
echo "  → Do NOT initialize with README (we have one)"
echo ""
read -p "Press Enter after creating the empty repo on GitHub..."

# Step 2: Set remote and push
echo ""
echo "STEP 2: Pushing to GitHub..."
echo ""

# Update this with your GitHub username
GITHUB_USER="markwasmuth"


git remote add origin "https://github.com/${GITHUB_USER}/scripture-unlocked.git"
git push -u origin main

echo ""
echo "✅ Repository pushed to GitHub!"
echo ""
echo "NEXT STEPS:"
echo "  1. Connect to Vercel: https://vercel.com/new → Import from GitHub"
echo "  2. Set environment variables in Vercel dashboard"
echo "  3. Domain: Add scriptureunlocked.app (or your chosen domain) in Vercel"
echo "  4. Run 'npm install' locally to install dependencies"
echo "  5. Run 'npm run dev' to start local development"
echo ""
echo "For mobile (after web is stable):"
echo "  npm run cap:add:ios"
echo "  npm run cap:add:android"
echo "  npm run cap:sync"
echo ""
echo "🙏 BE who God made you. DO what He commanded. HAVE what He promised."

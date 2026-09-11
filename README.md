# 🚀 Career Automator

A professional-grade job application automation engine tailored for high-value roles in IT GRC, Cybersecurity, and Network Engineering. This tool is designed to bridge the gap between technical expertise and the tedious process of online applications.

## 🌟 Key Features

- **🎯 Surgical Targeting**: Specifically optimized for GRC (Governance, Risk, and Compliance), Network Infrastructure, and IT Audit roles.
- **🤖 Intelligent Screening**: Integrated with LLMs (via Gemini API) to automatically and accurately answer complex screening questions based on a professional Magister (S2) profile.
- **🌐 Multi-Platform Support**: Automated application flows for **LinkedIn**, **Jobstreet**, **Glints**, and **Indeed**.
- **🛡️ Anti-Detection Engine**: Utilizes real Google Chrome sessions to bypass bot detection and maintain account safety.
- **📊 Real-time Tracking**: Seamless integration with Google Sheets for application history and progress monitoring.

## 🛠️ Technical Stack

- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS (Emerald/Cyan Theme)
- **Automation**: Puppeteer / Playwright
- **AI Engine**: Google Gemini API
- **Database**: Google Sheets API

## 🚀 Quick Start

### 1. Local Installation
```bash
git clone https://github.com/hibban-1202184369/career-automator.git
cd career-automator
npm install
npm run dev
```

### 2. Configuration
Access the dashboard at `http://localhost:3000` and configure:
- **API Keys**: Set up your Gemini and Google Cloud credentials.
- **Profile**: Update your professional details (Education: Magister S2, GPA, Experience).
- **Keywords**: Define your target roles (e.g., "IT Auditor", "Network Engineer").

### 3. Deployment
The easiest way to deploy is via **Vercel**:
1. Import this repo to Vercel.
2. Add Environment Variables (`GEMINI_API_KEY`, `GOOGLE_SHEETS_ID`, etc.).
3. Deploy and run.

## ⚠️ Safety Guidelines
To avoid account flags, it is recommended to:
- Limit daily applications to **20-30**.
- Use **Headful mode** for initial login setup.
- Keep concurrency low (**1-2 workers**).

---
*Developed for high-impact career growth in Mining, Energy, and Offshore sectors.*

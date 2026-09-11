# 🚀 Career Automator

A professional-grade job application automation engine designed to streamline the application process for high-value roles in IT GRC, Cybersecurity, and Network Engineering. This tool leverages AI to handle tedious screening questions and maximize application efficiency.

## 🌟 Key Features

- **🎯 Industry-Specific Targeting**: Optimized for GRC (Governance, Risk, and Compliance), Network Infrastructure, and IT Audit roles.
- **🤖 Intelligent Screening**: Integrated with LLMs (via Gemini API) to automatically and accurately answer complex screening questions based on the user's professional profile.
- **🌐 Multi-Platform Support**: Automated application flows for **LinkedIn**, **Jobstreet**, **Glints**, and **Indeed**.
- **🛡️ Anti-Detection Engine**: Utilizes real browser sessions to bypass bot detection and maintain account safety.
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
- **Profile**: Input your professional details (Education, GPA, Experience).
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
*Designed for professionals seeking high-impact roles in Mining, Energy, and Offshore sectors.*

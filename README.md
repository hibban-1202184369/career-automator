# 🚀 Career Automator

A professional-grade job application automation engine designed to streamline the application process for high-value roles across various industries. This tool leverages AI to handle tedious screening questions and maximize application efficiency.

## 🌟 Key Features

- **🎯 Fully Customizable Targeting**: Users can define their own target industries, roles, and keywords (e.g., GRC, Network Engineering, Finance, Healthcare, etc.) directly through the dashboard.
- **🤖 Intelligent Screening**: Integrated with LLMs (via Gemini API) to automatically and accurately answer complex screening questions based on the user's specific professional profile.
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
- **Keywords**: Define your target roles and industries (e.g., "IT Auditor", "Financial Analyst", "Project Manager").

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
*Empowering professionals to accelerate their career growth across all sectors.*

# Aarigo Capital — Frontend Application

Loan management, EMI tracking, customer onboarding, and field collections web application for Aarigo Capital.

## Tech Stack
- **Framework**: TanStack Start / React 19
- **Routing**: TanStack Router
- **State Management**: React Context & Store
- **Styling**: Tailwind CSS, Radix UI, Lucide Icons
- **Build Tool**: Vite

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `VITE_API_URL` points to your backend API.

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

## Vercel Deployment
This repository is configured for immediate zero-config deployment on Vercel. Connect this repository to Vercel and it will automatically build using `npm run build` and output to `.output/public`.

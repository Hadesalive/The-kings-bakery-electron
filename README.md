# The Kings Bakery POS System

A modern, offline-first Point of Sale (POS) system built with Electron, React, TypeScript, and Vite for The Kings Bakery.

## Features

- 🖥️ **Desktop Application** - Built with Electron for cross-platform support
- 📊 **Analytics Dashboard** - Track sales, revenue, and popular items
- 🍰 **Menu Management** - Easy-to-use interface for managing menu items
- 💾 **Offline-First** - Works completely offline with local SQLite database
- 🎨 **Beautiful UI** - Clean, modern interface with Material UI and Hero Icons
- 📸 **Media Storage** - Local storage for product images

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: Material UI (MUI)
- **Icons**: Hero Icons
- **Database**: Better SQLite3
- **Desktop**: Electron
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
npm run electron:dev
```

This will:
- Start the Vite dev server on http://localhost:5173
- Launch the Electron app
- Enable hot reload

### Building

Build for production:
```bash
npm run build
npm run electron:build
```

## Project Structure

```
├── electron/          # Electron main process
│   ├── main.ts       # Main process entry point
│   └── preload.ts    # Preload script for IPC
├── src/
│   ├── components/   # React components
│   ├── pages/        # Page components
│   ├── utils/        # Utility functions (database, etc.)
│   ├── App.tsx       # Main app component
│   └── main.tsx      # React entry point
├── index.html        # HTML template
└── vite.config.ts    # Vite configuration
```

## Database Schema

The system uses SQLite with the following tables:
- `menu_items` - Product catalog
- `orders` - Order records
- `order_items` - Order line items
- `analytics` - Daily sales analytics

## License

MIT


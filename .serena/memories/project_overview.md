# Project Overview

## Project Name
RoleplayOfSmartICE - Restaurant Operations PWA

## Purpose
This is a restaurant operations management system designed to manage daily workflows for restaurants. It provides role-based dashboards for different staff members (Manager, Chef, Duty Manager) to track and complete tasks throughout the day. The system manages task workflows across different time periods during restaurant operations, from opening preparation to closing procedures.

## Tech Stack
- **Frontend Framework**: React 19.1.0 with TypeScript
- **UI Library**: Material-UI (MUI) v7
- **State Management**: Redux Toolkit + React Redux
- **Database/Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **Build Tool**: Vite 7.0.4
- **PWA Features**: vite-plugin-pwa + Workbox
- **Face Recognition**: face-api.js + FaceIO
- **Animation**: Framer Motion, React Spring
- **Date Handling**: date-fns
- **Routing**: React Router DOM v7

## Project Structure
```
/
├── restaurant-ops-pwa/          # Main PWA application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── contexts/          # React contexts for state management
│   │   ├── pages/            # Page components (Login, Dashboards, etc.)
│   │   ├── services/         # Service layer (API, business logic)
│   │   ├── store/           # Redux store configuration
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   ├── hooks/           # Custom React hooks
│   │   └── theme/           # MUI theme configuration
│   ├── public/              # Static assets
│   ├── supabase/           # Supabase configuration
│   └── scripts/            # Build and utility scripts
├── src/                    # Root level source (possibly legacy)
└── docs/                   # Documentation
```

## Key Features
- Multi-restaurant support with database-driven configuration
- Role-based access (Manager, Chef, Duty Manager, Staff, CEO)
- Time-period based task management (Opening, Lunch, Dinner, Closing)
- Real-time task tracking and submission
- Photo/audio evidence collection for tasks
- Face recognition for login
- PWA capabilities for offline usage
- CEO dashboard for analytics and monitoring

## Business Hours
Inferred from workflow periods in database:
- Opening: 10:00 AM
- Closing: 10:00 PM (22:00)
- Supports cross-day operations
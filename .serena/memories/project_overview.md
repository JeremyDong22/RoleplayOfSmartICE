# Restaurant Operations PWA Project Overview

## Purpose
A Progressive Web Application for restaurant operations management with role-based dashboards for:
- CEO/Store Manager
- Duty Manager  
- Chef
- Staff roles

## Main Features
- Task management and tracking
- Inventory management
- Photo submission and approval workflows
- Real-time status monitoring
- Custom cookie-based authentication (NOT using Supabase Auth)
- Face recognition login via face-api.js

## Architecture
- Frontend: React PWA in `/restaurant-ops-pwa`
- Backend: Supabase (PostgreSQL + Storage only, NOT Auth)
- Deployment: Vercel
- State Management: Redux Toolkit
- Authentication: Custom cookie-based system
- Database tables use `roleplay_` prefix

## Key Services Used
- **Supabase**: Database and file storage only
- **Custom Auth**: Cookie-based authentication via authService.ts
- **Face Recognition**: face-api.js for biometric login
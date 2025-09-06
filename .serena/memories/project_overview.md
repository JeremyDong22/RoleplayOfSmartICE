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
- Role-based authentication via Supabase

## Architecture
- Frontend: React PWA in `/restaurant-ops-pwa`
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Deployment: Vercel
- State Management: Redux Toolkit
- Database tables use `roleplay_` prefix
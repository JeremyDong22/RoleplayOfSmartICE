# Restaurant Operations Management PWA
# 餐厅运营管理系统

A Progressive Web App (PWA) for restaurant operations management with role-based access, task tracking, and real-time monitoring.

## Features / 功能

- **Role-Based Access Control** / 基于角色的访问控制
  - CEO: Full system access with hierarchical view
  - Manager (前厅): Front-of-house operations
  - Chef (后厨): Kitchen operations  
  - Staff: Task execution

- **Task Management** / 任务管理
  - Countdown timer with audio alerts
  - Time-based task scheduling
  - Media submission (photo/video/text)
  - Late submission tracking

- **Real-Time Updates** / 实时更新
  - Live task status monitoring
  - Team activity tracking
  - Push notifications

- **PWA Features** / PWA特性
  - Offline capability
  - Install as app
  - Push notifications

## Technology Stack / 技术栈

- **Frontend**: React 18, TypeScript, Material-UI
- **State Management**: Redux Toolkit
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **PWA**: Vite PWA Plugin, Workbox

## Setup Instructions / 设置说明

### Prerequisites / 前置要求

- Node.js 18+
- npm or yarn
- Supabase account

### Installation / 安装

1. Clone the repository / 克隆仓库
```bash
git clone <repository-url>
cd restaurant-ops-pwa
```

2. Install dependencies / 安装依赖
```bash
npm install
```

3. Configure environment variables / 配置环境变量
Create a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start development server / 启动开发服务器
```bash
npm run dev
```

## Usage / 使用说明

### Demo Accounts / 演示账号

Create test users in Supabase Auth with the following roles:

1. **CEO Account**
   - Email: ceo@restaurant.com
   - Role: CEO

2. **Manager Account**
   - Email: manager@restaurant.com
   - Role: Manager

3. **Chef Account**
   - Email: chef@restaurant.com
   - Role: Chef

4. **Staff Account**
   - Email: staff@restaurant.com
   - Role: Staff

### Creating Users / 创建用户

1. Go to Supabase Dashboard > Authentication > Users
2. Create new user with email/password
3. After user creation, insert user profile:

```sql
INSERT INTO user_profiles (id, email, full_name, role) 
VALUES ('user-uuid-here', 'email@example.com', 'Full Name', 'Role');
```

### Daily Workflow / 日常工作流程

The system follows the restaurant's daily schedule:

- **10:00-10:30** - Opening / 开店
- **10:35-11:25** - Lunch Prep / 午餐准备
- **11:30-14:00** - Lunch Service / 午餐服务
- **14:00-14:30** - Lunch Closing / 午餐收市
- **16:30-17:00** - Dinner Prep / 晚餐准备
- **17:00-21:30** - Dinner Service / 晚餐服务
- **21:30+** - Pre-closing / 预打烊
- **22:00+** - Final Closing / 闭店

## Development / 开发

### Build for production / 生产构建
```bash
npm run build
```

### Preview production build / 预览生产构建
```bash
npm run preview
```

### Type checking / 类型检查
```bash
npm run type-check
```

## Project Structure / 项目结构

```
restaurant-ops-pwa/
├── src/
│   ├── components/        # Reusable components
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── store/            # Redux store
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── public/               # Static assets
└── package.json          # Dependencies
```

## Contributing / 贡献

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License / 许可

This project is proprietary software for restaurant operations management.

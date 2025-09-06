# Project Structure

```
RoleplayOfSmartICE/
├── restaurant-ops-pwa/         # Main PWA application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components (dashboards)
│   │   ├── services/         # API/Supabase services
│   │   ├── store/            # Redux store & slices
│   │   ├── hooks/            # Custom React hooks
│   │   ├── types/            # TypeScript type definitions
│   │   ├── contexts/         # React contexts
│   │   ├── constants/        # App constants
│   │   ├── utils/            # Utility functions
│   │   ├── theme/            # MUI theme config
│   │   ├── App.tsx           # Main app component
│   │   └── main.tsx          # Entry point
│   ├── public/               # Static assets
│   ├── package.json          # Dependencies
│   └── vite.config.ts        # Vite configuration
├── .serena/                  # Serena memories
├── package.json              # Root package.json
└── CLAUDE.md                 # Project instructions
```

## Key Directories
- **components**: Reusable UI components
- **pages**: Role-specific dashboards
- **services**: Supabase integration layer
- **store**: Redux state management
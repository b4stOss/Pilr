# Pilr

A Progressive Web App for medication reminder management with partner support.

## Overview

Pilr is a PWA designed to help users track their daily medication schedule with advanced features like escalating notifications and partner monitoring. Built with React, TypeScript, and Supabase, it provides a reliable way to never miss important medications.

## Features

- 🔔 Progressive notifications with escalation
- 👥 Partner monitoring system
- 🌐 Works offline (PWA)
- 📱 Mobile-first design
- 🔒 Secure authentication
- 📊 History tracking
- 🕒 Customizable reminder times
- 🔄 Real-time updates

## Tech Stack

- **Frontend:**
  - React 18.3
  - TypeScript 5.6
  - Vite 6.0
  - Mantine UI
  - PWA with Service Workers
  - WebPush API

- **Backend:**
  - Supabase
  - Edge Functions (Deno)

## Prerequisites

Before you begin, ensure you have met the following requirements:
- Node.js 18+
- [mkcert](https://github.com/FiloSottile/mkcert) for local SSL certificates
- A Supabase account
- VAPID keys for web push notifications

## Getting Started

### Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pill-pwa.git
cd pill-pwa
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up local SSL certificates:
```bash
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

4. Create environment files:

`.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

5. Start the development server:
```bash
pnpm run dev
```

### Supabase Configuration

1. Create a new Supabase project
2. Set up the following tables:
   - user_preferences
   - pill_tracking
   - user_partners
3. Configure authentication:
   - Enable Google OAuth
   - Add redirect URLs:
     ```
     https://localhost:5173/**
     https://your-production-domain.com/**
     ```

### Production Deployment

1. Build the project:
```bash
pnpm run build
```

2. Deploy to your hosting service of choice (e.g., Cloudflare Pages, Vercel)
3. Set up the environment variables in your hosting platform
4. Configure your domain and SSL certificates

## Project Structure

```
pill-pwa/
├── src/
│   ├── components/    # Reusable UI components
│   ├── contexts/      # React contexts
│   ├── hooks/         # Custom React hooks
│   ├── lib/          # Utilities and configurations
│   ├── pages/        # Page components
│   └── sw.js         # Service Worker
├── public/           # Static assets
└── supabase/        # Supabase configurations and functions
```

## Development Guide

### Adding New Features

1. Create components in `src/components`
2. Add business logic in custom hooks
3. Update service worker if needed
4. Test PWA functionality
5. Follow the commit convention

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use functional components
- Implement proper error handling

## Testing

```bash
# Run linting
pnpm run lint

# Build for production
pnpm run build
```

## Deployment

The project uses standard-version for release management:

```bash
# Create a new release
pnpm run release
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Vite](https://vitejs.dev/) for the build tooling
- [Mantine](https://mantine.dev/) for the UI components
- [Supabase](https://supabase.io/) for the backend infrastructure

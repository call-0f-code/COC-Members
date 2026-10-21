# CodeNest

**CodeNest** is a comprehensive member management and collaboration platform built for the **Call of Code (CoC) club**. This application helps club members track their progress, share interview experiences, manage DSA topics, and build their professional profiles.

## 🎯 Features

- **User Profiles**: Build and showcase professional profiles
- **Interview Experiences**: Share and browse interview experiences
- **DSA Dashboard**: Track Data Structures and Algorithms progress
- **Progress Tracking**: Monitor individual learning progress
- **Topic Management**: Organize and track various CS topics

## 🛠️ Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Query** - Data fetching
- **React Hot Toast** - Notifications
- **Radix UI** - Component primitives

### Backend
- **Bun** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **JWT** - Authentication
- **Zod** - Schema validation
- **Helmet** - Security middleware
- **Rate Limiting** - API protection

---

## 🐳 Docker (Recommended)

The easiest way to run the full stack — no Bun or Node required on your host machine.

### Quick Start

```bash
# 1. Set up the COC API env (gitignored — copy template and fill in Supabase credentials)
cp docker/.env.example.coc-api docker/.env.local.coc-api

# 2. Review/edit the backend and frontend env files (safe defaults pre-filled)
docker/.env.local.backend
docker/.env.local.frontend

# 3. Build images and start all three services
docker compose up --build

# 4. Enable hot-reload during development (file changes sync automatically)
docker compose up --build --watch
```

| Service | URL |
| ------- | --- |
| Member Frontend | http://localhost:5173 |
| Member Backend API | http://localhost:8000 |
| COC API | http://localhost:3000 |

> For the full setup guide — environment variables, CI/CD, watch mode, and troubleshooting — see **[DOCKER.md](./DOCKER.md)**.

---

## 💻 Local Development (without Docker)

### Prerequisites

- [Bun](https://bun.sh) (v1.2.18 or higher)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/call-0f-code/codenest.git
cd codenest
```

### 2. Install Dependencies

```bash
# Install all dependencies (root, backend, and frontend)
bun run install:all
```

Or install them separately:

```bash
bun install              # root
bun run install:backend  # backend
bun run install:frontend # frontend
```

### 3. Environment Setup

#### Backend

```bash
cd backend
cp .env.example .env
# Open .env and fill in the required values
```

| Variable | Description |
| -------- | ----------- |
| `JWT_SECRET` | Secret for signing access tokens |
| `REFRESH_SECRET` | Secret for signing refresh tokens |
| `SALTING` | bcrypt cost factor (e.g. `8`) |
| `API_URL` | COC API base URL — use `http://localhost:3000` for local dev |
| `PORT` | Backend port (default `8000`) |
| `NODE_ENV` | Set to `production` for secure refresh-token cookies |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |
| `RATE_LIMIT_WINDOW_MINUTES` | Rate-limit window in minutes |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window |
| `EMAIL_ID` | Sender address for outgoing emails |
| `CONTACT_EMAIL_ID` | Club contact email |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
| `ACCESS_TTL` | Access token lifetime in minutes (e.g. `15`) |
| `REFRESH_TTL` | Refresh token lifetime in days (e.g. `7`) |

#### Frontend

```bash
cd frontend
cp .env.example .env
```

| Variable | Description |
| -------- | ----------- |
| `VITE_API_URL` | Backend URL visible from the browser (e.g. `http://localhost:8000`) |

### 4. Run the Application

```bash
# Run both frontend and backend concurrently
bun run dev
```

Or run them separately:

```bash
bun run backend-dev   # backend only
bun run frontend-dev  # frontend only
```

#### Access the Application

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000

---

## 📁 Project Structure

```
codenest/
├── docker-compose.yml           # Docker Compose stack
├── docker/                      # Dockerfiles and env templates
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── .env.example.coc-api
│   ├── .env.local.backend
│   ├── .env.local.coc-api       # gitignored — copy from .env.example.coc-api
│   └── .env.local.frontend
├── backend/                     # Backend application
│   ├── src/
│   │   ├── config/             # Configuration files
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Custom middleware
│   │   ├── routes/             # API routes
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Utility functions
│   │   ├── validation/         # Input validation
│   │   ├── app.ts              # Express app setup
│   │   └── server.ts           # Server entry point
│   ├── .env.example
│   └── package.json
├── frontend/                    # Frontend application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── assets/             # Images, fonts, etc.
│   │   ├── components/         # React components
│   │   ├── context/            # React context
│   │   ├── hooks/              # Custom hooks
│   │   ├── lib/                # Libraries
│   │   ├── pages/              # Page components
│   │   ├── routes/             # Route configuration
│   │   ├── utils/              # Utility functions
│   │   └── App.jsx             # Main App component
│   ├── .env.example
│   └── package.json
└── package.json                 # Root package.json (workspace scripts)
```

---

## 🔧 Development

### Linting

```bash
# Backend
cd backend
bun run lint
bun run lint:fix   # auto-fix

# Frontend
cd frontend
bun run lint
```

### Code Formatting

```bash
cd backend
bun run format
```

---

## 🏗️ Building for Production

```bash
cd frontend
bun run build    # production build
bun run preview  # preview the build locally
```

---

## 📝 API Documentation

The backend API is available at `/api/v1` with the following endpoints:

- **Members**: User and member management
- **Interview**: Interview experience sharing
- **Progress**: Progress tracking
- **Topics**: Topic management

A health check endpoint is available at `/health`.

---

## 🤝 Contributing

This is a private repository for Call of Code club members. If you're a member and want to contribute:

1. Create a feature branch
2. Make your changes
3. Test your changes thoroughly
4. Submit a pull request

## 📧 Support

For questions or issues, please contact the Call of Code club administrators or create an issue in the repository.

## 📄 License

This project is private and intended for use by Call of Code club members only.

---

Built with ❤️ by the Call of Code community

# Architecture Overview

## Overview

This repository contains a full-stack web application for volunteer management at a fire department rescue team in Taiwan. The application tracks volunteer activities including sign-ins, sign-outs, training sessions, and rescue missions. It allows volunteers to record their activities and administrators to manage volunteers.

The application follows a modern client-server architecture with a React frontend and an Express backend. The application uses PostgreSQL for data storage via the Drizzle ORM. The application is designed to be deployed on Replit.

## System Architecture

The system follows a typical three-tier architecture:

1. **Frontend**: React-based SPA built with Vite
2. **Backend**: Express.js API server in TypeScript
3. **Database**: PostgreSQL via Neon Serverless PostgreSQL

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │   Database  │
│    (React)  │────▶│  (Express)  │────▶│(PostgreSQL) │
└─────────────┘     └─────────────┘     └─────────────┘
```

The project structure follows a monorepo approach:

- `client/`: Frontend React application
- `server/`: Backend Express.js API
- `shared/`: Shared types and database schema definitions
- `migrations/`: Database migration files

## Key Components

### Frontend

The frontend is a React Single Page Application (SPA) with the following key characteristics:

1. **Framework**: React with TypeScript
2. **Build Tool**: Vite for development and building
3. **Routing**: Wouter for lightweight client-side routing
4. **State Management**:
   - React Query for server state management and data fetching
   - Context API for global application state (auth)
5. **UI Component Library**: Custom component library based on Radix UI and shadcn/ui
6. **Styling**: TailwindCSS for utility-first CSS

Key frontend pages include:
- Authentication page (`/auth`)
- Home dashboard (`/`)
- Statistics page (`/stats`)
- Settings page (`/settings`)
- Admin page (`/admin`) - accessible only to administrators

### Backend

The backend is built with Express.js in TypeScript with the following components:

1. **Server**: Express.js web server
2. **Authentication**: Passport.js with local strategy
3. **Database Access**: Drizzle ORM
4. **Session Management**: Express-session with PostgreSQL session storage

Key API endpoints:
- `/api/login` - User authentication
- `/api/activities/*` - Managing volunteer activities
- `/api/rescues/*` - Managing rescue operations

### Database Schema

The database schema is defined using Drizzle ORM and includes the following main tables:

1. **users**: Stores volunteer information
   - `id`: Primary key
   - `username`: Unique username for login
   - `password`: Hashed password
   - `name`: Real name
   - `role`: User role (volunteer or admin)

2. **activities**: Records volunteer activities
   - `id`: Primary key
   - `userId`: Foreign key to users table
   - `type`: Activity type (signin, signout, training, duty)
   - `timestamp`: When the activity occurred
   - `ip`: IP address for location tracking

3. **rescues**: Documents rescue operations
   - `id`: Primary key
   - `userId`: Foreign key to users table
   - `caseType`: Type of rescue case
   - `caseSubtype`: Subtype of the case
   - `treatment`: Treatment provided
   - Various other fields for specific rescue details

## Authentication & Authorization

The application uses a session-based authentication system:

1. **Authentication**: Uses Passport.js with a local strategy for username/password authentication
2. **Password Security**: Passwords are hashed using scrypt with salt for secure storage
3. **Session Management**: Server-side sessions stored in PostgreSQL
4. **Authorization**: Role-based access control with distinct volunteer and admin roles
5. **Whitelisting**: The system has a whitelist of allowed volunteers, with some marked as administrators

## Data Flow

1. **User Authentication**:
   - User submits credentials via the frontend auth form
   - Backend validates credentials and creates a session
   - Frontend stores session cookie for subsequent requests

2. **Activity Recording**:
   - User clicks on activity buttons in the frontend (sign-in, sign-out, etc.)
   - Frontend sends activity data to the backend API
   - Backend validates the request and stores activity in the database
   - Updated activity data is returned to the frontend

3. **Rescue Operation Recording**:
   - User fills out rescue details form
   - Frontend sends the data to the backend API
   - Backend validates and stores rescue data
   - Updated stats are shown on the dashboard

4. **Activity Statistics**:
   - Frontend requests activity statistics from the backend
   - Backend aggregates activity data and returns summaries
   - Frontend displays statistics in charts and tables

## External Dependencies

### Frontend Dependencies

- **@radix-ui**: Low-level UI primitives
- **class-variance-authority**: Managing component variants
- **clsx**: Utility for constructing className strings
- **@tanstack/react-query**: Data fetching and state management
- **date-fns**: Date manipulation library
- **wouter**: Lightweight router for React
- **react-hook-form**: Form management
- **zod**: Schema validation

### Backend Dependencies

- **express**: Web server framework
- **passport**: Authentication middleware
- **drizzle-orm**: Type-safe ORM
- **@neondatabase/serverless**: Serverless PostgreSQL client
- **connect-pg-simple**: PostgreSQL session store
- **express-session**: Session middleware

## Deployment Strategy

The application is configured to be deployed on Replit with the following setup:

1. **Development**: 
   - `npm run dev` uses tsx to run the development server
   - Vite handles hot module replacement and development features

2. **Production Build**:
   - `npm run build` compiles both frontend and backend
   - Frontend is built using Vite
   - Backend is bundled using esbuild

3. **Production Runtime**:
   - `npm run start` runs the production build
   - Static frontend assets are served by the Express server
   - Environment is configured via environment variables

4. **Database**:
   - Uses Neon serverless PostgreSQL
   - Database URL is specified via environment variable `DATABASE_URL`
   - Migrations are managed with Drizzle Kit

5. **Replit Specific Configuration**:
   - `.replit` file defines runtime and deployment settings
   - Workflow configurations for running within Replit

## Development Conventions

1. **Code Organization**:
   - Frontend code is in `client/src/`
   - Backend code is in `server/`
   - Shared types and schemas are in `shared/`

2. **TypeScript**:
   - Strict type checking enabled
   - Type definitions shared between frontend and backend

3. **API Conventions**:
   - RESTful API endpoints
   - JSON response format
   - Authentication via session cookies
# Senior Tech App

## Overview

Senior Tech App is a learning platform designed specifically for elderly users to master modern technology at their own pace. The application provides step-by-step tutorials for popular apps (WhatsApp, YouTube, Email, Facebook, Chrome), an AI-powered tutor with voice support, privacy and online safety education, and optional smartwatch integration for health tracking and reminders. The platform emphasizes accessibility, clarity, and confidence-building through senior-optimized Material Design principles with large fonts, generous spacing, and simplified interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

Language support: Application now supports Telugu and Hindi in addition to English, with voice commands and text-to-speech in each language.

Feature priority: Basic slides for foundational learning first, then advanced AI tutor for deeper understanding.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite for build tooling and development server.

**Routing**: Wouter for client-side routing - a lightweight alternative to React Router with simpler API suitable for straightforward navigation patterns.

**UI Component System**: Shadcn/ui (New York style) with Radix UI primitives for accessible, composable components. Components are styled with Tailwind CSS using a custom design system optimized for senior users.

**Design Philosophy**: Senior-optimized Material Design with customizations for elderly users:
- Minimum font sizes (20px body, 22px buttons, never below 18px)
- Generous line height (1.6-1.8) and spacing (Tailwind units 4-24)
- Large touch targets and simplified layouts (max 2-3 columns)
- High contrast color scheme with warm, approachable tones
- Consistent visual hierarchy through clear typography scale

**State Management**: TanStack Query (React Query) for server state with custom query client configuration including credential inclusion and error handling. Local state managed via React hooks.

**Theming**: Custom theme provider supporting light/dark modes with CSS variables for color system. Theme persists through component context.

**Audio Controls**: Three independent toggles for multimedia:
- Read Aloud ON/OFF (tutorial narration with text-to-speech)
- Microphone ON/OFF (voice input control for commands)
- Speech ON/OFF (AI tutor voice responses)

### Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js.

**Development vs Production**: Separate entry points (`index-dev.ts` and `index-prod.ts`):
- Development mode integrates Vite middleware for HMR and serves from source
- Production mode serves pre-built static assets from dist/public
- Custom logging middleware tracks API requests with timing information

**Storage Layer**: Abstracted through `IStorage` interface with dual implementation:
- **Production**: `DbStorage` using Drizzle ORM + Neon PostgreSQL (automatically used when DATABASE_URL is present)
- **Development**: `MemStorage` in-memory storage for testing without database
- Database tables include: `users` (profiles + language/audio settings), `conversations` (AI chat history), `learningProgress` (tutorial completion tracking), `healthMetrics` (smartwatch data), `reminders` (daily tasks), `achievements` (user badges)

**API Design**: RESTful endpoints prefixed with `/api`, routing logic centralized in `registerRoutes` function.

### Design System

**Color Tokens**: HSL-based color system with CSS custom properties supporting light/dark themes:
- Primary (blue): accent color for CTAs and interactive elements
- Secondary (green): supporting actions
- Accent (orange/yellow): highlights and special features
- Destructive (red): warnings and destructive actions
- Muted/neutral tones for backgrounds and borders

**Component Variants**: Buttons, badges, and interactive elements use class-variance-authority for consistent styling patterns with multiple variants (default, outline, ghost, destructive, secondary).

**Accessibility Features**:
- SOS help button (fixed position, always accessible)
- Large, clear typography throughout
- Voice command support via Web Speech API
- Text-to-speech for tutorial content
- Keyboard navigation support

### Feature Architecture

**Multilingual Support**:
- Full language support for English, Telugu (తెలుగు), and Hindi (हिन्दी)
- Language selector in header on all public pages (Landing, Guest Mode, Learning Modules)
- Persistent language preference using localStorage
- Automatic voice recognition and text-to-speech language adaptation:
  - English: en-US
  - Telugu: te-IN
  - Hindi: hi-IN
- Voice command recognition in all selected languages (next, back, repeat, help)
- Comprehensive translation database for all UI text, tutorials, and AI tutor responses
- Language context provider for easy access throughout the application

**Tutorial System**: Slide-based tutorial viewer with:
- Progress tracking through slides
- Voice command recognition for hands-free navigation (with multilingual support)
- Text-to-speech capability for audio guidance (with language adaptation)
- Step-by-step instructions with visual aids
- Completion tracking and achievements
- Read Aloud toggle for audio control during tutorials

**AI Tutor**: Chat interface with message history supporting:
- Text input for questions
- Voice input via Web Speech Recognition API (with Mic ON/OFF toggle)
- Text-to-speech for AI responses (with Speech ON/OFF toggle)
- Patient, conversational interaction style
- Persistent conversation history stored in database

**Learning Modules**: Categorized tutorials for major applications (WhatsApp, YouTube, Email, Facebook, Chrome Browser) with duration estimates and lesson counts.

**Privacy Education**: Interactive lessons covering:
- What information to keep private vs safe to share
- Encryption concepts with visual comparisons
- Scam recognition and online safety
- Practical examples and scenarios
- Complete multilingual translation support

**Dashboard** (Ready with Database Backend):
- Health metrics from smartwatch integration (stored in `healthMetrics` table)
- Daily reminders (medication, exercise, breaks) stored in `reminders` table
- Learning progress tracking for all tutorials stored in `learningProgress` table
- Achievement system with persistent badges stored in `achievements` table
- All data persists across user sessions with PostgreSQL database

## Recent Updates

### Local Development (Windows Optimized)
- ✅ Simplified `npm run dev` command (no `NODE_ENV` issues)
- ✅ Automatic environment variable loading from `.env` file
- ✅ Windows-compatible networking (uses default host binding)
- ✅ Built-in `dotenv/config` support in entry points

### Database Integration (Latest)
- ✅ PostgreSQL database created with Neon
- ✅ Drizzle ORM schemas for all data models
- ✅ DbStorage implementation for production use
- ✅ Automatic fallback to MemStorage when DATABASE_URL not present
- ✅ Database migration completed successfully

### Audio/Voice Controls (Recent)
- ✅ Read Aloud ON/OFF toggle for tutorial narration
- ✅ Microphone ON/OFF toggle for voice input control
- ✅ Speech ON/OFF toggle for AI tutor audio responses
- ✅ Three independent control toggles with clear ON/OFF status

### Multilingual Support (Completed)
- ✅ English, Telugu, Hindi full translation coverage
- ✅ Instant language switching on all pages
- ✅ Voice commands in all three languages
- ✅ Text-to-speech language adaptation

## Data Models

### Users Table
- `id`: UUID (primary key)
- `username`: Text (unique)
- `password`: Text
- `language`: Text (default: "en")
- `audioEnabled`: Boolean (default: true)

### Conversations Table
- `id`: UUID (primary key)
- `userId`: UUID (foreign key to users)
- `title`: Text
- `topic`: Text (optional)
- `messages`: JSONB array with role/content/timestamp
- `createdAt`: Timestamp

### Learning Progress Table
- `id`: UUID (primary key)
- `userId`: UUID (foreign key to users)
- `appName`: Text (WhatsApp, YouTube, Email, etc.)
- `completed`: Boolean (default: false)
- `completedAt`: Timestamp (optional)

### Health Metrics Table
- `id`: UUID (primary key)
- `userId`: UUID (foreign key to users)
- `heartRate`: Integer (optional)
- `steps`: Integer (optional)
- `bloodOxygen`: Integer (optional)
- `sleepQuality`: Text (optional)
- `recordedAt`: Timestamp

### Reminders Table
- `id`: UUID (primary key)
- `userId`: UUID (foreign key to users)
- `title`: Text
- `description`: Text (optional)
- `type`: Text
- `completed`: Boolean (default: false)
- `completedAt`: Timestamp (optional)
- `createdAt`: Timestamp

### Achievements Table
- `id`: UUID (primary key)
- `userId`: UUID (foreign key to users)
- `title`: Text
- `description`: Text (optional)
- `earnedAt`: Timestamp

## External Dependencies

### UI Component Libraries
- **Radix UI**: Primitive components (@radix-ui/react-*) for accessible, unstyled UI elements including dialogs, dropdowns, accordions, tooltips, and form controls
- **Tailwind CSS**: Utility-first CSS framework with PostCSS for processing
- **Shadcn/ui**: Component collection built on Radix UI with customized styling

### State Management & Data Fetching
- **TanStack Query (@tanstack/react-query)**: Server state management with caching, background updates, and request deduplication
- **React Hook Form (@hookform/resolvers)**: Form state management with validation

### Icons & Visual Assets
- **Lucide React**: Icon library for UI elements
- **React Icons**: Additional icon sets (specifically Simple Icons for brand logos like WhatsApp, YouTube, Gmail, Facebook, Chrome)

### Database & ORM
- **Drizzle ORM**: TypeScript ORM for PostgreSQL databases
- **@neondatabase/serverless**: PostgreSQL driver for Neon serverless database  
- **drizzle-zod**: Schema validation integration with Zod
- **PostgreSQL Database**: Neon-backed PostgreSQL with complete schema for users, conversations, learning progress, health metrics, reminders, and achievements

### Build & Development Tools
- **Vite**: Frontend build tool and dev server with React plugin
- **TypeScript**: Type safety across entire codebase
- **ESBuild**: Bundler for production server code
- **TSX**: TypeScript execution for development server

### Routing & Navigation
- **Wouter**: Minimalist routing library for React (lightweight alternative to React Router)

### Utility Libraries
- **clsx & tailwind-merge**: Conditional className utilities
- **class-variance-authority**: Type-safe component variants
- **date-fns**: Date manipulation and formatting
- **cmdk**: Command palette component (for keyboard shortcuts/search)
- **nanoid**: Unique ID generation

### Development-Only Dependencies (Replit)
- **@replit/vite-plugin-runtime-error-modal**: Runtime error overlay
- **@replit/vite-plugin-cartographer**: Replit development tool
- **@replit/vite-plugin-dev-banner**: Development environment banner

## API Endpoints

All endpoints prefixed with `/api`:

### User Management
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - User login
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/:id` - Update user settings (language, audio preferences)

### Conversations (AI Tutor)
- `GET /api/conversations` - Get user's conversation list
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get specific conversation
- `PATCH /api/conversations/:id` - Update conversation messages
- `DELETE /api/conversations/:id` - Delete conversation

### Learning Progress
- `GET /api/progress` - Get user's learning progress
- `POST /api/progress` - Create progress entry
- `PATCH /api/progress/:id` - Mark tutorial as completed

### Health Metrics
- `GET /api/health` - Get latest health metrics
- `POST /api/health` - Record new health metrics

### Reminders
- `GET /api/reminders` - Get user's reminders
- `POST /api/reminders` - Create new reminder
- `PATCH /api/reminders/:id` - Update reminder status

### Achievements
- `GET /api/achievements` - Get user's achievements
- `POST /api/achievements` - Award new achievement

## Database Operations

To push schema changes to the database:
```bash
npm run db:push
```

If changes require forcing (data loss warnings):
```bash
npm run db:push --force
```

## Production Deployment

The app is ready to be published on Replit with:
- ✅ PostgreSQL database for persistent storage
- ✅ Full backend API with all endpoints
- ✅ Complete frontend with all pages and features
- ✅ Multilingual support (English, Telugu, Hindi)
- ✅ Audio/voice control toggles
- ✅ Senior-optimized UI with large fonts and accessibility

To publish: Click the Publish button in Replit UI

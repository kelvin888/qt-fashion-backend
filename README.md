# QT Fashion Backend API

AI-powered fashion marketplace backend with body measurements and virtual try-on capabilities.

## Features

- 🔐 User authentication (JWT)
- 📏 AI body measurement from photos (Google Vision AI)
- 👗 Virtual try-on (image & video)
- 🎨 Designer marketplace
- 📦 Order management with escrow payments
- 🚀 Production progress tracking

## Tech Stack

- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** with **Prisma ORM**
- **Google Cloud Vision AI** for body measurements
- **JWT** for authentication
- **Multer** for file uploads

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Railway provides this)
- Google Cloud account with Vision AI enabled

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Update these values:

- `DATABASE_URL` - Get from Railway after creating PostgreSQL
- `JWT_SECRET` - Generate a strong random string
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to your Google Cloud credentials JSON
- `GOOGLE_CLOUD_PROJECT_ID` - Your Google Cloud project ID

### 3. Database Setup

Generate Prisma client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Measurements

- `POST /api/measurements` - Upload photos for body measurement
- `GET /api/measurements` - Get user's measurements

### Designs

- `GET /api/designs` - Browse all designs
- `POST /api/designs` - Create design (designers only)
- `GET /api/designs/:id` - Get design details

### Virtual Try-On

- `POST /api/try-on` - Generate virtual try-on

### Orders

- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status

## Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Run production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run database migrations
npm run prisma:studio     # Open Prisma Studio (DB GUI)
```

## Deployment to Railway

1. Push code to GitHub
2. Create new project on Railway
3. Add PostgreSQL service
4. Connect your GitHub repo
5. Add environment variables
6. Deploy!

Railway will automatically:

- Detect Node.js
- Install dependencies
- Run build
- Start server

## Project Structure

```
qt-fashion-backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   └── database.ts        # Prisma client
│   ├── controllers/           # Request handlers
│   ├── middleware/            # Auth, upload, error handling
│   ├── routes/                # API routes
│   ├── services/              # Business logic
│   ├── utils/                 # Helper functions
│   └── server.ts              # Express app
├── .env                       # Environment variables
├── .env.example               # Example env file
├── tsconfig.json              # TypeScript config
└── package.json               # Dependencies
```

## Google Cloud Vision Setup

1. Create a Google Cloud project
2. Enable Vision AI API
3. Create service account
4. Download credentials JSON
5. Place in project root as `google-credentials.json`
6. Update `.env` with file path and project ID

## License

MIT

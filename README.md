# LifeMaxx

LifeMaxx is a full-stack social platform for sharing posts, stories, journeys, and startup ideas. It also includes communities, direct messaging, notifications, user profiles, follows, media uploads, and real-time chat.

The project is organized as two applications:

- `frontend/` - React client application
- `backend/` - Express and MongoDB API server

## Features

- User registration, login, logout, refresh tokens, and protected routes
- Password reset and email-change flows using Gmail SMTP
- User profiles, follows, and notifications
- Posts, comments, likes, saves, mentions, and media attachments
- Stories with authenticated media streaming
- Communities and community discussions
- Journeys for sharing progress and milestones
- Startup profiles and discovery
- Direct chats and messages
- Real-time message delivery with Ably
- Responsive interface built with React, Material UI, Bootstrap, and styled-components

## Technology stack

### Frontend

- React 19
- React Router
- Redux Toolkit
- TanStack React Query
- Axios
- Ably client
- Material UI, Bootstrap, and styled-components
- Create React App

### Backend

- Node.js and Express
- MongoDB with Mongoose
- JWT access and refresh tokens
- bcrypt password hashing
- Nodemailer with Gmail SMTP
- Ably server SDK for real-time events
- Joi validation
- Express file uploads

## Requirements

- Node.js 18 or newer
- npm
- MongoDB, either a local instance or MongoDB Atlas
- An Ably API key for real-time messaging
- A Gmail account with an app password if email features are required

## Project setup

Clone the repository and install dependencies in both applications:

```bash
git clone <repository-url>
cd life_max_cursor

cd backend
npm install

cd ../frontend
npm install
```

### Backend environment

Create `backend/.env` from the example file:

```bash
cd backend
copy .env.example .env
```

On macOS or Linux, use:

```bash
cp .env.example .env
```

Set the values in `backend/.env`:

```env
PORT=5000
DBURL=mongodb://localhost:27017/lifemaxx
ACCESS_PRIVATE_KEY=replace-with-a-long-random-access-token-secret
REFRESH_PRIVATE_KEY=replace-with-a-different-long-random-refresh-token-secret
GMAIL_EMAIL=your-sender@example.com
GMAIL_PASSWORD=your-gmail-app-password
ABLY_API_KEY=your-ably-api-key
```

Use strong, different random values for the access and refresh token secrets. Never commit `.env` files or provider credentials.

### Frontend environment

Create `frontend/.env` from the example file:

```bash
cd frontend
copy .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Set the API URL if the backend is not running on the default port:

```env
REACT_APP_API_URL=http://localhost:5000
```

Only variables prefixed with `REACT_APP_` are available to the React application. Do not put private keys, database credentials, or server API secrets in frontend environment variables.

## Running the application

Start the backend in one terminal:

```bash
cd backend
npm start
```

The API starts on [http://localhost:5000](http://localhost:5000) by default.

Start the frontend in a second terminal:

```bash
cd frontend
npm start
```

The React application starts on [http://localhost:3000](http://localhost:3000).

For backend development with automatic restarts:

```bash
cd backend
npm run dev
```

## Production build

Create an optimized frontend build with:

```bash
cd frontend
npm run build
```

The generated files are written to `frontend/build/`.

The backend is started with:

```bash
cd backend
npm start
```

Configure the production environment through deployment secrets rather than committing a production `.env` file.

## API route groups

The backend exposes the following route groups:

| Prefix               | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| `/api/auth`          | Registration, login, logout, token refresh, and authentication |
| `/api/users`         | Profiles, follows, account changes, and password reset         |
| `/api/posts`         | Posts, comments, likes, saves, and post media                  |
| `/api/stories`       | Stories and authenticated media streaming                      |
| `/api/journeys`      | Journey creation and progress                                  |
| `/api/communities`   | Community membership and discussions                           |
| `/api/chats`         | Chat conversations                                             |
| `/api/messages`      | Direct messages and message actions                            |
| `/api/notifications` | User notifications                                             |
| `/api/startups`      | Startup profiles and startup content                           |
| `/api/discovers`     | Discovery and search-related content                           |
| `/api/ably`          | Authenticated Ably token requests                              |

Uploaded media is served from the backend's `/uploads` path. Uploads and temporary files are intentionally ignored by Git.

## Repository structure

```text
.
├── backend/
│   ├── config/          # Non-secret defaults and environment mappings
│   ├── middleware/      # Authentication, validation, and error handling
│   ├── models/          # Mongoose models
│   ├── routes/          # Express API routes
│   ├── startup/         # Database, middleware, and Ably initialization
│   └── utils/           # Upload, email, and helper utilities
├── frontend/
│   ├── public/           # Static public assets
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── contexts/     # React contexts
│       ├── hooks/        # Data and application hooks
│       ├── pages/        # Route-level screens
│       └── store/        # Redux state
└── .gitignore
```

## Security notes

- Keep `backend/.env` and `frontend/.env` local; they are ignored by Git.
- Rotate any credentials that were previously committed to repository history.
- Do not expose backend secrets through `REACT_APP_*` variables.
- Use HTTPS and secure cookie settings when deploying.
- Restrict CORS origins in production instead of allowing development-style origins.
- Configure MongoDB network access and database users with least privilege.

## Testing

The frontend uses Create React App's test runner:

```bash
cd frontend
npm test
```

The backend currently has no automated test suite configured. Its `npm test` script is a placeholder and should be replaced when backend tests are added.

## License

No license has been specified for this project yet.

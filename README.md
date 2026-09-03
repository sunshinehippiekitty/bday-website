# bday-website

A full-stack birthday website with an Express backend and a Vite + React + TypeScript frontend styled with Tailwind CSS.

## Tech Stack

**Frontend** (`react-frontend/`)
- React 19 + TypeScript
- Vite (dev server & build)
- Tailwind CSS
- React Router
- Axios (API calls)
- Heroicons

**Backend** (`backend/`)
- Node.js + Express 5
- CORS
- dotenv (environment config)
- nodemon (dev auto-reload)

## Project Structure

```
bday-website/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   │   └── mainRoute.js
│   ├── server.js
│   └── package.json
└── react-frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   ├── pages/
    │   ├── main.ts
    │   └── style.css
    ├── index.html
    └── package.json
```

## Getting Started

### Prerequisites
- Node.js (v18 or later recommended)
- npm

### Backend

```bash
cd backend
npm install
npm run dev      # start with nodemon (auto-reload)
# or
npm start        # start with node
```

The server runs on `http://localhost:5000` by default. You can override the port with a `PORT` environment variable in a `.env` file:

```
PORT=5000
```

### Frontend

```bash
cd react-frontend
npm install
npm run dev      # start the Vite dev server
```

The frontend runs on `http://localhost:5173` by default. The backend is configured to allow CORS requests from this origin.

## Available Scripts

### Backend
- `npm start` — run the server with Node
- `npm run dev` — run the server with nodemon (auto-reload on changes)

### Frontend
- `npm run dev` — start the Vite development server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally

## Author

Thia Le Xuan Clare

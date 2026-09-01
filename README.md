# Task Manager API

Express + MongoDB REST API for the full-stack Task Manager app.
Includes JWT authentication, bcrypt password hashing, and protected task routes.

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- [MongoDB](https://www.mongodb.com/) running locally on port 27017, or a MongoDB Atlas connection string

## Setup and Run

```bash
npm install
npm start
```

API will be available at `http://localhost:5000`.

## Environment Variables

Create a `.env` file in the root of this folder:

```env
MONGO_URI=mongodb://localhost:27017/taskmanager
PORT=5000
JWT_SECRET=your_secret_key_here
```

Replace `MONGO_URI` with your Atlas connection string if using cloud MongoDB.
The `.env` file is excluded from git via `.gitignore` — never commit your `JWT_SECRET`.

## Auth Endpoints (public)

| Method | Route           | Description                        |
|--------|-----------------|------------------------------------|
| POST   | /auth/register  | Register a new user, returns JWT   |
| POST   | /auth/login     | Login, returns JWT                 |
| GET    | /auth/me        | Get logged-in user (token required)|

## Task Endpoints (JWT protected)

All task routes require `Authorization: Bearer <token>` in the request header.

| Method | Route        | Description       |
|--------|--------------|-------------------|
| GET    | /tasks       | Get all tasks     |
| GET    | /tasks/:id   | Get one task      |
| POST   | /tasks       | Create a task     |
| PUT    | /tasks/:id   | Update a task     |
| DELETE | /tasks/:id   | Delete a task     |

## Register / Login Body

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

## POST / PUT Task Body

```json
{
  "id": 1,
  "title": "Buy groceries",
  "description": "Optional description",
  "completed": false,
  "priority": "medium"
}
```

- `title` is required, minimum 3 characters
- `priority` must be one of: `low`, `medium`, `high`
- `id` is a required unique number (creation only)

## Middleware

- `authMiddleware` verifies the Bearer token on all task routes
- `validateTask` checks title exists and meets length requirement before hitting the DB
- `validateRegister` and `validateLogin` validate auth inputs

## Frontend Repo

https://github.com/24AIML042-Nyasia/task-manager-frontend

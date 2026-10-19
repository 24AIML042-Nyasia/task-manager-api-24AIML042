# Task Manager API

Express + MongoDB REST API for the full-stack Task Manager app.
Includes JWT authentication, bcrypt password hashing, protected task routes, and in-memory caching with node-cache.

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
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

The `.env` file is excluded from git via `.gitignore` — never commit secrets.

## Auth Endpoints (public)

| Method | Route                      | Description                          |
|--------|----------------------------|--------------------------------------|
| POST   | /auth/register             | Register a new user, returns JWT     |
| POST   | /auth/login                | Login, returns JWT                   |
| GET    | /auth/me                   | Get logged-in user (token required)  |
| POST   | /auth/forgot-password      | Send password reset email            |
| POST   | /auth/reset-password/:token| Reset password using email token     |

## Task Endpoints (JWT protected)

All task routes require `Authorization: Bearer <token>` in the request header.

| Method | Route        | Description                        |
|--------|--------------|------------------------------------|
| GET    | /tasks       | Get all tasks (cached, TTL 60s)    |
| GET    | /tasks/:id   | Get one task (cached, TTL 60s)     |
| POST   | /tasks       | Create a task (invalidates cache)  |
| PUT    | /tasks/:id   | Update a task (invalidates cache)  |
| DELETE | /tasks/:id   | Delete a task (invalidates cache)  |

## Debug Endpoint (JWT protected)

| Method | Route          | Description                                  |
|--------|----------------|----------------------------------------------|
| GET    | /cache-stats   | Returns cache hit/miss counts and hit rate   |

Example response:
```json
{
  "success": true,
  "data": {
    "hits": 5,
    "misses": 2,
    "total": 7,
    "hitRate": "71.4%",
    "cachedKeys": ["all_tasks_<userId>"],
    "keyCount": 1
  }
}
```

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
  "priority": "medium",
  "status": "pending"
}
```

- `title` is required, minimum 3 characters
- `priority` must be one of: `low`, `medium`, `high`
- `status` must be one of: `pending`, `ongoing`, `completed`
- `id` is a required unique number (creation only)

## Middleware

- `authMiddleware` verifies the Bearer token on all task routes
- `validateTask` checks title exists and meets length requirement before hitting the DB
- `validateRegister` and `validateLogin` validate auth inputs

## Caching

In-memory caching is implemented using `node-cache` (`utils/cache.js`).

### How it works

```
GET /tasks request
|
v
Cache check (node-cache, key: all_tasks_<userId>)
|-- HIT  -> return cached data immediately (fromCache: true)
|-- MISS -> query MongoDB -> store in cache -> return data (fromCache: false)

POST / PUT / DELETE /tasks
|
v
Write to MongoDB -> cache.del() invalidates the key immediately
```

- TTL is 60 seconds — data auto-expires even without a write operation
- Cache keys are per-user so one user never sees another user's data
- Both `GET /tasks` and `GET /tasks/:id` are cached separately
- Every successful write (create, update, delete) invalidates both the all-tasks key and the individual task key
- Responses include a `fromCache` boolean so you can verify cache behaviour in Postman

### Response time comparison

Measured using Postman against a local MongoDB instance with 5 tasks in the collection.

**Without caching (direct MongoDB query every request):**

| Request | Response time |
|---------|--------------|
| 1 | 48 ms |
| 2 | 45 ms |
| 3 | 51 ms |
| Average | 48 ms |

**With caching (node-cache, after first MISS populates the cache):**

| Request | Response time |
|---------|--------------|
| 1 (MISS) | 46 ms |
| 2 (HIT) | 4 ms |
| 3 (HIT) | 3 ms |
| Average (HIT) | 3.5 ms |

**Result: ~93% reduction in response time on cache hits (48 ms to 3.5 ms).**

The first request (cache MISS) still hits MongoDB at normal speed.
Every subsequent request within the 60-second TTL window is served from memory.

### To verify in Postman

1. Start the server and log in to get a JWT token
2. Send `GET /tasks` — check the response for `"fromCache": false` and note the time
3. Send `GET /tasks` again — response now shows `"fromCache": true` with a much faster time
4. Send `GET /cache-stats` to see hit/miss counts
5. Create, update, or delete a task — the next `GET /tasks` will be a MISS again (cache invalidated)

### Why TTL matters

A 60-second TTL means stale data is served for at most 60 seconds after a write by another client. For a personal task manager this is acceptable. For a real-time collaborative system it would need to be lower or replaced with event-driven invalidation.

### Why node-cache is not suitable for multi-instance deployments

node-cache stores data in the memory of a single Node.js process. If the app runs on multiple servers (e.g. behind a load balancer), each server has its own separate cache. A write on Server A invalidates Server A's cache but not Server B's, so Server B continues to serve stale data. A shared cache like Redis solves this by storing data outside the process in a central store all instances can access.

## Frontend Repo

https://github.com/24AIML042-Nyasia/task-manager-frontend

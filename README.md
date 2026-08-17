# Task Manager API

Express + MongoDB REST API for the full-stack Task Manager app.

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
```

Replace `MONGO_URI` with your Atlas connection string if using cloud MongoDB.

## Endpoints

| Method | Route        | Description       |
|--------|--------------|-------------------|
| GET    | /tasks       | Get all tasks     |
| GET    | /tasks/:id   | Get one task      |
| POST   | /tasks       | Create a task     |
| PUT    | /tasks/:id   | Update a task     |
| DELETE | /tasks/:id   | Delete a task     |

## POST / PUT Body

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

## Frontend Repo

https://github.com/24AIML042-Nyasia/task-manager-frontend

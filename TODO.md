# Backend Development for NeoVidya Frontend

## Information Gathered
- Frontend: Static HTML/CSS/JS gamified learning platform (NeoVidya) with subjects like Math, Science, etc.
- Data Storage: Currently uses localStorage for users, progress, courses.
- Features: Login/signup, dashboard, courses syllabus, profile, settings, offline mode.
- Tech Stack: HTML, CSS, JS; needs backend for online features like cross-device syncing.

## Plan
- Set up Node.js/Express server with SQLite database.
- Create database schema for users, courses, progress.
- Implement API endpoints for authentication, course data, progress tracking.
- Serve static frontend files.
- Integrate with frontend by replacing localStorage calls with API calls.

## Dependent Files to be edited
- New files: server.js, database.js, routes/, public/ (for static files)
- No existing files to edit initially.

## Followup steps
- Install Node.js dependencies (express, sqlite3, bcrypt, etc.).
- Run server and test endpoints.
- Update frontend to use API instead of localStorage.
- Test full integration.

## Steps
- [x] Initialize Node.js project (package.json)
- [x] Install dependencies (npm install working)
- [x] Create database schema and setup
- [x] Implement user authentication endpoints (register, login)
- [x] Implement course data endpoints (get courses, syllabus)
- [x] Implement progress tracking endpoints (update XP, streak)
- [x] Serve static frontend files
- [ ] Update frontend to use API calls
- [ ] Test integration

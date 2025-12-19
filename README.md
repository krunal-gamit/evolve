# Reading Room Management System

A web application for managing seat bookings in a reading room with 46 seats.

## Features

- Dashboard with seat grid showing vacant/occupied seats and member names
- Member management (add members)
- Subscription creation with payment recording (UPI with code or cash)
- Automatic waiting list when seats are full
- Reports for billing details and total revenue

## Tech Stack

- Frontend: Next.js with TypeScript and Tailwind CSS
- Backend: Next.js API routes
- Database: MongoDB with Mongoose

## Setup

1. Install dependencies: `npm install`

2. Set up MongoDB and add `MONGODB_URI` to `.env.local`

3. Initialize seats: Make a POST request to `/api/init` (or use a tool like Postman)

4. Run the development server: `npm run dev`

5. Open [http://localhost:3000](http://localhost:3000) to view the application

## Usage

- **Dashboard (/)**: View seat status, counts of vacant/occupied/waiting
- **Members (/members)**: Add new members
- **Subscriptions (/subscriptions)**: Create subscriptions, assign seats, record payments
- **Reports (/reports)**: View all subscriptions, payments, and total revenue

## API Endpoints

- GET /api/seats - Get all seats with status
- POST /api/members - Add a member
- GET /api/members - List members
- POST /api/subscriptions - Create subscription
- PUT /api/subscriptions/[id] - End subscription
- GET /api/subscriptions - List subscriptions
- GET /api/waiting - List waiting list
- POST /api/init - Initialize seats (run once)

# FunFriends - Realtime Multi-Game Party Hub

An interactive, synchronous real-time party game platform designed for local gatherings and crowds. Inspired by classic party suites, this project transforms any primary screen  into a centralized game dashboard, while players interact seamlessly and simultaneously using their smartphones as controllers.

## Prerequisites

Before setting up the project locally, ensure you have the following:
- [Node.js](https://nodejs.org/) (Version 18 or superior)
- **npm** (comes bundled with Node.js)
- [Python 3](https://www.python.org/) & `pip`
- [FFmpeg](https://ffmpeg.org/) (system-wide media utility)
- A free [Supabase](https://supabase.com/) account

---

## Step-by-Step Local Setup

### 1. Clone the Repository
Open your terminal and execute the following commands to download the project:
```bash
git clone git@github.com:artmear/FunFriends.git
cd FunFriends
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Python Virtual Environment (For Guess The Song)

The "Guess The Song" game mode utilizes a local Python script running inside a virtual environment (`.venv`) to download and apply metallic audio filters. 

Run the following commands in the project root directory to configure it:

```bash
# 1. Install system dependencies (Ubuntu/Debian)
sudo apt update && sudo apt install python3-venv ffmpeg

# 2. Create the Python virtual environment
python3 -m venv .venv

# 3. Activate the virtual environment
source .venv/bin/activate

# 4. Install required packages inside the environment
pip install yt-dlp
```

### 4. Configure the Database (Supabase)

#### 1. Create a new project in your Supabase dashboard.
#### 2. Navigate to the SQL Editor tab on the left sidebar.
#### 3. Paste and execute the database schema script to structure the tables and enable the real-time publication engine

```bash
cat ./database/setup.sql | xclip -selection clipboard
```

### 5. Environment Variables

Create a file named .env in your project's absolute root directory (at the same level as package.json) and append your Supabase credentials and conductor's password (just create a new password):

```bash
VITE_SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
VITE_SUPABASE_ANON_KEY=your-public-anon-key-here
VITE_ADMIN_PASSWORD=<admin-password>
```

## How to Run and Test

### Local Network Mode (Playing with Real Smartphones)

To expose your Vite server to your local Wi-Fi network and allow physical mobile devices to join the session:

1. Inside src/views/conductor/LobbyView.tsx, ensure you gameUrl swap out for your machine's exact internal local network IP address during local testing.
2. The network URL should appear after the following command:
```bash
npm run dev -- --host
```

## Tech Stack

**Front-End:** React 18, Vite, TypeScript

**Back-End & Realtime Infrastructure:** Supabase (PostgreSQL + WebSockets)

**Audio Processing Middleware:** Python 3, `yt-dlp` (Metadata extraction & YouTube streaming), FFmpeg (Robotic phase-vocoder & vibrato filter DSP)

**Dependencies:** qrcode.react (Dynamic SVG QR code generation)
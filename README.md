# Assignment for Chaos Theory

**Name:** Abed Al Rahman  
**CityU ID:** 57744270

## Project Overview

This project implements a real-time collaborative whiteboard where multiple users can draw simultaneously on a shared canvas. Each user is assigned a unique random color, and all drawing actions are instantly broadcast to all connected clients.

## Features

- **Real-time Collaboration:** Multiple users can draw on the same canvas simultaneously
- **Unique Color Assignment:** Each client receives a randomly generated color
- **Adjustable Brush Size:** Control the thickness of drawing lines
- **Connection Status Indicators:** Visual feedback on connection state
- **Active User Counter:** Shows how many users are currently connected
- **Auto-Reconnection:** Automatic reconnection attempts if connection is lost
- **Canvas Clearing:** Any user can clear the canvas for all participants
- **Touch Support:** Works on mobile and tablet devices

## Technical Implementation

### Architecture

The application follows a client-server architecture:

- **Frontend:** Vanilla JavaScript, HTML5 Canvas, and CSS
- **Backend:** Pure Node.js WebSocket server with no external dependencies

### Project Structure

```shell
collaborative-whiteboard/
├── public/
│   ├── index.html      # HTML structure and UI elements
│   ├── styles.css      # Styling and responsive design
│   └── app.js          # Client-side Canvas and WebSocket logic
└── server.js           # WebSocket server implementation
```

## How to Run the Project

### Prerequisites

- Node.js installed on your system (any recent version)

### Setup Steps

1. Clone this repository
2. Navigate to the project directory
3. Run the server:

```bash
node server.js
```

4. Open your browser and go to:

```bash
http://localhost:3000
```

5. To test collaboration, open the application in multiple browser windows

## How It Works

### WebSocket Communication Flow

#### Connection Establishment:

1. Browser connects to the WebSocket server
2. Server assigns a random color to the client
3. Server sends the full drawing history to the new client
4. Server updates the connected user count for all clients

#### Drawing Synchronization:

1. When a user draws, coordinate data is sent to the server
2. Server adds the drawing event to its history
3. Server broadcasts the drawing to all other connected clients
4. Other clients render the received drawing on their canvas

#### Canvas Clearing:

1. When a user clicks "Clear Canvas", a clear event is sent
2. Server clears its drawing history
3. Server broadcasts the clear command to all clients
4. All clients clear their canvas

#### Network Disruption Handling:

1. If WebSocket connection is lost, client attempts to reconnect
2. Connection status indicator shows the current state
3. Reconnection attempts increase in delay (exponential backoff)
4. Upon reconnection, client receives the complete canvas state

### State Synchronization

The server maintains the complete drawing history. When a new client connects or reconnects, it receives the full history and reconstructs the canvas state. This ensures all users see the same whiteboard content regardless of when they connected.

## Technical Challenges Addressed

- **WebSocket Protocol Implementation:** Manually implementing WebSocket frame encoding/decoding using built-in Node.js modules without external libraries
- **Canvas Rendering Optimization:** Efficient line drawing with proper state management for smooth performance even with complex drawings
- **Reconnection Logic:** Robust reconnection strategy with increasing timeouts to handle temporary network issues
- **Cross-browser Compatibility:** Ensuring the application works across different browsers and devices
- **Touch Input Handling:** Special handling for touch events to enable drawing on mobile devices

This project demonstrates the implementation of a real-time collaborative application using WebSockets and HTML5 Canvas without relying on external libraries or frameworks.

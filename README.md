# LIRR Departure Board

A real-time Long Island Rail Road (LIRR) departure board designed for tablet display. Polls MTA GTFS-Realtime feeds and displays upcoming train departures with beautiful branch colors and clean UI.

## Features

- **Real-time LIRR departure information** across all branches
- **Clean, tablet-optimized UI** designed for mounted displays
- **Auto-refreshing every 15 seconds** with live countdown timers
- **Multi-station selection** with search functionality
- **Interactive station picker UI** with checkbox selection
- **Branch colors** matching official MTA LIRR branding
- **Smart destination display** showing final station for each train
- **Grouped by station** for easy viewing when tracking multiple locations

## Screenshots

The app features:
- A clean departure board with time, destination, branch, and minutes until departure
- LIRR branch pills with official colors (Babylon, Port Washington, etc.)
- Settings modal for station selection
- Welcome screen for first-time users
- Dark theme optimized for 24/7 display

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- (Optional) LIRR GTFS static data for regenerating station/trip data

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd traintime-kelly
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in your browser**
   - Navigate to `http://localhost:3000`
   - On first visit, click "Choose Stations" to select your LIRR stations
   - The board will auto-refresh every 15 seconds

## Station Selection

The app includes a built-in station picker with:
- **Search functionality** - find stations by name
- **Multi-select** - track multiple stations at once
- **Default stations** - Penn Station (237) and Grand Central Madison (349)
- **Persistent storage** - selections saved to browser localStorage

To change stations:
1. Click the settings (⚙️) button in the top right
2. Search or browse all LIRR stations
3. Click stations to select/deselect (multi-select supported)
4. Click "Save" to update your departure board

## API Endpoints

The server provides the following endpoints:

- **`GET /`** - Main departure board UI
- **`GET /api/departures?stops=237,349`** - Get departures for specific stop IDs (JSON)
- **`GET /api/stations`** - List all LIRR stations with stop IDs (JSON)
- **`GET /api/branch-colors`** - Get LIRR branch color mappings (JSON)
- **`GET /api/debug/stops`** - Debug view of active stops with departure counts (JSON)
- **`GET /health`** - Health check endpoint

### Example API Usage

```bash
# Get departures for Penn Station and Grand Central Madison
curl "http://localhost:3000/api/departures?stops=237,349"

# Get all available LIRR stations
curl "http://localhost:3000/api/stations"

# Check server health
curl "http://localhost:3000/health"
```

## Configuration

### MTA API Key (Optional)

The MTA LIRR feed may require an API key. Set it via environment variable:

```bash
MTA_API_KEY=your_api_key_here npm run dev
```

Get your API key from [MTA Developer Resources](https://api.mta.info/).

### Port Configuration

By default, the server runs on port 3000. Override with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Building for Production

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

The compiled code will be in the `dist/` folder.

## Deployment

### Cloud Platforms (Render, Railway, Fly.io, Heroku)

1. Push this repository to GitHub
2. Create a new web service
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. (Optional) Set environment variable: `MTA_API_KEY`
6. Deploy

### Raspberry Pi / Local Network

Perfect for a permanent tablet display:

1. Install Node.js on your Raspberry Pi
2. Clone this repository: `git clone <repo-url>`
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Start: `npm start`
6. Access from tablet at `http://raspberry-pi-ip:3000`

### Using on a Tablet

For best results as a mounted display:

1. Connect tablet to Wi-Fi
2. Open the app URL in browser (Chrome/Safari recommended)
3. Add to home screen / "Install app" for full-screen mode
4. Enable "Keep screen awake" or use a kiosk app
5. Optionally disable auto-sleep or use guided access (iOS)

## Developer Information

### Project Structure

```
traintime-kelly/
├── src/
│   └── server.ts              # Express server & LIRR GTFS integration
├── public/
│   └── index.html             # Frontend UI with station picker
├── data/
│   ├── lirr-stops.json        # Station ID to name mappings
│   └── lirr-trips.json        # Trip ID to headsign mappings
├── scripts/
│   ├── build-lirr-stops.ts    # Generate station data from GTFS
│   └── build-lirr-trips.ts    # Generate trip data from GTFS
├── dist/                      # Compiled TypeScript output
├── package.json
└── tsconfig.json
```

### Regenerating Station & Trip Data

The app comes with pre-generated `lirr-stops.json` and `lirr-trips.json` files. To regenerate them:

1. **Download LIRR GTFS static data** from [MTA Developer Resources](https://new.mta.info/developers)
   - Extract the GTFS ZIP to a folder (e.g., `~/Downloads/gtfslirr/`)
   - It should contain `stops.txt` and `trips.txt`

2. **Update the GTFS folder path** in the build scripts:
   - Edit `scripts/build-lirr-stops.ts` - update `GTFS_FOLDER` constant
   - Edit `scripts/build-lirr-trips.ts` - update `GTFS_FOLDER` constant

3. **Run the build scripts**:
   ```bash
   npm run build-lirr-stops
   npm run build-lirr-trips
   ```

4. **Restart the server** to load the new data:
   ```bash
   npm run dev
   ```

### LIRR Branches & Colors

The app displays 13 LIRR branches with official MTA colors:

| Branch | Color | Route ID |
|--------|-------|----------|
| Babylon | Green (#00985F) | 1 |
| Hempstead | Gold (#CE8E00) | 2 |
| Oyster Bay | Green (#00AF3F) | 3 |
| Ronkonkoma | Purple (#A626AA) | 4 |
| Montauk | Teal (#00B2A9) | 5 |
| Long Beach | Orange (#FF6319) | 6 |
| Far Rockaway | Brown (#6E3219) | 7 |
| West Hempstead | Blue (#00A1DE) | 8 |
| Port Washington | Red (#C60C30) | 9 |
| Port Jefferson | Blue (#006EC7) | 10 |
| Belmont Park | Purple (#60269E) | 11 |
| City Terminal Zone | Gray (#4D5357) | 12 |
| Greenport | Purple (#A626AA) | 13 |

These are hardcoded in `src/server.ts` and match the official LIRR branding.

## How It Works

1. **Backend (server.ts)**:
   - Fetches LIRR GTFS-Realtime feed every 20 seconds
   - Parses protobuf data using `gtfs-realtime-bindings`
   - Caches departures in memory
   - Determines destinations from stop sequences and trip headsigns
   - Serves JSON API for frontend

2. **Frontend (index.html)**:
   - Polls `/api/departures` every 15 seconds
   - Groups departures by station
   - Displays upcoming trains with live countdown
   - Station picker modal for configuration
   - Saves settings to localStorage

3. **Data Files**:
   - `lirr-stops.json` - Maps stop IDs to station names
   - `lirr-trips.json` - Maps trip IDs to headsigns (destinations)

## Troubleshooting

### No departures showing

- **Check station selection**: Click ⚙️ to ensure you've selected at least one station
- **Verify LIRR feed is accessible**: Check [MTA Status](https://www.mta.info/)
- **Check console for errors**: Open browser DevTools (F12) and look for errors
- **Try refreshing**: Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Station names showing as IDs

- The `data/lirr-stops.json` file is missing or invalid
- Run `npm run build-lirr-stops` to regenerate it
- Ensure you've downloaded the GTFS static data first

### API errors or empty responses

- Check if `MTA_API_KEY` is required - some feeds may need authentication
- MTA feeds occasionally have outages - wait a few minutes and try again
- Check server logs for specific error messages

### TypeScript compilation errors

- Ensure you're using Node.js 18+ and TypeScript 5.3+
- Run `npm install` to ensure all dependencies are installed
- Check `tsconfig.json` for configuration issues

## Credits

Made with ❤️ by **David Hutchinson** for **Kelly Chau**

## License

MIT

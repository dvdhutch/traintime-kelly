// LIRR Departure Board Server
import express from "express";
import * as GtfsRealtimeBindings from "gtfs-realtime-bindings";
import * as fs from "fs";
import * as path from "path";

// node-fetch v2 uses CommonJS, so we use require
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// LIRR GTFS-RT Feed
const LIRR_FEED_URL = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr";

// MTA API key (get from https://api.mta.info/)
const MTA_API_KEY = process.env.MTA_API_KEY || "";

// LIRR Branch Names (route_id to branch name)
const LIRR_BRANCHES: Record<string, string> = {
  "1": "Babylon",
  "2": "Hempstead",
  "3": "Oyster Bay",
  "4": "Ronkonkoma",
  "5": "Montauk",
  "6": "Long Beach",
  "7": "Far Rockaway",
  "8": "West Hempstead",
  "9": "Port Washington",
  "10": "Port Jefferson",
  "11": "Belmont Park",
  "12": "City Terminal Zone",
  "13": "Greenport",
};

// LIRR Branch Colors (from GTFS routes.txt)
const BRANCH_COLORS: Record<string, { bg: string; text: string }> = {
  "Babylon": { bg: "#00985F", text: "#FFFFFF" },
  "Hempstead": { bg: "#CE8E00", text: "#121212" },
  "Oyster Bay": { bg: "#00AF3F", text: "#FFFFFF" },
  "Ronkonkoma": { bg: "#A626AA", text: "#FFFFFF" },
  "Montauk": { bg: "#00B2A9", text: "#121212" },
  "Long Beach": { bg: "#FF6319", text: "#FFFFFF" },
  "Far Rockaway": { bg: "#6E3219", text: "#FFFFFF" },
  "West Hempstead": { bg: "#00A1DE", text: "#121212" },
  "Port Washington": { bg: "#C60C30", text: "#FFFFFF" },
  "Port Jefferson": { bg: "#006EC7", text: "#FFFFFF" },
  "Belmont Park": { bg: "#60269E", text: "#FFFFFF" },
  "City Terminal Zone": { bg: "#4D5357", text: "#FFFFFF" },
  "Greenport": { bg: "#A626AA", text: "#FFFFFF" },
};

type Departure = {
  stopId: string;
  stationName: string;
  route: string;
  time: number; // epoch ms
  destination: string;
};

// Load LIRR station names from generated JSON
let LIRR_STOPS: Record<string, string> = {};

try {
  const stopsPath = path.join(__dirname, "../data/lirr-stops.json");
  if (fs.existsSync(stopsPath)) {
    const stopsContent = fs.readFileSync(stopsPath, "utf-8");
    LIRR_STOPS = JSON.parse(stopsContent);
    console.log(`Loaded ${Object.keys(LIRR_STOPS).length} LIRR stations`);
  } else {
    console.error("⚠️  lirr-stops.json not found! Run: npm run build-lirr-stops");
  }
} catch (err) {
  console.error("Error loading LIRR stops:", err);
}

// Load LIRR trip headsigns from generated JSON
let LIRR_TRIPS: Record<string, string> = {};

try {
  const tripsPath = path.join(__dirname, "../data/lirr-trips.json");
  if (fs.existsSync(tripsPath)) {
    const tripsContent = fs.readFileSync(tripsPath, "utf-8");
    LIRR_TRIPS = JSON.parse(tripsContent);
    console.log(`Loaded ${Object.keys(LIRR_TRIPS).length} LIRR trip headsigns`);
  } else {
    console.error("⚠️  lirr-trips.json not found! Run: npm run build-lirr-trips");
  }
} catch (err) {
  console.error("Error loading LIRR trips:", err);
}

// Fetch LIRR data on-demand (serverless-friendly)
async function fetchLIRRFeed(): Promise<{ departures: Departure[], updatedAt: number }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/x-protobuf",
    };
    
    if (MTA_API_KEY) {
      headers["x-api-key"] = MTA_API_KEY;
    }

    const res = await fetch(LIRR_FEED_URL, { headers });
    
    if (!res.ok) {
      console.error(`HTTP ${res.status}: ${res.statusText}`);
      return { departures: [], updatedAt: Date.now() };
    }

    const buffer = await res.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    const allDepartures: Departure[] = [];

    feed.entity.forEach(entity => {
      const tu = entity.tripUpdate;
      if (!tu || !tu.trip || !tu.stopTimeUpdate) return;

      const routeId = tu.trip.routeId || "";
      
      // Skip trips without a valid route ID
      if (!routeId || !LIRR_BRANCHES[routeId]) {
        return;
      }
      
      const branchName = LIRR_BRANCHES[routeId];
      
      // Determine the final destination by finding the last stop in this trip
      const stopUpdates = Array.from(tu.stopTimeUpdate);
      let finalDestination = "Unknown";
      let finalStopId = "";
      
      if (stopUpdates.length > 0) {
        // Sort by stop_sequence to find the last stop
        const sortedStops = stopUpdates.slice().sort((a, b) => {
          const seqA = (a as any).stopSequence || 0;
          const seqB = (b as any).stopSequence || 0;
          return seqB - seqA; // Descending order
        });
        
        finalStopId = sortedStops[0]?.stopId || "";
        if (finalStopId) {
          // Look up the station name for the last stop
          finalDestination = LIRR_STOPS[finalStopId] || finalStopId;
        }
      }
      
      // If we couldn't determine from stops, try trip headsign
      if (finalDestination === "Unknown" || !finalDestination) {
        const tripId = tu.trip.tripId || "";
        const staticHeadsign = tripId ? LIRR_TRIPS[tripId] : "";
        const tripHeadsign = (tu.trip as any).tripHeadsign || "";
        finalDestination = staticHeadsign || tripHeadsign || "Unknown";
      }

      tu.stopTimeUpdate.forEach(stu => {
        const stopId = stu.stopId;
        if (!stopId) return;
        
        // Skip if this is the final stop (train is terminating here, not departing)
        if (stopId === finalStopId) return;

        // Use departure time (we want departures, not arrivals)
        const departureTime = stu.departure?.time;
        const timeValue = departureTime;

        if (!timeValue) return;

        // Convert Long to number if needed, then to milliseconds
        const timeSeconds = typeof timeValue === 'number'
          ? timeValue
          : (timeValue as any).toNumber ? (timeValue as any).toNumber() : Number(timeValue);
        const timeMs = timeSeconds * 1000;

        // Get station name from our stops map
        const stationName = LIRR_STOPS[stopId] || stopId;

        allDepartures.push({
          stopId,
          stationName,
          route: branchName,
          time: timeMs,
          destination: finalDestination,
        });
      });
    });

    const now = Date.now();
    console.log(`✓ Fetched LIRR departures: ${allDepartures.length} total`);
    return { departures: allDepartures, updatedAt: now };
  } catch (err) {
    console.error("Error fetching LIRR feed:", err);
    return { departures: [], updatedAt: Date.now() };
  }
}

// API endpoint - get departures (fetches fresh data on each request)
app.get("/api/departures", async (req, res) => {
  try {
    const stops = (req.query.stops as string | undefined)?.split(",") || [];
    
    // Fetch fresh LIRR data
    const { departures: allDepartures, updatedAt } = await fetchLIRRFeed();
    
    let results = allDepartures;

    if (stops.length > 0) {
      results = results.filter(d => stops.includes(d.stopId));
    }

    // Filter future departures only, sort by time, limit to next 50
    const now = Date.now();
    const NINETY_MINUTES_MS = 90 * 60 * 1000;
    
    results = results
      .filter(d => d.time >= now && d.time <= now + NINETY_MINUTES_MS) // Next 1.5 hours
      .sort((a, b) => a.time - b.time)
      .slice(0, 50);

    res.json({
      updatedAt,
      departures: results,
    });
  } catch (err) {
    console.error("Error in /api/departures:", err);
    res.status(500).json({ error: "Failed to fetch departures", departures: [], updatedAt: Date.now() });
  }
});

// API endpoint - get all LIRR stations
app.get("/api/stations", (req, res) => {
  const stations = Object.entries(LIRR_STOPS)
    .map(([stopId, stopName]) => ({
      stopId,
      stopName,
    }))
    .sort((a, b) => a.stopName.localeCompare(b.stopName));

  res.json({ stations });
});

// API endpoint - get branch colors
app.get("/api/branch-colors", (req, res) => {
  res.json(BRANCH_COLORS);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    mode: "serverless",
    stationsLoaded: Object.keys(LIRR_STOPS).length,
    tripsLoaded: Object.keys(LIRR_TRIPS).length,
  });
});

// Debug endpoint to see available stops
app.get("/api/debug/stops", async (req, res) => {
  try {
    // Fetch fresh LIRR data
    const { departures: allDepartures } = await fetchLIRRFeed();
    
    const stopMap: Record<string, { count: number, branches: Set<string> }> = {};

    allDepartures.forEach(dep => {
      if (!stopMap[dep.stopId]) {
        stopMap[dep.stopId] = { count: 0, branches: new Set() };
      }
      stopMap[dep.stopId].count++;
      stopMap[dep.stopId].branches.add(dep.route);
    });

    const stops = Object.entries(stopMap)
      .map(([stopId, info]) => ({
        stopId,
        stationName: LIRR_STOPS[stopId] || stopId,
        branches: Array.from(info.branches).sort(),
        count: info.count,
      }))
      .sort((a, b) => a.stationName.localeCompare(b.stationName));

    res.json({ stops, total: stops.length });
  } catch (err) {
    console.error("Error in /api/debug/stops:", err);
    res.status(500).json({ error: "Failed to fetch stops", stops: [], total: 0 });
  }
});

// Serve static frontend from /public
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`🚂 LIRR Departure Board Server`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`   MTA API Key: ${MTA_API_KEY ? "✓ Set" : "⚠️  Not set (may be required)"}`);
  console.log(`   LIRR Stations: ${Object.keys(LIRR_STOPS).length} loaded`);
});

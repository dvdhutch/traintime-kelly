// Build LIRR trip headsigns from GTFS trips.txt
import * as fs from "fs";
import * as path from "path";

// Path to the GTFS LIRR folder
const GTFS_FOLDER = "/Users/davidmhutchinson/Downloads/gtfslirr";
const TRIPS_FILE = path.join(GTFS_FOLDER, "trips.txt");
const OUTPUT_FILE = path.join(__dirname, "../data/lirr-trips.json");

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function buildLIRRTrips() {
  console.log("Reading GTFS trips.txt...");
  
  const content = fs.readFileSync(TRIPS_FILE, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());
  
  // Parse header
  const header = parseCSVLine(lines[0]);
  const tripIdIndex = header.indexOf("trip_id");
  const tripHeadsignIndex = header.indexOf("trip_headsign");
  
  if (tripIdIndex === -1 || tripHeadsignIndex === -1) {
    throw new Error("Could not find trip_id or trip_headsign in header");
  }
  
  console.log(`Found ${lines.length - 1} trips in GTFS data`);
  
  // Parse trips
  const trips: Record<string, string> = {};
  
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length > tripIdIndex && fields.length > tripHeadsignIndex) {
      const tripId = fields[tripIdIndex];
      const tripHeadsign = fields[tripHeadsignIndex];
      
      if (tripId && tripHeadsign) {
        trips[tripId] = tripHeadsign;
      }
    }
  }
  
  console.log(`Parsed ${Object.keys(trips).length} LIRR trips with headsigns`);
  
  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(trips, null, 2));
  console.log(`✓ Written to ${OUTPUT_FILE}`);
  
  // Show some examples
  console.log("\nSample trip headsigns:");
  const sampleTrips = Object.keys(trips).slice(0, 5);
  sampleTrips.forEach(id => {
    console.log(`  ${id}: ${trips[id]}`);
  });
}

buildLIRRTrips();


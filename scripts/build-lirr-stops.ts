// Build LIRR station names from GTFS stops.txt
import * as fs from "fs";
import * as path from "path";

// Path to the GTFS LIRR folder
const GTFS_FOLDER = "/Users/davidmhutchinson/Downloads/gtfslirr";
const STOPS_FILE = path.join(GTFS_FOLDER, "stops.txt");
const OUTPUT_FILE = path.join(__dirname, "../data/lirr-stops.json");

interface Stop {
  stop_id: string;
  stop_name: string;
}

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

function buildLIRRStops() {
  console.log("Reading GTFS stops.txt...");
  
  const content = fs.readFileSync(STOPS_FILE, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());
  
  // Parse header
  const header = parseCSVLine(lines[0]);
  const stopIdIndex = header.indexOf("stop_id");
  const stopNameIndex = header.indexOf("stop_name");
  
  if (stopIdIndex === -1 || stopNameIndex === -1) {
    throw new Error("Could not find stop_id or stop_name in header");
  }
  
  console.log(`Found ${lines.length - 1} stops in GTFS data`);
  
  // Parse stops
  const stops: Record<string, string> = {};
  
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length > stopIdIndex && fields.length > stopNameIndex) {
      const stopId = fields[stopIdIndex];
      const stopName = fields[stopNameIndex];
      
      if (stopId && stopName) {
        stops[stopId] = stopName;
      }
    }
  }
  
  console.log(`Parsed ${Object.keys(stops).length} LIRR stations`);
  
  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stops, null, 2));
  console.log(`✓ Written to ${OUTPUT_FILE}`);
  
  // Show some examples
  console.log("\nSample stations:");
  const sampleStops = ["237", "349", "102", "1", "100"];
  sampleStops.forEach(id => {
    if (stops[id]) {
      console.log(`  ${id}: ${stops[id]}`);
    }
  });
}

buildLIRRStops();


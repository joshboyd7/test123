// Create map without default zoom buttons
let map = L.map("map", {
  center: [37.8, -96],
  zoom: 4,
  zoomControl: false
});

// Add zoom buttons back on the right
L.control.zoom({ position: "topright" }).addTo(map);

let geoLayer;
let currentYear = "2024";
let currentLayer = "county";

// Basemap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "Map data © OpenStreetMap contributors"
}).addTo(map);

// Compute quantiles for legend and color scale
function computeQuantiles(values, quantiles) {
  const sorted = values.filter(v => v != null && !isNaN(v)).sort((a, b) => a - b);
  return quantiles.map(q => {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined
      ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
      : sorted[base];
  });
}

// Load GeoJSON layer and update map
function loadLayer(year, layerType) {
  const filePath = `data/${year}-${layerType}.json`;

  fetch(filePath)
    .then(res => res.json())
    .then(data => {
      if (geoLayer) map.removeLayer(geoLayer);

      // Extract and filter valid numeric values
      const allValues = data.features
        .map(f => f.properties.value)
        .filter(v => typeof v === "number" && !isNaN(v))
        .sort((a, b) => a - b);

      if (allValues.length === 0) {
        console.warn("No valid data to visualize.");
        return;
      }

      // Compute quantile breaks (8 cuts = 9 bins)
      const breaks = computeQuantiles(allValues, [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 0.95]);

      const fullBreaks = [allValues[0], ...breaks, allValues[allValues.length - 1]];
      const colorStops = ['#08306b', '#2171b5', '#6baed6', '#bdd7e7', '#eff3ff', '#fee0d2', '#fc9272', '#de2d26', '#a50f15'];
      const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

      // Dynamic color scale
      const getColor = d => {
        if (d == null || isNaN(d)) return '#cccccc';
        return d > breaks[7] ? '#a50f15' :
               d > breaks[6] ? '#de2d26' :
               d > breaks[5] ? '#fc9272' :
               d > breaks[4] ? '#fee0d2' :
               d > breaks[3] ? '#eff3ff' :
               d > breaks[2] ? '#bdd7e7' :
               d > breaks[1] ? '#6baed6' :
               d > breaks[0] ? '#2171b5' :
                               '#08306b';
      };

      // Update legend
      document.getElementById("legend-colors").innerHTML = colorStops
        .map(color => `<div class="stop" style="background:${color}; flex:1;"></div>`)
        .join("");

document.getElementById("legend-labels").innerHTML = fullBreaks
  .slice(0, -1) // exclude the last breakpoint (right edge)
  .map(b => `<span>${formatter.format(b)}</span>`)
  .join("");


      // Add GeoJSON layer with color scale
      geoLayer = L.geoJSON(data, {
        style: feature => ({
          fillColor: getColor(feature.properties.value),
          weight: 1,
          opacity: 1,
          color: 'white',
          dashArray: '3',
          fillOpacity: 0.8
        }),
        onEachFeature: (feature, layer) => {
          const name = feature.properties.NAME || feature.properties.name || "";
          const val = feature.properties.value != null ? `$${feature.properties.value.toLocaleString()}` : "N/A";
          layer.bindPopup(`${name}: ${val}`);
        }
      }).addTo(map);

      // Fixed view on mainland US
      map.setView([37.8, -96], 5.3);
    })
    .catch(err => {
      console.error("Error loading data:", err);
    });
}


// Initial load
loadLayer(currentYear, currentLayer);

// Dropdown for year
document.getElementById("year-select").addEventListener("change", e => {
  currentYear = e.target.value;
  loadLayer(currentYear, currentLayer);
});

// Toggle layer (county/state)
document.querySelectorAll('input[name="layer"]').forEach(input => {
  input.addEventListener("change", e => {
    currentLayer = e.target.value;
    loadLayer(currentYear, currentLayer);
  });
});

// Download CSV instead of JSON
document.getElementById("download").addEventListener("click", () => {
  const url = `data/${currentYear}-${currentLayer}.csv`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentYear}-${currentLayer}.csv`;
  a.click();
});

// Download All CSV for current layer (county/state)
document.getElementById("download-all").addEventListener("click", () => {
  const url = `data/All-${currentLayer}.csv`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `All-${currentLayer}.csv`;
  a.click();
});


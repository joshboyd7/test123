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

      // Extract data values
      const allValues = data.features.map(f => f.properties.value)
        .filter(v => v != null && !isNaN(v))
        .sort((a, b) => a - b);

      if (allValues.length === 0) {
        console.warn("No valid data values found.");
        return;
      }

      // Compute quantile breaks
      const breaks = computeQuantiles(allValues, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
      const fullBreaks = [allValues[0], ...breaks, allValues[allValues.length - 1]];
      const colorStops = ['#08306b', '#2171b5', '#6baed6', '#bdd7e7', '#eff3ff', '#fee0d2', '#fc9272', '#de2d26', '#a50f15'];
      const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

      // Define color scale based on computed quantiles
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

      // Update legend colors
      document.getElementById("legend-colors").innerHTML = colorStops.map(color =>
        `<div class="stop" style="background:${color}; flex:1;"></div>`
      ).join("");

      // Update legend labels
      document.getElementById("legend-labels").innerHTML = fullBreaks.map(b =>
        `<span>${formatter.format(b)}</span>`
      ).join("");

      // Add GeoJSON layer
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
          const val = feature.properties.value != null ? feature.properties.value.toLocaleString() : "N/A";
          layer.bindPopup(`${name}: $${val}`);
        }
      }).addTo(map);

      // Keep view centered on mainland US
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

// Download button
document.getElementById("download").addEventListener("click", () => {
  const url = `data/${currentYear}-${currentLayer}.json`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentYear}-${currentLayer}.json`;
  a.click();
});


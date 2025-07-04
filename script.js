let map = L.map("map").setView([37.8, -96], 4);
let geoLayer;
let currentYear = "2023";
let currentLayer = "county";

// Basemap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "Map data © OpenStreetMap contributors"
}).addTo(map);

// Color scale
function getColor(d) {
  if (d == null || isNaN(d)) return '#cccccc'; // gray for NA

  return d > 9411.148 ? '#08306b' :
         d > 2511.106 ? '#2171b5' :
         d > 2168.236 ? '#6baed6' :
         d > 1952.638 ? '#bdd7e7' :
         d > 1792.199 ? '#eff3ff' :
         d > 1660.116 ? '#fee0d2' :
         d > 1536.735 ? '#fc9272' :
         d > 1407.501 ? '#de2d26' :
                    '#a50f15';
}



// Load data
function loadLayer(year, layerType) {
  const filePath = `data/${year}-${layerType}.json`;

  fetch(filePath)
    .then(res => res.json())
    .then(data => {
      if (geoLayer) map.removeLayer(geoLayer);

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

      map.fitBounds(geoLayer.getBounds());
    })
    .catch(err => {
      console.error("Error loading data:", err);
    });
}

// Initial load
loadLayer(currentYear, currentLayer);

// Year dropdown
document.getElementById("year-select").addEventListener("change", e => {
  currentYear = e.target.value;
  loadLayer(currentYear, currentLayer);
});

// Layer toggle (county/state)
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

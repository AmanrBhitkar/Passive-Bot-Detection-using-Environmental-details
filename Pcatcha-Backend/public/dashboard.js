const BACKEND_URL = "https://passive-bot-detection-using-rfgb.onrender.com/api/data";

async function fetchData() {
  const res = await fetch(BACKEND_URL);
  const data = await res.json();

  // Show totals
  document.getElementById("totalSessions").innerText = data.length;
  document.getElementById("avgTime").innerText = (data.reduce((a, b) => a + (b.timeOnPage || 0), 0) / data.length / 1000).toFixed(2) + " s";
  document.getElementById("avgClicks").innerText = (data.reduce((a, b) => a + (b.clickCount || 0), 0) / data.length).toFixed(1);

  // Simple heuristic for demo: if clickCount < 2 && timeOnPage < 3000 → BOT
  let botCount = 0;
  let humanCount = 0;

  data.forEach(d => {
    if ((d.clickCount || 0) < 2 && (d.timeOnPage || 0) < 3000) botCount++;
    else humanCount++;
  });

  // Chart 1 - Bot vs Human
  new Chart(document.getElementById("botHumanChart"), {
    type: 'doughnut',
    data: {
      labels: ['Bot', 'Human'],
      datasets: [{
        data: [botCount, humanCount],
        backgroundColor: ['#dc3545', '#28a745']
      }]
    },
    options: { plugins: { title: { display: true, text: 'Bot vs Human Sessions' } } }
  });

  // Chart 2 - Platform Distribution
  const platformCount = {};
  data.forEach(d => {
    const platform = d.platform || "Unknown";
    platformCount[platform] = (platformCount[platform] || 0) + 1;
  });

  new Chart(document.getElementById("platformChart"), {
    type: 'bar',
    data: {
      labels: Object.keys(platformCount),
      datasets: [{
        label: "Sessions",
        data: Object.values(platformCount),
        backgroundColor: '#007bff'
      }]
    },
    options: { plugins: { title: { display: true, text: 'Platform Distribution' } } }
  });
}

fetchData();

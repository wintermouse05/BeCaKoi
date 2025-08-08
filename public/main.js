const socket = new WebSocket('ws://localhost:3000');
const labels = [];
const temps = [];
const turbs = [];

const ctx = document.getElementById('myChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: labels,
    datasets: [
      { label: 'Temperature', data: temps, borderWidth: 1 },
      { label: 'Turbidity', data: turbs, borderWidth: 1 }
    ]
  },
  options: { scales: { y: { beginAtZero: true } } }
});

socket.onmessage = event => {
  const data = JSON.parse(event.data);
  labels.push(data.time);
  temps.push(data.temp);
  turbs.push(data.turb);
  chart.update();
};

function fetchData() {
  const from = document.getElementById("startDate").value;
  const to = document.getElementById("endDate").value;
  fetch(`/history?from=${from}&to=${to}`)
    .then(res => res.json())
    .then(history => {
      labels.length = temps.length = turbs.length = 0;
      history.forEach(d => {
        labels.push(d.time);
        temps.push(d.temp);
        turbs.push(d.turb);
      });
      chart.update();
    });
}

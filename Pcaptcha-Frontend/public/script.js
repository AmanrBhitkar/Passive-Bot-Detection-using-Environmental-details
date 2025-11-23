const botDetectionData = {
  // Environmental metrics
  userAgent: navigator.userAgent,
  language: navigator.language,
  platform: navigator.platform,
  screenResolution: `${window.screen.width}x${window.screen.height}`,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  doNotTrack: navigator.doNotTrack,
  hardwareConcurrency: navigator.hardwareConcurrency,
  deviceMemory: navigator.deviceMemory || 'Unknown',

  // Behavioral metrics
  mouseMoves: [],
  keyPressCount: 0,
  clickCount: 0,
  scrollDepth: 0,
  timeOnPage: Date.now(),
};

// Event listeners for behavioral data
document.addEventListener('mousemove', e => botDetectionData.mouseMoves.push({ x: e.clientX, y: e.clientY, t: Date.now() }));
document.addEventListener('keydown', () => botDetectionData.keyPressCount++);
document.addEventListener('click', () => botDetectionData.clickCount++);
window.addEventListener('scroll', () => {
  botDetectionData.scrollDepth = Math.max(botDetectionData.scrollDepth, window.scrollY + window.innerHeight);
});

// Function to send data to backend
async function sendData(data) {
  try {
    const response = await fetch("/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (err) {
    console.error("❌ Error sending data:", err);
  }
}

// Include form data
const userForm = document.getElementById('userForm');
userForm.addEventListener('submit', async e => {
  e.preventDefault();
  botDetectionData.username = document.getElementById('username').value;
  botDetectionData.email = document.getElementById('email').value;
  
  botDetectionData.timeOnPage = Date.now() - botDetectionData.timeOnPage;

  const result = await sendData(botDetectionData);
  if (result) {
    console.log('✅ Server response:', result);
    alert('✅ Data submitted successfully!');
    userForm.reset();
  } else {
    alert('❌ Failed to send data to server.');
  }
});

// Send data every 10 seconds in background
setInterval(() => {
  botDetectionData.timeOnPage = Date.now() - botDetectionData.timeOnPage;
  sendData(botDetectionData);
}, 10000);
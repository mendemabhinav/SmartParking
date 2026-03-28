let latestData = null; // Store data to update timer smoothly

async function fetchStatus() {
    const response = await fetch('/get_status');
    latestData = await response.json();
    updateUI();
}

function updateUI() {
    if (!latestData) return;
    
    // Update Free Counts
    document.getElementById('count-f1').innerText = `${latestData.counts.f1} Slots Free`;
    document.getElementById('count-f2').innerText = `${latestData.counts.f2} Slots Free`;
    document.getElementById('count-f3').innerText = `${latestData.counts.f3} Slots Free`;

    // Draw Floors
    drawFloor('f1-grid', latestData, 'F1', 48);
    drawFloor('f2-grid', latestData, 'F2', 24);
    drawFloor('f3-grid', latestData, 'F3', 24);

    // Update Log
    const logEl = document.getElementById('activity-log');
    logEl.innerHTML = '';
    latestData.log.forEach(entry => {
        let li = document.createElement('li');
        li.innerText = entry;
        logEl.appendChild(li);
    });
}

function drawFloor(containerId, data, prefix, count) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = ''; 
    let now = Date.now() / 1000; // Current time in seconds

    for (let i = 1; i <= count; i++) {
        let id = `${prefix}-${i}`;
        let state = data.slots[id];
        let div = document.createElement('div');
        div.className = 'slot ' + getColor(state);
        
        let content = `<span>${id}</span>`;
        
        // Timer Logic for Yellow Reserved Slots
        if (state === 2 && data.expirations[id]) {
            let timeLeft = Math.max(0, Math.ceil(data.expirations[id] - now));
            content += `<span class="timer-text">${timeLeft}s left</span>`;
        }
        
        div.innerHTML = content;
        div.onclick = () => slotAction(id, state);
        grid.appendChild(div);
    }
}

function getColor(state) {
    if (state === 0) return 'green';
    if (state === 1) return 'red';
    if (state === 2) return 'yellow';
}

async function autoPark(type) {
    await fetch('/greedy_park', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({type: type})
    });
    fetchStatus();
}

async function slotAction(id, state) {
    let payload = {id: id};
    
    if (state === 0) {
        let time = prompt(`Reserve slot ${id}? Enter duration in SECONDS:`);
        if (!time || isNaN(time)) return; 
        payload.duration = parseInt(time);
    } else {
        if (!confirm(`Remove vehicle from ${id}?`)) return;
    }

    await fetch('/action', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    fetchStatus(); 
}

// Initial fetch
fetchStatus();

// To make the countdown look smooth, we redraw the UI every 1 second based on the stored data
setInterval(updateUI, 1000); 

// We ask Python for fresh server data every 2 seconds
setInterval(fetchStatus, 2000);
let latestData = null; 
let activePopups = new Set(); // Keeps track of which popups are currently open

async function fetchStatus() {
    const response = await fetch('/get_status');
    latestData = await response.json();
    updateUI();
}

function updateCountText(elementId, count) {
    const el = document.getElementById(elementId);
    if (count === 0) {
        el.innerText = "FULL!";
        el.style.color = "#e74c3c"; // Turn text Red
    } else {
        el.innerText = `${count} Slots Free`;
        el.style.color = "#2ecc71"; // Keep text Green
    }
}

function updateUI() {
    if (!latestData) return;
    
    updateCountText('count-f1', latestData.counts.f1);
    updateCountText('count-f2', latestData.counts.f2);
    updateCountText('count-f3', latestData.counts.f3);

    drawFloor('f1-grid', latestData, 'F1', 48);
    drawFloor('f2-grid', latestData, 'F2', 24);
    drawFloor('f3-grid', latestData, 'F3', 24);

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
    let now = Date.now() / 1000; 

    for (let i = 1; i <= count; i++) {
        let id = `${prefix}-${i}`;
        let state = data.slots[id];
        let div = document.createElement('div');
        div.className = 'slot ' + getColor(state);
        
        let content = `<span>${id}</span>`;
        
        if (state === 2 && data.expirations[id]) {
            let timeLeft = Math.max(0, Math.ceil(data.expirations[id] - now));
            
            if (timeLeft > 0) {
                content += `<span class="timer-text">${timeLeft}s left</span>`;
            } else {
                content += `<span class="timer-text">Time's Up!</span>`;
                
                // If time is 0 and we haven't asked yet, trigger the popup!
                if (!activePopups.has(id)) {
                    activePopups.add(id);
                    setTimeout(() => askReservationResult(id), 100); 
                }
            }
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

async function askReservationResult(id) {
    // confirm() returns True if they click OK, False if they click Cancel
    let arrived = confirm(`Time is up for reserved slot ${id}!\n\nDid the vehicle arrive?\n[OK] = Yes (Mark Occupied)\n[Cancel] = No (Mark Free)`);
    
    await fetch('/resolve_reservation', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: id, arrived: arrived})
    });
    
    activePopups.delete(id); // Clean up the tracker
    fetchStatus(); // Refresh the grid
}

async function autoPark(type) {
    const res = await fetch('/greedy_park', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({type: type})
    });
    
    // If the backend returns a 400 error (Queues are empty)
    if (!res.ok) {
        const errorData = await res.json();
        alert(`❌ Cannot park: ${errorData.message}`);
    }
    
    fetchStatus();
}

async function slotAction(id, state) {
    let payload = {id: id};
    
    if (state === 0) {
        let time = prompt(`Reserve slot ${id}? Enter duration in SECONDS:`);
        if (!time || isNaN(time)) return; 
        payload.duration = parseInt(time);
    } else {
        if (!confirm(`Remove vehicle from ${id}? (Make slot green)`)) return;
    }

    await fetch('/action', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    fetchStatus(); 
}

fetchStatus();
setInterval(updateUI, 1000); 
setInterval(fetchStatus, 2000);
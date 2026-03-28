async function loadLot() {
    const response = await fetch('/get_status');
    const data = await response.json();
    
    drawFloor('f1-grid', data.slots, 'F1', 48);
    drawFloor('f2-grid', data.slots, 'F2', 24);
    drawFloor('f3-grid', data.slots, 'F3', 24);

    const logEl = document.getElementById('activity-log');
    logEl.innerHTML = '';
    data.log.forEach(entry => {
        let li = document.createElement('li');
        li.innerText = entry;
        logEl.appendChild(li);
    });
}

function drawFloor(containerId, slots, prefix, count) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = ''; 
    for (let i = 1; i <= count; i++) {
        let id = `${prefix}-${i}`;
        let div = document.createElement('div');
        div.innerText = id;
        div.className = 'slot ' + getColor(slots[id]);
        
        div.onclick = () => slotAction(id, slots[id]);
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
    loadLot();
}

async function slotAction(id, state) {
    let payload = {id: id};
    
    if (state === 0) {
        // FIXED: Prompt for duration. We use SECONDS so you can test it quickly without waiting an hour!
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
    loadLot(); 
}

loadLot();

// FIXED: This automatically refreshes the grid every 1.5 seconds so you can watch timers expire!
setInterval(loadLot, 1500);
from flask import Flask, render_template, jsonify, request
import heapq
import datetime
import time 

app = Flask(__name__)

parking_slots = {}
f1_bikes = []
f2_cars = []
f3_cars = []
activity_log = []
expirations = {} 

def add_log(message):
    time_now = datetime.datetime.now().strftime("%H:%M:%S")
    activity_log.insert(0, f"[{time_now}] {message}")
    if len(activity_log) > 15: activity_log.pop()

for i in range(1, 49):
    parking_slots[f'F1-{i}'] = 0
    heapq.heappush(f1_bikes, (i, f'F1-{i}'))
for i in range(1, 25):
    parking_slots[f'F2-{i}'] = 0
    heapq.heappush(f2_cars, (i, f'F2-{i}'))
    parking_slots[f'F3-{i}'] = 0
    heapq.heappush(f3_cars, (i, f'F3-{i}'))

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_status')
def get_status():
    return jsonify({
        "slots": parking_slots, 
        "log": activity_log,
        "counts": {"f1": len(f1_bikes), "f2": len(f2_cars), "f3": len(f3_cars)},
        "expirations": expirations
    })

@app.route('/greedy_park', methods=['POST'])
def greedy_park():
    v_type = request.json.get('type')
    
    if v_type == 'bike':
        if not f1_bikes: return jsonify({"message": "Floor 1 (Bikes) is completely FULL!"}), 400
        weight, best_slot = heapq.heappop(f1_bikes)
    else:
        if f2_cars: weight, best_slot = heapq.heappop(f2_cars)
        elif f3_cars: weight, best_slot = heapq.heappop(f3_cars)
        else: return jsonify({"message": "Floor 2 & 3 (Cars) are completely FULL!"}), 400

    parking_slots[best_slot] = 1 
    add_log(f"{v_type.capitalize()} parked greedily in {best_slot}")
    return jsonify({"message": "Success"})

@app.route('/action', methods=['POST'])
def action():
    global f1_bikes, f2_cars, f3_cars 
    
    slot_id = request.json.get('id')
    state = parking_slots[slot_id]
    weight = int(slot_id.split('-')[1]) 
    
    if state == 0: 
        duration = int(request.json.get('duration', 0))
        parking_slots[slot_id] = 2
        expirations[slot_id] = time.time() + duration 
        
        if 'F1' in slot_id: f1_bikes = [s for s in f1_bikes if s[1] != slot_id]; heapq.heapify(f1_bikes)
        elif 'F2' in slot_id: f2_cars = [s for s in f2_cars if s[1] != slot_id]; heapq.heapify(f2_cars)
        elif 'F3' in slot_id: f3_cars = [s for s in f3_cars if s[1] != slot_id]; heapq.heapify(f3_cars)
        
        add_log(f"Slot {slot_id} reserved for {duration} seconds.")
        
    else: 
        parking_slots[slot_id] = 0
        if slot_id in expirations: del expirations[slot_id] 
        if 'F1' in slot_id: heapq.heappush(f1_bikes, (weight, slot_id))
        elif 'F2' in slot_id: heapq.heappush(f2_cars, (weight, slot_id))
        elif 'F3' in slot_id: heapq.heappush(f3_cars, (weight, slot_id))
        add_log(f"Vehicle exited from {slot_id}. Slot is FREE.")

    return jsonify({"message": "Action complete"})

# --- NEW ROUTE: Handles the Popup Result ---
@app.route('/resolve_reservation', methods=['POST'])
def resolve_reservation():
    global f1_bikes, f2_cars, f3_cars 
    
    slot_id = request.json.get('id')
    arrived = request.json.get('arrived') # True if they clicked OK, False if Cancel
    weight = int(slot_id.split('-')[1])
    
    if slot_id in expirations:
        del expirations[slot_id] # Clear the timer
        
    if arrived:
        parking_slots[slot_id] = 1 # Mark Red (Occupied)
        add_log(f"Reservation time up. Vehicle parked in {slot_id}.")
    else:
        parking_slots[slot_id] = 0 # Mark Green (Free)
        if 'F1' in slot_id: heapq.heappush(f1_bikes, (weight, slot_id))
        elif 'F2' in slot_id: heapq.heappush(f2_cars, (weight, slot_id))
        elif 'F3' in slot_id: heapq.heappush(f3_cars, (weight, slot_id))
        add_log(f"Reservation time up. No-show for {slot_id}. Slot is FREE.")

    return jsonify({"message": "Resolved"})

if __name__ == '__main__':
    app.run(debug=True)
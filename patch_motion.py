import re

with open('src/components/StudyCalendar.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
in_event_card = False

for i, line in enumerate(lines):
    if "return (" in line and "<motion.div" in lines[i+1] and "key={ev.id}" in lines[i+2]:
        new_lines.append(line)
        in_event_card = True
        
        div_str = """              <div
                key={ev.id}
                onPointerDown={(e) => {
                  if (e.button !== 0) return; // Only left click
                  e.stopPropagation();
                  e.preventDefault();
                  
                  const target = e.currentTarget;
                  target.setPointerCapture(e.pointerId);
                  
                  setIsDraggingEvent(true);
                  setDragEventId(ev.id);
                  document.body.style.userSelect = 'none';
                  document.body.style.webkitUserSelect = 'none';
                  
                  const startY = e.clientY;
                  const originalStartTime = ev.start.getTime();
                  const originalEndTime = ev.end.getTime();
                  
                  const handlePointerMove = (moveEvent) => {
                    moveEvent.preventDefault();
                    const deltaY = moveEvent.clientY - startY;
                    const deltaMins = deltaY / (80 / 60);
                    
                    let newDeltaMins = Math.round(deltaMins);
                    
                    // Boundary check
                    const minDeltaMins = - (startHour - 5) * 60; // Can't go before 5 AM
                    const maxDeltaMins = (24 - (startHour + duration)) * 60; // Can't go past midnight
                    
                    if (newDeltaMins < minDeltaMins) newDeltaMins = minDeltaMins;
                    if (newDeltaMins > maxDeltaMins) newDeltaMins = maxDeltaMins;
                    
                    const newStart = new Date(originalStartTime + newDeltaMins * 60000);
                    const newEnd = new Date(originalEndTime + newDeltaMins * 60000);
                    
                    setTodos(prev => prev.map(t => 
                      t.id === ev.id ? { ...t, startTime: newStart.toISOString(), endTime: newEnd.toISOString() } : t
                    ));
                  };
                  
                  const handlePointerUp = () => {
                    setIsDraggingEvent(false);
                    setDragEventId(null);
                    setUnsyncedChanges(true);
                    document.body.style.userSelect = '';
                    document.body.style.webkitUserSelect = '';
                    target.releasePointerCapture(e.pointerId);
                    target.removeEventListener('pointermove', handlePointerMove);
                    target.removeEventListener('pointerup', handlePointerUp);
                  };
                  
                  target.addEventListener('pointermove', handlePointerMove, { passive: false });
                  target.addEventListener('pointerup', handlePointerUp);
                }}
"""
        new_lines.append(div_str)
        continue
        
    if in_event_card:
        if "className={`event-card" in line:
            # We skip everything until className
            class_str = """                className={`event-card absolute rounded-xl border-l-4 shadow-sm p-3 overflow-hidden backdrop-blur-md transition-all ${colorClass} ${ev.completed ? 'opacity-50' : ''} ${resizingEventId === ev.id ? 'ring-2 ring-indigo-500 z-50 shadow-lg' : ''} ${dragEventId === ev.id ? 'opacity-70 scale-[0.98] z-50 ring-2 ring-indigo-500 shadow-xl cursor-grabbing' : 'cursor-grab hover:scale-[0.98]'}`}
"""
            new_lines.append(class_str)
        elif "left: `calc(" in line or "width: `calc(" in line or "top: " in line or "height: " in line or "style={{" in line or "}}>" in line or "<p className=" in line or "{format(" in line or "</p>" in line or "absolute bottom-0" in line or "onPointerEnter" in line or "onPointerLeave" in line or "onPointerDownCapture" in line or "onPointerDown" in line or "e.stopPropagation" in line or "e.nativeEvent" in line or "e.preventDefault" in line or "e.currentTarget" in line or "document.body.style" in line or "const startY" in line or "const originalDurationMins" in line or "setResizingEventId" in line or "const handlePointerMove" in line or "const deltaY" in line or "let rawDeltaMins" in line or "let newDurationMins" in line or "if (newDurationMins < 1)" in line or "newDurationMins = Math.round" in line or "const maxDurationMins" in line or "if (newDurationMins > maxDurationMins)" in line or "const newEnd" in line or "setTodos" in line or "return prev.map" in line or "t.id === ev.id" in line or "});" in line or "};" in line or "const handlePointerUp" in line or "setUnsyncedChanges" in line or "target.releasePointerCapture" in line or "document.removeEventListener" in line or "target.addEventListener" in line or "document.addEventListener" in line or "bg-black/50" in line or "bg-black/20" in line or "<div" in line or "</div>" in line:
            
            # Since this is getting complicated, let's just use regular expressions instead.
            pass

"""

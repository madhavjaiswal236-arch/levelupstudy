import re

with open('src/components/StudyCalendar.tsx', 'r') as f:
    content = f.read()

# We need to replace everything from `<div key={ev.id}` up to `return (` in `scheduledEvents.filter` map

def replace_drag_block(match):
    return """              <div
                key={ev.id}
                onPointerDown={(e) => {
                  if (e.button !== 0) return; // Only left click
                  // If we click on the resize handle, ignore it (handled by resize pointerDown)
                  if ((e.target as HTMLElement).closest('.group\\\\/resize')) return;
                  
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
                  const durationMilli = originalEndTime - originalStartTime;
                  
                  const handlePointerMove = (moveEvent: PointerEvent) => {
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
                    const newEnd = new Date(originalStartTime + newDeltaMins * 60000 + durationMilli);
                    
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
                className={`event-card absolute rounded-xl border-l-4 shadow-sm p-3 overflow-hidden backdrop-blur-md transition-all ${colorClass} ${ev.completed ? 'opacity-50' : ''} ${resizingEventId === ev.id ? 'ring-2 ring-indigo-500 z-50 shadow-lg' : ''} ${dragEventId === ev.id ? 'opacity-70 scale-[0.98] z-50 ring-2 ring-indigo-500 shadow-xl cursor-grabbing' : 'cursor-grab hover:scale-[0.98]'}`}
                style={{
"""

content = re.sub(r'<\s*div\s+key=\{ev\.id\}.*?className=\{`event-card.*?`\}\s*\n\s*style=\{\{', replace_drag_block, content, flags=re.DOTALL)

with open('src/components/StudyCalendar.tsx', 'w') as f:
    f.write(content)

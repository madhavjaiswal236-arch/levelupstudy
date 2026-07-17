import re

with open('src/components/StudyCalendar.tsx', 'r') as f:
    lines = f.readlines()

def find_line(pattern, start=0):
    for i in range(start, len(lines)):
        if pattern in lines[i]:
            return i
    return -1

start_idx = find_line('<div', find_line('return (', find_line('const colorClass = COLORS[ev.subject]')))
end_idx = find_line('</div>', find_line('bg-black/50 dark:bg-white/70 scale-110 shadow-sm', start_idx)) + 2

replacement = """              <div
                key={ev.id}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  if ((e.target as HTMLElement).closest('[data-resize-handle="true"]') || (e.target as HTMLElement).closest('[data-delete-btn="true"]')) return;
                  
                  e.stopPropagation();
                  e.preventDefault();
                  
                  const target = e.currentTarget;
                  target.setPointerCapture(e.pointerId);
                  
                  setIsDraggingEvent(true);
                  setDragEventId(ev.id);
                  document.body.classList.add('is-dragging');
                  
                  const startY = e.clientY;
                  const originalStartTime = ev.start.getTime();
                  const originalEndTime = ev.end.getTime();
                  const durationMilli = originalEndTime - originalStartTime;
                  
                  const handlePointerMove = (moveEvent: PointerEvent) => {
                    moveEvent.preventDefault();
                    const deltaY = moveEvent.clientY - startY;
                    const deltaMins = deltaY / (80 / 60);
                    
                    let newDeltaMins = Math.round(deltaMins);
                    
                    const minDeltaMins = - (startHour - 5) * 60; 
                    const maxDeltaMins = (24 - (startHour + duration)) * 60; 
                    
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
                    document.body.classList.remove('is-dragging');
                    target.releasePointerCapture(e.pointerId);
                    target.removeEventListener('pointermove', handlePointerMove as EventListener);
                    target.removeEventListener('pointerup', handlePointerUp as EventListener);
                  };
                  
                  target.addEventListener('pointermove', handlePointerMove as EventListener, { passive: false });
                  target.addEventListener('pointerup', handlePointerUp as EventListener);
                }}
                className={`absolute rounded-xl px-2 py-1 overflow-hidden cursor-grab active:cursor-grabbing border ${colorClass} ${dragEventId === ev.id ? 'opacity-50 scale-[0.98] z-50 shadow-lg' : 'z-40 shadow-sm'} transition-transform group`}
                style={{ 
                  left: `calc(${dayIndex * (100 / visibleDays.length)}% + 4px)`,
                  width: `calc(${100 / visibleDays.length}% - 8px)`,
                  top: `${(startHour - 5) * 80}px`,
                  height: `${duration * 80 - 2}px`
                }}
              >
                {/* Delete button (visible on hover) */}
                <button
                  data-delete-btn="true"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTodos(prev => prev.filter(t => t.id !== ev.id));
                    setUnsyncedChanges(true);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/20 hover:bg-black/40 dark:bg-white/20 dark:hover:bg-white/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-[60]"
                >
                  <X className="w-3 h-3 text-white" />
                </button>

                <p className="text-[11px] font-bold leading-tight line-clamp-2 pr-5 pointer-events-none">{ev.title}</p>
                <p className="event-time text-[9px] opacity-80 mt-0.5 pointer-events-none">
                  {format(ev.start, 'h:mm a')} - {format(ev.end, 'h:mm a')}
                </p>
                <div 
                  data-resize-handle="true"
                  className={`absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-end pb-1 justify-center opacity-0 hover:opacity-100 transition-opacity ${resizingEventId === ev.id ? 'opacity-100 bg-black/10 dark:bg-white/10' : 'hover:bg-black/10 dark:hover:bg-white/10'} touch-none z-[60]`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopPropagation();
                    e.preventDefault();
                    
                    document.body.classList.add('is-dragging');
                    
                    const startY = e.clientY;
                    const originalDurationMins = duration * 60;
                    setResizingEventId(ev.id);
                    
                    const handlePointerMove = (moveEvent: PointerEvent) => {
                      moveEvent.preventDefault();
                      const deltaY = moveEvent.clientY - startY;
                      let rawDeltaMins = deltaY / (80 / 60);
                      let newDurationMins = originalDurationMins + rawDeltaMins;
                      
                      if (newDurationMins < 1) newDurationMins = 1;
                      newDurationMins = Math.round(newDurationMins);
                      
                      const maxDurationMins = (24 - startHour) * 60;
                      if (newDurationMins > maxDurationMins) newDurationMins = maxDurationMins;
                      
                      const newEnd = new Date(ev.start.getTime() + newDurationMins * 60000);
                      
                      setTodos(prev => {
                        return prev.map(t => 
                          t.id === ev.id ? { ...t, endTime: newEnd.toISOString() } : t
                        );
                      });
                    };
                    
                    const handlePointerUp = () => {
                      setResizingEventId(null);
                      setUnsyncedChanges(true);
                      document.body.classList.remove('is-dragging');
                      window.removeEventListener('pointermove', handlePointerMove);
                      window.removeEventListener('pointerup', handlePointerUp);
                    };
                    
                    window.addEventListener('pointermove', handlePointerMove, { passive: false });
                    window.addEventListener('pointerup', handlePointerUp);
                  }}
                >
                   <div className={`w-6 h-1 rounded-full transition-all ${resizingEventId === ev.id ? 'bg-black/50 dark:bg-white/70 scale-110 shadow-sm' : 'bg-black/20 dark:bg-white/30'}`} />
                </div>
              </div>
"""

lines = lines[:start_idx] + [replacement] + lines[end_idx:]

with open('src/components/StudyCalendar.tsx', 'w') as f:
    f.writelines(lines)

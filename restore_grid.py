# Let's recreate renderTimeline
code = """  const renderTimeline = () => (
    <div id="calendar-scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden relative flex scrollbar-hide">
      {/* Time Column */}
      <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-white/5 relative z-20 bg-white dark:bg-[#121212]">
        <div className="h-12 border-b border-slate-200 dark:border-white/5 text-[10px] text-slate-400 flex justify-center items-end pb-2">
          TIME
        </div>
        {hours.map(hour => (
          <div key={hour} className="h-20 text-xs text-slate-500 flex justify-center pr-2 pt-2 relative border-b border-slate-100 dark:border-white/5 border-dashed">
            <span className="relative -top-2.5 bg-white dark:bg-[#121212] px-1">
              {hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : `${hour} AM`}
            </span>
          </div>
        ))}
      </div>
      
      {/* Days Grid */}
      <div className="flex-1 flex flex-col relative min-w-[600px]">
        {/* Day Headers */}
        <div className="flex h-12 border-b border-slate-200 dark:border-white/5 sticky top-0 z-30 bg-white dark:bg-[#121212]">
          {visibleDays.map(d => (
            <div key={d.getTime()} className="flex-1 flex flex-col items-center justify-center border-r border-slate-200 dark:border-white/5 relative">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{format(d, 'EEE')}</span>
              <span className={`text-sm font-bold ${isSameDay(d, new Date()) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {format(d, 'd')}
              </span>
            </div>
          ))}
        </div>
        
        {/* Grid Body */}
        <div className="relative flex-1" style={{ height: `${hours.length * 80}px`, minHeight: `${hours.length * 80}px` }}>
          {hours.map(hour => (
            <div key={`grid-${hour}`}>
              <div className="absolute w-full h-[1px] bg-slate-200 dark:bg-white/10" style={{ top: `${(hour - 5) * 80}px` }} />
              {hour < hours[hours.length - 1] && (
                <div className="absolute w-full h-[1px] border-b border-dashed border-slate-100 dark:border-white/5" style={{ top: `${(hour - 5) * 80 + 40}px` }} />
              )}
            </div>
          ))}
          
          {visibleDays.map((d, colIndex) => (
             <div 
               key={`col-${d.getTime()}`} 
               className="absolute h-full border-r border-slate-200 dark:border-white/5 cursor-crosshair hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors" 
               style={{ left: `${colIndex * (100 / visibleDays.length)}%`, width: `${100 / visibleDays.length}%` }}
               onPointerDown={(e) => {
                 if (e.button !== 0) return; // Only left click
                 if (e.pointerType === 'touch') return; // Let browser handle touch scrolling, click event will catch tap
                 
                 e.preventDefault();
                 const target = e.currentTarget;
                 target.setPointerCapture(e.pointerId);
                 document.body.classList.add('is-dragging');
                 
                 const rect = target.getBoundingClientRect();
                 const y = e.clientY - rect.top;
                 
                 // Snap start to nearest minute
                 const rawStartHour = 5 + (y / 80);
                 const startHour = Math.floor(rawStartHour * 12) / 12;
                 
                 setDragSelection({ day: d, startHour, endHour: startHour + 0.5, isDragging: true });
                 
                 const container = document.getElementById('calendar-scroll-container');
                 const startScrollY = container ? container.scrollTop : 0;
                 let scrollInterval: any = null;
                 
                 const updateGridDrag = (currentClientY: number) => {
                   const currentScrollY = container ? container.scrollTop : 0;
                   const scrollDiff = currentScrollY - startScrollY;
                   const moveY = (currentClientY - rect.top) + scrollDiff;
                   
                   let rawEndHour = 5 + (moveY / 80);
                   let currentEndHour = Math.round(rawEndHour * 12) / 12;
                   if (currentEndHour <= startHour + 0.25) currentEndHour = startHour + 0.25; // min 15 mins
                   if (currentEndHour > 24) currentEndHour = 24;
                   setDragSelection({ day: d, startHour, endHour: currentEndHour, isDragging: true });
                 };
                 
                 const handlePointerMove = (moveEvent: React.PointerEvent | PointerEvent) => {
                   updateGridDrag(moveEvent.clientY);
                   
                   if (container) {
                       const contRect = container.getBoundingClientRect();
                       const y = moveEvent.clientY;
                       if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; }
                       if (y < contRect.top + 50) {
                           scrollInterval = setInterval(() => { container.scrollTop -= 15; updateGridDrag(moveEvent.clientY); }, 16);
                       } else if (y > contRect.bottom - 50) {
                           scrollInterval = setInterval(() => { container.scrollTop += 15; updateGridDrag(moveEvent.clientY); }, 16);
                       }
                   }
                 };
                 
                 const handlePointerUp = () => {
                   if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; }
                   target.releasePointerCapture(e.pointerId);
                   target.removeEventListener('pointermove', handlePointerMove as EventListener);
                   target.removeEventListener('pointerup', handlePointerUp as EventListener);
                   setDragSelection(prev => prev ? { ...prev, isDragging: false } : null);
                   setShowTaskModal(true);
                   document.body.classList.remove('is-dragging');
                 };
                 
                 target.addEventListener('pointermove', handlePointerMove as EventListener);
                 target.addEventListener('pointerup', handlePointerUp as EventListener);
               }}
               onClick={() => {
                   if (!dragSelection || !dragSelection.isDragging) {
                       // simple click
                   }
               }}
             />
          ))}
          
          {/* Drag Selection Visual */}
          {dragSelection && (
            <div 
              className="absolute bg-indigo-500/20 border-2 border-indigo-500 rounded-xl pointer-events-none z-40 shadow-sm"
              style={{
                left: `calc(${visibleDays.findIndex(d => isSameDay(d, dragSelection.day)) * (100 / visibleDays.length)}% + 4px)`,
                width: `calc(${100 / visibleDays.length}% - 8px)`,
                top: `${(dragSelection.startHour - 5) * 80}px`,
                height: `${(dragSelection.endHour - dragSelection.startHour) * 80}px`
              }}
            />
          )}

          {/* Events */}
          {scheduledEvents.filter(ev => visibleDays.some(vd => isSameDay(vd, ev.start))).map((ev) => {
            const dayIndex = visibleDays.findIndex(vd => isSameDay(vd, ev.start));
            if (dayIndex === -1) return null;
            
            const startHour = ev.start.getHours() + ev.start.getMinutes() / 60;
            const duration = (ev.end.getTime() - ev.start.getTime()) / 3600000;
            const colorClass = COLORS[ev.subject] || COLORS['Default'];
            
            return (
              <div
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
                    if ((ev as any).calendarEventId) {
                      deleteCalendarEvent((ev as any).calendarEventId).catch(console.error);
                    }
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
            )
          })}
        </div>
      </div>
    </div>
  );
"""

import re
with open('src/components/StudyCalendar.tsx', 'r') as f:
    content = f.read()
    
# replace everything from `const renderTimeline = () => (` to `  const renderMonthGrid = () => {`
start_marker = "  const renderTimeline = () => ("
end_marker = "  const renderMonthGrid = () => {"

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    new_content = content[:start_idx] + code + "\n" + content[end_idx:]
    with open('src/components/StudyCalendar.tsx', 'w') as f:
        f.write(new_content)
else:
    print("Could not find markers")

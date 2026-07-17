import re

with open('src/components/StudyCalendar.tsx', 'r') as f:
    content = f.read()

bad_motion = """              <motion.div
                key={ev.id}
                whileHover={{ scale: 0.98, zIndex: 50 }}
                drag={resizingEventId === ev.id ? false : "y"}
                dragListener={resizingEventId !== ev.id}
                dragConstraints={{ top: -((startHour - 5) * 80), bottom: (hours.length * 80) - ((startHour - 5) * 80) - (duration * 80) }}
                dragElastic={0}
                dragMomentum={false}
                onDragStart={() => {
                   setIsDraggingEvent(true);
                   document.body.style.userSelect = 'none';
                   document.body.style.webkitUserSelect = 'none';
                   const container = document.getElementById('calendar-scroll-container');
                   if (container) {
                       dragInitialScroll.current = container.scrollTop;
                   }
                }}
                onDrag={(e, info) => {
                  // No auto scroll
                }}
                onDragEnd={(e, info) => {
                   document.body.style.userSelect = '';
                   document.body.style.webkitUserSelect = '';
                   if (autoScrollRef.current) clearInterval(autoScrollRef.current);
                   setTimeout(() => setIsDraggingEvent(false), 50);
                   
                   const container = document.getElementById('calendar-scroll-container');
                   let scrollDelta = 0;
                   if (container) {
                       scrollDelta = container.scrollTop - dragInitialScroll.current;
                   }
                   
                   const totalPixelsMoved = info.offset.y + scrollDelta;
                   const offsetMins = Math.round(totalPixelsMoved / (80 / 60));
                   if (offsetMins === 0) return;
                   
                   const newStart = new Date(ev.start.getTime() + offsetMins * 60000);
                   
                   const diffMins = (newStart.getTime() - ev.start.getTime()) / 60000;
                   if (diffMins === 0) return;
                   
                   const newEnd = new Date(ev.end.getTime() + diffMins * 60000);
                   
                   const updatedTodos = todos.map(t => 
                      t.id === ev.id ? { ...t, startTime: newStart.toISOString(), endTime: newEnd.toISOString() } : t
                   );
                   setTodos(updatedTodos);
                   setUnsyncedChanges(true);
                   showToast(`Rescheduled to ${format(newStart, 'h:mm a')}`, "success");
                }}
                onClick={(e) => {
                  // No-op. Editing disabled to prioritize drag/resize.
                }}
                className={`event-card absolute rounded-xl border-l-4 shadow-sm p-3 overflow-hidden cursor-grab active:cursor-grabbing backdrop-blur-md transition-all ${colorClass} ${ev.completed ? 'opacity-50' : ''} ${resizingEventId === ev.id ? 'ring-2 ring-indigo-500 z-50 shadow-lg' : ''}`}"""

good_motion = """              <div
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
                className={`event-card absolute rounded-xl border-l-4 shadow-sm p-3 overflow-hidden backdrop-blur-md transition-all ${colorClass} ${ev.completed ? 'opacity-50' : ''} ${resizingEventId === ev.id ? 'ring-2 ring-indigo-500 z-50 shadow-lg' : ''} ${dragEventId === ev.id ? 'opacity-70 scale-[0.98] z-50 ring-2 ring-indigo-500 shadow-xl cursor-grabbing' : 'cursor-grab hover:scale-[0.98]'}`}"""

content = content.replace(bad_motion, good_motion)

content = content.replace("</motion.div>", "</div>")

with open('src/components/StudyCalendar.tsx', 'w') as f:
    f.write(content)

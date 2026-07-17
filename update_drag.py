import sys

with open('src/components/StudyCalendar.tsx', 'r') as f:
    content = f.read()

bad = """                onDragStart={() => setIsDraggingEvent(true)}
                onDragEnd={(e, info) => {
                   setTimeout(() => setIsDraggingEvent(false), 50);
                   const offsetMins = Math.round(info.offset.y / (80 / 60));
                   if (offsetMins === 0) return;
                   
                   const rawNewStart = new Date(ev.start.getTime() + offsetMins * 60000);
                   const roundedMins = Math.round(rawNewStart.getMinutes() / 15) * 15;
                   const newStart = new Date(rawNewStart);
                   newStart.setMinutes(roundedMins, 0, 0);
                   
                   const diffMins = (newStart.getTime() - ev.start.getTime()) / 60000;
                   if (diffMins === 0) return;
                   
                   const newEnd = new Date(ev.end.getTime() + diffMins * 60000);
                   
                   const updatedTodos = todos.map(t => 
                      t.id === ev.id ? { ...t, startTime: newStart.toISOString(), endTime: newEnd.toISOString() } : t
                   );
                   setTodos(updatedTodos);
                   if (ev.calendarEventId) {
                     updateCalendarEventTime(ev.calendarEventId, newStart, newEnd);
                   }
                   showToast(`Rescheduled to ${format(newStart, 'h:mm a')}`, "success");
                }}"""

good = """                onDragStart={() => {
                   setIsDraggingEvent(true);
                   const container = document.getElementById('calendar-scroll-container');
                   if (container) {
                       dragInitialScroll.current = container.scrollTop;
                   }
                }}
                onDrag={(e, info) => {
                   const container = document.getElementById('calendar-scroll-container');
                   if (!container) return;
                   
                   const rect = container.getBoundingClientRect();
                   const edgeThreshold = 60;
                   const speed = 10;
                   
                   if (autoScrollRef.current) clearInterval(autoScrollRef.current);
                   
                   if (info.point.y < rect.top + edgeThreshold) {
                      autoScrollRef.current = setInterval(() => {
                         container.scrollTop -= speed;
                      }, 16);
                   } else if (info.point.y > rect.bottom - edgeThreshold) {
                      autoScrollRef.current = setInterval(() => {
                         container.scrollTop += speed;
                      }, 16);
                   }
                }}
                onDragEnd={(e, info) => {
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
                   if (ev.calendarEventId) {
                     updateCalendarEventTime(ev.calendarEventId, newStart, newEnd);
                   }
                   showToast(`Rescheduled to ${format(newStart, 'h:mm a')}`, "success");
                }}"""

if bad in content:
    content = content.replace(bad, good)
    with open('src/components/StudyCalendar.tsx', 'w') as f:
        f.write(content)
    print("Replaced drag logic successfully.")
else:
    print("Could not find drag logic block.")

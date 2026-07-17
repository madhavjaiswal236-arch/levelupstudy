with open('src/components/StudyCalendar.tsx', 'r') as f:
    content = f.read()

# 1. Update Supreme Line
old_supreme = '''{/* Supreme Line (Current Time) */}
          <div 
            className="absolute w-full h-[2px] bg-red-500 z-[45] pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]" 
            style={{ top: `${(currentLocalTime.getHours() + currentLocalTime.getMinutes() / 60) * 80}px` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -left-1 -top-[4px] shadow-[0_0_8px_rgba(239,68,68,1)]" />
          </div>'''
new_supreme = '''{/* Supreme Line (Current Time) */}
          <div 
            className="absolute w-full h-[2px] bg-indigo-600 z-[45] pointer-events-none shadow-[0_0_12px_rgba(79,70,229,0.8)]" 
            style={{ top: `${(currentLocalTime.getHours() + currentLocalTime.getMinutes() / 60) * 80}px` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 absolute -left-[5px] -top-[4px] shadow-[0_0_10px_rgba(79,70,229,1)]" />
          </div>'''

content = content.replace(old_supreme, new_supreme)

# 2. Add Supreme Time Capsule in Time Column and fix sticky TIME
old_time_header = '''<div className="h-12 border-b border-slate-200 dark:border-white/5 text-[10px] text-slate-400 flex justify-center items-end pb-2">'''
new_time_header = '''<div className="h-12 border-b border-slate-200 dark:border-white/5 text-[10px] text-slate-400 flex justify-center items-end pb-2 sticky top-0 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md z-[60]">'''
content = content.replace(old_time_header, new_time_header)

old_time_end = '''        ))}
      </div>
      
      {/* Days Grid */}'''
new_time_end = '''        ))}
        {/* Supreme Time Capsule */}
        <div 
          className="absolute left-0 w-full flex justify-center items-center z-[50] pointer-events-none"
          style={{ top: `${48 + (currentLocalTime.getHours() + currentLocalTime.getMinutes() / 60) * 80}px`, transform: 'translateY(-50%)' }}
        >
          <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.8)] border border-indigo-400/30">
            {format(currentLocalTime, 'h:mm a')}
          </div>
        </div>
      </div>
      
      {/* Days Grid */}'''
content = content.replace(old_time_end, new_time_end)

# 3. Update Day Headers
old_day_headers = '''        {/* Day Headers */}
        <div className="flex h-12 border-b border-slate-200 dark:border-white/5 sticky top-0 z-30 bg-white dark:bg-[#121212]">
          {visibleDays.map(d => (
            <div key={d.getTime()} className="flex-1 flex flex-col items-center justify-center border-r border-slate-200 dark:border-white/5 relative">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{format(d, 'EEE')}</span>
              <span className={`text-sm font-bold ${isSameDay(d, new Date()) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {format(d, 'd')}
              </span>
            </div>
          ))}
        </div>'''
new_day_headers = '''        {/* Day Headers */}
        <div className="flex h-12 border-b border-slate-200 dark:border-white/5 sticky top-0 z-[60] bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md shadow-sm">
          {visibleDays.map(d => (
            <div key={d.getTime()} className="flex-1 flex items-center justify-center border-r border-slate-200 dark:border-white/5 relative gap-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isSameDay(d, currentDate) ? 'text-indigo-400' : isSameDay(d, new Date()) ? 'text-indigo-500' : 'text-slate-400'}`}>{format(d, 'EEE')}</span>
              <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all ${isSameDay(d, currentDate) ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(79,70,229,0.8)]' : isSameDay(d, new Date()) ? 'text-indigo-500' : 'text-slate-700 dark:text-slate-200'}`}>
                {format(d, 'd')}
              </span>
            </div>
          ))}
        </div>'''
content = content.replace(old_day_headers, new_day_headers)

with open('src/components/StudyCalendar.tsx', 'w') as f:
    f.write(content)

print("Safe patch done")

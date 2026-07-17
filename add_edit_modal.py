import sys

with open('src/components/StudyCalendar.tsx', 'r') as f:
    content = f.read()

# 1. Add state for editing event
state_add = """  const [taskName, setTaskName] = useState("");
  const [editingEvent, setEditingEvent] = useState<Todo | null>(null);
"""
content = content.replace('  const [taskName, setTaskName] = useState("");', state_add)

# 2. Add onClick to motion.div of events
div_code = """                className={`absolute rounded-xl border-l-4 shadow-sm p-3 overflow-hidden cursor-grab active:cursor-grabbing backdrop-blur-md transition-colors ${colorClass} ${ev.completed ? 'opacity-50' : ''}`}"""
new_div_code = """                onClick={() => {
                  setEditingEvent(ev);
                  setTaskName(ev.text);
                  setTaskSubject(ev.subject || "General");
                  setTaskPriority(ev.priority || "Medium");
                  setTaskChapter(ev.chapter || "");
                  setTaskType(ev.type || "Custom");
                }}
""" + div_code
content = content.replace(div_code, new_div_code)

# 3. Add the edit modal UI
modal_code = """{/* Create Task Modal */}"""
edit_modal = """{/* Edit Task Modal */}
        <AnimatePresence>
          {editingEvent && (
            <div className="absolute inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-[#1A1A1A] w-full max-w-lg rounded-2xl md:rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative flex flex-col max-h-[90vh]"
              >
                <button onClick={() => setEditingEvent(null)} className="absolute right-4 top-4 p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors z-10">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
                
                <div className="mb-6 flex-shrink-0">
                  <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                    Edit Session
                  </h3>
                </div>
                
                <div className="space-y-5 overflow-y-auto pr-2 scrollbar-hide flex-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
                    <div className="flex gap-2">
                      {(["Low", "Medium", "High"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setTaskPriority(p)}
                          className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all border ${
                            taskPriority === p 
                              ? p === "High" ? "bg-rose-500/10 text-rose-600 border-rose-500/50" 
                                : p === "Medium" ? "bg-amber-500/10 text-amber-600 border-amber-500/50" 
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/50"
                              : "bg-transparent text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
                    <div className="flex flex-wrap gap-2">
                      {['Physics', 'Chemistry', 'Mathematics', 'General', 'Personal'].map(s => (
                        <button 
                          key={s}
                          onClick={() => {
                            setTaskSubject(s);
                            setTaskChapter("");
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${taskSubject === s ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {currentSubjectChapters.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chapter (Optional)</label>
                        <select 
                          value={taskChapter}
                          onChange={(e) => setTaskChapter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                        >
                          <option value="">Select a chapter...</option>
                          {currentSubjectChapters.map(ch => (
                            <option key={ch.id} value={ch.name}>{ch.name}</option>
                          ))}
                        </select>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Lecture', 'Notes', 'Practice', 'DPP', 'Revision', 'PYQs', 'Custom'].map(t => (
                        <button 
                          key={t}
                          onClick={() => setTaskType(t)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${taskType === t ? 'bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/50' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Name</label>
                    <input 
                      type="text"
                      autoFocus
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      placeholder="Enter task name..."
                      className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    />
                  </motion.div>
                  
                </div>

                <div className="pt-4 flex gap-3 flex-shrink-0 border-t border-slate-100 dark:border-white/5 mt-2">
                  <button 
                    onClick={() => {
                       const updatedTodos = todos.filter(t => t.id !== editingEvent.id);
                       setTodos(updatedTodos);
                       setEditingEvent(null);
                       showToast("Event deleted", "success");
                    }}
                    className="py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl text-sm font-bold transition-colors"
                  >
                    Delete
                  </button>
                  <button 
                    onClick={() => setEditingEvent(null)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-sm font-bold transition-colors text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (!taskName.trim()) {
                        showToast("Please enter a task name", "error");
                        return;
                      }
                      
                      const updatedTodos = todos.map(t => {
                        if (t.id === editingEvent.id) {
                          return {
                            ...t,
                            text: taskName.trim(),
                            type: taskType,
                            priority: taskPriority,
                            subject: taskSubject === 'General' ? undefined : taskSubject,
                            chapter: taskChapter || undefined
                          };
                        }
                        return t;
                      });
                      setTodos(updatedTodos);
                      setEditingEvent(null);
                      showToast("Event updated", "success");
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Create Task Modal */}"""
content = content.replace(modal_code, edit_modal)

with open('src/components/StudyCalendar.tsx', 'w') as f:
    f.write(content)

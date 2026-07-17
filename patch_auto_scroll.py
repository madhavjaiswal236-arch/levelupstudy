with open('src/components/StudyCalendar.tsx', 'r') as f:
    lines = f.readlines()

scroll_effect = """
  useEffect(() => {
    const scrollToTime = () => {
      const container = document.getElementById('calendar-scroll-container');
      if (container && view !== 'Month') {
        const nowLocal = new Date();
        const currentHour = nowLocal.getHours() + nowLocal.getMinutes() / 60;
        const targetScroll = Math.max(0, (currentHour - 5) * 80 - 200);
        container.scrollTo({ top: targetScroll, behavior: 'auto' });
      }
    };
    
    scrollToTime();
    const t1 = setTimeout(scrollToTime, 50);
    const t2 = setTimeout(scrollToTime, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [view, currentDate]);
"""

lines.insert(205, scroll_effect)

with open('src/components/StudyCalendar.tsx', 'w') as f:
    f.writelines(lines)

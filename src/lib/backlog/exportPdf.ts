import jsPDF from "jspdf";
import { BacklogPlan, RoadmapTask } from "@/lib/backlog/types";
import { Todo } from "@/context/AppContext";

export function exportRoadmapToPdf(
  plan: BacklogPlan,
  playerName: string = "Student",
  todos: Todo[] = []
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 12;
  const marginRight = 12;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = 14;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      y = 15;
      renderMiniPageHeader();
    }
  };

  const renderMiniPageHeader = () => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("TRACKER 360 — DAY-BY-DAY ROADMAP CHECKLIST", marginLeft, 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Student: ${playerName}`, pageWidth - marginRight, 5.5, { align: "right" });

    y = 14;
  };

  // --- HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, "F");

  // Accent Line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 31, pageWidth, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("TRACKER 360", marginLeft, 13);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11);
  doc.text("FULL DAY-WISE STUDY ROADMAP & CHECKLIST", marginLeft, 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Student Name: ${playerName}   |   Generated: ${new Date().toLocaleDateString()}`, marginLeft, 25);

  doc.text(
    `Target Exam Date: ${plan.settings.deadlineDate || "N/A"}`,
    pageWidth - marginRight,
    13,
    { align: "right" }
  );
  doc.text(
    `Total Workload: ${plan.metrics.totalWorkloadHours} Hrs (${plan.metrics.totalLectures} Lectures)`,
    pageWidth - marginRight,
    19,
    { align: "right" }
  );
  doc.text(
    `Daily Pace: ~${+(plan.settings.targetDailyMinutes / 60).toFixed(1)}h / day   |   Health: ${plan.metrics.feasibilityStatus}`,
    pageWidth - marginRight,
    25,
    { align: "right" }
  );

  y = 38;

  // --- ENROLLED CURRICULUM SUMMARY SECTION ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("ENROLLED CURRICULUM OVERVIEW", marginLeft + 4, y + 6);

  let subX = marginLeft + 4;
  let subY = y + 13;

  plan.subjects.forEach((sub) => {
    const totalLecs = sub.chapters.reduce(
      (acc, c) => acc + (c.selectedLectures?.length ?? c.lecturesRemaining),
      0
    );
    const totalHours = +(
      sub.chapters.reduce(
        (acc, c) =>
          acc +
          (c.selectedLectures?.length ?? c.lecturesRemaining) * (c.lectureDurationMinutes || 120),
        0
      ) / 60
    ).toFixed(1);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    if (sub.name === "Physics") doc.setTextColor(6, 182, 212); // cyan
    else if (sub.name === "Chemistry") doc.setTextColor(168, 85, 247); // purple
    else doc.setTextColor(245, 158, 11); // amber

    doc.text(`${sub.name.toUpperCase()}:`, subX, subY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`${sub.chapters.length} Chaps | ${totalLecs} Lecs | ${totalHours}h`, subX + 22, subY);

    subX += 60;
  });

  y += 29;

  // --- SECTION HEADER FOR DAY-WISE ROADMAP ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("DAY-BY-DAY COMPLETE SCHEDULE & CHECKLIST", marginLeft, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Check off boxes [  ] as you complete each task offline or in-app.",
    marginLeft + 95,
    y
  );

  y += 4;

  // Horizontal Divider Line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(marginLeft, y, pageWidth - marginRight, y);

  y += 5;

  const roadmapDays = plan.roadmap || [];

  if (roadmapDays.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("No scheduled days found in this roadmap.", marginLeft, y + 5);
    y += 10;
  }

  // --- ITERATE THROUGH EVERY SINGLE DAY ---
  roadmapDays.forEach((day) => {
    const taskCount = day.tasks.length;
    // Estimate needed box height for this day
    const headerHeight = 7;
    const taskRowHeight = 6.5;
    const padding = 4;
    const totalDayBoxHeight = headerHeight + taskCount * taskRowHeight + padding;

    checkPageBreak(totalDayBoxHeight);

    const isToday = day.date === new Date().toISOString().split("T")[0];

    // Day Container Box Background
    doc.setFillColor(isToday ? 254 : 255, isToday ? 243 : 255, isToday ? 199 : 255); // amber tint for today
    doc.setDrawColor(isToday ? 245 : 226, isToday ? 158 : 232, isToday ? 11 : 240);
    doc.setLineWidth(isToday ? 0.4 : 0.2);
    doc.roundedRect(marginLeft, y, contentWidth, totalDayBoxHeight, 2, 2, "FD");

    // Day Header Bar
    doc.setFillColor(isToday ? 245 : 241, isToday ? 158 : 245, isToday ? 11 : 249);
    doc.rect(marginLeft, y, contentWidth, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`DAY ${day.dayIndex}`, marginLeft + 3, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date: ${day.date}`, marginLeft + 24, y + 5);

    // Day Type Badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    if (day.dayType === "TEST") doc.setTextColor(225, 29, 72);
    else if (day.dayType === "REVISION") doc.setTextColor(147, 51, 234);
    else doc.setTextColor(13, 148, 136);

    doc.text(`[${day.dayType}]`, marginLeft + 58, y + 5);

    // Day Estimated Hours
    const estHoursStr = `${Math.floor(day.totalMinutes / 60)}h ${day.totalMinutes % 60}m`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Estimated: ${estHoursStr}`, pageWidth - marginRight - 3, y + 5, {
      align: "right",
    });

    let taskY = y + 10;

    if (day.tasks.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Buffer / Rest Day — No scheduled lectures", marginLeft + 6, taskY + 2);
    } else {
      // --- ITERATE THROUGH ALL TASKS OF THE DAY ---
      day.tasks.forEach((t) => {
        // Find matching todo state
        const matchingTodo = todos.find(
          (todo) =>
            todo.isBacklogTask &&
            (todo.id === t.id ||
              (todo.backlogChapterId === t.chapterId &&
                todo.backlogTaskType === t.type &&
                (t.lectureNumber ? todo.lectureNumber === t.lectureNumber : true)))
        );
        const isCompleted = Boolean(matchingTodo?.completed);

        // Printable Checkbox Box
        const cbX = marginLeft + 3;
        const cbY = taskY - 1;
        const cbSize = 3.5;

        doc.setDrawColor(isCompleted ? 16 : 100, isCompleted ? 185 : 116, isCompleted ? 129 : 139);
        doc.setLineWidth(0.3);
        doc.rect(cbX, cbY, cbSize, cbSize);

        if (isCompleted) {
          doc.setFillColor(16, 185, 129); // emerald
          doc.rect(cbX + 0.5, cbY + 0.5, cbSize - 1, cbSize - 1, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6);
          doc.setTextColor(255, 255, 255);
          doc.text("v", cbX + 1, cbY + 2.7);
        }

        // Subject Badge
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        if (t.subject === "Physics") doc.setTextColor(6, 182, 212);
        else if (t.subject === "Chemistry") doc.setTextColor(168, 85, 247);
        else doc.setTextColor(217, 119, 6);

        doc.text(t.subject.toUpperCase(), cbX + 6, taskY + 2);

        // Task Title & Duration
        doc.setFont("helvetica", isCompleted ? "normal" : "bold");
        doc.setFontSize(8);
        doc.setTextColor(isCompleted ? 148 : 30, isCompleted ? 163 : 41, isCompleted ? 184 : 59);

        const cleanTitle = t.title.length > 65 ? t.title.substring(0, 62) + "..." : t.title;
        doc.text(cleanTitle, cbX + 28, taskY + 2);

        // Task Type & Duration
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`(${t.durationMinutes} min)`, pageWidth - marginRight - 16, taskY + 2, {
          align: "right",
        });

        // Status Tag
        if (isCompleted) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(16, 185, 129);
          doc.text("DONE", pageWidth - marginRight - 3, taskY + 2, { align: "right" });
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text("[  ]", pageWidth - marginRight - 3, taskY + 2, { align: "right" });
        }

        taskY += taskRowHeight;
      });
    }

    y += totalDayBoxHeight + 3.5;
  });

  // --- FOOTER FOR ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, pageHeight - 9, pageWidth - marginRight, pageHeight - 9);

    doc.text(
      "Tracker 360 Academic Study Roadmap — Interleaved Subject Rotation Plan",
      marginLeft,
      pageHeight - 5
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginRight, pageHeight - 5, {
      align: "right",
    });
  }

  // Trigger Download
  const filename = `Tracker360_Roadmap_${playerName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

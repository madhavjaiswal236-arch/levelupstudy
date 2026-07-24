import os

filepath = "src/pages/Dashboard.tsx"
with open(filepath, "r") as f:
    content = f.read()

# Locate start
start_marker = "  {createPortal(\n    <AnimatePresence>\n      {!isClass11SetupDone && ("
start_idx = content.find(start_marker)

if start_idx == -1:
    # Try with single spaces or different indent
    start_marker_alt = "  {createPortal(\n  <AnimatePresence>\n  {!isClass11SetupDone && ("
    start_idx = content.find(start_marker_alt)

print(f"Start Index: {start_idx}")

# Locate end
end_marker = "      )}\n    </AnimatePresence>,\n    document.body,\n  )}"
end_idx = content.find(end_marker, start_idx)

if end_idx == -1:
    end_marker_alt = "  )}\n  </AnimatePresence>,\n  document.body,\n  )}"
    end_idx = content.find(end_marker_alt, start_idx)

print(f"End Index: {end_idx}")

if start_idx != -1 and end_idx != -1:
    actual_end_idx = end_idx + len(end_marker if "    " in end_marker else end_marker_alt)
    print(f"Found block of length {actual_end_idx - start_idx}")
else:
    print("Failed to locate indices!")

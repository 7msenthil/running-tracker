import re

with open("/Users/senthilkumam/Library/CloudStorage/OneDrive-JuniperNetworks,Inc/Documents/Code Home/Antigravity/Run_Log_Tracker_Month3.html", "r") as f:
    content = f.read()

# Fix Month 2 Summary metrics
content = content.replace("10:57 /km", "10:03 /km")
content = content.replace("114 bpm", "137 bpm")
content = content.replace("127 bpm", "151 bpm")
content = content.replace("184 spm", "147 spm")
content = content.replace("24 min", "60 min")

# Clarify Tempo Run in Weekly Plan
content = content.replace("<th>TEMPO RUN</th>", "<th>TEMPO SESSION</th>")
content = content.replace("2.0 km blk", "2.0 km block<br><span style=\"font-size:0.55rem; color:var(--text-light);\">(6.5km total)</span>")
content = content.replace("2.5 km blk", "2.5 km block<br><span style=\"font-size:0.55rem; color:var(--text-light);\">(6.5km total)</span>")
content = content.replace("3.0 km blk", "3.0 km block<br><span style=\"font-size:0.55rem; color:var(--text-light);\">(7.0km total)</span>")

# Add HR Targets to left side of Monthly notes
hr_targets_html = """
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="notes-box">
                    <div class="section-title" style="margin-top: 0;">Target HR</div>
                    <div style="font-size: 0.65rem; margin-bottom: 2px;"><b>Tempo:</b> 148–155 bpm</div>
                    <div style="font-size: 0.65rem; margin-bottom: 2px;"><b>Easy:</b> 135–145 bpm</div>
                    <div style="font-size: 0.6rem; color: var(--text-light);">Walk 30s if Long Run hits 150</div>
                </div>
                <div class="notes-box">
                    <div class="section-title" style="margin-top: 0;">Month Notes</div>
                    <div class="note-line"></div>
                    <div class="note-line"></div>
                </div>
            </div>
"""

old_notes = """            <div class="notes-box">
                <div class="section-title" style="margin-top: 0;">Month Notes</div>
                <div class="note-line"></div>
                <div class="note-line"></div>
            </div>"""

content = content.replace(old_notes, hr_targets_html)

with open("/Users/senthilkumam/Library/CloudStorage/OneDrive-JuniperNetworks,Inc/Documents/Code Home/Antigravity/Run_Log_Tracker_Month3.html", "w") as f:
    f.write(content)

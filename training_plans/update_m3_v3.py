import re

with open("/Users/senthilkumam/Library/CloudStorage/OneDrive-JuniperNetworks,Inc/Documents/Code Home/Antigravity/Run_Log_Tracker_Month3.html", "r") as f:
    content = f.read()

# Rename EASY 1 to EASY
content = content.replace('"session-name">EASY 1<', '"session-name">EASY<')

# Rename TEMPO to Tempo in Run Log Tracker
content = content.replace('"session-name">TEMPO<', '"session-name">Tempo<')

# Update Tempo Session calculations in Weekly Plan
# Replace the blocks containing the <br><span...>(6.5km total)</span>
content = re.sub(
    r'2\.0 km block<br>.*?\(\d\.\dkm total\)<\/span>', 
    r'1.5km + <strong>2.0km</strong> + 1.5km', 
    content, 
    flags=re.DOTALL
)
content = re.sub(
    r'2\.5 km block<br>.*?\(\d\.\dkm total\)<\/span>', 
    r'1.5km + <strong>2.5km</strong> + 1.5km', 
    content, 
    flags=re.DOTALL
)
content = re.sub(
    r'3\.0 km block<br>.*?\(\d\.\dkm total\)<\/span>', 
    r'2.0km + <strong>3.0km</strong> + 1.5km', 
    content, 
    flags=re.DOTALL
)

# Move Target HR below Strength
# The target HR block is currently inside a grid on the right side.
# Let's extract Target HR block and Month Notes block.

hr_block = """
                <div class="notes-box">
                    <div class="section-title" style="margin-top: 0;">Target HR</div>
                    <div style="font-size: 0.65rem; margin-bottom: 2px;"><b>Tempo:</b> 148–155 bpm</div>
                    <div style="font-size: 0.65rem; margin-bottom: 2px;"><b>Easy:</b> 135–145 bpm</div>
                    <div style="font-size: 0.6rem; color: var(--text-light);">Walk 30s if Long Run hits 150</div>
                </div>"""

month_notes_block = """
                <div class="notes-box">
                    <div class="section-title" style="margin-top: 0;">Month Notes</div>
                    <div class="note-line"></div>
                    <div class="note-line"></div>
                </div>"""

right_grid_old = """            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
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
            </div>"""

month_notes_new = """            <div class="notes-box">
                <div class="section-title" style="margin-top: 0;">Month Notes</div>
                <div class="note-line"></div>
                <div class="note-line"></div>
            </div>"""

content = content.replace(right_grid_old, month_notes_new)

# Now insert HR block below Strength
strength_end = """                <div class="label">Mobility</div>
                <div>Hip Flexor Stretch • Clamshells • Ankle Circles • Seated Calf Stretch</div>
            </div>"""

strength_end_new = """                <div class="label">Mobility</div>
                <div>Hip Flexor Stretch • Clamshells • Ankle Circles • Seated Calf Stretch</div>
            </div>
            
            <div class="notes-box" style="margin-top: 8px;">
                <div class="section-title" style="margin-top: 0;">Target HR</div>
                <div style="font-size: 0.65rem; margin-bottom: 2px;"><b>Tempo:</b> 148–155 bpm</div>
                <div style="font-size: 0.65rem; margin-bottom: 2px;"><b>Easy:</b> 135–145 bpm</div>
                <div style="font-size: 0.6rem; color: var(--text-light);">Walk 30s if Long Run hits 150</div>
            </div>"""

content = content.replace(strength_end, strength_end_new)

with open("/Users/senthilkumam/Library/CloudStorage/OneDrive-JuniperNetworks,Inc/Documents/Code Home/Antigravity/Run_Log_Tracker_Month3.html", "w") as f:
    f.write(content)

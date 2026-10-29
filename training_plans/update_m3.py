import re

with open("/Users/senthilkumam/Library/CloudStorage/OneDrive-JuniperNetworks,Inc/Documents/Code Home/Antigravity/Run_Log_Tracker_Month3.html", "r") as f:
    content = f.read()

# Headers
content = content.replace("Month 2 of 6", "Month 3 of 6")
content = content.replace("<h1>Building Your Aerobic<br>Engine</h1>", "<h1>Tempo Starts.<br>Endurance Grows.</h1>")
content = content.replace("Apr 27 – May 24, 2026", "May 25 – Jun 21, 2026")
content = content.replace("<title>Half Marathon Training - Month 2</title>", "<title>Half Marathon Training - Month 3</title>")
content = content.replace("9 km", "13 km", 1)
content = content.replace("Week 7 • New record", "Week 11 • New record")

# Add Month 2 Summary below Month 1 Summary
m2_summary = """
    <div class="section-title">Month 2 Summary</div>
    <div class="hr-targets">
        <div class="hr-card">
            <h3>Longest Run</h3>
            <div class="value">9.89 km</div>
            <p>Peak distance</p>
        </div>
        <div class="hr-card">
            <h3>Avg Pace</h3>
            <div class="value">10:57 /km</div>
            <p>Overall moving pace</p>
        </div>
        <div class="hr-card">
            <h3>Avg HR</h3>
            <div class="value">114 bpm</div>
            <p>Month 2 average</p>
        </div>
        <div class="hr-card light">
            <h3>Avg Max HR</h3>
            <div class="value">127 bpm</div>
            <p>Month 2 average</p>
        </div>
        <div class="hr-card light">
            <h3>Avg Cadence</h3>
            <div class="value">184 spm</div>
            <p>Steps per minute</p>
        </div>
        <div class="hr-card light">
            <h3>Avg Duration</h3>
            <div class="value">24 min</div>
            <p>Moving time</p>
        </div>
    </div>
"""

content = content.replace('<div class="section-title">Weekly Plan</div>', m2_summary + '\n    <div class="section-title">Weekly Plan</div>')

# Adjust spacing slightly more to fit the extra summary block
content = content.replace("height: 54px;", "height: 48px;")
content = content.replace("padding: 4px 4px;", "padding: 2px 4px;")

# Weekly Plan Table
weekly_plan_old = """        <thead>
            <tr>
                <th>WK</th>
                <th>DATES</th>
                <th>THEME</th>
                <th>EASY RUN × 2</th>
                <th>LONG RUN</th>
                <th>WEEKLY TOTAL</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>W5</strong></td>
                <td>Apr 27 – May 3</td>
                <td>Extending the Base</td>
                <td>4.5 km each</td>
                <td>6.0 km</td>
                <td>15.5 km</td>
            </tr>
            <tr>
                <td><strong>W6</strong></td>
                <td>May 4 – 10</td>
                <td>Building Confidence</td>
                <td>5.0 km each</td>
                <td>7.5 km</td>
                <td>17.5 km</td>
            </tr>
            <tr class="highlight">
                <td>W7</td>
                <td>May 11 – 17</td>
                <td>Peak Week</td>
                <td>5.5 km each</td>
                <td>9.0 km</td>
                <td>20.0 km</td>
            </tr>
            <tr>
                <td><strong>W8</strong></td>
                <td>May 18 – 24</td>
                <td>Recovery — Mandatory</td>
                <td>4.0 km each</td>
                <td>6.0 km</td>
                <td>14.0 km</td>
            </tr>
        </tbody>"""

weekly_plan_new = """        <thead>
            <tr>
                <th>WK</th>
                <th>DATES</th>
                <th>THEME</th>
                <th>EASY RUN</th>
                <th>TEMPO RUN</th>
                <th>LONG RUN</th>
                <th>TOTAL</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>W9</strong></td>
                <td>May 25 – 31</td>
                <td>Tempo Intro</td>
                <td>5.5 km</td>
                <td>2.0 km blk</td>
                <td>9.0 km</td>
                <td>~22 km</td>
            </tr>
            <tr>
                <td><strong>W10</strong></td>
                <td>Jun 1 – 7</td>
                <td>Building Rhythm</td>
                <td>5.5 km</td>
                <td>2.5 km blk</td>
                <td>11.0 km</td>
                <td>~25 km</td>
            </tr>
            <tr class="highlight">
                <td>W11</td>
                <td>Jun 8 – 14</td>
                <td>Peak Week</td>
                <td>5.5 km</td>
                <td>3.0 km blk</td>
                <td>13.0 km</td>
                <td>~27 km</td>
            </tr>
            <tr>
                <td><strong>W12</strong></td>
                <td>Jun 15 – 21</td>
                <td>Recovery</td>
                <td>4.0 km ×2</td>
                <td>No tempo</td>
                <td>8.0 km</td>
                <td>~18 km</td>
            </tr>
        </tbody>"""

content = content.replace(weekly_plan_old, weekly_plan_new)

# Run Log Tracker Weeks
content = content.replace(">W5<", ">W9<")
content = content.replace(">W6<", ">W10<")
content = content.replace(">W7<", ">W11<")
content = content.replace(">W8<", ">W12<")

# Add TEMPO formatting for W9, W10, W11
content = content.replace("W9</td>\n                <td class=\"session-name\">EASY 1</td>", "W9</td>\n                <td class=\"session-name\">EASY 1</td>")
content = content.replace("W9</td>\n                <td class=\"session-name\">EASY 1</td>", "W9</td>\n                <td class=\"session-name\">EASY 1</td>")

# Find block between W9 and W10 and replace EASY 2 with TEMPO
w9_end = content.find('>W10<')
w9_block = content[:w9_end].replace('EASY 2', 'TEMPO')
content = w9_block + content[w9_end:]

w10_end = content.find('>W11<')
w10_block = content[:w10_end].replace('EASY 2', 'TEMPO')
content = w10_block + content[w10_end:]

w11_end = content.find('>W12<')
w11_block = content[:w11_end].replace('EASY 2', 'TEMPO')
content = w11_block + content[w11_end:]

# W12 stays EASY 2 since it has no tempo

# Target Table
target_old = """                    <tr>
                        <td>M2</td>
                        <td>6km → 9km</td>
                        <td>20 km</td>
                    </tr>
                    <tr>
                        <td>M3</td>
                        <td>10km → 13km</td>
                        <td>25 km</td>
                    </tr>
                    <tr>
                        <td>M4</td>
                        <td>13km → 16km</td>
                        <td>30 km</td>
                    </tr>
                    <tr>
                        <td>M5</td>
                        <td>16km → 19km</td>
                        <td>35 km</td>
                    </tr>
                    <tr>
                        <td>M6</td>
                        <td>Taper & Race</td>
                        <td>-</td>
                    </tr>"""
                    
target_new = """                    <tr>
                        <td>M3</td>
                        <td>9km → 13km</td>
                        <td>27 km</td>
                    </tr>
                    <tr>
                        <td>M4</td>
                        <td>13km → 16km</td>
                        <td>30 km</td>
                    </tr>
                    <tr>
                        <td>M5</td>
                        <td>16km → 19km</td>
                        <td>35 km</td>
                    </tr>
                    <tr>
                        <td>M6</td>
                        <td>Taper & Race</td>
                        <td>10-20km</td>
                    </tr>"""
content = content.replace(target_old, target_new)

# Since we replaced height: 54px with 48px to save vertical space
# let's also tighten run-log td to 20px
content = content.replace('height: 22px;', 'height: 20px;')
# Tighten section-title margins slightly
content = content.replace('margin-top: 10px;', 'margin-top: 5px;')
content = content.replace('margin-bottom: 4px;', 'margin-bottom: 2px;')

with open("/Users/senthilkumam/Library/CloudStorage/OneDrive-JuniperNetworks,Inc/Documents/Code Home/Antigravity/Run_Log_Tracker_Month3.html", "w") as f:
    f.write(content)

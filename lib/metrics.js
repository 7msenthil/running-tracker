// Strava formulas and standard running metrics

// 1. Calculate rTSS (Running Training Stress Score)
// Normalized Graded Pace (NGP) is complex without elevation data, so we use a simplified HR-based TSS (hrTSS) 
// or simple pace-based TSS if HR is missing.
export function calculateTSS(movingTimeSeconds, averageHeartRate, thresholdHeartRate = 165) {
  if (!averageHeartRate) {
    // Fallback: roughly 60 TSS per hour for an easy run, up to 100 for all out.
    return (movingTimeSeconds / 3600) * 60; 
  }
  
  // hrTSS Formula: (Duration in seconds x HR x IF) / (Threshold HR x 3600) x 100
  // IF (Intensity Factor) = HR / Threshold HR
  const intensityFactor = averageHeartRate / thresholdHeartRate;
  const tss = (movingTimeSeconds * averageHeartRate * intensityFactor) / (thresholdHeartRate * 3600) * 100;
  return tss;
}

// 2. Aerobic Decoupling (Pa:Hr)
// Requires GPS streams (heartrate, velocity_smooth, time).
// Compares the Efficiency Factor (EF = Pace / HR) of the first half vs the second half.
export function calculateDecoupling(streams) {
  if (!streams || !streams.heartrate || !streams.velocity_smooth || !streams.time) return null;

  const hr = streams.heartrate.data;
  const velocity = streams.velocity_smooth.data; // m/s
  
  const halfIndex = Math.floor(hr.length / 2);
  if (halfIndex === 0) return null;

  // Function to calculate EF (Speed / HR)
  const calcEF = (start, end) => {
    let sumHR = 0;
    let sumVel = 0;
    let count = 0;
    for (let i = start; i < end; i++) {
      if (hr[i] > 0 && velocity[i] > 0) {
        sumHR += hr[i];
        sumVel += velocity[i];
        count++;
      }
    }
    if (count === 0) return 0;
    return (sumVel / count) / (sumHR / count);
  };

  const ef1 = calcEF(0, halfIndex);
  const ef2 = calcEF(halfIndex, hr.length);

  if (ef1 === 0 || ef2 === 0) return null;

  // Decoupling = ((EF1 - EF2) / EF1) * 100
  return ((ef1 - ef2) / ef1) * 100;
}

// 3. Performance Management Chart (CTL, ATL, TSB)
// Exponential Moving Average
// CTL = Fitness (42 days), ATL = Fatigue (7 days)
export function calculatePMC(activities) {
  // Sort activities chronologically oldest to newest
  const sorted = [...activities].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  
  let ctl = 0;
  let atl = 0;
  
  const ctlConstant = Math.exp(-1 / 42);
  const atlConstant = Math.exp(-1 / 7);

  let lastDate = sorted.length > 0 ? new Date(sorted[0].start_date).getTime() : 0;

  const pmcData = sorted.map(run => {
    const runDate = new Date(run.start_date).getTime();
    const daysPassed = (runDate - lastDate) / (1000 * 60 * 60 * 24);
    
    // Decay previous values based on days passed between runs
    if (daysPassed > 0) {
      ctl = ctl * Math.pow(ctlConstant, daysPassed);
      atl = atl * Math.pow(atlConstant, daysPassed);
    }

    const tss = run.rtss || 0;
    
    // Add today's load
    ctl = ctl + (tss * (1 - ctlConstant));
    atl = atl + (tss * (1 - atlConstant));
    
    lastDate = runDate;

    return {
      date: run.start_date,
      tss,
      ctl,
      atl,
      tsb: ctl - atl // Form
    };
  });

  return pmcData;
}

// 4. Trimmed Metrics (Remove first 6 mins and last 6 mins)
export function calculateTrimmedMetrics(streams) {
  if (!streams || !streams.time || !streams.heartrate || !streams.velocity_smooth) return null;

  const time = streams.time.data;
  const hr = streams.heartrate.data;
  const velocity = streams.velocity_smooth.data; // m/s
  
  const totalTime = time[time.length - 1];
  // If run is shorter than 15 mins, don't trim
  if (totalTime < 900) return null;

  const trimStartSecs = 360; // 6 mins
  const trimEndSecs = totalTime - 360; // 6 mins from end

  let trimmedDistance = 0;
  let trimmedMovingTime = 0;
  let sumHr = 0;
  let hrCount = 0;

  for (let i = 1; i < time.length; i++) {
    const t = time[i];
    if (t >= trimStartSecs && t <= trimEndSecs) {
      const dt = time[i] - time[i - 1];
      const v = velocity[i];
      if (v > 0) { // moving
        trimmedMovingTime += dt;
        trimmedDistance += v * dt;
      }
      if (hr[i] > 0) {
        sumHr += hr[i];
        hrCount++;
      }
    }
  }

  if (hrCount === 0 || trimmedMovingTime === 0) return null;

  return {
    trimmed_distance: trimmedDistance,
    trimmed_moving_time: trimmedMovingTime,
    trimmed_average_heartrate: sumHr / hrCount
  };
}

// 4. Calculate HR Zones
export function calculateHRZones(streams, maxHeartRate = 190) {
  if (!streams || !streams.heartrate) return null;
  
  const hrData = streams.heartrate.data;
  let zones = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
  let totalPoints = 0;

  // New customized zones:
  // Z1: < 135 bpm (Recovery & Warmup)
  // Z2: 135 - 147 bpm (Easy Target)
  // Z3: 148 - 155 bpm (Tempo Quality)
  // Z4: 156 - 168 bpm (Avoid completely)
  // Z5: > 168 bpm (Max)
  hrData.forEach(hr => {
    if (hr === 0) return;
    totalPoints++;
    if (hr < 135) zones.Z1++;
    else if (hr <= 147) zones.Z2++;
    else if (hr <= 155) zones.Z3++;
    else if (hr <= 168) zones.Z4++;
    else zones.Z5++;
  });

  if (totalPoints === 0) return null;

  return {
    Z1: (zones.Z1 / totalPoints) * 100,
    Z2: (zones.Z2 / totalPoints) * 100,
    Z3: (zones.Z3 / totalPoints) * 100,
    Z4: (zones.Z4 / totalPoints) * 100,
    Z5: (zones.Z5 / totalPoints) * 100
  };
}

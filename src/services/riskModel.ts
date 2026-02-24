/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RiskFactors {
  height: number;      // meters
  distance: number;    // meters
  ndvi: number;        // 0-1
  slope: number;       // degrees
  windSpeed: number;   // mph
}

export const calculateTipOverRisk = (factors: RiskFactors): number => {
  // Simplified model: risk increases with height, ndvi (denser foliage = more wind sail),
  // slope, and wind speed, and decreases with distance (though distance is for fall-in, 
  // we use it here to normalize the 'threat' to the line)
  
  const heightFactor = Math.min(factors.height / 40, 1);
  const ndviFactor = factors.ndvi;
  const windFactor = Math.min(factors.windSpeed / 60, 1);
  const slopeFactor = Math.min(factors.slope / 45, 1);

  const risk = (heightFactor * 0.4) + (ndviFactor * 0.2) + (windFactor * 0.3) + (slopeFactor * 0.1);
  return Math.min(Math.max(risk, 0), 1);
};

export const checkFallInRisk = (height: number, distance: number): boolean => {
  // A tree can hit the line if its height is greater than its distance to the line
  // We add a 1.5x safety factor for "bounce" or "shatter"
  return height * 1.1 > distance;
};

export const getFireRiskLevel = (ndvi: number, temperature: number): 'Low' | 'Moderate' | 'High' | 'Extreme' => {
  // Low NDVI + High Temp = High Fire Risk (dry fuel)
  // High NDVI + High Temp = Moderate (living fuel)
  if (temperature > 95 && ndvi < 0.3) return 'Extreme';
  if (temperature > 85 && ndvi < 0.5) return 'High';
  if (temperature > 75) return 'Moderate';
  return 'Low';
};

export type Observation = {
  latitude: number;
  angle: number;
};

// https://docs.google.com/spreadsheets/u/1/d/1OmVFSrZ61G57dFkt6UBSnJqvfVJ_vIdHEHPXKk7m1_8/edit?usp=sharing
const rawObservations = [
  [-45.2, 1001, -2575],
  [-41.8, 75, -170],
  [-37.8, 425, -773],
  [-35.2, 58.2, -97.6],
  [-30, 1.2, -1.6],
  [-27.4, 14.7, -18],
  [-27.2, 1300, -1520],
  [34, 23.4, 3.95],
  [34, 12, 1.81],
  [34.1, 118.55, 21.6],
  [37, 69, 16],
  [37.8, 48, 12],
  [42, 30, 11.5],
  [44.1, 62.5, 23],
  [44.2, 60, 22.6],
  [45.4, 110, 47],
  [45.6, 12, 4.73],
  [47, 51, 23.5],
  [50.9, 150, 82],
  [51.5, 31.8, 16.7],
  [52.2, 293, 162.4],
  [52.3, 210, 116.6],
  [52.5, 150.7, 84.5],
  [53.4, 152, 92],
  [53.6, 121.4, 69.5],
  [53.8, 42.5, 21.8],
  [59.2, 119.5, 86],
  [59.4, 150, 110],
  [61.5, 80, 61.8],
  [61.5, 1692, 1242],
  [66.9, 79.5, 75],
].map(([latitude, stickHeight, shadowLength]) => ({
  latitude,
  angle: Math.atan2(stickHeight, shadowLength),
}));

export const observations: Observation[] = rawObservations;

export default observations;

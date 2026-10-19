const LABELS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const GESTURES_DATA = LABELS.map((l) => ({
  letter: l,
  sibi: l,
  bisindo: l,
  description: `Gesture ${l}`,
  image: `js/Image/Asset sibi a-z/${l}.png`,
}));
export { LABELS, GESTURES_DATA };

// Contrôle HORS LIGNE uniquement : réexporte le Three.js r128 du prototype, chargé en script classique.
const T = globalThis.THREE;
if (!T) throw new Error('three.r128.min.js non chargé');
export const { WebGLRenderer, Scene, PerspectiveCamera, Group, BufferGeometry, Float32BufferAttribute,
  LineSegments, Line, LineBasicMaterial, Points, PointsMaterial } = T;

import * as THREE from 'three';
import { createSelectedHelper } from './helper-model.js';

export async function loadGuideAvatar(name, signal) {
  const helper = createSelectedHelper(() => ({ root: new THREE.Group() }));
  const dispose = () => helper.dispose();
  signal.addEventListener('abort', dispose, { once: true });
  try {
    await helper.select({ id: name, model: './helpers/' + name + '.glb' });
    if (signal.aborted || helper.status !== 'ready') return;
    helper.root.updateMatrixWorld(true);
    const vertices = [];
    const point = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const light = new THREE.Vector3(-.58, .65, -.45).normalize();
    const normalMatrix = new THREE.Matrix3();
    const white = new THREE.Color(1, 1, 1);
    const tint = new THREE.Color();
    const sample = new THREE.Color();
    helper.body.traverse(mesh => {
      if (!mesh.isMesh) return;
      const { index, attributes } = mesh.geometry;
      const material = mesh.material;
      const color = material.color || white;
      const texture = material.map;
      let pixels;
      if (texture?.image && attributes.uv) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(texture.image, 0, 0, 256, 256);
        pixels = ctx.getImageData(0, 0, 256, 256).data;
      }
      normalMatrix.getNormalMatrix(mesh.matrixWorld);
      const count = index?.count ?? attributes.position.count;
      for (let i = 0; i < count; i++) {
        const vertex = index ? index.getX(i) : i;
        mesh.getVertexPosition(vertex, point).applyMatrix4(mesh.matrixWorld);
        normal.fromBufferAttribute(attributes.normal, vertex).applyNormalMatrix(normalMatrix);
        const shade = .64 + .36 * Math.max(0, normal.dot(light));
        tint.copy(color);
        if (pixels) {
          const u = attributes.uv.getX(vertex);
          const v = attributes.uv.getY(vertex);
          const at = (Math.min(255, Math.max(0, Math.floor(v * 256))) * 256
            + Math.min(255, Math.max(0, Math.floor(u * 256)))) * 4;
          tint.multiply(sample.setRGB(pixels[at] / 255, pixels[at + 1] / 255, pixels[at + 2] / 255, THREE.SRGBColorSpace));
        }
        tint.lerp(material.emissive || tint, material.emissive ? .2 : 0).convertLinearToSRGB();
        vertices.push(point.x, point.y, point.z, tint.r * shade, tint.g * shade, tint.b * shade, 0);
      }
    });
    return new Float32Array(vertices);
  } finally {
    signal.removeEventListener('abort', dispose);
    dispose();
  }
}

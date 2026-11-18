import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadPlayer(name, signal) {
  const response = await fetch(new URL('./' + name + '.glb', import.meta.url), {signal});
  if (!response.ok) throw Error('Character download failed');
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), new URL('.', import.meta.url).href);
  const root = gltf.scene;
  const dispose = () => {
    root.traverse(node => {
      node.geometry?.dispose();
      for (const material of node.material ? [node.material].flat() : []) {
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
        material.dispose();
      }
    });
  };
  if (signal.aborted) { dispose(); return; }
  try {
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const scale = 1.72/(bounds.max.y-bounds.min.y);
    const center = bounds.getCenter(new THREE.Vector3());
    const mixer = new THREE.AnimationMixer(root);
    const clips = Object.fromEntries(gltf.animations.map(clip => [clip.name,clip]));
    if (!clips.standing_relax) {
      const response = await fetch(new URL('./idle.json',import.meta.url),{signal});
      if (!response.ok) throw Error('Standing animation unavailable');
      clips.standing_relax = THREE.AnimationClip.parse(await response.json());
    }
    const hips = root.getObjectByName('mixamorigHips') || root.getObjectByName('mixamorig:Hips');
    const hipsStart = hips?.position.clone();
    const point = new THREE.Vector3();
    const color = new THREE.Color();
    const sample = new THREE.Color();
    const parts = [];
    let total = 0;
    root.traverse(mesh => {
      if (!mesh.isMesh) return;
      const {index,attributes} = mesh.geometry;
      const count = index?.count ?? attributes.position.count;
      const colors = new Float32Array(attributes.position.count*3);
      const pixelsCanvas = document.createElement('canvas');
      pixelsCanvas.width = pixelsCanvas.height = 512;
      const ctx = pixelsCanvas.getContext('2d',{willReadFrequently:true});
      const texture = mesh.material.map;
      let pixels;
      if (texture?.image) {
        ctx.drawImage(texture.image,0,0,512,512);
        pixels = ctx.getImageData(0,0,512,512).data;
      }
      for (let i=0;i<attributes.position.count;i++) {
        color.copy(mesh.material.color);
        if (pixels && attributes.uv) {
          const u = attributes.uv.getX(i), v = attributes.uv.getY(i);
          const row = Math.min(511,Math.max(0,Math.floor((texture.flipY ? 1-v : v)*512)));
          const col = Math.min(511,Math.max(0,Math.floor(u*512)));
          const at = (row*512+col)*4;
          color.multiply(sample.setRGB(pixels[at]/255,pixels[at+1]/255,pixels[at+2]/255,THREE.SRGBColorSpace));
        }
        color.convertLinearToSRGB();
        colors.set([color.r,color.g,color.b],i*3);
      }
      parts.push({mesh,index,count,colors,positions:new Float32Array(attributes.position.count*3),offset:total});
      total += count;
    });
    const vertices = new Float32Array(total*7);
    for (const part of parts) for (let i=0;i<part.count;i++) {
      const vertex = part.index ? part.index.getX(i) : i;
      const at = (part.offset+i)*7;
      vertices[at+3] = part.colors[vertex*3];
      vertices[at+4] = part.colors[vertex*3+1];
      vertices[at+5] = part.colors[vertex*3+2];
      vertices[at+6] = 28;
    }
    let current, action, lastFrame = -1;
    let previousTime = 0;
    const actions = {};
    function frame(now, moving, running, reduced) {
      const state = moving ? running ? 'run' : 'walk' : clips.standing_relax ? 'standing_relax' : 'agree';
      const stamp = reduced ? 0 : Math.floor(now/33);
      if (current === state && stamp === lastFrame) return null;
      lastFrame = stamp;
      if (current !== state) {
        const previousAction = action;
        action = actions[state] ||= mixer.clipAction(clips[state]);
        action.reset().setEffectiveWeight(1).play();
        if (previousAction) action.crossFadeFrom(previousAction,.18,false);
        current = state;
      }
      const delta = Math.min(.1,Math.max(0,(now-previousTime)/1000));
      previousTime = now;
      if (reduced) mixer.setTime(0);
      else mixer.update(delta);
      if (hips) {
        hips.position.x = hipsStart.x;
        hips.position.z = hipsStart.z;
      }
      root.updateMatrixWorld(true);
      for (const part of parts) {
        const {mesh,index,count,positions,offset} = part;
        mesh.skeleton?.update();
        for(let i=0;i<positions.length/3;i++) {
          mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);
          positions[i*3] = -(point.x-center.x)*scale;
          positions[i*3+1] = (point.y-bounds.min.y)*scale;
          positions[i*3+2] = -(point.z-center.z)*scale;
        }
        for(let i=0;i<count;i++) {
          const vertex = index ? index.getX(i) : i;
          const at = (offset+i)*7, source = vertex*3;
          vertices[at] = positions[source];
          vertices[at+1] = positions[source+1];
          vertices[at+2] = positions[source+2];
        }
      }
      return vertices;
    }
    return {frame,dispose};
  } catch(error) { dispose(); throw error; }
}

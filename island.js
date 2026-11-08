'use strict';

async function loadSouthDock() {
  if (typeof southDockArchive !== 'string' || typeof DecompressionStream !== 'function') return {};
  try {
    const binary = atob(southDockArchive);
    const packed = new Uint8Array(binary.length);
    for (let i=0;i<packed.length;i++) packed[i] = binary.charCodeAt(i);
    const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    return Object.fromEntries(Object.entries(southDockParts).map(([name,[offset,length]])=>
      [name,bytes.subarray(offset,offset+length)]));
  } catch (error) {
    console.warn('Detailed South Dock mesh unavailable',error);
    return {};
  }
}

const arrivalShore = typeof southDockShore === 'object'
  ? southDockShore : {start:2.55,west:0,east:0,edge:22.75};
const arrivalBridge = typeof southDockBridge === 'object'
  ? southDockBridge : {landing:22,outer:26.5,scale:1};
function dockBridgeScale(z) {
  const t=Math.max(0,Math.min(1,(z-arrivalBridge.landing)/(arrivalBridge.outer-arrivalBridge.landing)));
  return 1+(arrivalBridge.scale-1)*t*t*(3-2*t);
}
function dockShoreInset(x) {
  const run = Math.max(0,Math.abs(x)-arrivalShore.start);
  return run*run*(x<0 ? arrivalShore.west : arrivalShore.east);
}
function dockShoreEdge(x) {
  const bank = arrivalShore.edge-dockShoreInset(Math.max(-17,Math.min(17,x)));
  return bank+(16-bank)*Math.max(0,Math.min(1,(Math.abs(x)-17)/3));
}
const dockTrees = [
  [7.31,.10,21.92,5.80,2.22,-2.16,.65],[-12.55,.02,18.06,4.38,1.94,.34,-.27],
  [-15.43,.01,12.72,4.67,2.11,.54,-.31],[-10.42,.02,9.41,3.71,1.63,-.54,.20],
  [4.68,.31,17.23,3.52,1.51,.31,-.17],[11.85,.06,20.21,4.74,1.84,-.24,-.29],
];
const dockPalms=[[-3.65,17.41,3.00,.37],[3.75,16.40,3.19,-.28]];
function isDockTree(x,z) {
  return dockTrees.some(([tx,,tz,height])=>Math.hypot(x-tx,z-tz)<.23+height*.057)
    || dockPalms.some(([px,pz])=>Math.hypot(x-px,z-pz)<.35);
}

// Meshes use metres, Y up, with north along negative Z.
function createIsland(canvas, places, assets = {}) {
  const authoredDock = Boolean(assets.southDockVertices?.length);
  const authoredBuildings = Boolean(assets.arrivalBuildings?.length);
  const litArrival = authoredBuildings && Boolean(assets.arrivalGlass?.length);
  const shoreInset = authoredDock ? dockShoreInset : () => 0;
  const {west,east} = authoredDock ? arrivalShore : {west:0,east:0};
  const bridgeScale = authoredDock ? arrivalBridge.scale : 1;
  const gl = canvas.getContext('webgl', {antialias:true, alpha:true});
  if (!gl) return null;
  const derivatives = gl.getExtension('OES_standard_derivatives');
  function createProgram(vertexSource, fragmentSource) {
    const program = gl.createProgram();
    for (const [kind,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]) {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    return program;
  }
  const lightProjection = `
    uniform vec3 lightRight, lightUp, lightDepth;
    vec3 inLight(vec3 p) {
      vec3 local = p-vec3(0.,.5,17.);
      return vec3(dot(local,lightRight)/22.,dot(local,lightUp)/14.,dot(local,lightDepth)/26.);
    }
  `;
  const breakerMotion = `
    vec3 breakerAt(vec3 foam, float time) {
      float phase=fract(time*.45+foam.g);
      float distance=foam.r-(1.04-1.11*phase);
      float life=smoothstep(.0,.13,phase)*(1.-smoothstep(.86,1.,phase));
      return vec3(distance,life,phase);
    }
  `;
  const program = createProgram(`
    attribute vec3 point, pigment;
    attribute float finishKind;
    uniform vec3 eye, right, up, forward, offset;
    uniform float aspect, heading, limbSwing, limbPivot, time, stanceSide;
    uniform vec2 hipPose, kneePose, anklePose;
    varying vec3 color;
    varying float depth;
    varying vec3 world;
    varying vec3 shadowPosition;
    varying vec3 modelPoint;
    varying float finish;
    ${lightProjection}
    ${breakerMotion}
    vec2 followBone(vec2 p,vec2 bindStart,vec2 bindEnd,vec2 poseStart,vec2 poseEnd) {
      vec2 bindAxis=normalize(bindEnd-bindStart);
      vec2 poseAxis=normalize(poseEnd-poseStart);
      vec2 bindSide=vec2(-bindAxis.y,bindAxis.x);
      vec2 poseSide=vec2(-poseAxis.y,poseAxis.x);
      return poseStart + dot(p-bindStart,bindAxis)*poseAxis + dot(p-bindStart,bindSide)*poseSide;
    }
    void main() {
      float c = cos(heading), s = sin(heading);
      float jointHeight = point.y-limbPivot;
      float cs = cos(limbSwing), sn = sin(limbSwing);
      vec3 joint = vec3(point.x,limbPivot+jointHeight*cs-point.z*sn,jointHeight*sn+point.z*cs);
      if (abs(stanceSide)>.5) {
        vec2 bindHip=vec2(.88,0.);
        vec2 bindKnee=vec2(.47,-stanceSide*.11);
        vec2 bindAnkle=vec2(.13,-stanceSide*.19);
        vec2 upper=followBone(point.yz,bindHip,bindKnee,hipPose,kneePose);
        vec2 lower=followBone(point.yz,bindKnee,bindAnkle,kneePose,anklePose);
        vec2 boot=point.yz+(anklePose-bindAnkle);
        vec2 bent=mix(lower,upper,smoothstep(.38,.55,point.y));
        joint=vec3(point.x,mix(boot,bent,smoothstep(.12,.205,point.y)));
      }
      vec3 vertex = vec3(joint.x*c+joint.z*s,joint.y,joint.z*c-joint.x*s);
      bool water = finishKind>9.5 && finishKind<10.5;
      bool foam = finishKind>7.5 && finishKind<8.5;
      bool breaker = finishKind>18.5 && finishKind<19.5;
      if (water || foam || breaker) {
        float edge = min(15.-abs(point.x),min(point.z-20.,39.-point.z));
        float envelope = smoothstep(0.,2.,edge);
        vertex.y += envelope*(.039*sin(point.x*1.8+point.z*3.3-time*2.2)
          +.018*sin(point.x*3.8-point.z*1.3+time*1.5));
        if (foam) vertex.y += .015;
        if (breaker) {
          vec3 surge=breakerAt(pigment,time);
          float crest=exp(-surge.x*surge.x*51.);
          float impact=smoothstep(.24,.84,surge.z);
          vertex.y += .018+(.043+.245*impact)*crest*surge.y*pigment.b;
        }
      }
      vec3 p = vertex + offset - eye;
      depth = dot(p, forward);
      color = pigment;
      modelPoint = point;
      finish = finishKind;
      world = vertex + offset;
      shadowPosition = inLight(world)*.5+.5;
      gl_Position = vec4(dot(p,right)*1.65/aspect, dot(p,up)*1.65, depth*1.002-.32, depth);
    }
  `, `
    ${derivatives ? '#extension GL_OES_standard_derivatives : enable' : ''}
    precision highp float;
    uniform vec3 eye;
    uniform float warmSuit, time, glaze, hasShadows;
    uniform sampler2D shadowMap, stoneMap, plantMap, sunsetMap, canopyMap, basaltMap;
    uniform vec4 loadedTextures;
    uniform float hasBasalt;
    uniform vec2 shadowStep, labCenter, hubCenter;
    varying vec3 color;
    varying float depth;
    varying vec3 world;
    varying vec3 shadowPosition;
    varying vec3 modelPoint;
    varying float finish;
    ${breakerMotion}
    float litAt(vec2 offset) {
      vec2 packedDepth = texture2D(shadowMap,shadowPosition.xy+offset).rg;
      float depthAt = packedDepth.r+packedDepth.g/255.;
      return step(shadowPosition.z-.00105,depthAt);
    }
    float sunlight() {
      if (hasShadows<.5 || world.z<6. || world.y<-.3 ||
          any(lessThan(shadowPosition,vec3(.002))) || any(greaterThan(shadowPosition,vec3(.998)))) return 1.;
      vec2 tap=shadowStep*1.45;
      return .4*litAt(vec2(0.))+.15*(litAt(vec2(tap.x,0.))+litAt(vec2(-tap.x,0.))
        +litAt(vec2(0.,tap.y))+litAt(vec2(0.,-tap.y)));
    }
    float warmPool(vec3 p, vec3 lamp, float radius) {
      vec3 d = p-lamp;
      return 1.-smoothstep(0.,radius,dot(d,d));
    }
    float shoreInset(float x) {
      float run = max(0.,min(17.,abs(x))-${arrivalShore.start.toFixed(3)});
      return run*run*(x<0. ? ${west.toFixed(3)} : ${east.toFixed(3)});
    }
    float hashCell(vec3 p) {
      p = fract(p*.1031);
      p += dot(p,p.yzx+33.33);
      return fract((p.x+p.y)*p.z);
    }
    float textureNoise(vec3 p) {
      vec3 cell = floor(p);
      vec3 f = fract(p);
      f = f*f*(3.-2.*f);
      vec4 a = vec4(hashCell(cell),hashCell(cell+vec3(1,0,0)),
                    hashCell(cell+vec3(0,1,0)),hashCell(cell+vec3(1,1,0)));
      vec4 b = vec4(hashCell(cell+vec3(0,0,1)),hashCell(cell+vec3(1,0,1)),
                    hashCell(cell+vec3(0,1,1)),hashCell(cell+vec3(1,1,1)));
      vec4 z = mix(a,b,f.z);
      return mix(mix(z.x,z.y,f.x),mix(z.z,z.w,f.x),f.y);
    }
    vec3 reflectedSky(vec3 ray,vec3 fallback) {
      if (loadedTextures.z<.5) return fallback;
      vec2 uv=vec2(clamp(.50+ray.x*.50,.01,.99),clamp(.52+ray.y*.57,.02,.98));
      return texture2D(sunsetMap,uv).rgb;
    }
    float windowSheen(vec3 ray) {
      float lab=0.;
      vec2 labOffset=world.xz-labCenter;
      if (ray.z<-.13 && abs(labOffset.x)<5.2 && labOffset.y>3.7 && labOffset.y<7.7) {
        float travel=(labOffset.y-3.70)/(-ray.z);
        vec2 reflected=vec2(labOffset.x,world.y)+ray.xy*travel;
        float side=reflected.x/1.72;
        float arch=1.88+1.76*sqrt(max(0.,1.-side*side));
        float glass=(1.-smoothstep(.83,1.14,abs(side)))*smoothstep(.38,.82,reflected.y)
          *(1.-smoothstep(arch-.27,arch+.39,reflected.y));
        float bars=.68+.32*smoothstep(.06,.36,abs(sin(reflected.x*2.77)));
        float ringOffset=(reflected.y-2.40)*1.26;
        float ring=.54+.46*exp(-ringOffset*ringOffset);
        lab=glass*bars*ring*(1.-smoothstep(2.9,7.5,travel));
      }
      float hub=0.;
      vec2 radii=vec2(3.90,3.15);
      vec2 bay=(world.xz-hubCenter)/radii;
      float distance=dot(bay,bay);
      if (distance>1. && distance<3.44) {
        vec2 direction=ray.xz/radii;
        float a=dot(direction,direction);
        float b=dot(bay,direction);
        float disc=b*b-a*(distance-1.);
        if (a>.0001 && b<0. && disc>.0) {
          float travel=(-b-sqrt(disc))/a;
          vec2 hit=bay+direction*travel;
          float reflectedY=world.y+ray.y*travel;
          float glass=smoothstep(.42,.85,reflectedY)*(1.-smoothstep(3.63,4.32,reflectedY));
          float bars=.62+.38*smoothstep(.11,.48,abs(sin(atan(hit.y,hit.x+.0001)*13.)));
          hub=glass*bars*(1.-smoothstep(2.7,7.6,travel));
        }
      }
      return max(lab,hub);
    }
    void main() {
      if (finish>18.5 && finish<19.5) {
        vec3 surge=breakerAt(color,time);
        float turbulence=textureNoise(vec3(world.xz*10.9,time*.68+color.g*5.));
        float lip=exp(-surge.x*surge.x*90.);
        float trail=smoothstep(-.035,.19,surge.x)*(1.-smoothstep(.21,.57,surge.x));
        float bubbles=smoothstep(.23,.70,turbulence);
        float mask=smoothstep(-.01,.063,color.r)*(1.-smoothstep(.78,1.,color.r));
        float lace=.62+.38*smoothstep(.13,.71,turbulence+.12*sin(world.x*22.4-world.z*17.8));
        float alpha=(lip*(.48+.48*bubbles)+trail*bubbles*.56)*surge.y*mask*color.b*lace;
        if (alpha<.025) discard;
        vec3 spray=mix(vec3(.55,.77,.746),vec3(.97,.993,.964),clamp(lip*.66+bubbles*.38,0.,1.));
        gl_FragColor=vec4(mix(spray,vec3(.75,.62,.65),smoothstep(23.,93.,depth)*.61),alpha);
        return;
      }
      vec3 grid = floor(world*35.);
      float grain = fract(sin(dot(grid,vec3(12.9898,78.233,39.425)))*4375.5453);
      vec3 surface = color*(.94+grain*.12);
      if (warmSuit > .5 && color.g > color.r*1.35 && color.g > color.b*.88) {
        surface = vec3(color.g*1.19,color.g*.71,color.g*.39);
      }
      vec3 toEye = normalize(eye-world);
      vec3 normal = vec3(0.,1.,0.);
      ${derivatives ? `
        normal = normalize(cross(dFdx(world),dFdy(world)));
        normal *= sign(dot(normal,toEye));
      ` : ''}
      vec3 sunlightDir = normalize(vec3(-.58,.39,-.57));
      float highlight = max(0.,dot(reflect(-sunlightDir,normal),toEye));
      if (finish>.5 && finish<1.5) {
        vec3 woodPoint = modelPoint*vec3(2.0,9.0,35.0);
        float grainA=textureNoise(woodPoint);
        float grainB=textureNoise(woodPoint*2.71);
        float stripe = sin(woodPoint.z*.95+grainA*8.+sin(woodPoint.x)*1.5);
        surface *= .76+.37*grainA+.18*grainB+.072*stripe;
        surface += vec3(.27,.15,.072)*pow(highlight,21.)*.33;
      } else if (finish>1.5 && finish<3.5) {
        float rough = textureNoise(world*6.9)+textureNoise(world*23.)*.44;
        float fractures = smoothstep(.68,.83,textureNoise(world*vec3(2.5,8.,3.2)));
        surface *= .75+rough*.34-fractures*.095;
        if (finish>2.5) {
          if (hasBasalt>.5 && depth<46.) {
            vec3 weight=pow(abs(normal),vec3(3.));
            weight /= max(.001,weight.x+weight.y+weight.z);
            vec3 rock=texture2D(basaltMap,world.zy*.60).rgb*weight.x
              +texture2D(basaltMap,world.xz*.60).rgb*weight.y
              +texture2D(basaltMap,world.xy*.60).rgb*weight.z;
            float exposed=1.-smoothstep(-.025,.082,color.g-color.r);
            surface *= .71+dot(rock,vec3(.2126,.7152,.0722))*.67;
            surface = mix(surface,rock*(.77+.33*rough),exposed*.56);
          }
          float wet = 1.-smoothstep(-2.49,-1.22,world.y);
          float bedding = sin((world.y+world.x*.072+world.z*.12)*33.+textureNoise(world*4.6)*3.7);
          float seams = smoothstep(.80,.99,bedding)*(.38+.62*rough);
          surface *= mix(vec3(1.12,1.06,.97),vec3(.63,.72,.74),wet*.85);
          surface *= 1.-seams*.18;
          surface += vec3(.064,.053,.038)*(1.-wet)*(.46+.54*abs(normal.x));
          surface += vec3(.018,.068,.065)*wet;
          surface += vec3(.27,.33,.32)*pow(highlight,17.)*wet*.68;
          surface += vec3(.09,.043,.023)*fractures;
        }
      } else if (finish>3.5 && finish<4.5) {
        vec3 mirrored = reflect(-toEye,normal);
        float band = smoothstep(-.25,.48,mirrored.y);
        surface *= .79+band*.22;
        surface += vec3(.66,.33,.12)*pow(highlight,29.)*.63;
      } else if (finish>5.5 && finish<6.5) {
        float leafLight = max(0.,dot(-normal,sunlightDir));
        surface = surface*(.81+textureNoise(modelPoint*11.)*.35)+vec3(.20,.21,.064)*leafLight*.29;
      } else if (finish>6.5 && finish<7.5) {
        float weave = textureNoise(modelPoint*95.);
        surface *= .83+weave*.28;
        surface += vec3(.07,.055,.038)*pow(highlight,8.)*.26;
      }
      if (finish>11.5 && finish<12.5 && loadedTextures.x>.5) {
        vec2 wallUV=vec2(mix(world.z,world.x,abs(normal.z))*.328,world.y*.319+.08);
        vec3 masonry=texture2D(stoneMap,wallUV).rgb;
        float damp=1.-smoothstep(-2.49,-.39,world.y);
        surface=mix(surface,masonry,.80)*mix(vec3(1.04,1.02,.98),vec3(.66,.74,.75),damp*.56);
      }
      if (finish>12.5 && finish<13.5) {
        if (loadedTextures.y<.5) discard;
        vec4 leaves=texture2D(plantMap,color.rg);
        if (leaves.a<.46) discard;
        surface=leaves.rgb*(.75+.26*color.b);
      }
      if (finish>13.5 && finish<14.5) {
        if (loadedTextures.w<.5) discard;
        vec4 leaves=texture2D(canopyMap,color.rg);
        if (leaves.a<.50) discard;
        float leafLight=.24+max(0.,dot(normal,sunlightDir))*.39;
        surface=leaves.rgb*mix(vec3(.61,.73,.76),vec3(1.04,1.05,.92),leafLight+color.b*.35);
      } else if (finish>14.5 && finish<15.5) {
        vec3 bark=world*vec3(17.,1.9,17.);
        float ridges=textureNoise(bark+textureNoise(world*3.2)*2.4);
        float fissure=smoothstep(.59,.82,ridges);
        surface *= .78+ridges*.40-fissure*.22;
        surface += vec3(.052,.031,.020)*max(0.,dot(normal,sunlightDir));
      } else if (finish>15.5 && finish<16.5) {
        float fineSoil=textureNoise(world*7.8);
        float slope=max(0.,normal.y);
        float patch=textureNoise(world*.57)*.65+textureNoise(world*2.1)*.24;
        float grass=smoothstep(.31,.65,patch+slope*.30+clamp(world.y*.019,0.,.25));
        float canopyShadow=textureNoise(world*1.09+vec3(.17,3.6,.20));
        vec3 scrub=mix(vec3(.143,.236,.112),vec3(.407,.487,.233),fineSoil*.46+canopyShadow*.54);
        surface=mix(surface*(.82+fineSoil*.26),scrub,grass*.94);
      } else if (finish>17.5 && finish<18.5) {
        float reflectedLight=.5+.5*normal.y;
        surface *= .94+textureNoise(world*9.2)*.13;
        surface += vec3(.14,.079,.041)*pow(highlight,13.)+vec3(.075,.048,.027)*reflectedLight;
      }
      if (finish<.5 && world.y>-.014 && world.y<.017 && world.z>8. && color.g>color.r*1.20) {
        float turf=textureNoise(world*5.7)*.66+textureNoise(world*28.)*.34;
        surface *= .80+turf*.38;
        surface += vec3(.07,.058,.025)*smoothstep(.43,.83,turf);
      }
      // A cool sky gradient with warm lower panes reads as tinted arrival glazing.
      bool labGlass = abs(world.x-labCenter.x) < 5.1 && abs(world.z-labCenter.y) < 4.2;
      bool hubGlass = abs(world.x-hubCenter.x) < 4.4 && abs(world.z-hubCenter.y) < 3.8;
      if (glaze<.5 && finish<12.5 && (labGlass || hubGlass) && color.b>color.r*1.18 && color.g>color.r*1.12) {
        float horizon = smoothstep(1.18,4.05,world.y);
        float glint = pow(max(0.,cos((world.x-eye.x)*.7+(world.z-eye.z)*.23)),14.);
        vec3 blue = mix(vec3(.18,.39,.48),vec3(.12,.26,.51),horizon);
        surface = mix(surface,blue,.58) + vec3(.20,.27,.36)*glint*.39;
        surface += vec3(.23,.105,.027)*(1.-horizon)*.42;
      }
      // The grain and lamp pools follow the taper of the boardwalk.
      float deckScale=mix(1.,${bridgeScale.toFixed(3)},smoothstep(${arrivalBridge.landing.toFixed(3)},${arrivalBridge.outer.toFixed(3)},world.z));
      if (world.z > 21.1 && abs(world.x)<2.52*deckScale && world.y>.142 && world.y<.174) {
        float seam = smoothstep(.008,.032,abs(fract((world.z-21.24)/.24)-.5)*.24);
        float fibres = sin(world.z*218.+sin(world.x*4.2)*1.6)*.5
                     + sin(world.z*447.+world.x*7.3)*.32;
        surface *= (.91+fibres*.12)*mix(.52,1.,seam);
        surface += vec3(.12,.056,.019)*smoothstep(.29,1.0,sin(world.z*12.));
        float rivet = length(vec2(abs(world.x)-2.05*deckScale, (fract((world.z-21.24)/.24)-.15)*.24));
        surface = mix(surface,vec3(.21,.13,.085),1.-smoothstep(.012,.023,rivet));
      }
      if (finish > 9.5 && finish < 10.5) {
        float turbulence = textureNoise(vec3(world.xz*.94,time*.31));
        float current = sin(world.x*.63+world.z*.51-time*.39)+turbulence*2.1;
        float a = world.x*2.34 + world.z*3.72 + current*2.26-time*1.94;
        float b = world.x*4.79 - world.z*2.16 + sin(world.z*1.19)*1.18+time*1.32;
        float fine = sin(world.x*13.2-world.z*16.6+sin(a)*1.55+time*2.9);
        float ripple = sin(a)*.37 + sin(b)*.29 + sin(a*1.84-b*.71)*.22 + fine*.12;
        float waveDetail = 1.-smoothstep(19.,82.,depth);
        vec3 waveNormal = normalize(vec3((.16*cos(a)+.12*cos(b)+fine*.035)*waveDetail,1.,
                                    (.19*cos(a)-.13*cos(b)-fine*.038)*waveDetail));
        vec3 ray = normalize(world-eye);
        vec3 reflected = reflect(ray,waveNormal);
        vec3 sunDirection = normalize(vec3(-1.10,.10,-1.));
        float highlight = pow(max(0.,dot(reflected,sunDirection)),101.);
        float track = pow(max(0.,dot(normalize(ray.xz),normalize(sunDirection.xz))),34.);
        float fresnel = pow(1.-max(0.,dot(-ray,waveNormal)),4.);
        float shoreZ = world.z+shoreInset(world.x);
        float nearBank = 1.-smoothstep(14.,20.,abs(world.x));
        float shoreRun = shoreZ-${arrivalShore.edge.toFixed(3)};
        float westCove = 1.-smoothstep(-4.7,-1.7,world.x);
        float shallowReach = mix(8.0,12.8,westCove);
        float coveEntry = smoothstep(-.85,.25,shoreRun);
        float shallow = (1.-smoothstep(1.4,shallowReach,shoreRun))*coveEntry*smoothstep(.72,3.8,abs(world.x))*nearBank;
        vec3 deep = mix(vec3(.028,.16,.236),vec3(.045,.405,.417),shallow);
        surface = mix(deep,mix(vec3(.13,.46,.48),vec3(.24,.65,.586),shallow),smoothstep(-.63,.93,ripple)*.63);
        if (shallow>.025 && depth<27.) {
          vec3 refraction = refract(ray,waveNormal,.75);
          vec2 bed = world.xz + refraction.xz*mix(.55,2.95,1.-shallow)/max(.19,-refraction.y);
          float silt=textureNoise(vec3(bed*.64,.25));
          float rippleX=sin(bed.x*8.1+bed.y*4.45+sin(bed.y*4.7+time*.71)*1.8);
          float rippleY=sin(bed.y*6.9-bed.x*3.7+sin(bed.x*5.9-time*.62)*1.47);
          float caustics=pow(1.-abs(rippleX*.58-rippleY*.42),5.4);
          surface += (vec3(.09,.24,.19)*caustics*.79+vec3(.080,.075,.039)*silt)*shallow*(1.-fresnel);
        }
        surface = mix(surface,reflectedSky(reflected,vec3(.49,.37,.55))*.84,fresnel*.72);
        float stipple = textureNoise(vec3(world.xz*vec2(6.2,12.8),time*.72));
        float flecks = smoothstep(.31,.81,ripple+fine*.21)*smoothstep(.30,.73,stipple)*waveDetail;
        float brokenTrack=.23+.77*smoothstep(.22,.73,turbulence+stipple*.17);
        surface += vec3(1.,.61,.29)*(highlight*(.19+flecks*.76)+track*flecks*brokenTrack*.67);
        float band = shoreRun*7.6+sin(world.x*3.19)*.78+turbulence*2.7+time*1.65;
        float breakUp = sin(world.x*13.1+world.z*4.) + sin(world.x*6.4-world.z*6.4);
        float foam = smoothstep(.77,.99,sin(band))*smoothstep(.07,.97,breakUp)*(.26+stipple*.74);
        foam *= (1.-smoothstep(.47,2.7,shoreRun))*coveEntry*smoothstep(2.45,2.78,abs(world.x))*nearBank;
        surface = mix(surface,vec3(.87,.966,.947),foam*.84);
      } else if (finish>7.5 && finish<8.5) {
        float dissolve = sin(world.x*24.7+world.z*12.6-time*2.4)*.46 + sin(world.z*39.+world.x*8.)*.29
          + (textureNoise(world*12.6)*2.-1.)*.25;
        if (dissolve < -.20) discard;
        surface = mix(vec3(.17,.52,.54),mix(surface,vec3(.88,.97,.95),.48),smoothstep(-.20,.54,dissolve));
      }
      if (world.z>6. && world.y>-.3) {
        float lit = sunlight();
        vec3 bounce = (labGlass || hubGlass) ? vec3(.75,.73,.75) : vec3(.60,.65,.76);
        surface *= mix(bounce,vec3(1.08,1.01,.91),lit);
      }
      if (world.z>7. && world.y>-.1) {
        float illumination = 0.;
        if (abs(world.x)<3. && world.z>20.5) {
          float lampZ = 21.4+floor((world.z-21.4)/1.75+.5)*1.75;
          illumination = warmPool(world,vec3(sign(world.x)*2.29*deckScale,.62,lampZ),3.6);
        }
        illumination += warmPool(world,vec3(labCenter.x,.61,labCenter.y+3.8),10.)*.88;
        illumination += warmPool(world,vec3(hubCenter.x-1.2,.56,hubCenter.y+2.92),11.)*.72;
        surface += vec3(.32,.145,.046)*illumination;
        if (${litArrival ? 'true' : 'false'} && glaze<.5 && world.y<4.5 && world.z<25.9) {
          vec2 labLocal = world.xz-labCenter;
          vec2 hubLocal = (world.xz-hubCenter)/vec2(4.09,3.28);
          float hubRadius=length(hubLocal);
          float labRoom=(1.-smoothstep(.80,1.06,length(labLocal/vec2(4.61,3.73))))
            *(1.-smoothstep(2.36,3.18,world.y));
          float hubRoom=(1.-smoothstep(.79,1.065,hubRadius))*(1.-smoothstep(3.20,4.38,world.y));
          float roomLight=max(labRoom*(.38+.60*warmPool(world,vec3(labCenter.x,2.19,labCenter.y+.68),18.)),
                              hubRoom*(.38+.63*warmPool(world,vec3(hubCenter.x-.55,2.83,hubCenter.y+.55),20.)));
          surface *= mix(vec3(1.),vec3(1.19,1.035,.84),roomLight*.72);
          surface += vec3(.43,.235,.087)*roomLight*(.25+.60*max(surface.r,surface.g));
          float portalRun=labLocal.y-3.48;
          float labFan=smoothstep(-.26,.39,portalRun)*(1.-smoothstep(.68,3.60,portalRun))
            *(1.-smoothstep(.61,1.75+max(0.,portalRun)*.25,abs(labLocal.x)));
          float hubFan=smoothstep(.84,1.02,hubRadius)*(1.-smoothstep(1.10,1.95,hubRadius))
            *clamp((hubLocal.y-hubLocal.x)*.82,0.,1.);
          float labMullion=.65+.35*smoothstep(.02,.31,abs(sin(labLocal.x*2.31/(1.+max(0.,portalRun)*.21))));
          float hubMullion=.66+.34*smoothstep(.04,.37,abs(sin(atan(hubLocal.y,hubLocal.x+.0001)*13.)));
          float spill=max(labFan*labMullion,hubFan*hubMullion)*(1.-smoothstep(.12,1.14,world.y));
          bool foliage=(finish>5.5 && finish<6.5)||(finish>12.5 && finish<14.5);
          surface += vec3(.54,.291,.101)*spill*(foliage?.43:.59);
          bool paving=(finish>1.5 && finish<2.5)||(finish>17.5 && finish<18.5);
          if (paving && normal.y>.84 && world.y>.018 && world.y<.098) {
            float reflected=windowSheen(reflect(-toEye,normal));
            float roughness=.55+.45*textureNoise(vec3(world.xz*vec2(6.2,9.3),.31));
            float angle=.48+.52*pow(1.-max(0.,dot(normal,toEye)),2.);
            surface=mix(surface,vec3(1.,.76,.48),reflected*roughness*angle*.60);
          }
        }
        if (world.y>.017 && world.y<.050 && world.z<21.25) {
          float row = floor(world.z/.67);
          float seam = min(abs(fract(world.z/.67)-.5)*.67,
                           abs(fract((world.x+mod(row,2.)*.44)/.88)-.5)*.88);
          float paver = sin(row*21.73+floor(world.x/.88)*19.2);
          surface *= mix(.72,1.+paver*.065,smoothstep(.008,.026,seam));
        }
      }
      float coveZ = world.z+shoreInset(world.x);
      if (finish<7.5 && world.y<.18 && coveZ>22.1 && coveZ<25.9) {
        float lampX = abs(world.x)<7.65 ? 5.94 : 9.45;
        float coveLight = warmPool(vec3(abs(world.x),world.y,coveZ),vec3(lampX,-.47,23.36),2.7);
        surface += vec3(.46,.20,.047)*coveLight*.66;
      }
      if (finish>4.5 && finish<5.5) {
        surface = mix(surface,vec3(1.,.66,.26),.76);
        surface += vec3(.10,.056,.024)*pow(1.-abs(normal.y),2.);
      } else if (finish>8.5 && finish<9.5) {
        surface = mix(surface,vec3(.28,.89,.69),.53);
      } else if (finish>16.5 && finish<17.5) {
        surface = mix(vec3(1.,.624,.24),vec3(1.,.925,.70),.72+.19*abs(normal.y));
      }
      float alpha = 1.;
      if (finish>10.5 && finish<11.5) {
        vec2 p = modelPoint.xz-vec2(.53,.35);
        float r = length(vec2(dot(p,vec2(.83,.55))/.94,dot(p,vec2(-.55,.83))/.25));
        surface = vec3(.11,.09,.09);
        alpha = (1.-smoothstep(.20,1.0,r))*.41;
      }
      if (glaze>.5) {
        if (!gl_FrontFacing) discard;
        float streak = pow(max(0.,cos(world.x*.71+world.z*.42-eye.x*.21)),22.);
        float domeTint = labGlass ? smoothstep(2.37,3.52,world.y) : 0.;
        float litPane = 1.-smoothstep(labGlass?1.70:2.45,labGlass?3.12:4.31,world.y);
        vec3 honey = mix(vec3(.54,.339,.193),vec3(.99,.708,.416),litPane);
        surface = mix(honey,vec3(.075,.309,.575),domeTint);
        alpha = .12+domeTint*.43+litPane*.078+streak*.045;
        ${derivatives ? `
          vec3 mirror = reflect(-toEye,normal);
          float fresnel = pow(1.-clamp(dot(normal,toEye),0.,1.),4.);
          vec3 sky = mix(vec3(.83,.47,.36),vec3(.21,.38,.63),smoothstep(-.06,.54,mirror.y));
          float gleam = pow(max(0.,dot(mirror,normalize(vec3(-.55,.17,-.74)))),34.);
          sky=reflectedSky(mirror,sky);
          sky=mix(sky,sky*vec3(.29,.70,1.14)+vec3(.018,.057,.15),domeTint*.88);
          surface = mix(surface,sky,.075+domeTint*.15+fresnel*.54)+vec3(.73,.51,.28)*gleam*.25;
          alpha = min(.78,alpha+fresnel*.22);
        ` : ''}
      }
      gl_FragColor = vec4(mix(surface,vec3(.76,.61,.64),smoothstep(23.,112.,depth)*.65),alpha);
    }
  `);
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  const attributes = ['point','pigment','finishKind'].map(name => gl.getAttribLocation(program,name));
  const uniforms = Object.fromEntries(['eye','right','up','forward','offset','aspect','heading','warmSuit','limbSwing','limbPivot','time','glaze','hasShadows','shadowMap','shadowStep','lightRight','lightUp','lightDepth','labCenter','hubCenter','stanceSide','hipPose','kneePose','anklePose','stoneMap','plantMap','sunsetMap','canopyMap','basaltMap','loadedTextures','hasBasalt'].map(name=>[name,gl.getUniformLocation(program,name)]));
  const subtract = (a,b)=>a.map((v,i)=>v-b[i]);
  const cross = ([a,b,c],[x,y,z])=>[b*z-c*y,c*x-a*z,a*y-b*x];
  const unit = a=>a.map(v=>v/Math.hypot(...a));
  const dot = (a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  const sun = unit([-.58,.39,-.57]);
  const lightRight = unit(cross(sun,[0,1,0]));
  const lightUp = cross(lightRight,sun);
  const lightDepth = sun.map(value=>-value);
  const lightAxes = {lightRight,lightUp,lightDepth};
  for (const [name,value] of Object.entries(lightAxes)) gl.uniform3fv(uniforms[name],value);
  gl.uniform2fv(uniforms.labCenter,places[2].slice(1,3));
  gl.uniform2fv(uniforms.hubCenter,places[0].slice(1,3));
  let vertices = [];
  let activeFinish = 0;
  function tri(a,b,c,hex,light) {
    const n = cross(subtract(b,a),subtract(c,a));
    if (Math.hypot(...n)<.00001) return;
    const shade = light ? .64+.36*Math.max(0,dot(unit(n),sun)) : 1;
    const rgb = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255*shade);
    vertices.push(...a,...rgb,activeFinish,...b,...rgb,activeFinish,...c,...rgb,activeFinish);
  }
  function quad(a,b,c,d,color,light=true) {
    tri(a,b,c,color,light);
    tri(a,c,d,color,light);
  }
  function box(x,y,z,w,h,d,color) {
    const a=[x-w,y,z-d], b=[x+w,y,z-d], c=[x+w,y,z+d], e=[x-w,y,z+d];
    const lift=p=>[p[0],y+h,p[2]];
    for(const [p,q] of [[b,a],[c,b],[e,c],[a,e]]) quad(p,q,lift(q),lift(p),color);
    quad(lift(e),lift(c),lift(b),lift(a),color);
  }
  function shell(x,z,profile,color,sides=32,ratio=1,skipSegment=null) {
    for(let i=1;i<profile.length;i++) {
      const [y,r]=profile[i-1], [yy,rr]=profile[i];
      for(let j=0;j<sides;j++) {
        if (skipSegment && skipSegment((j+.5)*Math.PI*2/sides)) continue;
        const at=(k,height,radius)=>[x+Math.cos(k*2*Math.PI/sides)*radius,height,z+Math.sin(k*2*Math.PI/sides)*radius*ratio];
        quad(at(j+1,y,r),at(j,y,r),at(j,yy,rr),at(j+1,yy,rr),Array.isArray(color)?color[j%color.length]:color);
      }
    }
  }
  function strip(ax,az,bx,bz,y,width,color) {
    const length=Math.hypot(bx-ax,bz-az);
    const x=(bz-az)*width/length, z=(ax-bx)*width/length;
    quad([ax+x,y,az+z],[bx+x,y,bz+z],[bx-x,y,bz-z],[ax-x,y,az-z],color,false);
  }
  const cream='#f4dfbd', slate='#34535d', teal='#91fadb';
  const glass=['#579da9','#74bcc4','#52949e','#42818e'];
  // Subdivided harbour water moves at the rocks; the far ocean stays a single plane.
  activeFinish = 10;
  function seaPlane(left,right,north,south) {
    quad([left,-2.5,north],[left,-2.5,south],[right,-2.5,south],[right,-2.5,north],'#478c9b',false);
  }
  seaPlane(-120,120,-120,20);
  seaPlane(-120,120,39,120);
  seaPlane(-120,-15,20,39);
  seaPlane(15,120,20,39);
  for(let j=0;j<48;j++) for(let i=0;i<76;i++) {
    seaPlane(-15+i*30/76,-15+(i+1)*30/76,20+j*19/48,20+(j+1)*19/48);
  }
  activeFinish = 0;
  const dockBank = Array.from({length:35},(_,i)=>[17-i,dockShoreEdge(17-i)]);
  const coast=[[-17,-22],[16,-22],[19,-17],[20,16],
    ...(authoredDock ? dockBank : [[17,22],[7,23],[-15,23]]),[-20,16],[-20,-14]];
  coast.forEach(([x,z],i)=>{
    const [xx,zz]=coast[(i+1)%coast.length];
    tri([0,0,0],[xx,0,zz],[x,0,z],i%2?'#527758':'#567e5e',true);
    const onDockBank = authoredDock && z>=16 && zz>=16;
    activeFinish = onDockBank ? 12 : 0;
    quad([x,-3.5,z],[xx,-3.5,zz],[xx,0,zz],[x,0,z],'#697875');
    activeFinish = 0;
    const count=Math.ceil(Math.hypot(xx-x,zz-z)*2);
    for(let j=0;j<count;j++){
      const a=j/count, px=x+(xx-x)*a,pz=z+(zz-z)*a;
      if (onDockBank) continue;
      for(let row=0;row<4;row++) box(px+(row%2)*.16,-.55-row*.73,pz,.26,.55,.28,['#a5a398','#8c9085','#777f77'][((j+row)%3)]);
    }
  });
  // Offshore stacks frame the horizon without adding walkable land.
  for(const [x,z,r,h] of [[-30,-31,5,5],[-37,-27,3,3.5],[33,-36,8,7],[44,-43,10,9],[25,-41,4,4]]) {
    shell(x,z,[[-3.5,r*1.2],[-1,r],[h*.58,r*.79],[h,r*.49],[h,0]],['#617c78','#6d8581','#526d6f'],9,.72);
    shell(x,z,[[h-.19,r*.53],[h+.08,r*.48],[h+.13,0]],'#66866e',9,.72);
  }
  if (authoredDock) {
    for (const side of [-1,1]) {
      for (let i=0;i<16;i++) {
        const x=side*(2.55+i*.62),nextX=x+side*.62;
        const z=dockShoreEdge(x)-.09,nextZ=dockShoreEdge(nextX)-.09;
        activeFinish = 2;
        quad([x,.039,z],[nextX,.039,nextZ],[nextX,.039,nextZ-1.18],[x,.039,z-1.18],
          i%3===0 ? '#c7ab8b' : '#d8bda0',false);
        strip(x,z-.16,nextX,nextZ-.16,.045,.026,'#a58463');
        if (i%2===0) {
          activeFinish = 4;
          shell(x,z,[[.045,.090],[.095,.090],[.095,.042],[.61,.042],[.63,.065],[.665,0]],'#ba8a55',10);
        }
        activeFinish = 4;
        taper([x,.60,z],[nextX,.60,nextZ],.027,.027,'#c5945d');
      }
    }
    activeFinish = 0;
  }
  if (!authoredDock) {
    box(0,-.45,22.7,2.55,.5,2.6,'#a78a64');
    for(let z=20.2;z<25.2;z+=.29) box(0,.052,z,2.52,.022,.105,'#c5a880');
    for (const x of [-2.37,2.37]) {
      for (const z of [20.5,22,23.5,25]) {
        box(x,.06,z,.10,.72,.10,'#8d6a4b');
        box(x,.76,z,.13,.19,.13,'#ffe3a1');
      }
      box(x,.46,22.75,.038,.04,2.25,'#c4a582');
    }
  }
  strip(0,-17,0,22,.025,2.0,'#c8c6a9');
  for(let z=-16.5;z<22;z+=.68) {
    strip(-1.98,z,1.98,z,.029,.012,'#a7aa95');
    const seam = Math.round(z/.68)%2 ? -.62 : .62;
    strip(seam,z,seam,z+.68,.029,.012,'#a7aa95');
  }
  for(const x of [-1.8,1.8]) strip(x,3,x,22,.036,.042,teal);
  for(const [,x,z,,levels] of places) if(levels && x) {
    strip(0,z+3.5,x,z+3.5,.026,.88,'#c8c6a9');
    if(x===places[2][1]) for(const offset of [-.77,.77]) strip(0,z+3.5+offset,x,z+3.5+offset,.04,.045,teal);
  }
  shell(0,0,[[0,4.9],[.15,4.9],[.15,0]],'#dbccae');
  shell(0,-1.5,[[.15,1.18],[.48,1.05],[.48,0]],slate);
  function orbit(x,y,z,r,tilt,color) {
    const at=(i,rad)=>[x+Math.cos(i)*rad,y+Math.sin(i)*rad*Math.cos(tilt),z+Math.sin(i)*rad*Math.sin(tilt)];
    for(let j=0;j<64;j++){
      const a=j*Math.PI/32,b=(j+1)*Math.PI/32;
      quad(at(a,r),at(b,r),at(b,r-.10),at(a,r-.10),color,false);
    }
  }
  orbit(0,2.1,-1.5,1.55,.62,teal);
  orbit(0,2.1,-1.5,1.33,-.92,'#e8ac62');
  shell(0,-1.5,[[1.5,0],[1.72,.43],[2.25,.48],[2.62,0]],'#5dc2be',12);
  places.forEach(([,x,z,accent,levels],index)=>{
    if(!levels || (authoredBuildings && (index===0 || index===2))) return;
    shell(x+1,z-.65,[[.009,2.87],[.009,0]],'#3e614a',24,.83);
    shell(x,z,[[0,2.66],[.22,2.66],[.22,0]],'#aab0a1');
    if(index===2 || index===6) {
      shell(x,z,[[.22,2.48],[1.62,2.48],[1.88,2.65]],cream);
      shell(x,z,[[1.88,2.43],[2.45,2.22],[2.98,1.77],[3.38,1.02],[3.52,0]],index===2?['#27516f','#3e7795','#2f5b85','#497b98']:glass,36);
      if(index===2) {
        const ribs=[[1.87,2.46],[2.45,2.24],[2.98,1.79],[3.38,1.04],[3.54,.03]];
        for(let i=0;i<12;i++) {
          const theta=i*Math.PI/6;
          const point=([y,r], side)=>[x+Math.cos(theta+side)*r,y,z+Math.sin(theta+side)*r];
          for(let j=1;j<ribs.length;j++) {
            quad(point(ribs[j-1],-.018),point(ribs[j],-.018),point(ribs[j],.018),point(ribs[j-1],.018),cream);
          }
        }
        shell(x,z,[[1.66,2.57],[1.71,2.62]],'#edc07b');
        for (const [y,r] of [[2.45,2.245],[2.98,1.80],[3.38,1.055]]) {
          shell(x,z,[[y-.025,r+.015],[y+.025,r]],'#b9ab91',36);
        }
        shell(x,z,[[1.88,2.45],[1.94,2.46]],'#dfa765',36);
      }
      for(const dx of index===2?[-2.04,2.04]:[]) {
        box(x+dx,1.75,z,.09,2.82,.09,cream);
        box(x+dx,4.54,z,.15,.24,.15,teal);
      }
    } else if([0,1,3,9].includes(index)) {
      shell(x,z,[[.22,2.38],[1.9,2.38]],glass,32,.83);
      const tall=index===9?2.5:index===1?1.05:.35;
      shell(x,z,[[1.9,2.65],[2.25,2.55],[2.25,1.64],[2.25+tall,1.55],[2.25+tall,0]],cream,32,.83);
      shell(x,z,[[2.15,2.6],[2.23,2.58]],accent,32,.83);
    } else {
      box(x,.22,z,2.3,1.57,1.86,cream);
      box(x+.27,1.79,z,1.72,.88+levels*.15,1.42,glass[index%4]);
      box(x+.27,2.67+levels*.15,z,1.82,.18,1.53,accent);
    }
    // Roof equipment and terraces give each location a recognisable silhouette.
    if(index===4) {
      for(const dx of [-1.45,-.65,.15, .95]) box(x+dx,3.3,z,.21,.36,.68,'#395f72');
    } else if(index===5) {
      shell(x+.8,z,[[3.42,.74],[3.63,.74],[4.16,.25],[4.16,0]],'#9ad9dd',12);
      box(x-.8,3.42,z,.08,1.18,.08,accent);
    } else if(index===7) {
      for(const dz of [-.91,.12,.92]) box(x+.3,3.3,z+dz,1.35,.14,.28,'#637f5e');
    } else if(index===8) {
      for(const [dx,h] of [[-1.25,.39],[0,.79],[1.2,.48]]) box(x+dx,3.3,z,.28,h,.52,accent);
    } else if(index===9) {
      box(x,4.75,z,.08,1.3,.08,cream);
      box(x,6,z,.22,.17,.22,accent);
    }
    const round=[0,1,2,3,6,9].includes(index);
    const doorZ=z+(index===2||index===6?2.46:round?1.96:1.86);
    box(x,.23,doorZ,.67,1.24,.09,slate);
    box(x,1.44,doorZ+.05,.75,.085,.1,accent);
    if(index===2) {
      box(x,1.64,doorZ+.48,1.23,.19,.63,cream);
      for(const dx of [-1.08,1.08]) box(x+dx,.22,doorZ+.87,.08,1.44,.08,slate);
      box(x,1.62,doorZ+1.12,1.22,.07,.03,teal);
      strip(x,doorZ+.17,x,doorZ+1.34,.04,.65,'#aabbb0');
    }
    for(const dx of [-1,1]) box(x+dx,.55,doorZ-.05,.24,.55,.07,'#c9eff0');
  });
  const arrivalTrees = authoredDock ? [] : [[-16,13],[-12,19],[12,19]];
  for(const [x,z] of [[-17,-17],[17,-17],[-17,-10],[17,-4],...arrivalTrees,[16,13],[-6,9],[5,7],[-5,-6],[5,-6],[9,-4],[-12,-8],[15,17]]) {
    shell(x+.9,z-.5,[[.008,1.22],[.008,0]],'#40634b',16,.56);
    shell(x,z,[[0,.75],[.22,.75],[.22,0]],'#b5ac92',12);
    box(x,.22,z,.11,1.38,.11,'#80674f');
    for (const [dx,dz,height] of [[0,0,0],[-.37,.08,-.19],[.36,-.24,.17]]) {
      shell(x+dx,z+dz,[[1.05+height,0],[1.26+height,.44],[1.74+height,.66],[2.24+height,.43],[2.45+height,0]],['#4f8d63','#63976a','#609e70'],12);
    }
  }
  for(const [x,z] of [[-3.08,16],[3.08,16],[-3.08,11],[3.08,11],[-3.08,6],[3.08,6],[-6.4,2.4],[-6.4,-1.32]]) {
    box(x,.01,z,.48,.23,.87,'#bfaf92');
    box(x,.239,z,.42,.014,.8,'#586852');
    for(let i=0;i<11;i++) {
      const dx=Math.sin(i*13.2)*.39,dz=(i-5)*.14;
      const height=.36+(i%4)*.07;
      shell(x+dx,z+dz,[[.25,.06],[height,.105],[height+.09,0]],i%5===0?'#e6bfa1':'#749e68',5);
    }
  }
  // The beacon sits on the raised west ledge visible from South Dock.
  shell(-30.82,-.32,[[6.69,.83],[6.93,.83],[6.93,.64],[9.53,.45]],cream,20);
  activeFinish = 5;
  shell(-30.82,-.32,[[9.53,.56],[9.68,.56],[9.68,.41],[10.08,.41]],'#ffcb82',20);
  activeFinish = 0;
  shell(-30.82,-.32,[[10.07,.54],[10.53,0]],slate,20);
  for(const x of [-2.16,2.16]) for(let z=5;z<23;z+=3) {
    box(x,0,z,.09,.66,.09,slate);
    box(x,.65,z,.14,.12,.14,teal);
  }
  for (const [cx,cz] of [[-5.4,17.9],[-10.9,17.6],[-4.8,20.3],[3.8,21.05],[10.0,20.3]]) {
    shell(cx,cz,[[0,.91],[.28,.95],[.31,.88],[.31,0]],'#c8ae8b',20,.69);
    for (let i=0;i<22;i++) {
      const theta=i*2.4;
      const x=cx+Math.cos(theta)*(.17+i%5*.10);
      const z=cz+Math.sin(theta)*(.11+i%4*.09);
      const length=.25+i%7*.055;
      const dx=Math.cos(theta)*length,dz=Math.sin(theta)*length;
      const color=['#69984e','#456f3c','#8b9d51','#964c36'][i%4];
      quad([x,.30,z],[x+dx*.52-dz*.16,.57,z+dz*.52+dx*.16],
        [x+dx,.55+i%3*.11,z+dz],[x+dx*.52+dz*.14,.63,z+dz*.52-dx*.14],color);
    }
  }
  // Small arrival-scale details use existing traversable shoulders and planters.
  for (const [x,z] of [[-6.32,18.25],[-10.5,17.5],[4.6,20.0],[9.6,19.95]]) {
    shell(x,z,[[0,.18],[.09,.20],[.14,.13],[.66,.13]],'#796044',16);
    shell(x,z,[[.65,.128],[.92,.128]],'#ffd48c',16);
    shell(x,z,[[.91,.15],[.96,.15],[.99,.08],[.99,0]],'#8b6543',16);
  }
  for (const [x,z] of [[3.22,20.05],[-4.3,18.15]]) {
    box(x-.65,.03,z,.083,.40,.21,'#846347');
    box(x+.65,.03,z,.083,.40,.21,'#846347');
    for (const offset of [-.19,-.065,.06,.185]) box(x,.40,z+offset,.88,.065,.05,'#c89a65');
    box(x,.69,z-.205,.88,.12,.045,'#59827a');
  }
  for (const [x,z] of [[-5.4,17.9],[-10.9,17.6],[3.8,21.05],[10.0,20.3]]) {
    for (let j=0;j<11;j++) {
      const a=j*2.399;
      const px=x+Math.cos(a)*(.14+j%3*.11),pz=z+Math.sin(a)*(.12+j%4*.07);
      const h=.47+j%4*.085;
      shell(px,pz,[[h-.08,.012],[h,.036],[h+.054,.057],[h+.085,0]],j%3?'#f5d0a0':'#b85e56',6);
    }
  }
  // The stone threshold connects the deck to the hub and lab paths.
  shell(0,19.9,[[.012,3.35],[.028,3.35],[.028,0]],'#ccb494',56,.58);
  for (const x of [-1.82,1.82]) {
    for (let j=0;j<21;j++) {
      const z=14.3+j*.34;
      const edge=x+(x<0?-.25:.25)*Math.sin(j/21*Math.PI);
      shell(edge,z,[[.052,.042],[.062,.046],[.062,0]],'#a2f3cf',8);
    }
  }
  // Fine leaves and arching ferns at the dock threshold, beyond the clear path.
  let plantSeed = 7412;
  function randomPlant() {
    plantSeed = (1664525*plantSeed+1013904223)>>>0;
    return plantSeed/4294967296;
  }
  function leaf(x,y,z,theta,length,width,rise,color) {
    const dx=Math.cos(theta), dz=Math.sin(theta);
    function leafAt(t,side) {
      const bend = length*t;
      const edge = width*Math.sin(Math.PI*t)*side;
      const arc = rise*t+length*.34*Math.sin(t*Math.PI);
      return [x+dx*bend-dz*edge,y+arc-Math.abs(edge)*.27,z+dz*bend+dx*edge];
    }
    for (let j=0;j<4;j++) {
      const a=j/4,b=(j+1)/4;
      for (const side of [-1,1]) quad(leafAt(a,0),leafAt(b,0),leafAt(b,side),leafAt(a,side),color);
    }
  }
  const fernColors=['#507946','#749647','#94aa54','#376544'];
  for (const [cx,cz] of [[-3.53,20.7],[-4.78,20.2],[-6.15,19.55],[3.71,20.68],[5.3,20.93],[10.28,19.57],[-11.0,17.7]]) {
    for (let plant=0;plant<7;plant++) {
      const x=cx+(randomPlant()-.5)*1.13,z=cz+(randomPlant()-.5)*.70;
      const height=.28+randomPlant()*.32;
      for (let ray=0;ray<7;ray++) {
        const theta=ray*2.4+randomPlant()*.4;
        const length=.24+randomPlant()*.45;
        const color=fernColors[(ray+plant)%fernColors.length];
        leaf(x,.25,z,theta,length,length*.13,height,color);
        if (plant%2===0) {
          for (let pin=1;pin<6;pin++) {
            const t=pin/7;
            const baseY=.25+height*t+length*.33*Math.sin(Math.PI*t);
            for (const wing of [-1,1]) {
              leaf(x+Math.cos(theta)*length*t,baseY,z+Math.sin(theta)*length*t,theta+wing*.94,
                length*.27*Math.sin(Math.PI*t)+.034,.023,-.042,fernColors[(pin+plant)%4]);
            }
          }
        }
      }
      if (plant%3===0) for (let ray=0;ray<6;ray++) {
        leaf(x,.31,z,ray*1.05,.21+randomPlant()*.28,.055,.24,'#9d5144');
      }
    }
  }
  function taper(start,end,radius,tip,color) {
    const axis=unit(subtract(end,start));
    const tangent=unit(cross(axis,[0,0,1]));
    const normal=cross(axis,tangent);
    const ring=(p,r,j)=>p.map((v,i)=>v+r*(tangent[i]*Math.cos(j*Math.PI/4)+normal[i]*Math.sin(j*Math.PI/4)));
    for(let j=0;j<8;j++) quad(ring(start,radius,j),ring(start,radius,j+1),ring(end,tip,j+1),ring(end,tip,j),color);
  }
  const canopySprays=[];
  function coastalTree(x,y,z,height,spread,leanX,leanZ) {
    const trunkRadius=height*.043;
    const physicalLeaves=Math.abs(x)<18 && z>8 ? 11 : 3;
    const treeAngle=randomPlant()*Math.PI*2;
    const trunk=(level)=>{
      const bow=Math.sin(level*Math.PI)*height*.062;
      return [x+leanX*level+Math.cos(treeAngle)*bow,y+height*level,z+leanZ*level+Math.sin(treeAngle)*bow];
    };
    activeFinish=15;
    taper(trunk(0),trunk(.31),trunkRadius*1.32,trunkRadius*.85,'#74604b');
    taper(trunk(.31),trunk(.64),trunkRadius*.85,trunkRadius*.58,'#74604b');
    taper(trunk(.64),trunk(.97),trunkRadius*.58,trunkRadius*.11,'#79634d');
    for(let i=0;i<4;i++) {
      const theta=treeAngle+i*1.57;
      const reach=trunkRadius*(2.4+randomPlant()*1.3);
      taper(trunk(.044),[x+Math.cos(theta)*reach,y-.035,z+Math.sin(theta)*reach],trunkRadius*.58,.014,'#6e5845');
    }
    for(let arm=0;arm<8;arm++) {
      const theta=treeAngle+arm*2.399;
      const reach=spread*(.38+.67*randomPlant());
      const branchHeight=.49+arm*.041;
      const start=trunk(branchHeight);
      const tip=[x+leanX*.87+Math.cos(theta)*reach,y+height*(branchHeight+.17+randomPlant()*.11),z+leanZ*.80+Math.sin(theta)*reach*.84];
      const bend=[(start[0]+tip[0])*.5,(start[1]+tip[1])*.5+.07*height,(start[2]+tip[2])*.5];
      taper(start,bend,trunkRadius*.40,trunkRadius*.23,'#735d48');
      taper(bend,tip,trunkRadius*.23,.013,'#80684e');
      for(const side of [-1,1]) {
        const direction=theta+side*.97;
        const twig=[tip[0]+Math.cos(direction)*spread*.39,tip[1]+spread*.16,tip[2]+Math.sin(direction)*spread*.39];
        taper(bend,twig,trunkRadius*.17,.009,'#80684e');
      }
      for(let j=0;j<9;j++) {
        const angle=theta+j*2.399;
        const size=spread*(.52+randomPlant()*.25);
        const radius=Math.sqrt(randomPlant())*spread*.58;
        const px=tip[0]+Math.cos(angle)*radius,pz=tip[2]+Math.sin(angle)*radius;
        const py=tip[1]+(randomPlant()-.5)*spread*.58;
        canopySprays.push([px,py-size*.37,pz,size,size*.79,angle, (arm+j)%4,.26+randomPlant()*.74,spread*(randomPlant()-.48)*.34]);
      }
      activeFinish=6;
      for(let j=0;j<physicalLeaves;j++) {
        const angle=theta+j*2.399;
        const radius=Math.sqrt(randomPlant())*spread*.64;
        leaf(tip[0]+Math.cos(angle)*radius,tip[1]+(randomPlant()-.5)*spread*.51,
          tip[2]+Math.sin(angle)*radius,angle,.19+spread*.13,.048+spread*.019,-.12,fernColors[j%4]);
      }
      activeFinish=15;
    }
    activeFinish=0;
  }
  for (const tree of authoredDock ? dockTrees : dockTrees.slice(0,1)) coastalTree(...tree);
  // Low shore terraces carry the planting right up to the dock-side architecture.
  activeFinish = 2;
  for (const [x,z,r,depth] of [[-7.5,20.0,4.81,.44],[7.3,20.68,4.05,.39]]) {
    shell(x,z,[[.015,r],[.026,r],[.026,0]],'#cab18d',56,depth);
    shell(x,z,[[.018,r+.04],[.041,r+.025],[.041,r-.044]],'#debf93',56,depth);
  }
  const beds=[[-11.2,20.25,1.76,.56],[-5.28,20.91,1.52,.48],
    [4.28,21.36,1.48,.52],[10.4,21.14,1.62,.44],[-12.7,16.75,1.41,.48],
    [-8.61,20.48,1.02,.48],[7.53,21.31,1.24,.42],[4.68,17.23,.91,.49],
    ...(authoredDock ? dockPalms.map(([x,z])=>[x,z,.86,.64]) : [])]
    .map(([x,z,r,depth])=>[x,authoredDock ? Math.min(z,dockShoreEdge(x)-r*depth-.51) : z,r,depth]);
  for (const [x,z,r,depth] of beds) {
    shell(x,z,[[.022,r-.08],[.26,r],[.32,r+.04],[.35,r-.02],[.35,r-.12]],'#d1b891',40,depth);
    shell(x,z,[[.31,r-.12],[.31,0]],'#554f37',40,depth);
  }
  activeFinish = 6;
  for (const [x,z,r,depth] of beds) {
    for (let tuft=0;tuft<13;tuft++) {
      const theta=tuft*2.399;
      const spread=Math.sqrt(randomPlant())*(r-.19);
      const px=x+Math.cos(theta)*spread,pz=z+Math.sin(theta)*spread*depth;
      for (let j=0;j<8;j++) {
        const long=.21+randomPlant()*.46;
        leaf(px,.33,pz,theta+j*2.399,long,.05+randomPlant()*.055,
          .18+randomPlant()*.54,tuft%5===0 ? '#a35143' : fernColors[j%4]);
      }
    }
  }
  if (authoredDock) for (const [x,z,height,lean] of dockPalms) {
    const base=[x,.30,z], bend=[x+lean*.37,height*.57,z-.09], crown=[x+lean,height+.27,z-.23];
    activeFinish=15;
    taper(base,bend,.124,.085,'#806447');
    taper(bend,crown,.085,.069,'#93754c');
    activeFinish=6;
    for (let arm=0;arm<9;arm++) {
      const angle=arm*Math.PI*2/9+lean;
      const reach=1.02+.50*(.5+.5*Math.sin(arm*2.35));
      const tip=-.22-.25*(.5+.5*Math.cos(arm*2.51));
      const frondColor=fernColors[(arm+1)%4];
      leaf(...crown,angle,reach,.067,tip,frondColor);
      for (let pin=1;pin<8;pin++) {
        const t=pin/8;
        const px=crown[0]+Math.cos(angle)*reach*t,pz=crown[2]+Math.sin(angle)*reach*t;
        const py=crown[1]+tip*t+reach*.34*Math.sin(t*Math.PI);
        const length=.089+Math.sin(t*Math.PI)*reach*.29;
        for (const side of [-1,1]) leaf(px,py,pz,angle+side*.81,length,.038,-.10,fernColors[(pin+arm)%4]);
      }
    }
  }
  activeFinish = 2;
  const landingStart=14.92, landingLength=7.16;
  const landingArc=z=>Math.sin(Math.PI*(z-landingStart)/landingLength);
  const landingCurve=z=>1.12*landingArc(z);
  const landingWidth=z=>1.79+.43*landingArc(z);
  const landingHeight=z=>.047+.106*Math.max(0,Math.min(1,(z-20.70)/.65));
  for (let i=0;i<32;i++) {
    const z=landingStart+i*landingLength/32, next=z+landingLength/32;
    const x=landingCurve(z), nx=landingCurve(next), width=landingWidth(z), nextWidth=landingWidth(next);
    const y=landingHeight(z), ny=landingHeight(next);
    quad([x-width,y,z],[nx-nextWidth,ny,next],[nx+nextWidth,ny,next],[x+width,y,z],
      i%3===0?'#cfb799':'#d9c0a0',false);
    quad([x-.315,y+.003,z],[nx-.315,ny+.003,next],[nx+.315,ny+.003,next],[x+.315,y+.003,z],'#698b7a',false);
    for (const side of [-1,1]) {
      const edge=x+side*(width+.028),nextEdge=nx+side*(nextWidth+.028);
      quad([edge-.041,y+.008,z],[nextEdge-.041,ny+.008,next],[nextEdge+.041,ny+.008,next],[edge+.041,y+.008,z],'#bc9a72',false);
    }
  }
  activeFinish = 9;
  for(let i=0;i<31;i++) {
    const z=landingStart+.18+i*.223;
    const x=landingCurve(z),y=landingHeight(z);
    for (const offset of [-.194,0,.194]) {
      shell(x+offset,z,[[y+.006,.058],[y+.016,.068],[y+.016,0]],'#bcffe5',10);
    }
  }
  activeFinish = 6;
  const [,labX,labZ] = places[2];
  const [,hubX,hubZ] = places[0];
  for (const [x,y,z] of [[labX-2.8,2.1,labZ+2.85],[labX+2.75,2.1,labZ+2.93],
      [hubX-2.64,4.38,hubZ+1.89],[hubX+1.92,4.33,hubZ+2.76]]) {
    for(let strand=0;strand<8;strand++) {
      const dx=(strand-3.5)*.15;
      const length=.48+randomPlant()*.52;
      for(let j=0;j<8;j++) {
        const t=j/8, px=x+dx+Math.sin(t*6+strand)*.10;
        leaf(px,y-t*length,z+.10*t,j%2 ? .75 : 2.32,.16+randomPlant()*.11,.054,-.12,
          ['#466839','#6b8a45','#7a964c'][j%3]);
      }
    }
  }
  // Offset ledges and tilted upper faces give the coast a continuous basalt shelf.
  function rockShelf(x,y,z,width,length,height,angle,bank=false) {
    const outline=Array.from({length:11},(_,i)=>{
      const theta=(i+.38*randomPlant())*Math.PI*2/11;
      return [Math.cos(theta)*(.78+randomPlant()*.33),Math.sin(theta)*(.84+randomPlant()*.26),randomPlant()-.5];
    });
    const layers=bank
      ? [[0,1.13],[.23,1.02],[.47,.89],[.66,.76],[.87,.58],[1,.44]]
      : [[0,.89],[.18,1.02],[.56,.95],[.70,.82],[.94,.75],[1,.58]];
    const turnX=Math.cos(angle),turnZ=Math.sin(angle);
    function edge(index,layer) {
      const [u,v,cut]=outline[index%outline.length], [level,scale]=layers[layer];
      const across=u*width*scale-level*width*.12, forward=v*length*scale;
      return [x+across*turnX-forward*turnZ,y+height*(level+cut*.27+u*.11),z+across*turnZ+forward*turnX];
    }
    const stone=['#7e756b','#716e65','#908473','#776b60','#696966'];
    const rings=layers.map((_,level)=>outline.map((_,i)=>edge(i,level)));
    activeFinish=bank ? 16 : 3;
    for(let layer=0;layer<layers.length-1;layer++) for(let i=0;i<outline.length;i++) {
      const next=(i+1)%outline.length;
      quad(rings[layer][next],rings[layer][i],rings[layer+1][i],rings[layer+1][next],stone[(i+layer*2)%stone.length]);
    }
    const peak=[x-width*.12*turnX,y+height*.96,z-width*.12*turnZ];
    const rim=rings[rings.length-1];
    for(let i=0;i<rim.length;i++) tri(peak,rim[(i+1)%rim.length],rim[i],stone[(i+3)%stone.length],true);
    return {peak,rim,rings};
  }
  // The gaps between these groups expose the shallow basin from the boardwalk.
  const tideShelves=[
    [-3.72,24.00,1.13,.70,1.31,-.18],[-5.14,23.89,1.02,.67,1.07,.28],
    [-7.76,24.26,1.42,.93,1.45,-.17],[-9.23,24.77,1.29,.71,.86,-.31],
    [-12.47,23.90,1.70,1.06,1.30,.14],[-14.16,24.20,1.12,.66,.79,.22],
    [-6.60,28.10,1.19,.61,.49,-.33],[-10.84,27.94,1.38,.72,.55,.15],
    [3.63,24.11,.97,.73,1.38,.12],[4.91,24.51,1.02,.71,.96,-.14],
    [7.68,23.98,1.24,.72,1.57,.23],[9.17,24.28,1.19,.84,1.12,-.28],
    [11.47,24.03,1.48,.85,1.36,.19],[13.25,24.31,1.07,.67,.84,.29],
    [5.85,27.22,1.12,.66,.51,-.37],[10.48,26.68,1.23,.66,.57,.18],
  ];
  const breakerShelves=[];
  for (const [x,bankZ,width,length,height,angle] of tideShelves) {
    const z=bankZ-shoreInset(x);
    const shelf=rockShelf(x,-2.80,z,width,length,height+.14,angle);
    breakerShelves.push([shelf.rings,randomPlant(),height]);
    if (height>1.10) {
      const outerZ=z+length*.74;
      const ledge=rockShelf(x+width*.27,-2.72,outerZ,width*.48,length*.53,.52,-angle-.23);
      breakerShelves.push([ledge.rings,randomPlant(),.52]);
    }
  }
  activeFinish = 5;
  for (const x of [-9.48,-6.0,5.9,9.4]) {
    const z=23.31-shoreInset(x);
    box(x,-.57,z,.115,.20,.065,'#ffd289');
    shell(x,z,[[-.39,.129],[-.32,.14],[-.32,0]],'#d79852',16,.60);
  }
  // Higher overlapping shelves carry the treeline behind both arrival buildings.
  const headlandShelves=[
    [-20.68,-2.50,14.95,2.51,3.12,3.40,-.16],[-21.21,-1.30,11.42,2.72,3.35,3.53,-.20],
    [-21.75,.15,7.10,3.16,4.52,3.23,-.24],[-22.84,.99,3.40,3.77,4.83,3.65,.12],
    [-25.49,-.98,-2.61,5.1,4.12,6.21,.23],[-30.31,-2.56,-.47,3.78,3.05,9.54,-.18],
    [21.10,-2.46,16.11,2.32,3.50,3.35,.14],
    [21.93,-1.40,12.24,3.24,3.83,3.94,-.20],[23.81,.14,8.54,4.10,3.40,4.20,-.09],
    [22.81,1.88,3.38,3.97,4.91,4.50,-.14],[23.64,3.92,-2.85,4.72,5.19,4.38,-.12],
  ];
  const nearRoofs=headlandShelves.map(shelf=>rockShelf(...shelf,true));
  function onShelf({peak,rim},corner,distance,across) {
    const a=rim[corner%rim.length], b=rim[(corner+1)%rim.length];
    return peak.map((v,i)=>v+(a[i]+(b[i]-a[i])*across-v)*distance);
  }
  function onSlope({rings},tier,corner,across,up) {
    const lo=rings[tier],hi=rings[tier+1],next=(corner+1)%lo.length;
    const a=lo[corner],b=lo[next],c=hi[corner],d=hi[next];
    return across+up<=1
      ? a.map((v,i)=>v+(b[i]-v)*across+(c[i]-v)*up)
      : d.map((v,i)=>v+(b[i]-v)*(1-up)+(c[i]-v)*(1-across));
  }
  const shoreShrubs=[];
  activeFinish = 6;
  for(const roof of nearRoofs) {
    for(let j=0;j<25;j++) {
      const a=j*2.399;
      const [px,py,pz]=onShelf(roof,j,.20+Math.sqrt(randomPlant())*.74,randomPlant());
      for(let k=0;k<3;k++) leaf(px,py,pz,a+k*1.26,.28+randomPlant()*.55,.08+randomPlant()*.05,
        .25+randomPlant()*.36,fernColors[(j+k)%4]);
      shoreShrubs.push([px,py,pz,.63+randomPlant()*.64,.46+randomPlant()*.54,a,j%4,.38+randomPlant()*.53]);
    }
  }
  for (const [i,height,spread,leanX,leanZ] of [[1,2.27,1.23,.44,-.19],[2,2.58,1.33,.35,.16],
    [3,2.78,1.41,-.38,.17],[7,4.05,1.98,-.26,-.15],[8,4.47,2.24,-.34,.22],
    [9,3.81,1.87,-.31,.08],[10,3.37,2.18,-.18,.29]]) {
    coastalTree(...onShelf(nearRoofs[i],i,.21,.47),height,spread,leanX,leanZ);
  }
  // Root shrubs in the actual slope faces as well as across the crests.
  for (const roof of [...nearRoofs.slice(0,5),...nearRoofs.slice(7)]) {
    for (const tier of [1,2,3,4]) for (let corner=1;corner<=5;corner++) {
      const [x,y,z]=onSlope(roof,tier,corner,.18+randomPlant()*.64,.32+randomPlant()*.59);
      if (y<.27) continue;
      const width=1.05+randomPlant()*1.13;
      const facing=(randomPlant()-.5)*1.38;
      canopySprays.push([x,y-.20,z+.17,width,width*.70,facing,tier%4,.32+randomPlant()*.57,.25]);
      if ((corner+tier)%2===0) {
        shoreShrubs.push([x+.32,y-.07,z+.31,width*.72,width*.54,facing+1.1,0,.64]);
      }
    }
  }
  // This rolling coast is outside the walkable island and frames the dock's skyline.
  const ridgePeaks=[
    [1.0,-33.4,13.6,11.4,8.9],[10.4,-35.5,18.3,12.5,11.3],
    [20.4,-38.0,20.8,12.0,13.7],[31.2,-41.8,24.2,12.2,14.5],[37.2,-46.3,16.4,9.1,10.8],
    [.2,-28.5,6.3,8.9,4.6],[9.8,-28.8,9.1,8.2,5.3],[19.7,-31.1,11.7,9.3,6.8],
  ];
  function ridgeHeight(x,z) {
    let peak=0,overlap=0;
    for (const [cx,cz,height,width,depth] of ridgePeaks) {
      const falloff=Math.max(0,1-((x-cx)/width)**2-((z-cz)/depth)**2);
      const lift=height*falloff**1.42;
      peak=Math.max(peak,lift);
      overlap+=lift;
    }
    const folds=1+.038*Math.sin(x*.83+z*.43)+.031*Math.cos(z*1.08-x*.29);
    return -2.79+(peak*.88+overlap*.14)*folds;
  }
  const ridge={rings:Array.from({length:21},(_,row)=>Array.from({length:29},(_,col)=>{
    const x=-14+col*2.23,z=-60.4+row*1.89;
    return [x,ridgeHeight(x,z),z];
  }))};
  const ridgeStone=['#888570','#807f6b','#85826d','#7e8069'];
  activeFinish = 16;
  for (let row=0;row<ridge.rings.length-1;row++) {
    const lo=ridge.rings[row],hi=ridge.rings[row+1];
    for (let col=0;col<lo.length-1;col++) {
      quad(lo[col+1],lo[col],hi[col],hi[col+1],ridgeStone[(col+row*3)%ridgeStone.length]);
    }
  }
  for (let row=1;row<ridge.rings.length-1;row++) for (let col=1;col<ridge.rings[row].length-1;col++) {
    const [x,y,z]=onSlope(ridge,row,col,.17+randomPlant()*.63,.17+randomPlant()*.65);
    if (y<.37) continue;
    const width=1.38+randomPlant()*1.39;
    const angle=(randomPlant()-.5)*1.92;
    canopySprays.push([x,y-.23,z,width,width*.69,angle,(row+col)%4,.40+randomPlant()*.56,.30]);
    if ((row+col)%3!==0) {
      canopySprays.push([x+.39,y-.13,z-.24,width*.91,width*.58,angle+1.49,2,.63,-.16]);
    }
    const lowerGrove=z>-35.4 && x<24 && y<12.0;
    if (lowerGrove) {
      shoreShrubs.push([x+.54,y-.26,z+.42,width*1.13,width*.54,angle+.55,1,.55+randomPlant()*.29]);
    }
    const treeSpacing=lowerGrove ? 5 : 8;
    if ((row+2*col)%treeSpacing===0 && y>1.1) {
      const height=lowerGrove ? 2.05+randomPlant()*1.52 : 2.66+randomPlant()*2.14;
      coastalTree(x,y-.04,z,height,1.68+randomPlant()*.94,-.29,.14);
    }
  }
  // Lower rock terraces and their trees stand in front of the high ridge canopy.
  for (const [row,col,width,length,height] of [[17,5,1.46,.91,.83],[17,7,1.72,1.16,1.04],
    [16,9,1.98,1.29,1.25],[17,11,1.73,1.20,.99],[16,13,2.18,1.24,1.15],[17,15,1.94,1.26,1.18]]) {
    const [x,y,z]=onSlope(ridge,row,col,.57,.51);
    if (y<.25) continue;
    const terrace=rockShelf(x,y-.49,z,width,length,height,.10-.09*(col%3));
    coastalTree(...onShelf(terrace,col,.27,.54),2.42+.34*(col%4),1.45+.16*(col%3),.26,-.16);
    for (let shrub=0;shrub<8;shrub++) {
      const [px,py,pz]=onShelf(terrace,shrub,.51+randomPlant()*.39,.31+randomPlant()*.38);
      shoreShrubs.push([px,py-.05,pz,.98,.63,shrub*2.399,shrub%4,.59+randomPlant()*.30]);
    }
  }
  activeFinish = 0;
  function mesh() {
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    const count=vertices.length/7;
    vertices=[];
    return {buffer,count};
  }
  const island=mesh();
  // Intersect each rock with the water, then build a strip for the advancing crest and backwash.
  function addBreaker(rings,phase,height) {
    const waterY=-2.5;
    const waterline=rings[0].map((base,i)=>{
      let lower=base;
      if (lower[1]>=waterY) return lower;
      for (let tier=1;tier<rings.length;tier++) {
        const upper=rings[tier][i];
        if (upper[1]>=waterY) {
          const mix=(waterY-lower[1])/(upper[1]-lower[1]);
          return lower.map((v,axis)=>v+(upper[axis]-v)*mix);
        }
        lower=upper;
      }
      return lower;
    });
    const corners=waterline.length;
    const bands=10;
    const grid=waterline.map(([x,,z],i)=>{
      const back=waterline[(i+corners-1)%corners],front=waterline[(i+1)%corners];
      const dx=front[0]-back[0],dz=front[2]-back[2];
      const inverse=1/Math.max(.001,Math.hypot(dx,dz));
      const nx=dz*inverse,nz=-dx*inverse;
      const exposure=.25+.75*(.5+.5*nz)**1.62;
      const spread=(.73+.38*height)*(.57+.60*exposure)*(.94+.11*Math.sin(i*2.19+phase*6.28));
      const frontPhase=phase+.052*Math.sin(i*2.398+phase*6.28);
      return Array.from({length:bands+1},(_,band)=>{
        const run=band/bands;
        const reach=run*spread-.048;
        return [x+nx*reach,waterY,z+nz*reach,run,frontPhase,exposure,19];
      });
    });
    for (let i=0;i<corners;i++) {
      const a=grid[i],b=grid[(i+1)%corners];
      for (let j=0;j<bands;j++) vertices.push(...a[j],...b[j],...b[j+1],...a[j],...b[j+1],...a[j+1]);
    }
  }
  for (const breaker of breakerShelves) addBreaker(...breaker);
  const breakers=mesh();
  // The atlas cards add fine fronds and blooms to the existing three-dimensional plant beds.
  // Their UVs occupy the pigment slot and are only sampled by the cutout finish.
  function plantCard(x,y,z,width,height,angle,atlas,variation,lean=0,finish=13) {
    const dx=Math.cos(angle)*width*.5,dz=Math.sin(angle)*width*.5;
    const u=(atlas%2)*.5,v=atlas<2?.5:0;
    const lx=Math.sin(angle)*lean,lz=-Math.cos(angle)*lean;
    const a=[x-dx,y,z-dz,u+.008,v+.012,variation,finish];
    const b=[x+dx,y,z+dz,u+.492,v+.012,variation,finish];
    const c=[x+dx+lx,y+height,z+dz+lz,u+.492,v+.488,variation,finish];
    const d=[x-dx+lx,y+height,z-dz+lz,u+.008,v+.488,variation,finish];
    vertices.push(...a,...b,...c,...a,...c,...d);
  }
  for (const [cx,cz,r,depth] of beds) for(let i=0;i<13;i++) {
    const angle=i*2.399;
    const distance=Math.sqrt(randomPlant())*(r-.29);
    const x=cx+Math.cos(angle)*distance,z=cz+Math.sin(angle)*distance*depth;
    const width=.58+randomPlant()*.48,height=.49+randomPlant()*.45;
    for(const turn of [0,Math.PI*.48]) {
      plantCard(x,.29,z,width,height,angle+turn,i%4,.60+randomPlant()*.40);
    }
  }
  for (const shrub of shoreShrubs) plantCard(...shrub);
  for (const spray of canopySprays) plantCard(...spray,14);
  if (authoredDock) for (const [x,z,angle] of [[-5.56,20.63,.24],[4.35,21.28,.93],[10.12,20.78,1.67]]) {
    plantCard(x,.29,z,1.09,1.14,angle,2,.88,.18);
    plantCard(x+.29,.30,z-.06,1.25,.94,angle+1.58,0,.80,-.16);
  }
  const plantDetails=mesh();
  // Furnishings are visible through the arrival glazing from the walkable exterior.
  let panes = null;
  let furnishings = null;
  if (litArrival) {
    const [,lx,lz] = places[2];
    const [,hx,hz] = places[0];
    function ceilingLamp(x,z,y,r,ratio) {
      activeFinish = 4;
      shell(x,z,[[y+.067,r],[y+.024,r+.028],[y-.027,r+.008],[y-.027,r-.13],[y+.067,r-.13]],'#92704f',40,ratio);
      activeFinish = 17;
      shell(x,z,[[y-.013,r+.010],[y-.051,r-.020],[y-.051,r-.109],[y-.016,r-.128]],'#ffce88',40,ratio);
      activeFinish = 0;
    }
    activeFinish = 18;
    const archFace = (theta,width,height,z) => [lx+width*Math.cos(theta),1.88+height*Math.sin(theta),lz+z];
    for(let j=0;j<44;j++) {
      const a=j*Math.PI/44,b=(j+1)*Math.PI/44;
      const inner=theta=>archFace(theta,1.72,1.76,3.67);
      const outer=theta=>archFace(theta,2.08,2.08,3.64);
      const bevel=theta=>archFace(theta,2.17,2.17,3.57);
      quad(inner(a),inner(b),outer(b),outer(a),'#f1d8ad');
      quad(outer(a),outer(b),bevel(b),bevel(a),'#dcb988');
    }
    shell(hx,hz,[[3.89,3.88],[4.03,4.05],[4.37,4.20],[4.56,4.23],[4.70,4.12]],'#e9c797',64,.78,
      theta=>Math.sin(theta)<-.10);
    shell(hx,hz,[[.57,3.95],[.65,4.01],[.76,4.00],[.81,3.92]],'#e4bd91',56,.79,
      theta=>Math.sin(theta)<-.12);
    // Both arch inlays follow the actual imported portal profile.
    for (const [width,height,z,finish,color] of [
      [1.73,1.76,lz+3.75,9,'#a3f2d8'],
      [1.86,1.91,lz+3.71,17,'#ffbc68'],
    ]) {
      activeFinish = finish;
      const archPoint=theta=>[lx+width*Math.cos(theta),1.88+height*Math.sin(theta),z];
      for(let j=0;j<44;j++) {
        taper(archPoint(j*Math.PI/44),archPoint((j+1)*Math.PI/44),.031,.031,color);
      }
    }
    activeFinish = 0;

    shell(lx,lz,[[.51,4.62],[.63,4.62],[.63,0]],'#c59e6a',48,.88);
    activeFinish = 2;
    shell(lx,lz,[[.62,4.18],[2.34,4.18]],'#c8a778',48,.82,theta=>Math.sin(theta)>-.18);
    for (let j=0;j<12;j++) {
      const theta=Math.PI+(j+.5)*Math.PI/12;
      const x=lx+Math.cos(theta)*3.81,z=lz+Math.sin(theta)*3.25;
      box(x,.65,z,.049,1.66,.049,'#9e805f');
    }
    activeFinish = 0;

    const labPortal = theta => Math.sin(theta)>.91;
    shell(lx,lz,[[2.34,4.67],[2.52,4.67],[2.52,4.42]],'#d8b586',48,.88,labPortal);
    activeFinish = 4;
    shell(lx,lz,[[2.385,4.70],[2.44,4.70]],'#a97843',48,.88,labPortal);
    activeFinish = 0;
    for (let j=0;j<24;j++) {
      const theta = j*Math.PI/12;
      const x=lx+Math.cos(theta)*4.61,z=lz+Math.sin(theta)*3.72;
      if (z>lz+2.9 && Math.abs(x-lx)<1.68) continue;
      box(x,.58,z,.055,1.80,.055,'#725b45');
    }
    activeFinish = 5;
    shell(lx,lz,[[2.47,4.40],[2.53,4.40]],'#ffcc7a',48,.89);
    shell(lx,lz,[[3.17,2.21],[3.22,2.21]],'#ffdca3',40);
    for (const side of [-1,1]) box(lx+side*1.61,.70,lz+3.66,.032,1.16,.036,'#eabd76');
    activeFinish = 0;
    ceilingLamp(lx,lz+.57,2.49,1.90,.85);
    ceilingLamp(lx,lz+.38,2.64,1.18,.86);
    shell(lx,lz,[[.58,.86],[.99,.70],[.99,0]],'#a3784c',32);
    shell(lx,lz,[[1.38,.03],[1.54,.36],[1.90,.51],[2.27,.31],[2.40,0]],'#60edd3',28);
    for (const offset of [-1.9,1.9]) {
      const x=lx+offset;
      box(x,.59,lz-.44,.72,.53,.32,'#a47852');
      box(x,1.10,lz-.44,.76,.06,.34,'#e0b579');
      box(x,.63,lz+1.43,.58,.31,.27,'#4d8076');
    }
    shell(hx,hz,[[.65,3.78],[.74,3.78],[.74,0]],'#bf9874',48,.83);
    activeFinish = 2;
    shell(hx,hz,[[.73,3.54],[4.16,3.54]],'#b38a63',48,.79,theta=>Math.sin(theta)>-.07);
    for(let j=0;j<14;j++) {
      const theta=Math.PI+(j+.5)*Math.PI/14;
      const x=hx+Math.cos(theta)*3.44,z=hz+Math.sin(theta)*2.70;
      box(x,.76,z,.039,3.18,.039,'#aa8156');
    }
    activeFinish = 0;

    activeFinish = 5;
    shell(hx,hz,[[4.12,3.68],[4.22,3.68]],'#ffd194',48,.83);
    shell(hx,hz,[[.79,3.75],[.82,3.75]],'#ffe0a1',48,.83);
    shell(hx,hz,[[3.77,3.80],[3.81,3.80]],'#fbd798',48,.83);
    shell(hx,hz,[[3.55,1.44],[3.57,1.48],[3.61,1.44]],'#ffcd83',36,.79);
    // A bright recessed line under the hub's outer fascia follows the glass bays.
    activeFinish = 17;
    shell(hx,hz,[[3.969,4.068],[4.014,4.107],[4.050,4.116]],'#ffd498',64,.789,theta=>Math.sin(theta)<-.11);
    activeFinish = 0;
    ceilingLamp(hx-.17,hz+.33,3.49,2.42,.82);
    ceilingLamp(hx-.17,hz+.33,3.67,1.54,.82);
    for (const offset of [-1.5,0,1.5]) {
      box(hx+offset,.59,hz+.78,.45,.57,.25,'#b88452');
      box(hx+offset,1.14,hz+.78,.51,.07,.27,'#edba80');
    }
    const rearSeating = theta => Math.sin(theta)>-.36;
    activeFinish = 18;
    shell(hx,hz,[[.70,2.97],[1.03,2.97],[1.03,2.52],[.70,2.52]],'#e9c99f',40,.81,rearSeating);
    activeFinish = 0;
    shell(hx,hz,[[1.035,2.94],[1.16,2.92],[1.16,2.55],[1.04,2.52]],'#4f887b',40,.81,rearSeating);
    for (const offset of [-1.41,1.23]) {
      activeFinish = 4;
      shell(hx+offset,hz+.62,[[2.75,.019],[3.61,.019]],'#a97a52',8);
      activeFinish = 17;
      shell(hx+offset,hz+.62,[[2.60,0],[2.60,.104],[2.69,.185],[2.81,.115],[2.87,.038]],'#ffd58f',20);
    }
    activeFinish = 0;
    furnishings=mesh();
    shell(lx,lz,[[.60,4.63],[2.37,4.63]],['#37647b','#47768a'],60,.80,labPortal);
    panes=mesh();
  }
  function decodeMesh(bytes) {
    const packed = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const stride = typeof southDockVertexStride === 'number' ? southDockVertexStride : 9;
    const count = bytes.length / stride;
    if (!Number.isInteger(count)) throw Error('Invalid South Dock mesh export');
    const unpacked = new Float32Array(count * 7);
    for (let i = 0; i < count; i++) {
      for (let axis = 0; axis < 3; axis++) {
        unpacked[i*7+axis] = packed.getInt16(i*stride+axis*2,true) / 500;
        unpacked[i*7+3+axis] = bytes[i*stride+6+axis] / 255;
      }
      if (stride>9) unpacked[i*7+6] = bytes[i*stride+9];
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,unpacked,gl.STATIC_DRAW);
    return {buffer,count};
  }
  const dock = authoredDock ? decodeMesh(assets.southDockVertices) : null;
  const buildings = authoredBuildings ? decodeMesh(assets.arrivalBuildings) : null;
  const windows = assets.arrivalGlass?.length ? decodeMesh(assets.arrivalGlass) : null;
  const explorer = assets.explorerBody?.length
    ? {body:decodeMesh(assets.explorerBody),legs:[decodeMesh(assets.explorerLeft),decodeMesh(assets.explorerRight)],
      arms:assets.explorerLeftArm?.length ? [decodeMesh(assets.explorerLeftArm),decodeMesh(assets.explorerRightArm)] : []} : null;
  function bakeShadows() {
    const size = Math.min(1536,gl.getParameter(gl.MAX_TEXTURE_SIZE));
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,size,size);
    const target = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
    if (complete) {
      const pass = createProgram(`
        attribute vec3 point;
        ${lightProjection}
        void main(){gl_Position=vec4(inLight(point),1.);}
      `,`
        precision highp float;
        void main(){
          vec2 encoded = fract(min(.99999,gl_FragCoord.z)*vec2(1.,255.));
          encoded.x -= encoded.y/255.;
          gl_FragColor=vec4(encoded,0.,1.);
        }
      `);
      gl.disable(gl.DITHER);
      gl.useProgram(pass);
      for (const [name,value] of Object.entries(lightAxes)) gl.uniform3fv(gl.getUniformLocation(pass,name),value);
      gl.viewport(0,0,size,size);
      gl.clearColor(1,1,1,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const position = gl.getAttribLocation(pass,'point');
      gl.enableVertexAttribArray(position);
      for (const caster of [island,dock,buildings,furnishings]) {
        if (!caster) continue;
        gl.bindBuffer(gl.ARRAY_BUFFER,caster.buffer);
        gl.vertexAttribPointer(position,3,gl.FLOAT,false,28,0);
        gl.drawArrays(gl.TRIANGLES,0,caster.count);
      }
      gl.useProgram(program);
      gl.deleteProgram(pass);
      gl.enable(gl.DITHER);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.deleteFramebuffer(target);
    gl.deleteRenderbuffer(depth);
    gl.uniform1f(uniforms.hasShadows,complete ? 1 : 0);
    gl.uniform2f(uniforms.shadowStep,1/size,1/size);
    gl.uniform1i(uniforms.shadowMap,0);
    return texture;
  }
  const shadowTexture = bakeShadows();
  function sceneTexture(url,unit,repeat=false) {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0+unit);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    const result={texture,unit,ready:false};
    const source=new Image();
    source.onload=()=>{
      try {
        gl.activeTexture(gl.TEXTURE0+unit);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
        if (repeat) {
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        }
        result.ready=true;
        canvas.dispatchEvent(new Event('material-ready'));
      } catch (error) {
        console.warn('Dock texture unavailable; using procedural material',error);
      } finally {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      }
    };
    source.src=url;
    return result;
  }
  const materials=[
    sceneTexture('dock-masonry.jpg',1,true),
    sceneTexture('dock-plant-atlas.webp',2),
    sceneTexture('coastal-sunset.jpg',3),
    sceneTexture('dock-canopy-atlas.webp',4),
    sceneTexture('dock-basalt.jpg',5,true),
  ];
  gl.uniform1i(uniforms.stoneMap,1);
  gl.uniform1i(uniforms.plantMap,2);
  gl.uniform1i(uniforms.sunsetMap,3);
  gl.uniform1i(uniforms.canopyMap,4);
  gl.uniform1i(uniforms.basaltMap,5);
  function pilot(color) {
    shell(0,0,[[.46,.31],[1.04,.34],[1.11,.24]],color,16,.65);
    shell(0,0,[[1.1,.2],[1.23,.255],[1.49,.25],[1.56,.15],[1.58,0]],cream,18,.91);
    box(0,1.26,.19,.18,.14,.045,slate);
    box(0,.59,.19,.19,.40,.10,'#8f7859');
    box(0,.66,.29,.13,.22,.022,color);
    box(-.35,.49,0,.085,.49,.105,color);
    box(.35,.49,0,.085,.49,.105,color);
    return mesh();
  }
  const pilots={'#a6f5cf':pilot('#a6f5cf'),'#ffc27c':pilot('#ffc27c')};
  box(0,.04,0,.105,.44,.103,'#23374a');
  box(0,0,-.04,.116,.12,.164,'#253b42');
  const leg=mesh();
  function render(mesh,offset,heading=0,warmSuit=0,limbSwing=0,glaze=0,limbPivot=.87,pose=null) {
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
    attributes.forEach((loc,i)=>{
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc,i===2 ? 1 : 3,gl.FLOAT,false,28,i*12);
    });
    gl.uniform3fv(uniforms.offset,offset);
    gl.uniform1f(uniforms.heading,heading);
    gl.uniform1f(uniforms.warmSuit,warmSuit);
    gl.uniform1f(uniforms.limbSwing,limbSwing);
    gl.uniform1f(uniforms.limbPivot,limbPivot);
    gl.uniform1f(uniforms.glaze,glaze);
    gl.uniform1f(uniforms.stanceSide,pose ? pose.side : 0);
    if (pose) {
      gl.uniform2fv(uniforms.hipPose,pose.hip);
      gl.uniform2fv(uniforms.kneePose,pose.knee);
      gl.uniform2fv(uniforms.anklePose,pose.ankle);
    }
    gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }
  function legPose(side,phase,swingSide,hipHeight,strideDistance) {
    const swinging = side === swingSide;
    const ease = phase*phase*(3-2*phase);
    // The stance boot moves backwards by the same distance the explorer moves forwards.
    const ankle = [.123+(swinging ? Math.sin(phase*Math.PI)*.105 : 0),
      (swinging ? .5-ease : phase-.5)*strideDistance];
    const hip = [hipHeight,0];
    const dy=ankle[0]-hip[0],dz=ankle[1]-hip[1];
    const reach=Math.hypot(dy,dz);
    const upper=.424, lower=.35;
    const joint=Math.min(upper,(upper*upper-lower*lower+reach*reach)/(2*reach));
    const bend=Math.sqrt(Math.max(0,upper*upper-joint*joint));
    const knee=[hip[0]+dy*joint/reach-dz*bend/reach,hip[1]+dz*joint/reach+dy*bend/reach];
    return {side,hip,knee,ankle};
  }
  // The shadow is an alpha falloff on the deck under the animated player.
  activeFinish = 11;
  const shadeCenter = [.53,0,.35];
  const shadowPoint = angle => [
    shadeCenter[0]+.94*.83*Math.cos(angle)-.25*.55*Math.sin(angle),
    0,shadeCenter[2]+.94*.55*Math.cos(angle)+.25*.83*Math.sin(angle),
  ];
  for(let i=0;i<32;i++) {
    tri(shadeCenter,shadowPoint(i*Math.PI/16),shadowPoint((i+1)*Math.PI/16),'#5f503d',false);
  }
  const shadow=mesh();
  activeFinish = 7;
  box(-.010,1.068,.246,.121,.092,.021,'#907250');
  box(-.010,1.225,.261,.125,.018,.012,'#bd9b69');
  box(.068,1.104,.270,.038,.042,.008,'#4c746e');
  box(-.093,1.133,.267,.016,.053,.010,'#575b53');
  activeFinish = 9;
  box(.068,1.133,.279,.027,.008,.007,'#a1dac0');
  activeFinish = 0;
  const packDetail = mesh();
  return (avatar,overview,angle=0,stride=0,time=0)=>{
    const {width,height}=canvas.getBoundingClientRect();
    if(!width||!height) return;
    const scale=Math.min(devicePixelRatio,2);
    const w=Math.round(width*scale),h=Math.round(height*scale);
    if(canvas.width!==w||canvas.height!==h) {
      canvas.width=w;
      canvas.height=h;
    }
    gl.viewport(0,0,w,h);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const dockFraming = Math.max(0,Math.min(1,(avatar.z-16)/6));
    const distance = 7.6-3.85*dockFraming;
    const eye=overview?[10,41,49]:[avatar.x+Math.sin(angle)*distance+.63+.05*dockFraming,4.75-2.06*dockFraming,avatar.z+Math.cos(angle)*distance];
    const target=overview?[0,0,0]:[avatar.x-Math.sin(angle)*2.2-.44*dockFraming,1+.37*dockFraming,avatar.z-Math.cos(angle)*2.2];
    const forward=unit(subtract(target,eye));
    const right=unit(cross(forward,[0,1,0]));
    const up=cross(right,forward);
    for(const [name,value] of Object.entries({eye,right,up,forward})) gl.uniform3fv(uniforms[name],value);
    gl.uniform1f(uniforms.aspect,w/h);
    gl.uniform1f(uniforms.time,time);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,shadowTexture);
    for (const material of materials) {
      gl.activeTexture(gl.TEXTURE0+material.unit);
      gl.bindTexture(gl.TEXTURE_2D,material.texture);
    }
    gl.uniform4f(uniforms.loadedTextures,...materials.slice(0,4).map(material=>material.ready ? 1 : 0));
    gl.uniform1f(uniforms.hasBasalt,materials[4].ready ? 1 : 0);
    render(island,[0,0,0]);
    if (dock) render(dock,[0,0,0]);
    if (buildings) render(buildings,[0,0,0]);
    if (furnishings) render(furnishings,[0,0,0]);
    if (materials[1].ready || materials[3].ready) render(plantDetails,[0,0,0]);
    const ground = dock && Math.abs(avatar.x)<2.5*dockBridgeScale(avatar.z)
      ? .025+.135*Math.max(0,Math.min(1,(avatar.z-20.7)/.65)) : .025;
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    if (!overview) render(breakers,[0,0,0]);
    render(shadow,[avatar.x,ground+.010,avatar.z]);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    const heading = avatar.heading || 0;
    const warm = avatar.color === '#ffc27c' ? 1 : 0;
    const phase = avatar.gaitPhase ?? 0;
    const hipHeight = .846+Math.sin(phase*Math.PI)*.026;
    const bounce = explorer ? hipHeight-.88 : Math.abs(stride)*.035;
    render(explorer ? explorer.body : pilots[avatar.color],
      [avatar.x,ground+bounce,avatar.z],heading,warm);
    if (explorer) render(packDetail,[avatar.x,ground+bounce,avatar.z],heading,warm);
    for (const side of [-1,1]) {
      const index = (side+1)/2;
      const x = explorer ? 0 : side*.16;
      const z = explorer ? 0 : -side*stride*.23;
      const c = Math.cos(heading), s = Math.sin(heading);
      const footMesh = explorer ? explorer.legs[index] : leg;
      render(footMesh,[avatar.x+x*c+z*s,ground+(explorer ? 0 : Math.max(0,-side*stride)*.055),avatar.z+z*c-x*s],
        heading,warm,0,0,.87,explorer ? legPose(side,phase,avatar.swingSide ?? -1,hipHeight,avatar.strideDistance ?? .50) : null);
      if (explorer?.arms[index]) {
        render(explorer.arms[index],[avatar.x,ground+bounce,avatar.z],heading,warm,-side*stride*.21,0,1.37);
      }
    }
    if (windows) {
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      render(windows,[0,0,0],0,0,0,1);
      if (panes) render(panes,[0,0,0],0,0,0,1);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  };
}

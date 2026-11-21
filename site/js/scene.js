import * as THREE from "three";
import { figureOrigin } from "./birthday-screens.js";
import { randomFrom } from "./themes.js";
import { createSkyEffects } from "./sky-effects.js";

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const smooth = (start, end, value) => THREE.MathUtils.smoothstep(value, start, end);

function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

function lacquer(color, metalness = .22) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness: .32 });
}

function starlight(color) {
  return new THREE.MeshBasicMaterial({ color });
}

function starShape(points, inside, outside) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 2 * points; i += 1) {
    const angle = Math.PI / 2 + (i * Math.PI) / points;
    const radius = i % 2 ? inside : outside;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
}

function tube(parent, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points);
  return mesh(parent, new THREE.TubeGeometry(curve, 48, radius, 6, false), material);
}

function dispose(object) {
  const resources = new Set();
  object.traverse((child) => {
    if (child.geometry) resources.add(child.geometry);
    if (child.material) resources.add(child.material);
  });
  for (const resource of resources) resource.dispose();
  object.removeFromParent();
}

function makeEnvelope(group, colors, initial) {
  const width = 4.35;
  const height = 2.8;
  const jacket = lacquer(colors[0]);
  const dark = lacquer(new THREE.Color(colors[0]).multiplyScalar(.31));
  const edge = lacquer(new THREE.Color(colors[0]).lerp(new THREE.Color("#fff5df"), .33));
  const card = new THREE.Group();
  const flap = new THREE.Group();
  const seal = new THREE.Group();
  group.add(card, flap, seal);

  function triangle(parent, vertices, material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geometry.computeVertexNormals();
    material.side = THREE.DoubleSide;
    return mesh(parent, geometry, material);
  }

  mesh(group, new THREE.BoxGeometry(width, height, .17), dark, 0, 0, -.2);
  triangle(group, [[-width / 2, height / 2, .1], [-width / 2, -height / 2, .1], [.09, -.25, .13]], jacket);
  triangle(group, [[width / 2, -height / 2, .1], [width / 2, height / 2, .1], [-.09, -.25, .13]], dark);
  triangle(group, [[-width / 2, -height / 2, .11], [width / 2, -height / 2, .11], [0, .22, .23]], jacket);
  flap.position.set(0, height / 2, .13);
  triangle(flap, [[-width / 2, 0, 0], [0, -1.67, .16], [width / 2, 0, 0]], edge);
  seal.position.set(0, -.17, .35);
  mesh(seal, new THREE.CylinderGeometry(.31, .36, .12, 40), dark).rotation.x = Math.PI / 2;
  mesh(seal, new THREE.ShapeGeometry(starShape(4, .073, .19)), starlight(colors[3]), 0, 0, .076);
  mesh(card, new THREE.BoxGeometry(3.94, 2.41, .065), lacquer("#fff0de", .03));

  const ink = starlight(colors[0]);
  mesh(card, new THREE.ShapeGeometry(starShape(4, .13, .34)), ink, 0, .43, .038);
  // Use an untextured decorative monogram so recipient data never enters a texture.
  const monogram = new THREE.Group();
  const strokes = 3 + (initial % 3);
  for (let i = 0; i < strokes; i += 1) {
    const angle = i * TAU / strokes;
    mesh(monogram, new THREE.CircleGeometry(.035, 12), ink, Math.cos(angle) * .54, Math.sin(angle) * .54, 0);
  }
  monogram.position.set(0, .43, .039);
  card.add(monogram);
  for (let i = 0; i < 3; i += 1) mesh(card, new THREE.PlaneGeometry(1.9 - i * .34, .035), ink, 0, -.23 - i * .2, .038);
  return { card, flap, seal };
}

function makeCake(group, colors, rng) {
  const icing = lacquer("#ffe5e3", .05);
  const sponge = lacquer(colors[0], .05);
  const piping = lacquer(colors[3], .08);
  const platter = lacquer(colors[2], .38);
  const candle = lacquer(colors[1], .05);
  const flame = starlight("#fff0b6");
  const emblem = starlight(colors[3]);
  const flames = [];

  mesh(group, new THREE.CylinderGeometry(1.75, 1.43, .15, 64), platter, 0, -1.33);
  for (const [radius, height, y] of [[1.43, .73, -.87], [1.02, .56, -.2], [.65, .49, .33]]) {
    mesh(group, new THREE.CylinderGeometry(radius, radius * 1.03, height, 64), sponge, 0, y);
    mesh(group, new THREE.CylinderGeometry(radius * 1.012, radius * 1.012, .115, 64), icing, 0, y + height / 2 - .012);
    mesh(group, new THREE.TorusGeometry(radius, .043, 9, 64), piping, 0, y - height / 2 + .08).rotation.x = Math.PI / 2;
    const count = Math.round(radius * 29);
    const bead = new THREE.SphereGeometry(.065, 9, 7);
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * TAU;
      const drop = mesh(group, bead, i % 3 ? icing : piping, Math.cos(angle) * radius, y + height / 2 - .091, Math.sin(angle) * radius);
      drop.scale.y = .85 + rng() * 1.3;
    }
  }

  for (let i = 0; i < 5; i += 1) {
    const angle = i * TAU / 5;
    const x = Math.cos(angle) * .38;
    const z = Math.sin(angle) * .38;
    const height = .28 + rng() * .23;
    mesh(group, new THREE.CylinderGeometry(.038, .038, height, 12), candle, x, .63 + height / 2, z);
    const light = mesh(group, new THREE.SphereGeometry(.065, 12, 9), flame, x, .69 + height, z);
    flames.push(light);
  }
  mesh(group, new THREE.ShapeGeometry(starShape(5, .15, .27)), emblem, 0, -.17, 1.045);
  return (time) => {
    flames.forEach((flameMesh, i) => {
      flameMesh.scale.set(.68 + .13 * Math.cos(7 * time + i), 1.35 + .42 * Math.sin(9 * time + i), .7);
      flameMesh.rotation.z = .28 * Math.sin(5 * time + i);
    });
  };
}

function makeGift(group, colors) {
  const paper = lacquer(colors[0]);
  const lidPaper = lacquer(colors[2]);
  const ribbon = lacquer(colors[3], .24);
  const lid = new THREE.Group();
  group.add(lid);
  mesh(group, new THREE.BoxGeometry(2.48, 2.13, 2.17), paper, 0, -.26);
  mesh(group, new THREE.BoxGeometry(.31, 2.145, 2.19), ribbon, 0, -.26);
  mesh(group, new THREE.BoxGeometry(2.5, 2.145, .31), ribbon, 0, -.26);
  mesh(lid, new THREE.BoxGeometry(2.62, .35, 2.3), lidPaper);
  mesh(lid, new THREE.BoxGeometry(.33, .357, 2.32), ribbon);
  mesh(lid, new THREE.BoxGeometry(2.64, .357, .33), ribbon);
  for (const direction of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 20; i += 1) {
      const angle = i / 20 * TAU;
      points.push(new THREE.Vector3(direction * (1 - Math.cos(angle)) * .42, .23 + .29 * Math.sin(angle) + .24 * (1 - Math.cos(angle)), Math.sin(angle) * .26));
    }
    tube(lid, points, .065, ribbon);
  }
  const floatingStar = mesh(group, new THREE.IcosahedronGeometry(.43, 0), lacquer(colors[3], .33), 0, 1.2);
  return (time, progress) => {
    const opened = smooth(.26, .72, progress);
    lid.position.set(-.42 * opened, .96 + opened * (1.07 + .1 * Math.sin(time * 2)), -.25 * opened);
    lid.rotation.z = .29 * opened;
    floatingStar.position.y = .95 + 1.12 * opened + .16 * Math.sin(time * 3);
    floatingStar.rotation.set(time * .9, time * 1.2, .3);
    floatingStar.scale.setScalar(opened);
  };
}

function makeJewel(group, colors) {
  const shape = starShape(5, .72, 1.58);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .29, bevelEnabled: true, bevelSize: .14, bevelThickness: .17, bevelSegments: 3 });
  geometry.center();
  const jewel = mesh(group, geometry, lacquer(colors[0], .36));
  const inlay = new THREE.TorusGeometry(.31, .028, 8, 32);
  mesh(jewel, inlay, starlight(colors[3]), 0, 0, .34);
  mesh(jewel, new THREE.OctahedronGeometry(.22), lacquer(colors[3], .43), 0, 0, .39);
  const rings = [1.87, 2.17].map((radius, index) => {
    const ring = mesh(group, new THREE.TorusGeometry(radius, .012, 6, 96), starlight(colors[index + 2]));
    const satellite = mesh(ring, new THREE.OctahedronGeometry(.104), lacquer(colors[index + 1], .3), radius, 0);
    satellite.rotateZ(.5);
    return ring;
  });
  return (time) => {
    jewel.rotation.y = time * .66;
    jewel.rotation.z = Math.sin(time * 1.2) * .21;
    rings[0].rotation.set(.45, time * .47, time * .37);
    rings[1].rotation.set(-.75, time * -.38, time * -.51);
  };
}

function makeAuroraCurtain(group, color, layer) {
  const segments = 60;
  const positions = new THREE.BufferAttribute(new Float32Array((segments + 1) * 6), 3);
  const shades = new THREE.BufferAttribute(new Float32Array((segments + 1) * 6), 3);
  const geometry = new THREE.BufferGeometry();
  const tint = new THREE.Color(color);
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const falloff = Math.sin(i / segments * Math.PI);
    shades.setXYZ(i * 2, tint.r * falloff, tint.g * falloff, tint.b * falloff);
    shades.setXYZ(i * 2 + 1, tint.r * .035 * falloff, tint.g * .035 * falloff, tint.b * .035 * falloff);
    if (i < segments) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3);
  }
  geometry.setIndex(indices);
  geometry.setAttribute("position", positions);
  geometry.setAttribute("color", shades);
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: .52,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const curtain = mesh(group, geometry, material);
  curtain.frustumCulled = false;
  return (time) => {
    for (let i = 0; i <= segments; i += 1) {
      const fraction = i / segments;
      const x = (fraction - .5) * (7.6 + layer * .35);
      const wave = Math.cos(fraction * 9 - time * .76 + layer * 1.8);
      const y = .75 + wave * (.5 + layer * .12) + .26 * layer;
      const z = -1.65 + .72 * Math.cos(fraction * 8.8 + .8 * layer + time * .5);
      positions.setXYZ(i * 2, x, y, z);
      positions.setXYZ(i * 2 + 1, x + .45 * wave, y + Math.sin(fraction * Math.PI) * (1.35 + .24 * wave), z - .58);
    }
    positions.needsUpdate = true;
  };
}

function makePlanet(group, colors, rng) {
  const world = new THREE.Group();
  group.add(world);
  const planet = mesh(world, new THREE.SphereGeometry(1.18, 50, 32), lacquer(colors[2], .12));
  const bands = [colors[0], colors[1], colors[3]].map((color) => lacquer(color, .12));
  for (let i = 0; i < 13; i += 1) {
    const y = (i - 6) * .153;
    const radius = Math.sqrt(1.18 ** 2 - y ** 2);
    const stripe = mesh(planet, new THREE.TorusGeometry(radius, .018 + rng() * .064, 9, 60), bands[i % bands.length], 0, y);
    stripe.rotation.x = Math.PI / 2;
  }
  const equator = new THREE.Group();
  equator.rotation.set(1.06, -.37, -.25);
  world.add(equator);
  for (let i = 0; i < 5; i += 1) {
    const radius = 1.42 + i * .102;
    const band = new THREE.MeshBasicMaterial({
      color: colors[i % colors.length], side: THREE.DoubleSide, transparent: true, opacity: .72 - .09 * i, depthWrite: false,
    });
    mesh(equator, new THREE.RingGeometry(radius, radius + .036 + (i % 2) * .029, 90), band);
  }
  const moon = mesh(world, new THREE.IcosahedronGeometry(.235, 1), lacquer(colors[3], .28));
  const curtains = [2, 0, 1].map((color, layer) => makeAuroraCurtain(group, colors[color], layer));
  return (time) => {
    world.rotation.set(.11, time * .20, Math.sin(time * .45) * .14);
    planet.rotation.z = -.38;
    moon.position.set(Math.cos(time * 1.05) * 2.24, .53 * Math.sin(time * 1.05), Math.sin(time * 1.05) * 1.55);
    moon.rotation.y = time * .8;
    for (const curtain of curtains) curtain(time);
  };
}

function makeFireworks(group, colors, rng) {
  const core = mesh(group, new THREE.IcosahedronGeometry(.43, 0), lacquer(colors[3], .35));
  const bursts = Array.from({ length: 3 }, (_, layer) => {
    const directions = new Float32Array(58 * 3);
    const streaks = new Float32Array(58 * 6);
    const shades = new Float32Array(58 * 6);
    for (let i = 0; i < 58; i += 1) {
      const phi = i * 2.4 + layer;
      const y = 1 - (2 * (i + .5)) / 58;
      const radial = Math.sqrt(1 - y * y);
      const length = .7 + rng() * .36;
      const x = Math.cos(phi) * radial * length;
      const z = Math.sin(phi) * radial * length;
      directions.set([x, y * length, z], i * 3);
      streaks.set([x * .64, y * length * .64, z * .64, x, y * length, z], i * 6);
      const tint = new THREE.Color(colors[(i + layer) % colors.length]).convertLinearToSRGB();
      shades.set([tint.r * .19, tint.g * .19, tint.b * .19, tint.r, tint.g, tint.b], i * 6);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(streaks, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(shades, 3));
    const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .86 });
    const sparks = new THREE.LineSegments(geometry, material);
    const glitter = new THREE.BufferGeometry();
    glitter.setAttribute("position", new THREE.BufferAttribute(directions, 3));
    const glow = new THREE.PointsMaterial({ color: colors[layer], size: .071, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    sparks.add(new THREE.Points(glitter, glow));
    sparks.position.set((layer - 1) * 1.08, layer === 1 ? .18 : -.26, layer * -.12);
    group.add(sparks);
    return { sparks, material, glow };
  });
  return (time) => {
    core.rotation.set(time * .8, time * .62, time * .37);
    core.scale.setScalar(1 + .23 * Math.sin(time * 3.2));
    bursts.forEach(({ sparks, material, glow }, index) => {
      const step = (time * .43 + .22 + index * .325) % 1;
      const size = .28 + 1.73 * Math.sin(step * Math.PI / 2);
      const intensity = Math.sin(step * Math.PI) ** .63;
      sparks.scale.setScalar(size);
      sparks.rotation.set(time * .29 + index * .7, time * .24 + index, time * .17);
      material.opacity = .88 * intensity;
      glow.opacity = .96 * intensity;
    });
  };
}

function particleCloud() {
  const count = 630;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const uniforms = { uTime: { value: 0 }, uRatio: { value: 1 }, uReveal: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uRatio, uReveal;
      attribute vec3 aColor;
      attribute float aPhase, aSize;
      varying vec3 vColor;
      varying float vPulse, vShape;
      void main() {
        vec3 point = position;
        point.x += cos(uTime * .61 + aPhase) * (.10 + .22 * uReveal);
        point.y += sin(uTime * .79 + aPhase) * (.10 + .24 * uReveal);
        point.z += sin(uTime * .33 + aPhase) * .32;
        vec4 view = modelViewMatrix * vec4(point, 1.);
        vPulse = .30 + .70 * pow(.5 + .5 * sin(uTime * (1.25 + mod(aPhase, 1.)) + aPhase), 3.);
        vColor = aColor;
        vShape = aSize;
        gl_PointSize = uRatio * aSize * (13. / -view.z) * (1. + .21 * uReveal);
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vPulse, vShape;
      void main() {
        vec2 p = abs(gl_PointCoord - .5);
        float d = length(p);
        float halo = pow(max(0., 1. - 2. * d), 2.4);
        float core = 1. - smoothstep(.035, .12, d);
        float cross = pow(max(0., 1. - 2.3 * max(p.x, p.y)), 3.)
          * exp(-43. * min(p.x, p.y));
        float alpha = halo * .48 + core * .8;
        if (vShape > 7.) alpha += 1.6 * cross;
        gl_FragColor = vec4(vColor, alpha * vPulse);
      }`,
  });
  const object = new THREE.Points(geometry, material);
  object.frustumCulled = false;

  function setTheme(theme) {
    const rng = randomFrom(theme.seed);
    const palette = theme.colors.map((color) => new THREE.Color(color).convertLinearToSRGB());
    for (let i = 0; i < count; i += 1) {
      const angle = rng() * TAU;
      const radius = 1.9 + rng() * 5.5;
      const noise = (rng() - .5) * 1.8;
      let x = Math.cos(angle) * radius;
      let y = Math.sin(angle) * radius * .55 + noise;
      if (theme.orbit === "wave") y = Math.sin(x * .85 + angle) * 1.6 + noise * 2;
      if (theme.orbit === "comet") y = x * .43 + noise * (1.1 + Math.abs(x) * .23);
      if (theme.orbit === "bloom") y *= Math.cos(angle * 3) * 1.6;
      if (theme.orbit === "arch") y = y * .59 + 2 - x * x * .075;
      if (theme.orbit === "rings") y = Math.sin(angle) * radius * .43 + Math.floor(rng() * 4) - 1.5;
      if (theme.orbit === "figure8") y = Math.sin(angle * 2) * radius * .49 + noise;
      if (i % 4 === 0) {
        x = (rng() - .5) * 19;
        y = (rng() - .5) * 11;
      }
      positions.set([x, y, (rng() - .5) * 4 - 1.4], i * 3);
      palette[i % palette.length].toArray(colors, i * 3);
      phases[i] = rng() * 21;
      sizes[i] = i % 16 ? 1.7 + rng() * 4 : 8 + rng() * 9;
    }
    for (const attribute of Object.values(geometry.attributes)) attribute.needsUpdate = true;
  }
  return { object, uniforms, setTheme };
}

function confetti(scene) {
  const count = 235;
  let cursor = 0;
  let active = true;
  const particles = Array.from({ length: count }, () => ({ age: Infinity }));
  const object = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(1),
    new THREE.MeshBasicMaterial(),
    count,
  );
  object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  object.frustumCulled = false;
  const dummy = new THREE.Object3D();
  scene.add(object);

  function render(dt) {
    if (!active) return;
    active = false;
    particles.forEach((particle, i) => {
      dummy.scale.setScalar(0);
      if (particle.age < particle.life) {
        active = true;
        particle.age += dt;
        const { age, size, life, phase } = particle;
        dummy.position.set(
          particle.x + particle.vx * age,
          particle.y + particle.vy * age - age * age * 2.2,
          particle.z + particle.vz * age,
        );
        dummy.scale.set(size, size * .47, size * 1.28).multiplyScalar(1 - smooth(life * .65, life, age));
        dummy.rotation.set(age * 5 + phase, age * 3, 2 + age * 5);
      }
      dummy.updateMatrix();
      object.setMatrixAt(i, dummy.matrix);
    });
    object.instanceMatrix.needsUpdate = true;
  }

  function burst(x, y, z, amount, power, palette) {
    active = true;
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * TAU;
      const speed = (.42 + Math.random() * .79) * power;
      const particle = particles[cursor];
      Object.assign(particle, {
        x, y, z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + .55,
        vz: (Math.random() - .5) * speed,
        age: 0,
        life: .52 + Math.random() * 1.24,
        size: .018 + Math.random() * .064,
        phase: angle,
      });
      object.setColorAt(cursor, palette[i % palette.length]);
      cursor = (cursor + 1) % count;
    }
    object.instanceColor.needsUpdate = true;
  }

  function reset() {
    for (const particle of particles) particle.age = Infinity;
    render(0);
  }
  reset();
  return { render, burst, reset };
}

function makeOrbits(scene) {
  const group = new THREE.Group();
  const count = 5;
  const tails = [];
  for (let i = 0; i < count; i += 1) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(34 * 3), 3));
    const material = new THREE.LineBasicMaterial({ color: "#ffc79d", transparent: true, opacity: .36, blending: THREE.AdditiveBlending });
    const tail = new THREE.Line(geometry, material);
    tail.frustumCulled = false;
    group.add(tail);
    const gem = mesh(group, new THREE.OctahedronGeometry(.075 - i * .013), starlight("#ffc79d"));
    tails.push({ tail, gem });
  }
  scene.add(group);
  const point = new THREE.Vector3();

  function render(time, theme, opened, anchor, scale) {
    const strength = opened ? 1.04 : 1.24;
    group.position.copy(anchor).multiplyScalar(.92);
    group.scale.setScalar(scale);
    tails.forEach(({ tail, gem }, index) => {
      const coordinates = tail.geometry.attributes.position;
      const phase = (theme.seed % 1000) / 1000 * TAU + index * 2.08;
      for (let n = 0; n < coordinates.count; n += 1) {
        const t = time * (.49 + index * .11) + phase - (n / coordinates.count) * (.51 + index * .18);
        const x = Math.cos(t) * (3.4 + .3 * index) * strength;
        const z = Math.sin(t) * 1.85;
        let y = Math.sin(t) * (1.62 + .18 * index) + x * (.23 - index * .17);
        if (theme.orbit === "wave" || theme.orbit === "figure8") y = Math.sin(t * 2) * (1.3 + .27 * index);
        if (theme.orbit === "bloom") y *= Math.cos(t * 3);
        if (theme.orbit === "arch") y = y * .55 + 2 - x * x * .093;
        if (theme.orbit === "comet") y = y * .42 + x * .55;
        point.set(x, y, z);
        coordinates.setXYZ(n, point.x, point.y, point.z);
        if (n === 0) gem.position.copy(point);
      }
      coordinates.needsUpdate = true;
      gem.rotation.set(time * .64, time * 1.55, time * .34);
      gem.scale.setScalar(.65 + .43 * Math.sin(time * 2.7 + index));
    });
  }

  function setPalette(colors) {
    tails.forEach(({ tail, gem }, index) => {
      tail.material.color.copy(colors[(index + 1) % colors.length]);
      gem.material.color.copy(colors[(index + 1) % colors.length]);
    });
  }
  return { render, setPalette };
}

function makeConstellations(scene) {
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.Float32BufferAttribute(new Float32Array(32 * 2 * 3), 3);
  geometry.setAttribute("position", positions);
  const material = new THREE.LineBasicMaterial({
    transparent: true, opacity: .42, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const links = new THREE.LineSegments(geometry, material);
  links.frustumCulled = false;
  const lights = new THREE.Group();
  const lamp = new THREE.OctahedronGeometry(.055);
  const lampMaterial = starlight("#ffd4ab");
  const stars = Array.from({ length: 20 }, () => mesh(lights, lamp, lampMaterial));
  const group = new THREE.Group();
  group.add(links, lights);
  scene.add(group);

  function setTheme(theme) {
    const rng = randomFrom(theme.seed ^ 0xff73a3);
    material.color.set(theme.colors[2]);
    lampMaterial.color.set(theme.colors[3]);
    const centers = [[-3.25, 1.9], [3.25, 1.85], [-3.55, -1.2], [3.55, -1.12]];
    let n = 0;
    for (const [index, [x, y]] of centers.entries()) {
      const cluster = stars.slice(index * 5, index * 5 + 5);
      for (const [i, star] of cluster.entries()) {
        const angle = i * TAU / cluster.length + (rng() - .5);
        const radius = .37 + rng() * .54;
        star.position.set(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, -1.6 - rng() * 2);
        star.scale.setScalar(.55 + rng() * .9);
      }
      const extra = rng() > .45 ? [[0, 2], [2, 4]] : [[0, 3]];
      for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 4], ...extra]) {
        const start = cluster[a].position;
        const end = cluster[b].position;
        positions.setXYZ(n++, start.x, start.y, start.z);
        positions.setXYZ(n++, end.x, end.y, end.z);
      }
    }
    geometry.setDrawRange(0, n);
    positions.needsUpdate = true;
  }

  function render(time, opened) {
    group.visible = opened;
    group.rotation.z = .06 * Math.sin(time * .41);
    lights.rotation.y = .013 * Math.cos(time * .55);
    material.opacity = .34 + .19 * Math.sin(time * 1.32);
  }
  return { setTheme, render };
}

export function createScene(host, options) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
  if (!context) throw new Error("WebGL 2 is unavailable.");
  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 45);
  const viewOffset = new THREE.Vector3();
  const ray = new THREE.Vector3();
  const aim = new THREE.Vector2();
  const sky = particleCloud();
  const orbits = makeOrbits(scene);
  const constellations = makeConstellations(scene);
  const bursts = confetti(scene);
  const skyEffects = createSkyEffects(scene);
  const figure = new THREE.Group();
  const envelope = new THREE.Group();
  const centerpiece = new THREE.Group();
  const white = new THREE.HemisphereLight("#ffede7", "#783060", 2.1);
  const rim = new THREE.DirectionalLight("#ffb4e2", 3.2);
  const keyLight = new THREE.DirectionalLight("#fff0d2", 3.25);
  const fill = new THREE.DirectionalLight("#b598ff", 1.3);
  const builders = { envelope: makeJewel, cake: makeCake, aurora: makePlanet, gift: makeGift, fireworks: makeFireworks };
  let theme;
  let colors;
  let paused = options.paused;
  let onScreen = true;
  let available = true;
  let frameId = 0;
  let previousTime;
  let elapsed = 0;
  let revealStart = -Infinity;
  let didBurst = false;
  let nextFirework = Infinity;
  let nextMeteor = Infinity;
  let cardSeed;
  let animators;
  let activity;

  rim.position.set(4, 2, -3);
  keyLight.position.set(-4, 6, 7);
  fill.position.set(4, -3, 5);
  figure.add(envelope, centerpiece);
  scene.add(white, rim, keyLight, fill, sky.object, figure);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.07;
  camera.position.z = 12.5;
  host.replaceChildren(canvas);

  function makeCardObjects() {
    for (const group of [envelope, centerpiece]) {
      if (!group.children.length) continue;
      const previous = new THREE.Group();
      previous.add(...group.children.slice());
      dispose(previous);
    }
    if (cardSeed === undefined) return;
    const rng = randomFrom(cardSeed);
    const palette = theme.colors.slice();
    let offset = Math.floor(rng() * palette.length);
    while (offset-- > 0) palette.push(palette.shift());
    const stationery = theme.id === "envelope" ? makeEnvelope(envelope, palette, cardSeed) : undefined;
    const centerpieceMove = builders[theme.id](centerpiece, palette, rng);
    animators = { ...stationery, centerpieceMove };
  }

  function paint(delta = 0) {
    if (!available) return;
    const opened = cardSeed !== undefined;
    const time = elapsed - revealStart;
    sky.uniforms.uTime.value = elapsed;
    sky.uniforms.uReveal.value = opened ? 1 : 0;
    const anchor = figure.position;
    orbits.render(elapsed, theme, opened, anchor, figure.scale.x);
    constellations.render(elapsed, opened && !activity);
    skyEffects.render(elapsed, camera.aspect, camera.position.z, paused);
    viewOffset.lerp(aim, paused ? 1 : 1 - Math.exp(-7.5 * delta));
    camera.position.x = viewOffset.x * .48;
    camera.position.y = viewOffset.y * .32;
    camera.lookAt(0, 0, 0);
    const hasEnvelope = theme.id === "envelope";
    const introTime = hasEnvelope ? .64 : .03;
    envelope.visible = hasEnvelope && opened && !activity && time < 1.65;
    centerpiece.visible = opened && !activity && time > introTime;
    if (opened) {
      const { card, flap, seal, centerpieceMove } = animators;
      if (hasEnvelope) {
        const rise = smooth(.21, .98, time);
        const flight = smooth(.91, 1.65, time);
        envelope.position.set(flight * -4, Math.sin(time * 3) * .075 - flight * 4.2 - .21, flight * .8);
        envelope.rotation.set(-.09 + flight * -.48, .13 + flight * .63, .14 + .28 * flight);
        envelope.scale.setScalar((.82 + smooth(0, .33, time) * .18) * (1 - .46 * flight));
        flap.rotation.x = -2.88 * smooth(.13, .71, time);
        seal.visible = time < .28;
        card.position.set(0, rise * 2.9 - .14, -.09 + rise * .28);
        card.rotation.z = -.22 * rise;
      }
      const bloom = smooth(introTime, introTime + .84, time);
      centerpiece.position.set(0, -.19 + Math.sin(elapsed * 1.72) * .15 - (1 - bloom) * 1.75, .15);
      const spin = theme.id === "aurora" ? .07 * Math.sin(elapsed * .5) : elapsed * .44;
      centerpiece.rotation.set(.08 - viewOffset.y * .16, spin + viewOffset.x * .25, .055 * Math.sin(elapsed));
      centerpiece.scale.setScalar(.26 + bloom * .74 + .13 * Math.sin(Math.PI * bloom));
      centerpieceMove(elapsed, bloom);
      if (!didBurst && time > .91 && !paused && !activity) {
        didBurst = true;
        bursts.burst(anchor.x, anchor.y + .58, 1.8, 145, 5.3, colors);
        bursts.burst(anchor.x - 1, anchor.y + 1.4, .1, 46, 3.5, colors);
      }
      if (time > nextFirework && !paused && !activity) {
        const side = Math.sin(elapsed * 7.8) > 0 ? -1 : 1;
        bursts.burst(anchor.x + side * (1.65 + Math.random() * 1.55), anchor.y + .8 + Math.random() * 1.15, .3, 41, 3, colors);
        nextFirework = time + 3.7 + Math.random() * 2.3;
      }
      if (elapsed > nextMeteor && !paused && !activity) {
        skyEffects.shower(theme, elapsed);
        nextMeteor = elapsed + 9.5 + theme.seed % 5;
      }
    }
    bursts.render(delta);
    renderer.render(scene, camera);
  }

  function frame(time) {
    frameId = 0;
    const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, .045);
    previousTime = time;
    elapsed += delta;
    paint(delta);
    schedule();
  }

  function schedule() {
    if (available && onScreen && !paused && !document.hidden && !frameId) frameId = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    previousTime = undefined;
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.8, Math.sqrt(1_650_000 / (width * height)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = clamp(10.5 / camera.aspect, 12.5, 27);
    const halfHeight = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfWidth = halfHeight * camera.aspect;
    const [x, y, magnitude] = figureOrigin(theme, width);
    const scale = magnitude * (width >= 780 ? clamp(halfWidth / 4.75, .79, 1.38) : Math.min(1.26, halfWidth * .37));
    figure.position.set(halfWidth * x, halfHeight * y, 0);
    figure.scale.setScalar(scale);
    skyEffects.placeCandle(figure.position, scale);
    sky.object.scale.set(Math.max(1, halfWidth / 6), Math.max(1, halfHeight / 5), 1);
    camera.updateProjectionMatrix();
    sky.uniforms.uRatio.value = ratio;
    paint();
  }

  function setTheme(value) {
    theme = value;
    colors = value.colors.map((color) => new THREE.Color(color));
    sky.setTheme(theme);
    orbits.setPalette(colors);
    constellations.setTheme(theme);
    skyEffects.setTheme(theme);
    makeCardObjects();
    resize();
  }

  setTheme(options.theme);
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) schedule();
    else stop();
  }).observe(host);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else schedule();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    available = false;
    stop();
    options.availability(false);
  });
  canvas.addEventListener("webglcontextrestored", () => {
    available = true;
    options.availability(true);
    resize();
    schedule();
  });
  options.availability(true);
  schedule();

  function scatter(x, y, count, power) {
    camera.updateMatrixWorld();
    ray.set(clamp(x, -1, 1), clamp(y, -1, 1), .2).unproject(camera).sub(camera.position).normalize();
    const depth = (2.5 - camera.position.z) / ray.z;
    bursts.burst(camera.position.x + ray.x * depth, camera.position.y + ray.y * depth, 2.5, count, power, colors);
  }

  return {
    get available() { return available; },
    setTheme,
    setPaused(value) {
      paused = value;
      if (paused) {
        stop();
        aim.set(0, 0);
        bursts.reset();
        skyEffects.stopMeteors();
        if (cardSeed !== undefined) revealStart = elapsed - 2;
        didBurst = true;
        paint();
      } else schedule();
    },
    aim(x, y) { aim.set(x, y); },
    scatter(x, y) { scatter(x, y, 37, 3.85); },
    paintStardust(x, y) { scatter(x, y, 8, 1.27); },
    celebrate(x, y) {
      scatter(x, y, 121, 5.45);
    },
    shower() {
      skyEffects.shower(theme, elapsed);
      nextMeteor = elapsed + 10;
    },
    setActivity(value, extinguished) {
      activity = value;
      skyEffects.setActivity(value, extinguished, elapsed);
      if (activity && cardSeed !== undefined && elapsed - revealStart < 1.65) {
        revealStart = elapsed - 2;
        didBurst = true;
      }
      paint();
    },
    reveal(seed) {
      if (cardSeed !== seed) {
        cardSeed = seed;
        makeCardObjects();
      }
      didBurst = paused;
      revealStart = paused ? elapsed - 2 : elapsed;
      nextFirework = 3.1;
      nextMeteor = elapsed + 2.7;
      bursts.reset();
      paint();
    },
  };
}

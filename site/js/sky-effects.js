import * as THREE from "three";
import { randomFrom } from "./themes.js";

const fullTurn = 2 * Math.PI;

function makeCandle(scene) {
  const group = new THREE.Group();
  const wax = new THREE.MeshStandardMaterial({ color: "#ef99cc", roughness: .39 });
  const ribbon = new THREE.MeshStandardMaterial({ color: "#eee6ff", roughness: .36, metalness: .17 });
  const brass = new THREE.MeshStandardMaterial({ color: "#f6ba85", roughness: .32, metalness: .42 });
  const body = new THREE.Mesh(new THREE.LatheGeometry(
    [[0, 0], [.27, 0], [.35, .07], [.35, 1.59], [.32, 1.71], [.25, 1.75], [0, 1.75]]
      .map(([x, y]) => new THREE.Vector2(x, y)), 46,
  ), wax);
  body.position.y = -1.13;
  group.add(body);
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(.71, .63, .1, 45), brass);
  platform.position.y = -1.18;
  group.add(platform);
  const coil = Array.from({ length: 70 }, (_, i) => {
    const fraction = i / 69;
    return new THREE.Vector3(.348 * Math.cos(fraction * fullTurn * 2.65), -1.03 + fraction * 1.47, .348 * Math.sin(fraction * fullTurn * 2.65));
  });
  const waxRibbon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 76, .037, 7, false), ribbon);
  group.add(waxRibbon);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(.018, .03, .16, 10), brass);
  wick.position.y = .65;
  group.add(wick);

  const flame = new THREE.Group();
  flame.position.y = .73;
  const bulb = new THREE.SphereGeometry(1, 23, 17);
  const outer = new THREE.Mesh(bulb, new THREE.MeshBasicMaterial({ color: "#ff9b63" }));
  outer.position.y = .22;
  outer.scale.set(.19, .32, .14);
  const center = new THREE.Mesh(bulb, new THREE.MeshBasicMaterial({ color: "#fff2b8" }));
  center.position.set(0, .165, .097);
  center.scale.set(.125, .239, .095);
  flame.add(outer, center);
  group.add(flame);

  const light = new THREE.PointLight("#ffb06d", 6, 4.9);
  light.position.y = 1.02;
  group.add(light);
  const haloMaterial = new THREE.ShaderMaterial({
    uniforms: { strength: { value: .45 }, tint: { value: new THREE.Color("#f89160") } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 pixel;
      void main() {
        pixel = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 pixel;
      uniform float strength;
      uniform vec3 tint;
      void main() {
        float opacity = pow(max(0., 1. - length(pixel - .5) * 2.), 2.);
        gl_FragColor = vec4(tint, opacity * strength);
      }`,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), haloMaterial);
  halo.position.set(0, .95, -.2);
  group.add(halo);

  const smokeShape = new THREE.RingGeometry(.72, 1, 27);
  const smoke = Array.from({ length: 7 }, () => {
    const material = new THREE.MeshBasicMaterial({
      color: "#f7d4ff", transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const puff = new THREE.Mesh(smokeShape, material);
    group.add(puff);
    return puff;
  });
  scene.add(group);
  group.visible = false;

  function setTheme(theme) {
    wax.color.set(theme.colors[0]);
    ribbon.color.set(theme.colors[2]);
    brass.color.set(theme.colors[1]);
  }

  function render(time, visible, extinguishing, paused) {
    group.visible = visible;
    if (!visible) return;
    const isLit = extinguishing < 0;
    const burn = isLit ? 1 : paused ? 0 : Math.max(0, 1 - extinguishing / .27);
    const flicker = .92 + .06 * Math.sin(time * 12) + .05 * Math.cos(time * 19);
    group.rotation.y = .23 * Math.sin(time * .8);
    flame.visible = burn > 0;
    flame.scale.set(burn, burn * flicker, burn);
    flame.rotation.z = burn === 1 ? .12 * Math.sin(time * 9) : .8 * (1 - burn);
    haloMaterial.uniforms.strength.value = burn * flicker * .7;
    light.intensity = burn * flicker * 6;

    smoke.forEach((puff, i) => {
      const age = extinguishing - i * .08;
      puff.visible = !paused && !isLit && age >= 0 && age < 1.17;
      if (!puff.visible) return;
      const growth = age / 1.17;
      puff.position.set(.38 * growth + Math.sin(growth * 11 + i) * .17, .81 + 1.3 * growth, .11);
      puff.scale.setScalar((.05 + .31 * growth) * (1 + i * .065));
      puff.rotation.set(.7 + age, -.6 + age, i * .7);
      puff.material.opacity = .54 * (1 - growth);
    });
  }
  return {
    setTheme,
    render,
    place(anchor, scale) {
      group.position.copy(anchor);
      group.scale.setScalar(scale);
    },
  };
}

function makeMeteors(scene) {
  const tail = new THREE.PlaneGeometry(1, 1);
  const head = new THREE.OctahedronGeometry(1);
  const group = new THREE.Group();
  const streaks = Array.from({ length: 14 }, () => {
    const material = new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color() }, opacity: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec2 pixel;
        void main() {
          pixel = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 pixel;
        uniform vec3 tint;
        uniform float opacity;
        void main() {
          float beam = pow(max(0., 1. - 2. * abs(pixel.y - .5)), 2.8);
          float trail = pow(pixel.x, 2.4);
          gl_FragColor = vec4(tint, opacity * trail * beam);
        }`,
    });
    const meteor = new THREE.Group();
    const flare = new THREE.Mesh(head, new THREE.MeshBasicMaterial({ color: "#ffeada" }));
    const beam = new THREE.Mesh(tail, material);
    meteor.add(flare, beam);
    group.add(meteor);
    return { meteor, flare, beam, material };
  });
  scene.add(group);
  group.visible = false;
  let storm;

  function start(theme, time) {
    const rng = randomFrom(theme.seed ^ 0x39726);
    const direction = rng() < .5 ? -1 : 1;
    storm = {
      time,
      direction,
      diagonal: .52 + rng() * .48,
      lastEnd: 0,
    };
    streaks.forEach((streak, i) => {
      const delay = (i === 0 ? .04 : i * .135 + rng() * .3);
      const duration = .63 + rng() * .83;
      streak.track = {
        delay, duration,
        x: -.28 + rng() * 1.23,
        y: .16 + rng() * 1.02,
        length: .85 + rng() * 2.3,
        speed: 4.3 + rng() * 4.5,
      };
      storm.lastEnd = Math.max(storm.lastEnd, delay + duration);
      streak.material.uniforms.tint.value.set(theme.colors[i % theme.colors.length]).convertLinearToSRGB();
    });
  }

  function stop() {
    storm = undefined;
    group.visible = false;
  }

  function render(time, aspect, distance) {
    if (!storm) return;
    const elapsed = time - storm.time;
    if (elapsed > storm.lastEnd) {
      stop();
      return;
    }
    group.visible = true;
    const halfHeight = Math.tan(Math.PI / 10) * (distance - 2.3);
    const halfWidth = halfHeight * aspect;
    const direction = storm.direction;
    const angle = Math.atan2(-storm.diagonal, direction);
    for (const { track, meteor, flare, beam, material } of streaks) {
      const progress = (elapsed - track.delay) / track.duration;
      meteor.visible = progress >= 0 && progress <= 1;
      if (!meteor.visible) continue;
      const step = track.speed * progress;
      const glow = Math.min(1, progress * 10, (1 - progress) * 5);
      meteor.position.set(direction * (-halfWidth * track.x + step), halfHeight * track.y - step * storm.diagonal, 2.3);
      meteor.rotation.z = angle;
      flare.scale.set(.13, .045, .035).multiplyScalar(glow);
      const length = track.length * Math.min(1, progress * 6);
      beam.position.x = -length * .5;
      beam.scale.set(length, .18, 1);
      material.uniforms.opacity.value = glow * 1.28;
    }
  }
  return { start, stop, render };
}

export function createSkyEffects(scene) {
  const candle = makeCandle(scene);
  const meteors = makeMeteors(scene);
  let activity;
  let blownAt = Infinity;

  return {
    setTheme: candle.setTheme,
    placeCandle: candle.place,
    setActivity(value, extinguished, time) {
      meteors.stop();
      activity = value;
      blownAt = extinguished ? time : Infinity;
    },
    shower: meteors.start,
    stopMeteors: meteors.stop,
    render(time, aspect, distance, paused) {
      candle.render(time, activity === "wish", time - blownAt, paused);
      meteors.render(time, aspect, distance);
    },
  };
}

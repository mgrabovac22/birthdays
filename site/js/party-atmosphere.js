import * as THREE from "three";

const turn = 2 * Math.PI;
const smooth = (from, to, time) => THREE.MathUtils.smoothstep(time, from, to);
const lerp = THREE.MathUtils.lerp;

function addMesh(group, geometry, material, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  group.add(object);
  return object;
}

function material(color, roughness = .55) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function joint(parent, x, y) {
  const object = new THREE.Group();
  object.position.set(x, y, 0);
  parent.add(object);
  return object;
}

function makeGuest(scene, kind) {
  const host = kind === "host";
  const dancer = kind === "dancer";
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  scene.add(root);
  root.visible = false;
  const skin = material(host ? "#a66a49" : dancer ? "#c48763" : "#e8a777", .62);
  const hair = material(host ? "#2c1c29" : dancer ? "#4c2c52" : "#58362c");
  const jacket = material(host ? "#b472ed" : dancer ? "#ee7099" : "#ffdfcb", .42);
  const pants = material(host ? "#31284e" : "#5a4263");
  const lapel = material(host || dancer ? "#ffe9af" : "#b84b75");
  const hat = material(host ? "#54365f" : "#fff0df", .44);
  const shoe = material("#20182a");
  const eye = material("#241829");
  const sphere = new THREE.SphereGeometry(1, 18, 13);
  const rounded = (parent, surface, x, y, z, sx, sy, sz) => {
    const shape = addMesh(parent, sphere, surface, x, y, z);
    shape.scale.set(sx, sy, sz);
    return shape;
  };
  const cylinder = (top, bottom, length) => new THREE.CylinderGeometry(top, bottom, length, 14);

  addMesh(body, cylinder(.33, .24, .66), jacket, 0, 1.19);
  rounded(body, jacket, 0, 1.48, 0, .35, .095, .21);
  addMesh(body, cylinder(.10, .12, .19), skin, 0, 1.56);
  rounded(body, skin, 0, 1.81, 0, .261, .289, .243);
  rounded(body, hair, 0, 1.96, -.025, .269, .165, .237);
  rounded(body, skin, 0, 1.81, .237, .046, .055, .051);
  rounded(body, skin, -.252, 1.82, 0, .05, .078, .046);
  rounded(body, skin, .252, 1.82, 0, .05, .078, .046);
  for (const side of [-1, 1]) {
    rounded(body, eye, side * .089, 1.855, .224, .024, .028, .018);
    rounded(body, host ? hair : lapel, side * .046, 1.713, .22, dancer ? .033 : .061, .018, .022);
    const bow = addMesh(body, new THREE.ConeGeometry(.104, .145, 3), lapel, side * .07, 1.47, .211);
    bow.rotation.z = side * Math.PI / 2;
  }
  rounded(body, lapel, 0, 1.46, .243, .046, .054, .031);
  for (const height of [1.07, 1.19, 1.31]) rounded(body, lapel, 0, height, .215, .026, .026, .017);
  if (host) {
    addMesh(body, cylinder(.306, .306, .043), hat, 0, 2.024);
    addMesh(body, cylinder(.201, .223, .265), hat, 0, 2.151);
    addMesh(body, cylinder(.228, .228, .040), lapel, 0, 2.069);
  } else if (dancer) {
    rounded(body, hair, .10, 2.135, -.13, .152, .145, .147);
    const skirt = addMesh(body, cylinder(.207, .338, .31), jacket, 0, .89);
    skirt.rotation.z = -.06;
    rounded(body, lapel, .085, 2.065, .166, .073, .046, .036);
  } else {
    addMesh(body, cylinder(.233, .207, .102), hat, 0, 2.041);
    for (const x of [-.137, 0, .137]) rounded(body, hat, x, 2.17, -.01, .15, .158 + (.1 - Math.abs(x)) * .4, .147);
    const apron = addMesh(body, new THREE.BoxGeometry(.35, .38, .032), lapel, 0, 1.02, .20);
    apron.rotation.x = -.15;
  }

  const arms = [-1, 1].map((side) => {
    const pivot = joint(body, side * .32, 1.43);
    addMesh(pivot, cylinder(.079, .085, .31), jacket, 0, -.145);
    addMesh(pivot, cylinder(.061, .073, .22), jacket, 0, -.397, .035);
    rounded(pivot, skin, 0, -.527, .043, .078, .083, .066);
    return pivot;
  });
  const legs = [-1, 1].map((side) => {
    const pivot = joint(body, side * .13, .89);
    addMesh(pivot, cylinder(.095, .108, .41), pants, 0, -.19);
    const knee = joint(pivot, 0, -.383);
    addMesh(knee, cylinder(.071, .092, .35), pants, 0, -.17);
    rounded(knee, shoe, 0, -.34, .075, .108, .069, .175);
    return { pivot, knee };
  });

  function render(time, width, height) {
    root.visible = time > .42 && time < 6.25;
    if (!root.visible) return;
    const arrive = smooth(.4, 2.78, time);
    const depart = smooth(3.38, 6.25, time);
    const wave = smooth(2.22, 2.81, time) * (1 - smooth(3.20, 3.77, time));
    const direction = host ? -1 : 1;
    const scale = THREE.MathUtils.clamp(width * .29, .65, 1.12);
    const motion = time * 8.7;
    root.position.set(direction * width * (-1.29 + 1.1 * arrive + 1.49 * depart), -height * .63, 1.0);
    root.scale.setScalar(scale);
    const spin = dancer ? turn * smooth(2.22, 3.55, time) : 0;
    root.rotation.y = direction * 1.34 * (1 - wave) + spin;
    body.position.y = .036 * (1 - wave) * (1 - Math.cos(motion * 2));
    legs.forEach(({ pivot, knee }, index) => {
      const stride = Math.sin(motion + index * Math.PI) * (1 - wave);
      pivot.rotation.x = stride * .66;
      knee.rotation.x = Math.max(0, -stride) * .69;
    });
    arms.forEach((arm, index) => {
      const side = index === 0 ? -1 : 1;
      arm.rotation.x = Math.sin(motion + index * Math.PI) * .62 * (1 - wave);
      arm.rotation.z = side * .14;
    });
    arms[0].rotation.z = lerp(-.14, -2.2 + Math.sin(time * 23) * .21, wave);
    if (dancer) arms[1].rotation.z = lerp(.14, 1.73, wave);
  }

  return { root, render };
}

export function createPartyAtmosphere(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const balloonBody = new THREE.SphereGeometry(1, 24, 16);
  const knot = new THREE.ConeGeometry(.049, .08, 7);
  const curve = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 19 }, (_, i) =>
    new THREE.Vector3(Math.sin(i * .42) * .041, -.45 - i * .038, 0),
  ));
  const stringMaterial = new THREE.LineBasicMaterial({ color: "#f6daf8", opacity: .61, transparent: true });
  const balloons = Array.from({ length: 11 }, () => {
    const surface = new THREE.MeshPhysicalMaterial({
      color: "#ed8ebd", metalness: .17, roughness: .26, clearcoat: .8,
    });
    const node = new THREE.Group();
    group.add(node);
    const globe = addMesh(node, balloonBody, surface);
    globe.scale.set(.29, .382, .282);
    addMesh(node, knot, surface, 0, -.396).rotation.z = Math.PI;
    node.add(new THREE.Line(curve, stringMaterial));
    return { node, surface };
  });
  const decorations = new THREE.InstancedMesh(
    new THREE.BoxGeometry(.10, .225, .027),
    new THREE.MeshStandardMaterial({ metalness: .28, roughness: .45, side: THREE.DoubleSide }),
    46,
  );
  decorations.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  decorations.frustumCulled = false;
  group.add(decorations);
  const meshPose = new THREE.Object3D();
  const guests = { cake: makeGuest(scene, "chef"), gift: makeGuest(scene, "host"), fireworks: makeGuest(scene, "dancer") };
  let style;

  function setTheme(theme) {
    style = theme;
    balloons.forEach(({ surface }, index) => surface.color.set(theme.colors[index % theme.colors.length]));
    for (let i = 0; i < decorations.count; i += 1) {
      decorations.setColorAt(i, new THREE.Color(theme.colors[(i + 1) % theme.colors.length]));
    }
    decorations.instanceColor.needsUpdate = true;
  }

  function render(time, intro, width, height, opened, activity) {
    group.visible = opened;
    for (const [id, guest] of Object.entries(guests)) {
      if (id === style.id && opened && !activity) guest.render(intro, width, height);
      else guest.root.visible = false;
    }
    if (!opened) return;
    balloons.forEach(({ node }, index) => {
      const a = (time * (.042 + index % 3 * .011) + index / balloons.length) % 1;
      const side = index % 2 ? 1 : -1;
      const drift = Math.sin(time * .72 + index * 1.73);
      node.position.set(width * (side * (.65 + .26 * (index % 4) / 3) + .08 * drift), height * (a * 2.38 - 1.26), -2.6 + (index % 4) * .78);
      node.rotation.set(0, time * .49 + index, .12 * drift + side * .11);
      const size = (.78 + (index % 5) * .20) * (style.id === "aurora" ? .68 : 1);
      node.scale.setScalar(size * smooth(0, .13, a) * (1 - smooth(.92, 1, a)));
    });
    for (let i = 0; i < decorations.count; i += 1) {
      const phase = time * (.32 + (i % 6) * .034) + i * 2.399;
      const side = i % 2 ? -1 : 1;
      meshPose.position.set(
        width * (Math.cos(phase) * .20 + side * (.43 + (i % 7) * .084)),
        height * (1.09 - 2.18 * ((time * (.086 + (i % 5) * .022) + i / decorations.count) % 1)),
        Math.sin(phase * 1.3) * 1.48 - .78,
      );
      meshPose.rotation.set(phase * 2.7, phase * 1.8, phase * .8 + i);
      meshPose.scale.setScalar(.32 + (i % 6) * .17);
      meshPose.updateMatrix();
      decorations.setMatrixAt(i, meshPose.matrix);
    }
    decorations.instanceMatrix.needsUpdate = true;
  }

  return { setTheme, render };
}

import * as THREE from "three";

const smooth = (from, to, time) => THREE.MathUtils.smoothstep(time, from, to);
const lerp = THREE.MathUtils.lerp;

export function createNameMarquee(scene) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const front = new THREE.MeshBasicMaterial({ map: texture, alphaTest: .19, toneMapped: false });
  const sides = new THREE.MeshBasicMaterial({ map: texture, color: "#b14681", alphaTest: .19, toneMapped: false });
  const plane = new THREE.PlaneGeometry(1, 1);
  const object = new THREE.Group();
  scene.add(object);
  object.visible = false;
  for (let i = 14; i >= 0; i -= 1) {
    const layer = new THREE.Mesh(plane, i ? sides : front);
    layer.position.z = -.024 * i;
    layer.position.y = -.004 * i;
    object.add(layer);
  }
  let name = "";
  let palette;

  function draw() {
    if (!name || !context) return;
    const text = name.trim().slice(0, 240);
    const font = `176px "DM Serif Display", Georgia, serif`;
    context.font = font;
    const width = context.measureText(text).width;
    const words = text.split(/\s+/u);
    let rows = [text];
    if (width > 1180 && words.length >= 2) {
      let line = words[0];
      let index = 1;
      while (index < words.length - 1 && context.measureText(`${line} ${words[index]}`).width < width * .52) {
        line += ` ${words[index++]}`;
      }
      rows = [line, words.slice(index).join(" ")];
    }
    canvas.width = Math.max(280, Math.min(1220, Math.ceil(Math.max(...rows.map((row) => context.measureText(row).width)) + 84)));
    canvas.height = rows.length === 1 ? 244 : 430;
    context.font = font;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    const sheen = context.createLinearGradient(0, 15, 0, canvas.height - 15);
    sheen.addColorStop(0, "#fffdf0");
    sheen.addColorStop(.53, "#ffeac3");
    sheen.addColorStop(1, palette[0]);
    context.strokeStyle = "#fff0d7";
    context.lineWidth = 3;
    context.fillStyle = sheen;
    rows.forEach((row, index) => {
      const y = 133 + index * 182;
      context.strokeText(row, canvas.width / 2, y, canvas.width - 75);
      context.fillText(row, canvas.width / 2, y, canvas.width - 75);
    });
    sides.color.set(palette[0]).multiplyScalar(.63);
    texture.needsUpdate = true;
  }

  function set(value, colors) {
    if (value === name && colors === palette) return;
    name = value;
    palette = colors;
    draw();
    if (name) document.fonts?.load('176px "DM Serif Display"', name).then(() => {
      if (name === value && palette === colors) draw();
    }).catch(() => {});
  }

  function render(time, enabled, width, height, cameraDistance, wide, anchor) {
    object.visible = Boolean(name && context && enabled && time > 1.42 && time < 6.45);
    if (!object.visible) return;
    const entry = smooth(1.42, 2.51, time);
    const fade = smooth(5.35, 6.45, time);
    const z = lerp(.7, Math.min(3.95, cameraDistance * .29), entry) + .6 * fade;
    const depth = (cameraDistance - z) / cameraDistance;
    const x = lerp(anchor.x * .82, width * (wide ? .20 : 0) * depth, entry);
    const y = lerp(anchor.y, height * (wide ? .57 : -.23) * depth, entry) + .35 * fade;
    object.position.set(x, y, z);
    const aspect = canvas.width / canvas.height;
    const maxWidth = Math.min(width * (wide ? 1.42 : 1.80), height * .72 * aspect);
    const stretch = (.23 + entry * .77 + .13 * Math.sin(entry * Math.PI)) * (1 - .90 * fade) * depth;
    object.scale.set(maxWidth * stretch, maxWidth / aspect * stretch, .65 + .47 * entry);
    object.rotation.set(-.33 + entry * .25, .46 * (1 - entry) + .07 * Math.sin(time * 2.5), -.16 * (1 - entry));
  }

  return { set, render };
}

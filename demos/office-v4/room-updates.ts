import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { BuiltRoom } from "../../packages/room-runtime/types";
import type { PartContext } from "../office-v2/parts/types";
import { build as buildLounge } from "../office-v2/items/lounge";

/** The October 9 office is tidied, with the vintage Mac moved onto the printer bench.
 * Applied to a fresh October 7 build, before batching; historical rooms stay intact.
 * References: new registered photos 56, 76, 82–86, 98–108, 155 and 157–164.
 */
export async function updateRoom(room: BuiltRoom): Promise<void> {
  const root = room.group;
  for (const name of [
    "green-screen",
    "floor-pile",
    "oct7-open-carton-on-lounge",
    "motorcycle-helmet",
    "github-varsity-jacket",
    "oct7-illuminated-cord-reel",
    "massage-gun",
  ])
    root.getObjectByName(name)?.removeFromParent();
  const wing = root.getObjectByName("wing-floor");
  if (wing) {
    for (const object of [...wing.children]) {
      if (!["trash-can", "white-bin"].includes(object.name))
        object.removeFromParent();
    }
    // Photo100: foot-pedal can stands by the left bench leg, below the brass-knob door.
    const bin = wing.getObjectByName("trash-can");
    if (bin) {
      bin.position.set(-2.59, 0, -1.31);
      bin.rotation.y = Math.PI / 2;
      const body = bin.children[0];
      if (
        body instanceof THREE.Mesh &&
        body.material instanceof THREE.MeshPhysicalMaterial
      ) {
        const m = body.material.clone();
        m.color.set("#e7e9e6");
        m.metalness = 0.9;
        m.roughness = 0.29;
        m.normalScale.set(0.055, 0.055);
        m.envMapIntensity = 2.8;
        body.material = m;
      }
      // The current can has a flat lid and a floor pedal, not the old automatic sensor hood.
      for (const child of [...bin.children].slice(2)) child.removeFromParent();
      const dark = std("#222425", 0.65);
      cyl(bin, 0.159, 0.031, dark, 0, 0.612, 0);
      box(bin, 0.1, 0.032, 0.027, dark, 0, 0.587, -0.146, 0.007);
      box(bin, 0.105, 0.023, 0.063, dark, 0, 0.025, 0.158, 0.007);
      box(
        bin,
        0.073,
        0.008,
        0.033,
        std("#939b9a", 0.42, 0.5),
        0,
        0.039,
        0.175,
        0.004,
      );
    }
  }

  await updateLounge(room);
  updateMac(room);
  await updateBench(room);
  await updateShelves(room);
  updateFilamentRack(room);
}

async function updateLounge(room: BuiltRoom) {
  const lounge = room.group.getObjectByName("lounge");
  if (!lounge) return;
  lounge.getObjectByName("parts-box")?.removeFromParent();
  // Reuse the established tufted upholstery, seamed pillow and panelled cap construction.
  const original = await buildLounge({} as PartContext);
  for (const name of ["chrome-pillow", "green-cap", "black-cap", "roomba-1"]) {
    const item = original.getObjectByName(name);
    if (item) lounge.add(item);
  }
  const pillow = lounge.getObjectByName("chrome-pillow");
  const hat = lounge.getObjectByName("black-cap");
  const green = lounge.getObjectByName("green-cap");
  // Seat references 85/86: white pillow at sitter's left, gray Syntax cap over the green/red cap.
  const chairFrame = new THREE.Matrix4()
    .makeRotationY(-0.882)
    .setPosition(2.36, 0, -2.36);
  const chair = lounge.getObjectByName("eames-lounge-chair");
  if (chair) {
    chair.position.set(2.36, 0, -2.36);
    chair.rotation.y = -0.882;
    // The original cushion construction is retained, but the photographed chair is
    // 86 cm tall and has broad, turned-down arm pads. Its previous head was 92 cm.
    chair.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const geometry = o.geometry.clone(),
        p = geometry.getAttribute("position");
      const material = Array.isArray(o.material) ? o.material[0] : o.material;
      const isLeather = ["leather", "leather-piping"].includes(material.name);
      const panel =
        isLeather || ["walnut-veneer", "ply-edge"].includes(material.name);
      const regions = panel ? chairRegions(geometry) : null;
      for (let j = 0; j < p.count; j++) {
        let x = p.getX(j),
          y = p.getY(j),
          z = p.getZ(j);
        const region = regions?.[j] ?? 0;
        const arm = isLeather && region === 3;
        if (arm) {
          const s = Math.sign(x);
          x = s * 0.324 + (x - s * 0.366) * 1.65;
          y -= 0.045 + 0.026 * Math.max(0, (z - 0.11) / 0.18) ** 2;
          z = 0.035 + (z - 0.035) * 0.72;
        } else if (region === 1 || (!panel && y > 0.645)) {
          // Button correspondences85↔86 triangulate to y=.684m, 284mm apart.
          x = spreadTufts(x, 0.158, 0.31);
          y = 0.66 + (y - 0.78) * 1.18;
        } else if (
          region === 2 ||
          (!panel && y > 0.27 && z < -0.12 && Math.abs(x) < 0.34)
        ) {
          y = 0.28 + (y - 0.28) * 0.6;
        } else if (Math.abs(x) > 0.3 && y > 0.4) {
          y -= 0.055 * Math.min(1, (y - 0.4) / 0.08);
        }
        x *= 1.045;
        p.setXYZ(j, x, y, z);
      }
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      o.geometry = geometry;
    });
  }
  const ottoman = lounge.getObjectByName("eames-ottoman-with-jacket");
  if (ottoman) {
    ottoman.position.set(1.776, 0, -2.098);
    ottoman.rotation.y = -0.94;
    ottoman.traverse((o) => {
      if (
        !(o instanceof THREE.Mesh) ||
        Array.isArray(o.material) ||
        !["leather", "leather-piping"].includes(o.material.name)
      )
        return;
      const geo = o.geometry.clone(),
        p = geo.getAttribute("position");
      for (let j = 0; j < p.count; j++)
        p.setX(j, spreadTufts(p.getX(j), 0.143, 0.325));
      geo.computeVertexNormals();
      o.geometry = geo;
    });
  }
  for (const item of [chair, ottoman])
    item?.traverse((o) => {
      if (
        !(o instanceof THREE.Mesh) ||
        !(o.material instanceof THREE.MeshPhysicalMaterial) ||
        !["leather", "leather-piping"].includes(o.material.name)
      )
        return;
      const m = o.material.clone();
      m.color.set("#2c3236");
      m.normalScale.set(0.035, 0.035);
      m.roughness = 1.05;
      m.specularIntensity = 0.95;
      m.clearcoat = 0.18;
      m.clearcoatRoughness = 0.45;
      m.envMapIntensity = 2.2;
      o.material = m;
    });
  const buttonMaterial = new THREE.MeshPhysicalMaterial({
    color: "#606765",
    roughness: 0.36,
    clearcoat: 0.3,
    metalness: 0.08,
  });
  for (const x of [-0.142, 0.142]) {
    if (chair) {
      const b = add(
        chair,
        new THREE.SphereGeometry(0.008, 16, 10),
        buttonMaterial,
        x,
        0.684,
        -0.39,
      );
      b.scale.set(1, 1, 0.48);
      b.rotation.x = -0.24;
    }
    if (ottoman) {
      const b = add(
        ottoman,
        new THREE.SphereGeometry(0.008, 16, 10),
        buttonMaterial,
        x,
        0.408,
        0,
      );
      b.scale.set(1, 0.48, 1);
    }
  }
  const doorCorner = room.group.getObjectByName("door-corner");
  doorCorner?.getObjectByName("backpack-cords")?.removeFromParent();
  const backpack = doorCorner?.getObjectByName("backpack");
  if (backpack) {
    backpack.position.set(1.91, 0, -2.72);
    backpack.rotation.set(0.09, Math.PI - 0.7, -0.16);
    backpack.traverse((o) => {
      if (
        !(o instanceof THREE.Mesh) ||
        !(o.material instanceof THREE.MeshStandardMaterial)
      )
        return;
      const old = o.material;
      if (["15171c", "8a8f97"].includes(old.color.getHexString())) {
        const m = old.clone();
        m.color.set("#606266");
        o.material = m;
      }
    });
    await detailBackpack(backpack);
  }
  const pose = (o: THREE.Object3D | undefined, p: number[], r: number[]) => {
    if (!o) return;
    o.position.set(...(p as [number, number, number]));
    o.rotation.set(...(r as [number, number, number]), "YXZ");
    o.updateMatrix();
    o.applyMatrix4(chairFrame);
  };
  pose(pillow, [0.145, 0.46, -0.095], [-0.15, -0.08, -0.7]);
  pose(hat, [-0.105, 0.43, 0.01], [-0.25, 0.38, -0.08]);
  pose(green, [-0.115, 0.401, 0.015], [-0.2, -0.15, -0.15]);
  green?.traverse((o) => {
    if (
      !(o instanceof THREE.Mesh) ||
      !(o.material instanceof THREE.MeshStandardMaterial)
    )
      return;
    const geo = o.geometry.clone(),
      p = geo.getAttribute("position"),
      colors = new Float32Array(p.count * 3);
    const red = new THREE.Color("#d32d3c"),
      greenColor = new THREE.Color("#1b9b55");
    for (let i = 0; i < p.count; i++) {
      const c = p.getY(i) < 0.025 && p.getZ(i) > 0.063 ? red : greenColor;
      colors.set(c.toArray(), i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    o.geometry = geo;
    const m = o.material.clone();
    m.color.set("#ffffff");
    m.vertexColors = true;
    m.normalScale.set(0.08, 0.08);
    o.material = m;
  });
  const [capFront, pillowFront, capFabric] = await Promise.all([
    loadMap("syntax-cap-logo.png"),
    loadMap("chrome-pillow.jpg"),
    loadMap("cap-heather.jpg"),
  ]);
  capFabric.wrapS = capFabric.wrapT = THREE.RepeatWrapping;
  capFabric.repeat.set(60, 45);
  pillow?.traverse((o) => {
    if (
      o instanceof THREE.Mesh &&
      o.material instanceof THREE.MeshStandardMaterial &&
      o.material.name === "chrome-pillow"
    ) {
      const material = o.material.clone();
      material.map = pillowFront;
      material.color.set("#ffffff");
      o.material = material;
    }
  });
  hat?.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (let i = 0; i < mats.length; i++) {
      const m = mats[i];
      if (m instanceof THREE.MeshStandardMaterial && m.name === "cap-black") {
        const gray = m.clone();
        gray.color.set("#b3b3b3");
        gray.map = capFabric;
        gray.normalMap = null;
        gray.bumpMap = capFabric;
        gray.bumpScale = 0.00003;
        mats[i] = gray;
      }
      if (m instanceof THREE.MeshStandardMaterial && m.name === "cap-logo") {
        const logo = m.clone();
        logo.map = capFront;
        logo.color.set("#ffffff");
        logo.transparent = true;
        logo.alphaTest = 0.1;
        logo.depthWrite = false;
        mats[i] = logo;
        // The historical decal used a different crown equation, burying the print inside
        // the crown. Fit each decal vertex to this cap's exact six-panel surface.
        const geo = o.geometry.clone(),
          p = geo.getAttribute("position");
        for (let j = 0; j < p.count; j++) {
          const a = ((j % 9) / 8 - 0.5) * 1.7,
            el = 0.18 + (Math.floor(j / 9) / 8) * 0.7;
          const front = Math.max(0, Math.cos(a)) ** 2,
            r = 1 - 0.012 * Math.cos(a * 3) ** 40 * Math.sin(el * 2);
          p.setXYZ(
            j,
            Math.sin(a) * Math.cos(el) * 0.094 * r,
            Math.sin(el) ** (0.85 - 0.15 * front) * 0.112 * r,
            Math.cos(a) *
              Math.cos(el) *
              0.104 *
              r *
              (1 - 0.1 * front * Math.sin(el)) +
              0.0012,
          );
        }
        geo.computeVertexNormals();
        o.geometry = geo;
      }
      if (m instanceof THREE.MeshStandardMaterial && m.name === "cap-patch") {
        const side = m.clone();
        side.map = null;
        side.color.set("#53545a");
        mats[i] = side;
      }
    }
    o.material = Array.isArray(o.material) ? mats : mats[0];
  });
  const grayRobot = lounge.getObjectByName("roomba-1");
  if (grayRobot) {
    grayRobot.position.set(2.7, 0, -1.855);
    // Removable gray top ring, with its center and the curved hand slot actually open.
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.158, 0, Math.PI * 2, false);
    const center = new THREE.Path();
    center.absarc(0, 0, 0.081, 0, Math.PI * 2, true);
    s.holes.push(center);
    const slot = new THREE.Path();
    slot.absarc(0, 0, 0.131, -0.97, 0.97, false);
    slot.absarc(
      0.131 * Math.cos(0.97),
      0.131 * Math.sin(0.97),
      0.009,
      0.97,
      0.97 + Math.PI,
      false,
    );
    slot.absarc(0, 0, 0.113, 0.97, -0.97, true);
    slot.absarc(
      0.122 * Math.cos(-0.97),
      0.122 * Math.sin(-0.97),
      0.009,
      Math.PI - 0.97,
      -0.97,
      false,
    );
    s.holes.push(slot);
    const cover = new THREE.ExtrudeGeometry(s, {
      depth: 0.005,
      bevelEnabled: true,
      bevelSize: 0.0015,
      bevelThickness: 0.001,
      bevelSegments: 2,
      curveSegments: 48,
    });
    cover.rotateX(-Math.PI / 2);
    add(grayRobot, cover, std("#757a7b", 0.58), 0, 0.091, 0);
  }
  lounge.getObjectByName("roomba-2")?.position.set(2.71, 0, -1.48);
}

/** Deform each connected upholstery/plywood piece together, without cutting across its bulge. */
function chairRegions(geometry: THREE.BufferGeometry) {
  const p = geometry.getAttribute("position"),
    n = p.count,
    parents = Int32Array.from({ length: n }, (_, i) => i);
  const find = (i: number) => {
    while (parents[i] !== i) {
      parents[i] = parents[parents[i]];
      i = parents[i];
    }
    return i;
  };
  const index = geometry.index;
  for (let k = 0; k < (index?.count ?? n); k += 3) {
    const a = find(index ? index.getX(k) : k),
      b = find(index ? index.getX(k + 1) : k + 1),
      c = find(index ? index.getX(k + 2) : k + 2);
    parents[b] = a;
    parents[c] = a;
  }
  const bounds = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i),
      x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      b = bounds.get(root);
    if (b) {
      b[0] = Math.min(b[0], x);
      b[1] = Math.min(b[1], y);
      b[2] = Math.min(b[2], z);
      b[3] = Math.max(b[3], x);
      b[4] = Math.max(b[4], y);
      b[5] = Math.max(b[5], z);
    } else bounds.set(root, [x, y, z, x, y, z]);
  }
  const kinds = new Map<number, number>();
  for (const [root, b] of bounds) {
    const head = b[1] > 0.6 && b[4] > 0.67;
    const arm =
      b[1] > 0.43 &&
      Math.abs((b[0] + b[3]) / 2) > 0.29 &&
      b[3] - b[0] < 0.2 &&
      b[5] > 0;
    const back = b[1] > 0.22 && b[4] > 0.4 && b[5] < -0.065;
    kinds.set(root, head ? 1 : arm ? 3 : back ? 2 : 0);
  }
  return Uint8Array.from({ length: n }, (_, i) => kinds.get(find(i)) ?? 0);
}

/** Monotone cubic keeps cushion edges smooth while widening its center tuft spacing. */
function spreadTufts(x: number, at: number, edge: number) {
  const a = Math.abs(x),
    first = a <= 0.1,
    h = first ? 0.1 : edge - 0.1,
    t = Math.min(1, first ? a / 0.1 : (a - 0.1) / h);
  const v0 = first ? 0 : at,
    v1 = first ? at : edge,
    m0 = first ? at / 0.1 : 0.85,
    m1 = first ? 0.85 : (edge - at) / (edge - 0.1);
  const t2 = t * t,
    t3 = t2 * t;
  return (
    Math.sign(x) *
    ((2 * t3 - 3 * t2 + 1) * v0 +
      (t3 - 2 * t2 + t) * h * m0 +
      (-2 * t3 + 3 * t2) * v1 +
      (t3 - t2) * h * m1)
  );
}

async function detailBackpack(pack: THREE.Object3D) {
  const map = await loadMap("backpack-heather.jpg");
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(8, 12);
  const cloth = new THREE.MeshPhysicalMaterial({
    map,
    color: "#bcbcbc",
    bumpMap: map,
    bumpScale: 0.001,
    roughness: 0.92,
    sheen: 0.25,
    sheenRoughness: 0.8,
  });
  pack.traverse((o) => {
    if (
      o instanceof THREE.Mesh &&
      o.material instanceof THREE.MeshStandardMaterial &&
      o.material.color.getHexString() === "606266"
    ) {
      const m = o.material.clone();
      m.map = map;
      m.color.set("#bcbcbc");
      m.normalScale.set(0.14, 0.14);
      o.material = m;
    }
  });
  const edge = std("#252627", 0.82),
    metal = std("#a6aca9", 0.43, 0.65);
  // Exterior face is opposite the inherited padded shoulder straps. Its upper flap,
  // metal clasp, inset pocket and zipper are visible in photos85/86.
  const face = (w: number, h: number, y: number, z: number, flap = false) => {
    const geo = new THREE.PlaneGeometry(w, h, 20, 24),
      p = geo.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      // Float32 edge coordinates can land just outside [0, 1]. Keep the
      // fractional-power bulge finite at both cloth seams.
      const x = p.getX(i),
        v = THREE.MathUtils.clamp((p.getY(i) + h / 2) / h, 0, 1);
      const taper = 1 - (flap ? 0.1 : 0.15) * Math.abs(v * 2 - 1) ** 10;
      const bulge =
        0.024 *
        Math.max(0, Math.sin(v * Math.PI)) ** 0.65 *
        Math.max(0, Math.cos((x / w) * Math.PI)) ** 0.5;
      const pinch =
        -0.007 *
        Math.exp(-(((Math.abs(x) - w * 0.31) / 0.022) ** 2)) *
        Math.sin(v * Math.PI);
      const fold =
        0.003 * Math.sin(v * 27 + x * 45) * Math.sin(v * Math.PI) +
        0.002 * Math.sin(v * 43 - x * 29);
      const drop = flap
        ? -0.017 * (1 - v) ** 3 * Math.cos((x / w) * Math.PI)
        : 0;
      p.setXYZ(
        i,
        x * taper + 0.003 * Math.sin(v * Math.PI),
        p.getY(i) + drop,
        0.003 + bulge + pinch + fold,
      );
    }
    geo.rotateY(Math.PI);
    geo.computeVertexNormals();
    const m = add(pack, geo, cloth, 0, y, z);
    m.name = flap ? "oct9-backpack-flap" : "oct9-backpack-front";
  };
  face(0.265, 0.36, 0.205, -0.11);
  face(0.265, 0.176, 0.44, -0.119, true);
  tube(
    pack,
    [
      [-0.134, 0.055, -0.099],
      [-0.139, 0.19, -0.114],
      [-0.13, 0.35, -0.121],
      [-0.125, 0.472, -0.1],
    ],
    0.003,
    edge,
  );
  tube(
    pack,
    [
      [0.134, 0.055, -0.099],
      [0.139, 0.19, -0.114],
      [0.13, 0.35, -0.121],
      [0.125, 0.472, -0.1],
    ],
    0.003,
    edge,
  );
  tube(
    pack,
    [
      [-0.127, 0.359, -0.128],
      [-0.068, 0.347, -0.133],
      [0, 0.341, -0.134],
      [0.068, 0.347, -0.133],
      [0.127, 0.359, -0.128],
    ],
    0.0024,
    edge,
  );
  box(pack, 0.022, 0.052, 0.004, std("#575b5b", 0.88), 0, 0.365, -0.138, 0.001);
  const clasp = new THREE.Shape();
  clasp.moveTo(-0.016, -0.007);
  clasp.lineTo(0.016, -0.007);
  clasp.lineTo(0.018, 0.011);
  clasp.lineTo(-0.018, 0.011);
  clasp.closePath();
  const slot = new THREE.Path();
  slot.moveTo(-0.01, -0.002);
  slot.lineTo(-0.01, 0.006);
  slot.lineTo(0.01, 0.006);
  slot.lineTo(0.01, -0.002);
  slot.closePath();
  clasp.holes.push(slot);
  const buckle = new THREE.ExtrudeGeometry(clasp, {
    depth: 0.003,
    bevelEnabled: true,
    bevelSize: 0.001,
    bevelThickness: 0.001,
    bevelSegments: 2,
  });
  add(pack, buckle, metal, 0, 0.345, -0.141);
  const logo = add(
    pack,
    new THREE.PlaneGeometry(0.017, 0.024),
    new THREE.MeshStandardMaterial({
      map: await loadMap("backpack-brand.jpg"),
      roughness: 0.9,
    }),
    0,
    0.437,
    -0.135,
  );
  logo.rotation.y = Math.PI;
  // Carry loop and leather zip pulls remain actual small geometry.
  tube(
    pack,
    [
      [-0.037, 0.506, -0.082],
      [-0.033, 0.537, -0.065],
      [0.025, 0.537, -0.062],
      [0.038, 0.504, -0.08],
    ],
    0.005,
    edge,
  );
  for (const s of [-1, 1])
    box(
      pack,
      0.01,
      0.035,
      0.003,
      edge,
      s * 0.135,
      0.225,
      -0.124,
      0.002,
    ).rotation.z = s * 0.18;
}

function updateMac(room: BuiltRoom) {
  const mac = room.group.getObjectByName("mac-pro");
  if (!mac) return;
  for (const name of ["cable-basket", "mac-pro-cables", "mac-pro-side-panel"])
    mac.getObjectByName(name)?.removeFromParent();
  // V4 photos 100/104/105: tower front faces into the room, between fridge and drum.
  const tower = mac.getObjectByName("mac-pro-tower");
  if (tower) {
    tower.position.set(-2.27, 0.005, -2.405);
    tower.rotation.y = Math.PI / 2;
  }
  const display = mac.getObjectByName("cinema-display");
  if (display) {
    display.position.set(-2.67, 1.262, -2.083);
    display.rotation.y = Math.PI / 2;
  }
}

async function updateBench(room: BuiltRoom) {
  const bench = room.group.getObjectByName("printer-bench");
  if (!bench) return;
  bench.getObjectByName("october-printer-bench-props")?.removeFromParent();
  for (const name of [
    "amber-bottle",
    "ipa-bottle",
    "butane-torch",
    "black-bottle",
    "clear-round-box",
    "white-triangle",
    "orange-marker",
    "blue-pliers",
    "snap-knife",
    "screwdriver",
    "scraper",
    "kapton-roll",
    "teal-cup",
  ])
    bench.getObjectByName(name)?.removeFromParent();
  const mat = bench.getObjectByName("cutting-mat");
  if (mat) {
    mat.position.set(-2.38, 0.9815, -2.02);
    mat.scale.set(1.28, 1, 1.47);
    mat.rotation.y = 0;
  }
  // Small display remains to the left of the Mac monitor, rather than in the middle of the mat.
  const tablet = bench.getObjectByName("tablet-stand");
  const miniMap = await loadMap("mini-screen.jpg");
  if (tablet) {
    tablet.position.set(-2.72, 1.06, -1.645);
    tablet.scale.setScalar(0.62);
    tablet.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshStandardMaterial &&
        o.material.emissiveIntensity > 0.1 &&
        o.material.map
      ) {
        const m = o.material.clone();
        m.map = miniMap;
        m.emissiveMap = miniMap;
        m.emissiveIntensity = 0.16;
        o.material = m;
      }
    });
  }
  const fridgeMap = await loadMap("fridge-interior.jpg");
  bench.getObjectByName("bud-light-fridge")?.traverse((o) => {
    if (
      o instanceof THREE.Mesh &&
      o.material instanceof THREE.MeshStandardMaterial &&
      o.material.emissiveMap
    ) {
      const m = o.material.clone();
      m.map = fridgeMap;
      m.emissiveMap = fridgeMap;
      m.emissiveIntensity = 0.25;
      o.material = m;
    }
  });
  bench.getObjectByName("six-pack")?.removeFromParent();
  const drum = bench.getObjectByName("bentwood-drum");
  if (drum) {
    drum.position.set(-2.405, 0, -2.795);
    const map = await loadMap("bentwood-drum.jpg");
    map.wrapS = THREE.RepeatWrapping;
    map.repeat.set(2, 1);
    drum.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshStandardMaterial
      ) {
        const m = o.material.clone();
        m.map = map;
        m.color.set("#e1c5a5");
        m.roughness = 0.76;
        if (m instanceof THREE.MeshPhysicalMaterial) m.clearcoat = 0.1;
        o.material = m;
      }
    });
    for (const y of [0.012, 0.045, 0.301]) {
      const ring = add(
        drum,
        new THREE.TorusGeometry(0.186, 0.0025, 7, 64),
        std("#775438", 0.75),
        0,
        y,
        0,
      );
      ring.rotation.x = Math.PI / 2;
    }
  }
  const bambu = bench.getObjectByName("bambu-p2s");
  if (bambu) {
    const label = await loadMap("x1-carbon-label.jpg");
    for (const child of bambu.children)
      if (
        child instanceof THREE.Mesh &&
        child.geometry.type === "PlaneGeometry" &&
        child.position.y > 0.4
      ) {
        child.material = new THREE.MeshStandardMaterial({
          map: label,
          roughness: 0.65,
        });
      }
    const turquoise = std("#25bdc6", 0.37);
    cyl(bambu, 0.011, 0.085, turquoise, -0.239, 0.296, 0.126).rotation.z =
      Math.PI / 2;
    cyl(bambu, 0.009, 0.062, turquoise, -0.263, 0.267, 0.127).rotation.z =
      -0.27;
    cyl(bambu, 0.016, 0.008, turquoise, -0.283, 0.296, 0.126).rotation.z =
      Math.PI / 2;
  }
  const props = new THREE.Group();
  props.name = "oct9-printer-bench-props";
  bench.add(props);
  const white = std("#e8e6dc", 0.64),
    black = std("#15181b", 0.6),
    steel = std("#a6abad", 0.42, 0.6),
    cream = std("#eee6ba", 0.9);
  const prop = (
    name: string,
    x: number,
    z: number,
    y = 0.984,
    rotation = Math.PI / 2,
  ) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    g.rotation.y = rotation;
    g.userData.physics = { type: "dynamic", mass: 0.25, shape: "hull" };
    props.add(g);
    return g;
  };
  // Small white two-slot accessory drawer at the left end of the bench.
  const drawer = prop("oct9-mini-drawer", -2.72, -1.66);
  box(drawer, 0.25, 0.086, 0.15, white, 0, 0.043, 0, 0.005);
  box(drawer, 0.232, 0.002, 0.145, black, 0, 0.087, 0, 0.001);
  box(drawer, 0.226, 0.002, 0.004, std("#adafa9"), 0, 0.044, 0.077, 0.0005);
  for (const y of [0.026, 0.067]) {
    box(drawer, 0.17, 0.004, 0.004, black, 0, y, 0.079, 0.002);
    box(drawer, 0.164, 0.002, 0.003, white, 0, y - 0.003, 0.079, 0.001);
  }
  // Compact mechanical keyboard: silver extrusion, white alphas, gray modifiers and pink space.
  const kb = prop("oct9-workbench-keyboard", -2.6, -2.025);
  box(kb, 0.337, 0.017, 0.132, steel, 0, 0.01, 0, 0.005);
  box(kb, 0.327, 0.008, 0.122, black, 0, 0.022, 0, 0.003);
  const gray = std("#62646f", 0.65),
    pink = std("#df748c", 0.6);
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 16; col++) {
      if (row === 4 && col > 3 && col < 10) continue;
      const w = row === 4 && col === 3 ? 0.134 : 0.0172;
      const x = row === 4 && col === 3 ? -0.024 : -0.15 + col * 0.0199;
      const key = box(
        kb,
        w,
        0.009,
        0.018,
        row === 4 && col === 3
          ? pink
          : col < 2 || col > 13 || row === 0
            ? gray
            : white,
        x,
        0.031,
        (row - 2) * 0.023,
        0.002,
      );
      key.rotation.x = -0.05;
      if (!(row === 4 && col === 3))
        box(
          kb,
          0.0035,
          0.0004,
          0.0014,
          std("#54565b", 0.9),
          x - 0.003,
          0.0358,
          (row - 2) * 0.023 - 0.004,
          0.0002,
        );
    }
  const cable = std("#dedfd6", 0.78);
  tube(
    props,
    [
      [-2.69, 1.225, -1.82],
      [-2.75, 1.5, -1.815],
      [-2.81, 1.5, -1.9],
      [-2.83, 1.05, -2.2],
      [-2.85, 0.05, -2.32],
    ],
    0.003,
    cable,
  );
  // Two cream masking-tape rolls and black electrical tape; all are open rings.
  const tape = (
    name: string,
    x: number,
    z: number,
    r: number,
    h: number,
    m: THREE.Material,
  ) => {
    const g = prop(name, x, z);
    lathe(
      g,
      [
        [r * 0.68, 0],
        [r, 0],
        [r, h],
        [r * 0.68, h],
        [r * 0.68, 0],
      ],
      m,
    );
    lathe(
      g,
      [
        [r * 0.68, 0],
        [r * 0.72, 0],
        [r * 0.72, h * 0.95],
        [r * 0.68, h * 0.95],
        [r * 0.68, 0],
      ],
      std("#af9b63", 0.95),
    );
    return g;
  };
  tape("oct9-masking-tape-front", -2.19, -2.105, 0.069, 0.014, cream);
  tape("oct9-masking-tape-back", -2.51, -1.61, 0.056, 0.012, cream);
  tape("oct9-electrical-tape", -2.19, -1.75, 0.028, 0.018, black);
  // Tool bit holder opens like a clamshell; individual metal bits have yellow collars.
  const bits = prop("oct9-driver-bits", -2.2, -1.665, 0.984, 0.8);
  box(bits, 0.081, 0.014, 0.053, black, 0, 0.008, 0, 0.007);
  const lid = box(bits, 0.081, 0.048, 0.007, black, 0, 0.035, -0.024, 0.006);
  lid.rotation.x = -0.55;
  for (let i = 0; i < 8; i++) {
    cyl(bits, 0.0023, 0.025, steel, (i - 3.5) * 0.009, 0.027, 0);
    cyl(bits, 0.003, 0.013, std("#cfad32"), (i - 3.5) * 0.009, 0.015, 0);
  }
  // Small claw hammer, caliper, fasteners and zip bag, from the close overhead photo108.
  const hammer = prop("oct9-claw-hammer", -2.32, -1.935, 0.984, 0.55);
  const grip = box(hammer, 0.029, 0.031, 0.115, black, 0, 0.022, 0.025, 0.01);
  grip.rotation.y = -0.1;
  box(hammer, 0.017, 0.012, 0.041, std("#3d999a"), 0, 0.039, 0.038, 0.007);
  box(hammer, 0.018, 0.018, 0.059, steel, 0, 0.024, -0.059, 0.004);
  cyl(hammer, 0.018, 0.062, steel, 0, 0.026, -0.098).rotation.z = Math.PI / 2;
  for (const sign of [-1, 1])
    tube(
      hammer,
      [
        [0.01, 0.034, -0.099],
        [0.026, 0.029, -0.11],
        [0.046, 0.011, -0.123 + sign * 0.006],
      ],
      0.005,
      steel,
    );
  const cal = prop("oct9-digital-caliper", -2.34, -2.115, 0.984, 2.5);
  box(cal, 0.018, 0.005, 0.235, steel, 0, 0.007, 0, 0.001);
  box(cal, 0.038, 0.012, 0.038, black, 0, 0.016, -0.065, 0.002);
  box(cal, 0.023, 0.001, 0.013, std("#777e6c"), 0, 0.0225, -0.065, 0.001);
  for (const z of [-0.099, -0.055]) {
    box(cal, 0.07, 0.006, 0.011, steel, 0.019, 0.011, z, 0.001);
    box(cal, 0.006, 0.007, 0.04, steel, 0.051, 0.011, z + 0.016, 0.001);
  }
  for (let i = 0; i < 22; i++)
    box(
      cal,
      0.006,
      0.0006,
      0.0007,
      black,
      -0.004,
      0.01,
      -0.1 + i * 0.01,
      0.0002,
    );
  const screws = prop("oct9-fasteners", -2.34, -1.74, 0.985, 0);
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Group();
    s.position.set(((i % 3) - 0.8) * 0.028, 0, (Math.floor(i / 3) - 1) * 0.037);
    s.rotation.y = i * 1.8;
    screws.add(s);
    cyl(s, 0.0025, 0.038, steel, 0, 0.003, 0).rotation.x = Math.PI / 2;
    cyl(s, 0.0055, 0.004, steel, 0, 0.006, 0.019).rotation.x = Math.PI / 2;
    for (let j = 0; j < 7; j++)
      cyl(s, 0.003, 0.0007, steel, 0, 0.003, -0.016 + j * 0.004).rotation.x =
        Math.PI / 2;
  }
  const bag = prop("oct9-small-parts-bag", -2.16, -1.81, 0.984, -0.1);
  box(
    bag,
    0.073,
    0.004,
    0.066,
    new THREE.MeshPhysicalMaterial({
      color: "#d8e1dc",
      transparent: true,
      opacity: 0.3,
      roughness: 0.24,
      depthWrite: false,
    }),
    0,
    0.004,
    0,
    0.001,
  );
  box(bag, 0.068, 0.002, 0.002, white, 0, 0.008, -0.027, 0.0004);
  box(bag, 0.037, 0.001, 0.034, white, 0, 0.007, 0, 0.0006);
  // Open pale cardboard carton beside the keyboard, with creased flaps and black cable inside.
  const carton = prop(
    "oct9-open-parts-carton",
    -2.46,
    -2.3,
    0.984,
    Math.PI / 2 + 0.08,
  );
  const card = std("#e0e2d7", 0.97);
  box(carton, 0.225, 0.003, 0.145, card, 0, 0.002, 0, 0.0005);
  for (const sign of [-1, 1]) {
    box(carton, 0.003, 0.076, 0.145, card, sign * 0.112, 0.04, 0, 0.0005);
    box(carton, 0.225, 0.076, 0.003, card, 0, 0.04, sign * 0.071, 0.0005);
  }
  const lidG = new THREE.Group();
  lidG.position.set(0, 0.078, -0.072);
  lidG.rotation.x = -0.28;
  carton.add(lidG);
  box(lidG, 0.224, 0.002, 0.142, card, 0, 0.002, -0.07, 0.0004);
  for (const sign of [-1, 1]) {
    const flap = box(
      carton,
      0.063,
      0.002,
      0.143,
      card,
      sign * 0.141,
      0.089,
      0,
      0.0004,
    );
    flap.rotation.z = sign * 0.33;
  }
  for (let i = 0; i < 5; i++)
    tube(
      carton,
      [
        [-0.065, 0.016 + i * 0.006, 0],
        [-0.063, 0.023 + i * 0.006, -0.044],
        [0.066, 0.03 + i * 0.006, -0.035],
        [0.074, 0.017 + i * 0.006, 0.042],
        [-0.065, 0.016 + i * 0.006, 0],
      ],
      0.0027,
      black,
    );
  // Round vacuum battery, little braided cable and black BYRO spray bottle.
  const battery = prop("oct9-vacuum-battery", -2.225, -2.34);
  cyl(battery, 0.051, 0.041, black, 0, 0.022, 0);
  cyl(battery, 0.047, 0.009, std("#35383a"), 0, 0.047, 0);
  box(battery, 0.024, 0.055, 0.03, std("#44464a"), 0, 0.075, 0, 0.003);
  const braid = prop("oct9-red-white-braid", -2.2, -2.265);
  for (let i = 0; i < 5; i++) {
    const pts = Array.from({ length: 65 }, (_, j) => {
      const a = (j / 64) * Math.PI * 2;
      return [
        Math.cos(a) * (0.009 + i * 0.0006),
        0.005 + i * 0.004 + Math.sin(a * 3) * 0.002,
        Math.sin(a) * 0.01,
      ] as V3;
    });
    tube(braid, pts, 0.002, white);
    tube(
      braid,
      pts.map((p, j) => [
        p[0] + Math.cos(j * 1.2) * 0.001,
        p[1] + Math.sin(j * 1.2) * 0.001,
        p[2],
      ]),
      0.0007,
      std("#b4233b"),
    );
  }
  const spray = prop("oct9-byro-spray", -2.235, -2.418);
  lathe(
    spray,
    [
      [0, 0],
      [0.02, 0],
      [0.024, 0.004],
      [0.024, 0.105],
      [0.016, 0.119],
      [0.01, 0.124],
      [0.01, 0.147],
      [0, 0.147],
    ],
    black,
  );
  cyl(spray, 0.01, 0.027, std("#aab1ad", 0.28), 0, 0.15, 0);
  const byro = await loadMap("byro-label.jpg");
  add(
    spray,
    new THREE.CylinderGeometry(0.0243, 0.0243, 0.085, 40, 1, true, -0.8, 1.6),
    new THREE.MeshStandardMaterial({ map: byro, roughness: 0.6 }),
    0,
    0.056,
    0,
  );
  // Milwaukee red tape and the smaller yellow/black measure immediately alongside.
  const red = std("#c92731", 0.5),
    yellow = std("#edc625", 0.48);
  for (const [name, x, z, w, h, m] of [
    ["red", -2.24, -2.625, 0.079, 0.077, red],
    ["yellow", -2.25, -2.715, 0.062, 0.073, yellow],
  ] as const) {
    const tapeG = prop(`oct9-${name}-tape-measure`, x, z, 0.984, Math.PI / 2);
    box(tapeG, w, h, 0.039, black, 0, h / 2, 0, 0.018);
    box(tapeG, w * 0.9, h * 0.91, 0.042, m, 0, h * 0.52, 0, 0.017);
    box(tapeG, w * 0.93, 0.017, 0.046, black, 0, 0.009, 0, 0.004);
    box(tapeG, 0.022, 0.016, 0.044, black, 0, h - 0.008, 0, 0.006);
    box(tapeG, 0.031, 0.005, 0.012, steel, 0, 0.004, 0.029, 0.001);
    if (name === "red") {
      const map = await loadMap("milwaukee-tape.jpg");
      add(
        tapeG,
        new THREE.PlaneGeometry(0.043, 0.042),
        new THREE.MeshStandardMaterial({ map, roughness: 0.6 }),
        0,
        0.043,
        0.0221,
      );
    }
  }
  const driver = prop("oct9-blue-black-screwdriver", -2.2, -2.885, 0.984, 1.27);
  cyl(driver, 0.015, 0.092, black, 0, 0.017, 0).rotation.x = Math.PI / 2;
  cyl(driver, 0.009, 0.03, std("#2c699c"), 0, 0.017, 0.038).rotation.x =
    Math.PI / 2;
  for (const sign of [-1, 1])
    box(
      driver,
      0.006,
      0.015,
      0.066,
      std("#315e83"),
      sign * 0.012,
      0.017,
      0,
      0.003,
    );
  cyl(driver, 0.003, 0.06, steel, 0, 0.017, -0.068).rotation.x = Math.PI / 2;
  const smallDriver = prop("oct9-clear-screwdriver", -2.16, -2.5, 0.984, -0.45);
  cyl(smallDriver, 0.01, 0.063, std("#969c87", 0.3), 0, 0.011, 0).rotation.x =
    Math.PI / 2;
  cyl(smallDriver, 0.0025, 0.052, steel, 0, 0.011, -0.053).rotation.x =
    Math.PI / 2;
  // Translucent silver short filament sample at the monitor's left edge, and amber box behind it.
  const spool = prop("oct9-silver-sample", -2.69, -1.82);
  cyl(spool, 0.027, 0.078, std("#adc4bd", 0.4, 0.45), 0, 0.039, 0);
  for (let j = 0; j < 32; j++) {
    const a = (j / 32) * Math.PI * 2;
    tube(
      spool,
      [
        [Math.cos(a) * 0.027, 0, Math.sin(a) * 0.027],
        [Math.cos(a) * 0.027, 0.078, Math.sin(a) * 0.027],
      ],
      0.0005,
      white,
    );
  }
  const pack = prop("oct9-amber-parts-container", -2.79, -1.82);
  box(pack, 0.066, 0.133, 0.059, std("#dc9e15", 0.55), 0, 0.066, 0, 0.006);
  box(pack, 0.071, 0.027, 0.063, std("#cdd0c9", 0.35), 0, 0.142, 0, 0.004);
  // New visible printer under the bench, on the original bentwood drum.
  removeOldUnderBenchBox(bench);
  const ff = await flashforge();
  ff.position.set(-2.405, 0.335, -2.795);
  ff.rotation.y = Math.PI / 2;
  bench.add(ff);
}

async function updateShelves(room: BuiltRoom) {
  const shelves = room.group.getObjectByName("east-shelf-props");
  if (!shelves) return;
  // Current photos18/131: the ball is nested in the stag bowl, and the headset
  // sits on the counter underneath. Both retain the same wall cutaway parent.
  shelves.getObjectByName("brass-urn")?.removeFromParent();
  shelves.getObjectByName("quest-headset")?.removeFromParent();
  shelves.getObjectByName("dangling-usb-cable")?.removeFromParent();
  tube(
    shelves,
    [
      [1.79, 1.503, 2.965],
      [1.82, 1.514, 2.96],
      [1.86, 1.518, 2.98],
      [1.91, 1.509, 2.97],
      [1.95, 1.505, 2.98],
    ],
    0.0023,
    std("#deded7", 0.7),
  );
  const deckMap = await loadMap("syntax-deck.jpg");
  room.group.getObjectByName("skateboards")?.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map((m) => {
      if (
        m instanceof THREE.MeshStandardMaterial &&
        m.name === "deck-graphic"
      ) {
        const n = m.clone();
        n.map = deckMap;
        return n;
      }
      return m;
    });
  });
  const ball = shelves.getObjectByName("syntax-basketball"),
    ballMap = await loadMap("syntax-ball.jpg");
  if (ball) {
    ball.position.set(2.03, 1.18, 2.96);
    ball.rotation.y = 0;
    ball.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshStandardMaterial
      ) {
        const m = o.material.clone();
        m.map = ballMap;
        m.color.set("#c1c1bd");
        m.bumpScale = 0.0012;
        o.material = m;
      }
    });
  }
  const goblet = shelves.getObjectByName("pewter-goblet");
  if (goblet) {
    goblet.position.set(1.89, 0.855, 2.85);
    goblet.scale.set(1.05, 0.84, 1.05);
    goblet.rotation.y = -0.8;
    goblet.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshStandardMaterial
      ) {
        const m = o.material.clone();
        m.color.set("#666b6a");
        m.roughness = 0.52;
        m.metalness = 0.8;
        m.envMapIntensity = 1.5;
        o.material = m;
      }
    });
  }
  const bowl = new THREE.Group();
  bowl.name = "oct9-stag-bowl";
  bowl.position.set(2.03, 1.13, 2.96);
  bowl.scale.y = 0.94;
  shelves.add(bowl);
  const patina = await loadMap("bronze-patina.jpg");
  patina.wrapS = THREE.RepeatWrapping;
  patina.repeat.set(2, 1);
  const bronze = new THREE.MeshPhysicalMaterial({
    color: "#95816a",
    map: patina,
    metalness: 0.75,
    roughness: 0.54,
    clearcoat: 0.1,
    bumpMap: patina,
    bumpScale: 0.0006,
    envMapIntensity: 1.2,
  });
  lathe(
    bowl,
    [
      [0, 0],
      [0.05, 0],
      [0.058, 0.005],
      [0.056, 0.012],
      [0.044, 0.019],
      [0.028, 0.025],
      [0.028, 0.041],
      [0.048, 0.053],
      [0.074, 0.074],
      [0.101, 0.1],
      [0.122, 0.134],
      [0.131, 0.165],
      [0.134, 0.173],
      [0.133, 0.18],
      [0.13, 0.181],
      [0.125, 0.173],
      [0.118, 0.138],
      [0.097, 0.104],
      [0.07, 0.08],
      [0.04, 0.06],
      [0, 0.059],
    ],
    bronze,
  );
  for (const y of [0.012, 0.172, 0.178]) {
    const r = add(
      bowl,
      new THREE.TorusGeometry(y < 0.02 ? 0.056 : 0.132, 0.0017, 8, 64),
      bronze,
      0,
      y,
      0,
    );
    r.rotation.x = Math.PI / 2;
  }
  const ellipsoid = (
    g: THREE.Object3D,
    p: number[],
    r: number[],
    m: THREE.Material,
  ) => {
    const o = add(g, new THREE.SphereGeometry(1, 24, 16), m, ...(p as V3));
    o.scale.set(...(r as V3));
    return o;
  };
  const horn = (g: THREE.Object3D, points: number[][], r: number) => {
    const curve = new THREE.CatmullRomCurve3(
        points.map(
          (p) => new THREE.Vector3(p[0], 0.08 + (p[1] - 0.08) * 0.53, p[2]),
        ),
      ),
      geo = new THREE.TubeGeometry(curve, 30, r, 8, false),
      p = geo.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const t = Math.floor(i / 9) / 30,
        c = curve.getPointAt(t),
        k = 0.1 + 0.9 * (1 - t) ** 0.68;
      p.setXYZ(
        i,
        c.x + (p.getX(i) - c.x) * k,
        c.y + (p.getY(i) - c.y) * k,
        c.z + (p.getZ(i) - c.z) * k,
      );
    }
    geo.computeVertexNormals();
    add(g, geo, bronze);
  };
  for (const side of [-1, 1]) {
    const deer = new THREE.Group();
    deer.name = `oct9-bronze-stag-${side}`;
    deer.position.set(side * 0.12, 0.124, -0.035);
    deer.rotation.y = -side * 0.95;
    bowl.add(deer);
    ellipsoid(deer, [0, 0.018, 0], [0.021, 0.039, 0.026], bronze).rotation.x =
      -0.2;
    ellipsoid(
      deer,
      [0, 0.058, -0.011],
      [0.018, 0.027, 0.022],
      bronze,
    ).rotation.x = -0.28;
    ellipsoid(
      deer,
      [0, 0.051, -0.033],
      [0.012, 0.013, 0.025],
      bronze,
    ).rotation.x = 0.1;
    ellipsoid(
      deer,
      [0, 0.052, -0.055],
      [0.011, 0.008, 0.007],
      std("#4d4335", 0.5, 0.65),
    );
    for (const s of [-1, 1]) {
      const ear = ellipsoid(
        deer,
        [s * 0.025, 0.076, 0.002],
        [0.01, 0.022, 0.004],
        bronze,
      );
      ear.rotation.z = -s * 0.7;
      ellipsoid(
        deer,
        [s * 0.014, 0.066, -0.025],
        [0.0024, 0.0024, 0.0018],
        std("#282620", 0.34, 0.5),
      );
      horn(
        deer,
        [
          [s * 0.009, 0.078, 0.004],
          [s * 0.025, 0.11, 0.015],
          [s * 0.045, 0.133, 0.028],
          [s * 0.078, 0.145, 0.041],
          [s * 0.112, 0.16, 0.064],
        ],
        0.0055,
      );
      horn(
        deer,
        [
          [s * 0.022, 0.106, 0.014],
          [s * 0.01, 0.135, -0.003],
          [s * 0.004, 0.159, -0.011],
        ],
        0.0036,
      );
      horn(
        deer,
        [
          [s * 0.042, 0.129, 0.028],
          [s * 0.043, 0.155, 0.015],
          [s * 0.053, 0.179, 0.011],
        ],
        0.0038,
      );
      horn(
        deer,
        [
          [s * 0.073, 0.143, 0.04],
          [s * 0.084, 0.169, 0.033],
          [s * 0.103, 0.184, 0.041],
        ],
        0.0032,
      );
      horn(
        deer,
        [
          [s * 0.095, 0.151, 0.052],
          [s * 0.116, 0.153, 0.034],
          [s * 0.132, 0.17, 0.036],
        ],
        0.0028,
      );
    }
  }
  const headset = new THREE.Group();
  headset.name = "oct9-quest-headset";
  headset.position.set(2.11, 0.862, 2.9);
  headset.rotation.y = 0.1;
  shelves.add(headset);
  const white = new THREE.MeshPhysicalMaterial({
      color: "#e5e5df",
      roughness: 0.43,
      clearcoat: 0.2,
    }),
    foam = std("#303234", 0.93),
    lens = std("#141b20", 0.2);
  box(headset, 0.184, 0.093, 0.065, white, 0, 0.052, -0.011, 0.024);
  box(headset, 0.173, 0.079, 0.033, foam, 0, 0.052, 0.027, 0.022);
  box(headset, 0.15, 0.067, 0.024, std("#121719", 0.9), 0, 0.053, 0.046, 0.021);
  for (const sign of [-1, 1])
    for (const [x, y] of [
      [0.041, 0.034],
      [0.056, 0.048],
      [0.059, 0.022],
    ]) {
      const eye = cyl(headset, 0.0065, 0.003, lens, x * sign, y, -0.045);
      eye.rotation.x = Math.PI / 2;
      const dot = add(
        headset,
        new THREE.CircleGeometry(0.003, 16),
        std("#263940", 0.16, 0.25),
        x * sign,
        y,
        -0.0467,
      );
      dot.rotation.y = Math.PI;
    }
  for (const s of [-1, 1])
    box(headset, 0.014, 0.02, 0.112, white, s * 0.093, 0.065, 0.068, 0.006);
  // Broad fabric straps: sections follow the arch without replacing it with a wire loop.
  const strap = std("#b8b9b5", 0.9);
  const band = (points: number[][], w: number) => {
    for (let i = 1; i < points.length; i++) {
      const a = new THREE.Vector3(...points[i - 1]),
        b = new THREE.Vector3(...points[i]),
        mid = a.clone().lerp(b, 0.5);
      const m = box(
        headset,
        w,
        0.004,
        a.distanceTo(b) + 0.006,
        strap,
        ...(mid.toArray() as V3),
        0.0015,
      );
      m.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        b.sub(a).normalize(),
      );
    }
  };
  band(
    [
      [0, 0.093, 0.018],
      [0, 0.143, 0.05],
      [0, 0.163, 0.101],
      [0, 0.14, 0.15],
      [0, 0.08, 0.167],
    ],
    0.027,
  );
  for (const s of [-1, 1])
    band(
      [
        [s * 0.094, 0.065, 0.078],
        [s * 0.086, 0.068, 0.141],
        [s * 0.056, 0.073, 0.177],
        [0, 0.078, 0.18],
      ],
      0.024,
    );
  box(headset, 0.031, 0.027, 0.004, white, 0, 0.128, 0.161, 0.004);
}

function updateFilamentRack(room: BuiltRoom) {
  const rack = room.group.getObjectByName("filament-rack");
  if (!rack) return;
  const materials = new Map<THREE.Material, THREE.Material>();
  const obsoleteGaskets: THREE.Object3D[] = [];
  rack.traverse((o) => {
    if (
      !(o instanceof THREE.Mesh) ||
      !(o.material instanceof THREE.MeshStandardMaterial)
    )
      return;
    if (o.material.color.getHexString() === "c9ccd0") {
      obsoleteGaskets.push(o);
      return;
    }
    const old = o.material;
    if (materials.has(old)) {
      o.material = materials.get(old)!;
      return;
    }
    const m = old.clone();
    if (m.transparent) {
      const body = m.opacity < 0.3;
      m.color.set(body ? "#68787f" : "#b4bfc3");
      m.opacity = body ? 0.12 : m.opacity < 0.56 ? 0.26 : 0.32;
      if (m instanceof THREE.MeshPhysicalMaterial) {
        m.clearcoat = 0.35;
        m.clearcoatRoughness = 0.3;
      }
    }
    materials.set(old, m);
    o.material = m;
  });
  for (const gasket of obsoleteGaskets) gasket.removeFromParent();
  // Six additional full bins are present in the new photograph. Reuse the exact
  // detailed lid, four latches, rim, spool and winding construction from a donor.
  const sourceMeshes: THREE.Mesh[] = [];
  rack.traverse((o) => {
    if (o instanceof THREE.Mesh) sourceMeshes.push(o);
  });
  const copyBin = (
    name: string,
    cx: number,
    top: number,
    dx: number,
    dy: number,
    dark = false,
  ) => {
    const group = new THREE.Group();
    group.name = name;
    rack.add(group);
    for (const mesh of sourceMeshes) {
      const src: THREE.BufferGeometry = mesh.geometry.index
          ? mesh.geometry.toNonIndexed()
          : mesh.geometry,
        p = src.getAttribute("position"),
        keep: number[] = [];
      for (let i = 0; i < p.count; i += 3) {
        const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3,
          y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3,
          z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
        if (
          Math.abs(x - cx) < 0.059 &&
          y > top - 0.239 &&
          y < top + 0.001 &&
          z > -0.57 &&
          z < -0.337
        )
          keep.push(i, i + 1, i + 2);
      }
      if (!keep.length) continue;
      const geo = new THREE.BufferGeometry();
      for (const [name, a] of Object.entries(src.attributes)) {
        const values = new Float32Array(keep.length * a.itemSize);
        keep.forEach((index, j) => {
          for (let k = 0; k < a.itemSize; k++)
            values[j * a.itemSize + k] = a.getComponent(index, k);
        });
        geo.setAttribute(name, new THREE.BufferAttribute(values, a.itemSize));
      }
      geo.translate(dx, dy, 0);
      let mat = mesh.material;
      if (
        dark &&
        mat instanceof THREE.MeshStandardMaterial &&
        !mat.transparent &&
        (mat.color.getHexString() === "8f9398" ||
          mat.color.getHexString() === "a9acb0")
      ) {
        const darkSpool = mat.clone();
        darkSpool.color.set("#28343d");
        mat = darkSpool;
      }
      add(group, geo, mat as THREE.Material);
    }
  };
  copyBin("oct9-top-front-bin", -2.385, 0.255, 0, 1.82, true);
  copyBin("oct9-top-back-bin", -2.599, 2.075, -0.107, 0);
  copyBin("oct9-second-row-bin-4", -2.599, 1.815, -0.107, 0);
  copyBin("oct9-second-row-bin-5", -2.599, 1.815, -0.214, 0);
  copyBin("oct9-seventh-row-bin-5", -2.706, 0.515, -0.107, 0);
  copyBin("oct9-bottom-row-bin-5", -2.706, 0.255, -0.107, 0);
  // The old gasket was a filled opaque plate. A thin perimeter seal leaves the
  // transparent lid's center open, as seen in the current close-up photograph56.
  const seal = new THREE.MeshPhysicalMaterial({
    color: "#b3c0c5",
    roughness: 0.32,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    clearcoat: 0.3,
  });
  const ring = new THREE.Shape();
  ring.moveTo(-0.045, -0.107);
  ring.lineTo(0.045, -0.107);
  ring.quadraticCurveTo(0.053, -0.107, 0.053, -0.099);
  ring.lineTo(0.053, 0.099);
  ring.quadraticCurveTo(0.053, 0.107, 0.045, 0.107);
  ring.lineTo(-0.045, 0.107);
  ring.quadraticCurveTo(-0.053, 0.107, -0.053, 0.099);
  ring.lineTo(-0.053, -0.099);
  ring.quadraticCurveTo(-0.053, -0.107, -0.045, -0.107);
  const opening = new THREE.Path();
  opening.moveTo(-0.043, -0.104);
  opening.quadraticCurveTo(-0.05, -0.104, -0.05, -0.097);
  opening.lineTo(-0.05, 0.097);
  opening.quadraticCurveTo(-0.05, 0.104, -0.043, 0.104);
  opening.lineTo(0.043, 0.104);
  opening.quadraticCurveTo(0.05, 0.104, 0.05, 0.097);
  opening.lineTo(0.05, -0.097);
  opening.quadraticCurveTo(0.05, -0.104, 0.043, -0.104);
  opening.lineTo(-0.043, -0.104);
  ring.holes.push(opening);
  const sealGeometry = new THREE.ExtrudeGeometry(ring, {
    depth: 0.002,
    bevelEnabled: false,
    curveSegments: 5,
  });
  sealGeometry.rotateX(-Math.PI / 2);
  for (let row = 0; row < 8; row++)
    for (let slot = 0; slot < (row === 0 ? 4 : 5); slot++)
      add(
        rack,
        sealGeometry,
        seal,
        -2.385 - slot * 0.107,
        2.075 - row * 0.26 - 0.018,
        -0.452,
      );
  const rail = std("#dddeda", 0.6);
  for (const y of [2.075, 1.815])
    box(rack, 0.51, 0.018, 0.05, rail, -2.62, y + 0.01, -0.452, 0.002);
}

type V3 = [number, number, number];
const std = (color: string, roughness = 0.55, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const add = (
  g: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = !mat.transparent;
  g.add(m);
  return m;
};
const box = (
  g: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  m: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  r = 0.002,
) =>
  add(
    g,
    new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 3, h / 3, d / 3)),
    m,
    x,
    y,
    z,
  );
const cyl = (
  g: THREE.Object3D,
  r: number,
  h: number,
  m: THREE.Material,
  x = 0,
  y = h / 2,
  z = 0,
) => add(g, new THREE.CylinderGeometry(r, r, h, 32), m, x, y, z);
const lathe = (g: THREE.Object3D, p: number[][], m: THREE.Material) =>
  add(
    g,
    new THREE.LatheGeometry(
      p.map((v) => new THREE.Vector2(v[0], v[1])),
      48,
    ),
    m,
  );
const tube = (g: THREE.Object3D, p: number[][], r: number, m: THREE.Material) =>
  add(
    g,
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(p.map((v) => new THREE.Vector3(...v))),
      Math.max(16, p.length * 5),
      r,
      7,
      false,
    ),
    m,
  );
async function loadMap(name: string) {
  const map = await new THREE.TextureLoader().loadAsync(
    `/office-v4/room/${name}`,
  );
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

function removeOldUnderBenchBox(bench: THREE.Object3D) {
  // The old model combined its vague rear box into the bench-frame meshes. Remove only
  // triangles inside those documented bounds, leaving its tray, apron and steel legs intact.
  bench.getObjectByName("bench-frame")?.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const source: THREE.BufferGeometry = o.geometry.index
      ? o.geometry.toNonIndexed()
      : o.geometry;
    const p = source.getAttribute("position");
    const keep: number[] = [];
    for (let i = 0; i < p.count; i += 3) {
      const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3,
        y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3,
        z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
      if (
        !(
          x > -2.86 &&
          x < -2.485 &&
          z > -3.075 &&
          z < -2.785 &&
          y > 0.58 &&
          y < 0.921
        )
      )
        keep.push(i, i + 1, i + 2);
    }
    if (keep.length === p.count) return;
    const geometry = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(source.attributes)) {
      const values = new Float32Array(keep.length * a.itemSize);
      keep.forEach((index, j) => {
        for (let k = 0; k < a.itemSize; k++)
          values[j * a.itemSize + k] = a.getComponent(index, k);
      });
      geometry.setAttribute(
        name,
        new THREE.BufferAttribute(values, a.itemSize),
      );
    }
    o.geometry = geometry;
  });
}

async function flashforge() {
  const g = new THREE.Group();
  g.name = "oct9-flashforge-adventurer-5m";
  g.userData.physics = { type: "dynamic", mass: 12, shape: "box" };
  const W = 0.377,
    D = 0.39,
    H = 0.485;
  const black = std("#272929", 0.63),
    dark = std("#151717", 0.72),
    olive = std("#505d50", 0.82),
    metal = std("#878e8a", 0.45, 0.5);
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#87918c",
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    roughness: 0.24,
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
    side: THREE.DoubleSide,
  });
  // The enclosure is open inside: thin side glazing, extrusion uprights and a shallow top.
  box(g, W, 0.056, D, black, 0, 0.028, 0, 0.009);
  box(g, W, 0.075, D, black, 0, H - 0.0375, 0, 0.016);
  box(g, W - 0.035, 0.005, D - 0.035, dark, 0, H + 0.001, 0, 0.004);
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      box(
        g,
        0.028,
        H - 0.092,
        0.028,
        olive,
        x * (W / 2 - 0.014),
        H / 2,
        z * (D / 2 - 0.014),
        0.005,
      );
      for (let i = 0; i < 5; i++) {
        const screw = cyl(
          g,
          0.0027,
          0.0015,
          dark,
          x * (W / 2 - 0.013),
          0.086 + i * 0.064,
          z * (D / 2 + 0.0008),
        );
        screw.rotation.x = Math.PI / 2;
      }
    }
  for (const x of [-1, 1])
    box(
      g,
      0.002,
      H - 0.129,
      D - 0.043,
      glass,
      x * (W / 2 - 0.001),
      H / 2 - 0.007,
      0,
      0.0006,
    );
  box(
    g,
    W - 0.042,
    H - 0.13,
    0.003,
    glass,
    0,
    H / 2 - 0.007,
    -D / 2 + 0.002,
    0.0005,
  );
  for (const x of [-1, 1]) {
    box(g, 0.014, 0.018, D - 0.035, metal, x * 0.132, 0.328, 0, 0.002);
    cyl(g, 0.004, H - 0.12, metal, x * 0.145, H / 2, -0.133);
    box(g, 0.008, 0.009, D - 0.072, dark, x * 0.148, 0.401, 0, 0.001);
  }
  box(g, 0.275, 0.012, 0.29, black, 0, 0.175, 0, 0.004);
  box(g, 0.246, 0.004, 0.249, std("#726e60", 0.8), 0, 0.184, 0.005, 0.001);
  box(g, 0.27, 0.007, 0.025, metal, 0, 0.325, 0.021, 0.001);
  box(g, 0.055, 0.047, 0.047, black, 0, 0.298, 0.023, 0.006);
  box(g, 0.032, 0.023, 0.01, std("#626763"), 0, 0.285, 0.05, 0.002);
  const fan = add(
    g,
    new THREE.CircleGeometry(0.012, 24),
    dark,
    0,
    0.307,
    0.051,
  );
  fan.rotation.z = 0.25;
  // Transparent front door with two hinges, knurled latch and visible front frame.
  box(g, W - 0.049, H - 0.133, 0.003, glass, 0, 0.227, D / 2 + 0.004, 0.001);
  box(g, W - 0.04, 0.029, 0.009, black, 0, 0.063, D / 2 + 0.005, 0.002);
  box(g, W - 0.04, 0.014, 0.009, black, 0, 0.405, D / 2 + 0.005, 0.002);
  for (const x of [-1, 1])
    box(
      g,
      0.01,
      0.356,
      0.009,
      black,
      x * (W / 2 - 0.026),
      0.23,
      D / 2 + 0.006,
      0.002,
    );
  for (const y of [0.099, 0.357]) {
    box(g, 0.026, 0.031, 0.017, black, -W / 2 + 0.026, y, D / 2 + 0.015, 0.004);
    cyl(g, 0.004, 0.035, black, -W / 2 + 0.033, y, D / 2 + 0.025);
    for (const dy of [-0.008, 0.008]) {
      const bolt = cyl(
        g,
        0.0025,
        0.002,
        metal,
        -W / 2 + 0.02,
        y + dy,
        D / 2 + 0.025,
      );
      bolt.rotation.x = Math.PI / 2;
    }
  }
  box(g, 0.012, 0.088, 0.028, black, W / 2 - 0.026, 0.22, D / 2 + 0.022, 0.005);
  // Top-right hinged screen is off, with a broad gray inactive LCD.
  const display = new THREE.Group();
  display.position.set(0.11, 0.437, D / 2 + 0.007);
  display.rotation.x = -0.03;
  g.add(display);
  box(display, 0.103, 0.069, 0.024, black, 0, 0, 0, 0.006);
  box(display, 0.086, 0.05, 0.0015, std("#313b3d", 0.35), 0, 0, 0.013, 0.001);
  // Printed machine lettering is sampled from the new reference, not invented type.
  add(
    g,
    new THREE.PlaneGeometry(0.17, 0.021),
    new THREE.MeshStandardMaterial({
      map: await loadMap("flashforge-wordmark.jpg"),
      roughness: 0.65,
    }),
    0,
    0.063,
    D / 2 + 0.01,
  );
  add(
    g,
    new THREE.PlaneGeometry(0.081, 0.014),
    new THREE.MeshStandardMaterial({
      map: await loadMap("adventurer-label.jpg"),
      roughness: 0.72,
    }),
    -0.055,
    0.398,
    D / 2 + 0.011,
  );
  // Ribbon cable descends alongside the hinge; individual colored conductors visible in photo105.
  for (const [i, col] of ["#e6ddd0", "#c2a538", "#bd4b4b", "#79a781"].entries())
    tube(
      g,
      [
        [W / 2 - 0.01 + i * 0.003, 0.429, 0.199],
        [W / 2 + 0.004 + i * 0.003, 0.407, 0.203],
        [W / 2 + 0.005 + i * 0.002, 0.35, 0.211],
        [W / 2 + 0.002 + i * 0.002, 0.296, 0.205],
      ],
      0.001,
      std(col, 0.7),
    );
  return g;
}

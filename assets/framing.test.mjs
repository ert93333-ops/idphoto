import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';

// Load the browser ES modules without requiring a package.json or build step.
const load = async path => import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL(path, import.meta.url))).toString('base64')}`);
const {headFraming} = await load('./framing.js');
const {specs, pixels} = await load('./specs.js');
const face = {originX: 300, originY: 300, width: 200, height: 300};
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

for (const spec of specs) {
  test(`${spec.id}: full head fits at the target size`, () => {
    const height = pixels(spec.h);
    const {scale, cx, cy} = headFraming(face, spec, height, 1200);
    const crownY = height / 2 + (face.originY - .5 * face.height - cy) * scale;
    const chinY = height / 2 + (face.originY + 1.05 * face.height - cy) * scale;
    near(cx, 400);
    near((chinY - crownY) / height * spec.h,
      spec.head ? (spec.head[0] + spec.head[1]) / 2 : spec.h * .7);
    assert.ok(crownY > 0 && chinY < height);
    if (spec.id !== 'us-passport') near(crownY / height * spec.h, 4);
  });
}

test('US eye line uses normalized detection keypoints', () => {
  const spec = specs.find(s => s.id === 'us-passport');
  const height = pixels(spec.h);
  const detected = {...face, keypoints: [{y: .28}, {y: .30}]};
  const {scale, cy} = headFraming(detected, spec, height, 1200);
  const eyeY = height / 2 + (.29 * 1200 - cy) * scale;
  near((height - eyeY) / height * spec.h, (25.4 + 34.925) / 2);
});

test('crown outside the source is not clamped and enlarged', () => {
  const spec = specs[0];
  const height = pixels(spec.h);
  const original = headFraming(face, spec, height, 1200);
  const shifted = headFraming({...face, originY: 50}, spec, height, 1200);
  near(original.scale, shifted.scale);
  near(original.cy - shifted.cy, 250);
});

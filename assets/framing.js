// Face detection boxes exclude the crown and hair. Keep the full estimated
// crown-to-chin span in source coordinates, including when it exceeds the image. The crown is the skull top, excluding hair;
// face-box inference cannot measure it and requires manual verification.
export function headFraming(face, spec, outputHeight, sourceHeight) {
  const crown = face.originY - .5 * face.height;
  const chin = face.originY + 1.05 * face.height;
  const headMm = spec.head ? (spec.head[0] + spec.head[1]) / 2 : spec.h * .7;
  const pxPerMm = outputHeight / spec.h;
  const scale = headMm * pxPerMm / (chin - crown);
  let crownY = (spec.crownOffset ?? 4) * pxPerMm;

  if (spec.id === 'us-passport') {
    // MediaPipe's first two keypoints are the eyes, normalized to the source.
    const eyes = face.keypoints?.slice(0, 2);
    const eyeY = eyes?.length === 2 && eyes.every(p => Number.isFinite(p.y))
      ? (eyes[0].y + eyes[1].y) / 2 * sourceHeight
      : face.originY + .15 * face.height;
    // Aim at the midpoint of the supplied US eye-height range from the bottom.
    // Keep at least 3 mm above the crown and keep the chin inside the frame.
    const targetEyeY = outputHeight - (25.4 + 34.925) / 2 * pxPerMm;
    crownY = Math.max(3 * pxPerMm, Math.min(
      outputHeight - headMm * pxPerMm,
      targetEyeY - (eyeY - crown) * scale
    ));
  }

  return {
    scale,
    cx: face.originX + face.width / 2,
    cy: crown + (outputHeight / 2 - crownY) / scale
  };
}

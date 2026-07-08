// WAV load + playback via Web Audio.

export async function loadWav(ctx, file) {
  const data = await file.arrayBuffer();
  return ctx.decodeAudioData(data);
}

export function playBuffer(ctx, dest, buffer, time) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(dest);
  src.start(time);
}

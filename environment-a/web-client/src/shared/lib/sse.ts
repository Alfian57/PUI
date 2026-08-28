export type ParsedSSEFrame = {
  event: string;
  data: string;
};

export function parseSSE(buffer: string): { frames: ParsedSSEFrame[]; rest: string } {
  const frames: ParsedSSEFrame[] = [];
  const segments = buffer.split("\n\n");
  const rest = segments.pop() ?? "";

  for (const segment of segments) {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of segment.split("\n")) {
      if (line.startsWith("event:")) event = line.slice("event:".length).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trim());
    }
    if (dataLines.length > 0) frames.push({ event, data: dataLines.join("\n") });
  }
  return { frames, rest };
}

export type TrackSource = "hero" | "map" | "form";

export interface TrackPayload {
  timestamp: string;
  cadastre?: string;
  polygon_coords?: [number, number][] | null;
  source: TrackSource;
  phone?: string;
}

export async function trackEvent(payload: TrackPayload) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("Track error", error);
  }
}

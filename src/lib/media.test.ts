import { describe, expect, it } from "vitest";
import { isOptimizableImage, youtubeId } from "@/lib/media";

describe("youtubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=aqz-KE-bpKQ", "aqz-KE-bpKQ"],
    ["https://youtu.be/aqz-KE-bpKQ?t=10", "aqz-KE-bpKQ"],
    ["https://www.youtube.com/embed/aqz-KE-bpKQ", "aqz-KE-bpKQ"],
    ["https://youtube.com/shorts/aqz-KE-bpKQ", "aqz-KE-bpKQ"],
    ["https://m.youtube.com/watch?v=aqz-KE-bpKQ", "aqz-KE-bpKQ"],
  ])("reads %s", (url, id) => {
    expect(youtubeId(url)).toBe(id);
  });

  it.each([
    "/videos/a.mp4",
    "https://vimeo.com/123",
    "https://youtube.com/watch?v=bad",
    "not a url",
  ])("ignores %s", (url) => {
    expect(youtubeId(url)).toBeNull();
  });
});

describe("isOptimizableImage", () => {
  it("allows site paths and this project's public storage", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    expect(isOptimizableImage("/fixtures/a.jpg")).toBe(true);
    expect(
      isOptimizableImage(
        "https://abc.supabase.co/storage/v1/object/public/media/a.jpg",
      ),
    ).toBe(true);
    expect(
      isOptimizableImage(
        "https://other.supabase.co/storage/v1/object/public/a.jpg",
      ),
    ).toBe(false);
    expect(isOptimizableImage("//evil.example/a.jpg")).toBe(false);
  });
});

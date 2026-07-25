import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type GallerySubmissionRow = {
  id: string;
  project_name: string;
  team_id: string;
  track: string;
  description: string;
  pitch: string;
  tech_stack: string[] | null;
  thumbnail_url: string | null;
  github_repo_url: string;
  live_demo_url: string | null;
  pitch_deck_share_url: string;
  submitted_at: string;
  is_draft: boolean | null;
};

type GallerySettingsRow = {
  active_tracks: string[] | null;
};

function normalizeTrack(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeTrackList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeTrack)
    .filter((track): track is string => Boolean(track));
}

export async function GET() {
  const [submissionsResult, settingsResult] = await Promise.all([
    supabaseServer
      .from("submissions")
      .select(
        "id,project_name,team_id,track,description,pitch,tech_stack,thumbnail_url,github_repo_url,live_demo_url,pitch_deck_share_url,submitted_at,is_draft",
      )
      .eq("status", "APPROVED")
      .order("submitted_at", { ascending: false }),
    supabaseServer
      .from("settings")
      .select("active_tracks")
      .eq("id", 1)
      .maybeSingle<GallerySettingsRow>(),
  ]);

  if (submissionsResult.error) {
    return NextResponse.json({ error: submissionsResult.error.message }, { status: 500 });
  }
  if (settingsResult.error) {
    return NextResponse.json({ error: settingsResult.error.message }, { status: 500 });
  }

  const projects = ((submissionsResult.data ?? []) as GallerySubmissionRow[])
    .filter((row) => row.is_draft !== true)
    .map((row) => {
      const track = normalizeTrack(row.track) || "UNTAGGED_TRACK";

      return {
        id: row.id,
        title: row.project_name,
        teamName: row.team_id,
        track,
        description: row.description,
        pitch: row.pitch,
        tags: Array.isArray(row.tech_stack)
          ? row.tech_stack.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          : [],
        image: row.thumbnail_url?.trim() ? row.thumbnail_url : null,
        links: {
          github: row.github_repo_url,
          demo: row.live_demo_url ?? null,
          pitchDeck: row.pitch_deck_share_url,
        },
        submittedAt: row.submitted_at,
      };
    });

  const configuredTracks = normalizeTrackList(settingsResult.data?.active_tracks);
  const discoveredTracks = Array.from(new Set(projects.map((project) => project.track)));
  const tracks = (configuredTracks.length > 0 ? configuredTracks : discoveredTracks).filter(
    (track, index, all) => all.indexOf(track) === index,
  );

  return NextResponse.json({ projects, tracks });
}

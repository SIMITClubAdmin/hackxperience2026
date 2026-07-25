"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { IBM_Plex_Mono, Montserrat } from "next/font/google";
import Footer from "../components/footer";
import Navbar from "../components/navbar";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const RED = "#c00000";
const DARK_TEXT = "#1d1c17";
const CREAM_BG = "#f2ede5";
const WHITE = "#ffffff";
const ITEMS_PER_PAGE = 12;

type GalleryProject = {
  id: string;
  title: string;
  teamName: string;
  track: string;
  description: string;
  pitch: string;
  tags: string[];
  image: string | null;
  links: {
    github: string | null;
    demo: string | null;
    pitchDeck: string | null;
  };
  submittedAt: string;
};

type GalleryPayload = {
  projects?: GalleryProject[];
  tracks?: string[];
  error?: string;
};

/** Judge-style diagonal X when a project has no thumbnail. */
function ThumbnailMedia({
  image,
  title,
  objectFit = "cover",
}: {
  image: string | null;
  title: string;
  objectFit?: "cover" | "contain";
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={title}
        className="w-full h-full"
        style={{ objectFit, display: "block" }}
      />
    );
  }

  return (
    <div
      className="relative w-full h-full"
      style={{ backgroundColor: CREAM_BG }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" preserveAspectRatio="none" className="absolute inset-0">
        <line x1="0" y1="0" x2="100%" y2="100%" stroke="rgba(204,0,0,0.15)" strokeWidth="1" />
        <line x1="100%" y1="0" x2="0" y2="100%" stroke="rgba(204,0,0,0.15)" strokeWidth="1" />
      </svg>
    </div>
  );
}

function normalizeTrack(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeTracks(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeTrack)
    .filter((track): track is string => Boolean(track))
    .filter((track, index, all) => all.indexOf(track) === index);
}

function formatSubmittedDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed
    .toLocaleDateString("en-SG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Singapore",
    })
    .toUpperCase();
}

export default function GalleryPage() {
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [tracks, setTracks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTrack, setActiveTrack] = useState("ALL");
  const [selectedProject, setSelectedProject] = useState<GalleryProject | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await fetch("/api/gallery/projects", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as GalleryPayload;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load projects.");
        }

        const rows = Array.isArray(payload.projects) ? payload.projects : [];
        const mappedRows = rows.map((row) => ({
          ...row,
          track: normalizeTrack(row.track) || "UNTAGGED_TRACK",
          tags: Array.isArray(row.tags)
            ? row.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
            : [],
          image: typeof row.image === "string" && row.image.trim().length > 0 ? row.image : null,
          links: {
            github: row.links?.github ?? null,
            demo: row.links?.demo ?? null,
            pitchDeck: row.links?.pitchDeck ?? null,
          },
        }));

        setProjects(mappedRows);

        const configuredTracks = normalizeTracks(payload.tracks);
        const discoveredTracks = normalizeTracks(mappedRows.map((project) => project.track));
        setTracks(configuredTracks.length > 0 ? configuredTracks : discoveredTracks);
      } catch (error) {
        setProjects([]);
        setTracks([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load projects.");
      } finally {
        setLoading(false);
      }
    }

    void fetchProjects();
  }, []);

  useEffect(() => {
    if (activeTrack !== "ALL" && !tracks.includes(activeTrack)) {
      setActiveTrack("ALL");
    }
  }, [activeTrack, tracks]);

  const processedProjects = useMemo(() => {
    let result = [...projects];

    if (activeTrack !== "ALL") {
      result = result.filter((project) => project.track === activeTrack);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (project) =>
          project.title.toLowerCase().includes(query) ||
          project.teamName.toLowerCase().includes(query) ||
          project.track.toLowerCase().includes(query) ||
          project.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    result.sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, [activeTrack, projects, searchQuery]);

  const totalPages = Math.ceil(processedProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = processedProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTrack, searchQuery]);

  return (
    <main className={`pt-11 min-h-screen ${montserrat.className}`} style={{ backgroundColor: CREAM_BG }}>
      <Navbar />

      <div
        className="w-full py-12 border-b-4 shadow-[0px_4px_0px_#c00000] relative z-10"
        style={{ backgroundColor: DARK_TEXT, borderColor: DARK_TEXT }}
      >
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-4">
            PROJECT <span style={{ color: RED }}>GALLERY</span>
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto font-mono text-sm uppercase">
            LIVE PROJECT RECORDS POWERED DIRECTLY FROM SUBMISSIONS.
          </p>
        </div>
      </div>

      <div className="sticky top-11 z-20 bg-[#f2ede5]/95 backdrop-blur-sm py-6 border-b-2 border-[#1d1c17]/10">
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-between">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1d1c17]/40" />
              <input
                type="text"
                placeholder="SEARCH_BY_TITLE_TEAM_TRACK_OR_TAG..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className={`w-full pl-12 pr-4 py-3 bg-white border-2 border-[#1d1c17] text-sm focus:outline-none focus:ring-2 focus:ring-[#c00000] transition-all ${ibmPlexMono.className}`}
                style={{ boxShadow: `4px 4px 0px ${DARK_TEXT}` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center justify-center lg:justify-start">
            {(["ALL", ...tracks] as const).map((track) => (
              <button
                key={track}
                onClick={() => setActiveTrack(track)}
                className="px-6 py-2 font-mono text-[10px] sm:text-xs uppercase font-bold border-2 transition-all active:translate-y-1 rounded-full"
                style={{
                  borderColor: DARK_TEXT,
                  backgroundColor: activeTrack === track ? RED : WHITE,
                  color: activeTrack === track ? WHITE : DARK_TEXT,
                  boxShadow:
                    activeTrack === track
                      ? `0px 0px 0px ${DARK_TEXT}`
                      : `3px 3px 0px ${DARK_TEXT}`,
                }}
              >
                {track === "ALL" ? "ALL_TRACKS" : track}
              </button>
            ))}

            <div className="ml-auto font-mono text-[10px] font-bold text-[#1d1c17]/40 uppercase tracking-widest">
              {processedProjects.length} RECORDS_FOUND
            </div>
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto py-12 px-6 min-h-[60vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[#c00000] animate-spin mb-4" />
            <p className="font-mono text-sm font-bold uppercase text-[#1d1c17]/40">
              INITIALIZING_DATABASE_LINK...
            </p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-[#1d1c17]/20">
            <h3 className="text-xl font-black uppercase text-[#1d1c17]/40 text-center">
              UNABLE_TO_LOAD_PROJECTS
            </h3>
            <p className="mt-3 font-mono text-xs font-bold text-[#1d1c17]/40 uppercase text-center max-w-md">
              {loadError}
            </p>
          </div>
        ) : paginatedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <AnimatePresence mode="popLayout">
              {paginatedProjects.map((project) => (
                <motion.div
                  layout
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="group relative flex flex-col bg-white border-4 border-[#1d1c17] transition-transform hover:-translate-y-2 cursor-pointer"
                  style={{ boxShadow: `8px 8px 0px ${DARK_TEXT}` }}
                  onClick={() => setSelectedProject(project)}
                >
                  <div
                    className="absolute top-4 left-4 z-10 px-3 py-1 font-mono text-[10px] font-black bg-white border-2 border-[#1d1c17]"
                    style={{ color: DARK_TEXT }}
                  >
                    {project.track}
                  </div>

                  <div className="relative aspect-video overflow-hidden border-b-4 border-[#1d1c17]">
                    <ThumbnailMedia image={project.image} title={project.title} />
                    <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <div className="mb-2">
                      <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-1 group-hover:text-[#c00000] transition-colors">
                        {project.title}
                      </h3>
                      <p className="font-mono text-[11px] font-bold text-black/50 uppercase">
                        TEAM_ID: {project.teamName}
                      </p>
                    </div>

                    <p className="text-sm leading-relaxed mb-3 line-clamp-2">{project.description}</p>

                    <p className="font-mono text-[10px] font-bold text-[#1d1c17]/40 uppercase mb-4">
                      SUBMITTED: {formatSubmittedDate(project.submittedAt)}
                    </p>

                    <div className="mt-auto flex flex-wrap gap-2">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-mono font-bold border border-[#1d1c17]/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: RED }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-[#1d1c17]/20">
            <Search className="w-12 h-12 text-[#1d1c17]/20 mb-4" />
            <h3 className="text-xl font-black uppercase text-[#1d1c17]/40 text-center">
              {projects.length === 0 ? "NO_APPROVED_SUBMISSIONS_YET" : "NO_MATCHING_RECORDS_FOUND"}
            </h3>
            {projects.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveTrack("ALL");
                }}
                className="mt-4 text-[#c00000] font-mono text-xs font-bold underline underline-offset-4"
              >
                RESET_ALL_FILTERS
              </button>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-16 flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="p-3 border-2 border-[#1d1c17] bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f2ede5] transition-colors"
              style={{ boxShadow: currentPage === 1 ? "none" : `4px 4px 0px ${DARK_TEXT}` }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-2">
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`w-10 h-10 font-mono text-sm font-bold border-2 border-[#1d1c17] transition-all ${
                    currentPage === index + 1 ? "bg-[#c00000] text-white" : "bg-white hover:bg-[#f2ede5]"
                  }`}
                  style={{ boxShadow: currentPage === index + 1 ? "none" : `4px 4px 0px ${DARK_TEXT}` }}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="p-3 border-2 border-[#1d1c17] bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f2ede5] transition-colors"
              style={{ boxShadow: currentPage === totalPages ? "none" : `4px 4px 0px ${DARK_TEXT}` }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </section>

      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="absolute inset-0 bg-[#1d1c17]/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white border-4 border-[#1d1c17] overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
              style={{ boxShadow: `12px 12px 0px ${RED}` }}
            >
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 z-20 bg-white border-2 border-[#1d1c17] p-2 hover:bg-[#c00000] hover:text-white transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <div className="w-full md:w-1/2 shrink-0 flex items-center justify-center border-b-4 md:border-b-0 md:border-r-4 border-[#1d1c17] bg-[#1d1c17] aspect-video md:aspect-auto md:min-h-[280px]">
                <ThumbnailMedia
                  image={selectedProject.image}
                  title={selectedProject.title}
                  objectFit={selectedProject.image ? "contain" : "cover"}
                />
              </div>

              <div className="w-full md:w-1/2 flex flex-col p-5 sm:p-6 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 font-mono text-[10px] font-black bg-[#c00000] text-white">
                    TRACK_{selectedProject.track}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[#1d1c17]/40 uppercase">
                    SUBMITTED: {formatSubmittedDate(selectedProject.submittedAt)}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-none mb-1">
                  {selectedProject.title}
                </h2>
                <p className="font-mono text-xs font-bold text-[#c00000] uppercase mb-4">
                  TEAM_ID: {selectedProject.teamName}
                </p>

                <h4 className="font-mono text-[11px] font-black uppercase mb-2 border-b-2 border-[#1d1c17] inline-block self-start">
                  DESCRIPTION
                </h4>
                <p className="text-sm leading-relaxed mb-4">{selectedProject.description}</p>

                <h4 className="font-mono text-[11px] font-black uppercase mb-2 border-b-2 border-[#1d1c17] inline-block self-start">
                  PROJECT_PITCH
                </h4>
                <p className="text-sm leading-relaxed mb-4 whitespace-pre-line">{selectedProject.pitch}</p>

                <div className="mb-3">
                  <h4 className="font-mono text-[11px] font-black uppercase mb-2 border-b-2 border-[#1d1c17] inline-block">
                    TECH_STACK
                  </h4>
                  {selectedProject.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-0.5 bg-white border-2 border-[#1d1c17] text-[11px] font-bold uppercase">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No tech stack submitted.</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-auto">
                  {selectedProject.links.github && (
                    <a
                      href={selectedProject.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center py-3 bg-[#1d1c17] text-white font-mono text-xs font-bold uppercase hover:bg-[#c00000] transition-colors"
                    >
                      SOURCE_CODE
                    </a>
                  )}
                  {selectedProject.links.demo && (
                    <a
                      href={selectedProject.links.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center py-3 border-4 border-[#1d1c17] font-mono text-xs font-bold uppercase hover:bg-[#f2ede5] transition-colors"
                    >
                      LIVE_DEMO
                    </a>
                  )}
                  {selectedProject.links.pitchDeck && (
                    <a
                      href={selectedProject.links.pitchDeck}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center py-3 border-4 border-[#c00000] text-[#c00000] font-mono text-xs font-bold uppercase hover:bg-[#fff5f5] transition-colors"
                    >
                      PITCH_DECK
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}

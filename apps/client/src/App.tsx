import { useEffect, useMemo, useReducer, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Progress } from "./components/ui/progress";
import { Textarea } from "./components/ui/textarea";

const modes = [
  { value: "all", label: "All segments" },
  { value: "dawOnly", label: "DAW only" },
] as const;

type ModeValue = (typeof modes)[number]["value"];

type ServerStatus = {
  state: "queued" | "processing" | "done" | "error";
  progress: number;
  message?: string;
  error?: string;
};

type RowStatus = {
  state: "idle" | "uploading" | "queued" | "processing" | "done" | "error";
  progress: number;
  message?: string;
  error?: string;
};

type InputRow = {
  id: string;
  file: File | null;
  fileName: string | null;
  indexText: string;
  mode: ModeValue;
  jobId?: string;
  status: RowStatus;
};

type Action =
  | { type: "add" }
  | { type: "remove"; id: string }
  | { type: "update"; id: string; patch: Partial<Omit<InputRow, "status">> }
  | { type: "status"; id: string; patch: Partial<RowStatus> };

const createRow = (): InputRow => ({
  id: crypto.randomUUID(),
  file: null,
  fileName: null,
  indexText: "",
  mode: "all",
  status: {
    state: "idle",
    progress: 0,
  },
});

const reducer = (state: InputRow[], action: Action): InputRow[] => {
  switch (action.type) {
    case "add":
      return [...state, createRow()];
    case "remove":
      if (state.length <= 1) {
        return state;
      }
      return state.filter((row) => row.id !== action.id);
    case "update":
      return state.map((row) =>
        row.id === action.id
          ? {
              ...row,
              ...action.patch,
              status:
                row.status.state === "error" && !row.jobId
                  ? { state: "idle", progress: 0 }
                  : row.status,
            }
          : row
      );
    case "status":
      return state.map((row) =>
        row.id === action.id
          ? {
              ...row,
              status: {
                ...row.status,
                ...action.patch,
              },
            }
          : row
      );
    default:
      return state;
  }
};

function App() {
  const [rows, dispatch] = useReducer(reducer, [createRow()]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchDownloading, setBatchDownloading] = useState(false);

  const jobs = useMemo(() => rows.filter((row) => row.jobId), [rows]);
  const allFinished = useMemo(() => {
    if (jobs.length === 0) {
      return false;
    }
    return jobs.every((row) =>
      row.status.state === "done" || row.status.state === "error"
    );
  }, [jobs]);

  useEffect(() => {
    const activeRows = rows.filter(
      (row) =>
        row.jobId &&
        row.status.state !== "done" &&
        row.status.state !== "error"
    );

    if (activeRows.length === 0) {
      return;
    }

    const poll = () => {
      activeRows.forEach(async (row) => {
        try {
          const response = await fetch(`/api/status/${row.jobId}`);
          if (!response.ok) {
            throw new Error("Failed to fetch status.");
          }
          const data = (await response.json()) as ServerStatus;
          const nextState: RowStatus = {
            state: data.state,
            progress: data.progress ?? 0,
            message: data.message,
            error: data.error,
          };
          dispatch({ type: "status", id: row.id, patch: nextState });
        } catch (err) {
          dispatch({
            type: "status",
            id: row.id,
            patch: {
              state: "error",
              error: err instanceof Error ? err.message : "Status check failed.",
            },
          });
        }
      });
    };

    poll();
    const timer = window.setInterval(poll, 1000);
    return () => window.clearInterval(timer);
  }, [rows]);

  const handleAddRow = () => {
    dispatch({ type: "add" });
  };

  const handleRemoveRow = (id: string) => {
    dispatch({ type: "remove", id });
  };

  const handleStart = async () => {
    setBatchError(null);

    for (const row of rows) {
      if (row.jobId || row.status.state === "uploading") {
        continue;
      }
      if (!row.file) {
        dispatch({
          type: "status",
          id: row.id,
          patch: { state: "error", error: "Please select an MP4 file." },
        });
        continue;
      }
      if (!row.indexText.trim()) {
        dispatch({
          type: "status",
          id: row.id,
          patch: { state: "error", error: "Please paste the index text." },
        });
        continue;
      }

      dispatch({ type: "status", id: row.id, patch: { state: "uploading", progress: 0 } });

      const formData = new FormData();
      formData.append("video", row.file);
      formData.append("indexText", row.indexText);
      formData.append("mode", row.mode);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed.");
        }

        const data = (await response.json()) as { jobId: string };
        dispatch({ type: "update", id: row.id, patch: { jobId: data.jobId } });
        dispatch({
          type: "status",
          id: row.id,
          patch: { state: "queued", progress: 0, error: undefined },
        });
      } catch (err) {
        dispatch({
          type: "status",
          id: row.id,
          patch: {
            state: "error",
            error: err instanceof Error ? err.message : "Upload failed.",
          },
        });
      }
    }
  };

  const handleDownload = (jobId?: string) => {
    if (!jobId) {
      return;
    }
    window.location.href = `/api/download/${jobId}`;
  };

  const handleDownloadAll = async () => {
    const jobIds = jobs.map((row) => row.jobId).filter(Boolean) as string[];
    if (jobIds.length === 0) {
      return;
    }

    setBatchDownloading(true);
    setBatchError(null);

    try {
      const response = await fetch("/api/download/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      });

      if (!response.ok) {
        throw new Error("Batch download failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "clips_all.zip";
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Batch download failed.");
    } finally {
      setBatchDownloading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-20 top-12 h-64 w-64 rounded-full bg-amber-200/50 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl animate-float-slow" />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <header className="space-y-4 animate-fade-up">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            Local Video Slicer
          </p>
          <h1 className="font-display text-4xl font-semibold text-slate-900 md:text-5xl">
            Split long lectures into focused clips.
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Paste your timestamp index, choose a mode, and export clips as a ZIP. The
            processing stays on this machine.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Inputs</h2>
                <p className="text-sm text-slate-600">
                  Add multiple videos and index texts to process in sequence.
                </p>
              </div>
              <Button variant="secondary" onClick={handleAddRow}>
                Add Input
              </Button>
            </div>

            <div className="space-y-4">
              {rows.map((row, index) => (
                <Card key={row.id} className="bg-white/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle>Input {index + 1}</CardTitle>
                      <CardDescription>MP4 + index text + mode.</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRow(row.id)}
                      disabled={rows.length <= 1}
                    >
                      Remove
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">MP4 file</label>
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white/60 p-4">
                        <input
                          className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
                          type="file"
                          accept="video/mp4"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            dispatch({
                              type: "update",
                              id: row.id,
                              patch: {
                                file,
                                fileName: file?.name ?? null,
                              },
                            });
                          }}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          {row.fileName
                            ? `Selected: ${row.fileName}`
                            : "No file selected yet."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Index text
                      </label>
                      <Textarea
                        placeholder="■ [00:22:12 - 00:29:29] Section title"
                        value={row.indexText}
                        onChange={(event) =>
                          dispatch({
                            type: "update",
                            id: row.id,
                            patch: { indexText: event.target.value },
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Mode</label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {modes.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              dispatch({
                                type: "update",
                                id: row.id,
                                patch: { mode: option.value },
                              })
                            }
                            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
                              row.mode === option.value
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <span className="block text-xs uppercase tracking-[0.2em] opacity-60">
                              {option.value}
                            </span>
                            <span className="block text-base">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-white/80 backdrop-blur">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-6">
                <div>
                  <p className="text-sm font-medium text-slate-800">Start processing</p>
                  <p className="text-xs text-slate-500">
                    Uploads will run in sequence to keep memory usage low.
                  </p>
                </div>
                <Button onClick={handleStart}>
                  Start splitting ({rows.length})
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Status</h2>
                <p className="text-sm text-slate-600">Track each job independently.</p>
              </div>
              {allFinished && (
                <Button
                  variant="secondary"
                  onClick={handleDownloadAll}
                  disabled={batchDownloading}
                >
                  {batchDownloading ? "Preparing ZIP..." : "Download ALL (ZIP)"}
                </Button>
              )}
            </div>

            {batchError && (
              <Alert variant="accent">
                <AlertTitle>Batch download error</AlertTitle>
                <AlertDescription>{batchError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {rows.map((row, index) => (
                <Card key={`${row.id}-status`} className="bg-white/70 backdrop-blur">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-base">
                      {row.fileName ?? `Input ${index + 1}`}
                    </CardTitle>
                    <CardDescription>
                      State: <span className="font-medium">{row.status.state}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Progress</span>
                      <span>{row.status.progress}%</span>
                    </div>
                    <Progress value={row.status.progress} />
                    {row.status.error ? (
                      <Alert variant="accent">
                        <AlertTitle>Something went wrong</AlertTitle>
                        <AlertDescription>{row.status.error}</AlertDescription>
                      </Alert>
                    ) : row.status.message ? (
                      <Alert variant="accent">
                        <AlertTitle>Note</AlertTitle>
                        <AlertDescription>{row.status.message}</AlertDescription>
                      </Alert>
                    ) : null}
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={row.status.state !== "done" || !row.jobId}
                      onClick={() => handleDownload(row.jobId)}
                    >
                      Download ZIP
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <Card className="bg-white/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Output</CardTitle>
                <CardDescription>Clip naming and organization.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
                  NN_HHMMSS-HHMMSS_内容.mp4
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" disabled>
                  View clips (mock)
                </Button>
              </CardFooter>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;

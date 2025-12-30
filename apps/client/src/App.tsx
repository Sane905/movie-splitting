import { useEffect, useRef, useState } from "react";
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
];

type JobState = "idle" | "uploading" | "processing" | "done" | "error";

type JobStatus = {
  state: "queued" | "processing" | "done" | "error";
  progress: number;
  message?: string;
  error?: string;
};

function App() {
  const [mode, setMode] = useState("all");
  const [fileName, setFileName] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [indexText, setIndexText] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobState, setJobState] = useState<JobState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/status/${jobId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch status.");
        }
        const data = (await response.json()) as JobStatus;
        setProgress(data.progress ?? 0);

        if (data.state === "done") {
          setJobState("done");
          if (pollTimer.current) {
            window.clearInterval(pollTimer.current);
            pollTimer.current = null;
          }
        } else if (data.state === "error") {
          setJobState("error");
          setError(data.error ?? "Processing failed.");
          if (pollTimer.current) {
            window.clearInterval(pollTimer.current);
            pollTimer.current = null;
          }
        } else {
          setJobState("processing");
        }
      } catch (err) {
        setJobState("error");
        setError(err instanceof Error ? err.message : "Status check failed.");
        if (pollTimer.current) {
          window.clearInterval(pollTimer.current);
          pollTimer.current = null;
        }
      }
    };

    pollTimer.current = window.setInterval(poll, 1000);
    void poll();

    return () => {
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [jobId]);

  const handleSubmit = async () => {
    if (!videoFile) {
      setError("Please select an MP4 file.");
      return;
    }
    if (!indexText.trim()) {
      setError("Please paste the index text.");
      return;
    }

    setError(null);
    setJobState("uploading");
    setProgress(0);

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("indexText", indexText);
    formData.append("mode", mode);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed.");
      }

      const data = (await response.json()) as { jobId: string };
      setJobId(data.jobId);
      setJobState("processing");
    } catch (err) {
      setJobState("error");
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const handleDownload = () => {
    if (!jobId) {
      return;
    }
    window.location.href = `/api/download/${jobId}`;
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-20 top-12 h-64 w-64 rounded-full bg-amber-200/50 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl animate-float-slow" />

      <main className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
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

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Input</CardTitle>
              <CardDescription>Upload an MP4 and your index text.</CardDescription>
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
                      setVideoFile(file);
                      setFileName(file?.name ?? null);
                    }}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {fileName ? `Selected: ${fileName}` : "No file selected yet."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Index text</label>
                <Textarea
                  placeholder="■ [00:22:12 - 00:29:29] Section title"
                  value={indexText}
                  onChange={(event) => setIndexText(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Mode</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {modes.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMode(option.value)}
                      className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
                        mode === option.value
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
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={jobState === "uploading" || jobState === "processing"}
              >
                {jobState === "uploading"
                  ? "Uploading..."
                  : jobState === "processing"
                    ? "Processing..."
                    : "Start splitting"}
              </Button>
            </CardFooter>
          </Card>

          <div className="space-y-6">
            <Card className="bg-white/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Status</CardTitle>
                <CardDescription>Live progress from the server.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Processing clips</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
                {error ? (
                  <Alert variant="accent">
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="accent">
                    <AlertTitle>Local-first</AlertTitle>
                    <AlertDescription>
                      Files stay on your machine. Large uploads are streamed to disk.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                {jobState === "done" ? (
                  <Button variant="secondary" className="w-full" onClick={handleDownload}>
                    Download ZIP
                  </Button>
                ) : (
                  <Button variant="secondary" className="w-full" disabled>
                    Download ZIP
                  </Button>
                )}
              </CardFooter>
            </Card>

            <Card className="bg-white/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Output</CardTitle>
                <CardDescription>Clip naming and organization.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
                  NN_HHMMSS-HHMMSS_Title.mp4
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" disabled>
                  View clips (mock)
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

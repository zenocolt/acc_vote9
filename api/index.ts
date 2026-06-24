export default async function handler(req: any, res: any) {
  try {
    const moduleCandidates = ["../server.ts", "../server.js", "../server.cjs", "../server"];
    let appModule: { default?: (req: any, res: any) => unknown } | null = null;

    for (const candidate of moduleCandidates) {
      try {
        appModule = (await import(candidate)) as { default?: (req: any, res: any) => unknown };
        break;
      } catch {
        // Try the next candidate path until one is available in the runtime bundle.
      }
    }

    if (!appModule?.default) {
      throw new Error("Unable to resolve server module for API runtime");
    }

    const app = appModule.default;
    return app(req, res);
  } catch (error) {
    console.error("API bootstrap error:", error);
    res.status(500).json({
      error: "API bootstrap failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

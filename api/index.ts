export default async function handler(req: any, res: any) {
  try {
    const { default: app } = await import("../server");
    return app(req, res);
  } catch (error) {
    console.error("API bootstrap error:", error);
    res.status(500).json({
      error: "API bootstrap failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

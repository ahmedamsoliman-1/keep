import { createSuccessResponse } from "@keephq/api-contract";

export function GET() {
  return Response.json(
    createSuccessResponse(
      {
        name: "keep-api",
        status: "ok" as const,
        version: "v1" as const,
      },
      crypto.randomUUID(),
    ),
  );
}

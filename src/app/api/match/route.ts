import { NextResponse } from "next/server";
import { matchAndGroupServices, reassignService, verifyGroup } from "@/lib/service-matcher";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: string };

  try {
    if (action === "reassign") {
      const { serviceId, newGroupId } = body;
      if (!serviceId) {
        return NextResponse.json({ error: "serviceId required" }, { status: 400 });
      }
      const result = await reassignService(serviceId, newGroupId);
      return NextResponse.json(result);
    }

    if (action === "verify") {
      const { groupId, verified } = body;
      if (!groupId) {
        return NextResponse.json({ error: "groupId required" }, { status: 400 });
      }
      const result = await verifyGroup(groupId, verified ?? true);
      return NextResponse.json(result);
    }

    const result = await matchAndGroupServices();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Match failed" },
      { status: 500 }
    );
  }
}

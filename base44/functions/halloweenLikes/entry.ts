import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const listingId = String(payload?.halloween_listing_id || "").trim();
    const action = payload?.action === "toggle" ? "toggle" : "get";
    if (!listingId) return Response.json({ error: "Halloween listing ID is required" }, { status: 400 });

    let user = null;
    try { user = await base44.auth.me(); } catch {}

    if (action === "toggle") {
      if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
      const listing = await base44.asServiceRole.entities.Location.get(listingId);
      if (!listing || listing.type !== "halloween_candy") {
        return Response.json({ error: "Halloween listing not found" }, { status: 404 });
      }

      const likeKey = `${listingId}:${user.id}`;
      if (payload?.liked === true) {
        const existing = await base44.asServiceRole.entities.HalloweenLike.filter({ like_key: likeKey });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.HalloweenLike.create({
            halloween_listing_id: listingId,
            user_id: user.id,
            like_key: likeKey,
            created_at: new Date().toISOString(),
          });
        }
        const duplicates = await base44.asServiceRole.entities.HalloweenLike.filter({ like_key: likeKey });
        if (duplicates.length > 1) {
          const ordered = [...duplicates].sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)) || String(a.id).localeCompare(String(b.id)));
          await base44.asServiceRole.entities.HalloweenLike.deleteMany({ id: { $in: ordered.slice(1).map((like) => like.id) } });
        }
      } else {
        await base44.asServiceRole.entities.HalloweenLike.deleteMany({ like_key: likeKey });
      }
    }

    const likes = await base44.entities.HalloweenLike.filter({ halloween_listing_id: listingId });
    return Response.json({
      count: likes.length,
      liked: !!user && likes.some((like) => like.user_id === user.id),
    });
  } catch (error) {
    return Response.json({ error: error?.message || "Could not update Halloween like" }, { status: 500 });
  }
}
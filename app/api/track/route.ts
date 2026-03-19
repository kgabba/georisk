import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("TRACK EVENT:", body);

    // TODO: подключи Prisma позже
    // Пример:
    // const prisma = new PrismaClient();
    // await prisma.event.create({
    //   data: {
    //     timestamp: new Date(body.timestamp),
    //     cadastre: body.cadastre ?? null,
    //     polygonCoords: body.polygon_coords ?? null,
    //     source: body.source,
    //     phone: body.phone ?? null
    //   }
    // });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Track API error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

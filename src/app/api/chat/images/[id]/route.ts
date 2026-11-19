import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    if (!id) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const file = await prisma.chatFile.findUnique({
      where: { id },
      select: { data: true, mimeType: true, fileName: true },
    });

    if (!file || !file.data) {
      return new NextResponse("Image Not Found", { status: 404 });
    }

    return new NextResponse(Buffer.from(file.data), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "image/webp",
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving chat image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

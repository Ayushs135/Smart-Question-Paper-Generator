import { NextRequest, NextResponse } from "next/server";
import { generatePaperPdf } from "@/lib/pdf/generatePaperPdf";
import { GenerationResult } from "@/lib/generator/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerationResult;

    if (!body || !body.questions || !body.actual) {
      return NextResponse.json(
        { error: "Invalid paper data provided." },
        { status: 400 }
      );
    }

    const pdfBytes = await generatePaperPdf(body);

    const subject = body.questions[0]?.subject || "MATHEMATICS";
    const marks = body.actual.totalMarks || 40;
    const filename = `CBSE_Class10_${subject}_${marks}M_Question_Paper.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBytes.byteLength.toString(),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to generate PDF.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

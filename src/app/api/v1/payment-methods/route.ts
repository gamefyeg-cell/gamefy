import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(req: Request) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        type: true,
        label: true,
        handle: true,
        instructions: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: paymentMethods,
    });
  } catch (err) {
    console.error("[api/v1/payment-methods] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

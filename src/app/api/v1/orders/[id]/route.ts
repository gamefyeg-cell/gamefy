import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";
import { parseJson } from "@/lib/json";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        region: { select: { id: true, code: true, name: true, currency: true } },
        paymentMethod: { select: { id: true, type: true, label: true, handle: true } },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, title: true, slug: true, coverUrl: true },
                },
                activationRegion: {
                  select: { id: true, name: true, code: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        status: order.status,
        total: order.total,
        currency: order.currency,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        buyerCity: order.buyerCity,
        paymentProofUrl: order.paymentProofUrl,
        verifiedAt: order.verifiedAt,
        createdAt: order.createdAt,
        user: order.user,
        region: order.region,
        paymentMethod: order.paymentMethod,
        items: order.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          discountName: item.discountName,
          customFieldValues: parseJson<Record<string, string>>(item.customFieldValues, {}),
          product: item.variant.product,
          variant: {
            id: item.variant.id,
            sku: item.variant.sku,
            platform: item.variant.platform,
            edition: item.variant.edition,
            saleMode: item.variant.saleMode,
            deliveryMethod: item.variant.deliveryMethod,
            activationRegion: item.variant.activationRegion,
          },
          deliveredAt: item.deliveredAt,
          isDelivered: Boolean(item.deliveredAt),
        })),
      },
    });
  } catch (err) {
    console.error(`[api/v1/orders/${id}] Error:`, err);
    return NextResponse.json({ error: "Failed to retrieve order" }, { status: 500 });
  }
}

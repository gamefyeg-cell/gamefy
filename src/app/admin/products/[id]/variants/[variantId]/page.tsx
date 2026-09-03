import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateVariantAction, deleteVariantAction, addKeyStockAction } from "@/lib/actions/admin/products";
import VariantForm from "@/components/admin/VariantForm";

export default async function EditVariantPage({
  params,
}: {
  params: Promise<{ id: string; variantId: string }>;
}) {
  const { id, variantId } = await params;
  const [variant, activationRegions, stockCounts] = await Promise.all([
    prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } }),
    prisma.activationRegion.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.keyStockItem.groupBy({ by: ["used"], where: { variantId }, _count: { _all: true } }),
  ]);
  if (!variant || variant.productId !== id) notFound();

  const available = stockCounts.find((s) => s.used === false)?._count._all ?? 0;
  const used = stockCounts.find((s) => s.used === true)?._count._all ?? 0;
  const needsStock = ["AUTO_KEY", "CREDENTIAL_DELIVERY", "SUBSCRIPTION_CODE", "SUBSCRIPTION_SHARED_ACCOUNT"].includes(
    variant.deliveryMethod
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="a-h1">
          Option · <span style={{ color: "var(--a-muted)", fontWeight: 400 }}>{variant.product.title}</span>
        </h1>
        <Link href={`/admin/products/${id}`} style={{ color: "var(--a-accent)" }} className="text-sm">
          ‹ Back to product
        </Link>
      </div>

      <VariantForm
        mode="edit"
        action={updateVariantAction}
        productId={variant.productId}
        productType={variant.product.type}
        variantId={variant.id}
        activationRegions={activationRegions}
        submitLabel="Save changes"
        defaults={{
          sku: variant.sku,
          platform: variant.platform,
          edition: variant.edition,
          durationLabel: variant.durationLabel,
          saleMode: variant.saleMode,
          deliveryMethod: variant.deliveryMethod,
          price: variant.price,
          cost: variant.cost,
          currency: variant.currency,
          stockMode: variant.stockMode,
          stockQty: variant.stockQty,
          outOfStockMessage: variant.outOfStockMessage,
          activationRegionId: variant.activationRegionId,
          regionLockType: variant.regionLockType,
          warrantyDays: variant.warrantyDays,
          accountAccessLevel: variant.accountAccessLevel,
          accountDeliveryNote: variant.accountDeliveryNote,
          activationInstructions: variant.activationInstructions,
          redemptionInstructions: variant.redemptionInstructions,
          active: variant.active,
        }}
      />

      {needsStock && (
        <div className="flex flex-col gap-3">
          <h2 className="a-h2">Key / credential stock</h2>
          <div className="flex gap-4 text-sm">
            <span className="a-badge a-badge-success">{available} available</span>
            <span className="a-badge">{used} delivered</span>
          </div>
          <form action={addKeyStockAction} className="a-card" style={{ padding: "1rem" }}>
            <input type="hidden" name="variantId" value={variant.id} />
            <input type="hidden" name="productId" value={variant.productId} />
            <label className="a-label">
              Codes / credentials — one per line (for accounts, e.g. <code>email:password</code>). Each line is
              AES-256-GCM encrypted before it's stored.
            </label>
            <textarea
              name="codes"
              rows={6}
              className="a-textarea font-mono"
              style={{ fontSize: "0.8rem" }}
              placeholder={"XXXXX-XXXXX-XXXXX\nemail@example.com:P@ssw0rd!"}
            />
            <div className="flex justify-end mt-3">
              <button type="submit" className="a-btn a-btn-primary">
                Add to stock
              </button>
            </div>
          </form>
        </div>
      )}

      <form action={deleteVariantAction}>
        <input type="hidden" name="id" value={variant.id} />
        <input type="hidden" name="productId" value={variant.productId} />
        <button className="a-btn a-btn-danger">Delete option</button>
      </form>
    </div>
  );
}

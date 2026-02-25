"use client";

interface Item {
  id: string;
  name: string;
  variationId: string;
  priceCents: number;
  currency: string;
  isFrozen: boolean;
}

export function AdminProductList({ initialItems }: { initialItems: Item[] }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Variation ID</th>
            <th className="px-4 py-2 font-medium">Price</th>
            <th className="px-4 py-2 font-medium">Frozen</th>
          </tr>
        </thead>
        <tbody>
          {initialItems.map((item) => (
            <tr key={item.variationId} className="border-b last:border-0">
              <td className="px-4 py-2">{item.name}</td>
              <td className="px-4 py-2 font-mono text-sm">{item.variationId}</td>
              <td className="px-4 py-2">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: item.currency,
                }).format(item.priceCents / 100)}
              </td>
              <td className="px-4 py-2">{item.isFrozen ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {initialItems.length === 0 && (
        <p className="p-4 text-gray-500">No catalog items. Configure Square catalog and location.</p>
      )}
    </div>
  );
}

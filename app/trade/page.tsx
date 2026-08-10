export default function TradePage() {
  return (
    <main className="pt-16 md:pl-64 pb-16 md:pb-0">
      <div className="p-4 md:p-8 min-h-[calc(100vh-4rem)]">
        <h1 className="text-3xl font-bold text-foreground mb-2">UNET-Trade</h1>
        <p className="text-muted-foreground mb-8">Buy and sell items in the marketplace</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="w-full aspect-square bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-sm text-muted-foreground">Item {i + 1}</p>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground">Product {i + 1}</h3>
                <p className="text-2xl font-bold text-primary mt-2">${(Math.random() * 100 + 10).toFixed(2)}</p>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                    Buy
                  </button>
                  <button className="flex-1 px-3 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors">
                    Message
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

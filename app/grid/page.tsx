export default function GridPage() {
  return (
    <main className="pt-16 md:pl-64 pb-16 md:pb-0">
      <div className="p-4 md:p-8 min-h-[calc(100vh-4rem)]">
        <h1 className="text-3xl font-bold text-foreground mb-2">Instagram Grid</h1>
        <p className="text-muted-foreground mb-8">Grid-style photo gallery view</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gradient-to-br from-accent/20 to-primary/20 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="text-2xl font-bold text-muted-foreground">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

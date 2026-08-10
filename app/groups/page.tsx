export default function GroupsPage() {
  return (
    <main className="pt-16 md:pl-64 pb-16 md:pb-0">
      <div className="p-4 md:p-8 min-h-[calc(100vh-4rem)]">
        <h1 className="text-3xl font-bold text-foreground mb-2">Grupos</h1>
        <p className="text-muted-foreground mb-8">Join and explore communities</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="w-full h-32 bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl mb-1">👥</div>
                  <p className="text-xs text-muted-foreground">Group {i + 1}</p>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground">Group {i + 1}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.floor(Math.random() * 10000) + 100} members
                </p>
                <button className="mt-4 w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                  Join Group
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

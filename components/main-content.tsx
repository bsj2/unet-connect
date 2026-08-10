'use client';

export function MainContent() {
  return (
    <main className="pt-16 md:pl-64 pb-16 md:pb-0">
      <div className="p-4 md:p-8 min-h-[calc(100vh-4rem)]">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Muro</h1>
          <p className="text-muted-foreground">Explore content from your network</p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder Cards */}
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image Placeholder */}
              <div className="w-full aspect-square bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-muted-foreground mb-2">
                    {i + 1}
                  </div>
                  <p className="text-sm text-muted-foreground">Content Item</p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <h3 className="font-semibold text-foreground mb-1">Post Title {i + 1}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This is a placeholder for your content. Replace with real data.
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>2 hours ago</span>
                  <span>👍 24</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

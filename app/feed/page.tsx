export default function FeedPage() {
  return (
    <main className="pt-16 md:pl-64 pb-16 md:pb-0">
      <div className="p-4 md:p-8 min-h-[calc(100vh-4rem)]">
        <h1 className="text-3xl font-bold text-foreground mb-2">TikTok Feed</h1>
        <p className="text-muted-foreground mb-8">Vertical video feed</p>

        <div className="max-w-2xl mx-auto space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <div className="aspect-video bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎬</div>
                  <p className="text-muted-foreground">Video {i + 1}</p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-foreground font-medium">Trending Video #{i + 1}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.floor(Math.random() * 1000)}K views
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

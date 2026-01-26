export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-muted rounded-lg p-6 space-y-3">
              <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
              <div className="h-8 bg-muted-foreground/20 rounded w-1/3"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-muted rounded-lg p-6 h-80"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

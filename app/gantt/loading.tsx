export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="bg-muted rounded-lg h-96"></div>
      </div>
    </div>
  )
}

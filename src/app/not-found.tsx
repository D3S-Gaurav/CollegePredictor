import Link from "next/link";
import { Search, Home } from "lucide-react";

/**
 * Custom 404 page for the App Router.
 *
 * Displays when `notFound()` is called or when a route
 * doesn't match any defined page segment.
 */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Search className="h-8 w-8 text-blue-400" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold gradient-text">404</h1>
          <h2 className="text-xl font-semibold text-white">Page Not Found</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        {/* Action */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Home className="h-4 w-4" />
          Back to Predictor
        </Link>
      </div>
    </div>
  );
}

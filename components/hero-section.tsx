import { Button } from "@/components/ui/button"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Discover Amazing Products from Local Vendors</h1>
          <p className="text-xl mb-8 opacity-90">
            Shop from thousands of products or start your own store. Join our community of buyers and sellers today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/products">
              <Button size="lg" variant="secondary">
                Start Shopping
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button
                size="lg"
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-blue-600 bg-transparent"
              >
                Become a Seller
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

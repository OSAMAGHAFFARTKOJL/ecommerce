"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "./product-card"
import { Button } from "@/components/ui/button"
import { TrendingUp } from "lucide-react"
import Link from "next/link"

interface Product {
  id: string
  name: string
  price: number
  image: string
  category: string
  rating: number
  vendor: string
  trend_score?: number
}

export function TrendingProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrendingProducts()
  }, [])

  const fetchTrendingProducts = async () => {
    try {
      const response = await fetch("/api/products/trending")
      if (response.ok) {
        const data = await response.json()
        setProducts(data.slice(0, 8))
      }
    } catch (error) {
      console.error("Error fetching trending products:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="animate-pulse">
              <div className="bg-gray-200 h-8 rounded w-64 mx-auto mb-4"></div>
              <div className="bg-gray-200 h-4 rounded w-48 mx-auto"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
                <div className="bg-gray-200 h-4 rounded mb-2"></div>
                <div className="bg-gray-200 h-4 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h2 className="text-3xl font-bold">Trending Now</h2>
          </div>
          <p className="text-muted-foreground">Most popular products this week</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {products.map((product, index) => (
            <div key={product.id} className="relative">
              {index < 3 && (
                <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  #{index + 1}
                </div>
              )}
              <ProductCard product={product} showTrendingBadge />
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/products?sort=trending">
            <Button size="lg" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              View All Trending
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "./product-card"
import { Button } from "@/components/ui/button"
import { Sparkles, RefreshCw } from "lucide-react"
import Link from "next/link"

interface Product {
  id: string
  name: string
  price: number
  image: string
  category: string
  rating: number
  vendor: string
  recommendation_score?: number
}

export function PersonalizedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPersonalizedProducts()
  }, [])

  const fetchPersonalizedProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/products/personalized")
      if (response.ok) {
        const data = await response.json()
        setProducts(data.slice(0, 8)) // Show top 8 recommendations
      }
    } catch (error) {
      console.error("Error fetching personalized products:", error)
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
    <section className="py-16 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h2 className="text-3xl font-bold">Recommended for You</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Personalized product recommendations based on your interests and behavior
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPersonalizedProducts}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Recommendations
          </Button>
        </div>

        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} showRecommendationScore />
              ))}
            </div>

            <div className="text-center">
              <Link href="/products">
                <Button size="lg" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Discover More Products
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Building Your Recommendations</h3>
            <p className="text-muted-foreground mb-6">
              Start browsing and shopping to get personalized product recommendations!
            </p>
            <Link href="/products">
              <Button>Explore Products</Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

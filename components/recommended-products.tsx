"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "./product-card"
import { Sparkles } from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
  image: string
  category: string
  rating: number
  vendor: string
  similarity_score?: number
}

interface RecommendedProductsProps {
  currentProductId: string
}

export function RecommendedProducts({ currentProductId }: RecommendedProductsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecommendedProducts()
  }, [currentProductId])

  const fetchRecommendedProducts = async () => {
    try {
      const response = await fetch(`/api/products/${currentProductId}/recommendations`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Error fetching recommended products:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="py-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h2 className="text-2xl font-bold">You Might Also Like</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <section className="py-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <h2 className="text-2xl font-bold">You Might Also Like</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} showSimilarity />
        ))}
      </div>
    </section>
  )
}

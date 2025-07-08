"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Product {
  id: string
  name: string
  price: number
  image_url: string
  category: string
  rating: number
  vendor_name: string
  showRecommendationScore?: boolean
  showTrendingBadge?: boolean
  showSimilarity?: boolean
  recommendation_score?: number
  trend_score?: number
  similarity_score?: number
}

interface ProductCardProps {
  product: Product
  showRecommendationScore?: boolean
  showTrendingBadge?: boolean
  showSimilarity?: boolean
}

export function ProductCard({ product, showRecommendationScore, showTrendingBadge, showSimilarity }: ProductCardProps) {
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { toast } = useToast()

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsAddingToCart(true)

    try {
      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      })

      if (response.ok) {
        toast({
          title: "Added to Cart",
          description: `${product.name} has been added to your cart.`,
        })

        // Refresh cart count in header
        if (window.refreshCartCount) {
          window.refreshCartCount()
        }
      } else {
        const data = await response.json()
        if (response.status === 401) {
          toast({
            title: "Please Login",
            description: "You need to login to add items to cart.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to add item to cart.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-0">
          <div className="aspect-square relative overflow-hidden rounded-t-lg">
            <img
              src={product.image_url || "/placeholder.svg?height=300&width=300"}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <Badge className="absolute top-2 left-2">{product.category}</Badge>

            {showTrendingBadge && <Badge className="absolute top-2 right-2 bg-green-500">Trending</Badge>}
          </div>
          <div className="p-4">
            <h3 className="font-medium mb-2 line-clamp-2">{product.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">by {product.vendor_name}</p>

            <div className="flex items-center mb-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground ml-2">({product.rating.toFixed(1)})</span>
            </div>

            {showRecommendationScore && product.recommendation_score && (
              <div className="mb-2">
                <Badge variant="secondary" className="text-xs">
                  {Math.round(product.recommendation_score * 100)}% match
                </Badge>
              </div>
            )}

            {showSimilarity && product.similarity_score && (
              <div className="mb-2">
                <Badge variant="secondary" className="text-xs">
                  {Math.round(product.similarity_score * 100)}% similar
                </Badge>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
              <Button size="sm" onClick={addToCart} disabled={isAddingToCart} className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                {isAddingToCart ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

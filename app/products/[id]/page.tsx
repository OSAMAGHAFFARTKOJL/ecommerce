"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Star, ShoppingCart, Heart, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUserTracking } from "@/components/user-tracking-provider"
import { RecommendedProducts } from "@/components/recommended-products"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  rating: number
  vendor: string
  tags: string[]
  stock_quantity: number
}

export default function ProductDetailPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { toast } = useToast()
  const { trackEvent } = useUserTracking()

  useEffect(() => {
    if (params.id) {
      fetchProduct(params.id as string)
      trackEvent("product_view", { product_id: params.id as string })
    }
  }, [params.id])

  const fetchProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`)
      if (response.ok) {
        const data = await response.json()
        setProduct(data)
      }
    } catch (error) {
      console.error("Error fetching product:", error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async () => {
    if (!product) return

    setIsAddingToCart(true)
    trackEvent("add_to_cart", {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
    })

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
      } else {
        toast({
          title: "Error",
          description: "Failed to add item to cart.",
          variant: "destructive",
        })
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

  const addToWishlist = () => {
    trackEvent("add_to_wishlist", { product_id: product?.id })
    toast({
      title: "Added to Wishlist",
      description: "Product saved to your wishlist.",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-200 aspect-square rounded-lg"></div>
              <div className="space-y-4">
                <div className="bg-gray-200 h-8 rounded"></div>
                <div className="bg-gray-200 h-4 rounded w-2/3"></div>
                <div className="bg-gray-200 h-20 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground">The product you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Image */}
          <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-100">
            <img
              src={product.image || "/placeholder.svg?height=600&width=600"}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <Badge className="mb-2">{product.category}</Badge>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <p className="text-muted-foreground">by {product.vendor}</p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({product.rating} stars)</span>
            </div>

            <div className="text-3xl font-bold text-primary">${product.price}</div>

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            {product.tags && product.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 text-sm">
              <span className={product.stock_quantity > 0 ? "text-green-600" : "text-red-600"}>
                {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}
              </span>
            </div>

            <Separator />

            <div className="flex space-x-4">
              <Button
                onClick={addToCart}
                disabled={isAddingToCart || product.stock_quantity === 0}
                className="flex-1 flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                {isAddingToCart ? "Adding..." : "Add to Cart"}
              </Button>
              <Button variant="outline" onClick={addToWishlist} className="flex items-center gap-2 bg-transparent">
                <Heart className="h-4 w-4" />
                Wishlist
              </Button>
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Recommended Products */}
        <RecommendedProducts currentProductId={product.id} />
      </div>
    </div>
  )
}

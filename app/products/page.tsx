"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { ProductCard } from "@/components/product-card"
import { ProductFilters } from "@/components/product-filters"
import { SmartFilters } from "@/components/smart-filters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Sparkles, X, Image } from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
  image_url: string
  category: string
  rating: number
  vendor_name: string
  description: string
  tags: string[]
  search_score?: number
}

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState(searchParams?.get("search") || "")
  const [showFilters, setShowFilters] = useState(false)
  const [showSmartFilters, setShowSmartFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<"all" | "search">("all")
  const [recording, setRecording] = useState(false)
  const [processingVoice, setProcessingVoice] = useState(false)
  const [processingImage, setProcessingImage] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const initialSearch = searchParams?.get("search")
    if (initialSearch) {
      setSearchTerm(initialSearch)
      performSearch(initialSearch)
    } else {
      fetchAllProducts()
    }
  }, [searchParams])

  const fetchAllProducts = async () => {
    setLoading(true)
    setSearchMode("all")
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
        setFilteredProducts(data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const performSearch = async (query: string) => {
  if (!query.trim()) {
    fetchAllProducts();
    return;
  }

  setSearchLoading(true);
  setSearchMode("search");
  try {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    const vectorResponse = await fetch("/api/products/vector-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ query }),
    });

    if (vectorResponse.ok) {
      const vectorData = await vectorResponse.json();
      if (vectorData.length > 0) {
        setProducts(vectorData);
        setFilteredProducts(vectorData);
        return;
      }
    }

    const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`, {
      headers: authHeader,
    });
    if (response.ok) {
      const data = await response.json();
      setProducts(data);
      setFilteredProducts(data);
    }
  } catch (error) {
    console.error("Error searching products:", error);
  } finally {
    setSearchLoading(false);
    setLoading(false);
  }
};

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      const url = new URL(window.location.href)
      url.searchParams.set("search", searchTerm)
      window.history.pushState({}, "", url.toString())
      performSearch(searchTerm)
    } else {
      clearSearch()
    }
  }

  const clearSearch = () => {
    setSearchTerm("")
    const url = new URL(window.location.href)
    url.searchParams.delete("search")
    window.history.pushState({}, "", url.toString())
    fetchAllProducts()
  }

  const handleSmartFilter = (smartFilteredProducts: Product[]) => {
    setFilteredProducts(smartFilteredProducts)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks.current, { type: "audio/webm" })
        chunks.current = []
        stream.getTracks().forEach((track) => track.stop())
        await sendAudioToServer(audioBlob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      console.error("Could not start recording:", err)
      alert("Failed to access microphone. Please ensure permissions are granted.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const sendAudioToServer = async (audioBlob: Blob) => {
  setProcessingVoice(true);
  try {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    if (!token) {
      alert("Please log in to use voice search.");
      return;
    }

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    const response = await fetch("/api/products/voice-search", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`, // Add token to header
      },
    });

    if (!response.ok) {
      throw new Error("Voice search API failed");
    }

    const data = await response.json();
    if (data.keyword) {
      setSearchTerm(data.keyword);
      const url = new URL(window.location.href);
      url.searchParams.set("search", data.keyword);
      window.history.pushState({}, "", url.toString());
      await performSearch(data.keyword);
    } else {
      console.error("No keyword returned from voice search");
      alert("Could not process voice input. Please try again.");
    }
  } catch (err) {
    console.error("Voice search failed:", err);
    alert("Voice search failed. Please try again.");
  } finally {
    setProcessingVoice(false);
  }
};

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProcessingImage(true)
    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/products/image-search", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Image search API failed")
      }

      const data = await response.json()
      if (data.keyword) {
        setSearchTerm(data.keyword)
        const url = new URL(window.location.href)
        url.searchParams.set("search", data.keyword)
        window.history.pushState({}, "", url.toString())
        await performSearch(data.keyword)
      } else {
        console.error("No keyword returned from image search")
        alert("Could not process image input. Please try again.")
      }
    } catch (err) {
      console.error("Image search failed:", err)
      alert("Image search failed. Please try again.")
    } finally {
      setProcessingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = "" // Clear file input
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{searchMode === "search" ? "Search Results" : "Products"}</h1>

          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search for products, brands, categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={searchLoading}>
                  {searchLoading ? "Searching..." : "Search"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSmartFilters(!showSmartFilters)}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Sparkles className="h-4 w-4" />
                  Smart
                </Button>
              </div>
            </div>
          </form>

          <div className="mb-4 flex gap-4">
            {!recording && (
              <Button onClick={startRecording} className="bg-blue-600 text-white hover:bg-blue-700">
                🎙 Start Voice Search
              </Button>
            )}
            {recording && (
              <Button onClick={stopRecording} className="bg-red-600 text-white hover:bg-red-700">
                ⏹ Stop Recording
              </Button>
            )}
            {processingVoice && <span className="ml-4 self-center">🔄 Processing voice...</span>}
            <div className="flex items-center gap-2">
              <Button
                asChild
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={processingImage}
              >
                <label htmlFor="image-upload">
                  <Image className="h-4 w-4 mr-2" />
                  {processingImage ? "Processing Image..." : "Search by Image"}
                </label>
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden"
              />
            </div>
          </div>

          {searchMode === "search" && (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="secondary">
                {filteredProducts.length} results for "{searchTerm}"
              </Badge>
              {products.some((p) => p.search_score && p.search_score > 80) && (
                <Badge className="bg-green-100 text-green-800">High relevance matches found</Badge>
              )}
            </div>
          )}

          {showFilters && <ProductFilters products={products} onFilter={setFilteredProducts} />}
          {showSmartFilters && <SmartFilters onFiltersChange={handleSmartFilter} />}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="relative">
              <ProductCard product={product} />
              {searchMode === "search" && product.search_score && product.search_score > 70 && (
                <Badge className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs">
                  {Math.round(product.search_score)}% match
                </Badge>
              )}
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && !loading && !searchLoading && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchMode === "search" ? "No products found" : "No products available"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchMode === "search"
                ? `Try different keywords or check your spelling. Searched for: "${searchTerm}"`
                : "Check back later for new products."}
            </p>
          </div>
        )}

        {searchLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Searching products...</p>
          </div>
        )}
      </div>
    </div>
  )
}

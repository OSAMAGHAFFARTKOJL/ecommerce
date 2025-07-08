"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react'

export default function NewProductPage() {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    tags: "",
    image_url: "",
    stock_quantity: "",
  })
  const [categories, setCategories] = useState<string[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data)
        } else {
          throw new Error('Failed to fetch categories')
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        // Fallback categories
        setCategories([
          'Electronics',
          'Computers',
          'Fashion',
          'Home & Garden',
          'Books',
          'Gaming',
          'Sports',
          'Beauty',
          'Automotive',
          'Toys'
        ])
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        })
        return
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        })
        return
      }

      setImageFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async () => {
    if (!imageFile) return ""

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("image", imageFile)

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        return data.url
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      })
      return ""
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview("")
    setFormData({ ...formData, image_url: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Product name is required",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (!formData.description.trim()) {
        toast({
          title: "Validation Error", 
          description: "Product description is required",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (!formData.category) {
        toast({
          title: "Validation Error",
          description: "Please select a category",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (!formData.price || parseFloat(formData.price) <= 0) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid price",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid stock quantity",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      let imageUrl = formData.image_url

      // Upload image if file is selected
      if (imageFile) {
        imageUrl = await uploadImage()
        if (!imageUrl) {
          setIsLoading(false)
          return
        }
      }

      // Prepare the product data
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        tags: formData.tags.trim(),
        image_url: imageUrl || '/placeholder.svg?height=400&width=400',
        stock_quantity: parseInt(formData.stock_quantity),
      }

      console.log('Submitting product data:', productData)

      const response = await fetch("/api/vendor/products", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      })

      const data = await response.json()
      console.log('Server response:', data)

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product created successfully and sent for approval",
        })
        router.push("/vendor/dashboard")
      } else {
        console.error('Server error:', data)
        toast({
          title: "Error",
          description: data.error || "Failed to create product",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Add New Product</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Image */}
                <div>
                  <Label>Product Image</Label>
                  <div className="mt-2">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview || "/placeholder.svg"}
                          alt="Product preview"
                          className="w-full h-64 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="text-center">
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <label htmlFor="image-upload" className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900">Upload product image</span>
                              <span className="mt-1 block text-sm text-gray-500">PNG, JPG, GIF up to 5MB</span>
                            </label>
                            <input
                              id="image-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-4"
                            onClick={() => document.getElementById("image-upload")?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Alternative: Image URL */}
                  <div className="mt-4">
                    <Label htmlFor="image_url">Or enter image URL</Label>
                    <Input
                      id="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      disabled={!!imageFile}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    placeholder="Describe your product in detail"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price ($) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock Quantity *</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      required
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  {loadingCategories ? (
                    <div className="flex items-center space-x-2 p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading categories...</span>
                    </div>
                  ) : (
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g., wireless, bluetooth, premium, waterproof"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Add relevant tags to help customers find your product
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || uploadingImage} size="lg">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating Product...
                    </>
                  ) : uploadingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading Image...
                    </>
                  ) : (
                    "Create Product"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

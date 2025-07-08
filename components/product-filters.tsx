"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface Product {
  id: string
  name: string
  price: number
  image_url: string
  category: string
  rating: number
  vendor_name: string
}

interface ProductFiltersProps {
  products: Product[]
  onFilter: (filteredProducts: Product[]) => void
}

export function ProductFilters({ products, onFilter }: ProductFiltersProps) {
  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
    rating: "",
    vendor: "",
  })

  const categories = [...new Set(products.map((p) => p.category))]
  const vendors = [...new Set(products.map((p) => p.vendor_name))]

  const applyFilters = () => {
    let filtered = products

    if (filters.category) {
      filtered = filtered.filter((p) => p.category === filters.category)
    }

    if (filters.minPrice) {
      filtered = filtered.filter((p) => p.price >= Number.parseFloat(filters.minPrice))
    }

    if (filters.maxPrice) {
      filtered = filtered.filter((p) => p.price <= Number.parseFloat(filters.maxPrice))
    }

    if (filters.rating) {
      filtered = filtered.filter((p) => p.rating >= Number.parseFloat(filters.rating))
    }

    if (filters.vendor) {
      filtered = filtered.filter((p) => p.vendor_name === filters.vendor)
    }

    onFilter(filtered)
  }

  const clearFilters = () => {
    setFilters({
      category: "",
      minPrice: "",
      maxPrice: "",
      rating: "",
      vendor: "",
    })
    onFilter(products)
  }

  useEffect(() => {
    applyFilters()
  }, [filters])

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Filters
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="minPrice">Min Price</Label>
            <Input
              id="minPrice"
              type="number"
              placeholder="$0"
              value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="maxPrice">Max Price</Label>
            <Input
              id="maxPrice"
              type="number"
              placeholder="$1000"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="rating">Min Rating</Label>
            <Select value={filters.rating} onValueChange={(value) => setFilters({ ...filters, rating: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Any Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Rating</SelectItem>
                <SelectItem value="4">4+ Stars</SelectItem>
                <SelectItem value="3">3+ Stars</SelectItem>
                <SelectItem value="2">2+ Stars</SelectItem>
                <SelectItem value="1">1+ Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="vendor">Vendor</Label>
            <Select value={filters.vendor} onValueChange={(value) => setFilters({ ...filters, vendor: value })}>
              <SelectTrigger>
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor} value={vendor}>
                    {vendor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

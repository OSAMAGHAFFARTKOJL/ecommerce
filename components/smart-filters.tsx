"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Sparkles, X } from "lucide-react"

interface SmartFiltersProps {
  onFiltersChange: (products: any[]) => void
}

export function SmartFilters({ onFiltersChange }: SmartFiltersProps) {
  const [priceRange, setPriceRange] = useState([0, 1000])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [availableFilters, setAvailableFilters] = useState({
    categories: [],
    tags: [],
    priceRange: { min: 0, max: 1000 },
  })

  useEffect(() => {
    fetchFilterOptions()
  }, [])

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch("/api/products/filter-options")
      if (response.ok) {
        const data = await response.json()
        setAvailableFilters(data)
        setPriceRange([data.priceRange.min, data.priceRange.max])
      }
    } catch (error) {
      console.error("Error fetching filter options:", error)
    }
  }

  const applyFilters = async () => {
    try {
      const response = await fetch("/api/products/smart-filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: selectedCategories,
          tags: selectedTags,
          priceRange,
          minRating,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        onFiltersChange(data)
      }
    } catch (error) {
      console.error("Error applying filters:", error)
    }
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedTags([])
    setPriceRange([availableFilters.priceRange.min, availableFilters.priceRange.max])
    setMinRating(0)
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Smart Filters
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Categories */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Categories</Label>
          <div className="flex flex-wrap gap-2">
            {availableFilters.categories.map((category: string) => (
              <Badge
                key={category}
                variant={selectedCategories.includes(category) ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => toggleCategory(category)}
              >
                {category}
                {selectedCategories.includes(category) && <X className="h-3 w-3 ml-1" />}
              </Badge>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Price Range: ${priceRange[0]} - ${priceRange[1]}
          </Label>
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={availableFilters.priceRange.max}
            min={availableFilters.priceRange.min}
            step={10}
            className="w-full"
          />
        </div>

        {/* Rating */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Minimum Rating: {minRating} stars</Label>
          <Slider
            value={[minRating]}
            onValueChange={(value) => setMinRating(value[0])}
            max={5}
            min={0}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* Popular Tags */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Popular Tags</Label>
          <div className="flex flex-wrap gap-2">
            {availableFilters.tags.slice(0, 15).map((tag: string) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                {selectedTags.includes(tag) && <X className="h-3 w-3 ml-1" />}
              </Badge>
            ))}
          </div>
        </div>

        <Button onClick={applyFilters} className="w-full">
          Apply Smart Filters
        </Button>
      </CardContent>
    </Card>
  )
}

import { Card, CardContent } from "@/components/ui/card"
import { Smartphone, Laptop, Shirt, Home, Book, Gamepad2 } from "lucide-react"
import Link from "next/link"

const categories = [
  { name: "Electronics", icon: Smartphone, count: 1250 },
  { name: "Computers", icon: Laptop, count: 890 },
  { name: "Fashion", icon: Shirt, count: 2100 },
  { name: "Home & Garden", icon: Home, count: 750 },
  { name: "Books", icon: Book, count: 450 },
  { name: "Gaming", icon: Gamepad2, count: 320 },
]

export function Categories() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Shop by Category</h2>
          <p className="text-muted-foreground">Find exactly what you're looking for</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link key={category.name} href={`/products?category=${encodeURIComponent(category.name)}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <category.icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-medium mb-2">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.count} items</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

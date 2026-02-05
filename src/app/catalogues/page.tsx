"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Edit, Package, DollarSign, Eye, TrendingUp, TrendingDown } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PhonePreviewButton } from "@/components/ui/phone-preview";

// Mock product data
interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  minStock: number;
  maxStock: number;
  category: "Viandes" | "Légumes" | "Épicerie" | "Boissons" | "Surgelés";
  image?: string;
}

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Poulet Fermier Bio",
    sku: "VIA-001",
    price: 12.99,
    stock: 45,
    minStock: 20,
    maxStock: 100,
    category: "Viandes",
  },
  {
    id: "2",
    name: "Boeuf Haché 5%",
    sku: "VIA-002",
    price: 8.99,
    stock: 15,
    minStock: 25,
    maxStock: 80,
    category: "Viandes",
  },
  {
    id: "3",
    name: "Côtes d'Agneau",
    sku: "VIA-003",
    price: 18.50,
    stock: 60,
    minStock: 15,
    maxStock: 70,
    category: "Viandes",
  },
  {
    id: "4",
    name: "Tomates Bio",
    sku: "LEG-001",
    price: 3.99,
    stock: 120,
    minStock: 50,
    maxStock: 200,
    category: "Légumes",
  },
  {
    id: "5",
    name: "Carottes Françaises",
    sku: "LEG-002",
    price: 2.49,
    stock: 80,
    minStock: 40,
    maxStock: 150,
    category: "Légumes",
  },
  {
    id: "6",
    name: "Salade Verte",
    sku: "LEG-003",
    price: 1.99,
    stock: 5,
    minStock: 30,
    maxStock: 100,
    category: "Légumes",
  },
  {
    id: "7",
    name: "Huile d'Olive Extra Vierge",
    sku: "EPI-001",
    price: 15.99,
    stock: 35,
    minStock: 20,
    maxStock: 60,
    category: "Épicerie",
  },
  {
    id: "8",
    name: "Pâtes Italiennes 500g",
    sku: "EPI-002",
    price: 2.99,
    stock: 90,
    minStock: 40,
    maxStock: 120,
    category: "Épicerie",
  },
  {
    id: "9",
    name: "Riz Basmati 1kg",
    sku: "EPI-003",
    price: 4.50,
    stock: 70,
    minStock: 30,
    maxStock: 100,
    category: "Épicerie",
  },
  {
    id: "10",
    name: "Jus d'Orange Frais",
    sku: "BOI-001",
    price: 5.99,
    stock: 25,
    minStock: 30,
    maxStock: 80,
    category: "Boissons",
  },
  {
    id: "11",
    name: "Eau Minérale 6x1.5L",
    sku: "BOI-002",
    price: 3.99,
    stock: 100,
    minStock: 50,
    maxStock: 150,
    category: "Boissons",
  },
  {
    id: "12",
    name: "Soda Cola Pack 12",
    sku: "BOI-003",
    price: 8.99,
    stock: 45,
    minStock: 25,
    maxStock: 90,
    category: "Boissons",
  },
  {
    id: "13",
    name: "Frites Surgelées 2.5kg",
    sku: "SUR-001",
    price: 6.99,
    stock: 55,
    minStock: 20,
    maxStock: 100,
    category: "Surgelés",
  },
  {
    id: "14",
    name: "Pizza Margherita",
    sku: "SUR-002",
    price: 4.99,
    stock: 0,
    minStock: 15,
    maxStock: 60,
    category: "Surgelés",
  },
  {
    id: "15",
    name: "Glace Vanille 1L",
    sku: "SUR-003",
    price: 5.50,
    stock: 32,
    minStock: 20,
    maxStock: 70,
    category: "Surgelés",
  },
];

type CategoryType = "All" | "Viandes" | "Légumes" | "Épicerie" | "Boissons" | "Surgelés";

const categories: CategoryType[] = ["All", "Viandes", "Légumes", "Épicerie", "Boissons", "Surgelés"];

const categoryColors: Record<string, string> = {
  Viandes: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Légumes: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Épicerie: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Boissons: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Surgelés: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

export default function CataloguesPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditPrice, setShowEditPrice] = useState(false);
  const [showUpdateStock, setShowUpdateStock] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Stock status helpers
  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return "out";
    if (product.stock <= product.minStock) return "low";
    return "in";
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case "in":
        return "bg-green-500";
      case "low":
        return "bg-amber-500";
      case "out":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStockLabel = (status: string) => {
    switch (status) {
      case "in":
        return "In Stock";
      case "low":
        return "Low Stock";
      case "out":
        return "Out of Stock";
      default:
        return "Unknown";
    }
  };

  const getStockPercentage = (product: Product) => {
    return Math.min((product.stock / product.maxStock) * 100, 100);
  };

  // Action handlers
  const handleEditPrice = (product: Product) => {
    setSelectedProduct(product);
    setEditPrice(product.price.toString());
    setShowEditPrice(true);
  };

  const handleUpdateStock = (product: Product) => {
    setSelectedProduct(product);
    setEditStock(product.stock.toString());
    setShowUpdateStock(true);
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  const savePrice = () => {
    if (selectedProduct) {
      const newPrice = parseFloat(editPrice);
      if (isNaN(newPrice) || newPrice <= 0) {
        toast.error("Please enter a valid price");
        return;
      }
      setProducts(
        products.map((p) =>
          p.id === selectedProduct.id ? { ...p, price: newPrice } : p
        )
      );
      toast.success(`Price updated for ${selectedProduct.name}`);
      setShowEditPrice(false);
    }
  };

  const saveStock = () => {
    if (selectedProduct) {
      const newStock = parseInt(editStock);
      if (isNaN(newStock) || newStock < 0) {
        toast.error("Please enter a valid stock quantity");
        return;
      }
      setProducts(
        products.map((p) =>
          p.id === selectedProduct.id ? { ...p, stock: newStock } : p
        )
      );
      toast.success(`Stock updated for ${selectedProduct.name}`);
      setShowUpdateStock(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Catalog Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your product inventory and pricing
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setShowAddProduct(true)}
            className="shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="default" className="sm:w-auto">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              {category}
              {category !== "All" && (
                <span className="ml-2 text-xs opacity-70">
                  ({products.filter((p) => p.category === category).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product);
              const stockPercentage = getStockPercentage(product);

              return (
                <div
                  key={product.id}
                  className="bg-card rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  {/* Product Image Placeholder */}
                  <div className="relative h-48 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden">
                    <Package className="h-20 w-20 text-muted-foreground/30 group-hover:scale-110 transition-transform duration-300" />
                    <Badge
                      className={`absolute top-3 right-3 ${categoryColors[product.category]}`}
                    >
                      {product.category}
                    </Badge>
                    {/* Stock indicator badge */}
                    <div
                      className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium text-white ${getStockColor(
                        stockStatus
                      )}`}
                    >
                      {getStockLabel(stockStatus)}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-4 space-y-3">
                    {/* Name and SKU */}
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        SKU: {product.sku}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        €{product.price.toFixed(2)}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          Stock: {product.stock}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Min: {product.minStock}
                        </div>
                      </div>
                    </div>

                    {/* Stock Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStockColor(
                            stockStatus
                          )}`}
                          style={{ width: `${stockPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stockPercentage.toFixed(0)}% of capacity
                      </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditPrice(product)}
                      >
                        <DollarSign className="h-3.5 w-3.5 mr-1" />
                        Price
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleUpdateStock(product)}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Stock
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(product)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Create a new product in your catalog
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input id="product-name" placeholder="Enter product name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-sku">SKU</Label>
              <Input id="product-sku" placeholder="e.g., VIA-001" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-price">Price</Label>
                <Input
                  id="product-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-stock">Initial Stock</Label>
                <Input
                  id="product-stock"
                  type="number"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProduct(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("Product added successfully");
                setShowAddProduct(false);
              }}
            >
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Price Modal */}
      <Dialog open={showEditPrice} onOpenChange={setShowEditPrice}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Price</DialogTitle>
            <DialogDescription>
              Update the price for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">New Price (€)</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {selectedProduct && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Price:</span>
                  <span className="font-medium">€{selectedProduct.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">New Price:</span>
                  <span className="font-bold text-primary">
                    €{parseFloat(editPrice || "0").toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPrice(false)}>
              Cancel
            </Button>
            <Button onClick={savePrice}>
              Save Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Stock Modal */}
      <Dialog open={showUpdateStock} onOpenChange={setShowUpdateStock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Adjust the stock level for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-stock">New Stock Quantity</Label>
              <Input
                id="edit-stock"
                type="number"
                value={editStock}
                onChange={(e) => setEditStock(e.target.value)}
                placeholder="0"
              />
            </div>
            {selectedProduct && (
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Stock:</span>
                  <span className="font-medium">{selectedProduct.stock} units</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Min Stock:</span>
                  <span>{selectedProduct.minStock} units</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Stock:</span>
                  <span>{selectedProduct.maxStock} units</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Change:</span>
                  <span className={`font-bold flex items-center gap-1 ${
                    parseInt(editStock || "0") > selectedProduct.stock
                      ? "text-green-600"
                      : parseInt(editStock || "0") < selectedProduct.stock
                      ? "text-red-600"
                      : ""
                  }`}>
                    {parseInt(editStock || "0") > selectedProduct.stock ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : parseInt(editStock || "0") < selectedProduct.stock ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : null}
                    {parseInt(editStock || "0") - selectedProduct.stock > 0 ? "+" : ""}
                    {parseInt(editStock || "0") - selectedProduct.stock} units
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateStock(false)}>
              Cancel
            </Button>
            <Button onClick={saveStock}>
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Details Modal */}
      <Dialog open={showProductDetails} onOpenChange={setShowProductDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-6 py-4">
              {/* Product Image and Basic Info */}
              <div className="flex gap-6">
                <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center flex-shrink-0">
                  <Package className="h-16 w-16 text-muted-foreground/30" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-2xl font-bold">{selectedProduct.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    SKU: {selectedProduct.sku}
                  </p>
                  <Badge className={categoryColors[selectedProduct.category]}>
                    {selectedProduct.category}
                  </Badge>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Price</div>
                  <div className="text-2xl font-bold text-primary">
                    €{selectedProduct.price.toFixed(2)}
                  </div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Current Stock</div>
                  <div className="text-2xl font-bold">{selectedProduct.stock} units</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Min Stock</div>
                  <div className="text-xl font-semibold">{selectedProduct.minStock} units</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Max Stock</div>
                  <div className="text-xl font-semibold">{selectedProduct.maxStock} units</div>
                </div>
              </div>

              {/* Stock Status */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock Status</span>
                  <span
                    className={`font-medium px-2 py-0.5 rounded-full text-white ${getStockColor(
                      getStockStatus(selectedProduct)
                    )}`}
                  >
                    {getStockLabel(getStockStatus(selectedProduct))}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all ${getStockColor(
                      getStockStatus(selectedProduct)
                    )}`}
                    style={{ width: `${getStockPercentage(selectedProduct)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  {getStockPercentage(selectedProduct).toFixed(1)}% of max capacity
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProductDetails(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowProductDetails(false);
                if (selectedProduct) handleEditPrice(selectedProduct);
              }}
            >
              Edit Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PhonePreviewButton />
    </AppLayout>
  );
}

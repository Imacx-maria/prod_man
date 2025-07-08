"use client"

import { useState } from "react"
import { Payment, columns } from "./columns"
import { DataTable } from "./data-table"
import { Button } from "@/components/ui/button"
import { RefreshCcw } from "lucide-react"

const initialData: Payment[] = [
  {
    id: "m5gr84i9",
    amount: 316,
    status: "success",
    email: "ken99@example.com",
  },
  {
    id: "3u1reuv4",
    amount: 242,
    status: "success",
    email: "Abe45@example.com",
  },
  {
    id: "derv1ws0",
    amount: 837,
    status: "processing",
    email: "Monserrat44@example.com",
  },
  {
    id: "5kma53ae",
    amount: 874,
    status: "success",
    email: "Silas22@example.com",
  },
  {
    id: "bhqecj4p",
    amount: 721,
    status: "failed",
    email: "carmella@example.com",
  },
]

export default function PaymentsPage() {
  const [data, setData] = useState<Payment[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)

  const refreshData = async () => {
    setIsLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // In a real application, this would fetch fresh data from your API
    // For now, we'll just reset to the initial data
    setData([...initialData])
    
    setIsLoading(false)
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={refreshData}
          disabled={isLoading}
          title="Refresh payments data"
        >
          <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <DataTable 
        columns={columns} 
        data={data} 
        onRefresh={refreshData}
        isLoading={isLoading}
      />
    </div>
  )
} 
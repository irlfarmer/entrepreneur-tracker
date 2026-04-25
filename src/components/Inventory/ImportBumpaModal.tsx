"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import { XMarkIcon, ArrowUpTrayIcon, DocumentTextIcon, CheckIcon } from "@heroicons/react/24/outline"
import { useBusiness } from "@/context/BusinessContext"
import { useModal } from "@/context/ModalContext"
import { useCurrency } from "@/hooks/useCurrency"

interface ImportBumpaModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ImportBumpaModal({ isOpen, onClose }: ImportBumpaModalProps) {
  const router = useRouter()
  const { currentBusiness } = useBusiness()
  const { showModal } = useModal()
  const { symbol: currencySymbol } = useCurrency()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [parsedProducts, setParsedProducts] = useState<any[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const resetState = () => {
    setFile(null)
    setParsedProducts([])
    setSelectedIndices(new Set())
    setIsParsing(false)
    setIsImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    parseFile(selectedFile)
  }

  const parseFile = (file: File) => {
    setIsParsing(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const products = results.data
          .filter((row: any) => row['Row Type'] === 'product')
          .map((row: any) => {
            const customFields: Record<string, string> = {}
            const skipKeys = ['Row Type', 'Title', 'Collections', 'SKU', 'Price', 'Cost', 'Stock', 'Type', 'Variant Name', 'Options Values']
            
            Object.keys(row).forEach(key => {
              if (!skipKeys.includes(key) && row[key] && row[key].trim() !== '') {
                // Map Product ID to bumpa_product_id to avoid confusion with MongoDB _id
                const safeKey = key === 'Product ID' ? 'bumpa_product_id' : key
                customFields[safeKey] = row[key]
              }
            })

            return {
              name: row['Title'] || "Unnamed Product",
              category: row['Collections'] || row['Product Type'] || "Uncategorized",
              sku: row['SKU'] || "",
              salePrice: parseFloat(row['Price']) || 0,
              costPrice: parseFloat(row['Cost']) || 0,
              currentStock: parseInt(row['Stock']) || 0,
              type: row['Type'] || "",
              size: row['Variant Name'] || row['Options Values'] || "",
              customFields
            }
          })

        setParsedProducts(products)
        setSelectedIndices(new Set(products.map((_, i) => i))) // Select all by default
        setIsParsing(false)
      },
      error: (error) => {
        console.error("CSV Parse Error:", error)
        showModal({ title: "Parse Error", message: "Failed to read the CSV file.", type: "error" })
        setIsParsing(false)
      }
    })
  }

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices)
    if (newSelection.has(index)) {
      newSelection.delete(index)
    } else {
      newSelection.add(index)
    }
    setSelectedIndices(newSelection)
  }

  const toggleAll = () => {
    if (selectedIndices.size === parsedProducts.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(parsedProducts.map((_, i) => i)))
    }
  }

  const handleImport = async () => {
    const productsToImport = parsedProducts.filter((_, i) => selectedIndices.has(i))
    if (productsToImport.length === 0) return

    setIsImporting(true)
    try {
      const response = await fetch('/api/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: productsToImport,
          businessId: currentBusiness.id
        })
      })

      const data = await response.json()
      if (data.success) {
        showModal({ 
          title: "Import Successful", 
          message: `${data.data.insertedIds.length} products were successfully imported. New custom fields and categories have been registered.`, 
          type: "success" 
        })
        router.refresh()
        handleClose()
      } else {
        showModal({ title: "Import Failed", message: data.error || "An error occurred during import.", type: "error" })
      }
    } catch (error) {
      showModal({ title: "Import Failed", message: "A network error occurred.", type: "error" })
    } finally {
      setIsImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <ArrowUpTrayIcon className="h-6 w-6 mr-2 text-blue-600" />
            Import Products from Bumpa
          </h2>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
              />
              <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload your Bumpa CSV</h3>
              <p className="text-gray-500">Click to browse or drag and drop your exported products.csv file here.</p>
            </div>
          ) : isParsing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Parsing CSV file...</p>
            </div>
          ) : parsedProducts.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">Preview Import</h3>
                  <p className="text-sm text-gray-500">Select the products you want to import.</p>
                </div>
                <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {selectedIndices.size} of {parsedProducts.length} selected
                </div>
              </div>
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="min-w-full divide-y divide-gray-200 relative">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left">
                        <input 
                          type="checkbox" 
                          checked={selectedIndices.size === parsedProducts.length}
                          onChange={toggleAll}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedProducts.map((product, index) => (
                      <tr key={index} className={selectedIndices.has(index) ? "bg-blue-50/30" : "hover:bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            checked={selectedIndices.has(index)}
                            onChange={() => toggleSelection(index)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{product.name}</div>
                          {Object.keys(product.customFields).length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">+{Object.keys(product.customFields).length} custom fields</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{currencySymbol}{product.salePrice.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.currentStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {product.currentStock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found in the selected CSV file.</p>
              <button onClick={() => setFile(null)} className="mt-4 text-blue-600 font-medium hover:text-blue-800">
                Try another file
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button 
            onClick={resetState} 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
          >
            Cancel / Start Over
          </button>
          
          <button 
            onClick={handleImport}
            disabled={!file || parsedProducts.length === 0 || selectedIndices.size === 0 || isImporting}
            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5 mr-2" />
                Import {selectedIndices.size > 0 ? selectedIndices.size : ''} Products
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

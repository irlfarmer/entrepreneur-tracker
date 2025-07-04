"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface SettingsFormProps {
  userId: string
}

const currencies = [
  // Major Currencies
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  
  // North America
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  
  // South America
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "ARS", symbol: "$", name: "Argentine Peso" },
  { code: "CLP", symbol: "$", name: "Chilean Peso" },
  { code: "COP", symbol: "$", name: "Colombian Peso" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
  { code: "UYU", symbol: "$", name: "Uruguayan Peso" },
  { code: "VES", symbol: "Bs", name: "Venezuelan Bolívar" },
  
  // Europe
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "PLN", symbol: "zł", name: "Polish Złoty" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "RON", symbol: "lei", name: "Romanian Leu" },
  { code: "BGN", symbol: "лв", name: "Bulgarian Lev" },
  { code: "HRK", symbol: "kn", name: "Croatian Kuna" },
  { code: "RSD", symbol: "дин", name: "Serbian Dinar" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  
  // Asia-Pacific
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "TWD", symbol: "NT$", name: "Taiwan Dollar" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
  { code: "LAK", symbol: "₭", name: "Lao Kip" },
  { code: "KHR", symbol: "៛", name: "Cambodian Riel" },
  { code: "MMK", symbol: "K", name: "Myanmar Kyat" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "FJD", symbol: "FJ$", name: "Fijian Dollar" },
  
  // Middle East
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "QAR", symbol: "﷼", name: "Qatari Riyal" },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar" },
  { code: "BHD", symbol: ".د.ب", name: "Bahraini Dinar" },
  { code: "OMR", symbol: "﷼", name: "Omani Rial" },
  { code: "JOD", symbol: "د.ا", name: "Jordanian Dinar" },
  { code: "LBP", symbol: "£", name: "Lebanese Pound" },
  { code: "ILS", symbol: "₪", name: "Israeli Shekel" },
  { code: "IRR", symbol: "﷼", name: "Iranian Rial" },
  { code: "IQD", symbol: "ع.د", name: "Iraqi Dinar" },
  
  // Africa
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "EGP", symbol: "£", name: "Egyptian Pound" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  { code: "XOF", symbol: "CFA", name: "West African CFA Franc" },
  { code: "XAF", symbol: "FCFA", name: "Central African CFA Franc" },
  { code: "ETB", symbol: "Br", name: "Ethiopian Birr" },
  { code: "BWP", symbol: "P", name: "Botswana Pula" },
  { code: "NAD", symbol: "N$", name: "Namibian Dollar" },
  { code: "ZWL", symbol: "Z$", name: "Zimbabwean Dollar" },
  { code: "MUR", symbol: "₨", name: "Mauritian Rupee" },
  { code: "MAD", symbol: "د.م.", name: "Moroccan Dirham" },
  { code: "TND", symbol: "د.ت", name: "Tunisian Dinar" },
  { code: "DZD", symbol: "د.ج", name: "Algerian Dinar" },
  { code: "LYD", symbol: "ل.د", name: "Libyan Dinar" },
  
  // Other regions
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "LKR", symbol: "₨", name: "Sri Lankan Rupee" },
  { code: "NPR", symbol: "₨", name: "Nepalese Rupee" },
  { code: "AFN", symbol: "؋", name: "Afghan Afghani" },
  { code: "KZT", symbol: "₸", name: "Kazakhstani Tenge" },
  { code: "UZS", symbol: "so'm", name: "Uzbekistani Som" },
  { code: "KGS", symbol: "лв", name: "Kyrgyzstani Som" },
  { code: "TJS", symbol: "SM", name: "Tajikistani Somoni" },
  { code: "TMT", symbol: "T", name: "Turkmenistani Manat" },
  { code: "MNT", symbol: "₮", name: "Mongolian Tugrik" },
  { code: "ISK", symbol: "kr", name: "Icelandic Króna" }
]

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago", 
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney"
]

export default function SettingsForm({ userId }: SettingsFormProps) {
  const { data: session, update } = useSession()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [formData, setFormData] = useState({
    companyName: "",
    businessType: "",
    currency: "USD",
    timezone: "UTC",
    enabledFields: [] as string[]
  })

  // Fetch user data
  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/settings')
      const data = await response.json()
      if (data.success) {
        setUserData(data.data)
        setFormData({
          companyName: data.data.companyName || "",
          businessType: data.data.businessType || "",
          currency: data.data.settings?.currency || "USD",
          timezone: data.data.settings?.timezone || "UTC",
          enabledFields: data.data.settings?.enabledFields || ["category", "type", "size", "color"]
        })
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCheckboxChange = (field: string) => {
    setFormData(prev => ({
      ...prev,
      enabledFields: prev.enabledFields.includes(field)
        ? prev.enabledFields.filter(f => f !== field)
        : [...prev.enabledFields, field]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        // Update the session with new company name
        await update({
          ...session,
          user: {
            ...session?.user,
            companyName: formData.companyName
          }
        })
        alert('Settings saved successfully!')
      } else {
        alert(data.error || 'Failed to save settings')
      }
    } catch (error) {
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const selectedCurrency = currencies.find(c => c.code === formData.currency)

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-8">
      {/* Business Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your company name"
            />
          </div>

          <div>
            <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
              Business Type
            </label>
            <select
              id="businessType"
              name="businessType"
              value={formData.businessType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="General">General</option>
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Food & Beverage">Food & Beverage</option>
              <option value="Electronics">Electronics</option>
              <option value="Clothing & Fashion">Clothing & Fashion</option>
              <option value="Health & Beauty">Health & Beauty</option>
              <option value="Home & Garden">Home & Garden</option>
              <option value="Sports & Recreation">Sports & Recreation</option>
              <option value="Arts & Crafts">Arts & Crafts</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Regional Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.code} - {currency.name}
                </option>
              ))}
            </select>
            {selectedCurrency && (
              <p className="text-sm text-gray-500 mt-1">
                All prices will be displayed with the {selectedCurrency.symbol} symbol
              </p>
            )}
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Product Fields */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Fields</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose which fields to show when adding/editing products
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["category", "type", "size", "color", "sku"].map(field => (
            <label key={field} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enabledFields.includes(field)}
                onChange={() => handleCheckboxChange(field)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 capitalize">{field}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Account Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{session?.user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Account created:</span>
              <span className="font-medium text-gray-900">
                {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-6 border-t">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  )
} 
import { useState, useEffect } from 'react'
import { useBusiness } from '@/context/BusinessContext'

interface CurrencyData {
  code: string
  symbol: string
  loading: boolean
}

export function useCurrency(): CurrencyData {
  const { currentBusiness, isLoading } = useBusiness()
  const [currency, setCurrency] = useState({
    code: 'USD',
    symbol: '$',
    loading: true
  })

  useEffect(() => {
    if (!isLoading && currentBusiness) {
      const settings = currentBusiness.settings
      const currencyCode = settings?.currency || 'USD'
      const currencySymbol = getCurrencySymbol(currencyCode)

      setCurrency({
        code: currencyCode,
        symbol: currencySymbol,
        loading: false
      })
    }
  }, [isLoading, currentBusiness])

  return currency
}

// Helper function to get currency symbol
function getCurrencySymbol(currencyCode: string): string {
  const currencyMap: { [key: string]: string } = {
    USD: "$", EUR: "€", GBP: "£", JPY: "¥", CHF: "CHF", CAD: "C$", MXN: "$",
    BRL: "R$", ARS: "$", CLP: "$", COP: "$", PEN: "S/", UYU: "$", VES: "Bs",
    NOK: "kr", SEK: "kr", DKK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft",
    RON: "lei", BGN: "лв", HRK: "kn", RSD: "дин", TRY: "₺", RUB: "₽", UAH: "₴",
    CNY: "¥", KRW: "₩", INR: "₹", SGD: "S$", HKD: "HK$", TWD: "NT$", THB: "฿",
    MYR: "RM", IDR: "Rp", PHP: "₱", VND: "₫", LAK: "₭", KHR: "៛", MMK: "K",
    AUD: "A$", NZD: "NZ$", FJD: "FJ$", AED: "د.إ", SAR: "﷼", QAR: "﷼",
    KWD: "د.ك", BHD: ".د.ب", OMR: "﷼", JOD: "د.ا", LBP: "£", ILS: "₪",
    IRR: "﷼", IQD: "ع.د", NGN: "₦", ZAR: "R", EGP: "£", KES: "KSh",
    UGX: "USh", TZS: "TSh", GHS: "₵", XOF: "CFA", XAF: "FCFA", ETB: "Br",
    BWP: "P", NAD: "N$", ZWL: "Z$", MUR: "₨", MAD: "د.م.", TND: "د.ت",
    DZD: "د.ج", LYD: "ل.د", PKR: "₨", BDT: "৳", LKR: "₨", NPR: "₨",
    AFN: "؋", KZT: "₸", UZS: "so'm", KGS: "лв", TJS: "SM", TMT: "T",
    MNT: "₮", ISK: "kr"
  }
  return currencyMap[currencyCode] || "$"
}

// Helper function to format currency with user's preference
export function formatCurrencyWithUserSettings(amount: number, currencyCode?: string): string {
  const code = currencyCode || 'USD'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
  }).format(amount)
} 
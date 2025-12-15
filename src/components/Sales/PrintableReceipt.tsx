import React from 'react';
import { Sale } from '@/lib/types';
import { BusinessProfile } from '@/context/BusinessContext';
import { formatCurrency } from '@/lib/utils';

interface PrintableReceiptProps {
  sale: Sale;
  businessProfile: BusinessProfile | null;
  receiptStyle: 'standard' | 'compact' | 'a4-invoice';
}

const PrintableReceipt = React.forwardRef<HTMLDivElement, PrintableReceiptProps>(({ sale, businessProfile, receiptStyle }, ref) => {
  // Normalize sale data to handle both single and multi-product sales
  const items = (sale.items && sale.items.length > 0)
    ? sale.items
    : [
        {
          name: sale.productName || 'N/A',
          quantity: sale.quantity || 0,
          unitSalePrice: sale.unitSalePrice || 0,
          lineTotal: sale.totalSales || 0,
          lineProfit: sale.totalProfit || 0,
        } as any, // Cast to any to satisfy the type, as we are creating a compatible structure
      ];

  const renderStandard = () => (
    <div className="w-[80mm] p-4 font-mono text-xs text-black bg-white">
      {businessProfile?.settings?.profileImage && (
        <img src={businessProfile.settings.profileImage} alt="Logo" className="w-24 h-24 mx-auto mb-4 object-contain" />
      )}
      <h2 className="text-center text-lg font-bold mb-2">{businessProfile?.name || 'Your Business'}</h2>
      <div className="text-center mb-4">
        <p>Receipt</p>
        <p>Date: {new Date(sale.saleDate).toLocaleString()}</p>
        <p>Sale ID: {sale._id?.toString()}</p>
      </div>
      <table className="w-full mb-4">
        <thead>
          <tr>
            <th className="text-left">Item</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">{formatCurrency(item.unitSalePrice * item.quantity, businessProfile?.settings?.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-dashed border-black my-2"></div>
      <div className="flex justify-between font-bold">
        <span>Total</span>
        <span>{formatCurrency(sale.totalSales, businessProfile?.settings?.currency)}</span>
      </div>
      <p className="text-center mt-6">Thank you for your business!</p>
    </div>
  );

  const renderCompact = () => (
    <div className="w-[58mm] p-2 font-mono text-[10px] text-black bg-white">
        {businessProfile?.settings?.profileImage && (
        <img src={businessProfile.settings.profileImage} alt="Logo" className="w-16 h-16 mx-auto mb-2 object-contain" />
      )}
      <h2 className="text-center font-bold">{businessProfile?.name}</h2>
      <p className="text-center">{new Date(sale.saleDate).toLocaleDateString()}</p>
      <div className="border-t border-dashed border-black my-2"></div>
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-3">
          <span>{item.name}</span>
          <span className="text-center">x{item.quantity}</span>
          <span className="text-right">{formatCurrency(item.unitSalePrice * item.quantity, businessProfile?.settings?.currency)}</span>
        </div>
      ))}
      <div className="border-t border-dashed border-black my-2"></div>
      <div className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span>{formatCurrency(sale.totalSales, businessProfile?.settings?.currency)}</span>
      </div>
      <p className="text-center mt-4">Thanks!</p>
    </div>
  );

  const renderA4Invoice = () => (
    <div className="w-[210mm] h-[297mm] p-12 text-base text-black bg-white font-sans">
      <div className="flex justify-between items-start mb-12">
        <div>
          {businessProfile?.settings?.profileImage && (
            <img src={businessProfile.settings.profileImage} alt="Logo" className="w-32 h-32 object-contain mb-4" />
          )}
          <h1 className="text-3xl font-bold">{businessProfile?.name || 'Your Business'}</h1>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-light uppercase">Invoice</h2>
          <p>Sale ID: {sale._id?.toString()}</p>
          <p>Date: {new Date(sale.saleDate).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="mb-12">
        <h3 className="font-bold mb-2">Bill To:</h3>
        <p>{sale.customerName || 'Valued Customer'}</p>
      </div>
      <table className="w-full mb-8">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left font-bold">Item Description</th>
            <th className="p-3 text-right font-bold">Quantity</th>
            <th className="p-3 text-right font-bold">Unit Price</th>
            <th className="p-3 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-b">
              <td className="p-3">{item.name}</td>
              <td className="p-3 text-right">{item.quantity}</td>
              <td className="p-3 text-right">{formatCurrency(item.unitSalePrice, businessProfile?.settings?.currency)}</td>
              <td className="p-3 text-right">{formatCurrency(item.unitSalePrice * item.quantity, businessProfile?.settings?.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end">
        <div className="w-1/3">
          <div className="flex justify-between py-2">
            <span className="font-bold">Subtotal</span>
            <span>{formatCurrency(sale.totalSales, businessProfile?.settings?.currency)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-xl border-t-2 border-black">
            <span>TOTAL</span>
            <span>{formatCurrency(sale.totalSales, businessProfile?.settings?.currency)}</span>
          </div>
        </div>
      </div>
      <div className="mt-24 text-center text-gray-600">
        <p>Thank you for your business. Please contact us with any questions.</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (receiptStyle) {
      case 'compact':
        return renderCompact();
      case 'a4-invoice':
        return renderA4Invoice();
      case 'standard':
      default:
        return renderStandard();
    }
  };

  return <div ref={ref}>{renderContent()}</div>;
});

PrintableReceipt.displayName = 'PrintableReceipt';

export default PrintableReceipt;

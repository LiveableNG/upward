import { formatCurrency, getCategoryIconName } from '@/lib/utils'
import { Home, Lock, Users, Scale, Settings, Wrench, Package, Check } from 'lucide-react'

const CategoryIcon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const icons: Record<string, any> = {
    Home,
    Lock,
    Users,
    Scale,
    Settings,
    Wrench,
    Package,
  }
  const Icon = icons[name] || Package
  return <Icon size={size} />
}

interface LineItem {
  uuid: string
  label: string
  category: string
  amount: number
}

export default function InvoiceCard({
  invoiceNumber,
  notes,
  lineItems,
  totalAmount,
  currency = 'NGN',
  status,
}: {
  invoiceNumber: string
  notes: string
  lineItems: LineItem[]
  totalAmount: number
  currency?: string
  status: string
}) {
  return (
    <div className="invoice-card">
      <div className="invoice-card__header">
        <div className="invoice-card__label">Invoice</div>
        <div className="invoice-card__number">{invoiceNumber}</div>
      </div>

      {notes && <p className="invoice-card__notes">{notes}</p>}

      <div className="invoice-card__items">
        {lineItems.map((item) => (
          <div key={item.uuid} className="invoice-card__item">
            <div className="invoice-card__item-left">
              <span className="invoice-card__item-icon">
                <CategoryIcon name={getCategoryIconName(item.category)} />
              </span>
              <div>
                <span className="invoice-card__item-label">{item.label}</span>
                <span className="invoice-card__item-category">{item.category}</span>
              </div>
            </div>
            <span className="invoice-card__item-amount">
              {formatCurrency(item.amount, currency)}
            </span>
          </div>
        ))}
      </div>

      <div className="invoice-card__divider" />

      <div className="invoice-card__total">
        <span>Total Due</span>
        <span className="invoice-card__total-amount">{formatCurrency(totalAmount, currency)}</span>
      </div>

      {status === 'paid' && (
        <div className="invoice-card__paid-badge">
          <Check size={14} style={{ marginRight: 4 }} /> Paid
        </div>
      )}
    </div>
  )
}

import Image from 'next/image'

interface CompanyHeaderProps {
  name: string
  logo?: string
}

export default function CompanyHeader({ name, logo }: CompanyHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="relative group">
        <div className="absolute inset-0 bg-[var(--color-primary)] opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
        {logo ? (
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border border-[var(--color-border)] bg-white transform group-hover:scale-105 transition-transform">
            <Image src={logo} alt={name} fill className="object-contain p-2" />
          </div>
        ) : (
          <div className="relative w-20 h-20 rounded-2xl bg-[var(--color-primary-light)] flex items-center justify-center border border-[var(--color-primary-border)] shadow-inner transform group-hover:scale-105 transition-transform">
            <span className="text-3xl font-bold text-[var(--color-primary)] italic">{name[0]}</span>
          </div>
        )}
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">{name}</h2>
        <p className="text-sm text-[var(--color-text-muted)] font-medium">
          Invites you to join Upward
        </p>
      </div>
    </div>
  )
}

import { Suspense } from 'react'
import { PropertiesView } from '@/features/pm/components/properties/PropertiesView'
import { TableSkeleton } from '@/components/skeletons'
import { cookies } from 'next/headers'

async function getPropertiesData() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('pm_access_token')?.value || cookieStore.get('access_token')?.value
    
    if (!token) return { properties: undefined, units: undefined };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
    
    const [propRes, unitsRes] = await Promise.all([
      fetch(`${apiUrl}/pm/properties`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 60 }
      }),
      fetch(`${apiUrl}/pm/units`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 60 }
      })
    ]);
    
    const properties = propRes.ok ? await propRes.json() : undefined;
    const units = unitsRes.ok ? await unitsRes.json() : undefined;
    
    return { properties, units }
  } catch (error) {
    console.error("Failed to fetch properties data:", error)
    return { properties: undefined, units: undefined }
  }
}

export default async function Properties() {
  const { properties, units } = await getPropertiesData();

  return (
    <Suspense fallback={<TableSkeleton />}>
      <PropertiesView initialProperties={properties} initialUnits={units} />
    </Suspense>
  )
}

import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
    const searchKey = 'up_sk_live_e68751ef7c946e23d5af9180'
    const searchHash = crypto.createHash('sha256').update(searchKey).digest('hex')
    
    console.log(`Searching for API Key: ${searchKey}`)
    console.log(`Hash: ${searchHash}`)
    
    const platform = await prisma.upward_platform.findUnique({
        where: { apiKey: searchHash }
    })

    if (platform) {
        console.log('MATCH FOUND:')
        console.log(JSON.stringify(platform, null, 2))
    } else {
        console.log('NO MATCH FOUND')
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())

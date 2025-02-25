import { getSession } from '@/action'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

const PremiumPage  = async() => {
    const session = await getSession()
    if (!session.isLoggedIn) {
        redirect("/")
    }
    if (!session.isPro) {
        return(
            <div className='notPremium'>
                <h1>Only Premium users can see the content</h1>
                <Link href={"/profile"}>Go to profile page to upgrade premium membership</Link>
            </div>
        )
    }
    return (
        <div className='premium'>
            <h1>welcome to premium page</h1>
        </div>
    )
}

export default PremiumPage

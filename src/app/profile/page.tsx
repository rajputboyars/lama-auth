import { changePremium, changeUsername, getSession } from '@/action'
import { redirect } from 'next/navigation'
import React from 'react'

const ProfilePage = async () => {
    const session = await getSession()
    if (!session.isLoggedIn) {
        redirect("/")
    }

    return (
        <div className='profile'>
            <h1>Welcome to profile page</h1>
            <p>Welcome <b>{session.username}</b></p>
            <p>Your Are {session.isPro ? "Premium" : "Free"} user</p>
            <form action={changePremium}>
                <button>{session.isPro ? "Cancle" : "buy"} Premium</button>
            </form>
            <form action={changeUsername}>
                <input type="text" name='username' placeholder={session.username} required />
                <button>Update</button>
            </form>
        </div>
    )
}

export default ProfilePage

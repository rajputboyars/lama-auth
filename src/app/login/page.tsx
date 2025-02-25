import { getSession } from '@/action'
import LoginForm from '@/components/LoginForm'
import { redirect } from 'next/navigation'
import React from 'react'

const LoginPage = async() => {
    const session = await getSession()
    if (session.isLoggedIn) {
        redirect("/")
    }
    return (
        <div className='login'>
            Welcome to login Page
            <LoginForm/>
        </div>
    )
}

export default LoginPage

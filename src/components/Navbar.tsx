import Link from 'next/link'
import React from 'react'
import LogoutForm from './LogoutForm'
import { getSession } from '@/action'

const Navbar = async() => {
  const session = await getSession()
  return (
    <nav>
      <Link href={"/"}>HomePage</Link>
      <Link href={"/premium"}>Premium</Link>
      <Link href={"/login"}>Login</Link>
      <Link href={"/profile"}>Profile</Link>
      {session.isLoggedIn && <LogoutForm/>}
    </nav>
  )
}

export default Navbar

import { logout } from '@/action'
import React from 'react'

const LogoutForm = () => {
  return (
    <form action={logout}>
      <button>Logout</button>
    </form>
  )
}

export default LogoutForm

"use client"
import { login } from '@/action'
import { useActionState } from 'react';

const LoginForm = () => {
    const [state, formAction] = useActionState<any, FormData>(login, undefined);
    
    return (
        <form action={formAction} className='flex justify-center items-center flex-col gap-8 border p-8 w-fit'>
            <input type="text" name='username' placeholder='username' required />
            <input type="password" name='password' placeholder='Password' required />
            <button>Login</button>
            {state?.error && <p>{state.error}</p>}
        </form>
    )
}

export default LoginForm
